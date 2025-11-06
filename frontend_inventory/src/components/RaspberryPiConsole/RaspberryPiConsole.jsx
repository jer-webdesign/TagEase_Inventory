// frontend_inventory/src/components/RaspberryPiConsole/RaspberryPiConsole.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import io from 'socket.io-client';
import { X, Monitor } from 'lucide-react';
import './RaspberryPiConsole.css';

const RaspberryPiConsole = ({ apiBaseUrl, onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [showCredentials, setShowCredentials] = useState(true);
  const [credentials, setCredentials] = useState({
    host: import.meta.env.VITE_SSH_HOST || 'localhost',
    port: parseInt(import.meta.env.VITE_SSH_PORT) || 22,
    username: import.meta.env.VITE_SSH_USERNAME || 'pi',
    password: import.meta.env.VITE_SSH_PASSWORD || ''
  });
  const [status, setStatus] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const terminalRef = useRef(null);
  const socketRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!showCredentials && terminalRef.current && !xtermRef.current) {
      // Initialize xterm.js
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#ffffff',
          cursor: '#00ff00',
          selection: 'rgba(255, 255, 255, 0.3)',
        },
        rows: 30,
        cols: 100
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      
      // Wait a bit for the terminal to fully render
      setTimeout(() => {
        fitAddon.fit();
      }, 100);

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      // Handle terminal input
      term.onData((data) => {
        if (socketRef.current && isConnected) {
          socketRef.current.emit('ssh_input', { data });
        }
      });

      // Handle window resize
      const handleResize = () => {
        if (fitAddonRef.current && xtermRef.current) {
          fitAddon.fit();
          if (socketRef.current && isConnected) {
            socketRef.current.emit('ssh_resize', {
              cols: term.cols,
              rows: term.rows
            });
          }
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (term) term.dispose();
      };
    }
  }, [showCredentials, isConnected]);

  const connectToSSH = () => {
    setIsConnecting(true);
    
    // Connect to Flask backend via SocketIO
    const socket = io(apiBaseUrl, {
      transports: ['websocket', 'polling'],
      path: '/socket.io'
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to Flask SocketIO server');
      setStatus('Connecting to Raspberry Pi console...');
      
      // Send SSH credentials with the correct event name
      socket.emit('ssh_connect', credentials);
    });

    socket.on('ssh_connected', (data) => {
      console.log('SSH connected:', data);
      setStatus('Connected to Raspberry Pi');
      setIsConnected(true);
      setShowCredentials(false);
      setIsConnecting(false);
    });

    socket.on('ssh_output', (data) => {
      if (xtermRef.current) {
        xtermRef.current.write(data.data);
      }
    });

    socket.on('ssh_error', (data) => {
      console.error('SSH error:', data);
      setStatus(`Error: ${data.error}`);
      setIsConnecting(false);
      if (xtermRef.current) {
        xtermRef.current.write(`\r\n\x1b[31mError: ${data.error}\x1b[0m\r\n`);
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setStatus('Disconnected from server');
      setIsConnecting(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setStatus('Failed to connect to server. Please check if Flask-SocketIO is running.');
      setIsConnecting(false);
    });
  };

  const handleConnect = (e) => {
    e.preventDefault();
    connectToSSH();
  };

  const handleDisconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    setIsConnected(false);
    setShowCredentials(true);
    setStatus('');
    
    if (xtermRef.current) {
      xtermRef.current.dispose();
      xtermRef.current = null;
    }
    
    if (onClose) {
      onClose();
    }
  };

  // Drag handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.rpi-console-header')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  return (
    <div 
      ref={containerRef}
      className="rpi-console-container"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="rpi-console-header">
        <div className="rpi-console-title">
          <Monitor size={20} />
          <span>Raspberry Pi Console</span>
        </div>
        <button onClick={handleDisconnect} className="rpi-console-close">
          <X size={20} />
        </button>
      </div>

        {status && (
          <div className={`rpi-console-status ${
            status.includes('Error') ? 'status-error' : 'status-info'
          }`}>
            {status}
          </div>
        )}

        {showCredentials && (
          <div className="rpi-console-credentials">
            <h3>SSH Connection Details</h3>
            <form onSubmit={handleConnect}>
              <div className="form-row">
                <div className="form-group">
                  <label>Host</label>
                  <input
                    type="text"
                    value={credentials.host}
                    onChange={(e) => setCredentials({...credentials, host: e.target.value})}
                    placeholder="localhost"
                    disabled={isConnecting}
                  />
                </div>
                <div className="form-group">
                  <label>Port</label>
                  <input
                    type="number"
                    value={credentials.port}
                    onChange={(e) => setCredentials({...credentials, port: parseInt(e.target.value)})}
                    disabled={isConnecting}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                  disabled={isConnecting}
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  disabled={isConnecting}
                />
              </div>
              <button 
                type="submit" 
                className="connect-btn"
                disabled={isConnecting}
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            </form>
          </div>
        )}

        {!showCredentials && (
          <div className="rpi-console-terminal">
            <div ref={terminalRef} style={{ height: '100%', width: '100%' }} />
          </div>
        )}
    </div>
  );
};

export default RaspberryPiConsole;