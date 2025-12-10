#!/usr/bin/env python3
"""
Test script to verify dispatcher verification logic:
- Tag must have minimum 2 records
- Tag must have both IN and OUT directions
- Only the latest record is sent to dispatcher
"""
import os
import sys
import uuid
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def get_mac_address() -> str:
    """Get the MAC address of the system in standard format"""
    try:
        mac_int = uuid.getnode()
        mac_hex = ':'.join(['{:02x}'.format((mac_int >> elements) & 0xff)
                            for elements in range(0, 8*6, 8)][::-1])
        return mac_hex.upper()
    except Exception as e:
        print(f"Error getting MAC address: {e}")
        return "00:00:00:00:00:00"


def send_to_dispatcher(dispatcher_url: str, tag_id: str, mac_address: str, 
                       direction: str, read_date: str, timeout: int = 5) -> bool:
    """Send tracking data to the dispatcher API endpoint"""
    try:
        payload = {
            "tagId": tag_id,
            "macAddress": mac_address,
            "direction": direction,
            "readDate": read_date
        }
        
        print(f"  Sending: {payload}")
        
        response = requests.post(
            dispatcher_url,
            json=payload,
            timeout=timeout,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code in [200, 201, 202]:
            print(f"  ✓ Success: {response.status_code}")
            print(f"  Response: {response.text[:100]}")
            return True
        else:
            print(f"  ⚠ Failed: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print(f"  ⚠ Timeout after {timeout}s")
        return False
    except requests.exceptions.ConnectionError as e:
        print(f"  ⚠ Connection error: {e}")
        return False
    except Exception as e:
        print(f"  ⚠ Error: {e}")
        return False


class MockTrackingService:
    """Mock tracking service to simulate the verification logic"""
    
    def __init__(self):
        self.records = []
        self.dispatcher_url = os.getenv('DISPATCHER_URL', 'http://138.68.255.116:8080/items')
        self.mac_address = get_mac_address()
        self.last_sent_pair_timestamp = {}
    
    def add_record(self, tag_id: str, direction: str, delay_ms: int = 0):
        """Add a record and check if dispatcher criteria is met"""
        if delay_ms > 0:
            import time
            time.sleep(delay_ms / 1000.0)
        
        timestamp = datetime.now()
        iso_timestamp = timestamp.strftime("%Y-%m-%dT%H:%M:%S")
        
        record = {
            'rfid_tag': tag_id,
            'direction': direction.upper(),
            'read_date': iso_timestamp
        }
        
        self.records.append(record)
        print(f"\n[+] Added: {tag_id} - {direction} at {iso_timestamp}")
        
        # Check verification criteria and send current record if met
        self._check_and_send_to_dispatcher(tag_id, record)
    
    def _check_and_send_to_dispatcher(self, rfid_tag: str, current_record: dict):
        """Check if tag meets criteria and send only if latest pair is newer than last sent"""
        # Get all records for this tag, sorted by date
        tag_records = [r for r in self.records if r.get('rfid_tag') == rfid_tag]
        tag_records.sort(key=lambda r: r.get('read_date', ''))
        
        print(f"  Current records for {rfid_tag}: {len(tag_records)}")
        
        if len(tag_records) < 2:
            print(f"  ⚠ Need minimum 2 records for a pair (has {len(tag_records)})")
            return
        
        # Find all complete pairs (consecutive records with different directions)
        pairs = []
        for i in range(len(tag_records) - 1):
            curr = tag_records[i]
            next_rec = tag_records[i + 1]
            curr_dir = curr.get('direction')
            next_dir = next_rec.get('direction')
            
            # Check if this forms a valid pair (different directions)
            if curr_dir != next_dir:
                pairs.append({
                    'first': curr,
                    'second': next_rec,
                    'latest_date': next_rec.get('read_date')
                })
        
        print(f"  Complete pairs found: {len(pairs)}")
        
        if not pairs:
            print(f"  ⚠ No complete IN/OUT pairs found")
            return
        
        # Get the latest pair (most recent second record)
        latest_pair = max(pairs, key=lambda p: p['latest_date'])
        latest_record = latest_pair['second']
        latest_timestamp = latest_record['read_date']
        
        # Check if this latest pair is newer than what we've already sent
        last_sent_timestamp = self.last_sent_pair_timestamp.get(rfid_tag)
        
        if last_sent_timestamp and latest_timestamp <= last_sent_timestamp:
            print(f"  ⚠ Latest pair (at {latest_timestamp}) not newer than last sent (at {last_sent_timestamp})")
            return
        
        # Update the last sent timestamp for this tag
        self.last_sent_pair_timestamp[rfid_tag] = latest_timestamp
        
        print(f"  ✓ Sending LATEST of {len(pairs)} pair(s): {latest_record['direction']} at {latest_timestamp}")
        print(f"  Sending to dispatcher: {self.dispatcher_url}")
        
        send_to_dispatcher(
            self.dispatcher_url,
            rfid_tag,
            self.mac_address,
            latest_record['direction'],
            latest_record['read_date']
        )


def test_scenario_1():
    """Test: Single record (should NOT send)"""
    print("\n" + "="*70)
    print("TEST 1: Single Record - Should NOT Send to Dispatcher")
    print("="*70)
    
    service = MockTrackingService()
    service.add_record("TAG-001", "IN")
    
    print("\n✓ Test 1 Complete: No dispatcher call expected")


def test_scenario_2():
    """Test: Two records same direction (should NOT send)"""
    print("\n" + "="*70)
    print("TEST 2: Two Records Same Direction - Should NOT Send to Dispatcher")
    print("="*70)
    
    service = MockTrackingService()
    service.add_record("TAG-002", "IN")
    service.add_record("TAG-002", "IN")
    
    print("\n✓ Test 2 Complete: No dispatcher call expected")


def test_scenario_3():
    """Test: IN then OUT (should send OUT - latest)"""
    print("\n" + "="*70)
    print("TEST 3: IN then OUT - Should Send Latest (OUT) to Dispatcher")
    print("="*70)
    
    service = MockTrackingService()
    service.add_record("TAG-003", "IN")
    service.add_record("TAG-003", "OUT")
    
    print("\n✓ Test 3 Complete: Dispatcher should have received OUT record")


def test_scenario_4():
    """Test: OUT then IN (should send IN - latest)"""
    print("\n" + "="*70)
    print("TEST 4: OUT then IN - Should Send Latest (IN) to Dispatcher")
    print("="*70)
    
    service = MockTrackingService()
    service.add_record("TAG-004", "OUT")
    service.add_record("TAG-004", "IN")
    
    print("\n✓ Test 4 Complete: Dispatcher should have received IN record")


def test_scenario_5():
    """Test: Multiple movements - should send ONLY when latest pair changes"""
    print("\n" + "="*70)
    print("TEST 5: Multiple Movements - Should Send ONLY Latest Pair")
    print("="*70)
    
    service = MockTrackingService()
    service.add_record("TAG-005", "IN", delay_ms=100)    # Record 1: No pair yet
    service.add_record("TAG-005", "OUT", delay_ms=100)   # Record 2: Pair 1 (IN,OUT) is latest → SENT
    service.add_record("TAG-005", "IN", delay_ms=100)    # Record 3: Pair 2 (OUT,IN) is now latest → SENT
    service.add_record("TAG-005", "OUT", delay_ms=100)   # Record 4: Pair 3 (IN,OUT) is now latest → SENT
    service.add_record("TAG-005", "IN", delay_ms=100)    # Record 5: Pair 4 (OUT,IN) is now latest → SENT
    
    print("\n✓ Test 5 Complete: Each time the latest pair changes, it's sent")


def main():
    """Run all test scenarios"""
    print("="*70)
    print("DISPATCHER VERIFICATION LOGIC TEST")
    print("="*70)
    print(f"Dispatcher URL: {os.getenv('DISPATCHER_URL', 'http://138.68.255.116:8080/items')}")
    print(f"MAC Address: {get_mac_address()}")
    
    try:
        test_scenario_1()
        test_scenario_2()
        test_scenario_3()
        test_scenario_4()
        test_scenario_5()
        
        print("\n" + "="*70)
        print("ALL TESTS COMPLETED")
        print("="*70)
        
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
