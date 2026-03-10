const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const { sendEmail, sendSMS, sendPush } = require('../services/notificationService');

// We need User model to get contact info
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
});
const User = mongoose.model('User', userSchema);

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
};

const initWorker = (io) => {
    const worker = new Worker('reminderQueue', async (job) => {
        const { eventId, userId, title, reminderSettings } = job.data;
        console.log(`Processing reminder for job ${job.id}, event: ${title}`);

        try {
            const user = await User.findById(userId);
            if (!user) {
                console.error(`User ${userId} not found for event ${eventId}`);
                return;
            }

            const message = `Reminder: Your event "${title}" is starting soon!`;

            if (reminderSettings.email && user.email) {
                await sendEmail(user.email, `Event Reminder: ${title}`, message);
            }

            if (reminderSettings.sms && user.phone) {
                await sendSMS(user.phone, message);
            }

            if (reminderSettings.push) {
                await sendPush(userId, `Event Reminder`, message);
            }

            // Real-time websocket alert
            if (io) {
                // Emitting to a specific user room
                io.to(userId).emit('event_reminder', {
                    eventId,
                    title,
                    message
                });
                console.log(`[SOCKET] Emitted realtime reminder to user ${userId}`);
            }

        } catch (error) {
            console.error('Error processing job:', error);
        }
    }, { connection });

    worker.on('completed', job => {
        console.log(`Job ${job.id} has completed!`);
    });

    worker.on('failed', (job, err) => {
        console.error(`Job ${job.id} has failed with ${err.message}`);
    });

    console.log('BullMQ Worker initialized for reminderQueue');
    return worker;
};

module.exports = initWorker;
