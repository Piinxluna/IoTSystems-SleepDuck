import ssl
import time
import json
from paho.mqtt import client as mqtt

HOST = 'c76b85d58e0e44ba8648926ca9ec2569.s1.eu.hivemq.cloud'
PORT = 8883
USERNAME = 'IoTProject'
PASSWORD = 'S1eep1ngDuck'
TOPIC = "setting"

# callbacks for debugging
def on_connect(client, userdata, flags, rc):
    print("on_connect rc =", rc)           # 0 means success
    if rc == 0:
        print("Connected OK")
    else:
        print("Failed to connect, code:", rc)

def on_publish(client, userdata, mid):
    print("on_publish mid =", mid)

def on_log(client, userdata, level, buf):
    print("LOG:", buf)

# Create client
client = mqtt.Client()

client.on_connect = on_connect
client.on_publish = on_publish
client.on_log = on_log  # comment out if too verbose

# Auth
client.username_pw_set(USERNAME, PASSWORD)

# TLS — for production use client.tls_set(ca_certs="path_to_ca.pem")
client.tls_set(cert_reqs=ssl.CERT_NONE)
client.tls_insecure_set(True)

# Start network loop (required to actually send packets)
client.loop_start()

# Connect (blocking)
rc = client.connect(HOST, PORT, keepalive=60)
print("connect() returned:", rc)

# Wait for on_connect to run
time.sleep(1)

payload = {
    "lightOnHour": 11,
    "lightOnMin": 50,
    "lightOffHour": 11,
    "lightOffMin": 00
}
payload_str = json.dumps(payload)

# Publish and wait until it's sent
info = client.publish(TOPIC, payload_str, qos=0)
info.wait_for_publish()   # blocks until message is sent (or failed)
print("publish returned rc:", info.rc, "mid:", info.mid)

# Give a small delay to let callbacks print then clean disconnect
time.sleep(0.5)
client.loop_stop()   # stop network loop
client.disconnect()
print("Finished")
