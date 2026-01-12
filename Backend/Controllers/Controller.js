const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const validator = require('validator');
const nodemailer = require('nodemailer');
const cloudinary = require('cloudinary').v2;
const { queueResumeEvaluation } = require('../Services/resumeEvaluationQueue');
const ResumePipelineService = require('../Services/ResumePipelineService');
const JobPostings = require('../Models/JobPostings');
const Users = require('../Models/Users');
const NotificationSettings = require('../Models/NotificationSettings');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
// Send invitation email (best-effort)
async function sendInvitationEmail(to, role = 'user', fullName = '', extraQuery = '') {
    try {
        // Check if notifications should be sent based on role
        let recipientType = 'recruiter'; // default
        if (String(role || '').toLowerCase() === 'hiringassistant') {
            recipientType = 'hiringAssistant';
        }
        
        const { _shouldSendNotification } = require('../Services/EmailService');
        const shouldSend = await _shouldSendNotification(recipientType);
        if (!shouldSend) {
            console.log(`${recipientType} notifications are disabled. Skipping sendInvitationEmail to:`, to);
            return { skipped: true, message: `${recipientType} notifications are disabled` };
        }

        let transporter;
        if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASS) {
            transporter = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 587, secure: false, auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASS } });
        } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587, secure: process.env.SMTP_SECURE === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
        } else {
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({ host: 'smtp.ethereal.email', port: 587, secure: false, auth: { user: testAccount.user, pass: testAccount.pass } });
        }

        const frontendBase = (process.env.FRONTEND_BASE_URL && String(process.env.FRONTEND_BASE_URL).trim()) || 'http://localhost:3000';
        const baseClean = String(frontendBase).replace(/\/$/, '');
        const signinUrl = `${baseClean}/signup${extraQuery ? `?${extraQuery}` : ''}`;

        const displayName = fullName && String(fullName).trim() ? String(fullName).trim() : '';
        const roleLabel = String(role || 'user').replace(/([A-Z])/g, ' $1').trim();

        const html = `
            <div style="font-family: Arial, Helvetica, sans-serif; background: #ffffff; padding: 24px;">
                <div style="max-width:600px;margin:0 auto;border-radius:8px;overflow:hidden;border:1px solid #eee;">
                    <div style="background:linear-gradient(90deg,#6d28d9,#7c3aed);padding:20px;color:#fff;text-align:center;">
                        <h1 style="margin:0;font-size:20px;">AI Cruit</h1>
                    </div>
                    <div style="background:#fff;padding:24px;color:#111;">
                        <p style="font-size:16px;margin:0 0 12px;">Dear ${displayName || 'Colleague'},</p>
                        <p style="margin:0 0 12px;font-size:14px;color:#333;">You have been invited to join <strong>AI Cruit</strong> as a <strong>${roleLabel}</strong>. To access the platform, please sign in using this email address.</p>
                        <p style="margin:0 0 18px;font-size:14px;color:#333;">Click the button below to open the sign-in page and complete your account setup.</p>
                        <div style="text-align:center;margin-bottom:18px;">
                            <a href="${signinUrl}" style="display:inline-block;padding:12px 20px;background:#6d28d9;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Get started on AI Cruit</a>
                        </div>
                        <p style="font-size:12px;color:#999;margin:0;">If you weren't expecting this invitation, you can safely ignore this email.</p>
                    </div>
                    <div style="background:#fafafa;padding:12px;text-align:center;font-size:12px;color:#777;">
                        <span>© ${new Date().getFullYear()} AI Cruit</span>
                    </div>
                </div>
            </div>
        `;

        const info = await transporter.sendMail({
            from: process.env.FROM_EMAIL || process.env.GMAIL_USER || 'no-reply@aicruit.example',
            to,
            subject: `You're invited to join AI Cruit as a ${roleLabel}`,
            text: `You have been invited to join AI Cruit as a ${roleLabel}. Sign in: ${signinUrl}`,
            html
        });

        const preview = nodemailer.getTestMessageUrl(info);
        return { info, preview };
    } catch (err) {
        console.error('sendInvitationEmail error:', err && err.message ? err.message : err);
        throw err;
    }
}

// Helper to send candidate status update emails
async function sendCandidateStatusEmail(to, fullName, job, newStatus, jobId) {
    try {
        // Check if notifications to candidates should be sent
        const { _shouldSendNotification } = require('../Services/EmailService');
        const shouldSend = await _shouldSendNotification('candidate');
        if (!shouldSend) {
            console.log('Candidate notifications are disabled. Skipping sendCandidateStatusEmail to:', to);
            return { skipped: true, message: 'Candidate notifications are disabled' };
        }

        let transporter;
        if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASS) {
            transporter = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 587, secure: false, auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASS } });
        } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587, secure: process.env.SMTP_SECURE === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
        } else {
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({ host: 'smtp.ethereal.email', port: 587, secure: false, auth: { user: testAccount.user, pass: testAccount.pass } });
        }

        const frontendBase = (process.env.FRONTEND_BASE_URL && String(process.env.FRONTEND_BASE_URL).trim()) || 'http://localhost:3000';
        const baseClean = String(frontendBase).replace(/\/$/, '');
        // Link to login page; include jobId so frontend can deep-link after signin
        const signinUrl = `${baseClean}/login${jobId ? `?jobId=${encodeURIComponent(String(jobId))}` : ''}`;

        const name = fullName && String(fullName).trim() ? String(fullName).trim() : '';
        const jobTitle = job && job.JobTitle ? String(job.JobTitle) : '';

        // Compose subject and message based on status
        let subject = `Update on your application for ${jobTitle || 'the role'}`;
        let preamble = '';
        let body = '';
        // whether to include sign-in CTA/link in the email
        let includeSignin = true;

        switch (String(newStatus || '')) {
            case 'Shortlisted For AI-Interview':
                subject = `You're invited for an AI interview — ${jobTitle}`;
                preamble = `Good news${name ? `, ${name}` : ''}!`;
                body = `You have been selected to proceed to the AI interview round for ${jobTitle}. Please sign in to your AI Cruit account to begin the AI interview at your convenience.`;
                break;
            case 'Shortlisted For Human Interview':
                subject = `You're shortlisted for a human interview — ${jobTitle}`;
                preamble = `Hello${name ? `, ${name}` : ''}`;
                body = `You have been shortlisted for a human interview for ${jobTitle}. Please sign in to your AI Cruit account to view scheduling details and next steps.`;
                break;
            case 'AI-Interview Completed':
                subject = `AI interview completed — ${jobTitle}`;
                preamble = `Hello${name ? `, ${name}` : ''}`;
                body = `Your AI interview for ${jobTitle} has been recorded as completed. Thank you for taking the interview. Don't worry! You will be updated about your application status.`;
                // For this status we do not need a sign-in CTA/link
                includeSignin = false;
                break;
            case 'Accepted':
                subject = `Congratulations — ${jobTitle}`;
                preamble = `Congratulations${name ? `, ${name}` : ''}!`;
                body = `You have been accepted for the role of ${jobTitle}. Please sign in to your AI Cruit account to view onboarding instructions and next steps.`;
                break;
            case 'Rejected':
                subject = `Update on your application — ${jobTitle}`;
                preamble = `Hello${name ? `, ${name}` : ''}`;
                body = `We appreciate your interest in ${jobTitle}. After careful consideration, we will not be moving forward with your application at this time.`;
                break;
            default:
                subject = `Update on your application — ${jobTitle}`;
                preamble = `Hello${name ? `, ${name}` : ''}`;
                body = `Your application status for ${jobTitle} has been updated to: ${newStatus}. Please sign in to your AI Cruit account for details.`;
                break;
        }

        const html = `
            <div style="font-family: Arial, Helvetica, sans-serif; background: #f9fafb; padding: 24px;">
              <div style="max-width:600px;margin:0 auto;border-radius:8px;overflow:hidden;border:1px solid #e6e6f0;">
                <div style="background:linear-gradient(90deg,#6d28d9,#7c3aed);padding:20px;color:#fff;text-align:center;">
                  <h1 style="margin:0;font-size:20px;">AI Cruit</h1>
                </div>
                <div style="background:#fff;padding:24px;color:#111;">
                  <p style="margin:0 0 12px;font-size:16px;">${preamble}</p>
                  <p style="margin:0 0 16px;font-size:14px;color:#333;">${body}</p>
                                    ${includeSignin ? `
                                    <div style="text-align:center;margin:18px 0;">
                                        <a href="${signinUrl}" style="display:inline-block;padding:12px 20px;background:#6d28d9;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Sign in to AI Cruit</a>
                                    </div>
                                    ` : ''}
                  <p style="font-size:12px;color:#777;margin:0;">If you have any questions, reply to this email or contact the hiring team.</p>
                </div>
                <div style="background:#fafafa;padding:12px;text-align:center;font-size:12px;color:#777;">© ${new Date().getFullYear()} AI Cruit</div>
              </div>
            </div>
        `;

        const info = await transporter.sendMail({
            from: process.env.FROM_EMAIL || process.env.GMAIL_USER || 'no-reply@aicruit.example',
            to,
            subject,
            text: `${preamble}\n\n${body}${includeSignin ? `\n\nSign in: ${signinUrl}` : ''}`,
            html
        });

        const preview = nodemailer.getTestMessageUrl(info);
        return { info, preview };
    } catch (err) {
        console.error('sendCandidateStatusEmail error:', err && err.message ? err.message : err);
        throw err;
    }
}

// Send OTP email for signup verification
async function sendOtpEmail(to, otp) {
    try {
        let transporter;
        if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASS) {
            transporter = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 587, secure: false, auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASS } });
        } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587, secure: process.env.SMTP_SECURE === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
        } else {
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({ host: 'smtp.ethereal.email', port: 587, secure: false, auth: { user: testAccount.user, pass: testAccount.pass } });
        }

        const frontendBase = (process.env.FRONTEND_BASE_URL && String(process.env.FRONTEND_BASE_URL).trim()) || 'http://localhost:3000';
        const baseClean = String(frontendBase).replace(/\/$/, '');

        const html = `
            <div style="font-family: Arial, Helvetica, sans-serif; background: #ffffff; padding: 24px;">
                <div style="max-width:600px;margin:0 auto;border-radius:8px;overflow:hidden;border:1px solid #eee;">
                    <div style="background:linear-gradient(90deg,#6d28d9,#7c3aed);padding:20px;color:#fff;text-align:center;">
                        <h1 style="margin:0;font-size:20px;">AI Cruit</h1>
                    </div>
                    <div style="background:#fff;padding:24px;color:#111;text-align:center;">
                        <p style="font-size:16px;margin:0 0 12px;">Your verification code is</p>
                        <div style="display:inline-block;padding:12px 18px;background:#f3f4f6;border-radius:8px;margin:12px 0;font-size:22px;font-weight:700;">${otp}</div>
                        <p style="font-size:12px;color:#666;margin:8px 0 0;">This code will expire in 10 minutes. Do not share this code with anyone.</p>
                    </div>
                    <div style="background:#fafafa;padding:12px;text-align:center;font-size:12px;color:#777;">© ${new Date().getFullYear()} AI Cruit</div>
                </div>
            </div>
        `;

        const info = await transporter.sendMail({
            from: process.env.FROM_EMAIL || process.env.GMAIL_USER || 'no-reply@aicruit.example',
            to,
            subject: 'Your AI Cruit verification code',
            text: `Your verification code is ${otp}. It expires in 10 minutes.`,
            html
        });

        const preview = nodemailer.getTestMessageUrl(info);
        return { info, preview };
    } catch (err) {
        console.error('sendOtpEmail error:', err && err.message ? err.message : err);
        throw err;
    }
}


//CREATING A SUPERADMIN (ALLOWS ONE SUPER ADMIN IN THE SYSTEM ONLY)
exports.CreateSuperAdmin = async (req, res) => {
    try {
        const { Email, Password, FullName } = req.body;

        // Basic validation
        if (!Email || !Password || !FullName) {
            return res.status(400).json({ message: 'Email, Password and FullName are required' });
        }

        //CHECKING IF THE SUPERADMIN ALREADY EXISTS
        const ExistingSuperAdmin = await Users.findOne({ Role: 'SuperAdmin' });
        if (ExistingSuperAdmin) {
            return res.status(400).json({ message: 'SuperAdmin already exists' });
        }

        // Hash the password
        const HashedPassword = await bcrypt.hash(Password, 10);

        // Create the SuperAdmin (ensure FullName is stored)
        const NewSuperAdmin = new Users({ Email: String(Email).trim(), Password: HashedPassword, Role: 'SuperAdmin', FullName: String(FullName).trim() });
        await NewSuperAdmin.save();

        res.status(201).json({ message: 'SuperAdmin created successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Invite Recruiter
exports.InviteRecruiter = async (req, res) => {
    try {
        // Require authenticated user (verifyToken middleware should set req.user)
        const requester = req.user || {};
        const requesterRole = requester.role || requester.Role || null;
        if (!requesterRole) return res.status(401).json({ message: 'Unauthorized' });

        // Only SuperAdmin or Recruiter can invite recruiters
        if (!['SuperAdmin', 'Recruiter'].includes(requesterRole)) {
            return res.status(403).json({ message: 'Insufficient permissions to invite recruiters.' });
        }

        let { Email, FullName } = req.body;
        if (!Email) return res.status(400).json({ message: 'Email is required.' });
        Email = String(Email).trim();

        // Check if the email already exists
        const existingUser = await Users.findOne({ Email: Email });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }

        // Create a new Recruiter
        const newRecruiter = new Users({
            Email: Email,
            FullName: FullName || '',
            Role: 'Recruiter',
            Password: '', // Empty password initially
            InvitationAccepted: false,
        });

        await newRecruiter.save();
        // send invitation email (best-effort)
        (async () => {
            try {
                await sendInvitationEmail(Email, 'Recruiter', FullName || '');
            } catch (e) {
                console.error('Failed to send recruiter invitation email to', Email, e && e.message ? e.message : e);
            }
        })();

        res.status(201).json({ message: 'Recruiter invited successfully.', user: newRecruiter });
    } catch (error) {
        res.status(500).json({ message: 'Error inviting recruiter.', error: error.message });
    }
};

// Invite Hiring Assistant
exports.InviteHiringAssistant = async (req, res) => {
    try {
        const { JobID, Email, FullName } = req.body;

        if (!JobID || !Email || !FullName) {
            return res.status(400).json({ message: 'JobID, Email and FullName are required.' });
        }

        // Find job by JobID
        const job = await JobPostings.findOne({ JobID: String(JobID) });
        if (!job) return res.status(404).json({ message: 'Job not found.' });

        // Normalize email
        const email = String(Email).trim();

        // Ensure user exists - handle existing roles according to rules:
        // - If user does not exist: create as HiringAssistant with Jobs=[JobID]
        // - If user exists and Role === 'SuperAdmin' => reject with message
        // - If user exists and Role === 'Recruiter' => reject with message
        // - If user exists and Role === 'HiringAssistant' => append JobID to Jobs if not present, or return message if already present
        // - For any other existing role (e.g., Candidate) convert to HiringAssistant and append JobID
        let user = await Users.findOne({ Email: email });
        if (!user) {
            // Create user with provided FullName (FullName is required by schema)
            user = new Users({
                Email: email,
                FullName: String(FullName).trim(),
                Role: 'HiringAssistant',
                Password: '',
                Jobs: [String(JobID)],
                InvitationAccepted: false,
            });
            await user.save();
        } else {
            const role = String(user.Role || '').trim();
            if (role === 'SuperAdmin') {
                return res.status(400).json({ message: 'The user is a SuperAdmin and already collaborating on jobs; cannot add as Hiring Assistant.' });
            }
            if (role === 'Recruiter') {
                return res.status(400).json({ message: 'The user exists as a Recruiter and cannot be added as a Hiring Assistant.' });
            }

            // If already a HiringAssistant, ensure the Jobs array contains this JobID
            if (role === 'HiringAssistant') {
                const existingJobs = Array.isArray(user.Jobs) ? user.Jobs.map(j => String(j)) : [];
                if (existingJobs.includes(String(JobID))) {
                    return res.status(400).json({ message: 'This Hiring Assistant is already assigned to this job.' });
                }
                existingJobs.push(String(JobID));
                user.Jobs = existingJobs;
                // Ensure FullName exists
                if ((!user.FullName || String(user.FullName).trim() === '') && FullName) {
                    user.FullName = String(FullName).trim();
                }
                await user.save();
            } else {
                // Other roles (e.g., Candidate) - convert to HiringAssistant and add job
                user.Role = 'HiringAssistant';
                const existingJobs = Array.isArray(user.Jobs) ? user.Jobs.map(j => String(j)) : [];
                if (!existingJobs.includes(String(JobID))) existingJobs.push(String(JobID));
                user.Jobs = existingJobs;
                if ((!user.FullName || String(user.FullName).trim() === '') && FullName) {
                    user.FullName = String(FullName).trim();
                }
                await user.save();
            }
        }

        // Add the assistant email to the job Owners if not already present
        const owners = Array.isArray(job.Owners) ? job.Owners.map(o => String(o)) : [];
        if (!owners.includes(email)) {
            owners.push(email);
            job.Owners = owners;
            await job.save();
        }

        // send invitation email (include jobId so frontend can redirect if needed)
        (async () => {
            try {
                await sendInvitationEmail(email, 'HiringAssistant', FullName || '', `jobId=${encodeURIComponent(String(JobID))}`);
            } catch (e) {
                console.error('Failed to send hiring assistant invitation email to', email, e && e.message ? e.message : e);
            }
        })();

        return res.status(200).json({ message: 'Hiring Assistant invited and added to job owners.', user, job });
    } catch (error) {
        console.error('InviteHiringAssistant error:', error);
        return res.status(500).json({ message: 'Error inviting hiring assistant.', error: error.message });
    }
};

// Signup Request: generate and send OTP, store temp password and otp
exports.SignupRequest = async (req, res) => {
    try {
        const { Email, FullName, Password } = req.body;
        if (!Email || !FullName || !Password) {
            return res.status(400).json({ message: 'Email, FullName and Password are required.' });
        }

        if (!validator.isEmail(Email)) {
            return res.status(400).json({ message: 'Invalid email format.' });
        }

        // generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Check existing user
        let user = await Users.findOne({ Email });
        if (user && user.Password && user.Password !== '') {
            return res.status(400).json({ message: 'User already exists.' });
        }

        const hashedTemp = await bcrypt.hash(Password, 10);

        if (!user) {
            user = new Users({
                Email,
                Role: 'Candidate',
                TempPassword: hashedTemp,
                SignupOtp: otp,
                SignupOtpExpires: expires,
                SignupVerified: false,
                FullName,
                InvitationAccepted: false,
            });
        } else {
            user.TempPassword = hashedTemp;
            user.SignupOtp = otp;
            user.SignupOtpExpires = expires;
            user.SignupVerified = false;
            user.FullName = FullName || user.FullName;
        }

        await user.save();

        // send OTP email
        let preview;
        try {
            const result = await sendOtpEmail(Email, otp);
            preview = result.preview;
        } catch (err) {
            console.error('OTP email send failed:', err.message);
            // continue — still return ok but warn
        }

        // For local development (no SMTP) return the OTP in the response
        const devMode = process.env.NODE_ENV !== 'production';
        const resp = { message: 'OTP sent to email.', preview };
        if (devMode) resp.otp = otp;
        return res.status(200).json(resp);
    } catch (error) {
        console.error('SignupRequest error:', error);
        return res.status(500).json({ message: 'Error sending OTP.', error: error.message });
    }
};

// Signup Verify: verify OTP and finalize registration
exports.SignupVerify = async (req, res) => {
    try {
        const { Email, Otp } = req.body;
        if (!Email || !Otp) {
            return res.status(400).json({ message: 'Email and Otp are required.' });
        }

        const user = await Users.findOne({ Email });
        if (!user) return res.status(404).json({ message: 'User not found.' });

        if (!user.SignupOtp || !user.SignupOtpExpires) {
            return res.status(400).json({ message: 'No OTP requested for this email.' });
        }

        if (new Date() > new Date(user.SignupOtpExpires)) {
            return res.status(400).json({ message: 'OTP has expired.' });
        }

        if (String(user.SignupOtp) !== String(Otp)) {
            return res.status(400).json({ message: 'Invalid OTP.' });
        }

        // finalize
        if (user.TempPassword) {
            user.Password = user.TempPassword;
            user.TempPassword = undefined;
        }
        user.SignupVerified = true;
        user.SignupOtp = undefined;
        user.SignupOtpExpires = undefined;
        user.InvitationAccepted = true;
        await user.save();

        const userObj = user.toObject ? user.toObject() : user;
        delete userObj.Password;
        delete userObj.TempPassword;

        // sign JWT
        const secret = process.env.JWT_SECRET || 'change_this_secret';
        const token = jwt.sign({ id: user._id, email: user.Email, role: user.Role }, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

        return res.status(200).json({ message: 'Signup verified and account created.', user: userObj, token });
    } catch (error) {
        console.error('SignupVerify error:', error);
        return res.status(500).json({ message: 'Error verifying OTP.', error: error.message });
    }
};

// Signup (set password if invited, or create candidate)
exports.Signup = async (req, res) => {
    try {
        const { Email, Password, FullName } = req.body;

        if (!Email || !Password || !FullName) {
            return res.status(400).json({ message: 'Email, Password, and FullName are required.' });
        }

        const existingUser = await Users.findOne({ Email });

        if (existingUser) {
            // If password is not set or empty, set it
            if (!existingUser.Password || existingUser.Password === '') {
                const hashed = await bcrypt.hash(Password, 10);
                existingUser.Password = hashed;
                existingUser.FullName = FullName; // Update FullName if it was not set
                existingUser.InvitationAccepted = true;
                await existingUser.save();
                // Issue JWT now that password is set so frontend can sign the user in
                const userObj = existingUser.toObject ? existingUser.toObject() : existingUser;
                delete userObj.Password;
                const secret = process.env.JWT_SECRET || 'change_this_secret';
                const token = jwt.sign({ id: existingUser._id, email: existingUser.Email, role: existingUser.Role }, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
                return res.status(200).json({ message: 'Password set successfully.', user: userObj, token });
            }

            return res.status(400).json({ message: 'User already exists and has a password.' });
        }

        // Create new candidate
        const hashed = await bcrypt.hash(Password, 10);
        const newUser = new Users({
            Email,
            Password: hashed,
            Role: 'Candidate',
            FullName, // Save FullName
            InvitationAccepted: true,
        });

        await newUser.save();

        // sign JWT and return
        const secret = process.env.JWT_SECRET || 'change_this_secret';
        const token = jwt.sign({ id: newUser._id, email: newUser.Email, role: newUser.Role }, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

        const userObj = newUser.toObject ? newUser.toObject() : newUser;
        delete userObj.Password;

        return res.status(201).json({ message: 'Candidate signed up successfully.', user: userObj, token });
    } catch (error) {
        return res.status(500).json({ message: 'Error in signup.', error: error.message });
    }
};

// Signin (authenticate user and return JWT)
exports.Signin = async (req, res) => {
    try {
        const { Email, Password } = req.body;

        if (!Email || !Password) {
            return res.status(400).json({ message: 'Email and Password are required.' });
        }

        const user = await Users.findOne({ Email });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (!user.Password || user.Password === '') {
            return res.status(400).json({ message: 'Password not set. Please accept the invitation or set a password first.' });
        }

        const match = await bcrypt.compare(Password, user.Password);
        if (!match) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const userObj = user.toObject ? user.toObject() : user;
        delete userObj.Password;

        // sign JWT
        const secret = process.env.JWT_SECRET || 'change_this_secret';
        const token = jwt.sign({ id: user._id, email: user.Email, role: user.Role }, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

        return res.status(200).json({ message: 'Signin successful.', user: userObj, token });
    } catch (error) {
        return res.status(500).json({ message: 'Error during signin.', error: error.message });
    }
};

// Reset Password (uses OldPassword verification if provided, otherwise updates directly)
exports.ResetPassword = async (req, res) => {
    try {
        const { Email, NewPassword, OldPassword } = req.body;

        if (!Email || !NewPassword) {
            return res.status(400).json({ message: 'Email and NewPassword are required.' });
        }

        const user = await Users.findOne({ Email });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (OldPassword) {
            if (!user.Password || user.Password === '') {
                return res.status(400).json({ message: 'Old password not set; cannot verify.' });
            }
            const match = await bcrypt.compare(OldPassword, user.Password);
            if (!match) {
                return res.status(401).json({ message: 'Old password is incorrect.' });
            }
        }

        const hashed = await bcrypt.hash(NewPassword, 10);
        user.Password = hashed;
        user.InvitationAccepted = true;
        await user.save();

        return res.status(200).json({ message: 'Password reset successfully.' });
    } catch (error) {
        return res.status(500).json({ message: 'Error resetting password.', error: error.message });
    }
};

// Google OAuth: accept an `id_token` from the frontend, verify with Google,
// create or find a local user record, and return a signed JWT.
exports.GoogleAuth = async (req, res) => {
    try {
        const { id_token } = req.body;
        if (!id_token) return res.status(400).json({ message: 'id_token is required' });

        // Verify token with Google's tokeninfo endpoint
        const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(id_token)}`;
        let googleResp;
        try {
            const r = await axios.get(verifyUrl, { timeout: 5000 });
            googleResp = r.data;
        } catch (err) {
            console.error('Google token verification failed:', err && err.message ? err.message : err);
            return res.status(400).json({ message: 'Invalid Google id_token' });
        }

        // tokeninfo returns fields like email, email_verified, name, picture, sub (user id), aud
        const { email, email_verified, name, aud } = googleResp;
        // If a GOOGLE_CLIENT_ID (or REACT_APP_GOOGLE_CLIENT_ID) is set in env, validate the token audience
        const expectedAud = (process.env.GOOGLE_CLIENT_ID || process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();
        if (expectedAud) {
            if (!aud || String(aud).trim() !== String(expectedAud).trim()) {
                console.error('Google token aud mismatch', { expected: expectedAud, got: aud });
                return res.status(400).json({ message: 'Google id_token audience mismatch' });
            }
        }
        if (!email || email_verified !== 'true' && email_verified !== true) {
            return res.status(400).json({ message: 'Google account email not verified' });
        }

        // Find or create user. For Google OAuth we create or update the user
        // and return a JWT immediately (typical social-login behavior).
        let user = await Users.findOne({ Email: String(email).trim() });
        if (!user) {
            user = new Users({
                Email: String(email).trim(),
                Password: '',
                Role: 'Candidate',
                InvitationAccepted: true,
                SignupVerified: true,
                AuthProvider: 'google',
                FullName: name || String(email).split('@')[0]
            });
            await user.save();
        } else {
            // Update provider and flags if necessary
            let changed = false;
            if ((!user.AuthProvider || String(user.AuthProvider).trim() === '')) { user.AuthProvider = 'google'; changed = true; }
            if (!user.InvitationAccepted) { user.InvitationAccepted = true; changed = true; }
            if (!user.SignupVerified) { user.SignupVerified = true; changed = true; }
            if ((!user.FullName || String(user.FullName).trim() === '') && name) { user.FullName = name; changed = true; }
            if (changed) await user.save();
        }

        const userObj = user.toObject ? user.toObject() : user;
        delete userObj.Password;

        const secret = process.env.JWT_SECRET || 'change_this_secret';
        const token = jwt.sign({ id: user._id, email: user.Email, role: user.Role }, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

        return res.status(200).json({ message: 'Google authentication successful', user: userObj, token });
    } catch (error) {
        console.error('GoogleAuth error:', error && error.message ? error.message : error);
        return res.status(500).json({ message: 'Error during Google authentication', error: error.message });
    }
};

// Create a Job Posting (with optional CV uploads)
exports.CreateJob = async (req, res) => {
    try {
        const {
            JobTitle,
            CompanyName,
            JobDescription,
            NonNegotiable,
            Additional,
            OwnerEmail,
            candidateEmails, // optional comma separated emails
            AutoSegmentJD // optional flag to auto-segment job description
        } = req.body;

        // Required fields - now JobDescription is required, but criteria can be auto-generated
        if (!JobTitle || !CompanyName || !JobDescription || !OwnerEmail) {
            return res.status(400).json({ message: 'JobTitle, CompanyName, JobDescription, and OwnerEmail are required.' });
        }

        // Find creator user
        const creator = await Users.findOne({ Email: OwnerEmail });
        if (!creator) {
            return res.status(404).json({ message: 'Owner user not found.' });
        }

        // Determine owners array
        const owners = [OwnerEmail];
        if (creator.Role === 'Recruiter') {
            const superAdmin = await Users.findOne({ Role: 'SuperAdmin' });
            if (superAdmin && superAdmin.Email && !owners.includes(superAdmin.Email)) {
                owners.push(superAdmin.Email);
            }
        }

        // Parse evaluation criteria (accept comma-separated or arrays)
        const parseList = (val) => {
            if (!val) return [];
            if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
            return String(val).split(',').map(s => s.trim()).filter(Boolean);
        };

        let evalNon = parseList(NonNegotiable);
        let evalAdd = parseList(Additional);

        // Auto-segment job description if requested and criteria not provided
        if (AutoSegmentJD === 'true' || AutoSegmentJD === true) {
            try {
                console.log('Auto-segmenting job description...');
                const segmented = await ResumePipelineService.segmentJobDescription(JobDescription);
                evalNon = segmented.NonNegotiable || evalNon;
                evalAdd = segmented.Additional || evalAdd;
                console.log('Job description segmented successfully');
            } catch (segmentError) {
                console.error('Auto-segmentation failed, using provided criteria:', segmentError.message);
                // Continue with provided criteria if auto-segmentation fails
            }
        }

        // Ensure we have criteria either from user input or auto-segmentation
        if (evalNon.length === 0 && evalAdd.length === 0) {
            return res.status(400).json({ message: 'EvaluationCriteria (NonNegotiable & Additional) are required, or enable AutoSegmentJD.' });
        }

        // Upload CV files (if any). Expect multer to provide files in req.files
        const uploadedCandidates = [];

        // Configure cloudinary using env vars (Server.js loads dotenv earlier)
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        const emails = candidateEmails ? String(candidateEmails).split(',').map(e => e.trim()).filter(Boolean) : [];

        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const file = req.files[i];
                try {
                    // Build upload options: let Cloudinary auto-detect resource type, and set format from file extension
                    const baseName = file.originalname ? String(file.originalname).replace(/\.[^/.]+$/, '') : undefined;
                    const ext = file.originalname ? String(path.extname(file.originalname)).replace('.', '').toLowerCase() : '';
                    // Let Cloudinary generate unique public IDs to avoid collisions when multiple
                    // files share the same original filename. Preserve the original filename
                    // in the stored resource metadata by using `use_filename: true` and
                    // `unique_filename: true` so Cloudinary appends a unique suffix.
                    const uploadOptions = { resource_type: 'auto', use_filename: true, unique_filename: true };
                    if (ext) uploadOptions.format = ext;
                    const result = await cloudinary.uploader.upload(file.path, uploadOptions);
                    console.log('CV upload:', file.originalname, 'mimetype=', file.mimetype, '-> resource_type=', result.resource_type, 'format=', result.format, 'public_id=', result.public_id);

                    const candidateEmail = emails[i] || '';

                    const candidateData = {
                        Email: candidateEmail,
                        CV_Link: result.secure_url,
                        CV_Score: null,
                        AIInterview_Score: null,
                        CompositeScore: null,
                        ResumeBreakdown: null,
                        Flags: [],
                        ApplicationStatus: 'CV Processed',
                    };

                    // Note: Resume evaluation will happen after job is created
                    // because we need the job's EvaluationCriteria
                    uploadedCandidates.push(candidateData);
                } catch (upErr) {
                    // continue but include info about failed upload
                    console.error('CV upload failed for file', file.originalname, upErr.message);
                } finally {
                    // remove temp file if exists
                    try { fs.unlinkSync(file.path); } catch (e) { }
                }
            }
        }

        // Ensure candidate user accounts exist for every provided email
        if (emails && emails.length > 0) {
            for (const email of emails) {
                if (!email) continue;
                try {
                    const existingCandidate = await Users.findOne({ Email: email });
                    if (!existingCandidate) {
                        const newCandidate = new Users({
                            Email: email,
                            Role: 'Candidate',
                            Password: '',
                            InvitationAccepted: false,
                        });
                        await newCandidate.save();
                    }
                } catch (userErr) {
                    console.error('Failed to create candidate user for', email, userErr.message);
                }
            }
        }

        const newJob = new JobPostings({
            JobTitle,
            CompanyName,
            JobDescription,
            EvaluationCriteria: { NonNegotiable: evalNon, Additional: evalAdd },
            Owners: owners,
            Candidates: uploadedCandidates,
        });

        // Compute a public candidate-facing link for this job and store it on the job document.
        // Prefer an explicit FRONTEND_BASE_URL env var; fall back to localhost front-end default.
        const frontendBase = (process.env.FRONTEND_BASE_URL && String(process.env.FRONTEND_BASE_URL).trim()) || 'http://localhost:3000';
        // Ensure there's no trailing slash
        const baseClean = String(frontendBase).replace(/\/$/, '');

        // JobID is generated by the schema default when the document is instantiated
        const jobLink = `${baseClean}/candidate-drop-cv?jobId=${newJob.JobID}`;
        newJob.JobLink = jobLink;

        await newJob.save();

        // If candidate CVs were uploaded during job creation, queue their evaluations
        if (uploadedCandidates.length > 0) {
            const evaluationJobIds = [];

            for (let i = 0; i < uploadedCandidates.length; i++) {
                const candidateData = uploadedCandidates[i];
                try {
                    // Find candidate index in the saved job document (match by CV_Link)
                    const arrayIndex = newJob.Candidates.findIndex(c => c.CV_Link === candidateData.CV_Link);

                    // Queue the resume for async evaluation
                    try {
                        // Determine saved candidate index and id so worker can reliably locate subdocument
                        const chosenIndex = arrayIndex >= 0 ? arrayIndex : i;
                        const candidateDoc = newJob.Candidates && newJob.Candidates[chosenIndex];
                        const candidateId = candidateDoc && candidateDoc._id ? candidateDoc._id : null;

                        const uploaderRole = req.user && (req.user.role || req.user.Role) ? (req.user.role || req.user.Role) : null;
                        const queuedJobId = await queueResumeEvaluation(
                            newJob.JobID,
                            chosenIndex,
                            candidateId,
                            candidateData.Email || '',
                            candidateData.CV_Link,
                            newJob.EvaluationCriteria,
                            0,
                            uploaderRole
                        );
                        evaluationJobIds.push(queuedJobId);
                        console.log('📝 Queued evaluation for', candidateData.Email, 'queuedJobId=', queuedJobId);
                    } catch (queueErr) {
                        console.error('Failed to queue resume evaluation for', candidateData.Email, ':', queueErr.message);
                        // Mark candidate with a flag so UI can reflect pending evaluation
                        const idx = newJob.Candidates.findIndex(c => c.CV_Link === candidateData.CV_Link);
                        if (idx >= 0) {
                            newJob.Candidates[idx].Flags = newJob.Candidates[idx].Flags || [];
                            if (!newJob.Candidates[idx].Flags.includes('EVALUATION_PENDING')) {
                                newJob.Candidates[idx].Flags.push('EVALUATION_PENDING');
                            }
                            newJob.markModified(`Candidates.${idx}.Flags`);
                        }
                    }
                } catch (err) {
                    console.error('Error preparing queue for candidate', candidateData.Email, err.message);
                }
            }

            // Persist any flag changes
            newJob.markModified('Candidates');
            await newJob.save();

            // Return 202 Accepted as evaluations will continue in background
            return res.status(202).json({
                message: 'Job created; resumes uploaded and evaluation queued.',
                job: newJob,
                Added: uploadedCandidates.length,
                JobID: newJob.JobID,
                evaluationJobIds,
                note: 'Resume scores will be updated shortly. Refresh the page in a few moments.'
            });
        }

        return res.status(201).json({ message: 'Job created successfully', job: newJob });
    } catch (error) {
        console.error('CreateJob error:', error);
        return res.status(500).json({ message: 'Error creating job', error: error.message });
    }
};

// Remove Recruiter from JobPostings (only SuperAdmin)
exports.RemoveRecruiter = async (req, res) => {
    try {
        // Accept multiple emails to remove (Emails: array or comma-separated string)
        let { Emails } = req.body;
        if (!Emails) return res.status(400).json({ message: 'Emails are required.' });

        if (typeof Emails === 'string') {
            Emails = Emails.split(',').map(e => String(e).trim()).filter(Boolean);
        }

        if (!Array.isArray(Emails) || Emails.length === 0) {
            return res.status(400).json({ message: 'Emails must be a non-empty array or comma-separated string.' });
        }

        // Normalize for comparisons
        const normalizedSet = new Set(Emails.map(e => String(e).trim().toLowerCase()));

        // Find SuperAdmin email to use as replacement where necessary
        const superAdmin = await Users.findOne({ Role: 'SuperAdmin' });
        if (!superAdmin || !superAdmin.Email) {
            return res.status(500).json({ message: 'SuperAdmin account not found; cannot replace recruiter owner.' });
        }

        // Delete recruiter user documents for the provided emails (only Role === 'Recruiter')
        const deleteResult = await Users.deleteMany({ Email: { $in: Emails }, Role: 'Recruiter' });

        // Remove these emails from JobPostings.Owners across all jobs
        const jobs = await JobPostings.find({ Owners: { $in: Emails } });
        const updatedJobs = [];

        for (const job of jobs) {
            const owners = Array.isArray(job.Owners)
                ? job.Owners.filter(o => !normalizedSet.has(String(o).trim().toLowerCase()))
                : [];

            // If no owners left after removal, replace with superAdmin email
            if (owners.length === 0) {
                owners.push(superAdmin.Email);
            }

            job.Owners = owners;
            await job.save();
            updatedJobs.push({ JobID: job.JobID, Owners: owners });
        }

        return res.status(200).json({ message: 'Recruiters removed from system.', deletedCount: deleteResult.deletedCount, updatedJobs });
    } catch (error) {
        console.error('RemoveRecruiter error:', error);
        return res.status(500).json({ message: 'Error removing recruiter from jobs.', error: error.message });
    }
};

// Remove a HiringAssistant from a specific Job (SuperAdmin or Recruiter)
exports.RemoveHiringAssistant = async (req, res) => {
    try {
        const { JobID, Email } = req.body;

        if (!JobID || !Email) {
            return res.status(400).json({ message: 'JobID and Email are required.' });
        }

        // Find job by JobID
        const job = await JobPostings.findOne({ JobID: String(JobID) });
        if (!job) return res.status(404).json({ message: 'Job not found.' });

        const haEmail = String(Email).trim();

        // Remove all instances of the HiringAssistant email from Owners
        const owners = Array.isArray(job.Owners) ? job.Owners.filter(o => String(o).trim().toLowerCase() !== haEmail.toLowerCase()) : [];

        job.Owners = owners;
        await job.save();

        // Also remove the JobID from the user's Jobs array if present
        let updatedUser = null;
        try {
            const user = await Users.findOne({ Email: haEmail });
            if (user) {
                const userJobs = Array.isArray(user.Jobs) ? user.Jobs.map(j => String(j)) : [];
                const newJobs = userJobs.filter(j => String(j) !== String(JobID));
                // Only save if changed
                if (newJobs.length !== userJobs.length) {
                    user.Jobs = newJobs;
                    await user.save();
                }
                updatedUser = { Email: user.Email, FullName: user.FullName || '', Jobs: user.Jobs || [] };
            }
        } catch (uErr) {
            console.error('Failed to update user Jobs when removing HA:', uErr.message);
        }

        return res.status(200).json({ message: 'Hiring Assistant removed from job.', job, updatedUser });
    } catch (error) {
        console.error('RemoveHiringAssistant error:', error);
        return res.status(500).json({ message: 'Error removing hiring assistant from job.', error: error.message });
    }
};

// Return total recruiters and their emails (PascalCase keys)
exports.AllRecruiters = async (req, res) => {
    try {
        // Return Email and FullName for each recruiter
        const recruiters = await Users.find({ Role: 'Recruiter' }).select('Email FullName -_id').lean();
        // Normalize response to include FullName (may be undefined) and Email
        const Recruiters = recruiters.map(r => ({ Email: r.Email || '', FullName: r.FullName || '' }));
        return res.status(200).json({ TotalRecruiters: Recruiters.length, Recruiters });
    } catch (error) {
        console.error('AllRecruiters error:', error);
        return res.status(500).json({ message: 'Error fetching recruiters', error: error.message });
    }
};

// Return hiring assistants. If query param jobId is provided, return assistants for that job only.
// Response: { TotalHiringAssistants, HiringAssistants: [{ Email, FullName }] }
exports.AllHiringAssistants = async (req, res) => {
    try {
        // Accept job id via query param for GET requests or body for POST callers
        const jobId = req.query.jobId || req.body?.JobID || req.body?.jobId;

        // If jobId provided, return users whose Role is 'HiringAssistant' and whose Jobs array includes this JobID
        if (jobId) {
            const jid = String(jobId).trim();
            // Query Users collection directly for HiringAssistants assigned to this job
            const users = await Users.find({ Role: 'HiringAssistant', Jobs: { $in: [jid] } }).select('Email FullName -_id').lean();
            const HiringAssistants = users.map(u => ({ Email: u.Email || '', FullName: u.FullName || '' }));
            return res.status(200).json({ TotalHiringAssistants: HiringAssistants.length, HiringAssistants });
        }

        // Otherwise return all users with Role === 'HiringAssistant'
        const has = await Users.find({ Role: 'HiringAssistant' }).select('Email FullName -_id').lean();
        const HiringAssistants = has.map(h => ({ Email: h.Email || '', FullName: h.FullName || '' }));
        return res.status(200).json({ TotalHiringAssistants: HiringAssistants.length, HiringAssistants });
    } catch (error) {
        console.error('AllHiringAssistants error:', error);
        return res.status(500).json({ message: 'Error fetching hiring assistants', error: error.message });
    }
};

// Return total number of candidates across all jobs
exports.AllCandidates = async (req, res) => {
    try {
        // Sum number of candidates in each job's Candidates array
        const jobs = await JobPostings.find({}, 'Candidates').lean();
        let total = 0;
        for (const job of jobs) {
            if (Array.isArray(job.Candidates)) total += job.Candidates.length;
        }
        return res.status(200).json({ TotalCandidates: total });
    } catch (error) {
        console.error('AllCandidates error:', error);
        return res.status(500).json({ message: 'Error fetching total candidates', error: error.message });
    }
};

// Return job IDs assigned to a Hiring Assistant by email
exports.HiringAssistantJobs = async (req, res) => {
    try {
        const { Email } = req.body;
        if (!Email) return res.status(400).json({ message: 'Email is required.' });

        const user = await Users.findOne({ Email }).lean();
        if (!user) return res.status(404).json({ message: 'Hiring Assistant not found.' });

        // Expect Jobs to be an array of JobID strings on the user document
        const jobs = Array.isArray(user.Jobs) ? user.Jobs.map(j => String(j)) : [];

        return res.status(200).json({ JobIDs: jobs });
    } catch (error) {
        console.error('HiringAssistantJobs error:', error);
        return res.status(500).json({ message: 'Error fetching hiring assistant jobs', error: error.message });
    }
};

// Return total number of jobs in JobPostings (PascalCase key)
exports.AllJobs = async (req, res) => {
    try {
        const count = await JobPostings.countDocuments();
        return res.status(200).json({ TotalJobs: count });
    } catch (error) {
        console.error('AllJobs error:', error);
        return res.status(500).json({ message: 'Error fetching jobs count', error: error.message });
    }
};

// Job dashboard: counts and job summaries (PascalCase keys)
exports.JobDashboard = async (req, res) => {
    try {
        // Total number of ongoing jobs
        const TotalOngoingJobs = await JobPostings.countDocuments({ JobStatus: 'Ongoing' });

        // Candidate status counts for three statuses
        const statuses = [
            'CV Processed',
            'Shortlisted For AI-Interview',
            'AI-Interview Completed'
        ];

        const agg = await JobPostings.aggregate([
            { $unwind: '$Candidates' },
            { $match: { 'Candidates.ApplicationStatus': { $in: statuses } } },
            { $group: { _id: '$Candidates.ApplicationStatus', count: { $sum: 1 } } }
        ]);

        // Map counts
        const countsMap = {};
        for (const row of agg) countsMap[row._id] = row.count;

        const TotalCVProcessedCandidates = countsMap['CV Processed'] || 0;
        const TotalShortlistedForAIInterview = countsMap['Shortlisted For AI-Interview'] || 0;
        const TotalAIInterviewCompleted = countsMap['AI-Interview Completed'] || 0;

        // Jobs summary list
        const jobs = await JobPostings.find({}, 'JobTitle CompanyName JobDescription JobStatus JobID').lean();
        const Jobs = jobs.map(j => ({
            JobTitle: j.JobTitle,
            CompanyName: j.CompanyName,
            JobDescription: j.JobDescription,
            JobStatus: j.JobStatus,
            JobID: j.JobID,
        }));

        return res.status(200).json({
            TotalOngoingJobs,
            TotalCVProcessedCandidates,
            TotalShortlistedForAIInterview,
            TotalAIInterviewCompleted,
            Jobs
        });
    } catch (error) {
        console.error('JobDashboard error:', error);
        return res.status(500).json({ message: 'Error building job dashboard', error: error.message });
    }
};

// Change job status based on action: Delete -> Ended, Pause -> Paused, Resume -> Ongoing
exports.JobStatusChange = async (req, res) => {
    try {
        const { JobID, NewStatus } = req.body;

        if (!JobID || !NewStatus) {
            return res.status(400).json({ message: 'JobID and NewStatus are required.' });
        }

        const action = String(NewStatus).trim();
        let mappedStatus = null;

        if (action === 'Pause') {
            const job = await JobPostings.findOne({ JobID: String(JobID) });
            if (!job) return res.status(404).json({ message: 'Job not found.' });
            job.JobStatus = 'Paused';
            await job.save();
            return res.status(200).json({ message: 'Job paused successfully.', JobID: job.JobID, JobStatus: job.JobStatus });
        }

        if (action === 'Resume') {
            const job = await JobPostings.findOne({ JobID: String(JobID) });
            if (!job) return res.status(404).json({ message: 'Job not found.' });
            job.JobStatus = 'Ongoing';
            await job.save();
            return res.status(200).json({ message: 'Job resumed successfully.', JobID: job.JobID, JobStatus: job.JobStatus });
        }

        if (action === 'Delete') {
            // Permanently remove the job posting from the system
            const job = await JobPostings.findOne({ JobID: String(JobID) });
            if (!job) return res.status(404).json({ message: 'Job not found.' });
            await JobPostings.deleteOne({ JobID: String(JobID) });
            return res.status(200).json({ message: 'Job deleted successfully.', JobID: JobID });
        }

        // Mark job as Ended
        if (action === 'Ended' || action === 'Completed' || action === 'Stop') {
            const job = await JobPostings.findOne({ JobID: String(JobID) });
            if (!job) return res.status(404).json({ message: 'Job not found.' });
            // Update job status
            job.JobStatus = 'Ended';

            // For all candidates in this job, mark as Rejected unless already Accepted
            if (Array.isArray(job.Candidates)) {
                for (let i = 0; i < job.Candidates.length; i++) {
                    const c = job.Candidates[i];
                    if (!c) continue;
                    const status = (c.ApplicationStatus || '').toString();
                    if (status !== 'Accepted') {
                        c.ApplicationStatus = 'Rejected';
                    }
                }
            }

            await job.save();
            return res.status(200).json({ message: 'Job marked as ended. Candidates updated.', JobID: job.JobID, JobStatus: job.JobStatus });
        }

        return res.status(400).json({ message: 'Invalid NewStatus. Allowed: Delete, Pause, Resume, Ended.' });
    } catch (error) {
        console.error('JobStatusChange error:', error);
        return res.status(500).json({ message: 'Error changing job status', error: error.message });
    }
};

// Edit job details: JobTitle, CompanyName, JobDescription, EvaluationCriteria
exports.EditJobDetails = async (req, res) => {
    try {
        const {
            JobID,
            NewJobTitle,
            NewCompanyName,
            NewJobDescription,
            NewNonNegotiable,
            NewAdditional
        } = req.body;

        if (!JobID) return res.status(400).json({ message: 'JobID is required.' });

        const job = await JobPostings.findOne({ JobID: String(JobID) });
        if (!job) return res.status(404).json({ message: 'Job not found.' });

        // Helper to parse comma-separated or array inputs
        const parseList = (val) => {
            if (val === undefined || val === null) return null;
            if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
            return String(val).split(',').map(s => s.trim()).filter(Boolean);
        };

        let updatedFields = {};

        if (NewJobTitle !== undefined) {
            job.JobTitle = NewJobTitle;
            updatedFields.JobTitle = NewJobTitle;
        }
        if (NewCompanyName !== undefined) {
            job.CompanyName = NewCompanyName;
            updatedFields.CompanyName = NewCompanyName;
        }
        if (NewJobDescription !== undefined) {
            job.JobDescription = NewJobDescription;
            updatedFields.JobDescription = NewJobDescription;
        }

        const parsedNon = parseList(NewNonNegotiable);
        if (parsedNon !== null) {
            job.EvaluationCriteria = job.EvaluationCriteria || {};
            job.EvaluationCriteria.NonNegotiable = parsedNon;
            updatedFields.NonNegotiable = parsedNon;
        }

        const parsedAdd = parseList(NewAdditional);
        if (parsedAdd !== null) {
            job.EvaluationCriteria = job.EvaluationCriteria || {};
            job.EvaluationCriteria.Additional = parsedAdd;
            updatedFields.Additional = parsedAdd;
        }

        await job.save();

        return res.status(200).json({ message: 'Job updated successfully.', JobID: job.JobID, UpdatedFields: updatedFields });
    } catch (error) {
        console.error('EditJobDetails error:', error);
        return res.status(500).json({ message: 'Error editing job details', error: error.message });
    }
};

// Add resumes to an existing job: uploads files to Cloudinary and queues evaluations
exports.AddResumes = async (req, res) => {
    try {
        const { JobID, candidateEmails } = req.body;

        if (!JobID) return res.status(400).json({ message: 'JobID is required.' });

        const job = await JobPostings.findOne({ JobID: String(JobID) });
        if (!job) return res.status(404).json({ message: 'Job not found.' });

        const emails = candidateEmails ? String(candidateEmails).split(',').map(e => e.trim()).filter(Boolean) : [];

        // Prefer files sent under field name 'cvs'. If none found, fall back to any uploaded files.
        const allFiles = req.files || [];
        let files = Array.isArray(allFiles) ? allFiles.filter(f => String(f.fieldname).toLowerCase() === 'cvs') : [];
        if (!files || files.length === 0) files = allFiles;

        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'At least one CV file is required under field name "cvs".' });
        }

        // Configure cloudinary
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        const newCandidates = [];
        const evaluationJobIds = []; // Track queued evaluation jobs

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                // For PDFs and documents, use 'raw' resource type so Cloudinary preserves them as-is
                // This prevents Cloudinary from processing them as images, which breaks text extraction
                const baseName = file.originalname ? String(file.originalname).replace(/\.[^/.]+$/, '') : undefined;
                const ext = file.originalname ? String(path.extname(file.originalname)).replace('.', '').toLowerCase() : '';
                
                // Determine resource type based on file extension
                let resourceType = 'auto';
                if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
                  resourceType = 'raw'; // Use 'raw' for documents to preserve them without transformation
                }
                
                // Use unique filenames to prevent overwriting when multiple uploads have
                // the same original filename. Do not set `public_id` explicitly.
                const uploadOptions = { resource_type: resourceType, use_filename: true, unique_filename: true };
                if (ext) uploadOptions.format = ext;
                const result = await cloudinary.uploader.upload(file.path, uploadOptions);
                console.log('Resume upload:', file.originalname, 'mimetype=', file.mimetype, '-> resource_type=', result.resource_type, 'format=', result.format, 'public_id=', result.public_id);

                // Prefer the field name as the email if it looks like an email, otherwise fall back to positional mapping from candidateEmails
                const fieldName = file.fieldname || '';
                const emailCandidate = (String(fieldName).includes('@') ? String(fieldName).trim() : (emails[i] || '')).trim();

                // Ensure candidate user exists and record this JobID on the user document
                try {
                    if (emailCandidate) {
                        let existing = await Users.findOne({ Email: emailCandidate });
                        if (!existing) {
                            // Extract name from email or use placeholder
                            const extractNameFromEmail = (email) => {
                                const localPart = email.split('@')[0];
                                // Replace dots, underscores, hyphens with spaces and capitalize
                                return localPart
                                    .replace(/[._-]/g, ' ')
                                    .split(' ')
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                    .join(' ') || 'Candidate';
                            };

                            const newUser = new Users({
                                Email: emailCandidate,
                                Role: 'Candidate',
                                Password: '',
                                FullName: extractNameFromEmail(emailCandidate),
                                InvitationAccepted: false,
                                Jobs: [String(job.JobID)]
                            });
                            await newUser.save();
                        } else {
                            // Add JobID to user's Jobs array if not already present
                            try {
                                const currentJobs = Array.isArray(existing.Jobs) ? existing.Jobs.map(j => String(j)) : [];
                                if (!currentJobs.includes(String(job.JobID))) {
                                    currentJobs.push(String(job.JobID));
                                    existing.Jobs = currentJobs;
                                    await existing.save();
                                }
                            } catch (saveErr) {
                                console.error('Failed to add JobID to user Jobs for', emailCandidate, saveErr.message);
                            }
                        }
                    }
                } catch (uErr) {
                    console.error('Failed to ensure or update user for', emailCandidate, uErr.message);
                }

                const candidateObj = {
                    Email: emailCandidate,
                    CV_Link: result.secure_url,
                    CV_Score: null,
                    AIInterview_Score: null,
                    CompositeScore: null,
                    ResumeBreakdown: null,
                    Flags: [],
                    ApplicationStatus: 'CV Processed'
                };

                newCandidates.push(candidateObj);
                const candidateIndex = job.Candidates.length; // Get index before pushing
                job.Candidates.push(candidateObj);

                // CRITICAL: Mark Mixed type field as modified so Mongoose saves it
                job.markModified(`Candidates.${candidateIndex}.ResumeBreakdown`);

                console.log('📝 Candidate added (evaluation queued):', emailCandidate);

                // Queue the resume evaluation to run asynchronously
                try {
                    const candidateDoc = job.Candidates && job.Candidates[candidateIndex];
                    const candidateId = candidateDoc && candidateDoc._id ? candidateDoc._id : null;

                    const uploaderRole = req.user && (req.user.role || req.user.Role) ? (req.user.role || req.user.Role) : null;
                    const queuedJobId = await queueResumeEvaluation(
                        job.JobID,
                        candidateIndex,
                        candidateId,
                        emailCandidate,
                        result.secure_url,
                        job.EvaluationCriteria,
                        0,
                        uploaderRole
                    );
                    evaluationJobIds.push(queuedJobId);
                } catch (queueErr) {
                    console.error('Failed to queue resume evaluation for', emailCandidate, ':', queueErr.message);
                    // Mark as evaluation pending but don't fail the upload
                    candidateObj.Flags = ['EVALUATION_PENDING'];
                    job.markModified(`Candidates.${candidateIndex}.Flags`);
                }
            } catch (upErr) {
                console.error('Resume upload failed for file', file.originalname, upErr.message);
            } finally {
                try { fs.unlinkSync(file.path); } catch (e) { }
            }
        }

        // Mark Candidates array as modified to ensure nested changes are saved (important for Mixed types)
        job.markModified('Candidates');
        await job.save();

        // Return 202 Accepted immediately - processing continues in background
        return res.status(202).json({
            message: 'Resumes uploaded. Evaluation in progress.',
            Added: newCandidates.length,
            Candidates: newCandidates,
            JobID: job.JobID,
            evaluationJobIds: evaluationJobIds,
            note: 'Resume scores will be updated shortly. Refresh the page in a few moments.'
        });
    } catch (error) {
        console.error('AddResumes error:', error);
        return res.status(500).json({ message: 'Error adding resumes to job', error: error.message });
    }
};

// Public aliases: expose a subset of AddResumes and JobIntrinsics without auth middleware.
// These are thin wrappers so we don't duplicate logic and can keep internal routes protected.
exports.PublicAddResumes = exports.AddResumes;

// Public aliases: expose a subset of AddResumes and JobIntrinsics without auth middleware.
// These are thin wrappers so we don't duplicate logic and can keep internal routes protected.
exports.PublicAddResumes = exports.AddResumes;

// JobIntrinsics: return counts and candidate-wise details for a JobID
exports.JobIntrinsics = async (req, res) => {
    try {
        const { JobID } = req.body;

        if (!JobID) return res.status(400).json({ message: 'JobID is required.' });

        const job = await JobPostings.findOne({ JobID: String(JobID) }).lean();
        if (!job) return res.status(404).json({ message: 'Job not found.' });

        const candidates = Array.isArray(job.Candidates) ? job.Candidates : [];

        const TotalNumberOfCandidates = candidates.length;

        const TotalShortlistedForAIInterview = candidates.filter(c => String(c.ApplicationStatus) === 'Shortlisted For AI-Interview').length;
        const TotalAIInterviewCompleted = candidates.filter(c => String(c.ApplicationStatus) === 'AI-Interview Completed').length;

        // Candidate-wise details with PascalCase keys
        const Candidates = [];
        for (const c of candidates) {
            const cand = {
                Email: c.Email || '',
                CVScore: c.CV_Score || null,
                AIInterviewScore: c.AIInterview_Score || null,
                ApplicationStatus: c.ApplicationStatus || '',
                CompositeScore: c.CompositeScore || null,
                ResumeBreakdown: c.ResumeBreakdown || null,
                Flags: Array.isArray(c.Flags) ? c.Flags : []
            };

            // Attempt to include candidate's full name when available
            try {
                if (cand.Email) {
                    const user = await Users.findOne({ Email: cand.Email }).select('FullName -_id').lean();
                    cand.FullName = user && user.FullName ? user.FullName : '';
                } else {
                    cand.FullName = '';
                }
            } catch (e) {
                cand.FullName = '';
            }

            Candidates.push(cand);
        }

        return res.status(200).json({
            TotalNumberOfCandidates,
            TotalShortlistedForAIInterview,
            TotalAIInterviewCompleted,
            Candidates,
            JobID: job.JobID,
            JobTitle: job.JobTitle || null,
            CompanyName: job.CompanyName || null,
            JobDescription: job.JobDescription || null,
            EvaluationCriteria: job.EvaluationCriteria || { NonNegotiable: [], Additional: [] },
            JobLink: job.JobLink || null,
            JobStatus: job.JobStatus || null,
        });
    } catch (error) {
        console.error('JobIntrinsics error:', error);
        return res.status(500).json({ message: 'Error fetching job intrinsics', error: error.message });
    }
};

// Public alias for JobIntrinsics so job details can be retrieved without authentication
exports.PublicJobIntrinsics = exports.JobIntrinsics;

// ChangeApplicationStatus: update a candidate's ApplicationStatus for a given JobID
exports.ChangeApplicationStatus = async (req, res) => {
    try {
        const { Email, JobID, PromoteTo } = req.body;

        if (!Email || !JobID || !PromoteTo) {
            return res.status(400).json({ message: 'Email, JobID and PromoteTo are required.' });
        }

        const email = String(Email).trim();
        const job = await JobPostings.findOne({ JobID: String(JobID) });
        if (!job) return res.status(404).json({ message: 'Job not found.' });

        // Map PromoteTo values to ApplicationStatus strings
        const mapping = {
            'InviteForAIInterview': 'Shortlisted For AI-Interview',
            'InviteForHumanInterview': 'Shortlisted For Human Interview',
            'AIInterviewCompleted': 'AI-Interview Completed',
            'Accept': 'Accepted',
            'Reject': 'Rejected'
        };

        const newStatus = mapping[ PromoteTo ];
        if (!newStatus) return res.status(400).json({ message: 'Invalid PromoteTo value. Allowed: InviteForAIInterview, InviteForHumanInterview, Accept, Reject.' });

        const candidates = Array.isArray(job.Candidates) ? job.Candidates : [];

        // Update all matching candidate entries (case-insensitive match)
        let updatedCount = 0;
        for (let i = 0; i < candidates.length; i++) {
            const c = candidates[i];
            if (!c || !c.Email) continue;
            if (String(c.Email).trim().toLowerCase() === email.toLowerCase()) {
                c.ApplicationStatus = newStatus;
                updatedCount++;
            }
        }

        if (updatedCount === 0) {
            return res.status(404).json({ message: 'Candidate not found in the specified job.' });
        }

        await job.save();

        // send candidate status email (best-effort, non-blocking)
        (async () => {
            try {
                let candidateFullName = '';
                try {
                    const user = await Users.findOne({ Email: email }).select('FullName -_id').lean();
                    if (user && user.FullName) candidateFullName = user.FullName;
                } catch (e) {
                    // ignore lookup errors
                }

                await sendCandidateStatusEmail(email, candidateFullName, job, newStatus, job.JobID);
            } catch (e) {
                console.error('Failed to send candidate status email to', email, e && e.message ? e.message : e);
            }
        })();

        return res.status(200).json({
            Message: 'Application status updated successfully.',
            JobID: job.JobID,
            Email: email,
            NewApplicationStatus: newStatus,
            UpdatedCount: updatedCount
        });
    } catch (error) {
        console.error('ChangeApplicationStatus error:', error);
        return res.status(500).json({ message: 'Error changing application status', error: error.message });
    }
};

// JobXCandidateDetails: return detailed fields for a candidate within a job
exports.JobXCandidateDetails = async (req, res) => {
    try {
        const { JobID, Email } = req.body;

        if (!JobID || !Email) return res.status(400).json({ message: 'JobID and Email are required.' });

        const job = await JobPostings.findOne({ JobID: String(JobID) }).lean();
        if (!job) return res.status(404).json({ message: 'Job not found.' });

        const candidates = Array.isArray(job.Candidates) ? job.Candidates : [];
        const emailNormalized = String(Email).trim().toLowerCase();

        const candidate = candidates.find(c => c && c.Email && String(c.Email).trim().toLowerCase() === emailNormalized);

        if (!candidate) return res.status(404).json({ message: 'Candidate not found for this job.' });

        const Candidate = {
            CVLink: candidate.CV_Link || null,
            CVScore: candidate.CV_Score || null,
            AIInterviewScore: candidate.AIInterview_Score || null,
            CompositeScore: candidate.CompositeScore || null,
            ResumeBreakdown: candidate.ResumeBreakdown || null,
            Flags: Array.isArray(candidate.Flags) ? candidate.Flags : [],
            ApplicationStatus: candidate.ApplicationStatus || ''
        };

        console.log('🔍 JobXCandidateDetails - Retrieved ResumeBreakdown:', JSON.stringify(candidate.ResumeBreakdown, null, 2));

        // Attempt to include FullName from Users collection when available
        try {
            const user = await Users.findOne({ Email: String(candidate.Email).trim() }).select('FullName -_id').lean();
            if (user && user.FullName) {
                Candidate.FullName = user.FullName;
            }
        } catch (e) {
            // ignore
        }

        return res.status(200).json({ JobID: job.JobID, Email: String(candidate.Email), Candidate });
    } catch (error) {
        console.error('JobXCandidateDetails error:', error);
        return res.status(500).json({ message: 'Error fetching candidate details', error: error.message });
    }
};

// UpdateUser: update user's FullName (allows recruiters to correct candidate name)
exports.UpdateUser = async (req, res) => {
    try {
        const { Email, FullName } = req.body;
        if (!Email || !FullName) return res.status(400).json({ message: 'Email and FullName are required.' });

        const user = await Users.findOne({ Email: String(Email).trim() });
        if (!user) return res.status(404).json({ message: 'User not found.' });

        user.FullName = String(FullName).trim();
        await user.save();

        const userObj = user.toObject ? user.toObject() : user;
        delete userObj.Password;
        return res.status(200).json({ message: 'User updated successfully', user: userObj });
    } catch (error) {
        console.error('UpdateUser error:', error);
        return res.status(500).json({ message: 'Error updating user', error: error.message });
    }
};

// CandidateActivity: return jobs where the candidate (Email) is present and their ApplicationStatus in each job
exports.CandidateActivity = async (req, res) => {
    try {
        const { Email } = req.body;

        if (!Email) return res.status(400).json({ message: 'Email is required.' });

        const emailNormalized = String(Email).trim();

        // Find jobs where Candidates array contains this email (case-insensitive)
        const jobs = await JobPostings.find({
            Candidates: { $elemMatch: { Email: { $regex: `^${emailNormalized}$`, $options: 'i' } } }
        }).lean();

        const JobActivities = jobs.map(job => {
            const candidates = Array.isArray(job.Candidates) ? job.Candidates : [];
            const candidate = candidates.find(c => c && c.Email && String(c.Email).trim().toLowerCase() === emailNormalized.toLowerCase());

            return {
                JobID: job.JobID,
                JobTitle: job.JobTitle || null,
                CompanyName: job.CompanyName || null,
                JobDescription: job.JobDescription || null,
                JobStatus: job.JobStatus || null,
                ApplicationStatus: candidate ? candidate.ApplicationStatus : null
            };
        });

        return res.status(200).json({
            Email: emailNormalized,
            TotalJobs: JobActivities.length,
            Jobs: JobActivities
        });
    } catch (error) {
        console.error('CandidateActivity error:', error);
        return res.status(500).json({ message: 'Error fetching candidate activity', error: error.message });
    }
};

// Segment Job Description using Resume Pipeline API
exports.SegmentJobDescription = async (req, res) => {
    try {
        const { jd_text } = req.body;

        if (!jd_text) {
            return res.status(400).json({ message: 'jd_text is required.' });
        }

        const segmented = await ResumePipelineService.segmentJobDescription(jd_text);

        return res.status(200).json({
            message: 'Job description segmented successfully.',
            segmented_jd: segmented
        });
    } catch (error) {
        console.error('SegmentJobDescription error:', error);
        return res.status(500).json({
            message: 'Error segmenting job description',
            error: error.message
        });
    }
};

// Evaluate Resume using Resume Pipeline API
exports.EvaluateResume = async (req, res) => {
    try {
        const { resume_url, jd_json } = req.body;

        if (!resume_url || !jd_json) {
            return res.status(400).json({ message: 'resume_url and jd_json are required.' });
        }

        const evaluation = await ResumePipelineService.evaluateResume(resume_url, jd_json);

        return res.status(200).json({
            message: 'Resume evaluated successfully.',
            evaluation
        });
    } catch (error) {
        console.error('EvaluateResume error:', error);
        return res.status(500).json({
            message: 'Error evaluating resume',
            error: error.message
        });
    }
};

// Get current candidates for a job (for checking evaluation progress)
exports.GetJobCandidates = async (req, res) => {
    try {
        const { JobID } = req.body;

        if (!JobID) return res.status(400).json({ message: 'JobID is required.' });

        const job = await JobPostings.findOne({ JobID: String(JobID) });
        if (!job) return res.status(404).json({ message: 'Job not found.' });

        const candidates = (job.Candidates || []).map(c => ({
            Email: c.Email,
            CV_Link: c.CV_Link,
            CV_Score: c.CV_Score,
            CompositeScore: c.CompositeScore,
            ResumeBreakdown: c.ResumeBreakdown,
            Flags: c.Flags,
            ApplicationStatus: c.ApplicationStatus,
        }));

        return res.status(200).json({
            message: 'Candidates retrieved successfully.',
            JobID: job.JobID,
            totalCandidates: candidates.length,
            Candidates: candidates,
        });
    } catch (error) {
        console.error('GetJobCandidates error:', error);
        return res.status(500).json({ message: 'Error retrieving candidates', error: error.message });
    }
};

// NOTIFICATION SETTINGS ROUTES

// Get notification settings
exports.GetNotificationSettings = async (req, res) => {
    try {
        // Verify user is super admin
        const user = req.user;
        if (!user || String(user.role || user.Role || '').toLowerCase() !== 'superadmin') {
            return res.status(403).json({ message: 'Only super admins can access notification settings.' });
        }

        let settings = await NotificationSettings.findOne({});

        // If no settings exist, create default ones
        if (!settings) {
            settings = new NotificationSettings({
                sendNotificationsToCandidates: true,
                sendNotificationsToRecruiters: true,
                sendNotificationsToHiringAssistants: true
            });
            await settings.save();
        }

        return res.status(200).json({
            message: 'Notification settings retrieved successfully.',
            settings: {
                sendNotificationsToCandidates: settings.sendNotificationsToCandidates,
                sendNotificationsToRecruiters: settings.sendNotificationsToRecruiters,
                sendNotificationsToHiringAssistants: settings.sendNotificationsToHiringAssistants
            }
        });
    } catch (error) {
        console.error('GetNotificationSettings error:', error);
        return res.status(500).json({ message: 'Error retrieving notification settings', error: error.message });
    }
};

// Update notification settings
exports.UpdateNotificationSettings = async (req, res) => {
    try {
        // Verify user is super admin
        const user = req.user;
        if (!user || String(user.role || user.Role || '').toLowerCase() !== 'superadmin') {
            return res.status(403).json({ message: 'Only super admins can update notification settings.' });
        }

        const { sendNotificationsToCandidates, sendNotificationsToRecruiters, sendNotificationsToHiringAssistants } = req.body;

        // Validate input
        if (typeof sendNotificationsToCandidates !== 'boolean' || 
            typeof sendNotificationsToRecruiters !== 'boolean' || 
            typeof sendNotificationsToHiringAssistants !== 'boolean') {
            return res.status(400).json({ message: 'All settings must be boolean values.' });
        }

        let settings = await NotificationSettings.findOne({});

        if (!settings) {
            settings = new NotificationSettings({
                sendNotificationsToCandidates,
                sendNotificationsToRecruiters,
                sendNotificationsToHiringAssistants
            });
        } else {
            settings.sendNotificationsToCandidates = sendNotificationsToCandidates;
            settings.sendNotificationsToRecruiters = sendNotificationsToRecruiters;
            settings.sendNotificationsToHiringAssistants = sendNotificationsToHiringAssistants;
            settings.updatedAt = Date.now();
        }

        await settings.save();

        return res.status(200).json({
            message: 'Notification settings updated successfully.',
            settings: {
                sendNotificationsToCandidates: settings.sendNotificationsToCandidates,
                sendNotificationsToRecruiters: settings.sendNotificationsToRecruiters,
                sendNotificationsToHiringAssistants: settings.sendNotificationsToHiringAssistants
            }
        });
    } catch (error) {
        console.error('UpdateNotificationSettings error:', error);
        return res.status(500).json({ message: 'Error updating notification settings', error: error.message });
    }
};
