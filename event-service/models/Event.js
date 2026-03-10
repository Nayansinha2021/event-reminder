const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    description: { type: String },
    date: { type: Date, required: true }, // The exact time of the event
    reminderSettings: {
        email: { type: Boolean, default: false },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: false },
        minutesBefore: { type: Number, default: 30 } // Send reminder 30 mins before
    },
    jobId: { type: String } // BullMQ Job ID to allow cancellation/updates
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
