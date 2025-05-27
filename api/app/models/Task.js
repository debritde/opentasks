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
    parentTaskTicketNumber: [{ type: String, ref: 'Task' }],
    attachments: [
        {
            filename: { type: String, required: true },
            fileId: { type: String, required: true },
            path: { type: String, required: false },    // absoluter Pfad
        }
    ],
    startDate: { type: Date, required: false },
    endDate: { type: Date, required: false },
    isDone: { type: Boolean, default: false },
    kanbanIndexVertical: { type: String, default: false },
    createdByUserId: { type: String },
    createdByEmailAddress: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    customFields: [{
        customField: { type: mongoose.Schema.Types.ObjectId, ref: 'taskCustomFields' },
        title: { type: String },
        value: { type: mongoose.Schema.Types.Mixed }, // Erlaubt flexible Datentypen (String, Number, Boolean etc.)
    }]
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

    // Falls kanbanIndexVertical noch nicht gesetzt ist, generiere den nächsthöheren Wert
    if (this.kanbanIndexVertical === false || this.kanbanIndexVertical === "false" || this.kanbanIndexVertical === undefined || this.kanbanIndexVertical == null) {
        const highestIndexTask = await mongoose.model('Task').findOne()?.sort({ kanbanIndexVertical: -1 });
        this.kanbanIndexVertical = highestIndexTask?.kanbanIndexVertical != null ? parseInt(highestIndexTask.kanbanIndexVertical) + 1 : 0;
    }

    next();
});


// Text-Index setzen
TaskSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Task', TaskSchema);
