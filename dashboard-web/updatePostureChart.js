const posture = document.getElementById('posture-chart')

// ----------- CONFIG AND HELPERS -----------
const standardXAxisConfig = {
  type: 'datetime',
  labels: {
    datetimeUTC: false,
    format: 'HH:mm',
  },
  tickAmount: 6,
}

const postureTypes = {
  Unknown: '#a7a7a7',
  'Prone (Face Down)': '#ff4400',
  'Right Side': '#ffaa00',
  'Left Side': '#bbff00',
  'Supine (Face Up)': '#00ff66',
}
const postureLabels = Object.keys(postureTypes)

// ----------- Posture Chart Options -----------
const postureOptions = {
  chart: {
    height: 150,
    type: 'scatter',
    zoom: {
      type: 'xy',
    },
    animations: {
      enabled: true,
      easing: 'linear',
      dynamicAnimation: {
        speed: 1000,
      },
    },
  },
  dataLabels: {
    enabled: false,
  },
  grid: {
    show: true,
    yaxis: {
      lines: { show: true },
    },
  },
  xaxis: { ...standardXAxisConfig },
  yaxis: {
    show: false,
    min: 0,
    max: 2,
  },
  title: {
    text: 'Posture Over Time',
    align: 'left',
  },
  legend: { show: true, position: 'top' },
  markers: {
    size: 10, // Adjust size of the dots
    strokeWidth: 0, // No border looks cleaner for this style
    shape: 'circle',
  },
  colors: postureLabels.map((label) => postureTypes[label]),
  tooltip: {
    x: {
      format: 'HH:mm',
    },
    custom: function ({ series, seriesIndex, dataPointIndex, w }) {
      const color = w.config.colors[seriesIndex]
      const label = w.config.series[seriesIndex].name

      // Simple custom HTML for the tooltip
      return `<div style="padding: 6px 10px; background: ${color}; color: ${
        label === 'Unknown' || label === 'Prone (Face Down)' ? 'white' : 'black'
      };">
          <span>${label}</span>
        </div>`
    },
  },

  // Initialize empty series
  series: postureLabels.map((label) => ({ name: label, data: [] })),
}

let postureChart = new ApexCharts(posture, postureOptions)
postureChart.render()

export function updatePostureChart(data) {
  const sortedData = {}
  postureLabels.forEach((label) => (sortedData[label] = []))

  data.forEach((row) => {
    const postureName =
      row.posture && postureTypes[row.posture] ? row.posture : 'Unknown'

    sortedData[postureName].push({
      x: new Date(row.currentTime).getTime(),
      y: 1,
    })
  })

  const newSeries = postureLabels.map((label) => ({
    name: label,
    data: sortedData[label],
  }))

  postureChart.updateSeries(newSeries)
}
