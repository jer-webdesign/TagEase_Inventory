import json
import os
import uuid
import requests
from typing import List
from datetime import datetime
import traceback

def ensure_directory(filepath: str):
    """Ensure directory exists for file"""
    directory = os.path.dirname(filepath)
    if directory and not os.path.exists(directory):
        os.makedirs(directory)


def load_json_file(filepath: str, default=None):
    """Load JSON file with error handling"""
    if default is None:
        default = []
    
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading {filepath}: {e}")
    
    return default


def save_json_file(filepath: str, data):
    """Save data to JSON file"""
    try:
        ensure_directory(filepath)
        # Debug: show target path and permissions
        try:
            parent = os.path.dirname(filepath) or '.'
            stat_info = os.stat(parent)
            print(f"Saving JSON to: {filepath} (dir={parent}, mode={oct(stat_info.st_mode & 0o777)}, uid={stat_info.st_uid})")
        except Exception:
            # Non-fatal if stat fails
            print(f"Saving JSON to: {filepath}")

        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)

        # Verify write by checking file exists and is non-empty
        if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
            print(f"Successfully saved JSON ({os.path.getsize(filepath)} bytes)")
            return True
        else:
            print(f"Warning: file saved but size is 0 bytes: {filepath}")
            return False
    except Exception as e:
        # Print error and write full traceback to a local debug file in the same directory
        print(f"Error saving {filepath}: {e}")
        try:
            parent = os.path.dirname(filepath) or '.'
            debug_path = os.path.join(parent, 'last_save_error.log')
            with open(debug_path, 'a') as df:
                df.write(f"\n--- Save Error ({datetime.now().isoformat()}) for {filepath} ---\n")
                traceback.print_exc(file=df)
        except Exception:
            # If even logging fails, at least print the traceback to stdout
            traceback.print_exc()
        return False


def validate_direction(direction: str) -> bool:
    """Validate direction value"""
    return direction.upper() in ['IN', 'OUT']


def parse_date_filter(date_str: str) -> str:
    """Parse and validate date string"""
    try:
        # Validate date format
        datetime.strptime(date_str, "%Y-%m-%d-%H-%M-%S-%f")
        return date_str
    except ValueError:
        return None


def get_mac_address() -> str:
    """Get the MAC address of the system in standard format"""
    try:
        # Get the MAC address as a 48-bit integer
        mac_int = uuid.getnode()
        # Convert to hex string with colons (standard MAC address format)
        mac_hex = ':'.join(['{:02x}'.format((mac_int >> elements) & 0xff)
                            for elements in range(0, 8*6, 8)][::-1])
        return mac_hex.upper()
    except Exception as e:
        print(f"Error getting MAC address: {e}")
        return "00:00:00:00:00:00"


def convert_to_iso_format(calgary_timestamp: str) -> str:
    """
    Convert Calgary timezone format to ISO 8601 format for dispatcher API
    
    Args:
        calgary_timestamp: Format like "2025-12-06-03-45-23-456-PM"
        
    Returns:
        ISO 8601 format like "2025-12-04T11:37:18"
    """
    try:
        # Parse the Calgary format: YYYY-MM-DD-HH-MM-SS-mmm-AM/PM
        import re
        pattern = r'(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d+)-(AM|PM)'
        match = re.match(pattern, calgary_timestamp)
        
        if not match:
            # If format doesn't match, return current time in ISO format
            return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        
        year, month, day, hour, minute, second, millisecond, period = match.groups()
        
        # Convert 12-hour to 24-hour format
        hour = int(hour)
        if period == 'PM' and hour != 12:
            hour += 12
        elif period == 'AM' and hour == 12:
            hour = 0
        
        # Return ISO 8601 format (without milliseconds to match the sample)
        return f"{year}-{month}-{day}T{hour:02d}:{minute}:{second}"
        
    except Exception as e:
        print(f"Error converting timestamp format: {e}")
        # Fallback to current time in ISO format
        return datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def send_to_dispatcher(dispatcher_url: str, tag_id: str, mac_address: str, 
                       direction: str, read_date: str, timeout: int = 5) -> bool:
    """
    Send tracking data to the dispatcher API endpoint
    
    Args:
        dispatcher_url: Base URL of the dispatcher API
        tag_id: RFID tag ID
        mac_address: System MAC address
        direction: Direction of movement (IN/OUT)
        read_date: Timestamp of the read
        timeout: Request timeout in seconds
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Prepare the payload
        payload = {
            "tagId": tag_id,
            "macAddress": mac_address,
            "direction": direction,
            "readDate": read_date
        }
        
        # Make the POST request
        response = requests.post(
            dispatcher_url,
            json=payload,
            timeout=timeout,
            headers={'Content-Type': 'application/json'}
        )
        
        # Check if request was successful
        if response.status_code in [200, 201, 202]:
            print(f"✓ Successfully sent to dispatcher: {tag_id} - {direction}")
            return True
        else:
            print(f"⚠ Dispatcher returned status {response.status_code}: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print(f"⚠ Dispatcher request timeout after {timeout}s")
        return False
    except requests.exceptions.ConnectionError:
        print(f"⚠ Failed to connect to dispatcher at {dispatcher_url}")
        return False
    except Exception as e:
        print(f"⚠ Error sending to dispatcher: {e}")
        return False