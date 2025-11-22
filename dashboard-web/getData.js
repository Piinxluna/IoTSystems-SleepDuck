import { updateSensorData } from './updateSensorData.js'
import { updatePostureData } from './updatePostureData.js'
import { updateSettingData } from './updateSettingData.js'
import { updateSensorChart } from './updateSensorChart.js'
import { updatePostureChart } from './updatePostureChart.js'

const backendUrl = `https://iotsystems-sleepduck-backend.onrender.com`

async function getData() {
  try {
    const sensorHistory = await fetch(`${backendUrl}/data/sensor/last-day`, {
      cache: 'no-store',
    })
    const sensorData = await sensorHistory.json()
    if (Array.isArray(sensorData) && sensorData.length > 0) {
      updateSensorData(sensorData[sensorData.length - 1])
      updateSensorChart(sensorData)
    } else {
      updateSensorData(null)
      updateSensorChart([])
    }

    const postureHistory = await fetch(`${backendUrl}/data/posture/last-day`, {
      cache: 'no-store',
    })
    const postureData = await postureHistory.json()
    if (Array.isArray(postureData) && postureData.length > 0) {
      updatePostureData(postureData[postureData.length - 1])
      updatePostureChart(postureData)
    } else {
      updatePostureData(null)
      updatePostureChart([])
    }

    const settings = await fetch(`${backendUrl}/data/setting`, {
      cache: 'no-store',
    })
    const settingData = await settings.json()
    if (settingData) {
      updateSettingData(settingData)
    } else {
      updateSettingData(null)
    }
  } catch (error) {
    console.error(error.message)
  }
}

// Start the loop to constantly fetch data
async function loop() {
  try {
    await getData()
  } finally {
    setTimeout(loop, 10000)
  }
}

loop()
