require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const eventRoutes = require('./routes/eventRoutes');

const app = express();

// Connect to MongoDB
connectDB();

app.use(cors());
app.use(express.json());

// API Key middleware check
app.use((req, res, next) => {
    // The user provided API Key for Google/FCM or general event-service access.
    // For now, attaching to req, could be validated if sent via headers.
    req.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyDPCacIEOw3-UOpM6qt_xJzJTlB5DVfNNs';
    next();
});

app.use('/api/events', eventRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Event Service' });
});

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
    console.log(`Event Service running on port ${PORT}`);
});
