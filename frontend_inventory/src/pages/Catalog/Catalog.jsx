// frontend_inventory/pages/Catalog/Catalog.jsx
import React, { useState, useEffect } from 'react';
import { Search, Grid, List, Package, Monitor, Keyboard, Mouse, Video, Tv, Armchair } from 'lucide-react';
import FDPChair from '../../assets/images/FDP_School_Chair.png';
import './Catalog.css';

const CATALOG_URL = import.meta.env.VITE_CATALOG_URL || "http://24.199.117.200:8081/assets";

const Catalog = () => {
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [catalogItems, setCatalogItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCatalogItems = async () => {
      try {
        setLoading(true);
        const response = await fetch(CATALOG_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Catalog API Response:', data); // Debug log
        setCatalogItems(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching catalog items:', err);
        setError('Failed to load catalog items. Please try again later.');
        setCatalogItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalogItems();
  }, []);

  const filteredItems = catalogItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Map icon names from API to Lucide React components based on item name or category
  const getIconComponent = (item) => {
    if (!item) return '📦';
    
    const name = (item.name || '').toLowerCase();
    const category = (item.category || '').toLowerCase();
    
    // Match based on item name keywords - return emoji
    if (name.includes('chair')) return '🪑';
    if (name.includes('mouse')) return '🖱️';
    if (name.includes('monitor')) return '🖥️';
    if (name.includes('keyboard')) return '⌨️';
    if (name.includes('tv') || name.includes('television')) return '📺';
    if (name.includes('webcam') || name.includes('camera')) return '📹';
    
    // Match based on category
    if (category.includes('furniture')) return '🪑';
    if (category.includes('display')) return '🖥️';
    if (category.includes('accessories')) return '📦';
    if (category.includes('electronics')) return '📺';
    
    // Default fallback
    return '📦';
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

        {loading ? (
          <div className="no-results-catalog">
            <Package size={48} className="no-results-icon" />
            <p>Loading catalog items...</p>
          </div>
        ) : error ? (
          <div className="no-results-catalog">
            <Package size={48} className="no-results-icon" />
            <p>{error}</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="catalog-grid">
            {filteredItems.map((item) => {
              const emoji = getIconComponent(item);
              return (
                <div key={item.id} className="catalog-card">
                  <div className="catalog-card-image">
                    <span className="item-emoji">{emoji}</span>
                  </div>
                  <div className="catalog-card-content">
                    <span className="catalog-category">{item.category}</span>
                    <h3 className="catalog-item-name">{item.name}</h3>
                    <p className="catalog-description">{item.description}</p>
                    <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.5rem' }}>
                      <strong>Tag ID:</strong> {item.tagId}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.25rem' }}>
                      <strong>Purchase Date:</strong> {new Date(item.purchaseDate).toLocaleDateString()}
                    </p>
                    <div className="catalog-footer">
                      <span className="catalog-price">${item.purchasePrice}</span>
                      {/* <button className="btn-add-to-inventory">Add to Inventory</button> */}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="catalog-list">
            {filteredItems.map((item) => {
              const emoji = getIconComponent(item);
              return (
                <div key={item.id} className="catalog-list-item">
                  <div className="list-item-image">
                    <span className="item-emoji-small">{emoji}</span>
                  </div>
                  <div className="list-item-content">
                    <div className="list-item-info">
                      <h3 className="list-item-name">{item.name}</h3>
                      <span className="list-item-category">{item.category}</span>
                    </div>
                    <p className="list-item-description">{item.description}</p>
                    <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.5rem' }}>
                      <strong>Tag ID:</strong> {item.tagId} | <strong>Purchase Date:</strong> {new Date(item.purchaseDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="list-item-actions">
                    <span className="list-item-price">${item.purchasePrice}</span>
                    {/* <button className="btn-add-list">Add to Inventory</button> */}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && !error && filteredItems.length === 0 && (
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