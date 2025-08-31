from adafruit_ads1x15.ads1115 import ADS1115
from adafruit_ads1x15.analog_in import AnalogIn
import board, busio, time
from datetime import datetime

i2c = busio.I2C(board.SCL, board.SDA)
ads = ADS1115(i2c, address=0x48)
ads.gain = 1  

def read_light():
    chan = AnalogIn(ads, 0)
    print("Press Ctrl+C to stop")
    try:
        while True:
            ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            brightness = (32767 - chan.value)*100/32767
            inverted_voltage = ads.gain * 4.096 - chan.voltage
            print(f"[{ts}] light:{brightness:.2f}% V:{chan.voltage:.3f}")
            time.sleep(1)
    except KeyboardInterrupt:
        pass

def send_light():
    try:
        chan = AnalogIn(ads, 0)
        brightness = (32767 - chan.value)*100/32767
        return brightness
    except:
        return 0

if __name__ == "__main__":
    read_light()