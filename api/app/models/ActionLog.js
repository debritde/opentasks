const mongoose = require('mongoose');

const ActionLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Optional für nicht authentifizierte Anfragen
    method: { type: String, required: true }, // GET, POST, etc.
    route: { type: String, required: true }, // URL der Anfrage
    requestBody: { type: Object, required: false }, // Optional: Request-Body speichern
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ActionLog', ActionLogSchema);
