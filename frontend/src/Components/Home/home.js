import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, Users, Home, BarChart3, MapPin, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import UserMap from '../map/UserMap';
import NearbyDisasters from '../map/NearbyDisasters';
import List from '../Conatct/ContactList';
import ContactForm from '../Conatct/ContactForm';
import DisasterSearch from '../search/DisasterSearch';
import WeatherWidget from './WeatherWidget';
import './SafeZoneHomePage.css';
import Map from '../map/map';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';


const SafeZoneHomePage = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const navigate = useNavigate();

  // Load Chatling.ai chatbot
  useEffect(() => {
    // Set chatbot configuration
    window.chtlConfig = { chatbotId: "8393842459" };
    
    // Check if script is already loaded
    if (!document.getElementById('chtl-script')) {
      // Create and add the script
      const script = document.createElement('script');
      script.id = 'chtl-script';
      script.type = 'text/javascript';
      script.src = 'https://chatling.ai/js/embed.js';
      script.async = true;
      script.setAttribute('data-id', '8393842459');
      document.head.appendChild(script);
    }

    // Cleanup function to remove script when component unmounts
    return () => {
      const existingScript = document.getElementById('chtl-script');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);


  const handleSearchResults = (results) => {
    setSearchResults(results);
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    // You can add additional logic here to update the map view
    console.log('Selected location:', location);
  };

  return (
    <div className="safezone-container">

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-left">
            <h1>Stay Safe, Stay Informed</h1>
            <p>Real-time disaster alerts, safety resources, and community support at your fingertips</p>

            {/* Integrated Disaster Search */}
            <DisasterSearch 
              onSearchResults={handleSearchResults}
              onLocationSelect={handleLocationSelect}
            />
          </div>
          <div className="hero-right">
            <WeatherWidget />
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="map-section">
        <h2>Live Disaster Map</h2>
        <p>Monitor active emergencies and alerts worldwide</p>
        <div className="map-box">
          <UserMap />
          <div className="map-tags">
            <div className="map-tag red">📍Near By Disasters</div>
            <div className="map-tag orange">⚠️ All Disasters</div>
            <div className="map-tag green"><HealthAndSafetyIcon style={{ color : 'blue' }} /> Near By Shelters</div>
          </div>
        </div>
      </section>

      {/* Search Results Section */}
      {searchResults.length > 0 && (
        <section className="search-results-section">
          <h2>Search Results</h2>
          <p>Found {searchResults.length} disaster(s) matching your search</p>
          <div className="search-results-grid">
            {searchResults.slice(0, 6).map((result) => (
              <div key={result._id} className="search-result-card" onClick={() => handleLocationSelect(result)}>
                <div className="result-icon">
                  {result.disaster === 'Flood' ? '🚣‍♀️' : 
                   result.disaster === 'Fire' ? '🔥' : 
                   result.disaster === 'tusunaimi' ? '🌊' : 
                   result.disaster === 'Earthquake' ? '🌍' : 
                   result.disaster === 'Landslides' ? '⛰️' : 
                   result.disaster === 'Hurricane' ? '🌀' : '⚠️'}
                </div>
                <div className="result-content">
                  <h3>{result.place}</h3>
                  <p className="disaster-type">{result.disaster}</p>
                  <p className="result-info">{result.info.substring(0, 100)}...</p>
                  <div className="result-meta">
                    <span>{new Date(result.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <NearbyDisasters />
      
      

      {/* Quick Actions Section */}
      <section className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-grid">
          <div className="action-card">
            <AlertTriangle size={48} style={{ color: '#e74c3c', marginBottom: '1rem' }} />
            <h3>Disaster Services Portal</h3>
            <p>Report incidents, request aid, and file damage claims quickly and easily.</p>
            <button 
              onClick={() => navigate('/victim/dashboard')}
              style={{ backgroundColor: '#e74c3c' }}
            >
              Report Now
            </button>
          </div>

          <div className="action-card">
            <Users size={48} style={{ color: '#9b59b6', marginBottom: '1rem' }} />
            <h3>Support Disaster</h3>
            <p>Join our community of support disaster and make a difference in disaster preparedness and response.</p>
            <button 
              onClick={() => navigate('/donation')}
              style={{ backgroundColor: '#9b59b6' }}
            >
              Get Involved
            </button>
          </div>


           {/* Add Alerts*/}
          <div className="action-card">
            <Users size={48} style={{ color: '#9b59b6', marginBottom: '1rem' }} />
            <h3>Support Disaster</h3>
            <p>Join our community of support disaster and make a difference in disaster preparedness and response.</p>
            <button 
              onClick={() => navigate('/donation')}
              style={{ backgroundColor: '#9b59b6' }}
            >
              Get Involved
            </button>
          </div>


          <div className="action-card">
            <Users size={48} style={{ color: '#9b59b6', marginBottom: '1rem' }} />
            <h3>Support Disaster</h3>
            <p>Join our community of support disaster and make a difference in disaster preparedness and response.</p>
            <button 
              onClick={() => navigate('/donation')}
              style={{ backgroundColor: '#9b59b6' }}
            >
              Get Involved
            </button>
          </div>

        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-container">
          <h2>Why Choose SafeZone?</h2>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <AlertTriangle size={40} color="white" />
              </div>
              <h3>Real-time Alerts</h3>
              <p>Get instant notifications about disasters and emergencies in your area</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <MapPin size={40} color="white" />
              </div>
              <h3>Location-based Services</h3>
              <p>Personalized safety information based on your current location</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Users size={40} color="white" />
              </div>
              <h3>Community Support</h3>
              <p>Connect with neighbors and local emergency services</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Shield size={40} color="white" />
              </div>
              <h3>Safety Resources</h3>
              <p>Access comprehensive emergency preparedness guides and tips</p>
            </div>
          </div>
        </div>
      </section>

      {/* Current Alerts Section */}
      <section className="alerts-section">
        <div className="alerts-container">
          <h2>Current Alerts</h2>
          
          <div className="alerts-grid">
            {/* Alert 1 */}
            <div className="alert-card emergency">
              <div className="alert-header">
                <AlertTriangle size={20} />
                <span>ACTIVE EMERGENCY</span>
              </div>
              <h4>Wildfire - California</h4>
              <p>Large wildfire affecting Northern California. Evacuation orders in effect for multiple counties.</p>
            </div>

            {/* Alert 2 */}
            <div className="alert-card warning">
              <div className="alert-header">
                <AlertTriangle size={20} />
                <span>HURRICANE WATCH</span>
              </div>
              <h4>Hurricane Milton - Atlantic</h4>
              <p>Category 2 hurricane approaching the Eastern seaboard. Residents advised to prepare.</p>
            </div>

            {/* Alert 3 */}
            <div className="alert-card safe">
              <div className="alert-header">
                <Shield size={20} />
                <span>ALL CLEAR</span>
              </div>
              <h4>Earthquake Advisory Lifted</h4>
              <p>Recent seismic activity has decreased. Normal conditions restored in affected areas.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="cta-section">
        <div className="cta-container">
          <h2>Stay Prepared, Stay Safe</h2>
          <p>Join thousands of users who trust SafeZone for emergency preparedness and real-time disaster information.</p>
          <div className="cta-buttons">
            <button className="cta-btn primary">Create Account</button>
            <button className="cta-btn secondary">Learn More</button>
          </div>
        </div>
      </section>

    </div>
  );
};

export default SafeZoneHomePage;
