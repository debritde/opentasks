const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstname: { type: String },
    lastname: { type: String },
    username: { type: String, unique: true },
    email: { type: String, unique: false, required: false },
    phoneNumber: { type: String, required: false },
    password: { type: String, required: true },
    registerDate: { type: Date, default: Date.now },
    isLDAPUser: { type: Boolean, default: false },
    twoFactorActivated: { type: Boolean, default: false },
    twoFactorSecret: { type: String }, // Speichert das Google Authenticator Secret
    groups: { type: [mongoose.Schema.Types.ObjectId], ref: 'Group', default: [] }, 
    uuid: { type: String },
    language: { type: String, default: 'en' }, // Speichert die vom Benutzer gewählte Sprache
    isAdmin: { type: Boolean, default: false },
    image: { type: String, required: false } // Neues Feld für das Profilbild im Base64-Format
});

const User = mongoose.model('User', userSchema);
module.exports = User;
