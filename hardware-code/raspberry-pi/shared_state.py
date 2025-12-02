import threading
import time

# Shared state with thread locks
_pose_lock = threading.Lock()
_light_lock = threading.Lock()

_current_pose = "Unknown"
_pose_last_update = 0

_light_status = None  # True=on, False=off, None=unknown
_light_last_update = 0

# Maximum age for data before considering it stale (seconds)
DATA_TIMEOUT = 5

# ===== POSE FUNCTIONS =====
def update_pose(pose_value):
    """Called by sleepPoseDetection.py to update current pose"""
    global _current_pose, _pose_last_update
    with _pose_lock:
        _current_pose = pose_value
        _pose_last_update = time.time()

def get_pose():
    """Called by sendData.py to read current pose"""
    with _pose_lock:
        # Return "Unknown" if data is too old
        if time.time() - _pose_last_update > DATA_TIMEOUT:
            return "Unknown"
        return _current_pose

# ===== LIGHT STATUS FUNCTIONS =====
def update_light_status(status):
    """Called by servoMotor.py to update light status"""
    global _light_status, _light_last_update
    with _light_lock:
        _light_status = status
        _light_last_update = time.time()

def get_light_status():
    """Called by sendData.py to read light status"""
    with _light_lock:
        # Return None if data is too old
        if time.time() - _light_last_update > DATA_TIMEOUT:
            return None
        return _light_status