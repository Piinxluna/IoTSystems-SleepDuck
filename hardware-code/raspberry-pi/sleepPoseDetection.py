# camera_test_stream.py
import cv2
import mediapipe as mp
from picamera2 import Picamera2
import time
import math
from dotenv import load_dotenv
import os
import paho.mqtt.client as mqtt
import signal
import threading
from flask import Flask, Response
import ssl
import json

# -----------------------------
# Load .env file
# -----------------------------
load_dotenv()
HOST = os.getenv("MQTT_HOST")
PORT = int(os.getenv("MQTT_PORT", "8883"))
USERNAME = os.getenv("MQTT_USERNAME")
PASSWORD = os.getenv("MQTT_PASSWORD")
TOPIC = "posture"

# -----------------------------
# setup MQTT
# -----------------------------
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

client = mqtt.Client()
client.on_connect = on_connect
client.on_publish = on_publish

client.username_pw_set(USERNAME, PASSWORD)
client.tls_set(cert_reqs=ssl.CERT_NONE)
client.tls_insecure_set(True)

# Connect (blocking)
rc = client.connect(HOST, PORT, keepalive=60)
# Wait for on_connect to run
time.sleep(1)

# -----------------------------
# Picamera2 + MediaPipe init
# -----------------------------
picam2 = Picamera2()
picam2.configure(picam2.create_preview_configuration(
    main={"format": "BGR888", "size": (640, 480)}
))
picam2.start()

mp_drawing = mp.solutions.drawing_utils
mp_pose = mp.solutions.pose

# -----------------------------
# Globals for streaming
# -----------------------------
latest_frame = None
frame_lock = threading.Lock()
running = True

# -----------------------------
# Your detection helpers (use same logic you had)
# -----------------------------
def valid_landmark(lm, vis_threshold=0.4):
    return lm is not None and (hasattr(lm, 'visibility') and lm.visibility is not None and lm.visibility >= vis_threshold)

def shoulder_line_angle(left_shoulder, right_shoulder):
    dx = right_shoulder.x - left_shoulder.x
    dy = right_shoulder.y - left_shoulder.y
    return math.degrees(math.atan2(dy, dx))

def detect_sleep_pose(landmarks, vis_threshold=0.4):
    if landmarks is None:
        return "No person detected"
    
    nose = landmarks.landmark[mp_pose.PoseLandmark.NOSE]
    left_shoulder = landmarks.landmark[mp_pose.PoseLandmark.LEFT_SHOULDER]
    right_shoulder = landmarks.landmark[mp_pose.PoseLandmark.RIGHT_SHOULDER]
    left_hip = landmarks.landmark[mp_pose.PoseLandmark.LEFT_HIP]
    right_hip = landmarks.landmark[mp_pose.PoseLandmark.RIGHT_HIP]


    shoulder_z = (left_shoulder.z + right_shoulder.z) / 2
    shoulder_dx = abs(left_shoulder.x - right_shoulder.x)
    hip_dx = abs(left_hip.x - right_hip.x)

    if nose.z < shoulder_z - 0.05:
        return "Supine (Face Up)"
    elif nose.z > shoulder_z + 0.05:
        return "Prone (Face Down)"
    elif shoulder_dx < 0.15 and hip_dx < 0.15:  # tune threshold
        if left_shoulder.y > right_shoulder.y:
            return "Left Side"
        elif right_shoulder.y > left_shoulder.y:
            return "Right Side"
        else:
            return 'Unknown'
    else:
        return 'Unknown'

# -----------------------------
# Flask MJPEG streamer
# -----------------------------
app = Flask(__name__)

def gen_mjpeg():
    global latest_frame, frame_lock, running
    while running:
        with frame_lock:
            if latest_frame is None:
                # no frame yet
                time.sleep(0.01)
                continue
            # encode latest_frame as jpeg
            ret, jpeg = cv2.imencode('.jpg', latest_frame)
        if not ret:
            time.sleep(0.01)
            continue
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
    # when exiting, yield nothing

@app.route('/stream')
def stream():
    return Response(gen_mjpeg(), mimetype='multipart/x-mixed-replace; boundary=frame')

def run_flask():
    # set threaded=True so multiple connections OK
    app.run(host='0.0.0.0', port=5000, threaded=True)

# -----------------------------
# Capture loop (runs in main thread)
# -----------------------------
def capture_loop():
    global latest_frame, frame_lock, running

    send_interval = 10.0
    last_sent_at = 0.0
    pTime = time.time()

    client.loop_start()

    with mp_pose.Pose(static_image_mode=False, model_complexity=1,
                      min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
        while running:
            frame = picam2.capture_array()        # BGR

            # ---- MediaPipe (requires RGB, NOT grayscale) ----
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(rgb)
            landmarks = results.pose_landmarks

            # ---- Convert to grayscale for display ----
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            frame_disp = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)  # back to 3-channel for drawing

            pose_text = "No Pose"
            if landmarks:
                # draw landmarks on grayscale display frame
                mp_drawing.draw_landmarks(frame_disp, landmarks, mp_pose.POSE_CONNECTIONS)

                pose_text = detect_sleep_pose(landmarks)

                # ---- MQTT every 10 seconds ----
                now = time.time()
                if now - last_sent_at >= send_interval:
                    payload = json.dumps({"posture": pose_text})
                    try:
                        pub = client.publish(TOPIC, payload, qos=0)
                        print(f"MQTT Sent {pose_text}, rc={pub.rc}")
                        last_sent_at = now
                    except Exception as e:
                        print("MQTT publish failed:", e)

            # ---- Text overlays ----
            cv2.putText(frame_disp, pose_text, (20, 80),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

            # FPS
            cTime = time.time()
            fps = 1.0 / max((cTime - pTime), 1e-6)
            pTime = cTime
            cv2.putText(frame_disp, f"FPS: {int(fps)}", (20, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)

            # Push final grayscale frame
            with frame_lock:
                latest_frame = frame_disp.copy()

# -----------------------------
# Signal handler for clean exit
# -----------------------------
def handle_sigint(sig, frame):
    global running
    running = False

signal.signal(signal.SIGINT, handle_sigint)
signal.signal(signal.SIGTERM, handle_sigint)

if __name__ == "__main__":
    # start Flask in background thread
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()

    try:
        capture_loop()
    except Exception as e:
        print("Runtime error in capture_loop:", e)
    finally:
        running = False
        # give Flask a brief moment to exit
        time.sleep(0.5)
        try:
            picam2.close()
        except Exception:
            pass
        client.loop_stop()
        try:
            client.disconnect()
        except Exception:
            pass
        print("Shutdown complete")
