
from gpiozero import AngularServo
from time import sleep

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
            sleep(0.5)
            servo.value = None
        except Exception as e:
            print("Servo set angle error:", e)

def set_up_servo():
    set_servo_angle(0)

def turn_on():
    set_servo_angle(60)
    set_servo_angle(0)

def turn_off():
    set_servo_angle(-60)
    set_servo_angle(0)