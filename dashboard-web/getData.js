// Import Firebase modules (v9+ modular syntax)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js'
import {
  getDatabase,
  ref,
  onValue,
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js'

const firebaseConfig = require('./firebase-config.json')

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getDatabase(app)

// Reference to your data (example: "sensorData")
const dataRef = ref(db, 'sensorData')

// Listen for data changes repeatedly
onValue(dataRef, (snapshot) => {
  const data = snapshot.val()
  const container = document.getElementById('current-data')

  if (data) {
    container.innerHTML = JSON.stringify(data, null, 2) // Display as formatted JSON
  } else {
    container.innerHTML = 'No data found'
  }
})
