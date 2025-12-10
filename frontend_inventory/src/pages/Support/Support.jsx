// frontend_inventory/src/pages/Support/Support.jsx
import React, { useState } from 'react';
import './Support.css';

const Support = () => {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [expandedTroubleshooting, setExpandedTroubleshooting] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    issue: '',
    description: ''
  });

  const faqs = [
    {
      id: 1,
      question: 'Where should I set up the RFID sticker on my asset?',
      answer: 'Place the RFID sticker on a flat, clean surface of your asset. Avoid metal surfaces as they can interfere with the signal. For best results, position it near the edge where the reader will be positioned.'
    },
    {
      id: 2,
      question: 'How can I adjust the reader distance?',
      answer: 'The reader distance can be adjusted in the Reader Setup page. Navigate to Reader Setup and use the range slider to adjust the detection distance. Test the new setting to ensure proper coverage.'
    },
    {
      id: 3,
      question: 'How does the combination of UHF RFID and MmWave sensors improve inventory tracking accuracy?',
      answer: 'The M5Stack UHF RFID reader identifies specific assets by reading their unique tags from several meters away, while the Waveshare MmWave sensors detect human presence at entry and exit points. This dual-sensor approach ensures asset movements are only recorded when personnel are actually present, eliminating false positives from environmental factors like air currents or vibrations. The 24GHz radar detects even subtle human movements, creating a reliable audit trail that RFID-only systems cannot provide.'
    },
    {
      id: 4,
      question: 'What is the effective range for both the RFID reader and MmWave sensors in a typical warehouse environment?',
      answer: 'The M5Stack UHF RFID reader achieves read ranges of 3-8 meters depending on tag type and environmental interference. The Waveshare S3KM1110 MmWave sensor detects human presence up to 5 meters with high sensitivity to micro-movements. The 24GHz frequency provides excellent penetration through clothing and packaging without being affected by lighting, temperature, or dust—common warehouse challenges.'
    },
    {
      id: 5,
      question: 'What are the power requirements and connectivity options for deploying this system?',
      answer: "The M5Stack operates on 5V via USB-C or battery (500-800mA during active reading), while the MmWave sensors require 5V DC (100-150mA). The M5Stack offers Wi-Fi, Bluetooth, and RS485/UART interfaces for integration with inventory systems through MQTT, HTTP APIs, or serial communication. The MmWave sensors connect via UART to the M5Stack's GPIO pins. Consider PoE adapters or industrial power supplies for warehouse deployment."
    }
  ];

  const troubleshootingItems = [
    {
      id: 1,
      question: 'The RFID reader detects tags inconsistently or has significantly reduced range. What could be causing this?',
      answer: "Check for metal objects or liquid containers near the reader or antenna, as these create interference and reflection that degrades performance. Verify the antenna connection is secure and the cable isn't damaged or kinked. Ensure tags are properly oriented—UHF RFID tags are polarization-sensitive, so misaligned tags read poorly. Check the power supply provides stable 5V; voltage drops reduce transmission power. If using passive tags, confirm they're rated for your reader's frequency (typically 860-960 MHz). Finally, verify the reader's power settings in firmware—some M5Stack models allow adjustable transmission power that may have been set too low."
    },
    {
      id: 2,
      question: "The MmWave sensor triggers constantly or doesn't detect people reliably. How do I fix this?",
      answer: "Access the sensor's configuration via UART and adjust the sensitivity and range settings. Constant triggering usually indicates the sensitivity is too high or the sensor is picking up environmental motion like HVAC airflow, machinery vibration, or even insects. Reduce the detection range or increase the trigger threshold. If the sensor isn't detecting people, increase sensitivity and verify the mounting position—the sensor should be aimed at the expected traffic path, typically 1.5-2 meters above ground for optimal human torso detection. Check for obstructions blocking the sensor's field of view, and ensure it's mounted on a stable surface without vibration."
    },
    {
      id: 3,
      question: "Assets are being logged to the wrong zone (IN instead of OUT or vice versa). What's the issue?",
      answer: "Verify the physical placement and labeling of your MmWave sensors—they may have been swapped during installation. Check your software configuration to ensure each sensor is correctly mapped to its corresponding zone in the code. The RFID reader's wide range may be picking up tags from both zones simultaneously; use directional antennas or RF shielding to create distinct read zones. Implement directional logic by analyzing the sequence of sensor triggers—if both sensors detect movement, the order of activation indicates direction. Add physical barriers or adjust antenna angles to prevent overlap between IN and OUT zones."
    },
    {
      id: 4,
      question: 'The system experiences frequent disconnections or fails to log data to the database. What should I check?',
      answer: "Test network connectivity by pinging your database server from the M5Stack's network. Check Wi-Fi signal strength—metal warehouse structures severely attenuate signals, so you may need additional access points or use Ethernet with an adapter. Verify the M5Stack isn't running out of memory, which can cause crashes during high-traffic periods; implement proper memory management and periodic resets if needed. Check if your database connection timeout settings are too aggressive. Implement local buffering to cache readings during network interruptions, then sync when connectivity returns. Review system logs for error patterns that indicate whether the issue is network-related, power-related, or software bugs."
    },
    {
      id: 5,
      question: 'Some tagged assets are never detected even when carried through monitored zones. Why is this happening?',
      answer: "Inspect the RFID tags on those specific assets—they may be damaged, improperly applied, or deactivated. Test tags individually with a handheld reader to verify functionality. Check if problematic assets contain metal or liquids that shield the tag from the reader; reposition tags to exterior surfaces or use specialized on-metal tags. Verify the tag frequency matches your reader (some regions use different UHF bands). Ensure tags aren't placed in orientations perpendicular to the antenna's polarization—try rotating tags 90 degrees. If assets are carried in metal carts or containers, the shielding effect may block reads entirely; consider mounting additional readers at different angles or using higher-power tags."
    }
  ];

  const issueTypes = [
    'Reader Setup',
    'RFID Detection',
    'Software Installation',
    'Network Connection',
    'Account Access',
    'Data Synchronization',
    'Hardware Malfunction',
    'Other'
  ];

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const toggleTroubleshooting = (id) => {
    setExpandedTroubleshooting(expandedTroubleshooting === id ? null : id);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Support form submitted:', formData);
    // Here you would typically send the data to your backend
    alert('Thank you for contacting support! We will get back to you within 24 hours.');
    setFormData({ name: '', issue: '', description: '' });
  };

  return (
    <div className="support">
      <div className="support-container">
        {/* Hero Section */}
        <div className="support-hero">
          <h1 className="support-title">Support</h1>
          <p className="support-subtitle">
            We are here to ensure your TagEase asset tracking solution is running smoothly!
          </p>
        </div>

        {/* Quick Help Section */}
        <div className="quick-help-section">
          <h2 className="section-label">Quick Help</h2>
          <div className="quick-help-grid">
            <div className="help-card">
              <h3 className="help-card-title">Setup Guide</h3>
              <p className="help-card-description">
                Setup Guide will help you get started with your TagEase hardware and software.
              </p>
              <button className="help-button">Download Setup Guide</button>
            </div>
            <div className="help-card">
              <h3 className="help-card-title">Frequently Asked Questions</h3>
              <p className="help-card-description">
                Find answers to the most commonly asked questions in our FAQ section
              </p>
              <button className="help-button">FAQ</button>
            </div>
            <div className="help-card">
              <h3 className="help-card-title">Troubleshooting</h3>
              <p className="help-card-description">
                Have a problem with your hardware/software? Our troubleshooting guide is here to help you.
              </p>
              <button className="help-button">Read Troubleshooting Guide</button>
            </div>
          </div>
        </div>

        {/* Need Help CTA */}
        <div className="need-help-banner">
          <span className="need-help-text">Still have an issue? Need help?</span><span className="need-help-arrow">→</span> 
          <button className="contact-support-button">Contact Support</button>
        </div>

        {/* FAQ Section */}
        <div className="faq-section">
          <h2 className="section-heading">Frequently Asked Questions</h2>
          <p className="section-description">
            Find answers to the most frequently asked questions our customers have.
          </p>
          <div className="accordion-list">
            {faqs.map((faq) => (
              <div key={faq.id} className="accordion-item">
                <button
                  className={`accordion-header ${expandedFaq === faq.id ? 'active' : ''}`}
                  onClick={() => toggleFaq(faq.id)}
                >
                  <span>{faq.question}</span>
                  <svg
                    className={`accordion-icon ${expandedFaq === faq.id ? 'rotate' : ''}`}
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5 7.5L10 12.5L15 7.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {expandedFaq === faq.id && (
                  <div className="accordion-content">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Troubleshooting Section */}
        <div className="troubleshooting-section">
          <h2 className="section-heading">Troubleshooting</h2>
          <p className="section-description">
            Solutions for the most common technical issues you may encounter.
          </p>
          <div className="accordion-list">
            {troubleshootingItems.map((item) => (
              <div key={item.id} className="accordion-item">
                <button
                  className={`accordion-header ${expandedTroubleshooting === item.id ? 'active' : ''}`}
                  onClick={() => toggleTroubleshooting(item.id)}
                >
                  <span>{item.question}</span>
                  <svg
                    className={`accordion-icon ${expandedTroubleshooting === item.id ? 'rotate' : ''}`}
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5 7.5L10 12.5L15 7.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {expandedTroubleshooting === item.id && (
                  <div className="accordion-content">
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Support Section */}
        <div className="contact-section">
          <div className="contact-content">
            <div className="contact-visual">
              <img 
                src="/src/assets/images/contact-support-icons-bg.png" 
                alt="Support icons background" 
                className="visual-icons-bg"
              />
              <div className="visual-text">
                <h3 className="visual-heading">
                  <span className="orange-text">Still need help?</span><br />
                  Get in touch<br />
                  with us <span className="arrow-icon">→</span>
                </h3>
              </div>
            </div>

            <div className="contact-form-wrapper">
              <h2 className="contact-heading">Contact Support</h2>
              <p className="contact-description">
                Please fill out the form below and we will get back to you within 24 hours.
              </p>
              <form onSubmit={handleSubmit} className="contact-form">
                <div className="form-group">
                  <label htmlFor="name" className="form-text-label">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Name"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="issue" className="form-text-label">What are you having an issue with?</label>
                  <select
                    id="issue"
                    name="issue"
                    value={formData.issue}
                    onChange={handleInputChange}
                    className="form-select"
                    required
                  >
                    <option value="">Choose one</option>
                    {issueTypes.map((type, index) => (
                      <option key={index} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="description" className="form-text-label">Please describe how we can help you</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Type your description here..."
                    className="form-textarea"
                    rows="5"
                    required
                  />
                </div>
                <button type="submit" className="submit-button">
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
