const sleepQuality = document.getElementById('sleep-quality-chart');
const heartRate = document.getElementById('heart-rate-chart');
const motion = document.getElementById('motion-chart');
const light = document.getElementById('light-chart');
const sound = document.getElementById('sound-chart');
const humidity = document.getElementById('humidity-chart');
const temperature = document.getElementById('temperature-chart');

// ----------- CONFIG AND HELPERS -----------
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
  chart: { ...standardLineChartConfig },
  stroke: {
    curve: 'smooth',
    width: 2
  },
  xaxis: { ...standardXAxisConfig },
  tooltip: {
    x: {
      format: 'HH:mm'
    }
  },
  yaxis: {
    title: {
      text: 'Rate (%)'
    },
    min: 0,
    max: 100
  },
  title: {
    text: 'Motion Rate',
    align: 'left'
  },
  legend: {
    position: 'top'
  }
};

// ----------- Light Options -----------
const lightOptions = {
  chart: { ...standardLineChartConfig },
  stroke: {
    curve: 'smooth',
    width: 2
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
    min: 0,
    max: function (max) { return max + 10 },
    forceNiceScale: false,
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
    const motion = parseInt(element.motion * 100);
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
    data: processedData.heartRate
  }]);

  // Motion
  motionChart.updateSeries([{
    name: 'Motion Count',
    data: processedData.motion
  }]);

  // Light
  lightChart.updateSeries([{
    name: 'Light',
    data: processedData.light
  }]);

  // Sound
  soundChart.updateSeries([{
    name: 'Sound',
    data: processedData.sound
  }]);

  // Humidity
  humidChart.updateSeries([{
    name: 'Humidity',
    data: processedData.humidity
  }]);

  // Temperature
  tempChart.updateSeries([{
    name: 'Temperature',
    data: processedData.temperature
  }]);
}