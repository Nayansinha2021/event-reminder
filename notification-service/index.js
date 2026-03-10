require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const initWorker = require('./workers/reminderWorker');
const socketAuth = require('./sockets/authSocket');

const app = express();
app.use(cors());

const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
    cors: {
        origin: '*', // For development, allow all
        methods: ['GET', 'POST']
    }
});

// Middleware for auth
io.use(socketAuth);

io.on('connection', (socket) => {
    console.log(`User connected with socket ID: ${socket.id}, User ID: ${socket.userId}`);

    // Join a room specific to the user so we can emit personal notifications
    socket.join(socket.userId);

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// Connect to DB (mainly for fetching user info inside the worker)
connectDB();

// Initialize BullMQ Worker passing the IO instance
initWorker(io);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Notification Service' });
});

const PORT = process.env.PORT || 5003;

server.listen(PORT, () => {
    console.log(`Notification Service & WebSockets running on port ${PORT}`);
});
