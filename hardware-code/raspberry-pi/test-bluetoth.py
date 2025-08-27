# connect_esp32_ble.py
import asyncio
from bleak import BleakClient, BleakScanner
from datetime import datetime

DEVICE_NAME = "ESP32S3_BLE"
CHARACTERISTIC_UUID = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"


async def notification_handler(sender, data):
    """Called when notification is received"""
    print(f"Received at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Received: {data.decode()}")


async def main():
    # Scan for the device
    devices = await BleakScanner.discover()
    esp32_address = None
    for d in devices:
        if d.name == DEVICE_NAME:
            esp32_address = d.address
            break

    if esp32_address is None:
        print("ESP32 device not found!")
        return

    print(f"Connecting to {DEVICE_NAME} ({esp32_address})...")

    async with BleakClient(esp32_address) as client:
        if client.is_connected:
            print("Connected!")
            await client.start_notify(CHARACTERISTIC_UUID, notification_handler)

            # Keep listening for notifications
            print("Listening for notifications... Press Ctrl+C to exit")
            while True:
                await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(main())
