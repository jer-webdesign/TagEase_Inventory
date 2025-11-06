// frontend_inventory/src/hooks/useRFIDWebSocket.js
import { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

/**
 * Custom React hook for managing RFID WebSocket connection
 * Handles real-time updates from the Flask-SocketIO backend
 */
const useRFIDWebSocket = (apiBaseUrl) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [lastTagDetected, setLastTagDetected] = useState(null);
  const [sensorActivity, setSensorActivity] = useState({
    inside: { detected: false, distance: 0 },
    outside: { detected: false, distance: 0 }
  });
  
  const socketRef = useRef(null);

  // Connect to WebSocket
  useEffect(() => {
    if (!apiBaseUrl) return;

    console.log('Connecting to WebSocket:', apiBaseUrl);
    
    const newSocket = io(apiBaseUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Initial connection data
    newSocket.on('connection_established', (data) => {
      console.log('Connection established:', data);
    });

    // System status updates
    newSocket.on('status_update', (data) => {
      console.log('Status update:', data);
      setSystemStatus(data);
    });

    // Statistics updates
    newSocket.on('statistics_update', (data) => {
      console.log('Statistics update:', data);
      setStatistics(data);
    });

    // Records updates
    newSocket.on('records_update', (data) => {
      console.log('Records update:', data.count, 'records');
      setRecentRecords(data.records || []);
    });

    // Tag detection events
    newSocket.on('tag_detected', (data) => {
      console.log('🏷️ Tag detected:', data);
      setLastTagDetected(data);
      
      // Clear after 3 seconds
      setTimeout(() => setLastTagDetected(null), 3000);
    });

    // Record added events
    newSocket.on('record_added', (data) => {
      console.log('📝 Record added:', data);
      // Add the new record to the beginning of the list for real-time update
      if (data.record) {
        setRecentRecords(prev => [data.record, ...prev]);
      }
    });

    // Sensor activity events
    newSocket.on('sensor_activity', (data) => {
      console.log('👁️ Sensor activity:', data);
      setSensorActivity(prev => ({
        ...prev,
        [data.location]: {
          detected: data.detected,
          distance: data.distance
        }
      }));
      
      // Clear detection after 2 seconds
      if (data.detected) {
        setTimeout(() => {
          setSensorActivity(prev => ({
            ...prev,
            [data.location]: { detected: false, distance: 0 }
          }));
        }, 2000);
      }
    });

    // Configuration updates
    newSocket.on('config_update', (data) => {
      console.log('⚙️ Config update:', data);
    });

    // RFID power updated event
    newSocket.on('rfid_power_updated', (data) => {
      console.log('📡 RFID power updated:', data.power);
    });

    // Sensor range updated event
    newSocket.on('sensor_range_updated', (data) => {
      console.log('📏 Sensor range updated:', data.location, data.range);
    });

    // Error events
    newSocket.on('error', (data) => {
      console.error('Server error:', data.message);
    });

    // Success events
    newSocket.on('success', (data) => {
      console.log('Success:', data.message);
    });

    // Records cleared event
    newSocket.on('records_cleared', () => {
      console.log('🗑️ Records cleared');
      setRecentRecords([]);
    });

    // Cleanup on unmount
    return () => {
      console.log('Disconnecting WebSocket...');
      newSocket.disconnect();
    };
  }, [apiBaseUrl]);

  // Request methods
  const requestStatus = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('request_status');
    }
  }, []);

  const requestStatistics = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('request_statistics');
    }
  }, []);

  const requestRecords = useCallback((filters = null) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('request_records', filters);
    }
  }, []);

  const configureRFIDPower = useCallback((power) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('configure_rfid_power', { power: parseInt(power) });
    }
  }, []);

  const configureSensorRange = useCallback((location, distance) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('configure_sensor_range', { 
        location, 
        distance: parseInt(distance) 
      });
    }
  }, []);

  const addManualRecord = useCallback((rfidTag, direction) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('add_manual_record', { 
        rfid_tag: rfidTag, 
        direction: direction.toUpperCase() 
      });
    }
  }, []);

  const clearRecords = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('clear_records', { confirm: true });
    }
  }, []);

  const ping = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('ping');
    }
  }, []);

  return {
    socket,
    isConnected,
    systemStatus,
    statistics,
    recentRecords,
    lastTagDetected,
    sensorActivity,
    // Methods
    requestStatus,
    requestStatistics,
    requestRecords,
    configureRFIDPower,
    configureSensorRange,
    addManualRecord,
    clearRecords,
    ping
  };
};

export default useRFIDWebSocket;
