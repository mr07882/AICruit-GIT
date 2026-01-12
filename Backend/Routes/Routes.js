const express = require('express');
const Controller = require('../Controllers/Controller');
const { verifyToken } = require('../Middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const { CreateSuperAdmin, InviteRecruiter, InviteHiringAssistant , Signup, SignupRequest, SignupVerify, Signin, ResetPassword, CreateJob, RemoveRecruiter, RemoveHiringAssistant, AllRecruiters, AllHiringAssistants, AllJobs, JobDashboard, JobStatusChange, EditJobDetails, AddResumes, JobIntrinsics, ChangeApplicationStatus, JobXCandidateDetails, CandidateActivity, SegmentJobDescription, EvaluateResume, GetJobCandidates, GetNotificationSettings, UpdateNotificationSettings } = Controller;
const { HiringAssistantJobs } = Controller;
const { AllCandidates } = Controller;


const router = express.Router();

//USER/JOB MANAGEMENT AND AUTH ROUTES
router.post('/CreateSuperAdmin', CreateSuperAdmin);
router.post('/InviteRecruiter', verifyToken, InviteRecruiter);
router.post('/InviteHiringAssistant', verifyToken, InviteHiringAssistant);
router.post('/Signin', Signin);
router.post('/Signup', Signup);
router.post('/GoogleAuth', Controller.GoogleAuth);
router.post('/SignupRequest', SignupRequest);
router.post('/SignupVerify', SignupVerify);
router.post('/UpdateUser', verifyToken, Controller.UpdateUser);
router.post('/ResetPassword', ResetPassword);
// Make CV uploads optional during job creation. Resume files should be added later via /AddResumes.
// Accept multipart/form-data during job creation (files optional).
// Use multer to populate `req.files` and `req.body` when frontend sends form-data.
router.post('/CreateJob', verifyToken, upload.any(), CreateJob);
router.post('/RemoveRecruiter', verifyToken, RemoveRecruiter);
router.post('/RemoveHiringAssistant', verifyToken, RemoveHiringAssistant);

//SuperAdmin DASHBOARD ROUTES 
router.get('/AllRecruiters', verifyToken, AllRecruiters);
router.get('/AllHiringAssistants', verifyToken, AllHiringAssistants);
router.get('/AllJobs', verifyToken, AllJobs);
router.get('/AllCandidates', verifyToken, AllCandidates);

//JOB DASHBOARD ROUTES (FOR SuperAdmin, Recruiter ONLY)
router.get('/JobDashboard', verifyToken, JobDashboard);
router.post('/JobStatusChange', verifyToken, JobStatusChange);
router.post('/EditJobDetails', verifyToken, EditJobDetails);
router.post('/AddResumes', verifyToken, upload.any(), AddResumes);

// Hiring Assistant helper: return job IDs assigned to an HA
router.post('/HiringAssistantJobs', verifyToken, HiringAssistantJobs);

//JOB SPECIFIC ROUTES 
router.post('/JobIntrinsics', verifyToken, JobIntrinsics);
router.post('/GetJobCandidates', verifyToken, GetJobCandidates);
// Public job endpoints (accessible without authentication) used by candidate-facing links
router.post('/Public/JobIntrinsics', Controller.PublicJobIntrinsics);

// Public resume submission endpoint (no auth) for candidates using the public job link
router.post('/Public/AddResumes', upload.any(), Controller.PublicAddResumes);
router.post('/ChangeApplicationStatus', verifyToken, ChangeApplicationStatus);

//JobXCandidate ROUTES
router.post('/JobXCandidateDetails', verifyToken, JobXCandidateDetails);

//CANDIDATE ACTIVITY ROUTES
router.post('/CandidateActivity', verifyToken, CandidateActivity);

// Resume Pipeline API Integration Routes
router.post('/SegmentJobDescription', verifyToken, SegmentJobDescription);
router.post('/EvaluateResume', verifyToken, EvaluateResume);

// Notification Settings Routes (Super Admin only)
router.get('/GetNotificationSettings', verifyToken, GetNotificationSettings);
router.post('/UpdateNotificationSettings', verifyToken, UpdateNotificationSettings);

// Protect candidate-drop-cv route
router.get('/candidate-drop-cv', verifyToken, (req, res) => {
  res.status(200).json({ message: 'Authenticated access to candidate-drop-cv' });
});

module.exports = router;
