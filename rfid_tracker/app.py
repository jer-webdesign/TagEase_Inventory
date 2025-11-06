# app.py
#!/usr/bin/env python3
"""
RFID Asset Tracking System - Application Entry Point
"""
import os

# Patch standard library for eventlet BEFORE any other imports
import eventlet
eventlet.monkey_patch()

from app import create_app

# Get environment
env = os.getenv('FLASK_ENV', 'production')

# Create Flask app
app = create_app(env)

# Import socketio after create_app has been called
from app import socketio

if __name__ == '__main__':
    try:
        print(f"Starting RFID Tracking Server ({env} mode)...")

        # Use socketio.run with eventlet async mode for production stability
        socketio.run(
            app,
            host='0.0.0.0',
            port=5000,
            debug=app.config.get('DEBUG', False),
            allow_unsafe_werkzeug=True  # Required for eventlet with Werkzeug dev server
        )

    except KeyboardInterrupt:
        print("\nShutting down gracefully...")
        from app.services.rfid_service import rfid_reader
        from app.services.sensor_service import sensor_manager

        rfid_reader.stop()
        sensor_manager.shutdown()

    except Exception as e:
        print(f"Fatal error: {e}")