const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/SMS');
    console.log('MongoDB Connected');
  } catch (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;