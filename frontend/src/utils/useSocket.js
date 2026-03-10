import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const useSocket = (onNotification) => {
    const { user } = useAuth();
    const savedCallback = useRef();

    // Remember the latest callback if it changes.
    useEffect(() => {
        savedCallback.current = onNotification;
    }, [onNotification]);

    useEffect(() => {
        if (!user || !user.token) return;

        const socket = io('http://localhost:5003', { // Direct connection to Notif Service
            auth: {
                token: user.token
            }
        });

        socket.on('connect', () => {
            console.log('Socket.io connected to Notification Service');
        });

        socket.on('event_reminder', (data) => {
            console.log(`%c=========================================`, 'color: #16a34a; font-size: 14px; font-weight: bold;');
            console.log(`%c🔔 CONSOLE NOTIFICATION: ${data.title}`, 'color: #16a34a; font-size: 18px; font-weight: bold;');
            console.log(`%cMessage: ${data.message}`, 'color: #15803d; font-size: 16px;');
            console.log(`%c=========================================`, 'color: #16a34a; font-size: 14px; font-weight: bold;');

            if (savedCallback.current) {
                savedCallback.current(data);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [user]); // Removed onNotification from dependencies!
};

export default useSocket;
