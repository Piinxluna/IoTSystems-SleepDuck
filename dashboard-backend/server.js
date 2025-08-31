require('dotenv').config()

const express = require('express')
const cors = require('cors')
const app = express()
const mongoose = require('mongoose')
const SensorData = require('./models/sensorData')

app.use(express.json())

// Connecting to db
console.log('Connecting to MongoDB...', process.env.DATABASE_URL)
mongoose
  .connect(process.env.DATABASE_URL, { useNewUrlParser: true })
  .then(() => {
    console.log('MongoDB connected')
    app.listen(9000, () => console.log('Application is running on port 9000'))
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err)
    process.exit(1)
  })

// allow request from other origin (Frontend which is at different port)
app.use(cors())

// API endpoints
app.get('/', (req, res) => {
  res.json({ message: 'Hello world!' })
})

app.get('/data', async (req, res) => {
  try {
    const data = await SensorData.find()
    const formatData = data.map((item) => ({
      ...item._doc,
      currentTime: new Date(item.currentTime),
    }))

    res.status(200).json(formatData)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch data' })
  }
})

app.get('/data/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]

    const data = await SensorData.find({
      currentTime: { $regex: today },
    })

    const formatData = data.map((item) => ({
      ...item._doc,
      currentTime: new Date(item.currentTime),
    }))

    res.status(200).json(formatData)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch data' })
  }
})

function plateauScore(value, { minLow, idealLow, idealHigh, maxHigh }) {
  if (value >= idealLow && value <= idealHigh) {
    return 100;
  }
  if (value < idealLow) {
    // rise from 0 at minLow -> 100 at idealLow
    return clamp(100 * (value - minLow) / (idealLow - minLow));
  }
  // value > idealHigh: fall from 100 at idealHigh -> 0 at maxHigh
  return clamp(100 * (maxHigh - value) / (maxHigh - idealHigh));
}

const DEFAULT_WEIGHTS = {
  heartRate: 0.20,
  motion: 0.20,
  temp: 0.15,
  humid: 0.10,
  sound: 0.20,
  light: 0.15,
};

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

function heartRateScore(bpm) {
  return plateauScore(bpm, { minLow: 40, idealLow: 45, idealHigh: 60, maxHigh: 90 });
}

function motionScore(motion01) {
  return clamp((1 - motion01) * 100);
}

function temperatureScore(celsius) {
  return plateauScore(celsius, { minLow: 22, idealLow: 24, idealHigh: 28, maxHigh: 32 });
}

function humidityScore(rh) {
  return plateauScore(rh, { minLow: 25, idealLow: 40, idealHigh: 60, maxHigh: 75 });
}

function soundScore(dB) {
  if (dB <= 30) {
    return 100;
  }
  if (dB >= 70) {
    return 0;
  }
  return clamp(100 * (70 - dB) / 40);
}

function lightScore(light01to100) {
  if (light01to100 <= 30) {
    return 100;
  }
  if (light01to100 >= 60) {
    return 0;
  }
  return clamp(100 * (60 - light01to100) / 30);
}

function computeSleepQuality(reading, weights = DEFAULT_WEIGHTS) {
  const subs = {
    heartRate: heartRateScore(reading.heartRate),
    motion: motionScore(reading.motion),
    temp: temperatureScore(reading.temp),
    humid: humidityScore(reading.humid),
    sound: soundScore(reading.sound),
    light: lightScore(reading.light),
  };
  const score =
    subs.heartRate * weights.heartRate +
    subs.motion * weights.motion +
    subs.temp * weights.temp +
    subs.humid * weights.humid +
    subs.sound * weights.sound +
    subs.light * weights.light;

  return Math.round(score * 100) / 100;
}

app.get('/data/latest-24-hours', async (req, res) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const dateString = oneDayAgo.toISOString().split('T')[0]
    const timeString = oneDayAgo.toTimeString().split(' ')[0]
    const filterString = `${dateString} ${timeString}`

    const data = await SensorData.find({
      currentTime: { $gte: filterString },
    })

    const formatData = data.map((item) => ({
      ...item._doc,
      dataPoint: computeSleepQuality(item),
      currentTime: item.currentTime,
    }))

    res.status(200).json(formatData)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch data' })
  }
})

app.get('/__delete-all', async (req, res) => {
  try {
    const deletedData = await SensorData.deleteMany({})
    res.status(200).json(deletedData)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch latest data' })
  }
})

app.get('/__debug', async (req, res) => {
  const collections = await mongoose.connection.db.listCollections().toArray()
  const modelColl = SensorData.collection.name // which collection your model targets
  const count = await SensorData.countDocuments().catch(() => -1)
  res.json({
    dbName: mongoose.connection.name,
    modelCollection: modelColl,
    availableCollections: collections.map((c) => c.name),
    sensorDataCount: count,
  })
})

// Start server
app.listen(9000, () => {
  console.log('Application is running on port 9000')
})
