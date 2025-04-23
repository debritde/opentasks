const mongoose = require("mongoose");

const ConfigSchema = new mongoose.Schema({
  configName: { type: String, required: true, unique: true },
  configValue: { type: Object, required: true }
});

module.exports = mongoose.model("Config", ConfigSchema);
