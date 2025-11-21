# connect_esp32_ble.py
import asyncio
from bleak import BleakClient, BleakScanner
from datetime import datetime
import json
from pymongo import MongoClient
import statistics
from KY15 import send_humidity, send_temp
from KY18 import send_light
from KY37 import send_sound
import gpiod

# --- BLE Settings ---
DEVICE_NAME = "ESP32S3_BLE"
CHARACTERISTIC_UUID = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

# --- MongoDB Settings ---
MONGO_URI = "mongodb+srv://supawitma:xxxx@iot.rqrjrjk.mongodb.net/?retryWrites=true&w=majority&appName=IOT"
DB_NAME = "iot_database"
COLLECTION_NAME = "sensorData"

# --- Initialize MongoDB ---
mongo_client = MongoClient(MONGO_URI)
db = mongo_client[DB_NAME]
collection = db[COLLECTION_NAME]

# --- Control update interval ---
UPDATE_INTERVAL = 10  # seconds
latest_payload = None   # store last sensor data
last_update_time = 0    # track last DB write time

# --- LED PIN ---
LED_PIN = 5 #GPIO5

# --- Package ---
payload= {}

# --- Data to create average ---
heart_rate = []
motion=[]
humid = []
temp = []
sound = []
light = []

# Set up
chip = gpiod.Chip('gpiochip4')
led_line = chip.get_line(LED_PIN)
led_line.request(consumer="LED", type=gpiod.LINE_REQ_DIR_OUT)

# This code run every 10 seconds
async def push_data(now):
    """Average the last 10 sec of data and push to MongoDB"""
    global heart_rate, motion, humid, temp, sound, light, last_update_time

    payload = {
        "currentTime": now,
        "heartRate": statistics.mean(heart_rate),
        "motion": statistics.mean(motion),
        "humid": statistics.mean(humid),
        "temp": statistics.mean(temp),
        "sound": statistics.mean(sound),
        "light": statistics.mean(light),
        "dataPoint": len(heart_rate)
    }

    result = collection.insert_one(payload)
    last_update_time = datetime.now().timestamp()
    print(f"Data sent to MongoDB! (id: {result.inserted_id})")

    # Reset buffers
    heart_rate.clear()
    motion.clear()
    humid.clear()
    temp.clear()
    sound.clear()
    light.clear()

# This code will trigger while ESP send data
async def notification_handler(sender, data):
    """Called when notification is received from ESP32"""
    text = data.decode()
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    

    # Parse JSON from ESP32
    try:
        sensor_data = json.loads(text)
    except json.JSONDecodeError:
        sensor_data = {}

    print(f"[{now}] Received from ESP32: {sensor_data}")
    # Collect from ESP32
    heart_rate.append(sensor_data["heartRate"])
    motion.append(sensor_data["motion"])

    light.append(send_light())
    humid.append(send_humidity())
    temp.append(send_temp())
    sound.append(send_sound())

    if (sensor_data["heartRate"] == 0 or light[-1] > 60):
        led_line.set_value(1)
    else:
        led_line.set_value(0)

    # Check interval
    current_ts = datetime.now().timestamp()
    if current_ts - last_update_time >= UPDATE_INTERVAL:
        await push_data(now)

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