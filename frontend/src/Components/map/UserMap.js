import * as React from "react";
import { useState, useEffect } from "react";
import { Map as MapboxMap, Marker, Popup, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import axios from "axios";
import LocationPinIcon from "@mui/icons-material/LocationOn";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import DirectionsIcon from "@mui/icons-material/Directions";
import { useNavigate } from "react-router-dom"; 


function UserMap() {
  const [userLocation, setUserLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [pins, setPins] = useState([]); // nearby pins
  const [allPins, setAllPins] = useState([]); // all pins
  const [selectedPin, setSelectedPin] = useState(null);
  
  // Shelter-related state
  const [shelters, setShelters] = useState([]);
  const [nearestShelter, setNearestShelter] = useState(null);
  const [showDirections, setShowDirections] = useState(false);
  const [directions, setDirections] = useState(null);
  const [selectedShelterId, setSelectedShelterId] = useState(null);
  const [nearbySheltersWithDistance, setNearbySheltersWithDistance] = useState([]);
  const [loadingDistances, setLoadingDistances] = useState(false);


  const navigate = useNavigate(); 

  // Fetch location + pins
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc = {
            longitude: position.coords.longitude,
            latitude: position.coords.latitude,
          };
          setUserLocation(loc);
          setAccuracy(position.coords.accuracy);

          try {
            const allRes = await axios.get("http://localhost:5000/pins");
            const allPinsData = allRes.data.data || [];
            
            // Filter valid pins
            const validAllPins = allPinsData.filter((pin) => {
              if (!pin || !pin._id) return false;
              
              // Check if pin has all required properties
              if (!pin.place || !pin.disaster || !pin.info || !pin.createdBy) {
                console.warn("Pin missing required properties:", pin);
                return false;
              }
              
              const hasValidCoords = 
                typeof pin.longitude === 'number' && 
                typeof pin.latitude === 'number' && 
                !isNaN(pin.longitude) && 
                !isNaN(pin.latitude) &&
                pin.longitude >= -180 && 
                pin.longitude <= 180 &&
                pin.latitude >= -90 && 
                pin.latitude <= 90;
                
              if (!hasValidCoords) {
                console.warn("Invalid pin coordinates:", pin);
                return false;
              }
              
              return true;
            });
            setAllPins(validAllPins);

            const nearbyRes = await axios.get(
              "http://localhost:5000/pins/nearby",
              {
                params: {
                  longitude: loc.longitude,
                  latitude: loc.latitude,
                  distance: 10000,
                },
              }
            );
            const nearbyPinsData = nearbyRes.data.data || [];
            
            // Filter valid nearby pins
            const validNearbyPins = nearbyPinsData.filter((pin) => {
              if (!pin || !pin._id) return false;
              
              // Check if pin has all required properties
              if (!pin.place || !pin.disaster || !pin.info || !pin.createdBy) {
                console.warn("Pin missing required properties:", pin);
                return false;
              }
              
              const hasValidCoords = 
                typeof pin.longitude === 'number' && 
                typeof pin.latitude === 'number' && 
                !isNaN(pin.longitude) && 
                !isNaN(pin.latitude) &&
                pin.longitude >= -180 && 
                pin.longitude <= 180 &&
                pin.latitude >= -90 && 
                pin.latitude <= 90;
                
              if (!hasValidCoords) {
                console.warn("Invalid pin coordinates:", pin);
                return false;
              }
              
              return true;
            });
            setPins(validNearbyPins);
          } catch (err) {
            console.error("Error fetching pins:", err);
            setAllPins([]);
            setPins([]);
          }
        },
        (error) => console.error("Error getting location:", error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  // Fetch shelters from backend
  useEffect(() => {
    const getShelters = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/shelters");
        const sheltersData = res.data.data || [];
        
        console.log("Fetched shelters:", sheltersData);
        
        // Filter out invalid shelters
        const validShelters = sheltersData.filter((shelter) => {
          if (!shelter || !shelter._id) return false;
          
          const hasValidCoords = 
            typeof shelter.longitude === 'number' && 
            typeof shelter.latitude === 'number' && 
            !isNaN(shelter.longitude) && 
            !isNaN(shelter.latitude) &&
            shelter.longitude >= -180 && 
            shelter.longitude <= 180 &&
            shelter.latitude >= -90 && 
            shelter.latitude <= 90;
          
          if (!hasValidCoords) {
            console.warn("Shelter has invalid coordinates:", shelter);
            return false;
          }
          
          return true;
        });
        
        console.log("Valid shelters:", validShelters);
        setShelters(validShelters);
      } catch (err) {
        console.error("Error fetching shelters:", err);
        setShelters([]);
      }
    };
    getShelters();
  }, []);

  const renderMediaGallery = (pin) => (
    <div className="media-gallery">
      {pin.images?.map((img) => (
        <img
          key={img.filename}
          src={`http://localhost:5000/${img.path}`}
          alt={img.originalName}
          width="120"
          style={{ marginRight: "10px", borderRadius: "6px" }}
        />
      ))}
      {pin.videos?.map((vid) => (
        <video
          key={vid.filename}
          src={`http://localhost:5000/${vid.path}`}
          width="180"
          controls
          style={{ marginTop: "10px", borderRadius: "6px" }}
        />
      ))}
    </div>
  );

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
  };

  // Calculate road distance using Mapbox Directions API
  const getRoadDistance = async (userLat, userLng, shelterLat, shelterLng) => {
    try {
      const accessToken = "pk.eyJ1IjoibmF2b2RhMTIzIiwiYSI6ImNtZTdhMDdsaTAyY3QycXBtNWQwdHpxc2IifQ.jNfJr5DmTfwet02F2tQC1w";
      const start = `${userLng},${userLat}`;
      const end = `${shelterLng},${shelterLat}`;
      
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start};${end}?geometries=geojson&access_token=${accessToken}`
      );
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const distanceInMeters = data.routes[0].distance;
        const durationInSeconds = data.routes[0].duration;
        return {
          distance: distanceInMeters / 1000, // Convert to kilometers
          duration: Math.round(durationInSeconds / 60), // Convert to minutes
          geometry: data.routes[0].geometry
        };
      }
      return null;
    } catch (error) {
      console.error("Error calculating road distance:", error);
      return null;
    }
  };

  // Calculate distances to all nearby shelters
  const calculateShelterDistances = async () => {
    if (!userLocation || shelters.length === 0) return;
    
    setLoadingDistances(true);
    
    try {
      // Filter shelters within reasonable radius (50km) first using Haversine
      const nearbyShelters = shelters.filter(shelter => {
        const straightLineDistance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          shelter.latitude,
          shelter.longitude
        );
        return straightLineDistance <= 50; // 50km radius
      });

      // Calculate road distances for nearby shelters
      const sheltersWithRoadDistance = await Promise.all(
        nearbyShelters.slice(0, 10).map(async (shelter) => { // Limit to 10 for performance
          const roadInfo = await getRoadDistance(
            userLocation.latitude,
            userLocation.longitude,
            shelter.latitude,
            shelter.longitude
          );
          
          const straightLineDistance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            shelter.latitude,
            shelter.longitude
          );

          return {
            ...shelter,
            straightLineDistance,
            roadDistance: roadInfo?.distance || straightLineDistance,
            travelTime: roadInfo?.duration || Math.round(straightLineDistance * 2), // Estimate if API fails
            geometry: roadInfo?.geometry
          };
        })
      );

      // Sort by road distance
      const sortedShelters = sheltersWithRoadDistance.sort((a, b) => a.roadDistance - b.roadDistance);
      
      setNearbySheltersWithDistance(sortedShelters);
      
      // Set nearest shelter
      if (sortedShelters.length > 0) {
        setNearestShelter(sortedShelters[0]);
      }
      
    } catch (error) {
      console.error("Error calculating shelter distances:", error);
    } finally {
      setLoadingDistances(false);
    }
  };

  // Find nearest shelter to user location
  const findNearestShelter = () => {
    if (!userLocation || shelters.length === 0) return null;
    
    let nearest = null;
    let minDistance = Infinity;
    
    shelters.forEach(shelter => {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        shelter.latitude,
        shelter.longitude
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearest = { ...shelter, distance };
      }
    });
    
    return nearest;
  };

  // Update nearest shelter when user location or shelters change
  useEffect(() => {
    if (userLocation && shelters.length > 0) {
      calculateShelterDistances();
    }
  }, [userLocation, shelters]);

  // Get directions to nearest shelter using Mapbox Directions API
  const getDirectionsToShelter = async (shelter) => {
    if (!userLocation || !shelter) return;
    
    try {
      const accessToken = "pk.eyJ1IjoibmF2b2RhMTIzIiwiYSI6ImNtZTdhMDdsaTAyY3QycXBtNWQwdHpxc2IifQ.jNfJr5DmTfwet02F2tQC1w";
      const start = `${userLocation.longitude},${userLocation.latitude}`;
      const end = `${shelter.longitude},${shelter.latitude}`;
      
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start};${end}?geometries=geojson&access_token=${accessToken}`
      );
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        setDirections(data.routes[0].geometry);
        setShowDirections(true);
      }
    } catch (error) {
      console.error("Error getting directions:", error);
    }
  };

  // Handle shelter marker click
  const handleShelterClick = (shelterId) => {
    setSelectedShelterId(selectedShelterId === shelterId ? null : shelterId);
  };

  // Handle get directions button click - Open Google Maps
  const handleGetDirections = () => {
    if (nearestShelter && userLocation) {
      // Create Google Maps URL with directions
      const startLat = userLocation.latitude;
      const startLng = userLocation.longitude;
      const endLat = nearestShelter.latitude;
      const endLng = nearestShelter.longitude;
      
      // Google Maps directions URL
      const googleMapsUrl = `https://www.google.com/maps/dir/${startLat},${startLng}/${endLat},${endLng}`;
      
      // Open in new tab
      window.open(googleMapsUrl, '_blank');
      
      // Also show route on map if available
      if (nearestShelter.geometry) {
        setDirections(nearestShelter.geometry);
        setShowDirections(true);
      }
    }
  };

  // Show route to specific shelter
  const showRouteToShelter = async (shelter) => {
    if (!userLocation) return;
    
    if (shelter.geometry) {
      setDirections(shelter.geometry);
      setShowDirections(true);
    } else {
      // Calculate route if not already available
      const roadInfo = await getRoadDistance(
        userLocation.latitude,
        userLocation.longitude,
        shelter.latitude,
        shelter.longitude
      );
      
      if (roadInfo && roadInfo.geometry) {
        setDirections(roadInfo.geometry);
        setShowDirections(true);
      }
    }
  };



  return (
    <div>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .popup-card {
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(10px);
            min-width: 280px;
            max-width: 320px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          
          .popup-card h2 {
            color: #1e293b;
            font-size: 18px;
            font-weight: 700;
            margin: 0 0 16px 0;
            padding-bottom: 12px;
            border-bottom: 2px solid #e2e8f0;
            display: flex;
            align-items: center;
          }
          
          .popup-card h2::before {
            content: "📍";
            font-size: 20px;
            margin-right: 8px;
          }
          
          .popup-card p {
            margin: 0 0 12px 0;
            font-size: 14px;
            line-height: 1.5;
            color: #475569;
          }
          
          .popup-card p b {
            color: #1e293b;
            font-weight: 600;
          }
          
          .severity-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .severity-low {
            background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
            color: #166534;
            border: 1px solid #86efac;
          }
          
          .severity-moderate {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            color: #92400e;
            border: 1px solid #fcd34d;
          }
          
          .severity-high {
            background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
            color: #991b1b;
            border: 1px solid #f87171;
          }
          
          .severity-critical {
            background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
            color: #831843;
            border: 1px solid #f472b6;
          }
          
          .popup-card button {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            margin-top: 16px;
            width: 100%;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .popup-card button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
          }
          
          .popup-card button::after {
            content: "→";
            margin-left: 8px;
            font-size: 16px;
            transition: transform 0.3s ease;
          }
          
          .popup-card button:hover::after {
            transform: translateX(4px);
          }
          
          .shelter-popup {
            background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
            border-radius: 20px;
            padding: 24px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            border: 2px solid rgba(59, 130, 246, 0.2);
            backdrop-filter: blur(15px);
            min-width: 320px;
            max-width: 380px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          
          .shelter-popup h2 {
            color: #1e40af;
            font-size: 20px;
            font-weight: 700;
            margin: 0 0 20px 0;
            padding-bottom: 16px;
            border-bottom: 3px solid #dbeafe;
            display: flex;
            align-items: center;
          }
          
          .shelter-popup h2::before {
            content: "🏠";
            font-size: 24px;
            margin-right: 10px;
          }
          
          .shelter-info {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          
          .info-item {
            background: rgba(255, 255, 255, 0.8);
            border-radius: 12px;
            padding: 16px;
            border: 1px solid rgba(59, 130, 246, 0.1);
            transition: all 0.3s ease;
          }
          
          .info-item:hover {
            background: rgba(255, 255, 255, 0.95);
            border-color: rgba(59, 130, 246, 0.2);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          }
          
          .info-label {
            font-size: 13px;
            font-weight: 700;
            color: #1e40af;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .info-value {
            font-size: 14px;
            color: #334155;
            line-height: 1.5;
            font-weight: 500;
          }
          
          .capacity-info .info-value {
            color: #059669;
            font-weight: 700;
            font-size: 16px;
          }
          
          .facilities-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 4px;
          }
          
          .facility-tag {
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            color: #1e40af;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            border: 1px solid #93c5fd;
            white-space: nowrap;
          }
          
          .contact-details {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          
          .contact-item {
            background: #f1f5f9;
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            color: #334155;
            border-left: 4px solid #3b82f6;
          }
          
          .contact-item.phone {
            border-left-color: #10b981;
          }
          
          .contact-item.email {
            border-left-color: #f59e0b;
          }
          
          .contact-item.phone::before {
            content: "📞 ";
            margin-right: 6px;
          }
          
          .contact-item.email::before {
            content: "📧 ";
            margin-right: 6px;
          }
          
          /* Mapbox popup customization */
          .mapboxgl-popup-content {
            padding: 0 !important;
            border-radius: 20px !important;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15) !important;
            border: none !important;
            background: transparent !important;
          }
          
          .mapboxgl-popup-tip {
            border-top-color: #ffffff !important;
          }
          
          .mapboxgl-popup-close-button {
            font-size: 20px !important;
            padding: 8px !important;
            color: #64748b !important;
            background: rgba(255, 255, 255, 0.9) !important;
            border-radius: 50% !important;
            right: 8px !important;
            top: 8px !important;
            width: 32px !important;
            height: 32px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            transition: all 0.3s ease !important;
          }
          
          .mapboxgl-popup-close-button:hover {
            background: rgba(239, 68, 68, 0.1) !important;
            color: #dc2626 !important;
            transform: scale(1.1) !important;
          }
        `}
      </style>
      
      {/* Map */}
      <div style={{ position: "relative", width: 1850, height:800  }}>

        <MapboxMap
          mapboxAccessToken="pk.eyJ1IjoibmF2b2RhMTIzIiwiYSI6ImNtZTdhMDdsaTAyY3QycXBtNWQwdHpxc2IifQ.jNfJr5DmTfwet02F2tQC1w"
          initialViewState={{
            longitude: 80.8156111,
          latitude: 7.90552778,
          zoom: 7,
          }}
          style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/navoda123/cmf0ny1k100cd01sb5fu2g8zd"
        >
          {/* User location */}
          {userLocation && (
            <Marker
              longitude={userLocation.longitude}
              latitude={userLocation.latitude}
              anchor="bottom"
            >
              <MyLocationIcon style={{ color: "blue" }} />
            </Marker>
          )}

          {/* Pins */}
          {allPins
            .filter((pin) => 
              pin && 
              pin._id && 
              typeof pin.longitude === 'number' && 
              typeof pin.latitude === 'number' && 
              !isNaN(pin.longitude) && 
              !isNaN(pin.latitude) &&
              pin.longitude >= -180 && 
              pin.longitude <= 180 &&
              pin.latitude >= -90 && 
              pin.latitude <= 90
            )
            .map((pin) => {
              const isNearby = pins.some((nearby) => nearby && nearby._id === pin._id);
              return (
                <Marker
                  key={pin._id}
                  longitude={pin.longitude}
                  latitude={pin.latitude}
                  anchor="bottom"
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    setSelectedPin(pin);
                  }}
                >
                  <LocationPinIcon
                    style={{
                      color: isNearby ? "red" : "orange",
                      cursor: "pointer",
                      fontSize: "58px",
                      
                    }}
                  />
                </Marker>
              );
            })}

          {/* Shelter Markers */}
          {shelters
            .filter((shelter) => 
              shelter && 
              shelter._id && 
              typeof shelter.longitude === 'number' && 
              typeof shelter.latitude === 'number' && 
              !isNaN(shelter.longitude) && 
              !isNaN(shelter.latitude) &&
              shelter.longitude >= -180 && 
              shelter.longitude <= 180 &&
              shelter.latitude >= -90 && 
              shelter.latitude <= 90
            )
            .map((shelter) => (
              <Marker
                key={shelter._id}
                longitude={shelter.longitude}
                latitude={shelter.latitude}
                anchor="bottom"
              >
                <HealthAndSafetyIcon
                  style={{ 
                    cursor: "pointer", 
                    color: "blue", 
                    fontSize: 48 
                  }}
                  onClick={() => handleShelterClick(shelter._id)}
                />
              </Marker>
            ))}

          {/* Shelter Popup */}
          {selectedShelterId &&
            (() => {
              const selectedShelter = shelters.find((s) => s && s._id === selectedShelterId);
              if (!selectedShelter) return null;
              return (
                <Popup
                  longitude={selectedShelter.longitude}
                  latitude={selectedShelter.latitude}
                  anchor="left"
                  closeOnClick={false}
                  onClose={() => setSelectedShelterId(null)}
                >
                  <div className="shelter-popup">
                    <h2>{selectedShelter.name}</h2>
                    
                    <div className="shelter-info">
                      <div className="info-item">
                        <div className="info-label">📝 Description</div>
                        <div className="info-value">{selectedShelter.description}</div>
                      </div>
                      
                      {selectedShelter.capacity > 0 && (
                        <div className="info-item capacity-info">
                          <div className="info-label">👥 Capacity</div>
                          <div className="info-value">{selectedShelter.capacity} people</div>
                        </div>
                      )}
                      
                      {selectedShelter.facilities && selectedShelter.facilities.length > 0 && (
                        <div className="info-item facilities-info">
                          <div className="info-label">🏥 Facilities</div>
                          <div className="facilities-list">
                            {selectedShelter.facilities.map((facility, index) => (
                              <span key={index} className="facility-tag">{facility}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedShelter.contact && (selectedShelter.contact.phone || selectedShelter.contact.email) && (
                        <div className="info-item contact-info">
                          <div className="info-label">📞 Contact</div>
                          <div className="contact-details">
                            {selectedShelter.contact.phone && (
                              <div className="contact-item phone">{selectedShelter.contact.phone}</div>
                            )}
                            {selectedShelter.contact.email && (
                              <div className="contact-item email">{selectedShelter.contact.email}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              );
            })()}

          {/* Popup */}
          {selectedPin && (
            <Popup
              longitude={selectedPin.longitude}
              latitude={selectedPin.latitude}
              anchor="left"
              closeOnClick={false}
              onClose={() => setSelectedPin(null)}
            >
              <div className="popup-card">
                <h2>{selectedPin.place}</h2>
                <p>
                  <b>Disaster:</b> {selectedPin.disaster}
                </p>
                <p>
                  <b>Severity:</b> 
                  <span className={`severity-badge severity-${selectedPin.severity?.toLowerCase() || 'moderate'}`}>
                    {selectedPin.severity || 'Moderate'}
                  </span>
                </p>
                <p>{selectedPin.info}</p>

                {/* ✅ View Details button */}
                <button
                  onClick={() => navigate(`/pin/${selectedPin._id}`)}
                  style={{
                    marginTop: "10px",
                    padding: "8px 16px",
                    background: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  View Details →
                </button>
              </div>
            </Popup>
          )}

          {/* Directions Layer */}
          {showDirections && directions && (
            <Source
              id="route"
              type="geojson"
              data={{
                type: "Feature",
                properties: {},
                geometry: directions
              }}
            >
              <Layer
                id="route"
                type="line"
                paint={{
                  "line-color": "#3b82f6",
                  "line-width": 4,
                  "line-opacity": 0.8
                }}
              />
            </Source>
          )}
        </MapboxMap>

        {/* Shelter Controls */}
        <div style={{
          position: "absolute",
          bottom: "10px",
          left: "10px",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          padding: "16px",
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
          zIndex: 1000,
          minWidth: "340px",
          maxHeight: "450px",
          overflowY: "auto",
          border: "1px solid rgba(255, 255, 255, 0.2)"
        }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            marginBottom: "16px",
            paddingBottom: "12px",
            borderBottom: "2px solid #e5e7eb"
          }}>
            <span style={{ fontSize: "20px", marginRight: "10px" }}>🏠</span>
            <h3 style={{ 
              margin: "0", 
              color: "#059669", 
              fontSize: "18px",
              fontWeight: "700"
            }}>
              Emergency Shelters
            </h3>
          </div>
          
          {loadingDistances && (
            <div style={{ 
              marginBottom: "16px", 
              padding: "14px", 
              background: "linear-gradient(135deg, #f3f4f6 0%, #f9fafb 100%)", 
              borderRadius: "10px", 
              textAlign: "center",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                marginBottom: "8px"
              }}>
                <div style={{
                  width: "20px",
                  height: "20px",
                  border: "2px solid #e5e7eb",
                  borderTop: "2px solid #3b82f6",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  marginRight: "10px"
                }}></div>
                <span style={{ 
                  fontSize: "14px", 
                  fontWeight: "500", 
                  color: "#374151" 
                }}>
                  Calculating road distances...
                </span>
              </div>
              <div style={{ 
                fontSize: "12px", 
                color: "#6b7280" 
              }}>
                Please wait while we find the best routes
              </div>
            </div>
          )}
          
          {nearestShelter && !loadingDistances && (
            <div style={{ 
              marginBottom: "16px", 
              padding: "14px", 
              background: "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)", 
              borderRadius: "10px", 
              border: "2px solid #10b981",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.15)"
            }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                marginBottom: "8px" 
              }}>
                <span style={{ fontSize: "18px", marginRight: "8px" }}>🎯</span>
                <p style={{ 
                  margin: "0", 
                  fontWeight: "bold", 
                  color: "#059669", 
                  fontSize: "15px" 
                }}>
                  Nearest Emergency Shelter
                </p>
              </div>
              
              <h4 style={{ 
                margin: "0 0 10px 0", 
                fontWeight: "700", 
                color: "#1f2937", 
                fontSize: "16px",
                lineHeight: "1.2"
              }}>
                {nearestShelter.name}
              </h4>
              
              <div style={{ fontSize: "13px", color: "#374151", lineHeight: "1.4" }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ marginRight: "8px" }}>🚗</span>
                  <span style={{ fontWeight: "500" }}>Road Distance:</span>
                  <span style={{ marginLeft: "6px", color: "#059669", fontWeight: "600" }}>
                    {nearestShelter.roadDistance.toFixed(2)} km
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ marginRight: "8px" }}>⏱️</span>
                  <span style={{ fontWeight: "500" }}>Travel Time:</span>
                  <span style={{ marginLeft: "6px", color: "#dc2626", fontWeight: "600" }}>
                    ~{nearestShelter.travelTime} min
                  </span>
                </div>
              </div>
              
              <button
                onClick={handleGetDirections}
                style={{
                  background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                  color: "white",
                  border: "none",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600",
                  marginTop: "12px",
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 8px rgba(5, 150, 105, 0.3)"
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.boxShadow = "0 4px 12px rgba(5, 150, 105, 0.4)";
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "0 2px 8px rgba(5, 150, 105, 0.3)";
                }}
              >
                <DirectionsIcon style={{ fontSize: "18px", marginRight: "6px" }} />
                Get Directions (Google Maps)
              </button>
            </div>
          )}

          {nearbySheltersWithDistance.length > 1 && !loadingDistances && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                marginBottom: "12px" 
              }}>
                <span style={{ fontSize: "16px", marginRight: "8px" }}>📋</span>
                <p style={{ 
                  margin: "0", 
                  fontWeight: "bold", 
                  fontSize: "15px", 
                  color: "#1f2937" 
                }}>
                  Other Nearby Shelters
                </p>
              </div>
              
              <div style={{ 
                maxHeight: "220px", 
                overflowY: "auto",
                paddingRight: "4px"
              }}>
                {nearbySheltersWithDistance.slice(1, 6).map((shelter, index) => (
                  <div 
                    key={shelter._id} 
                    style={{ 
                      padding: "12px", 
                      background: index === 0 ? "linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%)" : "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", 
                      borderRadius: "8px", 
                      marginBottom: "8px",
                      border: index === 0 ? "1px solid #f59e0b" : "1px solid #e2e8f0",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)"
                    }}
                    onClick={() => handleShelterClick(shelter._id)}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.12)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.05)";
                    }}
                  >
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      marginBottom: "6px" 
                    }}>
                      <span style={{ 
                        fontSize: "14px", 
                        marginRight: "8px",
                        fontWeight: "600"
                      }}>
                        {index === 0 ? "�" : index === 1 ? "�" : `${index + 2}.`}
                      </span>
                      <span style={{ 
                        fontWeight: "600", 
                        fontSize: "14px", 
                        color: "#1f2937",
                        flex: "1"
                      }}>
                        {shelter.name}
                      </span>
                    </div>
                    
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "space-between",
                      marginBottom: "4px"
                    }}>
                      <div style={{ fontSize: "12px", color: "#374151" }}>
                        🚗 <span style={{ fontWeight: "500" }}>{shelter.roadDistance.toFixed(2)} km</span>
                      </div>
                      <div style={{ fontSize: "12px", color: "#dc2626" }}>
                        ⏱️ <span style={{ fontWeight: "500" }}>{shelter.travelTime} min</span>
                      </div>
                    </div>
                    
                    {shelter.capacity && (
                      <div style={{ 
                        fontSize: "11px", 
                        color: "#6b7280",
                        display: "flex",
                        alignItems: "center"
                      }}>
                        <span style={{ marginRight: "4px" }}>👥</span>
                        <span>Capacity: {shelter.capacity} people</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!nearestShelter && !loadingDistances && shelters.length === 0 && (
            <p style={{ margin: "0", fontSize: "12px", color: "#dc2626" }}>
              ❌ No shelters available
            </p>
          )}

          {!userLocation && (
            <p style={{ margin: "0", fontSize: "12px", color: "#f59e0b" }}>
              📍 Please enable location access to find nearby shelters
            </p>
          )}
          
          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "8px", marginTop: "12px" }}>
            <div style={{ fontSize: "11px", color: "#6b7280" }}>
              Total Shelters: {shelters.length} | Showing: {nearbySheltersWithDistance.length}
            </div>
          </div>
        </div>

        {/* Directions Display */}
        {showDirections && directions && (
          <div style={{
            position: "absolute",
            bottom: "10px",
            left: "10px",
            background: "white",
            padding: "10px",
            borderRadius: "8px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            zIndex: 1000,
            maxWidth: "300px"
          }}>
            <h4 style={{ margin: "0 0 10px 0", color: "blue" }}>Evacuation Route</h4>
            <p style={{ margin: "0 0 10px 0", fontSize: "12px" }}>
              Route to nearest shelter is displayed on the map
            </p>
            <button
              onClick={() => setShowDirections(false)}
              style={{
                background: "red",
                color: "white",
                border: "none",
                padding: "6px 12px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px"
              }}
            >
              Hide Route
            </button>
          </div>
        )}
      </div>

    </div>
  );
}



export default UserMap;


