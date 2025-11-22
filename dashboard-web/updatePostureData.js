export function updatePostureData(data) {
  document.getElementById('posture-data').innerText =
    data.posture || 'Not Detected'
}
