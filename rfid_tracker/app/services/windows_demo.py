import serial
import binascii

# Add these parameters to your windows_demo.py
MIN_DISTANCE_CM = 50   # Minimum distance (0.5 meters)
MAX_DISTANCE_CM = 100 # 600  # Maximum distance (6 meters) - adjust as needed

def send_hex_string(serial_port, hex_string):
    hex_bytes = binascii.unhexlify(hex_string)
    serial_port.write(hex_bytes)


def read_serial_data(serial_port):
    try:
        while True:
            data = serial_port.readline().decode('utf-8', errors='ignore').strip()
            # print(data)

            # Parse the distance from the data
            if data.startswith("Range "):
                distance = int(data[6:])  # Extract number after "Range "
                
                # Filter based on your custom range
                if MIN_DISTANCE_CM <= distance <= MAX_DISTANCE_CM:
                    print(f"Detected Distance: {distance} cm")
                else:
                    print(f"Out of range: {distance} cm (ignored)")   
                     
    except KeyboardInterrupt:
        print("\n\nCtrl+C detected. Stopping...")
        return                    


if __name__ == "__main__":
    ser = serial.Serial('COM3', 115200, timeout=1)

    hex_to_send = "FDFCFBFA0800120000006400000004030201"
    send_hex_string(ser, hex_to_send)

    read_serial_data(ser)

    ser.close()
