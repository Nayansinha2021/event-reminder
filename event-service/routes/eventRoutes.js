const express = require('express');
const router = express.Router();
const { getEvents, createEvent, updateEvent, deleteEvent } = require('../controllers/eventController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/').get(protect, getEvents);
router.route('/create').post(protect, createEvent);
router.route('/update/:id').put(protect, updateEvent);
router.route('/delete/:id').delete(protect, deleteEvent);

module.exports = router;
