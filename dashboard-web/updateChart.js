const sleepQuality = document.getElementById('sleep-quality-chart');
const heartRate = document.getElementById('heart-rate-chart');
const motion = document.getElementById('motion-chart');
const light = document.getElementById('light-chart');
const sound = document.getElementById('sound-chart');
const humidity = document.getElementById('humidity-chart');
const temperature = document.getElementById('temperature-chart');

// ----------- CONFIG AND HELPERS -----------
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const HOUR_MS = 60 * 60 * 1000; // 1 hour

const standardXAxisConfig = {
  type: 'datetime',
  labels: {
    datetimeUTC: false,
    format: 'HH:mm',
  },
  tickAmount: 6,
};

const standardLineChartConfig = {
  height: 350,
  type: 'line',
  animations: {
    enabled: true,
    easing: 'linear',
    dynamicAnimation: {
      speed: 1000
    }
  }
};

function toMs(ts) { if (typeof ts === 'number') { return ts > 1e12 ? ts : ts * 1000; } return new Date(ts).getTime(); }

function getHourAnchoredWindowIncludeCurrent({ utc = false } = {}) {
  const now = new Date();
  const ceil = new Date(now);
  if (utc) {
    ceil.setUTCMinutes(0, 0, 0);
    if (now.getUTCMinutes() !== 0 || now.getUTCSeconds() !== 0 || now.getUTCMilliseconds() !== 0) {
      ceil.setUTCHours(ceil.getUTCHours() + 1);
    }
  } else {
    ceil.setMinutes(0, 0, 0);
    if (now.getMinutes() !== 0 || now.getSeconds() !== 0 || now.getMilliseconds() !== 0) {
      ceil.setHours(ceil.getHours() + 1);
    }
  }
  const endMs = ceil.getTime();
  return { start: endMs - WINDOW_MS, end: endMs };
}

function filterRange(series, start, end) {
  return series
    .map(p => ({ x: toMs(p.x), y: p.y }))
    .filter(p => Number.isFinite(p.x) && p.x >= start && p.x < end);
}

function applyWindow(chart, start, end) {
  chart.updateOptions({
    xaxis: { ...standardXAxisConfig, min: start, max: end }
  }, false, true);
}

// ----------- Sleep Quality Chart Options -----------
const sleepQualityOptions = {
  chart: {
    type: 'radialBar',
    height: 350,
    animations: {
      enabled: true,
      easing: 'linear',
      dynamicAnimation: {
        speed: 1000
      }
    }
  },
  plotOptions: {
    radialBar: {
      startAngle: -90,
      endAngle: 90,
      hollow: {
        size: '60%',
      },
      track: {
        background: '#f2f2f2',
        strokeWidth: '97%',
        margin: 5, // margin is in pixels
        dropShadow: {
          enabled: false,
        }
      },
      dataLabels: {
        name: {
          show: true,
          fontSize: '16px',
          fontFamily: undefined,
          color: undefined,
          offsetY: -40
        },
        value: {
          show: true,
          fontSize: '24px',
          fontWeight: 600,
          fontFamily: undefined,
          color: undefined,
          offsetY: -20,
          formatter: function (val) {
            return val + '%';
          }
        }
      }
    }
  },
  series: [0],
  labels: ['Low'],
};

// ----------- Heart Rate Chart Options -----------
const heartRateOptions = {
  chart: { ...standardLineChartConfig },
  stroke: {
    curve: 'smooth',
    width: 2
  },
  markers: {
    size: 3
  },
  xaxis: { ...standardXAxisConfig },
  tooltip: {
    x: {
      format: 'HH:mm'
    }
  },
  yaxis: {
    title: {
      text: 'BPM'
    },
    min: 0,
    max: function (max) { return max + 20 }
  },
  title: {
    text: 'Heart Rate',
    align: 'left'
  },
  legend: {
    position: 'top'
  }
};

// ----------- Motion Options -----------
const motionOptions = {
  chart: {
    height: 350,
    type: 'bar',
    animations: {
      enabled: true,
      easing: 'linear',
      dynamicAnimation: {
        speed: 1000
      }
    }
  },
  plotOptions: {
    bar: {
      columnWidth: '80%',
    }
  },
  title: {
    text: 'Motion Count',
    align: 'left'
  },
  xaxis: { ...standardXAxisConfig },
  tooltip: {
    x: {
      format: 'HH:mm'
    }
  },
  yaxis: {
    title: {
      text: 'Count'
    },
    min: 0,
    max: function (max) { return max < 5 ? 5 : max + 2 },
    forceNiceScale: true,
  },
  dataLabels: {
    enabled: false
  },
  series: [],
};

// ----------- Light Options -----------
const lightOptions = {
  chart: { ...standardLineChartConfig },
  stroke: {
    curve: 'smooth',
    width: 2
  },
  markers: {
    size: 3
  },
  xaxis: { ...standardXAxisConfig },
  tooltip: {
    x: {
      format: 'HH:mm'
    }
  },
  yaxis: {
    title: {
      text: 'lux'
    },
    min: 0,
    max: function (max) { return max + 20 },
    forceNiceScale: true,
  },
  title: {
    text: 'Light Intensity',
    align: 'left'
  },
  legend: {
    position: 'top'
  }
};

// ----------- Sound Options -----------
const soundOptions = {
  chart: { ...standardLineChartConfig },
  stroke: {
    curve: 'smooth',
    width: 2
  },
  markers: {
    size: 3
  },
  xaxis: { ...standardXAxisConfig },
  tooltip: {
    x: {
      format: 'HH:mm'
    }
  },
  yaxis: {
    title: {
      text: 'db (A)'
    },
    min: 10,
    max: 30,
    forceNiceScale: true,
  },
  title: {
    text: 'Sound Intensity',
    align: 'left'
  },
  legend: {
    position: 'top'
  }
};

// ----------- Humidity Options -----------
const humidityOptions = {
  chart: { ...standardLineChartConfig },
  stroke: {
    curve: 'smooth',
    width: 2
  },
  markers: {
    size: 3
  },
  xaxis: { ...standardXAxisConfig },
  tooltip: {
    x: {
      format: 'HH:mm'
    }
  },
  yaxis: {
    title: {
      text: '%RH'
    },
    min: 0,
    max: function (max) { return max + 20 },
    forceNiceScale: true,
  },
  title: {
    text: 'Humidity',
    align: 'left'
  },
  legend: {
    position: 'top'
  }
};

// ----------- Temperature Options -----------
const temperatureOptions = {
  chart: { ...standardLineChartConfig },
  stroke: {
    curve: 'smooth',
    width: 2
  },
  markers: {
    size: 3
  },
  xaxis: { ...standardXAxisConfig },
  tooltip: {
    x: {
      format: 'HH:mm'
    }
  },
  yaxis: {
    title: {
      text: '°C'
    },
    min: function (min) { return min < 0 ? min - 5 : 0 },
    max: function (max) { return max + 20 },
    forceNiceScale: true,
  },
  title: {
    text: 'Temperature',
    align: 'left'
  },
  legend: {
    position: 'top'
  }
};

let sleepQualityChart = new ApexCharts(sleepQuality, sleepQualityOptions);
let heartRateChart = new ApexCharts(heartRate, heartRateOptions);
let motionChart = new ApexCharts(motion, motionOptions);
let lightChart = new ApexCharts(light, lightOptions);
let soundChart = new ApexCharts(sound, soundOptions);
let humidChart = new ApexCharts(humidity, humidityOptions);
let tempChart = new ApexCharts(temperature, temperatureOptions);

sleepQualityChart.render();
heartRateChart.render();
motionChart.render();
lightChart.render();
soundChart.render();
humidChart.render();
tempChart.render();

export function updateChart(data) {
  const processedData = data.reduce((acc, element) => {
    // Parse all values safely with defaults
    const timestamp = element.currentTime;
    const heartRate = parseInt(element.heartRate) || 0;
    const motion = element.motion === true || element.motion === 1 ? 1 : 0;
    const light = parseInt(element.light) || 0;
    const sound = parseInt(element.sound) || 0;
    const humidity = parseInt(element.humid) || 0;
    const temperature = parseInt(element.temp) || 0;
    const sleepQuality = element.dataPoint || 0;

    // Add to arrays only if timestamp exists
    if (timestamp) {
      acc.sleepQuality.push(sleepQuality);
      acc.heartRate.push({ x: timestamp, y: heartRate });
      acc.motion.push({ x: timestamp, y: motion });
      acc.light.push({ x: timestamp, y: light });
      acc.sound.push({ x: timestamp, y: sound });
      acc.humidity.push({ x: timestamp, y: humidity });
      acc.temperature.push({ x: timestamp, y: temperature });
    }
    return acc;
  }, {
    sleepQuality: [],
    heartRate: [],
    motion: [],
    light: [],
    sound: [],
    humidity: [],
    temperature: []
  });

  // Set the time window
  const { start, end } = getHourAnchoredWindowIncludeCurrent({ utc: false });

  // Sleep Quality Average
  const sleepScore = Math.round(
    processedData.sleepQuality.reduce((sum, val) => sum + val, 0) /
    Math.max(1, processedData.sleepQuality.length)
  );

  sleepQualityChart.updateSeries([sleepScore]);

  // Set color and label based on score
  let color, label;
  if (sleepScore >= 85) {
    color = ['#22c55e'];
    label = 'Excellent';
  } else if (sleepScore >= 75) {
    color = ['#4ade80'];
    label = 'Good';
  } else if (sleepScore >= 50) {
    color = ['#eab308'];
    label = 'Fair';
  } else {
    color = ['#ef4444'];
    label = 'Poor';
  }

  sleepQualityChart.updateOptions({
    fill: { colors: color },
    labels: [label]
  });

  // Heart Rate
  heartRateChart.updateSeries([{
    name: 'Heart Rate',
    data: filterRange(processedData.heartRate, start, end)
  }]);
  applyWindow(heartRateChart, start, end);

  // Motion
  const motionBuckets = Array.from({ length: 24 }, (_, i) => ({
    x: start + i * HOUR_MS,
    y: 0
  }));

  // Count motion events per hour
  processedData.motion.forEach(item => {
    const x = toMs(item.x);
    if (x >= start && x < end && item.y > 0) {
      const hourIndex = Math.floor((x - start) / HOUR_MS);
      if (hourIndex >= 0 && hourIndex < 24) {
        motionBuckets[hourIndex].y += 1;
      }
    }
  });

  motionChart.updateSeries([{
    name: 'Motion Count',
    data: motionBuckets
  }]);
  applyWindow(motionChart, start, end);

  // Light
  lightChart.updateSeries([{
    name: 'Light',
    data: filterRange(processedData.light, start, end)
  }]);
  applyWindow(lightChart, start, end);

  // Sound
  soundChart.updateSeries([{
    name: 'Sound',
    data: filterRange(processedData.sound, start, end)
  }]);
  applyWindow(soundChart, start, end);

  // Humidity
  humidChart.updateSeries([{
    name: 'Humidity',
    data: filterRange(processedData.humidity, start, end)
  }]);
  applyWindow(humidChart, start, end);

  // Temperature
  tempChart.updateSeries([{
    name: 'Temperature',
    data: filterRange(processedData.temperature, start, end)
  }]);
  applyWindow(tempChart, start, end);
}