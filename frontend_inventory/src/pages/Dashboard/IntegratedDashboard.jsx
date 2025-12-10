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
  const API_BASE_URL = 'http://10.34.164.23:5000';

  // WebSocket hook for real-time updates
  const {
    isConnected,
    systemStatus: wsSystemStatus,
    statistics: wsStatistics,
    recentRecords: wsRecentRecords,
    sensorActivity,
    configureRFIDPower,
    configureSensorRange,
    clearRecords,
    requestRecords,
    requestStatistics
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
  // Resolved backend device name (from status endpoint)
  const [resolvedDevice, setResolvedDevice] = useState(null);
  const [resolvedDeviceLoading, setResolvedDeviceLoading] = useState(false);
  
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
    if (wsRecentRecords) {
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

      // Always sync local state to the websocket-provided records array
      setRecentRecords(wsRecentRecords || []);
    } else {
      // If wsRecentRecords is falsy, clear local recent records
      setRecentRecords([]);
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
      
      // Keep the orange circle visible for 3 seconds
      const timer = setTimeout(() => {
        setInsideSensorActive(false);
        setInsideDetectedWithRFID(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      // Immediately clear when detection stops
      setInsideSensorActive(false);
      setInsideDetectedWithRFID(false);
    }
  }, [sensorActivity.inside.detected, sensorActivity.inside.distance]);

  useEffect(() => {
    if (sensorActivity.outside.detected) {
      console.log('👁️ Outside sensor detected (with RFID)');
      setOutsideSensorActive(true);
      setOutsideDetectedWithRFID(true);
      
      // Keep the orange circle visible for 3 seconds
      const timer = setTimeout(() => {
        setOutsideSensorActive(false);
        setOutsideDetectedWithRFID(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    } else {
      // Immediately clear when detection stops
      setOutsideSensorActive(false);
      setOutsideDetectedWithRFID(false);
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

  // Try to extract room and building separately from record.
  // Prefer explicit fields if present, otherwise attempt to split the location string on comma.
  const getRoomAndBuilding = (record) => {
    const ROOM_DEFAULT = 'NK013A';
    const BUILDING_DEFAULT = 'Senator Burns Building';

    if (!record) return { room: ROOM_DEFAULT, building: BUILDING_DEFAULT };

    // Prefer explicit fields when available
    const roomField = record.roomName || record.room || '';
    const buildingField = record.buildingName || record.building || record.location_name || '';

    // If both explicit fields exist, return them
    if (roomField && buildingField) return { room: roomField, building: buildingField };

    // If there's a combined location string, try splitting it (e.g. "NK013, Senator Burns Bldg.")
    const combined = record.location || record.location_name || record.locationText || record.loc || '';
    if (combined) {
      const parts = String(combined).split(',').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return { room: parts[0] || ROOM_DEFAULT, building: parts.slice(1).join(', ') || BUILDING_DEFAULT };
      }
      if (parts.length === 1) {
        return { room: parts[0] || ROOM_DEFAULT, building: BUILDING_DEFAULT };
      }
    }

    // Fallback to any single explicit field, or the hardcoded defaults
    return { room: roomField || ROOM_DEFAULT, building: buildingField || BUILDING_DEFAULT };
  };

  useEffect(() => {
    if (systemStatus?.raspberry_pi_status) {
      setPiStatus(systemStatus.raspberry_pi_status);
    }
  }, [systemStatus]);

  // Fetch backend status to obtain a resolved device name (if available)
  useEffect(() => {
    let mounted = true;
    // If websocket already provided system status, use it immediately to avoid
    // a perceived delay while the HTTP status endpoint responds.
    if (wsSystemStatus) {
      const payload = wsSystemStatus;
      const candidate = payload.device_name || payload.hostname || payload.host ||
        (payload.raspberry_pi_status && (payload.raspberry_pi_status.device || payload.raspberry_pi_status.hostname || payload.raspberry_pi_status.name)) ||
        null;
      setResolvedDevice(candidate || 'Unknown');
    }

    const fetchStatus = async () => {
      setResolvedDeviceLoading(true);
      try {
        const resp = await fetch(`${API_BASE_URL}/api/status`);
        const obj = await resp.json();
        // The endpoint returns { status: 'success', data: {...}, config: {...} }
        const payload = obj?.data || obj || {};

        // Try a few common keys where a device/hostname may appear
        const candidate = payload.device_name || payload.hostname || payload.host ||
          (payload.raspberry_pi_status && (payload.raspberry_pi_status.device || payload.raspberry_pi_status.hostname || payload.raspberry_pi_status.name)) ||
          null;

        if (mounted) setResolvedDevice(candidate || 'Unknown');
      } catch (e) {
        if (mounted) setResolvedDevice('Error');
      } finally {
        if (mounted) setResolvedDeviceLoading(false);
      }
    };

    fetchStatus();

    return () => { mounted = false; };
  }, [API_BASE_URL, isConnected]);

  // Show confirmation modal instead of window.confirm
  const [showRebootModal, setShowRebootModal] = useState(false);
  // Confirm clear records modal
  const [showClearModal, setShowClearModal] = useState(false);

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
    // Robust parser that handles multiple stored formats, including
    // - YYYY-MM-DD-HH-MM-SS-mmmAM  (AM/PM attached without separator)
    // - YYYY-MM-DD-HH-MM-SS-mmm-AM/PM
    // - YYYY-MM-DD HH:MM:SS am/pm
    try {
      if (!dateStr) return new Date(0);

      // Extract am/pm if present anywhere (case-insensitive).
      // Handle cases where AM/PM may be attached directly to the milliseconds (eg. "123PM").
      const s = String(dateStr).trim();
      const ampmMatch = s.match(/([ap]m)$/i) || s.match(/\b(am|pm)\b/i);
      const ampm = ampmMatch ? ampmMatch[1].toUpperCase() : null;

      // Remove non-digit separators except keep digits together
      const digits = s.replace(/([ap]m)$/i, '').replace(/\b(am|pm)\b/i, '').match(/\d+/g) || [];

      const year = parseInt(digits[0], 10) || 0;
      const month = (parseInt(digits[1], 10) || 1) - 1;
      const day = parseInt(digits[2], 10) || 1;
      let hour = parseInt(digits[3], 10) || 0;
      const minute = parseInt(digits[4], 10) || 0;
      const second = parseInt(digits[5], 10) || 0;
      // Milliseconds may be 1-4 digits (we'll take the first 3)
      const msRaw = digits[6] ? String(digits[6]) : '0';
      const ms = parseInt(msRaw.slice(0, 3).padEnd(3, '0'), 10) || 0;

      // If AM/PM marker exists, convert hour from 12-hour to 24-hour
      if (ampm) {
        if (ampm === 'PM' && hour < 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
      }

      return new Date(year, month, day, hour, minute, second, ms);
    } catch (e) {
      return new Date(0);
    }
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
      // Prefer to format directly from the stored string to avoid timezone
      // conversions that can flip AM/PM. Supports multiple input formats.
      try {
        if (!dateStr) return '';

        // Normalize trailing AM/PM attached to digits (e.g. "5423PM" -> "5423 PM")
        const s = String(dateStr).trim().replace(/([ap]m)$/i, ' $1');

        // Try hyphen-separated format first: YYYY-MM-DD-HH-MM-SS(-ms)?(-AM/PM)?
        let m = s.match(/^(\d{4})-(\d{2})-(\d{2})-(\d{1,2})-(\d{2})-(\d{2})(?:-(\d{1,3}))?(?:-?\s*(AM|PM|am|pm))?$/);
        if (!m) {
          // Try space/colon format: YYYY-MM-DD[ \t]+HH:MM:SS[.ms] [AM/PM]?
          m = s.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?\s*(AM|PM|am|pm)?$/);
        }

        if (!m) {
          // Fallback: try to extract numeric groups and am/pm
          const ampmMatch = s.match(/\b(am|pm)\b/i);
          const ampm = ampmMatch ? ampmMatch[1].toLowerCase() : null;
          const nums = s.replace(/\b(am|pm)\b/i, '').match(/\d+/g) || [];
          if (nums.length >= 6) {
            const YYYY = nums[0];
            const MM = nums[1];
            const DD = nums[2];
            const hour = parseInt(nums[3], 10);
            const minute = nums[4];
            const second = nums[5];
            const dp = ampm ? ampm : (hour >= 12 ? 'pm' : 'am');
            let hh = hour % 12;
            if (hh === 0) hh = 12;
            hh = String(hh).padStart(2, '0');
            const gap = '\u00A0\u00A0\u00A0\u00A0\u00A0';
            return `${YYYY}-${String(MM).padStart(2,'0')}-${String(DD).padStart(2,'0')}${gap}${hh}:${String(minute).padStart(2,'0')}:${String(second).padStart(2,'0')} ${dp}`;
          }
          return s;
        }

        // m contains matched groups depending on which regex succeeded
        const YYYY = m[1];
        const MM = m[2];
        const DD = m[3];
        let hour = parseInt(m[4], 10);
        const minute = m[5];
        const second = m[6];
        // ms may be in group 7 for hyphen format or group 7 for colon format
        const maybeMs = m[7];
        const ampm = (m[8] || m[7]) ? String(m[8] || m[7]) : null;

        // Determine am/pm robustly: prefer any explicit indicator in the original string,
        // otherwise infer from the hour (treat hour>=12 as pm).
        let dp = /pm/i.test(s) ? 'pm' : (/am/i.test(s) ? 'am' : (hour >= 12 ? 'pm' : 'am'));

        // Convert hour to 12-hour
        let hh = hour % 12;
        if (hh === 0) hh = 12;
        hh = String(hh).padStart(2, '0');

        const gap = '\u00A0\u00A0\u00A0\u00A0\u00A0';
        return `${YYYY}-${MM}-${DD}${gap}${hh}:${minute}:${second} ${dp}`;
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
              backgroundColor: isConnected ? '#22c55e' : '#535353',
              color: isConnected ? '#ffffffff' : '#bebebeff',
            }}>
              {isConnected ? '🟢 Live' : '⚫ Offline'}
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

        {/* Clear records confirmation modal */}
        <Modal
          isOpen={showClearModal}
          onClose={() => setShowClearModal(false)}
          title="Confirm Clear Records"
        >
          <p>Clear all recent records? This cannot be undone.</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button
              className="action-btn"
              onClick={() => setShowClearModal(false)}
            >
              Cancel
            </button>
            <button
              className="action-btn action-btn-danger"
              onClick={async () => {
                setShowClearModal(false);
                try {
                  // Immediately clear local UI for instant feedback
                  setRecentRecords([]);

                  // 1) Try socket-based clear (real-time)
                  try { clearRecords(); } catch (e) { /* ignore */ }

                  // 2) Also call HTTP DELETE endpoint with confirm=true so server persists clear
                  try {
                    const url = API_BASE_URL ? `${API_BASE_URL}/api/records?confirm=true` : '/api/records?confirm=true';
                    const resp = await fetch(url, { method: 'DELETE' });
                    if (!resp.ok) {
                      const text = await resp.text();
                      console.error('Failed to delete records via HTTP:', resp.status, text);
                      showToast('Server failed to clear records', 'error');
                    } else {
                      showToast('Cleared all records', 'success');
                    }
                  } catch (e) {
                    console.error('HTTP request to clear records failed', e);
                    showToast('Failed to request clear over HTTP', 'error');
                  }

                  // Force a refresh of records and statistics from server
                  try { requestRecords(); requestStatistics(); } catch (e) {}
                } catch (e) {
                  console.error('Error requesting clear records', e);
                  showToast('Failed to request clear', 'error');
                }
              }}
            >
              Clear
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
              <div className="sensor-view-title">Outside Sensor (Entry)</div>
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

                {/* Sensor core marker at center */}
                <div className="door-marker">
                  SENSOR
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
              <div className="sensor-view-title">Inside Sensor (Exit)</div>
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

                {/* Sensor core marker at center */}
                <div className="door-marker">
                  SENSOR
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
          backgroundColor: 'rgba(51, 51, 51, 1)',
          borderRadius: '0.75rem',
          padding: '2rem 2rem 1rem 2rem',
          boxShadow: '0 6px 18px rgba(0,0,0,0.3)',
          marginBottom: '2rem',         
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
              marginTop: '0.5rem', 
              paddingTop: '1rem',
              paddingLeft: '2rem',
              paddingRight: '0rem',
              paddingBottom: '1rem',                
              borderRadius: '1rem',
              boxShadow: '0 0 12px rgba(27, 27, 27, 1)'    
            }}>
              <label style={{
                fontSize: '0.85rem',
                fontWeight: 500,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',     
                textAlign: 'center'           
              }}>
                <span style={{ gap: '0.5rem', padding: '0rem', alignItems: 'center', fontWeight: 600 }}>
                  RFID Reader Power: {rfidPower} dBm
                </span>
                <span style={{ fontSize: '0.70rem', color: '#a0a0a0', fontWeight: 400, marginTop: '0.25rem' }}>
                  Adjust reading distance (10 dBm = ~1-2m, 30 dBm = ~6-10m)
                </span>
              </label>
              <div style={{ position: 'relative', marginTop: '0.75rem' }}>
                <input
                  type="range"
                  min="10"
                  max="30"
                  value={rfidPower}
                  onChange={(e) => setRfidPower(e.target.value)}
                  onMouseUp={(e) => updateRFIDPower(e.target.value)}
                  onTouchEnd={(e) => updateRFIDPower(e.target.value)}
                  disabled={isConfiguring}
                  className="control-slider"
                  style={{
                    width: '93%',
                    height: '1rem',
                    borderRadius: '8px',
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((rfidPower - 10) / 20) * 100}%, #0f0f0f ${((rfidPower - 10) / 20) * 100}%, #0f0f0f 100%)`,
                    boxShadow: '0 2px 1px rgba(105, 105, 105, 1)',
                    border: '5px solid #000000',
                    outline: 'none',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ position: 'relative', width: '93%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '0.95rem',
                    color: '#9ca3af',
                    textAlign: 'left',
                    marginTop: '1.1rem',
                  }}>
                    10 dBm<br /><span style={{ fontSize: '0.7rem' }}>(Short Range)</span>
                  </span>
                  <span style={{
                    position: 'absolute',                    
                    fontWeight: 700,
                    color: '#3b82f6',
                    fontSize: '0.95rem',
                    whiteSpace: 'nowrap',
                    transform: 'translateX(-50%)',
                    textAlign: 'center',
                    left: `${((rfidPower - 9) / 20) * 90}%`                    
                  }}>
                    {rfidPower} dBm
                  </span>
                  <span style={{
                    fontSize: '0.95rem',
                    color: '#9ca3af',
                    textAlign: 'right',
                    marginTop: '1.1rem',
                    marginRight: '4px',
                  }}>
                    30 dBm<br /><span style={{ fontSize: '0.7rem' }}>(Long Range)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Sensor Range Control */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              marginTop: '0.5rem', 
              paddingTop: '1rem',
              paddingLeft: '2rem',
              paddingRight: '0rem',
              paddingBottom: '1rem',                
              borderRadius: '1rem',
              boxShadow: '0 0 12px rgba(27, 27, 27, 1)'    
            }}>
              <label style={{
                fontSize: '0.85rem',
                fontWeight: 500,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',     
                textAlign: 'center'           
              }}>
                <span style={{ gap: '0.5rem', padding: '0rem', alignItems: 'center', fontWeight: 600 }}>
                  Sensor Detection Range: {sensorRange} meters
                </span>
                <span style={{ fontSize: '0.70rem', color: '#a0a0a0', fontWeight: 400, marginTop: '0.25rem' }}>
                  Adjust motion detection range (1m = close, 10m = far)
                </span>
              </label>
              <div style={{ position: 'relative', marginTop: '0.75rem' }}>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={sensorRange}
                  onChange={(e) => setSensorRange(e.target.value)}
                  onMouseUp={(e) => updateSensorRange(e.target.value)}
                  onTouchEnd={(e) => updateSensorRange(e.target.value)}
                  disabled={isConfiguring}
                  className="control-slider"
                  style={{
                    width: '93%',
                    height: '1rem',
                    borderRadius: '8px',
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((sensorRange - 1) / 9) * 100}%, #0f0f0f ${((sensorRange - 1) / 9) * 100}%, #0f0f0f 100%)`,
                    boxShadow: '0 2px 1px rgba(105, 105, 105, 1)',
                    border: '5px solid #000000',
                    outline: 'none',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    cursor: 'pointer'
                  }}
                />
                {/* <div style={{ position: 'relative', width: '100%', height: '30px', marginTop: '8px' }}> */}
                <div style={{ position: 'relative', width: '93%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>                  
                  <span style={{
                    fontSize: '0.95rem',
                    color: '#9ca3af',
                    textAlign: 'left',
                    marginTop: '1.1rem',
                    marginLeft: '0.75rem',
                  }}>
                    1 m<br /><span style={{ fontSize: '0.7rem' }}>(Short Range)</span>
                  </span>                  
                  <span style={{
                    position: 'absolute',
                    fontWeight: 700,
                    color: '#3b82f6',
                    fontSize: '0.95rem',
                    whiteSpace: 'nowrap',
                    transform: 'translateX(-50%)',
                    textAlign: 'center',
                    left: `${((sensorRange - 0.59) / 9) * 92.25}%`
                  }}>
                    {sensorRange} m
                  </span>
                  <span style={{
                    fontSize: '0.95rem',
                    color: '#9ca3af',
                    textAlign: 'right',
                    marginTop: '1.1rem',
                    marginRight: '4px',
                  }}>
                    10 m<br /><span style={{ fontSize: '0.7rem' }}>(Long Range)</span>
                  </span>                  
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Status Cards */}
        <div className="status-grid">
          <div className="status-card">
            <div className="status-icon">
              <img 
                src={isConnected && systemStatus?.rfid_reader?.includes('connected') ? '/src/assets/images/icon-rfid-reader-on.svg' : '/src/assets/images/icon-rfid-reader-off.svg'} 
                alt="RFID Reader" 
                style={{ width: '90px', height: '90px' }}
              />
            </div>
            <div className="status-content">
              <p className="status-label">RFID Reader</p>
              <p className={`status-value ${isConnected && systemStatus?.rfid_reader?.includes('connected') ? 'status-connected' : 'status-disconnected'}`}>
                {isConnected ? (systemStatus?.rfid_reader || 'Offline') : 'Offline'}
              </p>
            </div>
          </div>

          <div className="status-card">
            <div className="status-icon status-icon-green">
              <img 
                src={isConnected && systemStatus?.sensor_inside?.includes('connected') ? '/src/assets/images/icon-inside-sensor-on.svg' : '/src/assets/images/icon-inside-sensor-off.svg'} 
                alt="Inside Sensor" 
                style={{ width: '90px', height: '90px' }}
              />
            </div>
            <div className="status-content">
              <p className="status-label">Inside Sensor</p>
              <p className={`status-value ${isConnected && systemStatus?.sensor_inside?.includes('connected') ? 'status-connected' : 'status-disconnected'}`}>
                {isConnected ? (systemStatus?.sensor_inside || 'Offline') : 'Offline'}
              </p>
            </div>
          </div>

          <div className="status-card">
            <div className="status-icon status-icon-blue">
              <img 
                src={isConnected && systemStatus?.sensor_outside?.includes('connected') ? '/src/assets/images/icon-outside-sensor-on.svg' : '/src/assets/images/icon-outside-sensor-off.svg'} 
                alt="Outside Sensor" 
                style={{ width: '90px', height: '90px' }}
              />
            </div>
            <div className="status-content">
              <p className="status-label">Outside Sensor</p>
              <p className={`status-value ${isConnected && systemStatus?.sensor_outside?.includes('connected') ? 'status-connected' : 'status-disconnected'}`}>
                {isConnected ? (systemStatus?.sensor_outside || 'Offline') : 'Offline'}
              </p>
            </div>
          </div>

          <div className="status-card">
            <div className="status-icon status-icon-orange">
              <img 
                src={isConnected && systemStatus?.rfid_reader?.includes('connected') && systemStatus?.sensor_inside?.includes('connected') && systemStatus?.sensor_outside?.includes('connected') ? '/src/assets/images/icon-raspi-on.svg' : '/src/assets/images/icon-raspi-off.svg'} 
                alt="Raspberry Pi" 
                style={{ width: '90px', height: '90px' }}
              />
            </div>
            <div className="status-content">
              <p className="status-label">Raspberry Pi</p>

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
            <div className="section-header">
              <h2 className="section-title">Recent Activity</h2>
              <div>
                {recentRecords.length > 0 && (
                  <button
                    className="action-btn action-btn-danger action-btn-small"
                    onClick={() => setShowClearModal(true)}
                  >
                    Clear Activity
                  </button>
                )}
              </div>
            </div>
            <div className="activity-table">
              {recentRecords.length === 0 ? (
                <p className="no-data">No activity yet...</p>
              ) : (
                <table>
                      <thead>
                          <tr>
                            <th>Tag ID</th>
                            <th>Direction</th>
                            <th>Room Name</th>
                            <th>Building Name</th>
                            <th>DATE TIME (Calgary, AB)</th>
                          </tr>
                      </thead>
                  <tbody>
                    {[...recentRecords].sort((a, b) => {
                      try {
                        const timeA = parseRecordDate(a.read_date).getTime();
                        const timeB = parseRecordDate(b.read_date).getTime();
                        return timeB - timeA; // Latest first
                      } catch (e) {
                        return 0;
                      }
                    }).map((record, index) => (
                      <tr key={`${record.rfid_tag}-${record.read_date}-${index}`}>
                            <td className="tag-cell">{record.rfid_tag}</td>
                            <td>
                              <span className={`direction-badge direction-${(record.direction||'').toLowerCase()}`}>
                                {record.direction === 'IN' ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
                                {record.direction}
                              </span>
                            </td>
                            {
                              (() => {
                                const { room, building } = getRoomAndBuilding(record);
                                return (
                                  <>
                                    <td className="location-cell">{room}</td>
                                    <td className="location-cell">{building}</td>
                                  </>
                                );
                              })()
                            }
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