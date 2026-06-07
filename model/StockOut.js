const mongoose = require("mongoose");

const stockOutSchema = new mongoose.Schema({
  quantityOut: Number,
  totalQuantityOut: Number,
  stockOutDate: Date,

  stockInId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StockIn",
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

module.exports = mongoose.model("StockOut", stockOutSchema);