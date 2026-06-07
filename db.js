const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // connect to the `SMS` database and use supported options
    await mongoose.connect('mongodb+srv://allanaugustin:allanaugustin@sms.pubu3nc.mongodb.net/SMS?retryWrites=true&w=majority');
    console.log('MongoDB Connected')
  } catch (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;