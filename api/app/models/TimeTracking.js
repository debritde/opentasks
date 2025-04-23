const mongoose = require('mongoose');

const TimeTrackingSchema = new mongoose.Schema({
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // 🆕 User-Referenz
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { type: Number, required: false }, // Dauer in Minuten
    description: { type: String, required: false }, // Dauer in Minuten
    createdAt: { type: Date, default: Date.now }
});

// Automatische Berechnung der Dauer vor dem Speichern
TimeTrackingSchema.pre('save', function (next) {
    this.duration = Math.round((this.endTime - this.startTime) / (1000 * 60)); // Minuten berechnen
    next();
});

module.exports = mongoose.model('TimeTracking', TimeTrackingSchema);
