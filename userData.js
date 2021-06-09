const mongoose = require("mongoose");

const userDataSchema = mongoose.Schema({
  userId: String,
  name: String,
  xp: Number,
  level: Number,
});

module.exports = mongoose.model("userdatas", userDataSchema);
