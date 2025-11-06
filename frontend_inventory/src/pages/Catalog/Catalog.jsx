// frontend_inventory/pages/Catalog/Catalog.jsx
import React, { useState } from 'react';
import { Search, Grid, List, Package } from 'lucide-react';
import FDPChair from '../../assets/images/FDP_School_Chair.png';
import './Catalog.css';

const Catalog = () => {
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');

  const catalogItems = [
  { id: 1, name: 'FDP 18" School Chair', category: 'Furniture', price: '$599.99', image: FDPChair, description: 'Stacking Student Seat with Chromed Steel Legs and Nylon Swivel Glides; for in-Home Learning, Classroom or Office' },
    { id: 2, name: 'Ergonomic Office Chair', category: 'Furniture', price: '$399', image: '🪑', description: 'Comfortable seating for long work hours' },
    { id: 3, name: 'Wireless Mouse', category: 'Accessories', price: '$49', image: '🖱️', description: 'Bluetooth enabled precision mouse' },
    { id: 4, name: 'USB-C Hub', category: 'Accessories', price: '$79', image: '🔌', description: 'Multi-port connectivity solution' },
    { id: 5, name: 'Monitor 27" 4K', category: 'Displays', price: '$599', image: '🖥️', description: 'Ultra HD display with HDR support' },
    { id: 6, name: 'Mechanical Keyboard', category: 'Accessories', price: '$149', image: '⌨️', description: 'RGB backlit gaming keyboard' },
    { id: 7, name: 'Desk Lamp LED', category: 'Lighting', price: '$69', image: '💡', description: 'Adjustable brightness desk lamp' },
    { id: 8, name: 'Webcam HD', category: 'Electronics', price: '$129', image: '📹', description: '1080p video conferencing camera' },
  ];

  const filteredItems = catalogItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper to detect if a string is an image path (png/jpg/svg/etc.)
  const isImagePath = (val) => {
    return typeof val === 'string' && /\.(png|jpe?g|svg|gif|webp)(\?.*)?$/i.test(val);
  };

  return (
    <div className="catalog">
      <div className="catalog-container">
        <div className="catalog-header">
          <div>
            <h1 className="catalog-title">Product Catalog</h1>
            <p className="catalog-subtitle">Browse available items for your inventory</p>
          </div>
        </div>

        <div className="catalog-controls">
          <div className="search-box-catalog">
            <Search size={20} className="search-icon-catalog" />
            <input
              type="text"
              placeholder="Search catalog..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input-catalog"
            />
          </div>
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <Grid size={20} />
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <List size={20} />
            </button>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div className="catalog-grid">
            {filteredItems.map((item) => (
              <div key={item.id} className="catalog-card">
                <div className="catalog-card-image">
                  {isImagePath(item.image) ? (
                    <img src={item.image} alt={item.name} className="catalog-item-img" />
                  ) : typeof item.image === 'string' ? (
                    <span className="item-emoji">{item.image}</span>
                  ) : (
                    <img src={item.image} alt={item.name} className="catalog-item-img" />
                  )}
                </div>
                <div className="catalog-card-content">
                  <span className="catalog-category">{item.category}</span>
                  <h3 className="catalog-item-name">{item.name}</h3>
                  <p className="catalog-description">{item.description}</p>
                  <div className="catalog-footer">
                    <span className="catalog-price">{item.price}</span>
                    {/* <button className="btn-add-to-inventory">Add to Inventory</button> */}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="catalog-list">
            {filteredItems.map((item) => (
              <div key={item.id} className="catalog-list-item">
                <div className="list-item-image">
                  {isImagePath(item.image) ? (
                    <img src={item.image} alt={item.name} className="list-item-img" />
                  ) : typeof item.image === 'string' ? (
                    <span className="item-emoji-small">{item.image}</span>
                  ) : (
                    <img src={item.image} alt={item.name} className="list-item-img" />
                  )}
                </div>
                <div className="list-item-content">
                  <div className="list-item-info">
                    <h3 className="list-item-name">{item.name}</h3>
                    <span className="list-item-category">{item.category}</span>
                  </div>
                  <p className="list-item-description">{item.description}</p>
                </div>
                <div className="list-item-actions">
                  <span className="list-item-price">{item.price}</span>
                  {/* <button className="btn-add-list">Add to Inventory</button> */}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredItems.length === 0 && (
          <div className="no-results-catalog">
            <Package size={48} className="no-results-icon" />
            <p>No items found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Catalog;