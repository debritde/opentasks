const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    deadline: { type: Date, required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isServiceDesk: { type: Boolean, default: false }
});

// Text-Index setzen
projectSchema.index({ title: 'text', description: 'text' });

const Project = mongoose.model('Project', projectSchema);
module.exports = Project;
