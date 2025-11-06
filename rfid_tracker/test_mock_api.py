#!/usr/bin/env python3
"""
Test script for RFID Tracker Mock API (Cross-platform)
Works on Windows, macOS, and Linux
"""

import requests
import json
import time
import sys

BASE_URL = "http://localhost:5000"

# ANSI color codes
class Colors:
    GREEN = '\033[0;32m'
    BLUE = '\033[0;34m'
    YELLOW = '\033[1;33m'
    RED = '\033[0;31m'
    NC = '\033[0m'  # No Color

def print_header(text):
    """Print section header"""
    print(f"\n{Colors.BLUE}=== {text} ==={Colors.NC}")

def print_json(data):
    """Pretty print JSON data"""
    print(json.dumps(data, indent=2))

def make_request(method, endpoint, data=None):
    """Make HTTP request and return response"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == 'GET':
            response = requests.get(url)
        elif method == 'POST':
            response = requests.post(url, json=data)
        elif method == 'DELETE':
            response = requests.delete(url)
        
        return response.json()
    except requests.exceptions.ConnectionError:
        print(f"{Colors.RED}Error: Cannot connect to server at {BASE_URL}{Colors.NC}")
        print("Make sure the server is running: python app.py")
        sys.exit(1)
    except Exception as e:
        print(f"{Colors.RED}Error: {e}{Colors.NC}")
        return None

def run_tests():
    """Run all API tests"""
    print("=" * 50)
    print("RFID Asset Tracking - Mock API Tests")
    print("=" * 50)
    
    # Test 1: Server Status
    print_header("1. Server Status")
    response = make_request('GET', '/')
    print_json(response)
    
    # Test 2: Health Check
    print_header("2. Health Check")
    response = make_request('GET', '/api/health')
    print_json(response)
    
    # Test 3: System Status
    print_header("3. System Status")
    response = make_request('GET', '/api/status')
    print_json(response)
    
    # Test 4: Get Sample Tags
    print_header("4. Get Sample RFID Tags")
    response = make_request('GET', '/api/test/sample-tags')
    print_json(response)
    
    # Test 5: Simulate Asset Moving IN
    print_header("5. Simulate Asset Moving IN")
    print(f"{Colors.YELLOW}Simulating person bringing asset into room...{Colors.NC}")
    response = make_request('POST', '/api/test/simulate-movement', 
                           {'direction': 'IN'})
    print_json(response)
    time.sleep(1)
    
    # Test 6: Simulate Asset Moving OUT
    print_header("6. Simulate Asset Moving OUT")
    print(f"{Colors.YELLOW}Simulating person taking asset out of room...{Colors.NC}")
    response = make_request('POST', '/api/test/simulate-movement', 
                           {'direction': 'OUT'})
    print_json(response)
    time.sleep(1)
    
    # Test 7: Simulate Custom Tag IN
    print_header("7. Simulate Custom Tag Moving IN")
    print(f"{Colors.YELLOW}Simulating specific asset (E200001234567890ABCD5678) moving in...{Colors.NC}")
    response = make_request('POST', '/api/test/simulate-movement', 
                           {'direction': 'IN', 'tag_id': 'E200001234567890ABCD1234'})
    print_json(response)
    time.sleep(1)
    
    # Test 8: Simulate Custom Tag OUT
    print_header("8. Simulate Custom Tag Moving OUT")
    print(f"{Colors.YELLOW}Simulating specific asset (TABLE_005) moving out...{Colors.NC}")
    response = make_request('POST', '/api/test/simulate-movement', 
                           {'direction': 'OUT', 'tag_id': 'E200001234567890ABCD5678'})
    print_json(response)
    time.sleep(1)
    
    # Test 9: Get All Records
    print_header("9. Get All Tracking Records")
    response = make_request('GET', '/api/records')
    print_json(response)
    
    # Test 10: Get Recent Records
    print_header("10. Get Recent 5 Records")
    response = make_request('GET', '/api/records?limit=5')
    print_json(response)
    
    # Test 11: Get IN Records Only
    print_header("11. Get IN Records Only")
    response = make_request('GET', '/api/records?direction=IN')
    print_json(response)
    
    # Test 12: Get Statistics
    print_header("12. Get Tracking Statistics")
    response = make_request('GET', '/api/statistics')
    print_json(response)
    
    # Test 13: Manual Record Addition
    print_header("13. Add Manual Record")
    response = make_request('POST', '/api/records', 
                           {'rfid_tag': 'E200001234567890ABCD1234', 'direction': 'IN'})
    print_json(response)
    
    # Test 14: Get Specific Tag Records
    print_header("14. Get Records for E200001234567890ABCD5678")
    response = make_request('GET', '/api/records/E200001234567890ABCD5678')
    print_json(response)
    
    # Test 15: Multiple Movements Simulation
    print_header("15. Simulate Multiple Movements")
    print(f"{Colors.YELLOW}Simulating 5 assets moving in...{Colors.NC}")
    for i in range(1, 6):
        tag = f"ASSET_00{i}"
        print(f"  - Moving {tag} IN")
        make_request('POST', '/api/test/simulate-movement', 
                    {'direction': 'IN', 'tag_id': tag})
        time.sleep(0.5)
    
    print(f"{Colors.YELLOW}Simulating 3 assets moving out...{Colors.NC}")
    for i in range(1, 4):
        tag = f"ASSET_00{i}"
        print(f"  - Moving {tag} OUT")
        make_request('POST', '/api/test/simulate-movement', 
                    {'direction': 'OUT', 'tag_id': tag})
        time.sleep(0.5)
    
    # Test 16: Final Statistics
    print_header("16. Final Statistics After Multiple Movements")
    response = make_request('GET', '/api/statistics')
    print_json(response)
    
    # Test 17: Configure RFID Power
    print_header("17. Configure RFID Power")
    response = make_request('POST', '/api/config/rfid-power', 
                           {'power': 28})
    print_json(response)
    
    # Test 18: Configure Sensor Range
    print_header("18. Configure Sensor Range")
    response = make_request('POST', '/api/config/sensor-range', 
                           {'range': 8})
    print_json(response)
    
    # Test 19: Test Scenarios List
    print_header("19. Get Test Scenarios")
    response = make_request('GET', '/api/test/scenarios')
    print_json(response)
    
    # Summary
    print(f"\n{Colors.GREEN}={'=' * 50}{Colors.NC}")
    print(f"{Colors.GREEN}All tests completed!{Colors.NC}")
    print(f"{Colors.GREEN}{'=' * 50}{Colors.NC}")
    print("\nCheck the results above to verify all endpoints are working correctly.")
    print(f"You can also view all records at: {BASE_URL}/api/records")

if __name__ == '__main__':
    try:
        run_tests()
    except KeyboardInterrupt:
        print(f"\n{Colors.YELLOW}Tests interrupted by user{Colors.NC}")
        sys.exit(0)