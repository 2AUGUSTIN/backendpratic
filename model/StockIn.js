const mongoose = require("mongoose");

const stockInSchema = new mongoose.Schema({
  itemName: String,
  description: String,
  quantityIn: Number,
  totalQuantityIn: Number,
  supplierName: String,
  stockInDate: Date,

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

module.exports = mongoose.model("StockIn", stockInSchema);