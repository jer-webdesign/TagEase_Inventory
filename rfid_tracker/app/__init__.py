from flask import Flask
import os
from flask_cors import CORS
from flask_socketio import SocketIO
from config import config

# Global SocketIO instance
socketio = None

def create_app(config_name='production'):
    """Application factory"""
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    # Ensure DATA_FILE is an absolute path relative to the project root.
    # This prevents writes from going to an unexpected CWD when the app is
    # started as a service or from another directory.
    project_root = os.path.dirname(app.root_path)  # parent of the `app` package
    data_file_cfg = app.config.get('DATA_FILE', 'data/tag_tracking.json')
    # If DATA_FILE is already absolute, keep it. Otherwise, make it absolute
    if not os.path.isabs(data_file_cfg):
        app.config['DATA_FILE'] = os.path.abspath(os.path.join(project_root, data_file_cfg))
    else:
        app.config['DATA_FILE'] = data_file_cfg
    # Show resolved data file path on startup for easier debugging
    print(f"Using DATA_FILE: {app.config['DATA_FILE']}")
    
    # Enable CORS
    CORS(app)
    
    # Initialize SocketIO with eventlet for production stability
    global socketio
    socketio = SocketIO(
        app, 
        cors_allowed_origins="*", 
        async_mode='eventlet',
        logger=True,
        engineio_logger=True,
        ping_timeout=60,
        ping_interval=25
    )
    print("SocketIO initialized with eventlet for SSH terminal support")

    # Initialize services
    with app.app_context():
        from app.services.tracking_service import tracking_service
        from app.services.sensor_service import sensor_manager
        from app.services.rfid_service import rfid_reader
        
        tracking_service.initialize()
        sensor_manager.initialize()
        
        # Set app reference for RFID reader before connecting
        rfid_reader.app = app
        
        # RFID reader will auto-start monitoring with eventlet greenthread
        rfid_reader.connect()
    
    # Register blueprints
    from app.routes.api import api_bp
    from app.routes.config import config_bp
    from app.routes.system import system_bp
    
    app.register_blueprint(api_bp)
    app.register_blueprint(config_bp)
    app.register_blueprint(system_bp)
    
    # Initialize WebSocket handlers for RFID tracking
    from app.routes.websocket_events import init_websocket_handlers
    init_websocket_handlers(socketio)
    print("✅ RFID WebSocket handlers registered")
    
    # Initialize SSH handlers for terminal access
    from app.ssh_handler import init_ssh_handlers
    init_ssh_handlers(socketio)
    print("SSH terminal handlers registered")
    
    @app.route('/')
    def index():
        """Root health endpoint"""
        response = {
            'service': 'RFID Asset Tracking API',
            'version': '1.0.0',
            'status': 'running',
            'mode': 'PRODUCTION (Hardware)'
        }
        return response
    
    return app