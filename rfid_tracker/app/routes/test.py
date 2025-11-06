"""
Test endpoints for simulating hardware events (MOCK MODE ONLY)
"""
from flask import Blueprint, jsonify, request, current_app

test_bp = Blueprint('test', __name__, url_prefix='/api/test')

@test_bp.before_request
def check_mock_mode():
    """Only allow test endpoints in mock mode"""
    if not current_app.config.get('MOCK_MODE', False):
        return jsonify({
            'status': 'error',
            'message': 'Test endpoints are only available in MOCK_MODE'
        }), 403


@test_bp.route('/simulate-movement', methods=['POST'])
def simulate_movement():
    """
    Simulate a person moving through the door with an asset
    
    Body:
    {
        "tag_id": "E200001234567890ABCD1234",  // Optional
        "direction": "IN"  // "IN" or "OUT"
    }
    """
    try:
        # Import mock services
        from app.services.sensor_service_mock import sensor_manager
        from app.services.rfid_service_mock import rfid_reader
        
        data = request.get_json() or {}
        direction = data.get('direction', 'IN').upper()
        tag_id = data.get('tag_id')
        
        if direction not in ['IN', 'OUT']:
            return jsonify({
                'status': 'error',
                'message': 'Direction must be IN or OUT'
            }), 400
        
        # Simulate sensor detection based on direction
        if direction == 'IN':
            # Person detected outside, moving in
            sensor_manager.trigger_outside_detection()
            print(f"[TEST] Triggered OUTSIDE sensor (person moving IN)")
        else:
            # Person detected inside, moving out
            sensor_manager.trigger_inside_detection()
            print(f"[TEST] Triggered INSIDE sensor (person moving OUT)")
        
        # Small delay for sensor detection to register
        import time
        time.sleep(0.2)
        
        # Simulate RFID tag read
        rfid_reader.trigger_tag_read(tag_id)
        
        # Wait for processing
        time.sleep(0.3)
        
        return jsonify({
            'status': 'success',
            'message': f'Simulated movement {direction}',
            'tag_id': tag_id or 'random',
            'direction': direction
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@test_bp.route('/trigger-sensor', methods=['POST'])
def trigger_sensor():
    """
    Manually trigger a specific sensor
    
    Body:
    {
        "sensor": "inside"  // "inside" or "outside"
    }
    """
    try:
        from app.services.sensor_service_mock import sensor_manager
        
        data = request.get_json() or {}
        sensor = data.get('sensor', 'inside').lower()
        
        if sensor not in ['inside', 'outside']:
            return jsonify({
                'status': 'error',
                'message': 'Sensor must be "inside" or "outside"'
            }), 400
        
        if sensor == 'inside':
            sensor_manager.trigger_inside_detection()
        else:
            sensor_manager.trigger_outside_detection()
        
        return jsonify({
            'status': 'success',
            'message': f'Triggered {sensor} sensor',
            'sensor': sensor
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@test_bp.route('/trigger-rfid', methods=['POST'])
def trigger_rfid():
    """
    Manually trigger RFID tag read
    
    Body:
    {
        "tag_id": "E200001234567890ABCD1234"  // Optional
    }
    """
    try:
        from app.services.rfid_service_mock import rfid_reader
        
        data = request.get_json() or {}
        tag_id = data.get('tag_id')
        
        rfid_reader.trigger_tag_read(tag_id)
        
        return jsonify({
            'status': 'success',
            'message': 'Triggered RFID tag read',
            'tag_id': tag_id or 'random'
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@test_bp.route('/sample-tags', methods=['GET'])
def get_sample_tags():
    """Get list of sample RFID tags"""
    try:
        from app.services.rfid_service_mock import rfid_reader
        
        return jsonify({
            'status': 'success',
            'tags': rfid_reader.sample_tags
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@test_bp.route('/scenarios', methods=['GET'])
def get_test_scenarios():
    """Get list of available test scenarios"""
    scenarios = [
        {
            'name': 'Asset Moving IN',
            'description': 'Simulate an asset being brought into the room',
            'endpoint': '/api/test/simulate-movement',
            'method': 'POST',
            'body': {'direction': 'IN'}
        },
        {
            'name': 'Asset Moving OUT',
            'description': 'Simulate an asset being taken out of the room',
            'endpoint': '/api/test/simulate-movement',
            'method': 'POST',
            'body': {'direction': 'OUT'}
        },
        {
            'name': 'Custom Tag IN',
            'description': 'Simulate a specific asset moving in',
            'endpoint': '/api/test/simulate-movement',
            'method': 'POST',
            'body': {'direction': 'IN', 'tag_id': 'E200001234567890ABCD9012'}
        },
        {
            'name': 'Multiple Movements',
            'description': 'Call simulate-movement multiple times with different tags',
            'note': 'Execute multiple requests sequentially'
        }
    ]
    
    return jsonify({
        'status': 'success',
        'scenarios': scenarios
    })