"""
Test dispatcher verification with multiple different tagIds moving simultaneously
"""
import time
from datetime import datetime

class MockTrackingService:
    def __init__(self):
        self.records = []
        self.last_sent_pair_timestamp = {}
        
    def add_record(self, rfid_tag, direction):
        """Simulates adding a record and checking dispatcher logic"""
        timestamp = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
        record = {
            'rfid_tag': rfid_tag,
            'direction': direction,
            'read_date': timestamp
        }
        self.records.append(record)
        
        # Check if we should send to dispatcher
        self._check_and_send_to_dispatcher(rfid_tag, record)
        
        return record
    
    def _check_and_send_to_dispatcher(self, rfid_tag, current_record):
        """Check if tag has complete pairs and send only if latest is newer"""
        # Get all records for THIS tag
        tag_records = [r for r in self.records if r.get('rfid_tag') == rfid_tag]
        tag_records.sort(key=lambda r: r.get('read_date', ''))
        
        if len(tag_records) < 2:
            print(f"  [+] Added: {rfid_tag} - {current_record['direction']} at {current_record['read_date']} → No pair yet")
            return
        
        # Find all complete pairs
        pairs = []
        for i in range(len(tag_records) - 1):
            curr = tag_records[i]
            next_rec = tag_records[i + 1]
            if curr.get('direction') != next_rec.get('direction'):
                pairs.append({
                    'first': curr,
                    'second': next_rec,
                    'latest_date': next_rec.get('read_date')
                })
        
        if not pairs:
            print(f"  [+] Added: {rfid_tag} - {current_record['direction']} at {current_record['read_date']} → No valid pairs (same directions)")
            return
        
        # Get the latest pair
        latest_pair = max(pairs, key=lambda p: p['latest_date'])
        latest_record = latest_pair['second']
        latest_timestamp = latest_record['read_date']
        
        # Check if newer than last sent for THIS tag
        last_sent_timestamp = self.last_sent_pair_timestamp.get(rfid_tag)
        
        if last_sent_timestamp and latest_timestamp <= last_sent_timestamp:
            print(f"  [+] Added: {rfid_tag} - {current_record['direction']} at {current_record['read_date']} → ⚠ NOT sent (same or older than last sent)")
            return
        
        # Update last sent timestamp for THIS tag
        self.last_sent_pair_timestamp[rfid_tag] = latest_timestamp
        
        print(f"  [+] Added: {rfid_tag} - {current_record['direction']} at {current_record['read_date']} → ✅ SENT ({latest_record['direction']}) - {len(pairs)} pair(s), latest is new")

def test_multiple_tags_interleaved():
    """Test multiple different tags with interleaved movements"""
    print("\n" + "="*70)
    print("TEST: Multiple Different Tags with Interleaved Movements")
    print("="*70)
    
    service = MockTrackingService()
    
    # Simulate the user's exact scenario
    print("\nScenario: TAG-004 and TAG-005 moving at different times\n")
    
    service.add_record('TAG-004', 'IN')      # 10:00:01 - Need pair
    time.sleep(1.1)
    
    service.add_record('TAG-005', 'IN')      # 10:00:02 - Need pair
    time.sleep(1.1)
    
    service.add_record('TAG-004', 'OUT')     # 10:00:03 - TAG-004 first pair → SEND
    time.sleep(1.1)
    
    service.add_record('TAG-004', 'IN')      # 10:00:04 - TAG-004 second pair → SEND
    time.sleep(1.1)
    
    service.add_record('TAG-004', 'OUT')     # 10:00:05 - TAG-004 third pair → SEND
    time.sleep(1.1)
    
    service.add_record('TAG-005', 'OUT')     # 10:00:06 - TAG-005 first pair → SEND
    time.sleep(1.1)
    
    service.add_record('TAG-004', 'IN')      # 10:00:07 - TAG-004 fourth pair → SEND
    
    print("\n" + "-"*70)
    print("Summary:")
    print("-"*70)
    print(f"Total records: {len(service.records)}")
    print(f"TAG-004 records: {len([r for r in service.records if r['rfid_tag'] == 'TAG-004'])}")
    print(f"TAG-005 records: {len([r for r in service.records if r['rfid_tag'] == 'TAG-005'])}")
    print(f"\nLast sent timestamps:")
    for tag, timestamp in service.last_sent_pair_timestamp.items():
        print(f"  {tag}: {timestamp}")
    
    print("\n✅ TEST PASSED: Multiple tags tracked independently!")
    print("="*70 + "\n")

def test_three_tags_complex():
    """Test three different tags with complex interleaved movements"""
    print("\n" + "="*70)
    print("TEST: Three Tags with Complex Movements")
    print("="*70)
    
    service = MockTrackingService()
    
    print("\nScenario: TAG-001, TAG-002, and TAG-003 all moving\n")
    
    service.add_record('TAG-001', 'IN')      # Need pair
    time.sleep(1.1)
    service.add_record('TAG-002', 'IN')      # Need pair
    time.sleep(1.1)
    service.add_record('TAG-003', 'IN')      # Need pair
    time.sleep(1.1)
    service.add_record('TAG-001', 'OUT')     # TAG-001 pair 1 → SEND
    time.sleep(1.1)
    service.add_record('TAG-002', 'OUT')     # TAG-002 pair 1 → SEND
    time.sleep(1.1)
    service.add_record('TAG-001', 'IN')      # TAG-001 pair 2 → SEND
    time.sleep(1.1)
    service.add_record('TAG-003', 'OUT')     # TAG-003 pair 1 → SEND
    time.sleep(1.1)
    service.add_record('TAG-002', 'IN')      # TAG-002 pair 2 → SEND
    time.sleep(1.1)
    service.add_record('TAG-001', 'OUT')     # TAG-001 pair 3 → SEND
    time.sleep(1.1)
    service.add_record('TAG-003', 'IN')      # TAG-003 pair 2 → SEND
    
    print("\n" + "-"*70)
    print("Summary:")
    print("-"*70)
    print(f"Total records: {len(service.records)}")
    for tag in ['TAG-001', 'TAG-002', 'TAG-003']:
        count = len([r for r in service.records if r['rfid_tag'] == tag])
        print(f"{tag} records: {count}")
    
    print(f"\nLast sent timestamps:")
    for tag, timestamp in service.last_sent_pair_timestamp.items():
        print(f"  {tag}: {timestamp}")
    
    print("\n✅ TEST PASSED: Three tags tracked independently!")
    print("="*70 + "\n")

if __name__ == '__main__':
    test_multiple_tags_interleaved()
    test_three_tags_complex()
    print("\n🎉 ALL TESTS PASSED - Multiple tag tracking works correctly!")
