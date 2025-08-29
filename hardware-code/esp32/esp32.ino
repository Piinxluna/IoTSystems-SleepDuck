#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>

#include <Wire.h>
#include <MPU6050.h>

// --- BLE UART UUIDs ---
#define SERVICE_UUID        "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

BLEServer* pServer = nullptr;
BLECharacteristic* pCharacteristic = nullptr;
bool deviceConnected = false;

// --- Define sensor ---
#define HR_PIN 4
#define SDA_PIN 18
#define SCL_PIN 17

// --- Define variable ---
unsigned long lastSend = 0;

// -- heart rate --
int minHr = 40, maxHr = 150, maxHrInputValue = 4095;
int hrValue = 0;
int hrSumValue = 0;
int hrSumCount = 0;
int hrBPM = 0;
int hrActiveThreshold = 1800;
unsigned long lastHrChecked = 0;

// -- gyro --
MPU6050 mpu;
int16_t ax, ay, az;   // Accelerometer raw data
int16_t gx, gy, gz;   // Gyroscope raw data
float prev_ax = 0.52, prev_ay = -0.02, prev_az = -0.04; // Normal value
float ax_g = 0.0, ay_g = 0.0, az_g = 0.0;
float magPrev = 0.0, magCurr = 0.0;
bool motionDetected = false;

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

  Serial.println("Initializing...");

  // --- Set up device ---
  pinMode(HR_PIN, INPUT);
  Wire.begin(SDA_PIN, SCL_PIN, 400000);
  
  delay(200);
  mpu.initialize();
  // Check if sensor connected
  if (!mpu.testConnection()) {
    Serial.println("MPU6050 connection failed!");
    while (1);
  }
  Serial.println("MPU6050 ready.");

  // Calculate HR active threshold
  int sumHrActiveThreshold = 0;
  for(int i=0; i < 10; i++){
    sumHrActiveThreshold += analogRead(HR_PIN); 
    delay(100);
  }
  hrActiveThreshold = (sumHrActiveThreshold / 10);

  delay(100);

  // --- Set up Bluetooth ---
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

  // --- Heart rate ---
  hrValue = analogRead(HR_PIN);

  if (hrValue > hrActiveThreshold) {
    if (now - lastHrChecked < 20) {
      hrSumValue += (hrValue - hrActiveThreshold) * (maxHr - minHr) / (maxHrInputValue - hrActiveThreshold);
      hrSumCount++;
    } else {
      if (hrSumCount == 0) {
        hrSumCount = 1;
      }
      hrBPM = hrSumValue / hrSumCount;
      lastHrChecked = now;
      hrSumValue = 0;
      hrSumCount = 0;
    }
  } else {
    hrBPM = 0;
  }

  // --- Motion ---
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);

  ax_g = ax / 16384.0;
  ay_g = ay / 16384.0;
  az_g = az / 16384.0;
  if (fabs(ax_g - prev_ax) > 0.05 || fabs(ay_g - prev_ay) > 0.05 || fabs(az_g - prev_az) > 0.05 || motionDetected) {
    motionDetected = true;
  } else {
    motionDetected = false;
  }
  prev_ax = ax_g;
  prev_ay = ay_g;
  prev_az = az_g;

  // --------------------- Send data via Bluetooth --------------------- 
  if (now - lastSend >= 1000) {
    lastSend = now;

    // Dummy JSON payload
    String payload = "{";
    payload += "\"heartRate\":";
    payload += hrBPM;
    payload += ",";
    payload += "\"motion\":";
    payload += (motionDetected ? "true" : "false");
    payload += "}";

    Serial.println("Sent: " + payload);

    if (deviceConnected) {
      pCharacteristic->setValue(payload.c_str());
      pCharacteristic->notify();
    }

    motionDetected = false;
  }

  delay(5);
}