#!/bin/bash
# Test script for RFID Tracker Mock API

BASE_URL="http://localhost:5000"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "RFID Asset Tracking - Mock API Tests"
echo "========================================="

# Function to print section headers
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Function to pretty print JSON
print_json() {
    if command -v jq &> /dev/null; then
        echo "$1" | jq '.'
    else
        echo "$1" | python3 -m json.tool 2>/dev/null || echo "$1"
    fi
}

# Test 1: Check if server is running
print_header "1. Server Status"
response=$(curl -s $BASE_URL)
print_json "$response"

# Test 2: Health Check
print_header "2. Health Check"
response=$(curl -s $BASE_URL/api/health)
print_json "$response"

# Test 3: System Status
print_header "3. System Status"
response=$(curl -s $BASE_URL/api/status)
print_json "$response"

# Test 4: Get Sample Tags
print_header "4. Get Sample RFID Tags"
response=$(curl -s $BASE_URL/api/test/sample-tags)
print_json "$response"

# Test 5: Simulate Asset Moving IN
print_header "5. Simulate Asset Moving IN"
echo -e "${YELLOW}Simulating person bringing asset into room...${NC}"
response=$(curl -s -X POST $BASE_URL/api/test/simulate-movement \
  -H "Content-Type: application/json" \
  -d '{"direction": "IN"}')
print_json "$response"
sleep 1

# Test 6: Simulate Asset Moving OUT
print_header "6. Simulate Asset Moving OUT"
echo -e "${YELLOW}Simulating person taking asset out of room...${NC}"
response=$(curl -s -X POST $BASE_URL/api/test/simulate-movement \
  -H "Content-Type: application/json" \
  -d '{"direction": "OUT"}')
print_json "$response"
sleep 1

# Test 7: Simulate Custom Tag IN
print_header "7. Simulate Custom Tag Moving IN"
echo -e "${YELLOW}Simulating specific asset (E200001234567890ABCD5678) moving in...${NC}"
response=$(curl -s -X POST $BASE_URL/api/test/simulate-movement \
  -H "Content-Type: application/json" \
  -d '{"direction": "IN", "tag_id": "E200001234567890ABCD5678"}')
print_json "$response"
sleep 1

# Test 8: Simulate Custom Tag OUT
print_header "8. Simulate Custom Tag Moving OUT"
echo -e "${YELLOW}Simulating specific asset (TABLE_005) moving out...${NC}"
response=$(curl -s -X POST $BASE_URL/api/test/simulate-movement \
  -H "Content-Type: application/json" \
  -d '{"direction": "OUT", "tag_id": "TABLE_005"}')
print_json "$response"
sleep 1

# Test 9: Get All Records
print_header "9. Get All Tracking Records"
response=$(curl -s "$BASE_URL/api/records")
print_json "$response"

# Test 10: Get Recent Records
print_header "10. Get Recent 5 Records"
response=$(curl -s "$BASE_URL/api/records?limit=5")
print_json "$response"

# Test 11: Get IN Records Only
print_header "11. Get IN Records Only"
response=$(curl -s "$BASE_URL/api/records?direction=IN")
print_json "$response"

# Test 12: Get Statistics
print_header "12. Get Tracking Statistics"
response=$(curl -s $BASE_URL/api/statistics)
print_json "$response"

# Test 13: Manual Record Addition
print_header "13. Add Manual Record"
response=$(curl -s -X POST $BASE_URL/api/records \
  -H "Content-Type: application/json" \
  -d '{"rfid_tag": "E200001234567890ABCD1234", "direction": "IN"}')
print_json "$response"

# Test 14: Get Specific Tag Records
print_header "14. Get Records for E200001234567890ABCD5678"
response=$(curl -s "$BASE_URL/api/records/E200001234567890ABCD5678")
print_json "$response"

# Test 15: Multiple Movements Simulation
print_header "15. Simulate Multiple Movements"
echo -e "${YELLOW}Simulating 5 assets moving in...${NC}"
for i in {1..5}; do
    tag="ASSET_00$i"
    echo "  - Moving $tag IN"
    curl -s -X POST $BASE_URL/api/test/simulate-movement \
      -H "Content-Type: application/json" \
      -d "{\"direction\": \"IN\", \"tag_id\": \"$tag\"}" > /dev/null
    sleep 0.5
done

echo -e "${YELLOW}Simulating 3 assets moving out...${NC}"
for i in {1..3}; do
    tag="ASSET_00$i"
    echo "  - Moving $tag OUT"
    curl -s -X POST $BASE_URL/api/test/simulate-movement \
      -H "Content-Type: application/json" \
      -d "{\"direction\": \"OUT\", \"tag_id\": \"$tag\"}" > /dev/null
    sleep 0.5
done

# Test 16: Final Statistics
print_header "16. Final Statistics After Multiple Movements"
response=$(curl -s $BASE_URL/api/statistics)
print_json "$response"

# Test 17: Configure RFID Power
print_header "17. Configure RFID Power"
response=$(curl -s -X POST $BASE_URL/api/config/rfid-power \
  -H "Content-Type: application/json" \
  -d '{"power": 28}')
print_json "$response"

# Test 18: Configure Sensor Range
print_header "18. Configure Sensor Range"
response=$(curl -s -X POST $BASE_URL/api/config/sensor-range \
  -H "Content-Type: application/json" \
  -d '{"range": 8}')
print_json "$response"

# Test 19: Test Scenarios List
print_header "19. Get Test Scenarios"
response=$(curl -s $BASE_URL/api/test/scenarios)
print_json "$response"

echo -e "\n${GREEN}=========================================${NC}"
echo -e "${GREEN}All tests completed!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Check the results above to verify all endpoints are working correctly."
echo "You can also view all records at: $BASE_URL/api/records"