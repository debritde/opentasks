const mongoose = require('mongoose');

const taskCustomFieldsSchema = new mongoose.Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true }, // 🆕 User-Referenz
    title: { type: String, required: true },
    type: { type: String, required: true },
    options: { type: String, required: false },
    required: { type: Boolean, default: false}
});

const taskCustomFields = mongoose.model('taskCustomFields', taskCustomFieldsSchema);
module.exports = taskCustomFields;
