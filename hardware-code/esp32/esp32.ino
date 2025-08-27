#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>

// --- BLE UART UUIDs ---
#define SERVICE_UUID        "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

BLEServer* pServer = nullptr;
BLECharacteristic* pCharacteristic = nullptr;
bool deviceConnected = false;

// Define sensor
#define HR_PIN 6

// Define variable
unsigned long lastSend = 0;
// -- heart rate --
int hrThreshold = 550;
unsigned long lastBeatTime = 0;
int hrBPM = 0;

class MyServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
  };

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("Client disconnected, restarting advertising...");
    pServer->getAdvertising()->start();
}
};

void setup() {
  Serial.begin(115200);

  pinMode(HR_PIN, INPUT);

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
                      BLECharacteristic::PROPERTY_NOTIFY
                    );

  // Start the service
  pService->start();

  // Start advertising
  pServer->getAdvertising()->start();
  Serial.println("BLE UART started, waiting for client...");
}

void loop() {
  unsigned long now = millis();
  
  // Read data
  long hrValue = analogRead(HR_PIN);

  if ((now - lastBeatTime) > 300) { 
    Serial.println("> Current heart rate : " + hrValue);
    unsigned long beatInterval = now - lastBeatTime; // in ms
    hrBPM = 60000 / beatInterval; // convert ms to BPM
    lastBeatTime = now;
    Serial.println("> Current heart rate : " + hrBPM);
  }

  if (now - lastSend >= 1000) {
    lastSend = now;

    // Dummy JSON payload
    String payload = "{";
    payload += "\"heartbeat\":";
    payload += hrBPM;
    payload += ",";
    payload += "\"gyroX\":1,";
    payload += "\"gyroY\":2,";
    payload += "\"gyroZ\":3";
    payload += "}";

    Serial.println("Sent: " + payload);

    if (deviceConnected) {
      pCharacteristic->setValue(payload.c_str());
      pCharacteristic->notify();
    }
  }
}