const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    ticketNumber: { type: String, required: true }, // Ändere hier von ObjectId auf String
    commentText: { type: String, required: true },
    sendByMail: { type: Boolean, default: false },
    emailAddress: { type: String, default: null },
    fromEmailAddress: { type: String, default: null },
    mailSent: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Text-Index setzen
CommentSchema.index({ commentText: 'text' });

module.exports = mongoose.model('Comment', CommentSchema);
