// frontend_inventory/pages/About/About.jsx
import React from 'react';
import { Package, Target, Users, Award } from 'lucide-react';
import './About.css';

const About = () => {
  const features = [
    {
      icon: <Package size={32} />,
      // title: 'Comprehensive Tracking',
      title: 'Placeholder Title 1',
      description: 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
      // description: 'Track all your assets in one centralized platform with real-time updates and notifications.'
    },
    {
      icon: <Target size={32} />,
      // title: 'Goal-Oriented',
      title: 'Placeholder Title 2',
      description: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.'
      // description: 'Set inventory goals and monitor progress with our intuitive dashboard and analytics.'
    },
    {
      icon: <Users size={32} />,
      // title: 'Team Collaboration',
      title: 'Placeholder Title 3',
      description: 'Excepteur sint occaecat cupidatat non proident, sunt in culpa.'
      // description: 'Work seamlessly with your team through role-based access and shared workspaces.'
    },
    {
      icon: <Award size={32} />,
      // title: 'Industry Leader',
      title: 'Placeholder Title 4',      
      description: 'Trusted by thousands of businesses worldwide for reliable inventory management.'
    }
  ];

  // const stats = [
  //   { value: '10,000+', label: 'Active Users' },
  //   { value: '500K+', label: 'Assets Tracked' },
  //   { value: '99.9%', label: 'Uptime' },
  //   { value: '24/7', label: 'Support' }
  // ];

  return (
    <div className="about">
      <div className="about-container">
        {/* Hero Section */}
        <div className="about-hero">
          {/* <h1 className="about-title">TagEase</h1> */}
          {/* <p className="about-lead"> */}
            {/* Lorem ipsum dolor sit amet, consectetur adipiscing elit. */}
            {/* Revolutionizing inventory management with intelligent tracking and seamless collaboration */}
          {/* </p> */}
          {/* Embedded RFID Door Setup Visualization */}
          <div className="about-hero-embed">
            <iframe
              src="/rfid-door-setup.html"
              title="RFID Door Setup Visualization"
              aria-label="RFID Door Setup Visualization"
              allowFullScreen
            ></iframe>
          </div>
        </div>

        {/* Mission Section */}
        <div className="mission-section">
          <div className="mission-content">
            <div className="mission-card">
              <h2 className="section-heading">Our Mission</h2>
              <p className="mission-text">
                At TagEase, our mission is to bring simplicity and clarity to inventory management.
                We help businesses stop wasting time searching for misplaced assets, tools, or
                equipment by providing an effortless RFID-based tracking system that does the hard work for them.
              </p>
            </div>
            <div className="vision-card">
              <h2 className="section-heading">Vision</h2>
              <p className="mission-text">We envision a world where every business; from schools to warehouses to offices, can manage their assets without confusion or guesswork.</p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        {/* <div className="stats-section">
          <div className="stats-grid-about">
            {stats.map((stat, index) => (
              <div key={index} className="stat-item">
                <div className="stat-value-about">{stat.value}</div>
                <div className="stat-label-about">{stat.label}</div>
              </div>
            ))}
          </div>
        </div> */}

        {/* Features Section */}
        {/* <div className="features-section">
          <h2 className="section-heading-center">Why Choose TagEase?</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card-about">
                <div className="feature-icon-about">{feature.icon}</div>
                <h3 className="feature-title-about">{feature.title}</h3>
                <p className="feature-description-about">{feature.description}</p>
              </div>
            ))}
          </div>
        </div> */}

        {/* Values Section */}
        <div className="values-section">
          <div className="values-section-card">
            <h2 className="section-heading-center">Our Values</h2>
            <div className="values-grid">
              <div className="value-card">
                <h3 className="value-title">Simplicity Over Complexity</h3>
                <p className="value-text">
                  We turn messy inventory systems into clear, effortless control.
                </p>
              </div>
              <div className="value-card">
                <h3 className="value-title">Trust Through Transparency</h3>
                <p className="value-text">
                  Real-time visibility that businesses can rely on, always.
                </p>
              </div>
              <div className="value-card">
                <h3 className="value-title">Impact That Saves Time</h3>
                <p className="value-text">
                  Every feature gives people hours back to focus on what matters.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        {/* <div className="cta-section">
          <h2 className="cta-heading">Ready to Get Started?</h2>
          <p className="cta-text">
            Join thousands of businesses already using TagEase to streamline their inventory management.
          </p>
          <button className="cta-button">Start Free Trial</button>
        </div> */}
      </div>
    </div>
  );
};

export default About;