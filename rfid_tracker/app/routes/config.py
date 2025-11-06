
from flask import Blueprint, jsonify, request, current_app
from app.services.rfid_service import rfid_reader
from app.services.sensor_service import sensor_manager

config_bp = Blueprint('config', __name__, url_prefix='/api/config')


# --- Range endpoints must be after Blueprint definition ---
@config_bp.route('/rfid-range', methods=['GET'])
def get_rfid_range():
    """Get RFID reader min/max power (dBm)"""
    return jsonify({
        'status': 'success',
        'min': current_app.config['RFID_POWER_MIN'],
        'max': current_app.config['RFID_POWER_MAX']
    })

@config_bp.route('/sensor-range', methods=['GET'])
def get_sensor_range():
    """Get sensor min/max detection range (meters)"""
    return jsonify({
        'status': 'success',
        'min': current_app.config['SENSOR_RANGE_MIN'],
        'max': current_app.config['SENSOR_RANGE_MAX']
    })


@config_bp.route('/sensor-range', methods=['POST'])
def set_sensor_range():
    """Configure mmWave sensor detection range"""
    data = request.get_json()
    
    if not data or 'range' not in data:
        return jsonify({
            'status': 'error',
            'message': 'Missing required field: range (meters)'
        }), 400
    
    distance = data['range']
    min_range = current_app.config['SENSOR_RANGE_MIN']
    max_range = current_app.config['SENSOR_RANGE_MAX']
    
    if not (min_range <= distance <= max_range):
        return jsonify({
            'status': 'error',
            'message': f'Range must be between {min_range}-{max_range} meters'
        }), 400
    
    sensor_manager.configure_range(distance)
    
    return jsonify({
        'status': 'success',
        'message': f'Sensor range set to {distance} meters',
        'range': distance
    })