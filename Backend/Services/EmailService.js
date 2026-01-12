const nodemailer = require('nodemailer');

async function _createTransporter() {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASS) {
    return nodemailer.createTransport({ host: 'smtp.gmail.com', port: 587, secure: false, auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASS } });
  }
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({ host: process.env.SMTP_HOST, port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587, secure: process.env.SMTP_SECURE === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
  }
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({ host: 'smtp.ethereal.email', port: 587, secure: false, auth: { user: testAccount.user, pass: testAccount.pass } });
}

// Helper function to check if notifications should be sent based on admin settings
async function _shouldSendNotification(recipientType = 'candidate') {
  try {
    const NotificationSettings = require('../Models/NotificationSettings');
    // Get the first (and typically only) super admin's settings
    const settings = await NotificationSettings.findOne({});
    
    if (!settings) {
      // If no settings exist, default to sending all notifications
      return true;
    }

    if (recipientType === 'candidate') {
      return settings.sendNotificationsToCandidates;
    } else if (recipientType === 'recruiter') {
      return settings.sendNotificationsToRecruiters;
    } else if (recipientType === 'hiringAssistant' || recipientType === 'hiring-assistant') {
      return settings.sendNotificationsToHiringAssistants;
    }

    return true; // Default to sending if recipient type is unknown
  } catch (err) {
    console.error('_shouldSendNotification error:', err && err.message ? err.message : err);
    // If there's an error checking settings, default to sending
    return true;
  }
}

async function sendShortlistNotification(to, fullName, jobTitle, companyName, jobId) {
  try {
    // Check if notifications to candidates should be sent
    const shouldSend = await _shouldSendNotification('candidate');
    if (!shouldSend) {
      console.log('Candidate notifications are disabled. Skipping sendShortlistNotification to:', to);
      return { skipped: true, message: 'Candidate notifications are disabled' };
    }

    const transporter = await _createTransporter();
    const frontendBase = (process.env.FRONTEND_BASE_URL && String(process.env.FRONTEND_BASE_URL).trim()) || 'http://localhost:3000';
    const baseClean = String(frontendBase).replace(/\/$/, '');
    const signupUrl = `${baseClean}/signup${jobId ? `?jobId=${encodeURIComponent(String(jobId))}` : ''}`;

    const name = fullName && String(fullName).trim() ? String(fullName).trim() : '';
    const jobTitleClean = jobTitle ? String(jobTitle) : '';
    const companyClean = companyName ? String(companyName) : '';

    const subject = `Your resume has been shortlisted — ${jobTitleClean} at ${companyClean}`;
    const preamble = `Hello${name ? `, ${name}` : ''}`;
    const body = `Your resume has been shortlisted for the role of "${jobTitleClean}" at "${companyClean}". To remain informed about the recruitment process, please sign up at AI Cruit.`;

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; background: #f9fafb; padding: 24px;">
        <div style="max-width:600px;margin:0 auto;border-radius:8px;overflow:hidden;border:1px solid #e6e6f0;">
          <div style="background:linear-gradient(90deg,#6d28d9,#7c3aed);padding:20px;color:#fff;text-align:center;">
            <h1 style="margin:0;font-size:20px;">AI Cruit</h1>
          </div>
          <div style="background:#fff;padding:24px;color:#111;">
            <p style="margin:0 0 12px;font-size:16px;">${preamble}</p>
            <p style="margin:0 0 16px;font-size:14px;color:#333;">${body}</p>
            <div style="text-align:center;margin:18px 0;">
              <a href="${signupUrl}" style="display:inline-block;padding:12px 20px;background:#6d28d9;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Sign up on AI Cruit</a>
            </div>
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
      text: `${preamble}\n\n${body}\n\nSign up: ${signupUrl}`,
      html
    });

    const preview = nodemailer.getTestMessageUrl(info);
    return { info, preview };
  } catch (err) {
    console.error('sendShortlistNotification error:', err && err.message ? err.message : err);
    throw err;
  }
}

module.exports = { sendShortlistNotification, _shouldSendNotification };
