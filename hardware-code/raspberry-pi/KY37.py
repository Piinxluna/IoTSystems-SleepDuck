from adafruit_ads1x15.ads1115 import ADS1115
from adafruit_ads1x15.analog_in import AnalogIn
import board, busio, time
from datetime import datetime

i2c = busio.I2C(board.SCL, board.SDA)
ads = ADS1115(i2c, address=0x48)
ads.data_rate = 860
ads.gain = 2/3  # try 8 or 16 if needed

chan = AnalogIn(ads, 1)  # A1

def calibrating_sound(samples=100):
    """Find the quiet DC offset voltage by averaging readings."""
    print("Calibrating... please be quiet.")
    total = 0
    for _ in range(samples):
        total += chan.voltage
        time.sleep(0.01)
    print("Calibration complete.")
    return total / samples

dc_offset = calibrating_sound()

def read_sound_amplitude(offset, window_ms=50):
    """Read the peak amplitude over a short window."""
    t_end = time.monotonic() + (window_ms / 1000)
    max_deviation = 0
    
    while time.monotonic() < t_end:
        # Calculate how far the current reading is from the center/offset
        deviation = abs(chan.voltage - offset)
        if deviation > max_deviation:
            max_deviation = deviation
            
    # This value represents the sound "volume"
    return max_deviation

def read_sound():
    print("Press Ctrl+C to stop")
    try:
        samples = []
        last_print = time.monotonic()

        while True:
            amplitude = read_sound_amplitude(dc_offset)
            sound_level_percent = (amplitude / 0.01) * 10 # scale (1 V = 1000%)

            if sound_level_percent > 100:
                sound_level_percent = 100

            samples.append(sound_level_percent)

            # Once per second, calculate average
            if time.monotonic() - last_print >= 1.0:
                if samples:
                    avg_level = sum(samples) / len(samples)
                    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] "
                          f"Average Sound Level: {avg_level:.2f}% "
                          f"(from {len(samples)} samples)")
                # Reset for next second
                samples.clear()
                last_print = time.monotonic()

            time.sleep(0.01)  # sample ~100 Hz
    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    print(f"DC Offset (Center Voltage): {dc_offset:.4f} V\n")
    
    print("Reading sound levels. Press Ctrl+C to stop.")

    read_sound()

# Code for the send part

def send_sound():
    try:
        amplitude = read_sound_amplitude(dc_offset)
        sound_level_percent = (amplitude / 0.01) * 10 # scale (1 V = 1000%)
        return sound_level_percent
    except:
        return 0