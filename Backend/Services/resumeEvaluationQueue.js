const { getQueues, createRedisClient } = require('./queue');
const ResumePipelineService = require('./ResumePipelineService');
const JobPostings = require('../Models/JobPostings');
const Users = require('../Models/Users');
const { sendShortlistNotification } = require('./EmailService');

/**
 * Attach the processor once queues are initialized
 */
(async () => {
  try {
    const { resumeEvaluationQueue } = await getQueues();

    resumeEvaluationQueue.process(async (job) => {
      const { jobId, candidateIndex, candidateId, candidateEmail, cvUrl, evaluationCriteria, requeueCount = 0, addedByRole = null } = job.data;

      try {
        console.log(`🔄 Processing resume evaluation for ${candidateEmail} (Job: ${jobId})`);

        // Fetch the job to get the candidate. Retry a few times if candidate is not yet visible
        // in the database to handle transient propagation or very fast worker execution.
        const maxFetchRetries = 5;
        const baseFetchDelay = 300; // ms
        let jobDoc = null;
        let candidate = null;

        for (let attempt = 0; attempt <= maxFetchRetries; attempt++) {
          jobDoc = await JobPostings.findOne({ JobID: String(jobId) });
          if (!jobDoc) {
            // If job not found at all, no point retrying many times
            throw new Error(`Job not found: ${jobId}`);
          }

          // Prefer locating candidate by stable subdocument _id when available
          if (candidateId) {
            candidate = jobDoc.Candidates && jobDoc.Candidates.id(candidateId);
          } else {
            candidate = jobDoc.Candidates && jobDoc.Candidates[candidateIndex];
          }
          if (candidate) break;

          if (attempt < maxFetchRetries) {
            const delayMs = baseFetchDelay * Math.pow(2, attempt);
            console.warn(`Candidate at index ${candidateIndex} not found yet for job ${jobId}. Retry ${attempt + 1}/${maxFetchRetries} in ${delayMs}ms.`);
            await new Promise(r => setTimeout(r, delayMs));
            continue;
          }

          // after retries, if still no candidate, throw
          throw new Error(`Candidate not found at index ${candidateIndex} after ${maxFetchRetries} retries`);
        }

        // Evaluate the resume with retry logic for transient failures
        let evaluation;
        let retryCount = 0;
        const maxRetries = 3;
        const baseDelay = 2000; // 2 seconds
        
        while (retryCount <= maxRetries) {
          try {
            evaluation = await ResumePipelineService.evaluateResume(cvUrl, evaluationCriteria);
            console.log(`Resume evaluation response for ${candidateEmail}:`, JSON.stringify(evaluation).substring(0, 500));
            if (evaluation && evaluation.ExtractedInfo) {
              console.log(`Extracted info - Name: "${evaluation.ExtractedInfo.fullName}", Email: "${evaluation.ExtractedInfo.email}"`);
            }
            break; // Success, exit retry loop
          } catch (evalErr) {
            retryCount++;
            if (retryCount > maxRetries) {
              console.error(`❌ Resume evaluation failed after ${maxRetries} retries for ${candidateEmail}:`, evalErr.message);
              throw evalErr; // Rethrow to be caught by outer try/catch
            }
            
            // Calculate delay with exponential backoff
            const delayMs = baseDelay * Math.pow(2, retryCount - 1);
            console.warn(`⏳ Resume evaluation attempt ${retryCount} failed, retrying in ${delayMs}ms...`, evalErr.message);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }

        if (evaluation && evaluation.ExtractedInfo) {
          try {
            const extractedName = evaluation.ExtractedInfo.fullName;
            const extractedEmail = evaluation.ExtractedInfo.email && String(evaluation.ExtractedInfo.email).trim();

            // If the pipeline extracted an email, check whether this email
            // already exists among the Candidates for this job. If so,
            // skip further processing for this resume to avoid duplicate candidates.
            try {
              const normalizedExEmail = extractedEmail ? String(extractedEmail).toLowerCase() : null;
              if (normalizedExEmail && !normalizedExEmail.includes('example.com')) {
                const duplicateCandidate = (jobDoc.Candidates || []).find(c => {
                  if (!c || !c.Email) return false;
                  try { return String(c.Email).toLowerCase() === normalizedExEmail && String(c._id) !== String(candidate._id); } catch (e) { return false; }
                });

                if (duplicateCandidate) {
                  // Remove the duplicate candidate entry from the Job's Candidates array
                  try {
                    const idToRemove = (candidate && candidate._id) || candidateId || null;
                    if (idToRemove) {
                      await JobPostings.updateOne({ JobID: String(jobId) }, { $pull: { Candidates: { _id: idToRemove } } });
                      console.log(`🗑️ Removed duplicate candidate (id: ${idToRemove}) for email ${normalizedExEmail} from job ${jobId}`);
                    } else {
                      // Fallback: pull by email match
                      await JobPostings.updateOne({ JobID: String(jobId) }, { $pull: { Candidates: { Email: normalizedExEmail } } });
                      console.log(`🗑️ Removed duplicate candidate(s) by email ${normalizedExEmail} from job ${jobId}`);
                    }
                    // Return a status indicating the duplicate was removed so total candidate counts reduce
                    return { candidateEmail: normalizedExEmail, CV_Score: null, status: 'removed-duplicate' };
                  } catch (removeErr) {
                    console.error('Failed to remove duplicate candidate:', removeErr && removeErr.message ? removeErr.message : removeErr);
                    // If removal failed, fallback to marking as skipped so processing doesn't continue
                    if (candidateId) {
                      await JobPostings.updateOne({ JobID: String(jobId), 'Candidates._id': candidateId }, { $addToSet: { 'Candidates.$.Flags': 'DUPLICATE_SKIPPED' }, $set: { 'Candidates.$.ApplicationStatus': 'Duplicate - Skipped' } });
                    } else {
                      const addSet = {}; addSet[`Candidates.${candidateIndex}.Flags`] = 'DUPLICATE_SKIPPED';
                      const setObj = {}; setObj[`Candidates.${candidateIndex}.ApplicationStatus`] = 'Duplicate - Skipped';
                      await JobPostings.updateOne({ JobID: String(jobId) }, { $addToSet: addSet, $set: setObj });
                    }
                    return { candidateEmail: normalizedExEmail, CV_Score: null, status: 'skipped-duplicate' };
                  }
                }
              }
            } catch (dupCheckErr) {
              console.error('Duplicate check failed:', dupCheckErr && dupCheckErr.message ? dupCheckErr.message : dupCheckErr);
            }

            // Update or create user record based on extracted email/name
            let userToUpdate = null;
            try {
              userToUpdate = await Users.findOne({ Email: candidateEmail });
            } catch (uErr) {
              console.error('Error finding user by candidate email:', uErr.message);
            }

            // Update name on existing user if present
            if (userToUpdate && extractedName) {
              userToUpdate.FullName = extractedName;
              try { await userToUpdate.save(); console.log(`💾 Updated user FullName for ${userToUpdate.Email}`); } catch (sErr) { console.error('Failed saving updated user name:', sErr.message); }
            }

            // If we have a valid extracted email and it's different from stored, attempt to reconcile
            if (extractedEmail && extractedEmail !== candidateEmail && !extractedEmail.toLowerCase().includes('example.com')) {
              try {
                const existingUser = await Users.findOne({ Email: extractedEmail });

                // Update job candidate email immediately so DB reflects the corrected email
                candidate.Email = extractedEmail;
                jobDoc.markModified(`Candidates.${candidateIndex}.Email`);

                if (!existingUser) {
                  // No user exists with extracted email: update the current user (if any) to use the new email
                  if (userToUpdate) {
                    userToUpdate.Email = extractedEmail;
                    if (extractedName) userToUpdate.FullName = extractedName;
                    await userToUpdate.save();
                    console.log(`✅ Updated candidate user email to ${extractedEmail}`);
                  } else {
                    // No existing user found under candidateEmail; create a new user record
                    const newUser = new Users({
                      Email: extractedEmail,
                      Role: 'Candidate',
                      Password: '',
                      FullName: extractedName || '',
                      InvitationAccepted: false,
                      Jobs: [String(jobId)]
                    });
                    await newUser.save();
                    console.log(`✅ Created new user for extracted email ${extractedEmail}`);
                  }
                } else {
                  // A user already exists for the extracted email. Merge information into that user.
                  if (extractedName) existingUser.FullName = extractedName;
                  // Ensure the job ID is present on the existing user's Jobs array
                  try {
                    const currentJobs = Array.isArray(existingUser.Jobs) ? existingUser.Jobs.map(j => String(j)) : [];
                    if (!currentJobs.includes(String(jobId))) {
                      currentJobs.push(String(jobId));
                      existingUser.Jobs = currentJobs;
                    }
                  } catch (jErr) {
                    console.error('Failed to ensure job ID on existing user:', jErr.message);
                  }
                  await existingUser.save();
                  console.log(`✅ Merged extracted info into existing user ${extractedEmail}`);

                  // If we had a separate placeholder user with candidateEmail, delete it
                  if (userToUpdate && userToUpdate.Email && userToUpdate.Email !== extractedEmail) {
                    try {
                      await Users.deleteOne({ Email: candidateEmail });
                      console.log(`🗑️  Deleted placeholder user ${candidateEmail} after merge`);
                    } catch (delErr) {
                      console.error('Failed to delete placeholder user during merge:', delErr.message);
                    }
                  }
                }
              } catch (emailErr) {
                console.error('Failed to reconcile extracted email:', emailErr.message);
              }
            }
          } catch (updateErr) {
            console.error(`Failed to update user with extracted info: ${updateErr.message}`);
          }
        } else {
          console.log(`⚠️  No extracted info available from evaluation for ${candidateEmail}`);
        }

        // If the evaluation returned no numeric CV_Score or failed to extract name/email,
        // optionally requeue it for another attempt (use same requeue counter).
        const maxRequeues = Number(process.env.MAX_REQUEUE_COUNT || 10);
        const extractedName = evaluation?.ExtractedInfo?.fullName || evaluation?.ExtractedInfo?.name || null;
        const extractedEmail = evaluation?.ExtractedInfo?.email ? String(evaluation.ExtractedInfo.email).trim() : null;

        // Requeue when CV_Score missing OR name/email not extracted (excluding placeholder example.com emails)
        const missingPersonalInfo = !extractedName || !extractedEmail || extractedEmail.length === 0 || String(extractedEmail).toLowerCase().includes('example.com');
        const shouldRequeue = evaluation && (evaluation.CV_Score == null || missingPersonalInfo);
        if (shouldRequeue) {
          try {
            if (requeueCount < maxRequeues) {
              const nextCount = requeueCount + 1;
              const delayMs = Math.min(60000, 5000 * nextCount); // grow delay but cap at 60s

              // increment candidate retry count and add REQUEUED flag atomically
              if (candidateId) {
                await JobPostings.updateOne({ JobID: String(jobId), 'Candidates._id': candidateId }, {
                  $inc: { 'Candidates.$.EvalRetryCount': 1 },
                  $addToSet: { 'Candidates.$.Flags': 'REQUEUED' }
                });
              } else {
                // by index
                const incObj = {};
                incObj[`Candidates.${candidateIndex}.EvalRetryCount`] = 1;
                const addSet = {};
                addSet[`Candidates.${candidateIndex}.Flags`] = 'REQUEUED';
                await JobPostings.updateOne({ JobID: String(jobId) }, { $inc: incObj, $addToSet: addSet });
              }

              // Requeue the job at the end with incremented requeueCount and delay
              await resumeEvaluationQueue.add(
                { jobId, candidateIndex, candidateId, candidateEmail, cvUrl, evaluationCriteria, requeueCount: nextCount },
                { delay: delayMs, attempts: 2, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: true }
              );

              console.log(`🔁 Requeued resume evaluation for ${candidateEmail} (job ${jobId}) requeueCount=${nextCount} delay=${delayMs}ms; missingPersonalInfo=${missingPersonalInfo}; CV_ScoreMissing=${evaluation.CV_Score == null}`);
              // Return here — we do not persist a null CV_Score as the final state yet
              return { candidateEmail, CV_Score: null, status: 'requeued', requeueCount: nextCount };
            }
            // else fall through and mark as failed after max attempts
            console.warn(`⚠️ Max requeue attempts reached for ${candidateEmail} (job ${jobId}), will mark as EVALUATION_FAILED; lastMissingPersonalInfo=${missingPersonalInfo}`);
            if (candidateId) {
              await JobPostings.updateOne({ JobID: String(jobId), 'Candidates._id': candidateId }, { $addToSet: { 'Candidates.$.Flags': 'EVALUATION_FAILED' } });
            } else {
              const setFlag = {};
              setFlag[`Candidates.${candidateIndex}.Flags`] = ['EVALUATION_FAILED'];
              await JobPostings.updateOne({ JobID: String(jobId) }, { $set: setFlag });
            }
          } catch (rqErr) {
            console.error('Failed during requeue handling:', rqErr.message);
          }
        }

        // ALWAYS update evaluation results (even if null) to mark candidate as processed
        // Use an atomic update to avoid document version conflicts when multiple workers touch the job doc.
        let atomicUpdated = false;
        try {
          const setPayload = {};
          const candidatePathBase = candidateId ? `Candidates.$` : `Candidates.${candidateIndex}`;

          if (evaluation) {
            if (evaluation.CV_Score != null) {
              setPayload[`${candidatePathBase}.CV_Score`] = evaluation.CV_Score;
              setPayload[`${candidatePathBase}.CompositeScore`] = evaluation.CV_Score;
            }
            if (evaluation.ResumeBreakdown) {
              setPayload[`${candidatePathBase}.ResumeBreakdown`] = evaluation.ResumeBreakdown;
            }
          }

          // Always ensure ApplicationStatus is set to indicate processing is complete
          setPayload[`${candidatePathBase}.ApplicationStatus`] = 'CV Processed';

          // If extracted email was found, persist it unless it's a placeholder
          if (evaluation?.ExtractedInfo?.email) {
            const _exEmail = String(evaluation.ExtractedInfo.email);
            if (_exEmail && !_exEmail.includes('example.com')) {
              setPayload[`${candidatePathBase}.Email`] = _exEmail;
            }
          }

          // Convert setPayload into $set object for updateOne
          const atomicUpdate = { $set: {} };
          for (const [k, v] of Object.entries(setPayload)) {
            atomicUpdate.$set[k] = v;
          }

          if (candidateId) {
            await JobPostings.updateOne({ JobID: String(jobId), 'Candidates._id': candidateId }, atomicUpdate);
            atomicUpdated = true;
            console.log(`📊 Atomically updated candidate[${candidateId}] for job ${jobId}`);
          } else {
            await JobPostings.updateOne({ JobID: String(jobId) }, atomicUpdate);
            atomicUpdated = true;
            console.log(`📊 Atomically updated candidate[${candidateIndex}] for job ${jobId}`);
          }
        } catch (atomicErr) {
          console.error('Failed to atomically update candidate evaluation fields:', atomicErr.message);
          // Fallback: update the loaded document and save
          try {
            if (jobDoc && jobDoc.Candidates) {
              const idx = (candidateId && jobDoc.Candidates.id(candidateId)) ? jobDoc.Candidates.findIndex(c => String(c._id) === String(candidateId)) : candidateIndex;
              if (idx != null && jobDoc.Candidates[idx]) {
                if (evaluation) {
                  jobDoc.Candidates[idx].CV_Score = evaluation.CV_Score != null ? evaluation.CV_Score : jobDoc.Candidates[idx].CV_Score;
                  jobDoc.Candidates[idx].CompositeScore = evaluation.CV_Score != null ? evaluation.CV_Score : jobDoc.Candidates[idx].CompositeScore;
                  if (evaluation.ResumeBreakdown) jobDoc.Candidates[idx].ResumeBreakdown = evaluation.ResumeBreakdown;
                }
                jobDoc.Candidates[idx].ApplicationStatus = 'CV Processed';
                if (extractedEmail) jobDoc.Candidates[idx].Email = extractedEmail;
                jobDoc.markModified(`Candidates.${idx}`);
                await jobDoc.save();
              }
            }
          } catch (saveFallbackErr) {
            console.error(`❌ Failed to save job document in fallback:`, saveFallbackErr.message);
            throw saveFallbackErr;
          }
        }

        // If atomic update succeeded, we can avoid saving the whole document again
        if (atomicUpdated) {
          console.log(`✅ Successfully applied atomic update for ${candidateEmail} in job ${jobId}`);

          // If this resume was added by an internal user (SuperAdmin/Recruiter/HiringAssistant)
          // and we successfully extracted personal info, send shortlist notification.
          try {
            const addedRoleNorm = addedByRole ? String(addedByRole).toLowerCase() : null;
            const allowed = ['superadmin', 'recruiter', 'hiringassistant'];
            // extractedName/extractedEmail are declared earlier near requeue logic
            const extractedNameLocal = evaluation?.ExtractedInfo?.fullName || evaluation?.ExtractedInfo?.name || null;
            const extractedEmailLocal = evaluation?.ExtractedInfo?.email ? String(evaluation.ExtractedInfo.email).trim() : null;
            if (addedRoleNorm && allowed.includes(addedRoleNorm) && extractedNameLocal && extractedEmailLocal && !String(extractedEmailLocal).toLowerCase().includes('example.com')) {
              try {
                const jobDocForEmail = await JobPostings.findOne({ JobID: String(jobId) });
                const jobTitle = jobDocForEmail && jobDocForEmail.JobTitle ? jobDocForEmail.JobTitle : '';
                const companyName = jobDocForEmail && jobDocForEmail.CompanyName ? jobDocForEmail.CompanyName : '';
                await sendShortlistNotification(extractedEmailLocal, extractedNameLocal, jobTitle, companyName, jobId);
                console.log(`📧 Sent shortlist notification to ${extractedEmailLocal} for job ${jobId}`);
              } catch (emailErr) {
                console.error('Failed to send shortlist email:', emailErr && emailErr.message ? emailErr.message : emailErr);
              }
            }
          } catch (e) {
            console.error('Shortlist email check failed:', e && e.message ? e.message : e);
          }

          return {
            candidateEmail,
            CV_Score: evaluation?.CV_Score,
            status: 'completed',
            timestamp: new Date(),
          };
        }

        // If atomic update did not succeed, continue to ensure jobDoc is updated and saved (fallback path handled above)
        // If extracted email was found and user was updated, update the candidate email in job doc
        if (evaluation?.ExtractedInfo?.email) {
          const _exEmail = String(evaluation.ExtractedInfo.email);
          if (_exEmail && candidateEmail.match(/^ca\d+@example\.com$/i) && _exEmail !== candidateEmail && !_exEmail.includes('example.com')) {
            jobDoc.markModified(`Candidates.${candidateIndex}.Email`);
          }
        }

        // Ensure ApplicationStatus is set to indicate processing is complete
        if (!jobDoc.Candidates[candidateIndex].ApplicationStatus || jobDoc.Candidates[candidateIndex].ApplicationStatus === 'Pending') {
          jobDoc.Candidates[candidateIndex].ApplicationStatus = 'CV Processed';
        }

        // Save evaluation results into the job document (fallback)
        jobDoc.markModified(`Candidates.${candidateIndex}.ResumeBreakdown`);
        jobDoc.markModified(`Candidates.${candidateIndex}.CV_Score`);
        jobDoc.markModified(`Candidates.${candidateIndex}.CompositeScore`);
        jobDoc.markModified(`Candidates.${candidateIndex}.Flags`);
        jobDoc.markModified(`Candidates.${candidateIndex}.Email`);
        jobDoc.markModified(`Candidates.${candidateIndex}.ApplicationStatus`);
        
        try {
          await jobDoc.save();
          console.log(`✅ Successfully saved evaluation for ${candidateEmail} in job ${jobId}`);
          console.log(`   CV_Score: ${jobDoc.Candidates[candidateIndex].CV_Score}`);
          console.log(`   ResumeBreakdown: ${jobDoc.Candidates[candidateIndex].ResumeBreakdown ? 'present' : 'missing'}`);
        } catch (saveErr) {
          console.error(`❌ Failed to save job document:`, saveErr.message);
          throw saveErr;
        }

        return {
          candidateEmail,
          CV_Score: evaluation.CV_Score,
          status: 'completed',
          timestamp: new Date(),
        };
      } catch (error) {
        console.error(`❌ Resume evaluation error for candidate at index ${candidateIndex}:`, error.message);

        // Update candidate with error status but don't fail the job
        try {
          const jobDoc = await JobPostings.findOne({ JobID: String(jobId) });
          if (jobDoc && jobDoc.Candidates[candidateIndex]) {
            jobDoc.Candidates[candidateIndex].Flags = ['EVALUATION_FAILED'];
            jobDoc.markModified(`Candidates.${candidateIndex}.Flags`);
            await jobDoc.save();
          }
        } catch (saveErr) {
          console.error('Failed to save error flag:', saveErr);
        }

        // Throw error to mark job as failed in queue
        throw new Error(`Resume evaluation failed: ${error.message}`);
      }
    });
  } catch (err) {
    console.error('Failed to attach resume evaluation processor:', err);
    throw err;
  }
})();

/**
 * Get the evaluation progress for a batch of resume uploads
 */
const getEvaluationProgress = async (uploadBatchId) => {
  try {
    const client = createRedisClient();
    await client.connect();

    const progress = await client.get(`upload_batch:${uploadBatchId}`);
    await client.quit();

    if (!progress) return null;

    return JSON.parse(progress);
  } catch (error) {
    console.error('Error getting evaluation progress:', error);
    return null;
  }
};

/**
 * Queue a resume for evaluation
 */
const queueResumeEvaluation = async (jobId, candidateIndex, candidateId, candidateEmail, cvUrl, evaluationCriteria, requeueCount = 0, addedByRole = null) => {
  try {
    const { resumeEvaluationQueue } = await getQueues();

    const job = await resumeEvaluationQueue.add(
      {
        jobId,
        candidateIndex,
        candidateId,
        candidateEmail,
        cvUrl,
        evaluationCriteria,
        addedByRole,
        requeueCount,
      },
      {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      }
    );

    console.log(`📌 Queued resume evaluation, Job ID: ${job.id}`);
    return job.id;
  } catch (error) {
    console.error('Error queueing resume evaluation:', error);
    throw error;
  }
};

module.exports = {
  queueResumeEvaluation,
  getEvaluationProgress,
};
