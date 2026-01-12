const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    Email: {
        type: String,
        required: true,
        unique: true,
    },
    Password: {
        type: String,
        required: function () {
            // Password is required for SuperAdmin, or for Candidate only after they accepted invite / set a password.
            // If the user authenticates via an external provider (AuthProvider set, e.g. 'google'),
            // we do not require a local password.
            return this.Role === 'SuperAdmin' || (this.Role === 'Candidate' && this.InvitationAccepted === true && !this.AuthProvider);
        },
    },
    Role: {
        type: String,
        enum: ['SuperAdmin', 'Recruiter', 'HiringAssistant', 'Candidate'],
        required: true,
    },
    Jobs: {
        type: [String], // Array of job IDs or titles
        required: function () {
            // Jobs are required only for HiringAssistant
            return this.Role === 'HiringAssistant';
        },
    },
    InvitationAccepted: {
        type: Boolean,
        default: false, // For Recruiter and HiringAssistant, tracks if they accepted the invitation
    },
    // OTP / signup verification fields
    TempPassword: {
        type: String,
    },
    SignupOtp: {
        type: String,
    },
    SignupOtpExpires: {
        type: Date,
    },
    SignupVerified: {
        type: Boolean,
        default: false,
    },
    // Optional external auth provider marker (e.g. 'google')
    AuthProvider: {
        type: String,
        enum: ['google', 'local'],
        required: false,
    },
    FullName: {
        type: String,
        required: true,
    },
}, {
    timestamps: true, // Automatically add createdAt and updatedAt fields
});

const Users = mongoose.model('User', UserSchema);

module.exports = Users;