const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const runTest = async () => {
    try {
        console.log('Connecting to MongoDB Auth...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        console.log('Creating test user...');
        const user = await User.create({
            name: 'Test',
            email: 'test_node@example.com',
            password: 'pwd',
            phone: '123'
        });
        console.log('Created!', user);
    } catch (e) {
        console.error('Mongoose Error:', e);
    } finally {
        process.exit();
    }
};

runTest();
