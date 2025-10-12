import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from '../NavBar/adminNav';
import Map from '../map/map';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import ContactList from '../Conatct/ContactList';
import ShelterManagement from '../Shelter/ShelterManagement';
import './SimpleDashboard.css';

const SimpleDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [contactCount, setContactCount] = useState(0);
  const [disasterCount, setDisasterCount] = useState(0);
  const [shelterCount, setShelterCount] = useState(0);
  const [disasters, setDisasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingDisaster, setEditingDisaster] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editFormData, setEditFormData] = useState({
    disaster: '',
    info: '',
    place: '',
    severity: ''
  });

  // Auto-refresh disasters when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchDisasters();
    }
  }, [refreshTrigger]);

  // Periodic refresh every 30 seconds to catch new disasters
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDisasters();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Fetch disasters from API
  const fetchDisasters = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/pins');
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data && Array.isArray(data.data)) {
          setDisasters(data.data);
          setDisasterCount(data.data.length);
        } else {
          setDisasters([]);
          setDisasterCount(0);
        }
      } else {
        setDisasters([]);
        setDisasterCount(0);
      }
    } catch (error) {
      console.error('Error fetching disasters:', error);
      setDisasters([]);
      setDisasterCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Handle edit disaster
  const handleEditDisaster = (disaster) => {
    console.log('Edit disaster:', disaster);
    setEditingDisaster(disaster);
    setEditFormData({
      disaster: disaster.disaster || '',
      info: disaster.info || '',
      place: disaster.place || '',
      severity: disaster.severity || ''
    });
  };

  // Handle form input changes
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingDisaster) return;

    try {
      const response = await fetch(`http://localhost:5000/pins/${editingDisaster._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });

      if (response.ok) {
        alert('Disaster updated successfully!');
        setEditingDisaster(null);
        await fetchDisasters(); // Refresh the list
      } else {
        alert('Failed to update disaster');
      }
    } catch (error) {
      console.error('Error updating disaster:', error);
      alert('Error updating disaster');
    }
  };

  // Close edit modal
  const handleCloseEdit = () => {
    setEditingDisaster(null);
    setEditFormData({
      disaster: '',
      info: '',
      place: '',
      severity: ''
    });
  };

  // Handle delete disaster
  const handleDeleteDisaster = async (disasterId) => {
    if (window.confirm('Are you sure you want to delete this disaster?')) {
      try {
        const response = await fetch(`http://localhost:5000/pins/${disasterId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          // Refresh disasters list
          await fetchDisasters();
          alert('Disaster deleted successfully!');
        } else {
          alert('Failed to delete disaster');
        }
      } catch (error) {
        console.error('Error deleting disaster:', error);
        alert('Error deleting disaster');
      }
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    // Refresh data when switching tabs
    if (tab === 'contacts') {
      const fetchContactCount = async () => {
        try {
          console.log('Refreshing contact count...');
          const response = await fetch('http://localhost:5000/api/contact');
          console.log('Contact refresh response status:', response.status);
          
          if (response.ok) {
            const contacts = await response.json();
            console.log('Contact refresh data:', contacts);
            setContactCount(contacts.data?.length || 0);
          } else {
            console.error('Failed to refresh contacts, status:', response.status);
          }
        } catch (error) {
          console.error('Error refreshing contact count:', error);
        }
      };
      fetchContactCount();
    } else if (tab === 'map') {
      const fetchDisasterCount = async () => {
        try {
          console.log('Refreshing disaster count...');
          const response = await fetch('http://localhost:5000/pins');
          console.log('Disaster refresh response status:', response.status);
          
          if (response.ok) {
            const disasters = await response.json();
            console.log('Disaster refresh data:', disasters);
            setDisasterCount(disasters.data?.length || 0);
          } else {
            console.error('Failed to refresh disasters, status:', response.status);
          }
        } catch (error) {
          console.error('Error refreshing disaster count:', error);
        }
      };
      fetchDisasterCount();
    } else if (tab === 'shelters') {
      const fetchShelterCount = async () => {
        try {
          console.log('Refreshing shelter count...');
          const response = await fetch('http://localhost:5000/api/shelters');
          console.log('Shelter refresh response status:', response.status);
          
          if (response.ok) {
            const shelters = await response.json();
            console.log('Shelter refresh data:', shelters);
            setShelterCount(shelters.data?.length || 0);
          } else {
            console.error('Failed to refresh shelters, status:', response.status);
          }
        } catch (error) {
          console.error('Error refreshing shelter count:', error);
        }
      };
      fetchShelterCount();
    } else if (tab === 'map') {
      fetchDisasters();
    }
  };

  // Fetch contact count and disaster count from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch disasters automatically
        await fetchDisasters();
        
        // Fetch contact count
        console.log('Fetching contact count...');
        const contactResponse = await fetch('http://localhost:5000/api/contact');
        console.log('Contact response status:', contactResponse.status);
        
        if (contactResponse.ok) {
          const contacts = await contactResponse.json();
          console.log('Contact response data:', contacts);
          setContactCount(contacts.data?.length || 0);
        } else {
          console.error('Failed to fetch contacts, status:', contactResponse.status);
          setContactCount(0);
        }

        // Fetch disaster count
        console.log('Fetching disaster count...');
        const disasterResponse = await fetch('http://localhost:5000/pins');
        console.log('Disaster response status:', disasterResponse.status);
        
        if (disasterResponse.ok) {
          const disasters = await disasterResponse.json();
          console.log('Disaster response data:', disasters);
          setDisasterCount(disasters.data?.length || 0);
        } else {
          console.error('Failed to fetch disasters, status:', disasterResponse.status);
          setDisasterCount(0);
        }

        // Fetch shelter count
        console.log('Fetching shelter count...');
        const shelterResponse = await fetch('http://localhost:5000/api/shelters');
        console.log('Shelter response status:', shelterResponse.status);
        
        if (shelterResponse.ok) {
          const shelters = await shelterResponse.json();
          console.log('Shelter response data:', shelters);
          setShelterCount(shelters.data?.length || 0);
        } else {
          console.error('Failed to fetch shelters, status:', shelterResponse.status);
          setShelterCount(0);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setContactCount(0);
        setDisasterCount(0);
        setShelterCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="dashboard-container">
      <Nav />
      
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Disaster Management Dashboard</h1>
          <p>Manage disasters, view reports, and monitor emergency responses</p>
          <button 
            onClick={() => {
              setLoading(true);
              const fetchData = async () => {
                try {
                  // Fetch contact count
                  const contactResponse = await fetch('http://localhost:5000/api/contact');
                  if (contactResponse.ok) {
                    const contacts = await contactResponse.json();
                    setContactCount(contacts.data?.length || 0);
                  }
                  
                  // Fetch disaster count
                  const disasterResponse = await fetch('http://localhost:5000/pins');
                  if (disasterResponse.ok) {
                    const disasters = await disasterResponse.json();
                    setDisasterCount(disasters.data?.length || 0);
                  }
                  
                  // Fetch shelter count
                  const shelterResponse = await fetch('http://localhost:5000/api/shelters');
                  if (shelterResponse.ok) {
                    const shelters = await shelterResponse.json();
                    setShelterCount(shelters.data?.length || 0);
                  }
                } catch (error) {
                  console.error('Error refreshing data:', error);
                } finally {
                  setLoading(false);
                }
              };
              fetchData();
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>

        <div className="dashboard-tabs">
          <button 
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleTabChange('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-button ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => handleTabChange('map')}
          >
            Disaster Map
          </button>
          <button 
            className={`tab-button ${activeTab === 'contacts' ? 'active' : ''}`}
            onClick={() => handleTabChange('contacts')}
          >
            Contact Reports
          </button>
          <button 
            className={`tab-button ${activeTab === 'shelters' ? 'active' : ''}`}
            onClick={() => handleTabChange('shelters')}
          >
            Shelter Management
          </button>
        </div>

        <div className="dashboard-body">
          {activeTab === 'overview' && (
            <div className="overview-section">
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Total Disasters</h3>
                  <div className="stat-number">
                    {loading ? '...' : disasterCount}
                  </div>
                  <p>Active incidents</p>
                </div>

                <div className="stat-card">
                  <h3>Emergency Shelters</h3>
                  <div className="stat-number">
                    {loading ? '...' : shelterCount}
                  </div>
                  <p>Available shelters</p>
                </div>

                <div className="stat-card">
                  <h3>Contact Reports</h3>
                  <div className="stat-number">
                    {loading ? '...' : contactCount}
                  </div>
                  <p>Total submissions</p>
                  
                </div>
                
                
                
              </div>

              
            </div>
          )}

          {activeTab === 'map' && (
            <div className="disaster-management">
              <div className="disaster-header">
                <h2>Disaster Management Map</h2>
                <p>Monitor and manage disaster incidents in real-time</p>
              </div>

              <div className="disaster-content">
                {/* Disaster List */}
                <div className="disaster-list">
                  <h3>All Disasters ({disasterCount})</h3>
                  {loading ? (
                    <div className="loading">Loading disasters...</div>
                  ) : disasters.length === 0 ? (
                    <div className="no-disasters">
                      <p>No disasters found</p>
                      <p style={{fontSize: '12px', color: '#666'}}>
                        Click "Refresh Disasters" button above to reload data
                      </p>
                    </div>
                  ) : (
                    <div className="disaster-cards">
                      {disasters.map((disaster) => (
                        <div key={disaster._id} className="disaster-card">
                          <div className="disaster-info">
                            <h4>{disaster.disaster || disaster.title || 'Unknown Disaster'}</h4>
                            <p>{disaster.info || disaster.description || disaster.details || 'No description available'}</p>
                            <div className="disaster-details">
                              <span>Type: {disaster.disaster || disaster.type || 'Unknown'}</span>
                              <span>Location: {disaster.latitude ? `${disaster.latitude.toFixed(4)}, ${disaster.longitude.toFixed(4)}` : 'Unknown'}</span>
                            </div>
                            <div className="disaster-details">
                              <span>Date: {disaster.createdAt ? new Date(disaster.createdAt).toLocaleDateString() : 'Unknown'}</span>
                              <span>Place: {disaster.place || 'Unknown'}</span>
                            </div>
                            <div className="disaster-details">
                              <span>Severity: {disaster.severity || 'Unknown'}</span>
                              <span>Created By: {disaster.createdBy || 'Unknown'}</span>
                            </div>
                            <div className="disaster-actions">
                              <button 
                                className="edit-btn"
                                onClick={() => handleEditDisaster(disaster)}
                                title="Edit Disaster"
                              >
                                <EditIcon />
                              </button>
                              <button 
                                className="delete-btn"
                                onClick={() => handleDeleteDisaster(disaster._id)}
                                title="Delete Disaster"
                              >
                                <DeleteIcon />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {disasters.length === 0 && (
                        <div className="no-disasters">
                          <p>No disasters found</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Map */}
                <div className="disaster-map">
                  <h3>Disaster Locations</h3>
                  <div className="map-container">
                    <Map key={`${disasterCount}-${refreshTrigger}`} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div style={{
              textAlign: 'center'
            }}>
              <h2 style={{
                fontSize: '2rem',
                color: '#333',
                marginBottom: '1rem',
                fontWeight: '700'
              }}>Contact Reports</h2>
              <p style={{
                color: '#666',
                marginBottom: '2rem',
                fontSize: '1.1rem'
              }}>View and manage all contact form submissions</p>
              <ContactList />
            </div>
          )}

          {activeTab === 'shelters' && (
            <div className="shelters-section">
              <ShelterManagement />
            </div>
          )}
        </div>
      </div>

      {/* Edit Disaster Modal */}
      {editingDisaster && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '500px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3>Edit Disaster</h3>
            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Disaster Type:</label>
                <input
                  type="text"
                  name="disaster"
                  value={editFormData.disaster}
                  onChange={handleEditFormChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                  required
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Info/Description:</label>
                <textarea
                  name="info"
                  value={editFormData.info}
                  onChange={handleEditFormChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    height: '80px'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Place:</label>
                <input
                  type="text"
                  name="place"
                  value={editFormData.place}
                  onChange={handleEditFormChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Severity:</label>
                <select
                  name="severity"
                  value={editFormData.severity}
                  onChange={handleEditFormChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="">Select Severity</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ddd',
                    background: 'white',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    background: '#007bff',
                    color: 'white',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Update Disaster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleDashboard;


