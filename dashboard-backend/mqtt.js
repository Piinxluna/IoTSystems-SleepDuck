require('dotenv').config()
const mqtt = require('mqtt')
const { createPoint } = require('./db')

console.log('⚙️ connecting to MQTT Broker')

const host = process.env.MQTT_HOST
const username = process.env.MQTT_USERNAME
const password = process.env.MQTT_PASSWORD

const options = {
  host,
  port: 8883, // Secure MQTT port
  protocol: 'mqtts', // Use secure connection
  username,
  password,
}

const mqttClient = mqtt.connect(options)

// Handle MQTT Connection
mqttClient.on('connect', () => {
  console.log('✅ Connected to MQTT Broker')

  // Subscribe to topics you want to listen to
  mqttClient.subscribe('sensor', (err) => {
    if (!err) {
      console.log(`Successfully subscribed to topic: sensor`)
    } else {
      console.error(`Subscription failed for topic sensor: ${err}`)
    }
  })
  mqttClient.subscribe('posture', (err) => {
    if (!err) {
      console.log(`Successfully subscribed to topic: posture`)
    } else {
      console.error(`Subscription failed for topic posture: ${err}`)
    }
  })
})

mqttClient.on('error', (err) => {
  console.error('❌ MQTT Connection Error:', err)
})

// Handle Incoming MQTT Messages
mqttClient.on('message', (topic, message) => {
  const value = message.toString()
  console.log(`Received ${topic}: ${value}`)

  createPoint(topic, JSON.parse(value))
})

// UTILS
const publishMQTTMessage = (topic, message) => {
  mqttClient.publish(topic, message)
}

module.exports = {
  publishMQTTMessage,
}
