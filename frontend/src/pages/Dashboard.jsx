import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import useSocket from '../utils/useSocket';
import * as chrono from 'chrono-node';
import { Mic, Plus, BellRing, X, Moon, Sun, BellOff } from 'lucide-react';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5004`;
    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });
    const [events, setEvents] = useState([]);
    const [isListening, setIsListening] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [newEvent, setNewEvent] = useState({ title: '', date: '', email: true, push: true, minutesBefore: 30 });

    // Custom Hook for WebSockets
    useSocket((data) => {
        const stampedData = { ...data, timestamp: new Date() };
        setNotifications((prev) => [stampedData, ...prev]);

        // Browser Pop Notification
        if (Notification.permission === 'granted') {
            new Notification(data.title, { body: data.message });
        }
    });

    useEffect(() => {
        const root = window.document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    useEffect(() => {
        if (Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
        fetchEvents();
    }, []);

    // Auto-refresh event colors dynamically as time passes & auto-clear notifications
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();

            setEvents(prevEvents => {
                const updatedEvents = prevEvents.map(ev => {
                    const eventDate = new Date(ev.start);
                    const isPast = eventDate <= now;

                    const color = isPast ? '#22c55e' : '#3b82f6'; // Green for past, Blue for future
                    return {
                        ...ev,
                        display: 'list-item',
                        color: color,
                        backgroundColor: color,
                        borderColor: color,
                        extendedProps: { ...ev.extendedProps, isPast }
                    };
                });

                // Return a fresh array every interval to force FullCalendar re-render
                return updatedEvents;
            });

            // Clean up old notifications (e.g. older than 15 seconds) so they disappear when an event occurs
            setNotifications(prevNotifs => {
                return prevNotifs.filter(notif => {
                    // Assuming we stamp them when they arrive
                    const age = now - (notif.timestamp || now);
                    return age < 15000; // Remove after 15 seconds
                });
            });

        }, 5000); // Check every 5 seconds for dynamic UI updates

        return () => clearInterval(interval);
    }, []);

    const fetchEvents = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await axios.get(`${API_URL}/api/events`, config);

            // Map to FullCalendar format
            const now = new Date();
            const formattedEvents = data.map(ev => {
                const eventDate = new Date(ev.date);
                const isPast = eventDate < now;
                const color = isPast ? '#22c55e' : '#3b82f6'; // Green for past, Blue for future
                return {
                    id: ev._id,
                    title: ev.title,
                    start: ev.date,
                    display: 'list-item',
                    color: color,
                    backgroundColor: color,
                    borderColor: color,
                    extendedProps: { ...ev, isPast }
                };
            });
            setEvents(formattedEvents);
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    };

    // --- Web Speech API Logic ---
    const startVoiceRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Your browser does not support Voice Recognition.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('Voice Input:', transcript);
            handleVoiceCommand(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    const handleVoiceCommand = async (text) => {
        try {
            // "Remind me to attend class tomorrow at 3pm"
            const parsedDates = chrono.parse(text);

            if (parsedDates.length === 0) {
                alert("Could not understand the date/time from your voice command. Please try again.");
                return;
            }

            const dateInfo = parsedDates[0];
            const eventDate = dateInfo.start.date();

            // Clean up the text to extract a title roughly
            let title = text.replace(dateInfo.text, '').replace(/remind me to/i, '').trim();
            if (!title) title = 'Voice Event';

            // Create Event API call
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.post(`${API_URL}/api/events/create`, {
                title,
                date: eventDate,
                reminderSettings: { email: true, push: true, minutesBefore: 30 }
            }, config);

            fetchEvents(); // Refresh calendar
            alert(`Added event: ${title} at ${eventDate.toLocaleString()}`);

        } catch (error) {
            console.error('Error creating voice event:', error);
        }
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.post(`${API_URL}/api/events/create`, {
                title: newEvent.title,
                date: new Date(newEvent.date).toISOString(),
                reminderSettings: { email: newEvent.email, push: newEvent.push, minutesBefore: newEvent.minutesBefore }
            }, config);

            setIsModalOpen(false);
            setNewEvent({ title: '', date: '', email: true, push: true, minutesBefore: 30 });
            fetchEvents(); // Refresh calendar
            alert('Event created successfully!');
        } catch (error) {
            console.error('Error creating event:', error);
            alert('Failed to create event. Please try again.');
        }
    };

    const handleDeleteEvent = async (e) => {
        e.preventDefault();
        if (!selectedEventId) {
            alert('Please select an event to delete.');
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.delete(`${API_URL}/api/events/delete/${selectedEventId}`, config);

            setIsDeleteModalOpen(false);
            setSelectedEventId('');
            fetchEvents();
            alert('Event deleted successfully!');
        } catch (error) {
            console.error('Error deleting event:', error);
            alert('Failed to delete event. Please try again.');
        }
    };

    const handleEventDrop = async (info) => {
        const { event } = info;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            // Optional: You could ask user if they want to update reminder settings, but we'll default to previous
            await axios.put(`${API_URL}/api/events/update/${event.id}`, {
                date: event.start.toISOString(),
            }, config);

            // Recalculate past/future locally or just fetch
            fetchEvents();
        } catch (error) {
            console.error('Error updating event date:', error);
            alert('Failed to update event date. Please try again.');
            info.revert(); // Revert calendar drop
        }
    };

    const requestNotificationPermission = () => {
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    alert('Notifications enabled!');
                }
            });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-200">
            <header className="bg-white dark:bg-gray-800 shadow dark:shadow-md transition-colors duration-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BellRing className="text-brand-600 dark:text-brand-400" /> Event Reminder Platform
                    </h1>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Toggle Dark Mode"
                        >
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <div className="flex flex-col items-end mr-4">
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Welcome, {user.name}</span>
                            <span className="text-xs text-brand-600 dark:text-brand-400 font-medium">{user.email}</span>
                        </div>
                        <button onClick={logout} className="text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 transition-colors">Logout</button>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">

                {/* Left Column: Calendar */}
                <div className="flex-1 bg-white dark:bg-gray-800 p-2 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col min-h-[500px] lg:h-[700px] overflow-hidden transition-colors duration-200">
                    <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white shrink-0">Your Calendar</h2>

                        <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto justify-start sm:justify-end">
                            {Notification.permission !== 'granted' && (
                                <button
                                    onClick={requestNotificationPermission}
                                    className="px-3 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-lg shadow-sm text-sm font-medium hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors whitespace-nowrap"
                                >
                                    Enable Alerts
                                </button>
                            )}
                            <button
                                onClick={startVoiceRecognition}
                                className={`flex items-center justify-center flex-1 sm:flex-none gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isListening
                                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 animate-pulse'
                                    : 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/40'
                                    }`}
                            >
                                <Mic size={16} />
                                {isListening ? 'Listening...' : 'Voice Create'}
                            </button>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center justify-center flex-1 sm:flex-none gap-2 px-4 py-2 bg-brand-600 dark:bg-brand-500 text-white rounded-lg hover:bg-brand-700 dark:hover:bg-brand-600 transition-colors shadow-sm text-sm font-medium"
                            >
                                <Plus size={16} />
                                <span className="hidden sm:inline">Add Event</span>
                                <span className="sm:hidden">Add</span>
                            </button>
                            <button
                                onClick={() => setIsDeleteModalOpen(true)}
                                className="flex items-center justify-center flex-1 sm:flex-none gap-2 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors shadow-sm text-sm font-medium"
                            >
                                <X size={16} />
                                <span className="hidden sm:inline">Delete Event</span>
                                <span className="sm:hidden">Delete</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 min-h-[400px] w-full overflow-x-auto overflow-y-hidden calendar-container flex flex-col">
                        <div className="min-w-[300px] sm:min-w-[500px] flex-1 w-full h-full min-h-[400px]">
                            <FullCalendar
                                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                initialView="dayGridMonth"
                                headerToolbar={{
                                    left: window.innerWidth < 640 ? 'prev,next' : 'prevYear,prev,next,nextYear today',
                                    center: 'title',
                                    right: window.innerWidth < 640 ? 'dayGridMonth' : 'dayGridMonth,timeGridWeek'
                                }}
                                events={events}
                                height="auto"
                                contentHeight="auto"
                                editable={true} // Enable drag and drop
                                droppable={true}
                                eventDrop={handleEventDrop}
                                eventClick={(info) => {
                                    alert(`Event: ${info.event.title}\nDate: ${info.event.start.toLocaleString()}`);
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: Real-time Notifications */}
                <div className="w-full lg:w-80 shrink-0 space-y-4">
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-auto lg:h-[700px] flex flex-col transition-colors duration-200">
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center justify-between shrink-0">
                            Live Alerts
                            {notifications.length > 0 && (
                                <span className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-xs px-2 py-1 rounded-full font-bold">
                                    {notifications.length}
                                </span>
                            )}
                        </h3>

                        <div className="space-y-3 overflow-y-auto flex-1 min-h-[200px]">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-6 pb-12">
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-full mb-4 opacity-80 transition-colors">
                                        <BellOff size={48} className="text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <h4 className="text-gray-800 dark:text-gray-200 font-medium mb-2">All Caught Up!</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">You have no live alerts right now. Enjoy the silence, or schedule a new event!</p>
                                </div>
                            ) : (
                                notifications.map((notif, idx) => (
                                    <div key={idx} className="p-3 bg-brand-50 dark:bg-gray-700/50 border border-brand-100 dark:border-gray-600 rounded-xl relative overflow-hidden transition-colors">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 dark:bg-brand-400"></div>
                                        <h4 className="font-semibold text-brand-900 dark:text-brand-100 text-sm">{notif.title}</h4>
                                        <p className="text-xs text-brand-700 dark:text-gray-300 mt-1">{notif.message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Add Event Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl dark:shadow-black/50 border border-gray-100 dark:border-gray-700 transition-colors">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Event</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateEvent} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event Title</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Doctor Appointment"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                                    value={newEvent.title}
                                    onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date & Time</label>
                                <input
                                    type="datetime-local"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                                    value={newEvent.date}
                                    onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notification Channels</label>
                                <div className="flex gap-6">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-brand-600 dark:text-brand-500 border-gray-300 dark:border-gray-600 rounded focus:ring-brand-500 dark:bg-gray-700"
                                            checked={newEvent.email}
                                            onChange={e => setNewEvent({ ...newEvent, email: e.target.checked })}
                                        />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Email</span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-brand-600 dark:text-brand-500 border-gray-300 dark:border-gray-600 rounded focus:ring-brand-500 dark:bg-gray-700"
                                            checked={newEvent.push}
                                            onChange={e => setNewEvent({ ...newEvent, push: e.target.checked })}
                                        />
                                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Push</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remind me before (minutes)</label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                                    value={newEvent.minutesBefore}
                                    onChange={e => setNewEvent({ ...newEvent, minutesBefore: parseInt(e.target.value) })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-brand-600 dark:bg-brand-500 text-white rounded-lg hover:bg-brand-700 dark:hover:bg-brand-600 transition-colors shadow-sm text-sm font-medium"
                                >
                                    Create Event
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Delete Event Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl dark:shadow-black/50 border border-gray-100 dark:border-gray-700 transition-colors">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Delete Event</h2>
                            <button onClick={() => setIsDeleteModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleDeleteEvent} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Event to Delete</label>
                                <select
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                                    value={selectedEventId}
                                    onChange={e => setSelectedEventId(e.target.value)}
                                >
                                    <option value="" disabled>Select an event...</option>
                                    {events.map((ev) => (
                                        <option key={ev.id} value={ev.id}>
                                            {ev.title} - {new Date(ev.start).toLocaleString()}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors shadow-sm text-sm font-medium"
                                >
                                    Delete Event
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
