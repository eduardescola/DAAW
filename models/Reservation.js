const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const timeSlotSchema = new mongoose.Schema({
  start: {
    type: String,
    required: [true, 'You must supply a start time']
  },
  end: {
    type: String,
    required: [true, 'You must supply an end time']
  }
});

const reservationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'You must supply a time slot'],
  },
  store: {
    type: mongoose.Schema.ObjectId,
    ref: 'Store',
    required: [true, 'You must supply a time slot'],
  },
  date: {
    type: Date,
    required: [true, 'You must supply a time slot'],
  },
  timeSlot: {
    type: timeSlotSchema,
    required: [true, 'You must supply a time slot']
  },
  created: {
    type: Date,
    default: Date.now
  }
});

// Exportar el modelo Reservation
module.exports = mongoose.model('Reservation', reservationSchema);