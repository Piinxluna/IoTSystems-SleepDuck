// Primary Variables
const today = new Date();
const todayString = today.toLocaleDateString('en-GB', {
  weekday: 'long',
  day: '2-digit',
  month: 'short',
  year: 'numeric'
});
let heartRate = 0;
let motionCount = 0;
let light = 0;
let sound = 0;
let humidity = 0;
let temperature = 0;

// Modified Variables
let sleepQuality = 'Good'; // Good, Average, Poor
let sleepQualityScore = 0; // 0-100
let lightLevel = 'Low'; // Low, Medium, High
let soundLevel = 'Quiet'; // Quiet, Moderate, Loud

// --- Helpers ---
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function mapRange(x, inMin, inMax, outMin, outMax) {
  const t = (x - inMin) / (inMax - inMin);
  return outMin + clamp(t, 0, 1) * (outMax - outMin);
}

function scoreUpperBound(value, goodMax, badMax) {
  if (value <= goodMax) {
    return 100;
  }
  if (value >= badMax) {
    return 0;
  }
  return mapRange(value, goodMax, badMax, 100, 0);
}

function scoreBand(value, bestLow, bestHigh, zeroLow, zeroHigh) {
  if (value >= bestLow && value <= bestHigh) {
    return 100;
  }
  if (value < bestLow) {
    return mapRange(value, zeroLow, bestLow, 0, 100);
  }
  return mapRange(value, bestHigh, zeroHigh, 100, 0);
}

// --- Scorers ---
function scoreHeartRate(hr) {
  // Good: ~50–65 bpm, Bad: at <35 or >95
  return scoreBand(hr, 50, 65, 35, 95);
}
function scoreMotion(movesPerMin) {
  // Good: <=10, Bad: >=60
  return scoreUpperBound(movesPerMin, 10, 60);
}
function scoreLightLux(lux) {
  // Good: <=30, Bad: >=500
  return scoreUpperBound(lux, 30, 500);
}
function scoreSoundDb(db) {
  // Good: <=30, Bad: >=70
  return scoreUpperBound(db, 30, 70);
}
function scoreHumidity(h) {
  // Good: 40–60%, Bad: <=20 or >=80
  return scoreBand(h, 40, 60, 20, 80);
}
function scoreTemperature(tC) {
  // Good: 24–28°C, Bad: <=15 or >=29
  return scoreBand(tC, 24, 28, 23, 29);
}

// --- Main ---
function updateSleepQuality() {
  const sHR = scoreHeartRate(heartRate);
  const sMove = scoreMotion(motionCount);
  const sLux = scoreLightLux(light);
  const sDb = scoreSoundDb(sound);
  const sHum = scoreHumidity(humidity);
  const sTmp = scoreTemperature(temperature);

  // Weights
  const score =
    sHR * 0.20 +
    sMove * 0.25 +
    sLux * 0.15 +
    sDb * 0.15 +
    sHum * 0.10 +
    sTmp * 0.15;

  if (score >= 75) {
    sleepQuality = 'Good';
  } else if (score >= 50) {
    sleepQuality = 'Average';
  } else {
    sleepQuality = 'Poor';
  }

  sleepQualityScore = Math.round(score);
}

function updateLightLevel() {
  if (light < 100) {
    lightLevel = 'Low';
  } else if (light < 300) {
    lightLevel = 'Medium';
  } else {
    lightLevel = 'High';
  }
}

function updateSoundLevel() {
  if (sound < 30) {
    soundLevel = 'Quiet';
  } else if (sound < 70) {
    soundLevel = 'Moderate';
  } else {
    soundLevel = 'Loud';
  }
}

// Initial updates
updateSleepQuality();
updateLightLevel();
updateSoundLevel();

// Set today's date in the HTML
document.getElementById('today-date').innerText = todayString;

// Function to update all displayed values
function updateDisplay() {
  document.getElementById('sleep-quality-status').innerText = sleepQuality;
  document.getElementById('sleep-quality-score').innerText = sleepQualityScore;
  document.getElementById('heart-rate-data').innerText = `${heartRate}`;
  document.getElementById('motion-data').innerText = `${motionCount}`;
  document.getElementById('light-level').innerText = `${lightLevel}`;
  document.getElementById('light-data').innerText = `(${light} lux)`;
  document.getElementById('sound-level').innerText = `${soundLevel}`;
  document.getElementById('sound-data').innerText = `(${sound} db)`;
  document.getElementById('humidity-data').innerText = `${humidity}`;
  document.getElementById('temperature-data').innerText = `${temperature}`;
}

// Initial display update
updateDisplay();
