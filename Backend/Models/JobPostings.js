const mongoose = require('mongoose');

// Use Mixed type for ResumeBreakdown to allow flexible object structure
// This ensures any object can be stored without Mongoose validation issues

const CandidateSchema = new mongoose.Schema({
    Email: { type: String },
    CV_Link: { type: String },
    CV_Score: { type: Number, default: null },
    CompositeScore: { type: Number, default: null },
    AIInterview_Score: { type: Number, default: null },
    ResumeBreakdown: { type: mongoose.Schema.Types.Mixed, default: null },
    Flags: { type: [String], default: [] },
    EvalRetryCount: { type: Number, default: 0 },
    ApplicationStatus: {
        type: String,
        enum: [
            'CV Processed',
            'Shortlisted For AI-Interview',
            'AI-Interview Completed',
            'Shortlisted For Human Interview',
            'Human Interview Completed',
            'Accepted',
            'Rejected'
        ],
        default: 'CV Processed',
    },
}, { timestamps: true });

const JobPostingSchema = new mongoose.Schema({
    JobID: {
        type: String,
        unique: true,
        default: () => new mongoose.Types.ObjectId().toHexString(),
    },
    JobTitle: { type: String, required: true },
    CompanyName: { type: String, required: true },
    JobDescription: { type: String },
    EvaluationCriteria: {
        NonNegotiable: { type: [String], default: [] },
        Additional: { type: [String], default: [] },
    },
    Owners: { type: [String], default: [] },
    JobStatus: { type: String, enum: ['Ended', 'Paused', 'Ongoing'], default: 'Ongoing' },
    Candidates: { type: [CandidateSchema], default: [] },
    JobLink: { type: String, default: null },
}, { timestamps: true });

const JobPostings = mongoose.model('JobPosting', JobPostingSchema);

module.exports = JobPostings;
