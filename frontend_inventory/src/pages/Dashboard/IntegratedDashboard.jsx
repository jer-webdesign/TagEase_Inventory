// frontend_inventory/pages/Dashboard/IntegratedDashboard.jsx
import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal/Modal';
import RaspberryPiConsole from '../../components/RaspberryPiConsole/RaspberryPiConsole';
import useRFIDWebSocket from '../../hooks/useRFIDWebSocket';
import { 
  Package, TrendingUp, AlertCircle, CheckCircle,
  Radio, Wifi, Activity, Monitor, Settings, ArrowRight, ArrowLeft,
  Zap, Target
} from 'lucide-react';
import './IntegratedDashboard.css';

const IntegratedDashboard = () => {
  // API Base URL - IMPORTANT: Update with your Raspberry Pi IP
  const API_BASE_URL = 'http://192.168.182.23:5000';

  // WebSocket hook for real-time updates
  const {
    isConnected,
    systemStatus: wsSystemStatus,
    statistics: wsStatistics,
    recentRecords: wsRecentRecords,
    sensorActivity,
    configureRFIDPower,
    configureSensorRange
  } = useRFIDWebSocket(API_BASE_URL);

  // Local state management
  const [systemStatus, setSystemStatus] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [rfidPower, setRfidPower] = useState(26);
  const [sensorRange, setSensorRange] = useState(2);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  
  // Sensor detection state for animation
  const [insideSensorActive, setInsideSensorActive] = useState(false);
  const [outsideSensorActive, setOutsideSensorActive] = useState(false);
  const [detectionDistance, setDetectionDistance] = useState({
    inside: 0,
    outside: 0
  });
  
  // RFID + Sensor detection tracking
  const [insideDetectedWithRFID, setInsideDetectedWithRFID] = useState(false);
  const [outsideDetectedWithRFID, setOutsideDetectedWithRFID] = useState(false);
  
  // Movement direction tracking
  const [movementDirection, setMovementDirection] = useState(null); // 'left-to-right' or 'right-to-left'
  const [firstDetectedSensor, setFirstDetectedSensor] = useState(null);
  const [movementActive, setMovementActive] = useState(false);
  const [movementPosition, setMovementPosition] = useState(0); // 0-100, position across the door

  // Raspberry Pi control state
  const [piStatus, setPiStatus] = useState(null);
  const [isPiBusy, setIsPiBusy] = useState(false);
  
  // Toast notifications
  const [toasts, setToasts] = useState([]);

  // Update local state from WebSocket data
  useEffect(() => {
    if (wsSystemStatus) {
      setSystemStatus(wsSystemStatus);
    }
  }, [wsSystemStatus]);

  useEffect(() => {
    if (wsStatistics) {
      setStatistics(wsStatistics);
    }
  }, [wsStatistics]);

  useEffect(() => {
    if (wsRecentRecords && wsRecentRecords.length > 0) {
      // Check if there's a new record (compare with previous state)
      if (recentRecords.length > 0 && wsRecentRecords.length > recentRecords.length) {
        // New record added - this means BOTH sensors detected with RFID
        const newRecord = wsRecentRecords[0]; // Most recent record
        const direction = newRecord.direction;
        
        console.log('🎯 New record - Both sensors detected! Direction:', direction);
        
        // Now trigger movement animation since both sensors have detected
        if (direction) {
          // Determine movement direction based on record direction
          if (direction.toLowerCase().includes('entry') || direction.toLowerCase().includes('outside')) {
            console.log('🎬 Starting animation: Outside → Inside (right-to-left)');
            setMovementDirection('right-to-left');
            setFirstDetectedSensor('outside');
            animateMovement('right-to-left');
          } else if (direction.toLowerCase().includes('exit') || direction.toLowerCase().includes('inside')) {
            console.log('🎬 Starting animation: Inside → Outside (left-to-right)');
            setMovementDirection('left-to-right');
            setFirstDetectedSensor('inside');
            animateMovement('left-to-right');
          }
          
          // Reset detection flags after animation starts
          setTimeout(() => {
            setInsideDetectedWithRFID(false);
            setOutsideDetectedWithRFID(false);
          }, 500);
        }
      }
      
      setRecentRecords(wsRecentRecords);
    }
  }, [wsRecentRecords]);

  // Log connection status for debugging
  useEffect(() => {
    console.log('WebSocket Connection Status:', isConnected);
  }, [isConnected]);

  // Handle sensor activity from WebSocket - Shows orange circle when sensor + RFID detected
  useEffect(() => {
    if (sensorActivity.inside.detected) {
      console.log('👁️ Inside sensor detected (with RFID)');
      setInsideSensorActive(true);
      setInsideDetectedWithRFID(true);
      
      // Keep the orange circle visible
      setTimeout(() => {
        setInsideSensorActive(false);
      }, 3000);
    }
  }, [sensorActivity.inside.detected, sensorActivity.inside.distance]);

  useEffect(() => {
    if (sensorActivity.outside.detected) {
      console.log('👁️ Outside sensor detected (with RFID)');
      setOutsideSensorActive(true);
      setOutsideDetectedWithRFID(true);
      
      // Keep the orange circle visible
      setTimeout(() => {
        setOutsideSensorActive(false);
      }, 3000);
    }
  }, [sensorActivity.outside.detected, sensorActivity.outside.distance]);

  const showToast = (message, type = 'info', timeout = 4000) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type };
    setToasts((t) => [...t, newToast]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, timeout);
  };

  // Get a friendly location string from record (supports different field names)
  const getLocation = (record) => {
    if (!record) return 'Unknown';
    return record.location || record.location_name || record.locationText || record.loc || 'NK013, Senator Burns Bldg.';
  };

  useEffect(() => {
    if (systemStatus?.raspberry_pi_status) {
      setPiStatus(systemStatus.raspberry_pi_status);
    }
  }, [systemStatus]);

  // Show confirmation modal instead of window.confirm
  const [showRebootModal, setShowRebootModal] = useState(false);

  const controlPi = () => {
    // open the modal to confirm reboot
    setShowRebootModal(true);
  };

  const performReboot = async () => {
    // Close modal and perform reboot
    setShowRebootModal(false);
    setIsPiBusy(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/system/reboot?confirm=true`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.status === 'success') {
        showToast(data.message || 'Rebooting Raspberry Pi', 'success');
      } else {
        showToast(data.message || 'Reboot failed', 'error');
      }
    } catch (error) {
      console.error('Error controlling Raspberry Pi:', error);
      showToast(error.message || 'Failed to contact device', 'error');
    } finally {
      setIsPiBusy(false);
    }
  };

  const parseRecordDate = (dateStr) => {
    // New format: YYYY-MM-DD-HH-MM-SS-mmm-AM/PM (12-hour format with AM/PM)
    // Old format: YYYY-MM-DD-HH-MM-SS-mmm (24-hour format)
    
    const parts = (dateStr || '').split('-');
    const year = parseInt(parts[0], 10) || 0;
    const month = (parseInt(parts[1], 10) || 1) - 1; // 0-indexed
    const day = parseInt(parts[2], 10) || 1;
    let hour = parseInt(parts[3], 10) || 0;
    const minute = parseInt(parts[4], 10) || 0;
    const second = parseInt(parts[5], 10) || 0;
    const ms = parseInt(parts[6], 10) || 0;
    const ampm = parts[7]; // 'AM' or 'PM' or undefined for old format
    
    // Convert 12-hour to 24-hour format if AM/PM is present
    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && hour < 12) {
        hour += 12;
      } else if (ampm.toUpperCase() === 'AM' && hour === 12) {
        hour = 0;
      }
    }

    // The timestamp is already in Calgary time, so create Date object directly
    // Note: Using Date constructor interprets values in local timezone
    return new Date(year, month, day, hour, minute, second, ms);
  };

  const animateMovement = (direction) => {
    setMovementActive(true);
    let position = direction === 'left-to-right' ? 0 : 100; // Start position based on direction
    const increment = direction === 'left-to-right' ? 2 : -2; // Movement increment
    const endPosition = direction === 'left-to-right' ? 100 : 0; // End position
    
    const interval = setInterval(() => {
      position += increment;
      setMovementPosition(position);
      
      // Check if movement is complete
      const isComplete = direction === 'left-to-right' ? position >= endPosition : position <= endPosition;
      
      if (isComplete) {
        clearInterval(interval);
        // Reset movement state after animation
        setTimeout(() => {
          setMovementActive(false);
          setFirstDetectedSensor(null);
          setMovementDirection(null);
          setMovementPosition(0);
        }, 500);
      }
    }, 30); // 30ms for smooth animation
  };

  const updateRFIDPower = async (power) => {
    setIsConfiguring(true);
    try {
      configureRFIDPower(parseInt(power));
      setRfidPower(power);
    } catch (error) {
      console.error('Error updating RFID power:', error);
    }
    setIsConfiguring(false);
  };

  const updateSensorRange = async (range) => {
    setIsConfiguring(true);
    try {
      // Update both inside and outside sensors
      configureSensorRange('inside', parseInt(range));
      configureSensorRange('outside', parseInt(range));
      setSensorRange(range);
    } catch (error) {
      console.error('Error updating sensor range:', error);
    }
    setIsConfiguring(false);
  };

  const timeAgo = (dateStr) => {
    const recordTime = parseRecordDate(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - recordTime) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Format record date into YY-MM-DD-hh-mm-SS-ms
  const formatDateTime = (dateStr) => {
    try {
      // Parse original string into a Date object (uses local TZ)
      const d = parseRecordDate(dateStr);

      // Use Intl to get components in Calgary time (America/Edmonton)
      const tz = 'America/Edmonton';
      // Use 12-hour format so we can append am/pm
      const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      const parts = fmt.formatToParts(d).reduce((acc, p) => {
        if (p.type && p.value) acc[p.type] = p.value;
        return acc;
      }, {});

      const YYYY = String(parts.year || '0000').padStart(4, '0');
      const MM = String(parts.month || '00').padStart(2, '0');
      const DD = String(parts.day || '00').padStart(2, '0');
      let hh = String(parts.hour || '00').padStart(2, '0');
      const mm = String(parts.minute || '00').padStart(2, '0');
      const ss = String(parts.second || '00').padStart(2, '0');
      const dayPeriod = (parts.dayPeriod || '').toLowerCase();

      // Milliseconds are not provided by Intl; use the instant's milliseconds
      const ms = String(d.getMilliseconds() || 0).padStart(3, '0');

      // Ensure hour is 12-hour (Intl returns 12-hour when hour12: true)
      // but normalize '00' to '12' if necessary
      if (hh === '00') hh = '12';

      // Normalize day period to simple 'am'/'pm' (Intl may return locale variants like 'a.m.'/'p.m.')
      const dp = /p/i.test(dayPeriod) ? 'pm' : 'am';

      // Use non-breaking spaces so browsers preserve the gap instead of collapsing whitespace
      const gap = '\u00A0\u00A0\u00A0\u00A0\u00A0';

      return `${YYYY}-${MM}-${DD}${gap}${hh}:${mm}:${ss} ${dp}`;
    } catch (e) {
      return dateStr || '';
    }
  };

  // Inventory stats (connected to RFID statistics)
  const inventoryStats = [
    {
      title: 'Total Assets',
      value: statistics?.unique_tags || 0,
      icon: <Package size={24} />,
      color: 'blue',
      change: `${statistics?.total_records || 0} records`
    },
    {
      title: 'Assets Inside',
      value: statistics?.current_balance || 0,
      icon: <CheckCircle size={24} />,
      color: 'green',
      change: `${statistics?.in_count || 0} entries`
    },
    {
      title: 'Assets Outside',
      value: Math.abs((statistics?.current_balance || 0) - (statistics?.in_count || 0)),
      icon: <AlertCircle size={24} />,
      color: 'orange',
      change: `${statistics?.out_count || 0} exits`
    },
    {
      title: 'Today\'s Activity',
      value: statistics?.total_records || 0,
      icon: <TrendingUp size={24} />,
      color: 'purple',
      change: 'Real-time'
    }
  ];

  return (
    <div className="dashboard">
      {/* Toast container */}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              marginBottom: 8,
              padding: '10px 14px',
              borderRadius: 6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              color: '#fff',
              background: t.type === 'success' ? '#28a745' : t.type === 'error' ? '#dc3545' : '#007bff',
              minWidth: 200
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <h1 className="dashboard-title">Reader Setup</h1>
          <p className="dashboard-subtitle">
            RFID reader and sensor configuration
            <span style={{ 
              marginLeft: '15px', 
              padding: '6px 14px', 
              borderRadius: '14px',
              fontSize: '1rem',
              backgroundColor: isConnected ? '#22c55e' : '#ef4444',
              color: 'white'
            }}>
              {isConnected ? '🟢 Live' : '🔴 Disconnected'}
            </span>
          </p>
        </div>
        {/* Reboot confirmation modal */}
        <Modal
          isOpen={showRebootModal}
          onClose={() => setShowRebootModal(false)}
          title="Confirm Reboot"
        >
          <p>Are you sure you want to reboot the Raspberry Pi?</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button
              className="action-btn"
              onClick={() => setShowRebootModal(false)}
              disabled={isPiBusy}
            >
              Cancel
            </button>
            <button
              className="action-btn action-btn-danger"
              onClick={performReboot}
              disabled={isPiBusy}
            >
              {isPiBusy ? 'Working...' : 'Reboot'}
            </button>
          </div>
        </Modal>

        {/* Live Sensor Visualization */}
        <div className="sensor-visualization">
          <h2 className="section-title">
            <Zap size={20} /> Live Sensor Activity
          </h2>

          {/* 2D Top View - Radar Style with centered door */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr auto 1fr', 
            gap: '2rem', 
            alignItems: 'center',
            marginTop: '2rem', 
            marginBottom: '2rem',
            position: 'relative' // Add relative positioning for absolute children
          }}>
            {/* Inside Sensor View */}
            <div className="sensor-top-view">
              <div className="sensor-view-title">Inside Sensor (Exit)</div>
              <div className="radar-container">
                {/* Concentric circles for distance markers */}
                <div className="radar-circles">
                  {[...Array(Math.min(10, parseInt(sensorRange)))].map((_, i) => {
                    const radius = ((i + 1) / parseInt(sensorRange)) * 100;
                    return (
                      <div
                        key={`inside-circle-${i}`}
                        className="radar-circle"
                        style={{
                          width: `${radius}%`,
                          height: `${radius}%`,
                        }}
                      />
                    );
                  })}
                </div>

                {/* Distance labels */}
                <div className="radar-labels">
                  <div className="radar-label" style={{ top: '8px', left: '50%', transform: 'translateX(-50%)' }}>
                    {sensorRange}m
                  </div>
                </div>

                {/* Detection range overlay */}
                <div 
                  className={`detection-range-overlay range-inside ${insideSensorActive ? 'range-active' : ''}`}
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                />

                {/* Stationary orange circle when detected with RFID */}
                {insideDetectedWithRFID && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '60px',
                    height: '60px',
                    background: 'radial-gradient(circle, rgba(251, 146, 60, 1) 0%, rgba(251, 146, 60, 0.6) 50%, rgba(251, 146, 60, 0) 100%)',
                    borderRadius: '50%',
                    boxShadow: '0 0 30px rgba(251, 146, 60, 0.9), 0 0 60px rgba(251, 146, 60, 0.5)',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 25,
                    animation: 'pulse 1s ease-in-out infinite'
                  }} />
                )}

                {/* Sensor core marker at center - INSIDE SENSOR (green) */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '38px',
                  height: '38px',
                  background: '#22c55e', // green-500
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  boxShadow: '0 0 8px 2px rgba(34,197,94,0.25)',
                  border: '2px solid #15803d',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 30
                }}>
                  {/* Inside */}
                </div>
              </div>
            </div>

            {/* Door/Center - RFID Reader Visualization */}
            <div className="door-center">
              <span className="door-sublabel">RFID Reader</span>
              <div className="door-line">
                <span className="door-label">DOOR</span>
              </div>
            </div>

            {/* Outside Sensor View */}
            <div className="sensor-top-view">
              <div className="sensor-view-title">Outside Sensor (Entry)</div>
              <div className="radar-container">
                {/* Concentric circles for distance markers */}
                <div className="radar-circles">
                  {[...Array(Math.min(10, parseInt(sensorRange)))].map((_, i) => {
                    const radius = ((i + 1) / parseInt(sensorRange)) * 100;
                    return (
                      <div
                        key={`outside-circle-${i}`}
                        className="radar-circle"
                        style={{
                          width: `${radius}%`,
                          height: `${radius}%`,
                        }}
                      />
                    );
                  })}
                </div>

                {/* Distance labels */}
                <div className="radar-labels">
                  <div className="radar-label" style={{ top: '8px', left: '50%', transform: 'translateX(-50%)' }}>
                    {sensorRange}m
                  </div>
                </div>

                {/* Detection range overlay */}
                <div 
                  className={`detection-range-overlay range-outside ${outsideSensorActive ? 'range-active' : ''}`}
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                />

                {/* Stationary orange circle when detected with RFID */}
                {outsideDetectedWithRFID && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '60px',
                    height: '60px',
                    background: 'radial-gradient(circle, rgba(251, 146, 60, 1) 0%, rgba(251, 146, 60, 0.6) 50%, rgba(251, 146, 60, 0) 100%)',
                    borderRadius: '50%',
                    boxShadow: '0 0 30px rgba(251, 146, 60, 0.9), 0 0 60px rgba(251, 146, 60, 0.5)',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 25,
                    animation: 'pulse 1s ease-in-out infinite'
                  }} />
                )}

                {/* Sensor core marker at center - OUTSIDE SENSOR (blue) */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '38px',
                  height: '38px',
                  background: '#2563eb', // blue-600
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  boxShadow: '0 0 8px 2px rgba(37,99,235,0.25)',
                  border: '2px solid #1e40af',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 30
                }}>
                  {/* Outside */}
                </div>
              </div>
            </div>

            {/* Movement Animation Track - Overlays the entire visualization */}
            {movementActive && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '0',
                right: '0',
                height: '40px',
                transform: 'translateY(-50%)',
                zIndex: 30,
                pointerEvents: 'none'
              }}>
                {/* Detection Circle */}
                <div 
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: `${movementPosition}%`,
                    width: '40px',
                    height: '40px',
                    background: 'radial-gradient(circle, rgba(251, 146, 60, 1) 0%, rgba(251, 146, 60, 0.6) 50%, rgba(251, 146, 60, 0) 100%)',
                    borderRadius: '50%',
                    boxShadow: '0 0 20px rgba(251, 146, 60, 0.8), 0 0 40px rgba(251, 146, 60, 0.4)',
                    transform: 'translate(-50%, -50%)',
                    transition: 'left 0.03s linear'
                  }}
                />
                {/* Movement track line */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '10%',
                  right: '10%',
                  height: '2px',
                  background: 'linear-gradient(90deg, rgba(251, 146, 60, 0.3) 0%, rgba(251, 146, 60, 0.6) 50%, rgba(251, 146, 60, 0.3) 100%)',
                  transform: 'translateY(-50%)',
                  opacity: 0.7
                }} />
              </div>
            )}
          </div>

          {/* Movement Direction Indicator */}
          {movementActive && (
            <div style={{ 
              position: 'relative', 
              width: '100%', 
              height: '20px', 
              marginTop: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Direction indicators */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '2rem',
                fontSize: '0.9rem', 
                color: 'var(--muted)',
                fontWeight: 500
              }}>
                <span style={{ color: movementDirection === 'left-to-right' ? 'rgba(251, 146, 60, 1)' : 'var(--muted)' }}>
                  ← INSIDE TO OUTSIDE
                </span>
                <span style={{ color: movementDirection === 'right-to-left' ? 'rgba(251, 146, 60, 1)' : 'var(--muted)' }}>
                  OUTSIDE TO INSIDE →
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Configuration Controls */}
        <div style={{
          backgroundColor: '#1a1a1a',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          boxShadow: '0 6px 18px rgba(0,0,0,0.3)',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Settings size={20} /> Hardware Configuration
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
            {/* RFID Power Control */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              paddingTop: '1rem',
              paddingLeft: '5rem',
              paddingBottom: '0rem'
            }}>
              <label style={{
                fontSize: '1.1rem',
                fontWeight: 500,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <Target size={16} /> RFID Reader Power: {rfidPower} dBm
                </span>
                <span style={{ fontSize: '0.95rem', color: '#a0a0a0', fontWeight: 400 }}>
                  Adjust reading distance (10 dBm = ~1-2m, 30 dBm = ~6-10m)
                </span>
              </label>
              <div style={{ position: 'relative'}}>
                <input
                  type="range"
                  min="10"
                  max="30"
                  value={rfidPower}
                  onChange={(e) => setRfidPower(e.target.value)}
                  onMouseUp={(e) => updateRFIDPower(e.target.value)}
                  onTouchEnd={(e) => updateRFIDPower(e.target.value)}
                  disabled={isConfiguring}
                  style={{
                    width: '80%',
                    height: '12px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    outline: 'none',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ position: 'relative', width: '100%', height: '30px', marginTop: '8px' }}>
                  <span style={{
                    position: 'absolute',
                    fontWeight: 700,
                    color: '#4fb0ffff',
                    fontSize: '1.1rem',
                    whiteSpace: 'nowrap',
                    transform: 'translateX(-50%)',
                    textAlign: 'center',
                    left: `${((rfidPower - 10) / 20) * 80}%`
                  }}>
                    {rfidPower}dBm
                  </span>
                </div>
              </div>
            </div>

            {/* Sensor Range Control */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem', 
              paddingLeft: '5rem',
              paddingBottom: '0rem'
            }}>
              <label style={{
                fontSize: '1.1rem',
                fontWeight: 500,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <Target size={16} /> Sensor Detection Range: {sensorRange} meters
                </span>
                <span style={{ fontSize: '0.95rem', color: '#a0a0a0', fontWeight: 400 }}>
                  Adjust motion detection range (1m = close, 10m = far)
                </span>
              </label>
              <div style={{ position: 'relative', paddingBottom: '40px' }}>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={sensorRange}
                  onChange={(e) => setSensorRange(e.target.value)}
                  onMouseUp={(e) => updateSensorRange(e.target.value)}
                  onTouchEnd={(e) => updateSensorRange(e.target.value)}
                  disabled={isConfiguring}
                  style={{
                    width: '80%',
                    height: '12px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    outline: 'none',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ position: 'relative', width: '100%', height: '30px', marginTop: '8px' }}>
                  <span style={{
                    position: 'absolute',
                    fontWeight: 700,
                    color: '#4fb0ffff',
                    fontSize: '1.1rem',
                    whiteSpace: 'nowrap',
                    transform: 'translateX(-50%)',
                    textAlign: 'center',
                    left: `${((sensorRange - 1) / 9) * 80}%`
                  }}>
                    {sensorRange}m
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Status Cards */}
        <div className="status-grid">
          <div className="status-card">
            <div className="status-icon status-icon-orange">
              <Radio size={24} />
            </div>
            <div className="status-content">
              <p className="status-label">RFID Reader</p>
              <p className={`status-value ${isConnected && systemStatus?.rfid_reader?.includes('connected') ? 'status-connected' : 'status-disconnected'}`}>
                {isConnected ? (systemStatus?.rfid_reader || 'Disconnected') : 'Disconnected'}
              </p>
            </div>
          </div>

          <div className="status-card">
            <div className="status-icon status-icon-green">
              <Wifi size={24} />
            </div>
            <div className="status-content">
              <p className="status-label">Inside Sensor</p>
              <p className={`status-value ${isConnected && systemStatus?.sensor_inside?.includes('connected') ? 'status-connected' : 'status-disconnected'}`}>
                {isConnected ? (systemStatus?.sensor_inside || 'Disconnected') : 'Disconnected'}
              </p>
            </div>
          </div>

          <div className="status-card">
            <div className="status-icon status-icon-blue">
              <Wifi size={24} />
            </div>
            <div className="status-content">
              <p className="status-label">Outside Sensor</p>
              <p className={`status-value ${isConnected && systemStatus?.sensor_outside?.includes('connected') ? 'status-connected' : 'status-disconnected'}`}>
                {isConnected ? (systemStatus?.sensor_outside || 'Disconnected') : 'Disconnected'}
              </p>
            </div>
          </div>

          <div className="status-card">
            <div className="status-icon status-icon-orange">
              <Monitor size={24} />
            </div>
            <div className="status-content">
              <p className="status-label">Raspberry Pi</p>
              <p className={`status-value ${isConnected && piStatus && piStatus.toLowerCase().includes('on') ? 'status-connected' : 'status-disconnected'}`}>
                {/* {piStatus || 'Unknown'} */}
              </p>

              <div className="pi-controls" style={{ marginTop: 8, display: 'flex', alignItems: 'center' }}>
                <button
                  className="action-btn action-btn-primary"
                  onClick={() => setShowConsole(true)}
                >
                  Console
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Sections */}
        <div className="dashboard-sections">
          {/* Recent Activity - Full Width */}
          <div className="section-card" style={{ gridColumn: '1 / -1' }}>
            <h2 className="section-title">Recent Activity</h2>
            <div className="activity-table">
              {recentRecords.length === 0 ? (
                <p className="no-data">No activity yet. Wave an RFID tag near the reader while moving through the door.</p>
              ) : (
                <table>
                  <thead>
                      <tr>
                        <th>RFID Tag</th>
                        <th>Direction</th>
                        <th>Location</th>
                        <th>DATE TIME (Calgary, AB)</th>
                      </tr>
                  </thead>
                  <tbody>
                    {recentRecords.map((record, index) => (
                      <tr key={`${record.rfid_tag}-${record.read_date}-${index}`}>
                        <td className="tag-cell">{record.rfid_tag}</td>
                        <td>
                          <span className={`direction-badge direction-${record.direction.toLowerCase()}`}>
                            {record.direction === 'IN' ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
                            {record.direction}
                          </span>
                        </td>
                        <td className="location-cell">{getLocation(record)}</td>
                        <td className="time-cell">{formatDateTime(record.read_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Raspberry Pi Console Modal */}
      {showConsole && (
        <RaspberryPiConsole
          apiBaseUrl={API_BASE_URL}
          onClose={() => setShowConsole(false)}
        />
      )}
    </div>
  );
};

export default IntegratedDashboard;