from flask import Flask
import os
from flask_cors import CORS
from config import config

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

    # Initialize services
    with app.app_context():
        from app.services.tracking_service import tracking_service
        from app.services.sensor_service import sensor_manager
        from app.services.rfid_service import rfid_reader

        tracking_service.initialize()
        sensor_manager.initialize()

        if rfid_reader.connect():
            import threading
            threading.Thread(target=rfid_reader.monitor_loop, daemon=True).start()

    # Register blueprints
    from app.routes.api import api_bp
    from app.routes.config import config_bp
    from app.routes.system import system_bp

    app.register_blueprint(api_bp)
    app.register_blueprint(config_bp)
    app.register_blueprint(system_bp)

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