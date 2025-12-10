#!/usr/bin/env python3
"""
Test script to verify dispatcher POST functionality
Tests the helper functions directly without importing the Flask app
"""
import os
import sys
import uuid
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


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
        
        print(f"Payload: {payload}")
        
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
            print(f"  Response: {response.text}")
            return True
        else:
            print(f"⚠ Dispatcher returned status {response.status_code}: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print(f"⚠ Dispatcher request timeout after {timeout}s")
        return False
    except requests.exceptions.ConnectionError as e:
        print(f"⚠ Failed to connect to dispatcher at {dispatcher_url}")
        print(f"  Error: {e}")
        return False
    except Exception as e:
        print(f"⚠ Error sending to dispatcher: {e}")
        return False


def test_get_mac_address():
    """Test MAC address retrieval"""
    print("\n=== Testing MAC Address Retrieval ===")
    mac = get_mac_address()
    print(f"System MAC Address: {mac}")
    assert mac != "00:00:00:00:00:00", "Failed to retrieve MAC address"
    assert ":" in mac, "MAC address format is incorrect"
    print("✓ MAC address retrieved successfully")
    return mac


def test_send_to_dispatcher():
    """Test sending data to dispatcher"""
    print("\n=== Testing Dispatcher POST ===")
    
    # Get dispatcher URL from environment
    dispatcher_url = os.getenv('DISPATCHER_URL', 'http://138.68.255.116:8080')
    
    print(f"Dispatcher URL: {dispatcher_url}")
    
    # Create test data
    mac_address = get_mac_address()
    tag_id = "3000E2000017570D01110960BABC0203"
    direction = "IN"
    
    # Create timestamp in ISO 8601 format (matching the sample)
    read_date = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    
    print(f"\nTest Data:")
    print(f"  Tag ID: {tag_id}")
    print(f"  MAC Address: {mac_address}")
    print(f"  Direction: {direction}")
    print(f"  Read Date: {read_date}")
    
    # Send to dispatcher
    print(f"\nSending POST to {dispatcher_url}...")
    success = send_to_dispatcher(
        dispatcher_url=dispatcher_url,
        tag_id=tag_id,
        mac_address=mac_address,
        direction=direction,
        read_date=read_date,
        timeout=10
    )
    
    if success:
        print("✓ Data sent successfully to dispatcher")
    else:
        print("⚠ Failed to send data to dispatcher (this may be expected if the URL is not reachable)")
    
    return success


def main():
    """Run all tests"""
    print("=" * 60)
    print("Dispatcher Integration Test")
    print("=" * 60)
    
    try:
        test_get_mac_address()
        test_send_to_dispatcher()
        
        print("\n" + "=" * 60)
        print("Test completed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
