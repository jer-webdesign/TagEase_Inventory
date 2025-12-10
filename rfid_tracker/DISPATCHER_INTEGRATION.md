# Dispatcher Integration Documentation

## Overview
The RFID tracking system automatically sends tracking data to a remote dispatcher API endpoint when specific criteria are met. The system verifies that a tag has moved both IN and OUT before sending data to ensure complete movement tracking.

## Verification Logic

**Requirements before sending to dispatcher:**
1. ✅ Must have **at least 2 records** forming valid pairs
2. ✅ Pairs are formed by consecutive records with different directions
3. ✅ Only sends when the **latest pair has a newer timestamp** than previously sent

**How it works:**
- System evaluates ALL pairs formed by the tag's movement history
- Identifies the **latest pair** based on the second record's timestamp
- Compares this timestamp with the last sent pair's timestamp
- **Sends ONLY if the latest pair is newer** than what was previously sent
- This prevents duplicate sends and ensures only the most recent movement is reported

**Pair Formation:**
- A pair is two consecutive records with different directions
- Example: Record 1 (IN@10:00:01) + Record 2 (OUT@10:00:02) = Pair ending at 10:00:02
- Multiple pairs can exist, but only the most recent one matters for sending

## Configuration

### Environment Variable
Add the following to your `.env` file with the **complete API endpoint URL**:
```env
DISPATCHER_URL="http://138.68.255.116:8080/api/your-endpoint"
```

**Important:** The `DISPATCHER_URL` should include the full path to the API endpoint that accepts the tracking data POST requests, not just the base URL. For example:
- ✓ Correct: `http://138.68.255.116:8080/api/tracking` 
- ✓ Correct: `http://138.68.255.116:8080/rfid/events`
- ✗ Incorrect: `http://138.68.255.116:8080` (missing endpoint path)

The dispatcher URL is automatically loaded from the environment and made available through Flask's configuration system.

## API Payload Format

When a tag is read, the system sends a POST request with the following JSON structure:

```json
{
  "tagId": "string",
  "macAddress": "string",
  "direction": "string",
  "readDate": "string"
}
```

### Field Descriptions

- **tagId**: The RFID tag identifier that was read
- **macAddress**: The MAC address of the system reading the tag (in format XX:XX:XX:XX:XX:XX)
- **direction**: The direction of movement, either "IN" or "OUT"
- **readDate**: Timestamp in Calgary timezone (MST/MDT) format: YYYY-MM-DD-HH-MM-SS-mmm-AM/PM

### Example Payload

```json
{
  "tagId": "E2001234567890123456",
  "macAddress": "B8:27:EB:12:34:56",
  "direction": "IN",
  "readDate": "2025-12-06-03-45-23-456-PM"
}
```

## Example Scenarios

### Scenario 1: First Read (No Send)
```
10:00:01 - TAG-001 reads IN
→ Only 1 record, needs 2 to form a pair
→ ⚠ NOT sent to dispatcher
```

### Scenario 2: Same Direction Twice (No Send)
```
10:00:01 - TAG-002 reads IN
10:00:02 - TAG-002 reads IN
→ Has 2 records but both are IN (no valid pair)
→ ⚠ NOT sent to dispatcher
```

### Scenario 3: Complete Movement (Send!)
```
10:00:01 - TAG-003 reads IN
10:00:02 - TAG-003 reads OUT
→ Forms pair (IN@10:00:01, OUT@10:00:02)
→ Latest pair ends at 10:00:02
→ ✓ SENT to dispatcher (OUT at 10:00:02)
```

### Scenario 4: Multiple Movements (Send Only When Latest Changes!)
```
10:00:01 - TAG-004 reads IN  → ⚠️ NOT sent (need pair)
10:00:02 - TAG-004 reads OUT → ✅ SENT (OUT@10:00:02) - Latest pair formed
10:00:03 - TAG-004 reads IN  → ✅ SENT (IN@10:00:03) - New latest pair!
10:00:04 - TAG-004 reads OUT → ✅ SENT (OUT@10:00:04) - New latest pair!
10:00:05 - TAG-004 reads IN  → ✅ SENT (IN@10:00:05) - New latest pair!
```

**Important:** The system sends whenever a new pair is formed with a MORE RECENT timestamp than the previously sent pair. Each send represents the absolute latest movement state of the tag.

## Implementation Details

### Components Modified

1. **config.py**
   - Added `DISPATCHER_URL` configuration parameter

2. **app/utils/helpers.py**
   - Added `get_mac_address()`: Retrieves system MAC address
   - Added `send_to_dispatcher()`: Sends POST request to dispatcher API

3. **app/services/tracking_service.py**
   - Modified `add_record()`: Automatically sends data to dispatcher when new records are created

### Error Handling

The dispatcher integration is designed to be non-blocking and fault-tolerant:

- **Non-blocking**: Dispatcher POST happens in a background thread, so it never delays tag reading
- **Timeout**: Requests timeout after 5 seconds by default
- **Failure handling**: If the dispatcher is unreachable, the error is logged but the system continues operating normally
- **Local storage**: All records are still saved locally regardless of dispatcher status

### Success/Failure Indicators

Console output provides clear feedback:
- `✓ Successfully sent to dispatcher: [tag] - [direction]` - Success
- `⚠ Dispatcher returned status [code]` - HTTP error
- `⚠ Dispatcher request timeout` - Connection timeout
- `⚠ Failed to connect to dispatcher` - Connection error
- `⚠ DISPATCHER_URL not configured` - Missing configuration

## Testing

### Test Script
Run the test script to verify dispatcher integration:

```bash
cd rfid_tracker
python test_dispatcher.py
```

This will:
1. Test MAC address retrieval
2. Send a test payload to the configured dispatcher URL
3. Report success or failure

### Manual Testing

To test with the full application:

1. Ensure `DISPATCHER_URL` is set in `.env`
2. Start the application:
   ```bash
   python app.py
   ```
3. Trigger a tag read (via hardware or mock mode)
4. Check the console output for dispatcher POST confirmation
5. Verify the data was received on the dispatcher side

## Troubleshooting

### Dispatcher not receiving data

1. **Check URL**: Verify `DISPATCHER_URL` in `.env` is correct
2. **Network connectivity**: Ensure the system can reach the dispatcher URL
3. **Firewall**: Check if firewall is blocking outbound HTTP requests
4. **Logs**: Review console output for error messages

### MAC address issues

If the MAC address shows as `00:00:00:00:00:00`:
- The system couldn't determine the MAC address
- Check network interfaces are available
- The system will still function, but with a placeholder MAC

### Performance concerns

The dispatcher POST is asynchronous and should not impact performance:
- Runs in a background daemon thread
- Has a 5-second timeout
- Failures don't block tag reading

## Security Considerations

- Currently uses HTTP (not HTTPS)
- No authentication implemented
- Consider adding API keys or tokens for production use
- Consider switching to HTTPS for encrypted transmission

## Future Enhancements

Potential improvements:
- Retry mechanism for failed requests
- Queue failed requests for later retry
- Batch multiple records for efficiency
- Add authentication/authorization
- HTTPS support
- Configurable timeout values
- Health check endpoint for dispatcher status
