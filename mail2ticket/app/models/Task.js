const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    ticketNumber: { type: String, unique: true }, // Hochzählende ID im Format '000001'
    title: { type: String, required: true },
    description: { type: String },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, default: 'new' },
    priority: { type: String },
    isSubTask: { type: Boolean, default: false },
    subtaskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    attachments: [
        {
            filename: { type: String, required: true },
            fileId: { type: mongoose.Schema.Types.ObjectId, required: true }
        }
    ],
    startDate: { type: Date, required: false },
    endDate: { type: Date, required: false },
    isDone: { type: Boolean, default: false },
    kanbanOrder: { type: Number, default: false },
    createdByUserId: { type: String },
    createdByEmailAddress: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Automatisches Setzen des `updatedAt`-Feldes bei jeder Aktualisierung
TaskSchema.pre('save', async function (next) {
    this.updatedAt = Date.now();
    // Falls ticketNumber noch nicht gesetzt ist, generiere eine neue
    if (!this.ticketNumber) {
        const lastTask = await mongoose.model('Task').findOne().sort({ ticketNumber: -1 });
        let newId = '000001';
        
        if (lastTask && lastTask.ticketNumber) {
            const lastIdNum = parseInt(lastTask.ticketNumber, 10);
            newId = String(lastIdNum + 1).padStart(6, '0');
        }
        
        this.ticketNumber = newId;
    }
    
    next();
});

// Text-Index setzen
TaskSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Task', TaskSchema);
