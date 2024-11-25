const mongoose = require("mongoose");
const Reservation = mongoose.model("Reservation");
const Store = mongoose.model("Store");
const TimeSlot = mongoose.model("TimeSlot");

exports.createReservation = async (req, res) => {
  const { storeId, date, timeSlot } = req.body;
  const store = await Store.findById(storeId).populate("timeSlots");

  if (!store) {
    req.flash("error", "Store not found");
    return res.redirect("/");
  }

  // Verificar si el restaurante está cerrado en la fecha seleccionada
  const dayOfWeek = new Date(date).toLocaleString("en-US", { weekday: "long" });
  if (store.closedDays.includes(dayOfWeek)) {
    req.flash("error", "The store is closed on the selected date");
    return res.redirect(`/store/${store.slug}`);
  }

  // Verificar si hay disponibilidad en la franja horaria seleccionada
  const reservations = await Reservation.find({
    store: storeId,
    date,
    timeSlot,
  });
  const timeSlotInfo = store.timeSlots.find(
    (slot) => slot._id.toString() === timeSlot
  );
  if (!timeSlotInfo) {
    req.flash("error", "Invalid time slot selected");
    return res.redirect(`/store/${store.slug}`);
  }
  if (reservations.length >= timeSlotInfo.maxReservations) {
    req.flash("error", "No availability in the selected time slot");
    return res.redirect(`/store/${store.slug}`);
  }

  const reservation = new Reservation({
    user: req.user._id,
    store: storeId,
    date,
    timeSlot: timeSlotInfo._id,
  });

  await reservation.save();
  req.flash("success", "Reservation created successfully");
  res.redirect(`/store/${store.slug}`);
};

exports.getReservations = async (req, res) => {
  const reservations = await Reservation.find({ user: req.user._id })
      .populate('store')
      .populate('timeSlot');

  res.render('reservations', { title: 'My Reservations', reservations });
};

exports.cancelReservation = async (req, res) => {
  const reservation = await Reservation.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!reservation) {
    req.flash("error", "You do not have permission to cancel this reservation");
    return res.redirect("/reservations");
  }

  req.flash("success", "Reservation cancelled successfully");
  res.redirect("/reservations");
};

exports.updateReservationStatus = async (reservationId, newStatus) => {
  try {
    const updatedReservation = await Reservation.findByIdAndUpdate(
      reservationId,
      { status: newStatus },
      { new: true }
    );
    return updatedReservation;
  } catch (error) {
    console.error(`Error updating reservation status: ${error}`);
    throw error;
  }
};

exports.finalizeExpiredReservations = async (req, res, next) => {
  // Obtiene la fecha actual y establece la hora a 00:00:00 para comparar solo la fecha
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  console.log('Fecha actual:', now);

  // Busca las reservas cuya fecha es anterior a la fecha actual y que aún están activas
  const expiredReservations = await Reservation.find({
    date: { $lt: now },
    status: 'activa',
  });

  // Actualiza el estado de cada reserva a "finalizada"
  if (expiredReservations.length > 0) {
    const updatePromises = expiredReservations.map((reservation) =>
      exports.updateReservationStatus(reservation._id, 'finalizada')
    );

    // Espera que todas las actualizaciones se completen
    await Promise.all(updatePromises);
    req.flash(
      'success',
      `Se han finalizado ${expiredReservations.length} reservas.`
    );
  } else {
    req.flash('info', 'No hay reservas expiradas para finalizar.');
  }

  next(); // Pasa al siguiente middleware
};