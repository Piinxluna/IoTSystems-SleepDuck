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
#define HR_PIN 5

// Define variable
unsigned long lastSend = 0;
// -- heart rate --
int hrValue = 0;
int hrBPM = 0;
bool hrPulseDetected = false;
int hrThreshold = 3000;
int hrActiveThreshold = 1800;
unsigned long lastBeatTime = 0;
int hrMin = 5000;
int hrMax = 0;
// -- gyro --
int gyroX = 0;
int gyroY = 0;
int gyroZ = 0;

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

  int sumHrThreshold = 0;
  for(int i=0; i < 10; i++){
    sumHrThreshold += analogRead(HR_PIN); 
    delay(100);
  }
  hrActiveThreshold = sumHrThreshold / 10;

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
  
  // --------------------- Read data --------------------- 
  hrValue = analogRead(HR_PIN);

  // if(hrValue > hrActiveThreshold){
    // Track min and max values
    if (hrValue < hrMin) hrMin = hrValue;
    if (hrValue > hrMax) hrMax = hrValue;

    // Recalculate threshold halfway between
    hrThreshold = (hrMin + hrMax) / 2;

    // Detect rising edge (value goes above threshold)
    if (hrValue > hrThreshold && !hrPulseDetected) {
      hrPulseDetected = true;
      unsigned long currentTime = millis();

      if (lastBeatTime > 0) {
        unsigned long interval = currentTime - lastBeatTime; // time between beats
        hrBPM = 60000 / interval;  // convert ms to BPM
        // Serial.print("♥ Beat detected! BPM = ");
        // Serial.println(hrBPM);
      }

      lastBeatTime = currentTime;
    }

    // Reset detection when signal drops below threshold
    if (hrValue < hrThreshold) {
      hrPulseDetected = false;
    }
  // }

  hrBPM = hrValue;

  if (now - lastSend >= 1000) {
    lastSend = now;

    // Dummy JSON payload
    String payload = "{";
    // payload += "\"heartRate value\":";
    // payload += hrValue;
    // payload += ",";
    // payload += "\"heartRate th\":";
    // payload += hrThreshold;
    // payload += ",";
    // payload += "\"heartRate pulse\":";
    // payload += hrPulseDetected;
    // payload += ",";
    payload += "\"heartRate\":";
    payload += hrBPM;
    payload += ",";
    payload += "\"gyroX\":";
    payload += gyroX;
    payload += ",";
    payload += "\"gyroY\":";
    payload += gyroY;
    payload += ",";
    payload += "\"gyroZ\":";
    payload += gyroZ;
    payload += "}";

    Serial.println("Sent: " + payload);

    if (deviceConnected) {
      pCharacteristic->setValue(payload.c_str());
      pCharacteristic->notify();
    }
  }

  delay(1);
}