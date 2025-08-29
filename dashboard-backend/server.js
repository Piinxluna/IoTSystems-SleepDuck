require('dotenv').config();

const express = require('express')
const cors = require('cors')
const app = express()
const mongoose = require('mongoose')
const SensorData = require('./models/sensorData')

app.use(express.json())

// Connecting to db
console.log('Connecting to MongoDB...', process.env.DATABASE_URL)
mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true }).then(() => {
  console.log('MongoDB connected');
  app.listen(9000, () => console.log('Application is running on port 9000'));
})
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// allow request from other origin (Frontend which is at different port)
app.use(cors());

// API endpoints
app.get('/', (req, res) => {
  res.json({ message: 'Hello world!' })
})

app.get('/data', async (req, res) => {
  try {
    const data = await SensorData.find();
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
})

app.get('/__delete-all', async (req, res) => {
  try {
    const deletedData = await SensorData.deleteMany({})
    res.status(200).json(deletedData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch latest data' });
  }
});

app.get('/__debug', async (req, res) => {
  const collections = await mongoose.connection.db.listCollections().toArray();
  const modelColl = SensorData.collection.name;         // which collection your model targets
  const count = await SensorData.countDocuments().catch(() => -1);
  res.json({
    dbName: mongoose.connection.name,
    modelCollection: modelColl,
    availableCollections: collections.map(c => c.name),
    sensorDataCount: count
  });
});

// Start server
app.listen(9000, () => {
  console.log('Application is running on port 9000')
})