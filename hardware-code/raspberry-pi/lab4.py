# connect_esp32_ble.py
import asyncio
from bleak import BleakClient, BleakScanner
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, db
import json

# --- BLE Settings ---
DEVICE_NAME = "ESP32S3_BLE"
CHARACTERISTIC_UUID = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

# --- Firebase Setting ---
SERVICE_ACCOUNT_PATH = "Firebase/serviceAccountKey.json"
DATABASE_URL = "https://iotsystems-miniproject-default-rtdb.asia-southeast1.firebasedatabase.app/"

# Initialize Firebase
cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
firebase_admin.initialize_app(cred, {
    'databaseURL': DATABASE_URL
})
ref = db.reference("/sensorData")

async def notification_handler(sender, data):
    """Called when notification is received from ESP32"""
    text = data.decode()
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{now}] Received: {text}")

    # Prepare payload
    try:
        sensor_data = json.loads(text)
    except json.JSONDecodeError:
        sensor_data = {"raw": text}

    payload = {
        "currentTime": now,
        **sensor_data
    }

    # Push to Firebase
    ref.push(payload)
    print("Data sent to Firebase!")

async def main():
    # Scan for the device
    devices = await BleakScanner.discover()
    esp32_address = None
    for d in devices:
        if d.name == DEVICE_NAME:
            esp32_address = d.address
            break

    if esp32_address is None:
        print("ESP32 device not found!")
        return

    print(f"Connecting to {DEVICE_NAME} ({esp32_address})...")

    async with BleakClient(esp32_address) as client:
        if client.is_connected:
            print("Connected!")
            await client.start_notify(CHARACTERISTIC_UUID, notification_handler)

            # Keep listening for notifications
            print("Listening for notifications... Press Ctrl+C to exit")
            while True:
                await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(main())