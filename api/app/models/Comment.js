const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    ticketNumber: { type: String, required: true },
    commentText: { type: String, required: true },
    sendByMail: { type: Boolean, default: false },
    createdByUserId: { type: String, default: null },
    createdByEmailAddress: { type: String, default: null },
    emailAddress: { type: String, default: null },
    mailSent: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Text-Index setzen
CommentSchema.index({ commentText: 'text' });

module.exports = mongoose.model('Comment', CommentSchema);
