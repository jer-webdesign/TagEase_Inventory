import React from 'react';
import './Footer.css';

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-left">
          {/* <div className="brand-small">TagEase</div> */}
          <div className="muted">© {year} TagEase — All rights reserved.</div>
        </div>
        <div className="footer-right">
          <a href="#" onClick={(e) => e.preventDefault()} className="footer-link">About</a>
          <a href="#" onClick={(e) => e.preventDefault()} className="footer-link">Privacy</a>
          <a href="#" onClick={(e) => e.preventDefault()} className="footer-link">Terms</a>          
        </div>
      </div>
    </footer>
  );
};

export default Footer;
