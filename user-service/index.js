require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Connect to database
connectDB();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/users', authRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'User Service' });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`User Service running on port ${PORT}`);
});
