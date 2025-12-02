# subscriber.py
import os
import ssl
import json
import signal
import threading
from dotenv import load_dotenv
import paho.mqtt.client as mqtt

load_dotenv()

HOST = os.getenv("MQTT_HOST", "your-broker.example")
PORT = int(os.getenv("MQTT_PORT", "8883"))
USERNAME = os.getenv("MQTT_USERNAME", "")
PASSWORD = os.getenv("MQTT_PASSWORD", "")
TOPIC = os.getenv("MQTT_TOPIC", "setting")

# ---- Callbacks ----
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"MQTT connected (rc={rc})")
        client.subscribe(TOPIC)
        print("Subscribed to:", TOPIC)
    else:
        print(f"MQTT connect failed with rc={rc}")

def on_message(client, userdata, msg):
    try:
        payload = msg.payload.decode("utf-8")
        print(f"[{msg.topic}] {payload}")
        # optionally parse JSON:
        # data = json.loads(payload)
    except Exception as e:
        print("Failed to decode message:", e)

def on_disconnect(client, userdata, rc):
    print("MQTT disconnected, rc=", rc)

# ---- Setup client ----
client = mqtt.Client()

# set auth if provided
if USERNAME:
    client.username_pw_set(USERNAME, PASSWORD)

# TLS for port 8883. For production, provide a CA file:
# client.tls_set(ca_certs="/path/to/ca.pem")
# For testing with self-signed certs you can disable cert checking (not recommended for prod)
client.tls_set(cert_reqs=ssl.CERT_NONE)
client.tls_insecure_set(True)

client.on_connect = on_connect
client.on_message = on_message
client.on_disconnect = on_disconnect

# ---- Connect & loop (clean shutdown) ----
def run():
    try:
        client.connect(HOST, PORT, keepalive=60)
    except Exception as e:
        print("Failed to connect:", e)
        return

    # Blocking loop; use loop_start() if you need concurrency
    try:
        client.loop_forever()
    except KeyboardInterrupt:
        print("Interrupted by user, shutting down...")
        client.disconnect()

if __name__ == "__main__":
    run()
