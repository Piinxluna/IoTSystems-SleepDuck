const lightOnInput = document.getElementById('light-on-time-data')
const lightOffInput = document.getElementById('light-off-time-data')

const backendUrl = `https://iotsystems-sleepduck-backend.onrender.com`

lightOnInput.addEventListener('change', () => {
  const [hour, minute] = lightOnInput.value.split(':').map(Number)
  fetch(`${backendUrl}/data/setting`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lightOnHour: hour,
      lightOnMin: minute,
    }),
  })
})

lightOffInput.addEventListener('change', () => {
  const [hour, minute] = lightOffInput.value.split(':').map(Number)
  fetch(`${backendUrl}/data/setting`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lightOffHour: hour,
      lightOffMin: minute,
    }),
  })
})
