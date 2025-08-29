const options = {
  chart: {
    height: 350,
    type: 'bar',
  },
  dataLabels: {
    enabled: false
  },
  series: [],
  title: {
    text: 'Ajax Example',
  },
  noData: {
    text: 'Loading...'
  }
}

let sleepQualityChart = new ApexCharts(document.getElementById('chart-gauge'), options);
let heartRateChart = new ApexCharts(document.getElementById('heart-rate-chart'), options);
let motionChart = new ApexCharts(document.getElementById('motion-chart'), options);
let lightChart = new ApexCharts(document.getElementById('light-chart'), options);
let soundChart = new ApexCharts(document.getElementById('sound-chart'), options);
let humidChart = new ApexCharts(document.getElementById('humidity-chart'), options);
let tempChart = new ApexCharts(document.getElementById('temperature-chart'), options);

sleepQualityChart.render();
heartRateChart.render();
motionChart.render();
lightChart.render();
soundChart.render();
humidChart.render();
tempChart.render();

export function updateChart(data) {
  let heartRate = []
  let motion = []
  let light = []
  let sound = []
  let humid = []
  let temp = []

  data.forEach(element => {
    heartRate.push({ x: element.currentTime, y: element.heartRate })
    motion.push({ x: element.currentTime, y: element.motion })
    light.push({ x: element.currentTime, y: element.light })
    sound.push({ x: element.currentTime, y: element.sound })
    humid.push({ x: element.currentTime, y: element.humid })
    temp.push({ x: element.currentTime, y: element.temp })
  });

  sleepQualityChart.updateSeries([{
    name: 'SQ Chart',
    data: [{
      "x": 1996,
      "y": 322
    },
    {
      "x": 1997,
      "y": 324
    }]
  }])

  heartRateChart.updateSeries([{
    name: 'Heart rate',
    data: heartRate
  }]);

  motionChart.updateSeries([{
    name: 'Motion',
    data: motion
  }]);

  lightChart.updateSeries([{
    name: 'Light',
    data: light
  }]);

  soundChart.updateSeries([{
    name: 'Sound',
    data: sound
  }]);

  humidChart.updateSeries([{
    name: 'Humidity',
    data: humid
  }]);

  tempChart.updateSeries([{
    name: 'Temperature',
    data: temp
  }]);
}