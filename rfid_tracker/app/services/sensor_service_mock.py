"""
Mock mmWave Sensor Service for Testing Without Hardware
"""
import time
import threading
import random
from collections import deque
from flask import current_app
from app.services.tracking_service import tracking_service

class MMWaveSensorMock:
    """Mock service for S3KM1110 mmWave Sensor"""
    
    def __init__(self, location: str):
        self.location = location  # 'inside' or 'outside'
        self.running = False
        self.detection_range = 5
        self.recent_detections = deque(maxlen=10)
        self.simulate_detection = False  # Manual trigger
    
    def connect(self) -> bool:
        """Simulate connection to sensor"""
        try:
            time.sleep(0.5)  # Simulate connection delay
            
            self.detection_range = current_app.config['SENSOR_DETECTION_RANGE']
            
            tracking_service.update_status(**{f'sensor_{self.location}': 'connected (mock)'})
            print(f"[MOCK] mmWave sensor ({self.location}) connected (simulated)")
            return True
            
        except Exception as e:
            print(f"[MOCK] Error connecting sensor ({self.location}): {e}")
            tracking_service.update_status(**{f'sensor_{self.location}': 'error'})
            return False
    
    def configure_range(self, distance: int):
        """Configure detection range"""
        self.detection_range = distance
        print(f"[MOCK] Sensor ({self.location}) range: {distance}m")
    
    def read_data(self) -> str:
        """Simulate reading sensor data"""
        # Randomly simulate detection for testing
        if self.simulate_detection or random.random() < 0.05:  # 5% chance
            return "presence detected"
        return None
    
    def detect_human(self) -> bool:
        """Check for human presence"""
        data = self.read_data()
        if data and 'presence' in data.lower():
            timestamp = time.time()
            self.recent_detections.append(timestamp)
            print(f"[MOCK] Human detected by {self.location} sensor")
            return True
        return False
    
    def is_recently_detected(self, timeout: int) -> bool:
        """Check if human detected within timeout"""
        if not self.recent_detections:
            return False
        current_time = time.time()
        return any(current_time - t < timeout for t in self.recent_detections)
    
    def get_latest_detection(self) -> float:
        """Get timestamp of latest detection"""
        return max(self.recent_detections) if self.recent_detections else 0
    
    def trigger_detection(self):
        """Manually trigger a detection (for testing)"""
        self.simulate_detection = True
        time.sleep(0.2)
        self.detect_human()
        self.simulate_detection = False
    
    def monitor_loop(self):
        """Continuous monitoring loop"""
        self.running = True
        while self.running:
            try:
                self.detect_human()
                time.sleep(0.1)  # 10Hz polling
            except Exception as e:
                print(f"[MOCK] Sensor ({self.location}) monitor error: {e}")
                time.sleep(1)
    
    def stop(self):
        """Stop monitoring"""
        self.running = False
        print(f"[MOCK] Sensor ({self.location}) stopped")


class SensorManagerMock:
    """Mock manager for both mmWave sensors"""
    
    def __init__(self):
        self.sensor_inside = MMWaveSensorMock('inside')
        self.sensor_outside = MMWaveSensorMock('outside')
    
    def initialize(self):
        """Initialize both sensors"""
        print("[MOCK] Initializing sensors (simulated)...")
        
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
        
        if inside_detected and not outside_detected:
            return "OUT"
        elif outside_detected and not inside_detected:
            return "IN"
        elif inside_detected and outside_detected:
            inside_time = self.sensor_inside.get_latest_detection()
            outside_time = self.sensor_outside.get_latest_detection()
            return "OUT" if inside_time > outside_time else "IN"
        
        return None
    
    def configure_range(self, distance: int):
        """Configure range for both sensors"""
        self.sensor_inside.configure_range(distance)
        self.sensor_outside.configure_range(distance)
    
    def trigger_inside_detection(self):
        """Manually trigger inside sensor (for testing)"""
        self.sensor_inside.trigger_detection()
    
    def trigger_outside_detection(self):
        """Manually trigger outside sensor (for testing)"""
        self.sensor_outside.trigger_detection()
    
    def shutdown(self):
        """Shutdown both sensors"""
        self.sensor_inside.stop()
        self.sensor_outside.stop()


# Global sensor manager instance
sensor_manager = SensorManagerMock()