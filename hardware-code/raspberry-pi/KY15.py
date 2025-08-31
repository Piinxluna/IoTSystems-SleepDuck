import time
from datetime import datetime
import board
import adafruit_dht

def get_dht_data():
    dht = adafruit_dht.DHT11(board.D17)
    try:
        while True:
            try:
                t = dht.temperature
                h = dht.humidity
                if t is not None and h is not None:
                    ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    print(f"[{ts}] Temp: {t:.1f} °C  Humidity: {h:.1f} %")
                else:
                    print("No data (retry)...")
            except RuntimeError as e:
                print("Read error:", e.args[0])
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopped by user.")
    finally:
        dht.exit()

def send_temp():
    try:
        dht = adafruit_dht.DHT11(board.D17)
        return dht.temperature
    except:
        return 0
    finally:
        dht.exit()

def send_humidity():
    try:
        dht = adafruit_dht.DHT11(board.D17)
        return dht.humidity
    except:
        return 0
    finally:
        dht.exit()

if __name__ == "__main__":
    get_dht_data()