function plateauScore(value, { minLow, idealLow, idealHigh, maxHigh }) {
  if (value >= idealLow && value <= idealHigh) {
    return 100
  }
  if (value < idealLow) {
    // rise from 0 at minLow -> 100 at idealLow
    return clamp((100 * (value - minLow)) / (idealLow - minLow))
  }
  // value > idealHigh: fall from 100 at idealHigh -> 0 at maxHigh
  return clamp((100 * (maxHigh - value)) / (maxHigh - idealHigh))
}

const DEFAULT_WEIGHTS = {
  heartRate: 0.2,
  motion: 0.2,
  temp: 0.15,
  humid: 0.1,
  sound: 0.2,
  light: 0.15,
}

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v))

function heartRateScore(bpm) {
  return plateauScore(bpm, {
    minLow: 40,
    idealLow: 45,
    idealHigh: 60,
    maxHigh: 100,
  })
}

function motionScore(motion01) {
  return clamp((1 - motion01) * 100)
}

function temperatureScore(celsius) {
  return plateauScore(celsius, {
    minLow: 20,
    idealLow: 24,
    idealHigh: 28,
    maxHigh: 32,
  })
}

function humidityScore(rh) {
  return plateauScore(rh, {
    minLow: 25,
    idealLow: 40,
    idealHigh: 60,
    maxHigh: 75,
  })
}

function soundScore(dB) {
  if (dB <= 30) {
    return 100
  }
  if (dB >= 70) {
    return 0
  }
  return clamp((100 * (70 - dB)) / 40)
}

function lightScore(light01to100) {
  if (light01to100 <= 30) {
    return 100
  }
  if (light01to100 >= 60) {
    return 0
  }
  return clamp((100 * (60 - light01to100)) / 30)
}

function computeSleepQuality(reading, weights = DEFAULT_WEIGHTS) {
  const subs = {
    heartRate: heartRateScore(reading.heartRate),
    motion: motionScore(reading.motion),
    temp: temperatureScore(reading.temp),
    humid: humidityScore(reading.humid),
    sound: soundScore(reading.sound),
    light: lightScore(reading.light),
  }
  let score =
    subs.heartRate * weights.heartRate +
    subs.motion * weights.motion +
    subs.temp * weights.temp +
    subs.humid * weights.humid +
    subs.sound * weights.sound +
    subs.light * weights.light

  if (reading.heartRate <= 30) {
    score = 0
  }
  return Math.round(score * 100) / 100
}

module.exports = { computeSleepQuality }
