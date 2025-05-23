const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    permissions: { 
        type: [String], 
        default: [] // Beispiel: ['read_tickets', 'create_tickets', 'edit_tickets']
    }
});

const Group = mongoose.model('Group', groupSchema);
module.exports = Group;
