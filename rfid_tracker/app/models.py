from datetime import datetime
import pytz
from dataclasses import dataclass, asdict
from typing import Optional

@dataclass
class TrackingRecord:
    """Model for tracking record"""
    rfid_tag: str
    direction: str  # 'IN' or 'OUT'
    read_date: str
    
    @classmethod
    def create(cls, rfid_tag: str, direction: str):
        """Create new tracking record with timestamp in Calgary timezone (12-hour format)"""
        # Get current time in Calgary timezone (America/Edmonton = MST/MDT)
        calgary_tz = pytz.timezone('America/Edmonton')
        dt = datetime.now(calgary_tz)
        # Format: YYYY-MM-DD-HH-MM-SS-mmm-AM/PM (12-hour format)
        timestamp = dt.strftime("%Y-%m-%d-%I-%M-%S-%f-")[:-3] + dt.strftime("%p")
        return cls(rfid_tag=rfid_tag, direction=direction, read_date=timestamp)
    
    def to_dict(self):
        """Convert to dictionary"""
        return asdict(self)


@dataclass
class SystemStatus:
    """Model for system status"""
    rfid_reader: str = 'disconnected'
    sensor_inside: str = 'disconnected'
    sensor_outside: str = 'disconnected'
    last_tag_read: Optional[dict] = None
    total_records: int = 0
    
    def to_dict(self):
        """Convert to dictionary"""
        return asdict(self)