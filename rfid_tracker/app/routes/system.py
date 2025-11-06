
from flask import Blueprint, jsonify, request
import threading
import time
import os

system_bp = Blueprint('system', __name__, url_prefix='/api/system')

@system_bp.route('/power', methods=['POST'])
def power_control():
    """Power on/off Raspberry Pi (off only, on requires hardware relay)"""
    data = request.get_json() or {}
    action = data.get('action')
    if action not in ['on', 'off']:
        return jsonify({
            'status': 'error',
            'message': "Missing or invalid 'action'. Use 'on' or 'off'."
        }), 400
    if action == 'off':
        def do_shutdown():
            time.sleep(2)
            os.system('shutdown -h now')
        threading.Thread(target=do_shutdown, daemon=True).start()
        return jsonify({
            'status': 'success',
            'message': 'System shutting down in 2 seconds...'
        })
    else:
        # Powering on requires hardware relay, not possible via software alone
        return jsonify({
            'status': 'error',
            'message': 'Power on not supported via API. Requires hardware relay.'
        }), 400

@system_bp.route('/reboot', methods=['POST'])
def reboot_system():
    """Reboot Raspberry Pi"""
    if request.args.get('confirm') != 'true':
        return jsonify({
            'status': 'error',
            'message': 'Add ?confirm=true to reboot'
        }), 400
    
    def do_reboot():
        time.sleep(2)
        os.system('reboot')
    
    threading.Thread(target=do_reboot, daemon=True).start()
    
    return jsonify({
        'status': 'success',
        'message': 'System rebooting in 2 seconds...'
    })


@system_bp.route('/shutdown', methods=['POST'])
def shutdown_system():
    """Shutdown Raspberry Pi"""
    if request.args.get('confirm') != 'true':
        return jsonify({
            'status': 'error',
            'message': 'Add ?confirm=true to shutdown'
        }), 400
    
    def do_shutdown():
        time.sleep(2)
        os.system('shutdown -h now')
    
    threading.Thread(target=do_shutdown, daemon=True).start()
    
    return jsonify({
        'status': 'success',
        'message': 'System shutting down in 2 seconds...'
    })