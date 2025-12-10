import serial
import time
import threading
import binascii
from collections import deque
from flask import current_app
from app.services.tracking_service import tracking_service

class MMWaveSensor:
    """Service for S3KM1110 mmWave Sensor"""
    
    def __init__(self, location: str):
        self.location = location  # 'inside' or 'outside'
        self.serial = None
        self.running = False
        self.detection_range = 5
        self.recent_detections = deque(maxlen=10)
        # Distance filtering parameters
        self.min_distance_cm = 50   # Minimum distance (0.5 meters)
        self.max_distance_cm = 400  # Maximum distance (4 meters) - reduced from 600
        # Sensor initialization hex command
        self.init_hex = "FDFCFBFA0800120000006400000004030201"
        # Movement detection
        self.last_distance = None
        self.last_emit_time = 0
        self.movement_threshold = 30  # cm - only emit if distance changes by this much
    
    def send_hex_command(self, hex_string: str) -> bool:
        """Send hex command to sensor"""
        try:
            if self.serial:
                hex_bytes = binascii.unhexlify(hex_string)
                self.serial.write(hex_bytes)
                print(f"Sensor ({self.location}) - Sent hex command: {hex_string}")
                return True
        except Exception as e:
            print(f"Error sending hex command to sensor ({self.location}): {e}")
        return False
    
    def connect(self) -> bool:
        """Connect to the sensor"""
        try:
            port = current_app.config[f'SENSOR_{self.location.upper()}_PORT']
            baud_rate = current_app.config['BAUD_RATE']
            
            self.serial = serial.Serial(port, baudrate=baud_rate, timeout=1)
            time.sleep(2)  # Wait for initialization
            
            # Send hex initialization command
            if not self.send_hex_command(self.init_hex):
                print(f"Warning: Failed to send init command to sensor ({self.location})")
            
            time.sleep(0.5)  # Wait for sensor to process command
            
            self.detection_range = current_app.config['SENSOR_DETECTION_RANGE']
            self.configure_range(self.detection_range)
            
            tracking_service.update_status(**{f'sensor_{self.location}': 'connected'})
            print(f"mmWave sensor ({self.location}) connected on {port}")
            return True
            
        except Exception as e:
            print(f"Error connecting sensor ({self.location}): {e}")
            tracking_service.update_status(**{f'sensor_{self.location}': 'error'})
            return False
    
    def configure_range(self, distance: int):
        """Configure detection range"""
        try:
            if self.serial:
                cmd = f"sensorStart {distance}\n"
                self.serial.write(cmd.encode())
                self.detection_range = distance
                print(f"Sensor ({self.location}) range: {distance}m")
        except Exception as e:
            print(f"Error configuring sensor range: {e}")
    
    def set_distance_filter(self, min_cm: int, max_cm: int):
        """Set the distance filter range in centimeters"""
        self.min_distance_cm = min_cm
        self.max_distance_cm = max_cm
        print(f"Sensor ({self.location}) distance filter: {min_cm}-{max_cm} cm")
    
    def read_data(self) -> dict:
        """Read and parse sensor data with distance filtering"""
        try:
            if self.serial and self.serial.in_waiting:
                data = self.serial.readline().decode('utf-8', errors='ignore').strip()
                
                if not data:
                    return None
                
                # Parse distance data (format: "Range XXX")
                if data.startswith("Range "):
                    try:
                        distance = int(data[6:])  # Extract number after "Range "
                        
                        # Filter based on distance range
                        if self.min_distance_cm <= distance <= self.max_distance_cm:
                            print(f"Sensor ({self.location}) - Detected Distance: {distance} cm")
                            return {
                                'type': 'distance',
                                'distance_cm': distance,
                                'in_range': True,
                                'raw_data': data
                            }
                        else:
                            print(f"Sensor ({self.location}) - Out of range: {distance} cm (ignored)")
                            return {
                                'type': 'distance',
                                'distance_cm': distance,
                                'in_range': False,
                                'raw_data': data
                            }
                    except (ValueError, IndexError) as e:
                        print(f"Error parsing distance from '{data}': {e}")
                        return None
                
                # Check for other detection keywords (presence/occupied)
                if 'presence' in data.lower() or 'occupied' in data.lower():
                    return {
                        'type': 'presence',
                        'detected': True,
                        'raw_data': data
                    }
                
                # Return raw data for other formats
                return {
                    'type': 'raw',
                    'raw_data': data
                }
                
        except Exception as e:
            print(f"Error reading sensor ({self.location}): {e}")
        return None
    
    def detect_human(self) -> bool:
        """Check for human presence"""
        data = self.read_data()
        if data:
            # Detection from distance measurement within range
            if data.get('type') == 'distance' and data.get('in_range'):
                self.recent_detections.append(time.time())
                distance_cm = data.get('distance_cm', 0)
                # Don't emit sensor_activity here - let RFID service control visualization
                return True
            # Detection from presence keywords
            elif data.get('type') == 'presence' and data.get('detected'):
                self.recent_detections.append(time.time())
                # Don't emit sensor_activity here - let RFID service control visualization
                return True
        return False
    
    def _emit_sensor_activity(self, detected: bool, distance: int):
        """Emit WebSocket event for sensor activity only on significant movement"""
        try:
            current_time = time.time()
            
            # Only emit if:
            # 1. Distance changed significantly (movement detected), OR
            # 2. At least 1 second has passed since last emit (prevent spam)
            should_emit = False
            
            if self.last_distance is None:
                # First reading
                should_emit = True
            elif abs(distance - self.last_distance) >= self.movement_threshold:
                # Significant movement detected
                should_emit = True
            elif current_time - self.last_emit_time >= 1.0:
                # Periodic update (once per second)
                should_emit = False  # Don't emit periodic updates to reduce spam
            
            if should_emit:
                from app import socketio
                if socketio:
                    socketio.emit('sensor_activity', {
                        'location': self.location,
                        'detected': detected,
                        'distance': distance
                    })
                    self.last_emit_time = current_time
                    print(f"🌊 Sensor ({self.location}) - Activity emitted: {distance}cm")
            
            # Update last distance for next comparison
            self.last_distance = distance
            
        except Exception as e:
            # Silently fail if WebSocket is not available
            pass
    
    def is_recently_detected(self, timeout: int) -> bool:
        """Check if human detected within timeout"""
        if not self.recent_detections:
            return False
        current_time = time.time()
        return any(current_time - t < timeout for t in self.recent_detections)
    
    def get_latest_detection(self) -> float:
        """Get timestamp of latest detection"""
        return max(self.recent_detections) if self.recent_detections else 0
    
    def configure_range(self, distance: int):
        """Configure detection range for the sensor"""
        self.detection_range = distance
        # Update max distance based on range setting
        self.max_distance_cm = min(distance * 100, 1000)  # Convert meters to cm, max 10m
        print(f"Sensor ({self.location}) - Range configured to {distance}m (max distance: {self.max_distance_cm}cm)")
    
    def set_distance_filter(self, min_cm: int, max_cm: int):
        """Set distance filter parameters"""
        self.min_distance_cm = min_cm
        self.max_distance_cm = max_cm
        print(f"Sensor ({self.location}) - Distance filter: {min_cm}-{max_cm}cm")
    
    def monitor_loop(self):
        """Continuous monitoring loop"""
        self.running = True
        while self.running:
            try:
                self.detect_human()
                time.sleep(0.1)  # 10Hz polling
            except Exception as e:
                print(f"Sensor ({self.location}) monitor error: {e}")
                time.sleep(1)
    
    def stop(self):
        """Stop monitoring"""
        self.running = False
        if self.serial:
            self.serial.close()


class SensorManager:
    """Manager for both mmWave sensors"""
    
    def __init__(self):
        self.sensor_inside = MMWaveSensor('inside')
        self.sensor_outside = MMWaveSensor('outside')
    
    def initialize(self):
        """Initialize both sensors"""
        if self.sensor_inside.connect():
            threading.Thread(target=self.sensor_inside.monitor_loop, daemon=True).start()
        
        if self.sensor_outside.connect():
            threading.Thread(target=self.sensor_outside.monitor_loop, daemon=True).start()
    
    def check_human_detection(self):
        """Check both sensors for recent human detection"""
        timeout = current_app.config['HUMAN_DETECTION_TIMEOUT']
        
        inside_detected = self.sensor_inside.is_recently_detected(timeout)
        outside_detected = self.sensor_outside.is_recently_detected(timeout)
        
        return inside_detected, outside_detected
    
    def determine_direction(self) -> str:
        """Determine movement direction"""
        inside_detected, outside_detected = self.check_human_detection()
        
        # New logic: inside-only => IN, outside-only => OUT
        # If both detected, the sensor with the later timestamp indicates final location
        if inside_detected and not outside_detected:
            return "IN"
        elif outside_detected and not inside_detected:
            return "OUT"
        elif inside_detected and outside_detected:
            inside_time = self.sensor_inside.get_latest_detection()
            outside_time = self.sensor_outside.get_latest_detection()
            # If inside detected later than outside, final movement is IN, otherwise OUT
            return "IN" if inside_time > outside_time else "OUT"
        
        return None
    
    def configure_range(self, distance: int):
        """Configure range for both sensors"""
        self.sensor_inside.configure_range(distance)
        self.sensor_outside.configure_range(distance)
    
    def set_distance_filter(self, min_cm: int, max_cm: int):
        """Set distance filter for both sensors"""
        self.sensor_inside.set_distance_filter(min_cm, max_cm)
        self.sensor_outside.set_distance_filter(min_cm, max_cm)
    
    def shutdown(self):
        """Shutdown both sensors"""
        self.sensor_inside.stop()
        self.sensor_outside.stop()


# Global sensor manager instance
sensor_manager = SensorManager()