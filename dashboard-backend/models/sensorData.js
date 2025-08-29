const mongoose = require('mongoose')

const sensorDataSchema = new mongoose.Schema({
  heartRate: Number,
  motion: Boolean,
  humid: Number,
  temp: Number,
  sound: Number,
  light: Number,
  dataPoint: Number,
  currentTime: Date
}, { collection: 'sensorData' })

module.exports = mongoose.model('SensorData', sensorDataSchema);