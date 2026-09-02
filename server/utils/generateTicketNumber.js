const Ticket = require('../models/Ticket');

// Counter model for auto-incrementing ticket numbers
const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 10000 }
});

const Counter = mongoose.model('Counter', counterSchema);

const generateTicketNumber = async () => {
  const counter = await Counter.findByIdAndUpdate(
    'ticketNumber',
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `TKT-${counter.seq}`;
};

module.exports = { generateTicketNumber };
