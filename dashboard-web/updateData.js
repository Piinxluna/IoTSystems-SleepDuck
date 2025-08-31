export function updateData(data) {
  // Update dependent values
  // updateSleepQuality();
  // updateLightLevel();
  // updateSoundLevel();

  // Update display
  const { heartRate, humid, light, motion, sound, temp } = data

  const lightLevel = getLightLevel(data.light)
  const soundLevel = getSoundLevel(data.sound)

  document.getElementById('heart-rate-data').innerText = `${round(heartRate)}`
  document.getElementById('motion-data').innerText = `${
    motion != 0 ? 'Detected' : 'Not Detected'
  }`
  document.getElementById('light-level').innerText = `${lightLevel}`
  document.getElementById('light-data').innerText = `(${round(light)} lux)`
  document.getElementById('sound-level').innerText = `${soundLevel}`
  document.getElementById('sound-data').innerText = `(${round(sound)} db)`
  document.getElementById('humidity-data').innerText = `${round(humid)}`
  document.getElementById('temperature-data').innerText = `${round(temp, 1)}`
}

// Utils
function getLightLevel(light) {
  return light < 30 ? 'Low' : light < 60 ? 'Medium' : 'High'
}

function getSoundLevel(sound) {
  return sound < 30 ? 'Quiet' : sound < 70 ? 'Moderate' : 'Loud'
}

function round(num, decimalPlaces) {
  if (!decimalPlaces) {
    decimalPlaces = 0;
  }

  return (
    Math.round(num * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces)
  )
}
