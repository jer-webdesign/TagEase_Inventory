"""
Mock RFID Reader Service for Testing Without Hardware
"""
import time
import threading
import random
from flask import current_app
from app.services.tracking_service import tracking_service
from app.services.sensor_service_mock import sensor_manager

class RFIDReaderMock:
    """Mock service for M5Stack UHF RFID Reader"""
    
    def __init__(self):
        self.running = False
        self.read_power = 26
        self.simulate_tag_id = None  # Manual tag trigger
        
        # Sample RFID tags for simulation
        self.sample_tags = [
            "E200001234567890ABCD1234",
            "E200001234567890ABCD5678",
            "E200001234567890ABCD9012",
            "E200001234567890ABCD3456",
            "E200001234567890ABCD7890"
        ]
    
    def connect(self) -> bool:
        """Simulate connection to RFID reader"""
        try:
            time.sleep(0.5)  # Simulate connection delay
            
            self.read_power = current_app.config['RFID_READ_POWER']
            
            tracking_service.update_status(rfid_reader='connected (mock)')
            print(f"[MOCK] RFID reader connected (simulated)")
            return True
            
        except Exception as e:
            print(f"[MOCK] Error connecting RFID reader: {e}")
            tracking_service.update_status(rfid_reader='error')
            return False
    
    def configure_power(self, power_dbm: int):
        """Configure read power (controls distance)"""
        self.read_power = power_dbm
        print(f"[MOCK] RFID power set to {power_dbm} dBm")
    
    def read_tag(self) -> str:
        """Simulate reading RFID tag"""
        # Check for manual trigger first
        if self.simulate_tag_id:
            tag = self.simulate_tag_id
            self.simulate_tag_id = None
            return tag
        
        # Randomly simulate tag reads for testing (very low probability)
        if random.random() < 0.02:  # 2% chance
            return random.choice(self.sample_tags)
        
        return None
    
    def trigger_tag_read(self, tag_id: str = None):
        """Manually trigger a tag read (for testing)"""
        if tag_id is None:
            tag_id = random.choice(self.sample_tags)
        self.simulate_tag_id = tag_id
        print(f"[MOCK] Tag read triggered: {tag_id}")
    
    def monitor_loop(self):
        """Continuous RFID reading loop"""
        self.running = True
        
        while self.running:
            try:
                tag_id = self.read_tag()
                
                if tag_id:
                    # Check if human was detected
                    inside_detected, outside_detected = sensor_manager.check_human_detection()
                    
                    if inside_detected or outside_detected:
                        direction = sensor_manager.determine_direction()
                        
                        if direction:
                            tracking_service.add_record(tag_id, direction)
                    else:
                        print(f"[MOCK] Tag {tag_id} ignored - no human detection")
                
                time.sleep(0.1)  # 10Hz polling
                
            except Exception as e:
                print(f"[MOCK] RFID monitor error: {e}")
                time.sleep(1)
    
    def stop(self):
        """Stop monitoring"""
        self.running = False
        print("[MOCK] RFID reader stopped")


# Global RFID reader instance
rfid_reader = RFIDReaderMock()