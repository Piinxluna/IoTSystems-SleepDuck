export function updateData(data) {
  // Update dependent values
  // updateSleepQuality();
  // updateLightLevel();
  // updateSoundLevel();

  // Update display
  updateDisplay(data);
}

// Utils
function updateDisplay(data) {
  const {
    currentTime,
    dataPoint,
    heartRate,
    humid,
    light,
    motion,
    sound,
    temp
  } = data;

  const lightLevel = light < 100 ? 'Low' : light < 300 ? 'Medium' : 'High';
  const soundLevel = sound < 30 ? 'Quiet' : sound < 70 ? 'Moderate' : 'Loud';

  document.getElementById('heart-rate-data').innerText = `${heartRate}`;
  document.getElementById('motion-data').innerText = `${motion}`;
  document.getElementById('light-level').innerText = `${lightLevel}`;
  document.getElementById('light-data').innerText = `(${light} lux)`;
  document.getElementById('sound-level').innerText = `${soundLevel}`;
  document.getElementById('sound-data').innerText = `(${sound} db)`;
  document.getElementById('humidity-data').innerText = `${humid}`;
  document.getElementById('temperature-data').innerText = `${temp}`;
}
