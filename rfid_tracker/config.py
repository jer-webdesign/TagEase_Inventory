import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    
    # Flask Settings
    DEBUG = os.getenv('FLASK_DEBUG', 'False') == 'True'
    TESTING = False
    
    # Note: Mock mode removed. Use real hardware services in production.
    
    # Device Ports
    RFID_PORT = os.getenv('RFID_PORT', '/dev/ttyUSB0')
    SENSOR_INSIDE_PORT = os.getenv('SENSOR_INSIDE_PORT', '/dev/ttyUSB1')
    SENSOR_OUTSIDE_PORT = os.getenv('SENSOR_OUTSIDE_PORT', '/dev/ttyUSB2')
    
    # Serial Configuration
    BAUD_RATE = int(os.getenv('BAUD_RATE', '115200'))
    
    # RFID Configuration
    RFID_READ_POWER = int(os.getenv('RFID_READ_POWER', '26'))
    RFID_POWER_MIN = int(os.getenv('RFID_POWER_MIN', '10'))
    RFID_POWER_MAX = int(os.getenv('RFID_POWER_MAX', '30'))
    
    # Sensor Configuration
    SENSOR_DETECTION_RANGE = int(os.getenv('SENSOR_DETECTION_RANGE', '2'))
    SENSOR_RANGE_MIN = int(os.getenv('SENSOR_RANGE_MIN', '1'))
    SENSOR_RANGE_MAX = int(os.getenv('SENSOR_RANGE_MAX', '10'))
    HUMAN_DETECTION_TIMEOUT = int(os.getenv('HUMAN_DETECTION_TIMEOUT', '5'))
    
    # Data Storage
    DATA_FILE = os.getenv('DATA_FILE', 'data/tag_tracking.json')
    
    # Dispatcher Configuration
    DISPATCHER_URL = os.getenv('DISPATCHER_URL', 'http://138.68.255.116:8080')


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': ProductionConfig
}