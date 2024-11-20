const mongoose = require('mongoose');
const TimeSlot = mongoose.model('TimeSlot');
const Store = mongoose.model('Store');

exports.createTimeSlot = async (req, res) => {
  try {
    const timeSlot = new TimeSlot({
      start: req.body.start,
      end: req.body.end,
      maxReservations: req.body.maxReservations
    });
    await timeSlot.save();
    req.flash('success', 'Time slot created successfully.');
  } catch (error) {
    req.flash('error', 'There was an error creating the time slot.');
  }
};

exports.updateTimeSlot = async (req, res) => {
  try {
    const timeSlot = await TimeSlot.findOneAndUpdate(
      { _id: req.params.id },
      {
        start: req.body.start,
        end: req.body.end,
        maxReservations: req.body.maxReservations
      },
      { new: true, runValidators: true }
    ).exec();
    req.flash('success', 'Time slot updated successfully.');
  } catch (error) {
    req.flash('error', 'There was an error updating the time slot.');
  }
};

exports.deleteTimeSlot = async (req, res) => {
  try {
    await TimeSlot.findOneAndDelete({ _id: req.params.id }).exec();
    req.flash('success', 'Time slot deleted successfully.');
  } catch (error) {
    req.flash('error', 'There was an error deleting the time slot.');
  }
};