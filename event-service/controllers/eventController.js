const Event = require('../models/Event');
const reminderQueue = require('../queue/reminderQueue');

// @desc    Get all active events for logged in user
// @route   GET /api/events
exports.getEvents = async (req, res) => {
    try {
        const events = await Event.find({ userId: req.user.id }).sort('date');
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create an event
// @route   POST /api/events/create
exports.createEvent = async (req, res) => {
    try {
        const { title, description, date, reminderSettings } = req.body;

        const event = await Event.create({
            userId: req.user.id,
            title,
            description,
            date,
            reminderSettings
        });

        // Calculate delay for the reminder
        const eventDate = new Date(date);
        const minutesBefore = reminderSettings?.minutesBefore || 30;
        const reminderTime = new Date(eventDate.getTime() - minutesBefore * 60000);

        const delay = reminderTime.getTime() - Date.now();

        if (delay > 0) {
            // Add to BullMQ queue
            const job = await reminderQueue.add('sendReminder', {
                eventId: event._id,
                userId: req.user.id,
                title: event.title,
                reminderSettings: event.reminderSettings
            }, { delay });

            event.jobId = job.id;
            await event.save();
        }

        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update an event
// @route   PUT /api/events/update/:id
exports.updateEvent = async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, userId: req.user.id });

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const { title, description, date, reminderSettings } = req.body;

        event.title = title || event.title;
        event.description = description || event.description;
        event.date = date || event.date;

        if (reminderSettings) {
            event.reminderSettings = { ...event.reminderSettings, ...reminderSettings };
        }

        const updatedEvent = await event.save();

        // If there is an existing job, remove it and create a new one
        if (event.jobId) {
            const existingJob = await reminderQueue.getJob(event.jobId);
            if (existingJob) {
                await existingJob.remove();
            }
        }

        // Add new job
        const eventDate = new Date(updatedEvent.date);
        const minutesBefore = updatedEvent.reminderSettings.minutesBefore;
        const reminderTime = new Date(eventDate.getTime() - minutesBefore * 60000);
        const delay = reminderTime.getTime() - Date.now();

        if (delay > 0) {
            const job = await reminderQueue.add('sendReminder', {
                eventId: updatedEvent._id,
                userId: req.user.id,
                title: updatedEvent.title,
                reminderSettings: updatedEvent.reminderSettings
            }, { delay });

            updatedEvent.jobId = job.id;
            await updatedEvent.save();
        } else {
            updatedEvent.jobId = null;
            await updatedEvent.save();
        }

        res.json(updatedEvent);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete an event
// @route   DELETE /api/events/delete/:id
exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.id, userId: req.user.id });

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Remove from queue
        if (event.jobId) {
            const existingJob = await reminderQueue.getJob(event.jobId);
            if (existingJob) {
                await existingJob.remove();
            }
        }

        await event.deleteOne();

        res.json({ message: 'Event removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
