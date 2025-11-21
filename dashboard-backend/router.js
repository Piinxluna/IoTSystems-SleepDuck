const express = require('express')
const { readLastDayPoints, readLastPoint, createPoint } = require('./db')
const { computeSleepQuality } = require('./utils')
const router = express.Router({ mergeParams: true })

router.get('/', (req, res) => {
  return res.status(200).json({ message: 'Hello world!' })
})

// -------------------------------- Sensor Data --------------------------------
router.get('/data/sensor', async (req, res) => {
  try {
    const data = await readLastPoint('sensor')

    if (!data) {
      return res.status(200).json(null)
    }

    const quality = computeSleepQuality(data)

    const formatData = {
      ...data, // Spreads heartRate, temp, etc.
      dataPoint: quality, // Adds your computed value
      currentTime: data._time, // Renames _time to currentTime
      _time: undefined, // (Optional) Removes the original _time key
    }

    return res.status(200).json(formatData)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to fetch data' })
  }
})

router.get('/data/sensor/last-day', async (req, res) => {
  try {
    const data = await readLastDayPoints('sensor')

    const formatData = data.map((item) => {
      const quality = computeSleepQuality(item)

      // Return the final clean object
      return {
        ...item, // Spreads heartRate, temp, etc.
        dataPoint: quality, // Adds your computed value
        currentTime: item._time, // Renames _time to currentTime
        _time: undefined, // (Optional) Removes the original _time key
      }
    })

    return res.status(200).json(formatData)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to fetch data' })
  }
})

// -------------------------------- Posture & Setting Data --------------------------------
router.get('/data/:type', async (req, res) => {
  try {
    const data = await readLastPoint(req.params.type)

    if (!data) {
      return res.status(200).json(null)
    }

    const formatData = {
      ...data, // Spreads heartRate, temp, etc.
      currentTime: data._time, // Renames _time to currentTime
      _time: undefined, // (Optional) Removes the original _time key
    }

    return res.status(200).json(formatData)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to fetch data' })
  }
})

router.get('/data/:type/last-day', async (req, res) => {
  try {
    const data = await readLastDayPoints(req.params.type)

    const formatData = data.map((item) => ({
      ...item, // Spreads heartRate, temp, etc.
      currentTime: item._time, // Renames _time to currentTime
      _time: undefined, // (Optional) Removes the original _time key
    }))

    return res.status(200).json(formatData)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to fetch data' })
  }
})

router.put('/data/setting', async (req, res) => {
  try {
    const currentSettings = await readLastPoint('setting')
    const body = req.body
    const newSettings = {
      lightOnHour: body?.lightOnHour || currentSettings?.lightOnHour || 0,
      lightOnMin: body?.lightOnMin || currentSettings?.lightOnMin || 0,
      lightOffHour: body?.lightOffHour || currentSettings?.lightOffHour || 0,
      lightOffMin: body?.lightOffMin || currentSettings?.lightOffMin || 0,
    }

    createPoint('setting', newSettings)

    return res.status(200).json(newSettings)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to edit data' })
  }
})

module.exports = router
