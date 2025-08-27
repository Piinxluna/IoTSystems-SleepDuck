#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>

// --- BLE UART UUIDs ---
#define SERVICE_UUID "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

BLEServer *pServer = nullptr;
BLECharacteristic *pCharacteristic = nullptr;
bool deviceConnected = false;

unsigned long lastSend = 0;

class MyServerCallbacks : public BLEServerCallbacks
{
  void onConnect(BLEServer *pServer)
  {
    deviceConnected = true;
  };

  void onDisconnect(BLEServer *pServer)
  {
    deviceConnected = false;
    Serial.println("Client disconnected, restarting advertising...");
    pServer->getAdvertising()->start();
  }
};

void setup()
{
  Serial.begin(115200);
  delay(100);

  // Create BLE Device
  BLEDevice::init("ESP32S3_BLE");

  // Create BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create BLE Service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Create BLE Characteristic
  pCharacteristic = pService->createCharacteristic(
      CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_NOTIFY);

  // Start the service
  pService->start();

  // Start advertising
  pServer->getAdvertising()->start();
  Serial.println("BLE UART started, waiting for client...");
}

void loop()
{
  unsigned long now = millis();
  if (now - lastSend >= 1000)
  {
    lastSend = now;

    // Dummy JSON payload
    String payload = "{";
    payload += "\"heartbeat\":100,";
    payload += "\"gyroX\":1,";
    payload += "\"gyroY\":2,";
    payload += "\"gyroZ\":3";
    payload += "}";

    Serial.println("Sent: " + payload);

    if (deviceConnected)
    {
      pCharacteristic->setValue(payload.c_str());
      pCharacteristic->notify();
    }
  }
}