const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    token: { type: String, required: true },
    createdAt: { type: Date, unique: true, required: true },
});

const LoginToken = mongoose.model('LoginToken', userSchema);
module.exports = LoginToken;
