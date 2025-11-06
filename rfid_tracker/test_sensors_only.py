"""
Test Script - Sensors Only (No RFID)
This script tests only the mmWave sensors to verify which physical sensor is which.
Wave your hand near each sensor to see which one detects.
"""

import serial
import time
import binascii
import sys

# Sensor configuration
SENSOR_USB1_PORT = '/dev/ttyUSB1'  # Currently mapped as "Inside Sensor"
SENSOR_USB2_PORT = '/dev/ttyUSB2'  # Currently mapped as "Outside Sensor"
BAUD_RATE = 115200

# Sensor initialization command
INIT_HEX = "FDFCFBFA0800120000006400000004030201"

class SensorTester:
    def __init__(self, port, name):
        self.port = port
        self.name = name
        self.serial = None
        self.connected = False
        # Set minimum detection range (very close only)
        self.min_distance_cm = 50   # 0.5 meters minimum
        self.max_distance_cm = 100  # 0.5 meters maximum (very short range)
        
    def connect(self):
        """Connect to sensor"""
        try:
            print(f"\n🔌 Connecting to {self.name} on {self.port}...")
            self.serial = serial.Serial(self.port, baudrate=BAUD_RATE, timeout=1)
            time.sleep(2)  # Wait for initialization
            
            # Send initialization command
            hex_bytes = binascii.unhexlify(INIT_HEX)
            self.serial.write(hex_bytes)
            print(f"   ✅ {self.name} connected and initialized")
            
            time.sleep(0.5)
            self.connected = True
            return True
            
        except Exception as e:
            print(f"   ❌ Failed to connect {self.name}: {e}")
            self.connected = False
            return False
    
    def read_detection(self):
        """Read sensor data"""
        try:
            if self.serial and self.serial.in_waiting:
                data = self.serial.readline().decode('utf-8', errors='ignore').strip()
                
                if data and data.startswith("Range "):
                    distance = int(data[6:])  # Extract distance
                    
                    # Filter for very close range only (50cm to 100cm)
                    if self.min_distance_cm <= distance <= self.max_distance_cm:
                        return distance
                        
        except Exception as e:
            pass
        
        return None
    
    def close(self):
        """Close connection"""
        if self.serial:
            self.serial.close()
            print(f"   🔌 {self.name} disconnected")


def main():
    print("=" * 70)
    print("🧪 SENSOR DETECTION TEST - NO RFID")
    print("=" * 70)
    print("\nThis test will help you identify which physical sensor is which.")
    print("\nCurrent Configuration:")
    print(f"  • USB1 ({SENSOR_USB1_PORT}) = Inside Sensor (Exit)")
    print(f"  • USB2 ({SENSOR_USB2_PORT}) = Outside Sensor (Entry)")
    print("\n" + "=" * 70)
    
    # Ask which sensor to test
    print("\nWhich sensor do you want to test?")
    print("1. USB1 only (/dev/ttyUSB1 - configured as Inside)")
    print("2. USB2 only (/dev/ttyUSB2 - configured as Outside)")
    print("3. Both sensors")
    choice = input("\nEnter choice (1/2/3): ").strip()
    
    test_usb1 = choice in ['1', '3']
    test_usb2 = choice in ['2', '3']
    
    if not test_usb1 and not test_usb2:
        print("Invalid choice. Exiting...")
        return
    
    print("\n" + "=" * 70)
    
    # Initialize sensors
    sensor_usb1 = None
    sensor_usb2 = None
    
    if test_usb1:
        sensor_usb1 = SensorTester(SENSOR_USB1_PORT, "USB1 (Inside)")
        if not sensor_usb1.connect():
            print(f"\n⚠️  Cannot connect to USB1. Check if device is connected.")
            sensor_usb1 = None
    
    if test_usb2:
        sensor_usb2 = SensorTester(SENSOR_USB2_PORT, "USB2 (Outside)")
        if not sensor_usb2.connect():
            print(f"\n⚠️  Cannot connect to USB2. Check if device is connected.")
            sensor_usb2 = None
    
    if not sensor_usb1 and not sensor_usb2:
        print("\n❌ No sensors connected. Exiting...")
        return
    
    print("\n" + "=" * 70)
    print("📡 MONITORING SENSORS - Wave your hand near each sensor")
    print("=" * 70)
    
    if test_usb1 and not test_usb2:
        print("\n🔍 Testing USB1 ONLY (/dev/ttyUSB1)")
        print("Wave your hand on the INSIDE (exit side) - it should detect")
        print("If it detects, then USB1 is correctly mapped to INSIDE sensor ✅")
        print("If it doesn't detect, try the OUTSIDE and USB1 is swapped ⚠️")
    elif test_usb2 and not test_usb1:
        print("\n🔍 Testing USB2 ONLY (/dev/ttyUSB2)")
        print("Wave your hand on the OUTSIDE (entry side) - it should detect")
        print("If it detects, then USB2 is correctly mapped to OUTSIDE sensor ✅")
        print("If it doesn't detect, try the INSIDE and USB2 is swapped ⚠️")
    else:
        print("\nInstructions:")
        print("1. Stand on the INSIDE (exit side) and wave near the sensor")
        print("2. Note which USB sensor detects (USB1 or USB2)")
        print("3. Stand on the OUTSIDE (entry side) and wave near the sensor")
        print("4. Note which USB sensor detects (USB1 or USB2)")
    
    print("\nPress Ctrl+C to exit")
    print("-" * 70)
    
    try:
        usb1_last_detection = 0
        usb2_last_detection = 0
        
        while True:
            current_time = time.time()
            
            # Check USB1
            if sensor_usb1 and sensor_usb1.connected:
                distance = sensor_usb1.read_detection()
                if distance:
                    # Only print if it's been more than 1 second since last detection
                    if current_time - usb1_last_detection > 1:
                        print(f"\n🟢 USB1 DETECTED | Distance: {distance} cm | Port: {SENSOR_USB1_PORT}")
                        print(f"   → Currently configured as: INSIDE SENSOR (Exit)")
                        usb1_last_detection = current_time
            
            # Check USB2
            if sensor_usb2 and sensor_usb2.connected:
                distance = sensor_usb2.read_detection()
                if distance:
                    # Only print if it's been more than 1 second since last detection
                    if current_time - usb2_last_detection > 1:
                        print(f"\n🔵 USB2 DETECTED | Distance: {distance} cm | Port: {SENSOR_USB2_PORT}")
                        print(f"   → Currently configured as: OUTSIDE SENSOR (Entry)")
                        usb2_last_detection = current_time
            
            time.sleep(0.1)  # 10Hz polling
            
    except KeyboardInterrupt:
        print("\n\n" + "=" * 70)
        print("🛑 Test stopped by user")
        print("=" * 70)
        
        print("\n📊 RESULTS ANALYSIS:")
        print("-" * 70)
        print("Based on your observations:")
        print("\nIf USB1 detected when you were on the INSIDE (exit side):")
        print("   ✅ Configuration is CORRECT - No changes needed")
        print("\nIf USB2 detected when you were on the INSIDE (exit side):")
        print("   ⚠️  Configuration is SWAPPED - Ports need to be swapped in config.py")
        print("\nIf USB1 detected when you were on the OUTSIDE (entry side):")
        print("   ⚠️  Configuration is SWAPPED - Ports need to be swapped in config.py")
        print("\nIf USB2 detected when you were on the OUTSIDE (entry side):")
        print("   ✅ Configuration is CORRECT - No changes needed")
        print("=" * 70)
    
    finally:
        # Cleanup
        if sensor_usb1:
            sensor_usb1.close()
        if sensor_usb2:
            sensor_usb2.close()
        print("\n✅ Test completed\n")


if __name__ == "__main__":
    main()
