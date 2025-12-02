# camera_test_stream.py
import cv2
import mediapipe as mp
from picamera2 import Picamera2
import time
import math

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
# Send pose once
# -----------------------------`

def send_pose():
    try:
        with mp_pose.Pose(static_image_mode=False, model_complexity=1,
                          min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
            try:
                frame = picam2.capture_array() # might raise
            except Exception as e:
                print("Camera capture error:", e)
                time.sleep(0.1)
                return "Unknown"

            # MediaPipe expects RGB
            try:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = pose.process(rgb)
                landmarks = results.pose_landmarks
            except Exception as e:
                print("MediaPipe processing error:", e)
                landmarks = None
                time.sleep(0.1)
                return "Unknown"

            # convert to gray for display
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            frame_disp = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)

            if landmarks:
                mp_drawing.draw_landmarks(frame_disp, landmarks, mp_pose.POSE_CONNECTIONS)
                new_pose = detect_sleep_pose(landmarks)
                return new_pose
            else:
                return "Unknown"
    except Exception as e:
        print("Unhandled error in capture_loop:", e)
        time.sleep(0.1)
        return "Unknown"

if __name__ == "__main__":
    try:
        result = send_pose()
        print("Detected pose:", result)
    except Exception as e:
        print("Runtime error in send_pose:", e)
    finally:
        # give Flask a brief moment to exit
        time.sleep(0.5)
        try:
            picam2.close()
        except Exception:
            pass
        except Exception:
            pass
        print("Shutdown complete")
