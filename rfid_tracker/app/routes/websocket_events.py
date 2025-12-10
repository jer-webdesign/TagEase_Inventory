"""
WebSocket Event Handlers for RFID Tracking System
Handles real-time bidirectional communication with frontend clients
"""

from flask_socketio import emit, join_room, leave_room
from flask import request
from app.services.tracking_service import tracking_service
from app.services.rfid_service import rfid_reader
from app.services.sensor_service import sensor_manager


def init_websocket_handlers(socketio):
    """Initialize all WebSocket event handlers"""
    
    @socketio.on('connect')
    def handle_connect():
        """Handle client connection"""
        client_id = request.sid
        print(f"✅ WebSocket client connected: {client_id}")
        
        # Send initial data to the newly connected client
        emit('connection_established', {
            'message': 'Connected to RFID Tracking Server',
            'client_id': client_id
        })
        
        # Send current system status
        status_data = tracking_service.get_status()
        emit('status_update', status_data)
        
        # Send current statistics
        stats = tracking_service.get_statistics()
        emit('statistics_update', stats)
        
        # Send recent records (no limit - display all with scrollbar)
        recent_records = tracking_service.get_all_records()
        emit('records_update', {'records': recent_records, 'count': len(recent_records)})
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection"""
        client_id = request.sid
        print(f"❌ WebSocket client disconnected: {client_id}")
    
    @socketio.on('request_status')
    def handle_request_status():
        """Handle client request for current status"""
        status_data = tracking_service.get_status()
        emit('status_update', status_data)
    
    @socketio.on('request_statistics')
    def handle_request_statistics():
        """Handle client request for statistics"""
        stats = tracking_service.get_statistics()
        emit('statistics_update', stats)
    
    @socketio.on('request_records')
    def handle_request_records(data=None):
        """Handle client request for records with optional filters"""
        filters = data if data else {}
        records = tracking_service.get_all_records(filters)
        emit('records_update', {'records': records, 'count': len(records)})
    
    @socketio.on('configure_rfid_power')
    def handle_configure_rfid_power(data):
        """Handle RFID power configuration"""
        try:
            power = data.get('power')
            if power is None or not isinstance(power, int):
                emit('error', {'message': 'Invalid power value'})
                return
            
            success = rfid_reader.configure_power(power)
            if success:
                emit('rfid_power_updated', {'power': rfid_reader.read_power})
                # Broadcast to all clients
                socketio.emit('config_update', {
                    'rfid_power': rfid_reader.read_power,
                    'sensor_range': sensor_manager.sensor_inside.detection_range
                })
            else:
                emit('error', {'message': 'Failed to update RFID power'})
        except Exception as e:
            emit('error', {'message': f'Error updating RFID power: {str(e)}'})
    
    @socketio.on('configure_sensor_range')
    def handle_configure_sensor_range(data):
        """Handle sensor range configuration"""
        try:
            location = data.get('location')  # 'inside' or 'outside'
            distance = data.get('distance')
            
            if location not in ['inside', 'outside'] or not isinstance(distance, int):
                emit('error', {'message': 'Invalid location or distance'})
                return
            
            if location == 'inside':
                sensor_manager.sensor_inside.configure_range(distance)
            else:
                sensor_manager.sensor_outside.configure_range(distance)
            
            emit('sensor_range_updated', {'location': location, 'range': distance})
            # Broadcast to all clients
            socketio.emit('config_update', {
                'rfid_power': rfid_reader.read_power,
                'sensor_range': sensor_manager.sensor_inside.detection_range
            })
        except Exception as e:
            emit('error', {'message': f'Error updating sensor range: {str(e)}'})
    
    @socketio.on('add_manual_record')
    def handle_add_manual_record(data):
        """Handle manual record addition"""
        try:
            rfid_tag = data.get('rfid_tag')
            direction = data.get('direction')
            
            if not rfid_tag or not direction:
                emit('error', {'message': 'Missing rfid_tag or direction'})
                return
            
            if direction.upper() not in ['IN', 'OUT']:
                emit('error', {'message': 'Direction must be IN or OUT'})
                return
            
            record = tracking_service.add_record(rfid_tag, direction.upper())
            
            # This will trigger the broadcast from tracking_service
            emit('record_added', {'record': record})
        except Exception as e:
            emit('error', {'message': f'Error adding record: {str(e)}'})
    
    @socketio.on('clear_records')
    def handle_clear_records(data):
        """Handle request to clear all records"""
        try:
            confirm = data.get('confirm', False)
            if not confirm:
                emit('error', {'message': 'Confirmation required to clear records'})
                return
            ok = False
            try:
                ok = tracking_service.clear_all_records()
            except Exception as e:
                print(f"[ERROR] Exception in clear_all_records (ws): {e}")

            if not ok:
                emit('error', {'message': 'Failed to clear records (server error)'} )
                return

            # Broadcast to all clients
            socketio.emit('records_cleared', {})
            socketio.emit('statistics_update', tracking_service.get_statistics())
            emit('success', {'message': 'All records cleared'})
        except Exception as e:
            emit('error', {'message': f'Error clearing records: {str(e)}'})
    
    @socketio.on('ping')
    def handle_ping():
        """Handle ping for connection keepalive"""
        emit('pong', {'timestamp': tracking_service.get_status().get('timestamp', '')})
    
    print("✅ WebSocket event handlers registered for RFID tracking")


def broadcast_tag_detected(socketio, tag_id, direction=None):
    """
    Broadcast tag detection event to all connected clients
    Called by rfid_service when a tag is detected
    """
    socketio.emit('tag_detected', {
        'tag_id': tag_id,
        'direction': direction,
        'timestamp': tracking_service.get_status().get('timestamp', '')
    })


def broadcast_record_added(socketio, record):
    """
    Broadcast new record to all connected clients
    Called by tracking_service when a record is added
    """
    socketio.emit('record_added', {
        'record': record
    })
    
    # Also send updated statistics
    stats = tracking_service.get_statistics()
    socketio.emit('statistics_update', stats)
    
    # Send updated recent records (no limit - display all with scrollbar)
    recent_records = tracking_service.get_all_records()
    socketio.emit('records_update', {
        'records': recent_records,
        'count': len(recent_records)
    })


def broadcast_status_update(socketio, status_data):
    """
    Broadcast status update to all connected clients
    Called when system status changes
    """
    socketio.emit('status_update', status_data)


def broadcast_sensor_activity(socketio, sensor_location, detected, distance=0):
    """
    Broadcast sensor activity to all connected clients
    Called by sensor_service when sensors detect activity
    
    Args:
        sensor_location: 'inside' or 'outside'
        detected: True if human detected, False otherwise
        distance: Distance in cm (0-100)
    """
    socketio.emit('sensor_activity', {
        'location': sensor_location,
        'detected': detected,
        'distance': distance,
        'timestamp': tracking_service.get_status().get('timestamp', '')
    })
