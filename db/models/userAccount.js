const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userAccountSchema = new Schema({
  accountType: {
    type: String,
    default: "individual",
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },

  pincode: {
    type: String,
    required: true,
    trim: true,
  },
  age: {
    type: String,
    required: true,
    trim: true,
  },
});

userAccountSchema.index({ phone: 1, pincode: 1, age: 1 }, { unique: true });

module.exports = userAccountSchema;
