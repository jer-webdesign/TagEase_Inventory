import React, { useState } from 'react';
import Modal from '../Modal/Modal';
import './Header.css';

const Header = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="header-center">
          <a className="contact-link" href="tel:+14039451243">Tel. +1-403-945-1243</a>
          <a className="contact-link" href="mailto:sale@tagease.com">sale@tagease.com</a>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Quick Add Item"
      >
        <form className="quick-add-form" onSubmit={(e) => { e.preventDefault(); setIsModalOpen(false); }}>
          <label>
            Item name
            <input name="name" type="text" placeholder="e.g. Wireless Mouse" required />
          </label>
          <label>
            Quantity
            <input name="qty" type="number" min="1" defaultValue="1" required />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Add</button>
          </div>
        </form>
      </Modal>
    </header>
  );
};

export default Header;
