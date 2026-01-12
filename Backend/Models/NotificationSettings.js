const mongoose = require('mongoose');

const NotificationSettingsSchema = new mongoose.Schema({
  sendNotificationsToCandidates: {
    type: Boolean,
    default: true,
    required: true
  },
  sendNotificationsToRecruiters: {
    type: Boolean,
    default: true,
    required: true
  },
  sendNotificationsToHiringAssistants: {
    type: Boolean,
    default: true,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure only one settings document exists
NotificationSettingsSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('NotificationSettings').countDocuments({});
    if (count > 0) {
      throw new Error('Only one notification settings document can exist');
    }
  }
  next();
});

const NotificationSettings = mongoose.model('NotificationSettings', NotificationSettingsSchema);

module.exports = NotificationSettings;
