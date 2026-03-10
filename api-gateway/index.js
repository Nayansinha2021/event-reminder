require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:5001';
const EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL || 'http://localhost:5002';
const NOTIF_SERVICE_URL = process.env.NOTIF_SERVICE_URL || 'http://localhost:5003';

// Manual Proxy function
const createManualProxy = (targetUrl) => {
    return async (req, res) => {
        try {
            const url = `${targetUrl}${req.originalUrl}`;
            console.log(`[Gateway] Forwarding ${req.method} to ${url}`);

            const response = await axios({
                method: req.method,
                url: url,
                data: req.method !== 'GET' ? req.body : undefined,
                headers: {
                    ...req.headers,
                    host: new URL(targetUrl).host,
                },
                validateStatus: () => true // Forward all HTTP codes
            });

            res.status(response.status).json(response.data);
        } catch (error) {
            console.error('[Gateway] Proxy Error:', error.message);
            res.status(500).json({ message: 'Gateway Proxy Error' });
        }
    };
};

// Route matching
app.use('/api/users', createManualProxy(USER_SERVICE_URL));
app.use('/api/events', createManualProxy(EVENT_SERVICE_URL));

// Basic WS relay workaround for now if needed (socket.io usually bypasses standard express middleware)
// But to ensure it runs we leave the default 5000 socket open or frontend connect direct to 5003.

app.get('/', (req, res) => {
    res.json({ message: 'Event Reminder Axios API Gateway is running' });
});

app.listen(PORT, () => {
    console.log(`API Gateway (Axios) running on port ${PORT}`);
});
