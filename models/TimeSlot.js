const mongoose = require('mongoose');

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

// Exportar el modelo TimeSlot
module.exports = mongoose.model('TimeSlot', timeSlotSchema);
