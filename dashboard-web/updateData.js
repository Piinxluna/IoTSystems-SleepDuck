export function updateData(data) {
  // Update display
  const { heartRate, humid, brightness, motion, sound, temp } = data

  const brightnessLevel = getBrightnessLevel(data.brightness)
  const soundLevel = getSoundLevel(data.sound)

  document.getElementById('heart-rate-data').innerText = `${round(heartRate)}`
  document.getElementById('motion-data').innerText = `${
    motion != 0 ? 'Detected' : 'Not Detected'
  }`
  document.getElementById('brightness-level').innerText = `${brightnessLevel}`
  document.getElementById('brightness-data').innerText = `(${round(
    brightness
  )} points)`
  document.getElementById('sound-level').innerText = `${soundLevel}`
  document.getElementById('sound-data').innerText = `(${round(sound)} points)`
  document.getElementById('humidity-data').innerText = `${round(humid)}`
  document.getElementById('temperature-data').innerText = `${round(temp, 1)}`

  // Update status indicators
  const esp32StatusIndicator = document.getElementById('esp32-status-indicator')
  const esp32StatusText = document.getElementById('esp32-status')
  const raspberryPi5StatusIndicator = document.getElementById(
    'raspberry-pi-5-status-indicator'
  )
  const raspberryPi5StatusText = document.getElementById(
    'raspberry-pi-5-status'
  )

  const currentTime = new Date()
  const dataTime = new Date(data.currentTime)
  const timeDiff = (currentTime - dataTime) / 1000 // in seconds

  if (timeDiff > 30) {
    esp32StatusText.innerText = 'Offline'
    esp32StatusIndicator.className = 'h-3 w-3 bg-red-500 rounded-full'
    raspberryPi5StatusText.innerText = 'Offline'
    raspberryPi5StatusIndicator.className = 'h-3 w-3 bg-red-500 rounded-full'
  } else {
    esp32StatusText.innerText = 'Online'
    esp32StatusIndicator.className = 'h-3 w-3 bg-green-500 rounded-full'
    raspberryPi5StatusText.innerText = 'Online'
    raspberryPi5StatusIndicator.className = 'h-3 w-3 bg-green-500 rounded-full'
  }
}

// Utils
function getBrightnessLevel(brightness) {
  return brightness < 30 ? 'Low' : brightness < 60 ? 'Medium' : 'High'
}

function getSoundLevel(sound) {
  return sound < 30 ? 'Quiet' : sound < 70 ? 'Moderate' : 'Loud'
}

function round(num, decimalPlaces) {
  if (!decimalPlaces) {
    decimalPlaces = 0
  }

  return (
    Math.round(num * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces)
  )
}
