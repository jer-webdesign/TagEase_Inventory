"""
SSH Terminal Handler for Flask-SocketIO
Provides web-based SSH terminal access to the Raspberry Pi
"""
import paramiko
from flask_socketio import emit
from flask import request

# Store active SSH sessions
ssh_sessions = {}

def init_ssh_handlers(socketio):
    """Initialize SSH WebSocket event handlers"""
    
    @socketio.on('ssh_connect')
    def handle_ssh_connect(data):
        """Handle SSH connection request"""
        try:
            sid = request.sid
            host = data.get('host', 'localhost')
            port = int(data.get('port', 22))
            username = data.get('username', 'pi')
            password = data.get('password', '')
            
            print(f"SSH connection request: {username}@{host}:{port} (sid: {sid})")
            
            # Create SSH client
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            try:
                ssh.connect(
                    hostname=host,
                    port=port,
                    username=username,
                    password=password,
                    timeout=10
                )
                
                # Open an interactive shell
                channel = ssh.invoke_shell(term='xterm', width=80, height=24)
                
                # Store session
                ssh_sessions[sid] = {
                    'ssh': ssh,
                    'channel': channel,
                    'running': True
                }
                
                emit('ssh_connected', {'status': 'success'})
                print(f"SSH connected: {username}@{host}")
                
                # Start background task to read SSH output
                def read_ssh_output():
                    """Background task to read and emit SSH output"""
                    while ssh_sessions.get(sid, {}).get('running', False):
                        try:
                            session = ssh_sessions.get(sid)
                            if not session or not session.get('running'):
                                break
                                
                            channel = session.get('channel')
                            if channel and channel.recv_ready():
                                output_data = channel.recv(1024).decode('utf-8', errors='ignore')
                                socketio.emit('ssh_output', {'data': output_data}, to=sid, namespace='/')
                            
                            socketio.sleep(0.05)  # Use socketio.sleep for background tasks
                        except Exception as e:
                            print(f"SSH read error: {e}")
                            if sid in ssh_sessions:
                                ssh_sessions[sid]['running'] = False
                            break
                
                # Start the background task using socketio
                socketio.start_background_task(read_ssh_output)
                
            except paramiko.AuthenticationException:
                emit('ssh_error', {'error': 'Authentication failed. Check username and password.'})
                print(f"SSH auth failed: {username}@{host}")
            except paramiko.SSHException as e:
                emit('ssh_error', {'error': f'SSH error: {str(e)}'})
                print(f"SSH error: {e}")
            except Exception as e:
                emit('ssh_error', {'error': f'Connection error: {str(e)}'})
                print(f"SSH connection error: {e}")
                
        except Exception as e:
            emit('ssh_error', {'error': f'Failed to connect: {str(e)}'})
            print(f"SSH handler error: {e}")
    
    @socketio.on('ssh_input')
    def handle_ssh_input(data):
        """Handle input from the terminal"""
        try:
            sid = request.sid
            input_data = data.get('data', '')
            
            session = ssh_sessions.get(sid)
            if session and session.get('running'):
                channel = session['channel']
                if channel:
                    channel.send(input_data)
        except Exception as e:
            print(f"SSH input error: {e}")
    
    @socketio.on('ssh_resize')
    def handle_ssh_resize(data):
        """Handle terminal resize"""
        try:
            sid = request.sid
            cols = int(data.get('cols', 80))
            rows = int(data.get('rows', 24))
            
            session = ssh_sessions.get(sid)
            if session and session.get('running'):
                channel = session['channel']
                if channel:
                    channel.resize_pty(width=cols, height=rows)
        except Exception as e:
            print(f"SSH resize error: {e}")
    
    @socketio.on('ssh_disconnect')
    def handle_ssh_disconnect(data):
        """Handle SSH disconnection"""
        try:
            sid = request.sid
            session = ssh_sessions.get(sid)
            
            if session:
                session['running'] = False
                if session.get('channel'):
                    session['channel'].close()
                if session.get('ssh'):
                    session['ssh'].close()
                del ssh_sessions[sid]
                
                emit('ssh_disconnected', {'status': 'success'})
                print(f"SSH disconnected: {sid}")
        except Exception as e:
            print(f"SSH disconnect error: {e}")
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Clean up SSH session on client disconnect"""
        try:
            sid = request.sid
            session = ssh_sessions.get(sid)
            
            if session:
                session['running'] = False
                if session.get('channel'):
                    session['channel'].close()
                if session.get('ssh'):
                    session['ssh'].close()
                del ssh_sessions[sid]
                print(f"SSH session cleaned up on disconnect: {sid}")
        except Exception as e:
            print(f"SSH cleanup error: {e}")
    
    print("SSH terminal handlers registered")
