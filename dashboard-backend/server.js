require('dotenv').config()

const express = require('express')
const cors = require('cors')
const router = require('./router')

// --- Initialize MQTT ---
require('./mqtt')

// ----- Set up express -----
console.log('⚙️ set up express')
const app = express()
app.use(express.json())
app.use(cors()) // allow request from other origin (Frontend which is at different port)
app.use('/', router)

// ----- Start server -----
console.log('⚙️ starting server')
app.listen(9000, () => {
  console.log('Application is running on port 9000')
})
