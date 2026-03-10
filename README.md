# Event Reminder Platform

A production-ready cloud-based Event Reminder Platform built with microservices architecture. It allows users to register, create events, and automatically receive reminders via SMS, Email, and Push Notifications.

## Architecture
- **Frontend**: React Progressive Web App (PWA) with Vite, Tailwind CSS, FullCalendar, and Web Speech API
- **API Gateway**: Express-based proxy router
- **User Service**: Express server, JWT authentication, MongoDB
- **Event Service**: Event management, BullMQ producer
- **Notification Service**: BullMQ worker that processes jobs and sends real-time updates via Socket.io, Twilio, and Emails.
- **Queue**: Redis & BullMQ
- **Database**: MongoDB

## Quick Start (Local Development)

### Prerequisites
- Docker and Docker Compose
- Node.js (v18+)

### Environment Set Up
1. Clone the repository.
2. Ensure you have Docker running locally.
3. Review `.env.example` in the root dictionary for required API keys (currently they default to mocked outputs if not provided).

### Running the Backend Services
To spin up MongoDB, Redis, API Gateway, User, Event, and Notification services concurrently:
```bash
docker-compose up --build
```
This maps the **API Gateway** to `http://localhost:5000`.

### Running the Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
The application will be accessible at `http://localhost:3000`.

## Features implemented:
1. **JWT Authentication**: Register and Login flows.
2. **Dashboard**: FullCalendar implementation showing real events.
3. **Voice Creation**: Use the "Voice Create" button to verbally speak an event like "Remind me to attend class tomorrow at 3pm".
4. **BullMQ Queues**: Event Service schedules notifications X minutes before the event via Redis.
5. **Real-time web sockets**: Live banner notifications on the frontend when an event triggers via `Socket.io`.
