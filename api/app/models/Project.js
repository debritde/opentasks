const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // 🆕 User-Referenz
    title: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    status: { type: String, default: 'new' },
    deadline: { type: Date, required: false },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isServiceDesk: { type: Boolean, default: false },
    isDone: { type: Boolean, default: false }
});

// Text-Index setzen
projectSchema.index({ title: 'text', description: 'text' });

const Project = mongoose.model('Project', projectSchema);
module.exports = Project;
