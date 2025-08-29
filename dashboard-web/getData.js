import { updateData } from './updateData.js';
import { updateChart } from './updateChart.js';

async function getData() {
  const url = "https://iot-systems-sleep-duck.vercel.app/data";
  try {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("Data fetched successfully:", result);
    updateData(result)
    updateChart(result)
  } catch (error) {
    console.error(error.message);
  }
}

// Start the loop to constantly fetch data
async function loop() {
  try {
    getData()
  } finally {
    setTimeout(loop, 1000);
  }
}

loop();
