const lightOnInput = document.getElementById('light-on-time-data')
const lightOffInput = document.getElementById('light-off-time-data')

function timeFormatter(h, m) {
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export function updateSettingData(data) {
  const lightOnTime = timeFormatter(data.lightOnHour || 0, data.lightOnMin || 0)
  const lightOffTime = timeFormatter(
    data.lightOffHour || 0,
    data.lightOffMin || 0
  )

  lightOnInput.value = lightOnTime
  lightOffInput.value = lightOffTime
}
