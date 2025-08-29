const mongoose = require('mongoose')

const sensorDataSchema = new mongoose.Schema({
  heartRate: String,
  // motion: String,
  gyroX: Number,
  gyroY: Number,
  gyroZ: Number,
  humid: Number,
  temp: Number,
  sound: Number,
  light: Number,
  dataPoint: Number,
  currentTime: Date
}, { collection: 'sensorData' })

module.exports = mongoose.model('SensorData', sensorDataSchema);