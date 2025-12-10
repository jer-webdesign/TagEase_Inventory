// frontend/src/components/Navbar/Navbar.jsx
import React, { useState } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import logo from '../../assets/images/TagEase_white_logo.png';
import './Navbar.css';

const Navbar = ({ currentPage, setCurrentPage, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleNavClick = (page) => {
    setCurrentPage(page.toLowerCase());
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    if (onLogout) {
      onLogout();
    }
  };

  // menuItems: label shown in UI and internal key used for routing
  const menuItems = [
    { label: 'Reader Setup', key: 'dashboard' },
    { label: 'Inventory', key: 'inventory' },
    { label: 'Catalog', key: 'catalog' },
    { label: 'Support', key: 'support' }
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-content">
          {/* Logo */}
          <div className="navbar-logo">
            <img src={logo} alt="TagEase logo" className="logo-image" />
            {/* <span className="logo-text">TagEase</span> */}
          </div>

          {/* Desktop Menu */}
          <div className="navbar-menu-desktop">
            {menuItems.map((item) => (
              <button
                key={item.key}
                onClick={() => { setCurrentPage(item.key); setIsMenuOpen(false); }}
                className={`nav-link ${currentPage === item.key ? 'active' : ''}`}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="nav-link logout-btn"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="navbar-menu-mobile">
            <button
              onClick={toggleMenu}
              className="menu-toggle"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-menu-items">
            {menuItems.map((item) => (
              <button
                key={item.key}
                onClick={() => { setCurrentPage(item.key); setIsMenuOpen(false); }}
                className={`mobile-nav-link ${currentPage === item.key ? 'active' : ''}`}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="mobile-nav-link logout-link"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;