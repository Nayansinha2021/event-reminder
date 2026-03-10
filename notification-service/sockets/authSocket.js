const jwt = require('jsonwebtoken');

const socketAuth = (socket, next) => {
    try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id; // Attack user ID to socket
        next();
    } catch (err) {
        return next(new Error('Authentication error: Invalid token'));
    }
};

module.exports = socketAuth;
