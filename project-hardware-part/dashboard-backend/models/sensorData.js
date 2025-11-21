const mongoose = require('mongoose')

const sensorDataSchema = new mongoose.Schema(
  {
    heartRate: Number,
    motion: Number,
    humid: Number,
    temp: Number,
    sound: Number,
    light: Number,
    dataPoint: Number,
    currentTime: String,
  },
  { collection: 'sensorData' }
)

module.exports = mongoose.model('SensorData', sensorDataSchema)
