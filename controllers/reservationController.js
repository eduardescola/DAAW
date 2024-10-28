const mongoose = require('mongoose');
const Reservation = mongoose.model('Reservation');
const Store = mongoose.model('Store');

exports.createReservation = async (req, res) => {
  const { storeId, date, timeSlot } = req.body;
  const store = await Store.findById(storeId);

  if (!store) {
    req.flash('error', 'Store not found');
    return res.redirect('/');
  }

  // Verificar si el restaurante está cerrado en la fecha seleccionada
  const dayOfWeek = new Date(date).toLocaleString('en-US', { weekday: 'long' });
  if (store.closedDays.includes(dayOfWeek)) {
    req.flash('error', 'The store is closed on the selected date');
    return res.redirect(`/store/${store.slug}`);
  }

  // Verificar si hay disponibilidad en la franja horaria seleccionada
  const reservations = await Reservation.find({ store: storeId, date, timeSlot });
  const timeSlotInfo = store.timeSlots.find(slot => slot.start === timeSlot.start && slot.end === timeSlot.end);
  if (reservations.length >= timeSlotInfo.maxReservations) {
    req.flash('error', 'No availability in the selected time slot');
    return res.redirect(`/store/${store.slug}`);
  }

  const reservation = new Reservation({
    user: req.user._id,
    store: storeId,
    date,
    timeSlot
  });

  await reservation.save();
  req.flash('success', 'Reservation created successfully');
  res.redirect(`/store/${store.slug}`);
};

exports.getReservations = async (req, res) => {
  const reservations = await Reservation.find({ user: req.user._id }).populate('store');
  res.render('reservations', { title: 'My Reservations', reservations });
};

exports.cancelReservation = async (req, res) => {
  const reservation = await Reservation.findOneAndDelete({ _id: req.params.id, user: req.user._id });

  if (!reservation) {
    req.flash('error', 'You do not have permission to cancel this reservation');
    return res.redirect('/reservations');
  }

  req.flash('success', 'Reservation cancelled successfully');
  res.redirect('/reservations');
};

exports.finalizeExpiredReservations = async (req, res) => {
  // Obtiene la fecha actual
  const now = new Date();

  // Busca las reservas cuya fecha es anterior a la fecha actual y que aún están activas
  const expiredReservations = await Reservation.find({
    date: { $lt: now },
    status: 'activa'
  });

  // Actualiza el estado de cada reserva a "finalizada"
  if (expiredReservations.length > 0) {
      const updatePromises = expiredReservations.map(reservation =>
        Reservation.findByIdAndUpdate(reservation._id, { status: 'finalizada' })
    );

    // Espera que todas las actualizaciones se completen
    await Promise.all(updatePromises);
    req.flash('success', `Se han finalizado ${expiredReservations.length} reservas.`);
  } else {
     req.flash('info', 'No hay reservas expiradas para finalizar.');
  }
    
  res.redirect('/reservations'); // Redirige a la página de reservas después de la operación
};