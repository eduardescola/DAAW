const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

const reservationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'You must supply a user'],
  },
  store: {
    type: mongoose.Schema.ObjectId,
    ref: 'Store',
    required: [true, 'You must supply a store'],
  },
  date: {
    type: Date,
    required: [true, 'You must supply a date'],
  },
  timeSlot: {
    type: mongoose.Schema.ObjectId,
    ref: 'TimeSlot', // Cambiamos a referencia al modelo TimeSlot
    required: [true, 'You must supply a time slot']
  },
  status: {
    type: String,
    enum: ['activa', 'finalizada'], // Limita los estados a estos dos
    default: 'activa', // Estado por defecto
  },
  created: {
    type: Date,
    default: Date.now
  }
});

// Exportar el modelo Reservation
module.exports = mongoose.model('Reservation', reservationSchema);
