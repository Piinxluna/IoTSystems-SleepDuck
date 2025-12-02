import asyncio
from bleak import BleakClient, BleakScanner
from datetime import datetime
import json
import statistics
from KY15 import send_humidity, send_temp
from KY18 import send_brightness
from KY37 import send_sound
from servo import turn_on as turn_on_light, turn_off as turn_off_light, set_up_servo
from camera import send_pose
from dotenv import load_dotenv
import gpiod
import paho.mqtt.client as mqtt
import ssl
import time
import os
import threading
import signal
import sys

stop_event = threading.Event()

def _signal_handler(sig, frame):
    print(f"\nSignal {sig} received. Requesting shutdown...")
    stop_event.set()

signal.signal(signal.SIGINT, _signal_handler)
signal.signal(signal.SIGTERM, _signal_handler)

# --- Load .env file ---
load_dotenv()
HOST = os.getenv("MQTT_HOST")
PORT = int(os.getenv("MQTT_PORT", "8883"))
USERNAME = os.getenv("MQTT_USERNAME")
PASSWORD = os.getenv("MQTT_PASSWORD")

# --- setup MQTT (rename to mqtt_client to avoid shadowing) ---
def on_connect(mqtt_client, userdata, flags, rc):
    print("    MQTT on_connect rc =", rc)
    if rc == 0:
        topic = "setting" 
        mqtt_client.subscribe(topic)
        print(f"    Subscribed to topic: {topic}")
        print("    MQTT connected OK")
    else:
        print("    MQTT connect failed, code:", rc)

def on_message(client, userdata, msg):
    payload_raw = msg.payload.decode("utf-8", errors="ignore")
    print(f"[{msg.topic}] {payload_raw}")
    try:
        data = json.loads(payload_raw)
    except Exception as e:
        print("Invalid JSON payload:", e)
        return

    # Accept either numeric fields or strings; tolerate different key names
    # Expected keys: lightOnHour, lightOnMin, lightOffHour, lightOffMin
    try:
        oh = data.get("lightOnHour")
        om = data.get("lightOnMin")
        fh = data.get("lightOffHour")
        fm = data.get("lightOffMin")
        
        print(f"light on: {oh}, {om}")
        print(f"light off: {fh}, {fm}")

        # if any are missing, ignore update
        if oh is None or om is None or fh is None or fm is None:
            print("Incomplete setting payload; expected all four fields.")
            return

        set_on_off_light_time(oh, om, fh, fm)
    except Exception as e:
        print("Error processing settings:", e)

def on_publish(mqtt_client, userdata, mid):
    print("    MQTT on_publish mid =", mid)

def on_log(mqtt_client, userdata, level, buf):
    print("    MQTT LOG:", buf)

mqtt_client = mqtt.Client()
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message
mqtt_client.on_publish = on_publish
mqtt_client.on_log = on_log

if USERNAME:
    mqtt_client.username_pw_set(USERNAME, PASSWORD)
mqtt_client.tls_set(cert_reqs=ssl.CERT_NONE)
mqtt_client.tls_insecure_set(True)

try:
    rc = mqtt_client.connect(HOST, PORT, keepalive=60)
    print("MQTT connect rc (sync) =", rc)
    mqtt_client.loop_start()
except Exception as e:
    print("Failed to connect/start MQTT:", e)
    # You may want to retry with backoff in production

time.sleep(1)                                   # Wait for on_connect to run

# --- BLE Settings ---
DEVICE_NAME = "ESP32S3_BLE"
CHARACTERISTIC_UUID = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

# --- Control update interval ---
UPDATE_INTERVAL = 10    # seconds
latest_payload = None   # store last sensor data
last_update_time = 0    # track last DB write time

# --- LED PIN ---
LED_PIN = 5 #GPIO5

# --- Package ---
sensorPayload = {}
posturePayload = {}

# --- Data to create average ---
heart_rate = []
motion = []
humid = []
temp = []
sound = []
brightness = []
light = False
posture = []

# --- Setting Data ---
turn_on_light_time = 0
turn_off_light_time = 0

def hm_to_minutes(h, m):
    return (int(h) % 24) * 60 + int(m) % 60

def set_on_off_light_time(oh, om, fh, fm):
    global turn_on_light_time, turn_off_light_time
    turn_on_light_time = hm_to_minutes(oh, om)
    turn_off_light_time = hm_to_minutes(fh, fm)

    print(f"Updated schedule: ON at {int(oh):02d}:{int(om):02d} ({turn_on_light_time}), "
          f"OFF at {int(fh):02d}:{int(fm):02d} ({turn_off_light_time})")

def check_light_ideal_state(current_time):
    if turn_on_light_time is None or turn_off_light_time is None:
        return False
    if turn_on_light_time <= turn_off_light_time:
        # e.g., on 08:00 (480) to off 20:00 (1200)
        return turn_on_light_time <= current_time < turn_off_light_time
    else:
        # overnight, e.g., on 22:00 (1320) to off 06:00 (360)
        return current_time >= turn_on_light_time or current_time < turn_off_light_time
    
# Set up
chip = gpiod.Chip('gpiochip4')
led_line = chip.get_line(LED_PIN)
led_line.request(consumer="LED", type=gpiod.LINE_REQ_DIR_OUT)

def safe_mean(lst, default=0):
    try:
        return statistics.mean(lst) if lst else default
    except Exception:
        return default

def safe_mode(lst, default=None):
    lst = list(filter(lambda x: x != "Unknown", lst))
    try:
        return statistics.mode(lst) if lst else default
    except Exception:
        return lst[-1] if lst else default

# This code run every 10 seconds
async def push_data(now):
    print("=======================================================")
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{now}] Pushing data to MQTT broker...")
    """Push data to MQTT broker."""
    global heart_rate, motion, humid, temp, sound, brightness, light, posture, last_update_time

    sensor_obj = {
        "heartRate": safe_mean(heart_rate, 0),
        "motion": safe_mean(motion, 0),
        "humid": safe_mean(humid, 0),
        "temp": safe_mean(temp, 0),
        "sound": safe_mean(sound, 0),
        "brightness": safe_mean(brightness, 0),
        "light": light or False
    }

    posture_obj = {"posture": safe_mode(posture, "Unknown")}
    
    sensorPayload = json.dumps(sensor_obj)
    posturePayload = json.dumps(posture_obj)

    try:
        info1 = mqtt_client.publish("sensor", sensorPayload, qos=0)
        info2 = mqtt_client.publish("posture", posturePayload, qos=0)
        print(f"    Published sensor: {sensorPayload}, mid={getattr(info1, 'mid', None)}, rc={getattr(info1, 'rc', None)}")
        print(f"    Published posture: {posturePayload}, mid={getattr(info2, 'mid', None)}, rc={getattr(info2, 'rc', None)}")
    except Exception as e:
        print("MQTT publish failed:", e)
    
    last_update_time = datetime.now().timestamp()

    # reset buffers
    heart_rate.clear()
    motion.clear()
    humid.clear()
    temp.clear()
    sound.clear()
    brightness.clear()
    light = light
    posture.clear()

# This code will trigger while ESP send data
async def notification_handler(sender, data):
    """Called when notification is received from ESP32."""
    print("=======================================================")
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{now}] Dumping data ...")
    global heart_rate, motion, humid, temp, sound, brightness, light, posture, last_update_time

    try:
        text = data.decode()
    except Exception:
        text = None
    
    # Parse JSON from ESP32
    sensor_data = {}
    if text:
        try:
            sensor_data = json.loads(text)
        except Exception:
            print(f"Error : [{now}] Received non-JSON payload: {text}")
   
    # Collect from ESP32
    heart_rate.append(sensor_data["heartRate"])
    motion.append(sensor_data["motion"])

    # Collect from Raspberry PI5
    brightness.append(send_brightness())
    humid.append(send_humidity())
    temp.append(send_temp())
    sound.append(send_sound())

    # Try to collect data from camera
    try:
        posture_val = send_pose()
        posture.append(str(posture_val))
    except Exception:
        posture.append("Unknown")

    # Handle the heartrate for led sensor data
    if (sensor_data["heartRate"] == 0 or brightness[-1] > 60):
        led_line.set_value(1)
    else:
        led_line.set_value(0)

    # Set light survo on/off based on time
    current_hour = datetime.now().hour
    current_minute = datetime.now().minute
    current_time = hm_to_minutes(current_hour, current_minute)
    current_light_ideal_state = check_light_ideal_state(current_time)

    print(current_light_ideal_state, light)
    if current_light_ideal_state != light:
        if current_light_ideal_state:
            turn_on_light()
            light = True
        else:
            turn_off_light()
            light = False

    # LOG EVERY DATA FROM SENSOR
    print(f"    Received from ESP32: {sensor_data}")
    print(f"    Received from RaspberryPI: brightness: {str(brightness[-1])} humid: {str(humid[-1])} temp: {str(temp[-1])}  sound: {str(sound[-1])} light: {str(light)} posture: {str(posture[-1])}")

    # Check interval to push update the data
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
    
    async with BleakClient(esp32_address) as ble_client:
        connected = ble_client.is_connected
        if connected:
            print("Connected!")
            await ble_client.start_notify(CHARACTERISTIC_UUID, notification_handler)
            print("Listening for notifications... Press Ctrl+C to exit")
            try:
                while not stop_event.is_set():
                    await asyncio.sleep(1)
            except asyncio.CancelledError:
                pass
        else:
            print("BLE connection failed (is_connected is False)")

if __name__ == "__main__":
    set_up_servo()
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Exiting on user interrupt")
        stop_event.set()
    finally:
        try:
            mqtt_client.loop_stop()
            mqtt_client.disconnect()
        except Exception:
            pass
        try:
            if led_line:
                led_line.set_value(0)
                led_line.release()
        except:
            pass
        print("Shutdown complete")
        sys.exit(0)
