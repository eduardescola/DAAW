const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  start: {
    type: String,
    required: [true, 'You must supply a start time']
  },
  end: {
    type: String,
    required: [true, 'You must supply an end time']
  },
  maxReservations: {
    type: Number,
    required: [true, 'You must supply a maximum number of reservations']
  }
});

// Exportar el modelo TimeSlot
module.exports = mongoose.model('TimeSlot', timeSlotSchema);