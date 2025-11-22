import os
import ssl
import json
import time
import threading
from datetime import datetime
from dotenv import load_dotenv
import paho.mqtt.client as mqtt
from gpiozero import AngularServo
from time import sleep

# -----------------------------
# Load .env file
# -----------------------------
load_dotenv()
HOST = os.getenv("MQTT_HOST", "your-broker.example")
PORT = int(os.getenv("MQTT_PORT", "8883"))
USERNAME = os.getenv("MQTT_USERNAME", "")
PASSWORD = os.getenv("MQTT_PASSWORD", "")
TOPIC = "setting"

# -----------------------------
# Globals for settings
# -----------------------------
# stored as minutes after midnight, or None if not configured
settings_lock = threading.Lock()
current_setting = {
    "lightOnMin": None,   # minutes after midnight
    "lightOffMin": None
}

# -----------------------------
# Servo setup
# -----------------------------
servo = AngularServo(18, min_pulse_width=0.0006, max_pulse_width=0.0023)
_last_angle = None
_DEADBAND_DEG = 3

def set_servo_angle(angle):
    global _last_angle
    if _last_angle is None or abs(angle - _last_angle) >= _DEADBAND_DEG:
        try:
            servo.angle = angle
            _last_angle = angle
            # give servo time to move and settle
            sleep(0.3)
        except Exception as e:
            print("Servo set angle error:", e)

def turn_on():
    set_servo_angle(60)
    set_servo_angle(0)

def turn_off():
    set_servo_angle(-60)
    set_servo_angle(0)

# -----------------------------
# Helper functions
# -----------------------------
def hm_to_minutes(h, m):
    return (int(h) % 24) * 60 + int(m) % 60

def is_light_on_now(now_min, on_min, off_min):
    """Return True if light should be ON at now_min (minutes since midnight).
       Handles both normal and overnight ranges."""
    if on_min is None or off_min is None:
        return False
    if on_min <= off_min:
        # e.g., on 08:00 (480) to off 20:00 (1200)
        return on_min <= now_min < off_min
    else:
        # overnight, e.g., on 22:00 (1320) to off 06:00 (360)
        return now_min >= on_min or now_min < off_min

# -----------------------------
# MQTT callbacks
# -----------------------------
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"MQTT connected (rc={rc})")
        client.subscribe(TOPIC)
        print("Subscribed to:", TOPIC)
    else:
        print(f"MQTT connect failed with rc={rc}")

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

        on_min = hm_to_minutes(oh, om)
        off_min = hm_to_minutes(fh, fm)

        with settings_lock:
            current_setting["lightOnMin"] = on_min
            current_setting["lightOffMin"] = off_min

        print(f"Updated schedule: ON at {int(oh):02d}:{int(om):02d} ({on_min}), "
              f"OFF at {int(fh):02d}:{int(fm):02d} ({off_min})")
    except Exception as e:
        print("Error processing settings:", e)

def on_disconnect(client, userdata, rc):
    print("MQTT disconnected, rc=", rc)

# -----------------------------
# MQTT client setup
# -----------------------------
client = mqtt.Client()
if USERNAME:
    client.username_pw_set(USERNAME, PASSWORD)

# For production, replace with client.tls_set(ca_certs="/path/to/ca.pem")
client.tls_set(cert_reqs=ssl.CERT_NONE)
client.tls_insecure_set(True)

client.on_connect = on_connect
client.on_message = on_message
client.on_disconnect = on_disconnect

# -----------------------------
# Control light loop
# -----------------------------
def control_light_loop():
    # Connect and run MQTT background loop
    try:
        client.connect(HOST, PORT, keepalive=60)
    except Exception as e:
        print("Failed to connect to MQTT broker:", e)
        return

    client.loop_start()
    print("MQTT loop started, entering control loop...")

    last_state = None  # None=unknown, True=on, False=off

    try:
        while True:
            now = datetime.now()
            now_min = now.hour * 60 + now.minute
            
            print(f"now min: {now_min}")

            with settings_lock:
                on_min = current_setting["lightOnMin"]
                off_min = current_setting["lightOffMin"]

            should_be_on = is_light_on_now(now_min, on_min, off_min)

            # Only actuate if state changed
            if last_state is None:
                # first iteration: set according to should_be_on
                if should_be_on:
                    turn_on()
                else:
                    turn_off()
                last_state = should_be_on
            elif should_be_on != last_state:
                if should_be_on:
                    turn_on()
                else:
                    turn_off()
                last_state = should_be_on

            # sleep granularity: check every second
            time.sleep(1)
    except KeyboardInterrupt:
        print("Control loop interrupted by user.")
    finally:
        client.loop_stop()
        client.disconnect()
        print("Shutdown complete.")

if __name__ == "__main__":
    control_light_loop()