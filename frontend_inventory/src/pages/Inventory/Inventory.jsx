// frontend_inventory/pages/Inventory/Inventory.jsx
import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, ArrowRight, ArrowLeft } from 'lucide-react';
import './Inventory.css';

const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const INVENTORY_URL = import.meta.env.VITE_INVENTORY_URL || 'http://24.199.117.200:8081/inventory?size=200&sort=moveDate,desc';

  // Toasts for user feedback
  const [toasts, setToasts] = useState([]);
  const showToast = (message, type = 'success', timeout = 4000) => {
    const id = Date.now() + Math.random();
    const t = { id, message, type };
    setToasts((s) => [...s, t]);
    setTimeout(() => setToasts((s) => s.filter(x => x.id !== id)), timeout);
  };

  // Helper to find the raw date field on an item (supports different backends)
  const getRawDate = (it) => it && (it.dateTime || it.read_date || it.readDate || it.readDateTime || it.read_date_time || it.date || it.timestamp || it.purchaseDate);

  const normalizeInventoryRecord = (rec) => {
    if (!rec) return null;

    // Handle nested structure from dispatcher API
    // Example: { assetSnapshot: { name, tagId }, readerSnapshot: { macAddress, buildingName, roomName }, movementDirection, moveDate }
    let name, tagID, direction, roomName, buildingName, dateTime, readerMAC, category;

    if (rec.assetSnapshot) {
      // New dispatcher API structure
      name = rec.assetSnapshot.name || 'Unknown Asset';
      tagID = rec.assetSnapshot.tagId || rec.assetSnapshot.tagID || '';
      category = rec.assetSnapshot.category || 'Unknown Category';
      
      if (rec.readerSnapshot) {
        readerMAC = rec.readerSnapshot.macAddress || '';
        roomName = rec.readerSnapshot.roomName || '';
        buildingName = rec.readerSnapshot.buildingName || '';
      } else {
        readerMAC = '';
        roomName = '';
        buildingName = '';
      }
      
      direction = rec.movementDirection || rec.direction || '';
      dateTime = rec.moveDate || rec.createdAt || '';
    } else {
      // Fallback to flat structure
      name = rec.name || rec.asset_name || rec.assetName || 'Unknown Asset';
      category = rec.category || 'Unknown Category';
      tagID = rec.tagId || rec.tagID || rec.tag_id || rec.rfid_tag || rec.rfidTag || '';
      direction = rec.direction || rec.dir || '';
      roomName = rec.roomName || rec.room || rec.room_name || '';
      buildingName = rec.buildingName || rec.building || rec.building_name || rec.location || '';
      dateTime = rec.dateTime || rec.read_date || rec.readDate || rec.date || rec.timestamp || rec.purchaseDate || '';
      readerMAC = rec.readerMAC || rec.reader_mac || rec.mac || rec.macAddress || '';
    }
    
    // Generate ID if not present
    const id = rec.id || rec._id || Date.now() + Math.random();

    return { 
      id,
      name, 
      category, 
      tagID,
      direction,
      roomName, 
      buildingName,
      dateTime,
      readerMAC
    };
  };

  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch inventory data from API on mount
  useEffect(() => {
    const loadInventory = async () => {
      try {
        setLoading(true);
        const res = await fetch(INVENTORY_URL);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        console.log('=== INVENTORY API DEBUG ===');
        console.log('Raw API Response:', data);
        console.log('Response Type:', typeof data);
        console.log('Is Array:', Array.isArray(data));
        console.log('Object Keys:', data && typeof data === 'object' ? Object.keys(data) : 'N/A');
        
        // If it's an object, log first item from any array property
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          Object.entries(data).forEach(([key, value]) => {
            if (Array.isArray(value) && value.length > 0) {
              console.log(`Found array at key "${key}" with ${value.length} items`);
              console.log(`First item in ${key}:`, value[0]);
            }
          });
        }
        
        // Handle different response structures
        let serverArray = [];
        if (Array.isArray(data)) {
          serverArray = data;
        } else if (data && typeof data === 'object') {
          // Check for common data wrapper properties
          if (Array.isArray(data.data)) {
            serverArray = data.data;
          } else if (Array.isArray(data.records)) {
            serverArray = data.records;
          } else if (Array.isArray(data.inventory)) {
            serverArray = data.inventory;
          } else if (Array.isArray(data.items)) {
            serverArray = data.items;
          } else if (Array.isArray(data.assets)) {
            serverArray = data.assets;
          } else {
            // If it's an object with values that might be arrays, try to find the first array
            const values = Object.values(data);
            const firstArray = values.find(v => Array.isArray(v));
            if (firstArray) {
              serverArray = firstArray;
            }
          }
        }
        
        console.log('Extracted array length:', serverArray.length);
        if (serverArray.length > 0) {
          console.log('First extracted item:', serverArray[0]);
        }
        
        const normalized = serverArray.map(normalizeInventoryRecord).filter(item => item !== null);
        console.log('Normalized items count:', normalized.length);
        if (normalized.length > 0) {
          console.log('First normalized item:', normalized[0]);
        }
        console.log('=== END DEBUG ===');
        
        setInventoryItems(normalized);
        setError(null);
      } catch (err) {
        console.error('Error fetching inventory:', err);
        setError('Failed to load inventory. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    // Load inventory once on mount
    loadInventory();
  }, [INVENTORY_URL]);

  // Parse record date string used by backend into a Date
  const parseRecordDate = (dateStr) => {
    try {
      const s = String(dateStr || '').trim();
      // Try the hyphen-split format first (legacy stored format)
      const parts = s.split('-');
      if (parts.length >= 6 && /^\d{4}$/.test(parts[0])) {
        const year = parseInt(parts[0], 10) || 0;
        const month = (parseInt(parts[1], 10) || 1) - 1;
        const day = parseInt(parts[2], 10) || 1;
        let hour = parseInt(parts[3], 10) || 0;
        const minute = parseInt(parts[4], 10) || 0;
        const second = parseInt(parts[5], 10) || 0;
        // parts[6] may contain ms with AM/PM attached (eg. '8251PM')
        let ms = 0;
        let ampm = null;
        if (parts[6]) {
          const m = String(parts[6]);
          const ampmMatch = m.match(/(am|pm)$/i);
          if (ampmMatch) {
            ampm = ampmMatch[1];
            const msPart = m.replace(/(am|pm)$/i, '');
            ms = parseInt(msPart, 10) || 0;
          } else {
            ms = parseInt(m, 10) || 0;
          }
        }
        // if am/pm is in parts[7], prefer that
        if (parts[7] && /^(AM|PM|am|pm)$/.test(parts[7])) ampm = parts[7];
        if (ampm) {
          if (String(ampm).toUpperCase() === 'PM' && hour < 12) hour += 12;
          if (String(ampm).toUpperCase() === 'AM' && hour === 12) hour = 0;
        }
        return new Date(year, month, day, hour, minute, second, ms);
      }

      // Fallback: try letting JS parse common date formats
      const parsed = Date.parse(s);
      if (!isNaN(parsed)) return new Date(parsed);
    } catch (e) {
      // fall through to return epoch
    }
    return new Date(0);
  };

  // Format date/time for display (Calgary timezone / America/Edmonton)
  const formatDateTime = (dateStr) => {
    // Parse and format directly from the stored string to avoid timezone conversions
    try {
      if (!dateStr) return '';
      // Normalize trailing AM/PM attached to digits (e.g. "5423PM" -> "5423 PM")
      const s = String(dateStr).trim().replace(/([ap]m)$/i, ' $1');

      // hyphen format: YYYY-MM-DD-HH-MM-SS(-ms)?(-AM/PM)?
      let m = s.match(/^(\d{4})-(\d{2})-(\d{2})-(\d{1,2})-(\d{2})-(\d{2})(?:-(\d{1,3}))?(?:-?\s*(AM|PM|am|pm))?$/);
      if (!m) {
        // colon format: YYYY-MM-DD HH:MM:SS(.ms)? [AM/PM]?
        m = s.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?\s*(AM|PM|am|pm)?$/);
      }

      if (!m) {
        // fallback: numeric extraction
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

      const YYYY = m[1];
      const MM = m[2];
      const DD = m[3];
      let hour = parseInt(m[4], 10);
      const minute = m[5];
      const second = m[6];
      const ampm = (m[8] || m[7]) ? String(m[8] || m[7]) : null;

      // Prefer explicit marker anywhere in the original string, else infer from hour
      const dp = /pm/i.test(s) ? 'pm' : (/am/i.test(s) ? 'am' : (hour >= 12 ? 'pm' : 'am'));

      let hh = hour % 12;
      if (hh === 0) hh = 12;
      hh = String(hh).padStart(2, '0');

      const gap = '\u00A0\u00A0\u00A0\u00A0\u00A0';
      return `${YYYY}-${MM}-${DD}${gap}${hh}:${minute}:${second} ${dp}`;
    } catch (e) {
      return dateStr || '';
    }
  };

  // Show newest records on top. Sort by parsed `dateTime` descending, fallback to `id`.
  // First, sort all items by date (newest first)
  const sortedItems = [...inventoryItems].sort((a, b) => {
    try {
      const ta = a && getRawDate(a) ? parseRecordDate(getRawDate(a)).getTime() : NaN;
      const tb = b && getRawDate(b) ? parseRecordDate(getRawDate(b)).getTime() : NaN;
      if (!isNaN(ta) && !isNaN(tb)) return tb - ta;
    } catch (e) {
      // ignore and fallback to id
    }
    return (b.id || 0) - (a.id || 0);
  });

  // Deduplicate: Keep only records per tagID that are more than 5 seconds apart
  const uniqueItems = [];
  const lastSeenTime = new Map(); // Map<tagID, timestamp>
  
  for (const item of sortedItems) {
    const tagID = item.tagID || '';
    if (!tagID) continue;
    
    try {
      const currentTime = parseRecordDate(getRawDate(item)).getTime();
      const lastTime = lastSeenTime.get(tagID);
      
      // If we haven't seen this tagID, or it's been more than 5 seconds, include it
      if (!lastTime || Math.abs(currentTime - lastTime) > 5000) {
        uniqueItems.push(item);
        lastSeenTime.set(tagID, currentTime);
      }
      // Otherwise skip this duplicate (within 5 seconds)
    } catch (e) {
      // If we can't parse the date, include the item to be safe
      uniqueItems.push(item);
    }
  }

  const filteredItems = uniqueItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.roomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.buildingName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="inventory">
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
              minWidth: 220
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
      <div className="inventory-container">
        <div className="inventory-header">
          <div>
            <h1 className="inventory-title">RFID Asset Tracking</h1>
            <p className="inventory-subtitle">Monitor asset location and movement across buildings</p>
          </div>
          {/* <button className="btn-add-inventory">
            <Plus size={20} />
            Add Asset
          </button> */}
        </div>

        <div className="inventory-controls">
          <div className="search-box">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <button className="btn-filter">
            <Filter size={20} />
            Filter
          </button>
        </div>

        <div className="inventory-table-container">
          {loading ? (
            <div className="no-results">
              <p>Loading inventory data...</p>
            </div>
          ) : error ? (
            <div className="no-results">
              <p>{error}</p>
            </div>
          ) : (
            <table className="inventory-table">
              <thead>
                  <tr>
                    <th>ASSET NAME</th>
                    <th>TAG ID</th>
                    <th>DIRECTION</th>
                    <th>ROOM NAME</th>
                    <th>BUILDING NAME</th>
                    <th className="date-header">DATE TIME (CALGARY, AB)</th>
                  </tr>
              </thead>
              <tbody>
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                      <tr key={item.id}>
                        <td data-label="Asset Name" className="item-name">{item.name}</td>
                        <td data-label="Tag ID" style={{fontFamily: 'monospace', fontSize: '1rem'}}>
                          {item.tagID}
                        </td>
                        <td data-label="Direction">
                              <span className={`direction-badge direction-${(item.direction||'').toLowerCase()}`}>
                                {item.direction === 'IN' ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
                                {item.direction}
                          </span>
                        </td>
                        <td data-label="Room Name">{item.roomName}</td>
                        <td data-label="Building Name">{item.buildingName}</td>
                        <td data-label="Date / Time" className="time-cell">{getRawDate(item) ? formatDateTime(getRawDate(item)) : ''}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{textAlign: 'center', padding: '2rem'}}>
                        No inventory items found. Total items: {inventoryItems.length}, Filtered: {filteredItems.length}
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          )}
        </div>

        {!loading && !error && filteredItems.length === 0 && (
          <div className="no-results">
            <p>No assets found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;