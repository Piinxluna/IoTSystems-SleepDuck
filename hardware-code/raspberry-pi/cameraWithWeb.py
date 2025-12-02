# camera_test_stream.py
import cv2
import mediapipe as mp
from picamera2 import Picamera2
import time
import math
import signal
import threading
from flask import Flask, Response

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
latest_frame = None
frame_lock = threading.Lock()
pose_text = "No Pose"
pose_lock = threading.Lock()
running = True
            
def send_pose():
    print('>> current pose', pose_text)
    with pose_lock:
        return pose_text

def capture_loop():
    print('>> Loop start')
    global latest_frame, running, pose_text
    pTime = time.time()
    try:
        with mp_pose.Pose(static_image_mode=False, model_complexity=1,
                          min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
            while running:
                try:
                    frame = picam2.capture_array()   # might raise
                except Exception as e:
                    print("Camera capture error:", e)
                    time.sleep(0.1)
                    continue

                # MediaPipe expects RGB
                try:
                    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    results = pose.process(rgb)
                    landmarks = results.pose_landmarks
                except Exception as e:
                    print("MediaPipe processing error:", e)
                    landmarks = None

                # convert to gray for display
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                frame_disp = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)

                if landmarks:
                    mp_drawing.draw_landmarks(frame_disp, landmarks, mp_pose.POSE_CONNECTIONS)
                    new_pose = detect_sleep_pose(landmarks)
                    print('>> log', new_pose)
                    with pose_lock:
                        pose_text = new_pose
                else:
                    # optional: update to say "No person detected"
                    with pose_lock:
                        # keep previous pose or set explicit:
                        # pose_text = "No person detected"
                        pass

                # read a local copy of pose_text under lock for thread-safety
                with pose_lock:
                    local_pose = pose_text

                cv2.putText(frame_disp, local_pose, (20, 80),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

                # FPS
                cTime = time.time()
                fps = 1.0 / max((cTime - pTime), 1e-6)
                pTime = cTime
                cv2.putText(frame_disp, f"FPS: {int(fps)}", (20, 40),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)

                # push final frame
                with frame_lock:
                    latest_frame = frame_disp.copy()

                # small sleep to release CPU
                time.sleep(0.001)
    except Exception as e:
        print("Unhandled error in capture_loop:", e)
        running = False

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
    print(">>>>>>>>>> Flask thread started")
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
        except Exception:
            pass
        print("Shutdown complete")
