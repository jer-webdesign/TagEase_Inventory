// frontend_inventory/src/App.jsx
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar/Navbar';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
// import Dashboard from './pages/Dashboard/Dashboard';
import IntegratedDashboard from './pages/Dashboard/IntegratedDashboard';
import Inventory from './pages/Inventory/Inventory';
import Catalog from './pages/Catalog/Catalog';
import About from './pages/About/About';
import Login from './pages/Login/Login';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('about');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Optionally verify token validity with API
      setIsAuthenticated(true);
  // If a hard-refresh requested Reader Setup, honor it and clear the flag
      const initialPage = localStorage.getItem('initialPage');
      if (initialPage) {
        setCurrentPage(initialPage);
        localStorage.removeItem('initialPage');
      }
    }
  }, []);

  const handleLogin = (data) => {
    setIsAuthenticated(true);
    setCurrentPage('about');
  };

  const handleLogout = () => {
    // Remove token and user data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setCurrentPage('about');
  };

  const renderPage = () => {
    if (!isAuthenticated && currentPage === 'login') {
      return <Login onLogin={handleLogin} />;
    }

    if (!isAuthenticated) {
      return <Login onLogin={handleLogin} />;
    }

    switch (currentPage) {
      // case 'dashboard':
      case 'dashboard':
        console.log("Rendering IntegratedDashboard");
        return <IntegratedDashboard />;
      case 'inventory':
        return <Inventory />;
      case 'catalog':
        return <Catalog />;
      case 'about':
        return <About />;
      default:
        return <About />;
    }
  };

  return (
    <div className="app">



      {/* Navbar sits below the header when authenticated */}
      {isAuthenticated && (
        <>
          {/* Header should always be visible at the top */}
          {/* <Header /> */}
          <Navbar
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            onLogout={handleLogout}
          />
        </>
      )}

      <main className={isAuthenticated ? "main-content" : "main-content--no-navbar"}>
        {renderPage()}
        <Footer />
      </main>
    </div>
  );
}

export default App;