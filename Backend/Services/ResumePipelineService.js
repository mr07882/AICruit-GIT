const axios = require('axios');

// Resume Pipeline API base URL (Python FastAPI server)
const RESUME_PIPELINE_API_URL = process.env.RESUME_PIPELINE_API_URL || 'http://localhost:8000';

/**
 * Service to interact with the Resume Pipeline API (Python FastAPI)
 */
class ResumePipelineService {
    /**
     * Segment job description text into Non-Negotiable and Negotiable requirements
     * @param {string} jdText - Raw job description text
     * @returns {Promise<Object>} - Segmented JD with NonNegotiable and Negotiable arrays
     */
    async segmentJobDescription(jdText) {
        try {
            const response = await axios.post(`${RESUME_PIPELINE_API_URL}/segment-jd`, {
                jd_text: jdText
            }, {
                timeout: 60000, // 60 second timeout for AI processing
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // Response format: { segmented_jd: { "Non-Negotiable Requirements": [...], "Negotiable Requirements": [...] } }
            const segmentedJd = response.data.segmented_jd;

            return {
                NonNegotiable: segmentedJd['Non-Negotiable Requirements'] || [],
                Additional: segmentedJd['Negotiable Requirements'] || []
            };
        } catch (error) {
            console.error('Resume Pipeline API - JD Segmentation Error:', error.message);

            if (error.response) {
                throw new Error(`JD Segmentation failed: ${error.response.data.detail || error.response.statusText}`);
            } else if (error.request) {
                throw new Error('Resume Pipeline API is not reachable. Please ensure the Python server is running on port 8000.');
            } else {
                throw new Error(`JD Segmentation error: ${error.message}`);
            }
        }
    }

    /**
     * Process and extract information from a resume
     * @param {string} resumeUrl - Cloudinary URL of the resume (PDF/DOCX)
     * @returns {Promise<Object>} - Extracted resume information
     */
    async processResume(resumeUrl) {
        try {
            const axios = require('axios');
            const tempfile = require('tempfile');
            const fs = require('fs');

            // Download the resume
            const response = await axios.get(resumeUrl, { responseType: 'arraybuffer' });
            const tempPath = tempfile(resumeUrl.endsWith('.pdf') ? '.pdf' : '.docx');
            fs.writeFileSync(tempPath, response.data);

            // Load and process resume using the pipeline modules
            const { load_resume } = require('../../Resume_Pipeline/loader_resume');
            const { segment_resume } = require('../../Resume_Pipeline/resume_segment');
            const { format_resume_text } = require('../../Resume_Pipeline/resume_format');

            const resumeText = load_resume(tempPath);
            const segmented = segment_resume(resumeText);
            const formatted = format_resume_text(segmented);

            // Clean up temp file
            fs.unlinkSync(tempPath);

            // Extract personal information
            const personalInfo = formatted['Personal Information'] || '';
            const extractName = (text) => {
                // Simple name extraction from personal info
                const lines = text.split('\n').filter(l => l.trim());
                return lines[0]?.trim() || null;
            };

            const extractEmail = (text) => {
                const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
                const match = text.match(emailRegex);
                return match ? match[0] : null;
            };

            return {
                fullName: extractName(personalInfo),
                email: extractEmail(personalInfo),
                formattedResume: formatted
            };
        } catch (error) {
            console.error('Resume processing error:', error);
            return { fullName: null, email: null, formattedResume: null };
        }
    }

    /**
     * Evaluate a resume against a job description
     * @param {string} resumeUrl - Cloudinary URL of the resume (PDF/DOCX)
     * @param {Object} jdJson - Segmented JD JSON with NonNegotiable and Negotiable/Additional fields
     * @returns {Promise<Object>} - Evaluation results with scores, breakdown, and extracted info
     */
    async evaluateResume(resumeUrl, jdJson) {
        try {
            // Transform jdJson to match Python API expected format
            const jdFormatted = {
                'Non-Negotiable Requirements': jdJson.NonNegotiable || [],
                'Negotiable Requirements': jdJson.Additional || jdJson.Negotiable || []
            };

            const response = await axios.post(`${RESUME_PIPELINE_API_URL}/evaluate-resume`, {
                resume_url: resumeUrl,
                jd_json: jdFormatted
            }, {
                timeout: 120000, // 2 minute timeout for resume processing
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // Log the full response for debugging
            console.log('Python API Response:', JSON.stringify(response.data, null, 2));

            // Response format: { evaluation: { ... } }
            const evaluation = response.data.evaluation;

            if (!evaluation) {
                console.error('No evaluation data in response:', response.data);
                throw new Error('Invalid response from Python API - no evaluation data');
            }

            // Extract scores and parse them
            const parseScore = (scoreStr) => {
                if (!scoreStr) return null;
                const match = String(scoreStr).match(/(\d+(?:\.\d+)?)/);
                return match ? parseFloat(match[1]) : null;
            };

            // Try multiple key variations (API response format may vary)
            // IMPORTANT: Check more specific terms first to avoid matching "Negotiable" in "Non-Negotiable"
            const findKey = (obj, searchTerms, excludeTerms = []) => {
                for (const key of Object.keys(obj)) {
                    const keyLower = key.toLowerCase();
                    // Check if key contains excluded terms
                    const hasExcluded = excludeTerms.some(term => keyLower.includes(term.toLowerCase()));
                    if (hasExcluded) continue;

                    // Check if key matches search terms
                    for (const term of searchTerms) {
                        if (keyLower.includes(term.toLowerCase())) {
                            return obj[key];
                        }
                    }
                }
                return null;
            };

            const nonNegCriteria = findKey(evaluation, ['non-negotiable criteria', 'non-negotiable']);
            // For negotiable, exclude "non-negotiable" to avoid matching it
            const negCriteria = findKey(evaluation, ['negotiable criteria', 'negotiable'], ['non-negotiable']) || findKey(evaluation, ['additional criteria']);
            const continuityCriteria = findKey(evaluation, ['continuity', 'recency']);

            console.log('[DEBUG] Matched criteria objects:', {
                nonNegCriteria,
                negCriteria,
                continuityCriteria
            });

            const nonNegScore = parseScore(nonNegCriteria?.score);
            const negScore = parseScore(negCriteria?.score);
            const continuityScore = parseScore(continuityCriteria?.score);

            console.log('Parsed scores:', { nonNegScore, negScore, continuityScore });

            // Calculate composite score (weighted average)
            let compositeScore = null;
            if (nonNegScore !== null && negScore !== null && continuityScore !== null) {
                compositeScore = Math.round((nonNegScore * 0.5) + (negScore * 0.3) + (continuityScore * 0.2));
                console.log(`📊 Composite Score Calculation: (${nonNegScore}*0.5) + (${negScore}*0.3) + (${continuityScore}*0.2) = ${compositeScore}`);
            } else {
                console.warn(`⚠️ Composite score not calculated - missing scores: nonNeg=${nonNegScore}, neg=${negScore}, continuity=${continuityScore}`);
            }

            // Extract personal information from the entire evaluation response
            let candidateName = null;
            let candidateEmail = null;

            // Convert entire response to text for searching
            const fullText = JSON.stringify(response.data);

            // First try to extract from description text which often mentions the candidate's name
            const descTexts = [];
            Object.values(evaluation).forEach(item => {
                if (item && item.description) {
                    descTexts.push(item.description);
                }
            });
            const descriptionText = descTexts.join(' ');

            // First priority: Use personal_info from Python API if available
            if (evaluation.personal_info) {
                if (evaluation.personal_info.full_name) {
                    candidateName = evaluation.personal_info.full_name;
                    console.log('[Python API] Extracted name:', candidateName);
                }
                if (evaluation.personal_info.email) {
                    candidateEmail = evaluation.personal_info.email;
                    console.log('[Python API] Extracted email:', candidateEmail);
                }
            }

            // Fallback: Try to extract from evaluation descriptions
            if (!candidateName || !candidateEmail) {
                // Extract email from full response text
                if (!candidateEmail) {
                    const emailMatch = fullText.match(/[\w.-]+@[\w.-]+\.\w+/);
                    if (emailMatch) candidateEmail = emailMatch[0];
                }

                // Look for name patterns in descriptions
                if (!candidateName) {
                    const namePatterns = [
                        // "Sarah Faisal has...", "John Smith holds..." - capture all capitalized words before verb (greedy)
                        /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:has|holds|demonstrates|shows|lists|completed|worked|possesses|brings|excels)/,
                        // In descriptions: "The candidate, Sarah Faisal, ..."
                        /candidate[,\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})[,\s]/i,
                    ];

                    for (const pattern of namePatterns) {
                        const match = descriptionText.match(pattern);
                        if (match && match[1]) {
                            const potentialName = match[1].trim();
                            // Validate it's not a common word or technical term
                            const excludeTerms = ['The', 'There', 'This', 'That', 'Their', 'These', 'Data Science', 'Computer Science', 'Machine Learning'];

                            const isExcluded = excludeTerms.some(term => potentialName.startsWith(term));

                            if (!isExcluded && potentialName.split(' ')[0].length >= 3) {
                                candidateName = potentialName;
                                break;
                            }
                        }
                    }
                }

                // If still no name found, try to construct from email
                if (!candidateName && candidateEmail) {
                    const localPart = candidateEmail.split('@')[0];
                    if (localPart.includes('.') || localPart.includes('_')) {
                        const parts = localPart.split(/[._-]/);
                        if (parts.length >= 2 && parts[0].length > 1) {
                            candidateName = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
                        }
                    }
                }
            }

            console.log('Extracted candidate info:', { candidateName, candidateEmail });

            // Format breakdown for display (convert objects to readable strings)
            const formatCriteria = (criteria) => {
                if (!criteria) return 'Not evaluated';
                return `Score: ${criteria.score}\n${criteria.description}`;
            };

            const responseData = {
                CV_Score: compositeScore,
                ResumeBreakdown: {
                    'Non-Negotiable Requirements': formatCriteria(nonNegCriteria),
                    'Negotiable Requirements': formatCriteria(negCriteria),
                    'Experience Continuity & Recency': formatCriteria(continuityCriteria)
                },
                Flags: [],
                ExtractedInfo: {
                    fullName: candidateName,
                    email: candidateEmail
                }
            };
            
            console.log('🔍 ResumePipelineService returning:', { CV_Score: responseData.CV_Score, hasResumeBreakdown: !!responseData.ResumeBreakdown });
            
            return responseData;
        } catch (error) {
            console.error('Resume Pipeline API - Resume Evaluation Error:', error.message);

            if (error.response) {
                throw new Error(`Resume Evaluation failed: ${error.response.data.detail || error.response.statusText}`);
            } else if (error.request) {
                throw new Error('Resume Pipeline API is not reachable. Please ensure the Python server is running on port 8000.');
            } else {
                throw new Error(`Resume Evaluation error: ${error.message}`);
            }
        }
    }

    /**
     * Health check for Resume Pipeline API
     * @returns {Promise<boolean>} - True if API is healthy
     */
    async healthCheck() {
        try {
            const response = await axios.get(`${RESUME_PIPELINE_API_URL}/health`, {
                timeout: 5000
            });
            return response.data.status === 'healthy';
        } catch (error) {
            console.error('Resume Pipeline API health check failed:', error.message);
            return false;
        }
    }
}

module.exports = new ResumePipelineService();
