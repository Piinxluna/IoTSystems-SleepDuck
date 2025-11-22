require('dotenv').config()
const { InfluxDB, Point } = require('@influxdata/influxdb-client')
const { computeSleepQuality } = require('./utils')

// config
const token = process.env.INFLUX_TOKEN
const org = process.env.INFLUX_ORG
const bucket = process.env.INFLUX_BUCKET
const url = process.env.INFLUX_URL

// create function
console.log('⚙️ connecting to InfluxDB')
const influxDB = new InfluxDB({
  url,
  token,
})
const deviceId = 'prototype_device'
const writeApi = influxDB.getWriteApi(org, bucket)
const queryApi = influxDB.getQueryApi(org)

// UTILS
const createPoint = async (type, data) => {
  let point

  switch (type) {
    case 'sensor':
      const quality = computeSleepQuality(data)

      point = new Point('sensor')
        .tag('deviceId', deviceId)
        .intField('heartRate', data.heartRate)
        .booleanField('motion', data.motion)
        .intField('humid', data.humid)
        .intField('temp', data.temp)
        .intField('sound', data.sound)
        .intField('brightness', data.brightness)
        .booleanField('light', data.light)
        .intField('dataPoint', quality)
      break

    case 'posture':
      point = new Point('posture')
        .tag('deviceId', deviceId)
        .stringField('posture', data.posture)
      break

    case 'setting':
      point = new Point('setting')
        .tag('deviceId', deviceId)
        .intField('lightOnHour', data.lightOnHour)
        .intField('lightOnMin', data.lightOnMin)
        .intField('lightOffHour', data.lightOffHour)
        .intField('lightOffMin', data.lightOffMin)
      break

    default:
      return null
  }

  if (!point) {
    return { error: 'unknown data type' }
  }

  writeApi.writePoint(point)
  const response = await writeApi.flush()
  return response
}

const readLastPoint = async (type) => {
  const fluxQuery = `
    from(bucket: "${process.env.INFLUX_BUCKET}")
      |> range(start: -24h) 
      |> filter(fn: (r) => r["_measurement"] == "${type}")
      |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> sort(columns: ["_time"], desc: true)
      |> limit(n: 1)
  `

  try {
    const rawData = await queryApi.collectRows(fluxQuery)

    // Clean up the data
    const cleanData = rawData.map((row) => {
      const { result, table, _start, _stop, _measurement, ...rest } = row
      return rest
    })

    return cleanData[0] || null
  } catch (error) {
    return { error: error.message }
  }
}

const readLastDayPoints = async (type) => {
  const fluxQuery = `
    from(bucket: "${process.env.INFLUX_BUCKET}")
      |> range(start: -24h)
      |> filter(fn: (r) => r["_measurement"] == "${type}")
      |> filter(fn: (r) => r["deviceId"] == "${deviceId}")
      |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> sort(columns: ["_time"], desc: false)
  `

  try {
    const rawData = await queryApi.collectRows(fluxQuery)

    const cleanData = rawData.map((row) => {
      const { result, table, _start, _stop, _measurement, ...rest } = row
      return rest
    })

    return cleanData
  } catch (error) {
    return { error: error.message }
  }
}

module.exports = {
  createPoint,
  readLastPoint,
  readLastDayPoints,
}
