const { Queue } = require('bullmq');

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
};

const reminderQueue = new Queue('reminderQueue', { connection });

console.log('BullMQ reminderQueue initialized');

module.exports = reminderQueue;
