const mongoose = require('mongoose');

const mail2TicketSchema = new mongoose.Schema({
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }], // Kann mehrere Projekte unterstützen
    imapHost: String,
    imapPort: Number,
    imapUser: String,
    imapPassword: String,  // 🔴 Am besten verschlüsseln!
    emailAddress: String,
    checkPeriodInMinutes: Number,
    smtpHost: String,
    smtpPort: Number,
    smtpUser: String,
    smtpPassword: String, // 🔴 Am besten verschlüsseln!
    smtpSecure: Boolean,
    createdAt: { type: Date, default: Date.now }
});

const Mail2Ticket = mongoose.model('Mail2Ticket', mail2TicketSchema);
module.exports = Mail2Ticket;
