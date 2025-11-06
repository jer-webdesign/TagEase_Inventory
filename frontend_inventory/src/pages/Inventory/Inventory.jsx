// frontend_inventory/pages/Inventory/Inventory.jsx
import React, { useState } from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import './Inventory.css';

const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const inventoryItems = [
    { 
      id: 1, 
      name: 'FDP 18" School Chair', 
      category: 'Furniture', 
      readerMAC: 'B8:27:EB:3A:14:9C',
      tagID: 'E20000A1B2C3D4E5F67890',
      direction: 'IN',
      roomName: 'MD302',
      buildingName: 'Stan Grad Centre' 
    },
    { 
      id: 2, 
      name: 'SIHOO M57 Ergonomic Office Chair', 
      category: 'Furniture', 
      readerMAC: 'B8:27:EB:7F:25:D2',
      tagID: 'E20000F0E1D2C3B4A59687',
      direction: 'IN',
      roomName: 'CA416',
      buildingName: 'Aldred Centre' 
    },
    { 
      id: 3, 
      name: '47 inch Office Desk', 
      category: 'Furniture', 
      readerMAC: 'DC:A6:32:1C:4E:AA',
      tagID: 'E2000055AA66BB77CC8899',
      direction: 'OUT',
      roomName: 'G230',
      buildingName: 'E.H. Crandell Building' 
    },
    { 
      id: 4, 
      name: 'IKEA BEKANT Desk', 
      category: 'Furniture', 
      readerMAC: 'DC:A6:32:8B:56:73',
      tagID: 'E200001122334455667788',
      direction: 'OUT',
      roomName: 'Q100',
      buildingName: 'Eugene Coste Building' 
    },
    { 
      id: 5, 
      name: 'Herman Miller Aeron Chair', 
      category: 'Furniture', 
      readerMAC: 'E4:5F:01:9A:3D:1F',
      tagID: 'E20000CAFEBABE00DEAD55',
      direction: 'IN',
      roomName: 'AA211',
      buildingName: 'Heritage Hall' 
    },
    { 
      id: 6, 
      name: 'Bush Business Furniture', 
      category: 'Furniture', 
      readerMAC: 'E4:5F:01:7C:42:87',
      tagID: 'E20000FACEFEEDBEEF1234',
      direction: 'OUT',
      roomName: 'E124',
      buildingName: 'John Ware Building' 
    },
    { 
      id: 7, 
      name: 'SAMSUNG 65-Inch U8000 Smart TV', 
      category: 'Electronics', 
      readerMAC: 'B8:27:EB:9E:64:C5',
      tagID: 'E20000BEEFCAFE01234567',
      direction: 'IN',
      roomName: 'KA440',
      buildingName: 'Johnson-Cobbe Energy Centre' 
    },
    { 
      id: 8, 
      name: 'Conference Table', 
      category: 'Furniture', 
      readerMAC: 'DC:A6:32:27:18:EF',
      tagID: 'E200000102030405060708',
      direction: 'OUT',
      roomName: 'NR213',
      buildingName: 'Senator Burns Building' 
    },
    { 
      id: 9, 
      name: 'HON 10500 Series Desk Shell', 
      category: 'Furniture', 
      readerMAC: 'E4:5F:01:43:2B:66',
      tagID: 'E20000D4D3C2B1A0987654',
      direction: 'IN',
      roomName: 'TT470',
      buildingName: 'Thomas Riley Building' 
    },
  ];

  const filteredItems = inventoryItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.roomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.buildingName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="inventory">
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
          <table className="inventory-table">
            <thead style={{backgroundColor: '#1d4ed8', color: '#ffffffff'}}>
              <tr>
                <th>Asset Name</th>
                <th>Category</th>
                <th>Tag ID</th>
                <th>Direction</th>
                <th>Room Name</th>
                <th>Building Name</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td data-label="Asset Name" className="item-name">{item.name}</td>
                  <td data-label="Category">{item.category}</td>
                  <td data-label="Tag ID" style={{fontFamily: 'monospace', fontSize: '0.8rem'}}>
                    {item.tagID}
                  </td>
                  <td data-label="Direction">
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      backgroundColor: item.direction === 'IN' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                      color: item.direction === 'IN' ? '#86efac' : '#fca5a5'
                    }}>
                      {item.direction}
                    </span>
                  </td>
                  <td data-label="Room Name">{item.roomName}</td>
                  <td data-label="Building Name">{item.buildingName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="no-results">
            <p>No assets found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;