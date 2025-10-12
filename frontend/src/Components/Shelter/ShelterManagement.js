import React, { useState, useEffect } from 'react';
import { Map as MapboxMap, Marker, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import axios from 'axios';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import './ShelterManagement.css';

const ShelterManagement = () => {
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingShelter, setEditingShelter] = useState(null);
  const [newShelterLocation, setNewShelterLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    latitude: '',
    longitude: '',
    capacity: '',
    facilities: '',
    contact: {
      phone: '',
      email: ''
    }
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Google Maps URL input state
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  // DMS Coordinate input state
  const [showDMSInput, setShowDMSInput] = useState(false);
  const [dmsCoordinates, setDMSCoordinates] = useState("");
  const [dmsError, setDMSError] = useState("");

  // Fetch shelters from API
  useEffect(() => {
    fetchShelters();
  }, []);

  const fetchShelters = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/shelters');
      setShelters(response.data.data || []);
    } catch (error) {
      console.error('Error fetching shelters:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('contact.')) {
      const contactField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        contact: {
          ...prev.contact,
          [contactField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate form data
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Shelter name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.latitude || isNaN(parseFloat(formData.latitude))) {
      newErrors.latitude = 'Valid latitude is required';
    } else {
      const lat = parseFloat(formData.latitude);
      if (lat < -90 || lat > 90) {
        newErrors.latitude = 'Latitude must be between -90 and 90';
      }
    }

    if (!formData.longitude || isNaN(parseFloat(formData.longitude))) {
      newErrors.longitude = 'Valid longitude is required';
    } else {
      const lng = parseFloat(formData.longitude);
      if (lng < -180 || lng > 180) {
        newErrors.longitude = 'Longitude must be between -180 and 180';
      }
    }

    if (formData.capacity && (isNaN(parseInt(formData.capacity)) || parseInt(formData.capacity) < 0)) {
      newErrors.capacity = 'Capacity must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const shelterData = {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        capacity: parseInt(formData.capacity) || 0,
        facilities: formData.facilities ? formData.facilities.split(',').map(f => f.trim()) : []
      };

      if (editingShelter) {
        // Update existing shelter
        await axios.put(`http://localhost:5000/api/shelters/${editingShelter._id}`, shelterData);
      } else {
        // Create new shelter
        await axios.post('http://localhost:5000/api/shelters', shelterData);
      }

      // Reset form and refresh data
      setFormData({
        name: '',
        description: '',
        latitude: '',
        longitude: '',
        capacity: '',
        facilities: '',
        contact: {
          phone: '',
          email: ''
        }
      });
      setEditingShelter(null);
      setShowForm(false);
      setNewShelterLocation(null);
      await fetchShelters();
      
    } catch (error) {
      console.error('Error saving shelter:', error);
      alert('Error saving shelter. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit shelter
  const handleEdit = (shelter) => {
    setEditingShelter(shelter);
    setFormData({
      name: shelter.name,
      description: shelter.description,
      latitude: shelter.latitude.toString(),
      longitude: shelter.longitude.toString(),
      capacity: shelter.capacity.toString(),
      facilities: shelter.facilities ? shelter.facilities.join(', ') : '',
      contact: {
        phone: shelter.contact?.phone || '',
        email: shelter.contact?.email || ''
      }
    });
    setShowForm(true);
  };

  // Handle delete shelter
  const handleDelete = async (shelterId) => {
    if (!window.confirm('Are you sure you want to delete this shelter?')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:5000/api/shelters/${shelterId}`);
      await fetchShelters();
    } catch (error) {
      console.error('Error deleting shelter:', error);
      alert('Error deleting shelter. Please try again.');
    }
  };

  // Handle map click to get coordinates
  const handleMapClick = (e) => {
    const { lng, lat } = e.lngLat;
    setNewShelterLocation({
      longitude: lng,
      latitude: lat
    });
    setFormData(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6)
    }));
  };

  // Parse Google Maps URL to extract coordinates
  const parseGoogleMapsUrl = async (url) => {
    try {
      // Remove any whitespace
      url = url.trim();
      
      // Handle different Google Maps URL formats
      let lat, lng;
      
      // Format 1: https://www.google.com/maps/@lat,lng,zoom
      const coordMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (coordMatch) {
        lat = parseFloat(coordMatch[1]);
        lng = parseFloat(coordMatch[2]);
      }
      
      // Format 2: https://www.google.com/maps/place/name/@lat,lng,zoom
      if (!lat || !lng) {
        const placeMatch = url.match(/place\/[^/]*\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (placeMatch) {
          lat = parseFloat(placeMatch[1]);
          lng = parseFloat(placeMatch[2]);
        }
      }
      
      // Format 3: https://maps.google.com/maps?q=lat,lng
      if (!lat || !lng) {
        const queryMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (queryMatch) {
          lat = parseFloat(queryMatch[1]);
          lng = parseFloat(queryMatch[2]);
        }
      }
      
      // Format 4: https://www.google.com/maps/search/query/@lat,lng,zoom
      if (!lat || !lng) {
        const searchMatch = url.match(/search\/[^/]*\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (searchMatch) {
          lat = parseFloat(searchMatch[1]);
          lng = parseFloat(searchMatch[2]);
        }
      }
      
      // Format 5: Google Maps short links (maps.app.goo.gl, goo.gl/maps, etc.)
      if (!lat || !lng) {
        const shortLinkPatterns = [
          /maps\.app\.goo\.gl\//,
          /goo\.gl\/maps\//,
          /maps\.google\.com\/maps\/d\/\w+/
        ];
        
        const isShortLink = shortLinkPatterns.some(pattern => pattern.test(url));
        
        if (isShortLink) {
          // Resolve short link using backend service
          try {
            const response = await axios.post('http://localhost:5000/api/resolve-url', {
              url: url
            });
            
            if (response.data.success && response.data.data.coordinates) {
              return response.data.data.coordinates;
            } else {
              throw new Error('Failed to resolve short link');
            }
          } catch (error) {
            console.error('Error resolving short link:', error);
            throw new Error(`Failed to resolve short link: ${error.response?.data?.message || error.message}`);
          }
        }
      }
      
      // Validate coordinates
      if (lat && lng && 
          lat >= -90 && lat <= 90 && 
          lng >= -180 && lng <= 180 &&
          !isNaN(lat) && !isNaN(lng)) {
        return { latitude: lat, longitude: lng };
      }
      
      return null;
    } catch (error) {
      console.error("Error parsing Google Maps URL:", error);
      return null;
    }
  };

  // Handle Google Maps URL input
  const handleUrlInput = async () => {
    if (!googleMapsUrl.trim()) {
      setUrlError("Please enter a Google Maps URL");
      return;
    }
    
    try {
      const coords = await parseGoogleMapsUrl(googleMapsUrl);
      if (coords) {
        // Set the coordinates in the form
        setFormData(prev => ({
          ...prev,
          latitude: coords.latitude.toString(),
          longitude: coords.longitude.toString()
        }));
        
        // Set the location for the map marker
        setNewShelterLocation({
          latitude: coords.latitude,
          longitude: coords.longitude
        });
        
        setShowUrlInput(false);
        setGoogleMapsUrl("");
        setUrlError("");
      } else {
        setUrlError("Invalid Google Maps URL format. Please check the URL and try again.");
      }
    } catch (error) {
      setUrlError(error.message || "Error processing the URL. Please try again.");
    }
  };

  // Parse DMS (Degrees, Minutes, Seconds) coordinates
  const parseDMSCoordinates = (dmsString) => {
    try {
      // Clean the input string
      const cleanInput = dmsString.trim().toUpperCase();
      
      // Pattern to match DMS format: 7°11'52.2"N 81°50'50.8"E
      const dmsPattern = /(\d+)°(\d+)'([\d.]+)"([NS])\s+(\d+)°(\d+)'([\d.]+)"([EW])/;
      
      const match = cleanInput.match(dmsPattern);
      if (!match) {
        throw new Error("Invalid DMS format. Please use format like: 7°11'52.2\"N 81°50'50.8\"E");
      }
      
      const [, latDeg, latMin, latSec, latDir, lngDeg, lngMin, lngSec, lngDir] = match;
      
      // Convert DMS to decimal degrees
      const convertDMSToDecimal = (degrees, minutes, seconds, direction) => {
        let decimal = parseInt(degrees) + parseInt(minutes)/60 + parseFloat(seconds)/3600;
        if (direction === 'S' || direction === 'W') {
          decimal = -decimal;
        }
        return decimal;
      };
      
      const latitude = convertDMSToDecimal(latDeg, latMin, latSec, latDir);
      const longitude = convertDMSToDecimal(lngDeg, lngMin, lngSec, lngDir);
      
      // Validate coordinates
      if (latitude < -90 || latitude > 90) {
        throw new Error("Latitude must be between -90 and 90 degrees");
      }
      if (longitude < -180 || longitude > 180) {
        throw new Error("Longitude must be between -180 and 180 degrees");
      }
      
      return { latitude, longitude };
    } catch (error) {
      throw error;
    }
  };

  // Handle DMS coordinate input
  const handleDMSInput = () => {
    if (!dmsCoordinates.trim()) {
      setDMSError("Please enter DMS coordinates");
      return;
    }
    
    try {
      const coords = parseDMSCoordinates(dmsCoordinates);
      
      // Set the coordinates in the form
      setFormData(prev => ({
        ...prev,
        latitude: coords.latitude.toString(),
        longitude: coords.longitude.toString()
      }));
      
      // Set the location for the map marker
      setNewShelterLocation({
        latitude: coords.latitude,
        longitude: coords.longitude
      });
      
      setShowDMSInput(false);
      setDMSCoordinates("");
      setDMSError("");
    } catch (error) {
      setDMSError(error.message);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      latitude: '',
      longitude: '',
      capacity: '',
      facilities: '',
      contact: {
        phone: '',
        email: ''
      }
    });
    setEditingShelter(null);
    setShowForm(false);
    setNewShelterLocation(null);
    setErrors({});
  };

  return (
    <div className="shelter-management">
      <div className="shelter-header">
        <h2>Emergency Shelter Management</h2>
        <p>Double-click anywhere on the map to add a new shelter, or manage existing shelters below</p>
      </div>

      <div className="shelter-content">
        {/* Shelter List */}
        <div className="shelter-list">
          <h3>All Shelters ({shelters.length})</h3>
          {loading ? (
            <div className="loading">Loading shelters...</div>
          ) : (
            <div className="shelter-cards">
              {shelters.map(shelter => (
                <div key={shelter._id} className="shelter-card">
                  <div className="shelter-info">
                    <h4>{shelter.name}</h4>
                    <p>{shelter.description}</p>
                    <div className="shelter-details">
                      <span>Capacity: {shelter.capacity}</span>
                      <span>Lat: {shelter.latitude.toFixed(4)}</span>
                      <span>Lng: {shelter.longitude.toFixed(4)}</span>
                    </div>
                    {shelter.facilities && shelter.facilities.length > 0 && (
                      <div className="facilities">
                        <strong>Facilities:</strong> {shelter.facilities.join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="shelter-actions">
                    <button 
                      className="edit-btn"
                      onClick={() => handleEdit(shelter)}
                    >
                      <EditIcon />
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDelete(shelter._id)}
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="shelter-map">
          <h3>Shelter Locations</h3>
          <div className="map-container" style={{ position: "relative" }}>
            {/* Google Maps URL Input Controls */}
            <div style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}>
              {/* Check Location from URL Button */}
              <button
                onClick={() => setShowUrlInput(!showUrlInput)}
                style={{
                  background: "#4285f4",
                  color: "white",
                  border: "none",
                  padding: "10px 15px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  transition: "all 0.3s ease"
                }}
                onMouseOver={(e) => {
                  e.target.style.background = "#3367d6";
                  e.target.style.transform = "translateY(-1px)";
                }}
                onMouseOut={(e) => {
                  e.target.style.background = "#4285f4";
                  e.target.style.transform = "translateY(0)";
                }}
              >
                🔍 Add Shelter from Google Maps
              </button>

              {/* Add Shelter from DMS Coordinates Button */}
              <button
                onClick={() => setShowDMSInput(!showDMSInput)}
                style={{
                  background: "#ff6b35",
                  color: "white",
                  border: "none",
                  padding: "10px 15px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "14px",
                  fontWeight: "500",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  transition: "all 0.3s ease"
                }}
                onMouseOver={(e) => {
                  e.target.style.background = "#e55a2b";
                  e.target.style.transform = "translateY(-1px)";
                }}
                onMouseOut={(e) => {
                  e.target.style.background = "#ff6b35";
                  e.target.style.transform = "translateY(0)";
                }}
              >
                🧭 Add Shelter from DMS Coordinates
              </button>

              {/* URL Input Form */}
              {showUrlInput && (
                <div style={{
                  background: "white",
                  padding: "15px",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  minWidth: "300px"
                }}>
                  <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>Paste Google Maps URL</h4>
                  <input
                    type="text"
                    placeholder="https://www.google.com/maps/@lat,lng,zoom or https://maps.app.goo.gl/..."
                    value={googleMapsUrl}
                    onChange={(e) => {
                      setGoogleMapsUrl(e.target.value);
                      setUrlError("");
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      fontSize: "14px",
                      marginBottom: "8px"
                    }}
                  />
                  {urlError && (
                    <div style={{
                      color: "#f44336",
                      fontSize: "12px",
                      marginBottom: "8px",
                      whiteSpace: "pre-line"
                    }}>
                      {urlError}
                    </div>
                  )}
                  <div style={{
                    display: "flex",
                    gap: "8px",
                    justifyContent: "flex-end"
                  }}>
                    <button
                      onClick={() => {
                        setShowUrlInput(false);
                        setGoogleMapsUrl("");
                        setUrlError("");
                      }}
                      style={{
                        background: "#f44336",
                        color: "white",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUrlInput}
                      style={{
                        background: "#4caf50",
                        color: "white",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                    >
                      Add Shelter
                    </button>
                  </div>
                </div>
              )}

              {/* DMS Coordinate Input Form */}
              {showDMSInput && (
                <div style={{
                  background: "white",
                  padding: "20px",
                  borderRadius: "12px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  minWidth: "350px",
                  maxWidth: "400px"
                }}>
                  <h4 style={{ 
                    margin: "0 0 15px 0", 
                    color: "#333",
                    fontSize: "16px",
                    fontWeight: "600"
                  }}>
                    🧭 Add Shelter from DMS Coordinates
                  </h4>
                  
                  <input
                    type="text"
                    placeholder="7°11'52.2&quot;N 81°50'50.8&quot;E"
                    value={dmsCoordinates}
                    onChange={(e) => {
                      setDMSCoordinates(e.target.value);
                      setDMSError("");
                    }}
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "2px solid #e0e0e0",
                      borderRadius: "8px",
                      fontSize: "14px",
                      marginBottom: "12px",
                      fontFamily: "monospace",
                      boxSizing: "border-box"
                    }}
                  />
                  
                  {dmsError && (
                    <div style={{
                      color: "#f44336",
                      fontSize: "13px",
                      marginBottom: "12px",
                      padding: "8px",
                      background: "#ffebee",
                      borderRadius: "4px",
                      border: "1px solid #ffcdd2"
                    }}>
                      ⚠️ {dmsError}
                    </div>
                  )}
                  
                  <div style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "space-between",
                    marginBottom: "12px"
                  }}>
                    <button
                      onClick={() => {
                        setShowDMSInput(false);
                        setDMSCoordinates("");
                        setDMSError("");
                      }}
                      style={{
                        background: "#f44336",
                        color: "white",
                        border: "none",
                        padding: "10px 16px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "14px",
                        flex: "1"
                      }}
                    >
                      Cancel
                    </button>
                    
                    <button
                      onClick={handleDMSInput}
                      disabled={!dmsCoordinates.trim()}
                      style={{
                        background: dmsCoordinates.trim() ? "#ff6b35" : "#ccc",
                        color: "white",
                        border: "none",
                        padding: "10px 16px",
                        borderRadius: "6px",
                        cursor: dmsCoordinates.trim() ? "pointer" : "not-allowed",
                        fontSize: "14px",
                        flex: "1"
                      }}
                    >
                      🧭 Add Shelter
                    </button>
                  </div>
                  
                  <div style={{
                    fontSize: "11px",
                    color: "#666",
                    lineHeight: "1.4",
                    background: "#f8f9fa",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #e9ecef"
                  }}>
                    <strong>💡 Format Examples:</strong><br />
                    • 7°11'52.2"N 81°50'50.8"E<br />
                    • 6°55'30.0"N 79°52'12.0"E<br />
                    • 8°20'15.5"N 80°35'45.2"E<br />
                    <br />
                    <strong>Note:</strong> Use spaces between latitude and longitude coordinates.
                  </div>
                </div>
              )}
            </div>

            <MapboxMap
              mapboxAccessToken="pk.eyJ1IjoibmF2b2RhMTIzIiwiYSI6ImNtZTdhMDdsaTAyY3QycXBtNWQwdHpxc2IifQ.jNfJr5DmTfwet02F2tQC1w"
              initialViewState={{
                longitude: 80.8156111,
                latitude: 7.60552778,
                zoom: 7,
              }}
              style={{ width: '100%', height: '800px' }}
              mapStyle="mapbox://styles/navoda123/cmf0ny1k100cd01sb5fu2g8zd"
              onDblClick={handleMapClick}
            >
              {/* Shelter Markers */}
              {shelters.map(shelter => (
                <Marker
                  key={shelter._id}
                  longitude={shelter.longitude}
                  latitude={shelter.latitude}
                  anchor="bottom"
                >
                  <HealthAndSafetyIcon
                    style={{ 
                      color: 'blue', 
                      fontSize: 32,
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedShelter(shelter)}
                  />
                </Marker>
              ))}

              {/* Shelter Popup */}
              {selectedShelter && (
                <Popup
                  longitude={selectedShelter.longitude}
                  latitude={selectedShelter.latitude}
                  anchor="left"
                  closeOnClick={false}
                  onClose={() => setSelectedShelter(null)}
                >
                  <div className="shelter-popup">
                    <h4>{selectedShelter.name}</h4>
                    <p>{selectedShelter.description}</p>
                    <p><strong>Capacity:</strong> {selectedShelter.capacity}</p>
                    {selectedShelter.facilities && selectedShelter.facilities.length > 0 && (
                      <p><strong>Facilities:</strong> {selectedShelter.facilities.join(', ')}</p>
                    )}
                    <div className="popup-actions">
                      <button onClick={() => handleEdit(selectedShelter)}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(selectedShelter._id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </Popup>
              )}

              {/* New Shelter Form Popup */}
              {newShelterLocation && (
                <Popup
                  longitude={newShelterLocation.longitude}
                  latitude={newShelterLocation.latitude}
                  anchor="left"
                  closeOnClick={false}
                  onClose={() => {
                    setNewShelterLocation(null);
                    setFormData({
                      name: '',
                      description: '',
                      latitude: '',
                      longitude: '',
                      capacity: '',
                      facilities: '',
                      contact: {
                        phone: '',
                        email: ''
                      }
                    });
                    setErrors({});
                  }}
                >
                  <form onSubmit={handleSubmit} className="popup-form">
                    <div className="form-group">
                      <input
                        type="text"
                        name="name"
                        placeholder="Shelter Name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={errors.name ? 'error' : ''}
                        required
                      />
                      {errors.name && <span className="error-message">{errors.name}</span>}
                    </div>

                    <div className="form-group">
                      <textarea
                        name="description"
                        placeholder="Shelter Description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className={errors.description ? 'error' : ''}
                        rows="2"
                        required
                      />
                      {errors.description && <span className="error-message">{errors.description}</span>}
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <input
                          type="number"
                          name="latitude"
                          placeholder="Latitude"
                          value={formData.latitude}
                          onChange={handleInputChange}
                          className={errors.latitude ? 'error' : ''}
                          step="any"
                          required
                        />
                        {errors.latitude && <span className="error-message">{errors.latitude}</span>}
                      </div>

                      <div className="form-group">
                        <input
                          type="number"
                          name="longitude"
                          placeholder="Longitude"
                          value={formData.longitude}
                          onChange={handleInputChange}
                          className={errors.longitude ? 'error' : ''}
                          step="any"
                          required
                        />
                        {errors.longitude && <span className="error-message">{errors.longitude}</span>}
                      </div>
                    </div>

                    <div className="form-group">
                      <input
                        type="number"
                        name="capacity"
                        placeholder="Capacity (optional)"
                        value={formData.capacity}
                        onChange={handleInputChange}
                        className={errors.capacity ? 'error' : ''}
                        min="0"
                      />
                      {errors.capacity && <span className="error-message">{errors.capacity}</span>}
                    </div>

                    <div className="form-group">
                      <input
                        type="text"
                        name="facilities"
                        placeholder="Facilities (comma-separated)"
                        value={formData.facilities}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <input
                          type="tel"
                          name="contact.phone"
                          placeholder="Phone (optional)"
                          value={formData.contact.phone}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div className="form-group">
                        <input
                          type="email"
                          name="contact.email"
                          placeholder="Email (optional)"
                          value={formData.contact.email}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div className="form-actions">
                      <button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Adding...' : 'Add Shelter'}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => {
                          setNewShelterLocation(null);
                          setFormData({
                            name: '',
                            description: '',
                            latitude: '',
                            longitude: '',
                            capacity: '',
                            facilities: '',
                            contact: {
                              phone: '',
                              email: ''
                            }
                          });
                          setErrors({});
                        }}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </Popup>
              )}
            </MapboxMap>
          </div>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="form-modal">
          <div className="form-modal-content">
            <div className="form-header">
              <h3>{editingShelter ? 'Edit Shelter' : 'Add New Shelter'}</h3>
              <button className="close-btn" onClick={resetForm}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="shelter-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Shelter Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={errors.name ? 'error' : ''}
                    placeholder="Enter shelter name"
                  />
                  {errors.name && <span className="error-message">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label>Capacity</label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    className={errors.capacity ? 'error' : ''}
                    placeholder="Enter capacity"
                    min="0"
                  />
                  {errors.capacity && <span className="error-message">{errors.capacity}</span>}
                </div>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className={errors.description ? 'error' : ''}
                  placeholder="Enter shelter description"
                  rows="3"
                />
                {errors.description && <span className="error-message">{errors.description}</span>}
              </div>

              {/* Google Maps URL Input */}
              <div className="form-row">
                <div className="form-group">
                  <label>Location from Google Maps</label>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    style={{
                      background: "#4285f4",
                      color: "white",
                      border: "none",
                      padding: "10px 15px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      transition: "all 0.3s ease",
                      marginBottom: "10px"
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = "#3367d6";
                      e.target.style.transform = "translateY(-1px)";
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = "#4285f4";
                      e.target.style.transform = "translateY(0)";
                    }}
                  >
                    🔍 Get Location from Google Maps
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDMSInput(!showDMSInput)}
                    style={{
                      background: "#ff6b35",
                      color: "white",
                      border: "none",
                      padding: "10px 15px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "14px",
                      fontWeight: "500",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      transition: "all 0.3s ease",
                      marginBottom: "10px"
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = "#e55a2b";
                      e.target.style.transform = "translateY(-1px)";
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = "#ff6b35";
                      e.target.style.transform = "translateY(0)";
                    }}
                  >
                    🧭 Get Location from DMS Coordinates
                  </button>

                  {/* URL Input Form */}
                  {showUrlInput && (
                    <div style={{
                      background: "white",
                      padding: "15px",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      marginTop: "10px",
                      border: "1px solid #ddd"
                    }}>
                      <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>Paste Google Maps URL</h4>
                      <input
                        type="text"
                        placeholder="https://www.google.com/maps/@lat,lng,zoom or https://maps.app.goo.gl/..."
                        value={googleMapsUrl}
                        onChange={(e) => {
                          setGoogleMapsUrl(e.target.value);
                          setUrlError("");
                        }}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "14px",
                          marginBottom: "8px"
                        }}
                      />
                      {urlError && (
                        <div style={{
                          color: "#f44336",
                          fontSize: "12px",
                          marginBottom: "8px",
                          whiteSpace: "pre-line"
                        }}>
                          {urlError}
                        </div>
                      )}
                      <div style={{
                        display: "flex",
                        gap: "8px",
                        justifyContent: "flex-end"
                      }}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowUrlInput(false);
                            setGoogleMapsUrl("");
                            setUrlError("");
                          }}
                          style={{
                            background: "#f44336",
                            color: "white",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px"
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleUrlInput}
                          style={{
                            background: "#4caf50",
                            color: "white",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px"
                          }}
                        >
                          Get Location
                        </button>
                      </div>
                    </div>
                  )}

                  {/* DMS Coordinate Input Form */}
                  {showDMSInput && (
                    <div style={{
                      background: "white",
                      padding: "15px",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      marginTop: "10px",
                      border: "1px solid #ddd"
                    }}>
                      <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>DMS Coordinates</h4>
                      <input
                        type="text"
                        placeholder="7°11'52.2&quot;N 81°50'50.8&quot;E"
                        value={dmsCoordinates}
                        onChange={(e) => {
                          setDMSCoordinates(e.target.value);
                          setDMSError("");
                        }}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "14px",
                          marginBottom: "8px",
                          fontFamily: "monospace"
                        }}
                      />
                      {dmsError && (
                        <div style={{
                          color: "#f44336",
                          fontSize: "12px",
                          marginBottom: "8px",
                          whiteSpace: "pre-line"
                        }}>
                          {dmsError}
                        </div>
                      )}
                      <div style={{
                        display: "flex",
                        gap: "8px",
                        justifyContent: "flex-end"
                      }}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDMSInput(false);
                            setDMSCoordinates("");
                            setDMSError("");
                          }}
                          style={{
                            background: "#f44336",
                            color: "white",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px"
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleDMSInput}
                          style={{
                            background: "#ff6b35",
                            color: "white",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px"
                          }}
                        >
                          Get Location
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Latitude *</label>
                  <input
                    type="number"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    className={errors.latitude ? 'error' : ''}
                    placeholder="Enter latitude"
                    step="any"
                  />
                  {errors.latitude && <span className="error-message">{errors.latitude}</span>}
                </div>

                <div className="form-group">
                  <label>Longitude *</label>
                  <input
                    type="number"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    className={errors.longitude ? 'error' : ''}
                    placeholder="Enter longitude"
                    step="any"
                  />
                  {errors.longitude && <span className="error-message">{errors.longitude}</span>}
                </div>
              </div>

              <div className="form-group">
                <label>Facilities (comma-separated)</label>
                <input
                  type="text"
                  name="facilities"
                  value={formData.facilities}
                  onChange={handleInputChange}
                  placeholder="e.g., Medical, Food, Water, Communication"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Contact Phone</label>
                  <input
                    type="tel"
                    name="contact.phone"
                    value={formData.contact.phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="form-group">
                  <label>Contact Email</label>
                  <input
                    type="email"
                    name="contact.email"
                    value={formData.contact.email}
                    onChange={handleInputChange}
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (editingShelter ? 'Update Shelter' : 'Add Shelter')}
                </button>
                <button type="button" onClick={resetForm} disabled={isSubmitting}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShelterManagement;
