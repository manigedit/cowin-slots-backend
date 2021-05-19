const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const warehouseSchema = new Schema({
  district_name: {
    type: String,
    trim: true,
  },
  district_id: {
    type: String,
    trim: true,
  },
});

module.exports = warehouseSchema;
