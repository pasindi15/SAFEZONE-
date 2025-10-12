import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./PinDetails.css";
import Header from "../../HeaderFotter/Header";


function PinDetails() {
  const { id } = useParams(); // get :id from URL
  const navigate = useNavigate();
  const [pin, setPin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPin = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/pins/${id}`);
        setPin(res.data.data);
      } catch (err) {
        console.error("Error fetching pin details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPin();
  }, [id]);

  if (loading) {
    return <div style={{ padding: "20px" }}>Loading details...</div>;
  }

  if (!pin) {
    return <div style={{ padding: "20px" }}>Pin not found</div>;
  }

  return (
    <>
      <Header />
      <div className="disaster-page-container">
        {/* Blue Header Section */}
        <div className="disaster-header">
          <div className="header-bar"></div>
          <h1 className="disaster-title">DISASTER DESCRIPTION</h1>
          <div className="disaster-banner">
            <h2>RECENT DISASTER: {pin.place.toUpperCase()}</h2>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="main-content-card">
          <div className="content-layout" style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "2rem",
            padding: "2rem",
            minHeight: "700px"
          }}>
            {/* Left Side - Video Player */}
            <div className="video-section" style={{ width: "100%", minHeight: "600px" }}>
              {pin.videos && pin.videos.length > 0 ? (
                <div className="video-player" style={{ 
                  width: "100%", 
                  minHeight: "600px",
                  background: "#000",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "0 8px 25px rgba(0, 0, 0, 0.2)"
                }}>
                  <video 
                    controls
                    style={{
                      width: "100%",
                      height: "600px",
                      minHeight: "600px",
                      objectFit: "cover",
                      display: "block",
                      borderRadius: "12px"
                    }}
                  >
                    <source src={`http://localhost:5000/pins/${pin._id}/video/0`} type={pin.videos[0].contentType} />
                    Your browser does not support the video tag.
                  </video>
                  <p className="video-caption">On-the-ground footage from affected areas</p>
                </div>
              ) : (
                <div className="video-placeholder" style={{
                  width: "100%",
                  height: "600px",
                  minHeight: "600px",
                  background: "#f3f4f6",
                  border: "2px dashed #d1d5db",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <div className="placeholder-content">
                    <div className="play-icon">▶</div>
                    <p>No video available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Side - Image Gallery */}
            <div className="image-gallery">
              <div className="gallery-grid">
                {pin.images && pin.images.slice(0, 4).map((img, idx) => (
                  <div key={idx} className="gallery-item">
                    <img
                      src={`http://localhost:5000/pins/${pin._id}/image/${idx}`}
                      alt={img.originalName || `Image ${idx + 1}`}
                      onClick={() => window.open(`http://localhost:5000/pins/${pin._id}/image/${idx}`, "_blank")}
                    />
                    <div className="image-label">
                      {idx === 0 && "Relief Efforts"}
                      {idx === 1 && "Structural Damage"}
                      {idx === 2 && "Displaced Communities"}
                      {idx === 3 && "Medical Aid"}
                    </div>
                  </div>
                ))}
                {/* Fill empty slots if less than 4 images */}
                {(!pin.images || pin.images.length < 4) && 
                  Array.from({ length: 4 - (pin.images?.length || 0) }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="gallery-item empty">
                      <div className="empty-placeholder">
                        <div className="placeholder-icon">📷</div>
                        <p>No image</p>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>

          {/* Description Sections */}
          <div className="description-sections">
            <div className="description-left">
              <h3>Disaster Overview</h3>
              <p>
                <strong>Disaster Type:</strong> {pin.disaster}<br/>
                <strong>Severity Level:</strong> 
                <span className={`severity-badge severity-${pin.severity?.toLowerCase() || 'moderate'}`}>
                  {pin.severity || 'Moderate'}
                </span><br/>
                <strong>Location:</strong> {pin.place}<br/>
                <strong>Reported:</strong> {new Date(pin.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p>{pin.info}</p>
            </div>
            
            <div className="description-right">
            <h3>What to Do During the Disaster</h3>
            <div className="impact-details">
    <ul>
      <li>Move to higher ground immediately and avoid floodwaters.</li>
      <li>Keep emergency kits ready (water, food, first aid, flashlight, batteries).</li>
      <li>Stay tuned to local news and official updates for evacuation orders.</li>
      <li>Avoid driving or walking through flooded areas due to strong currents.</li>
      <li>Turn off electricity and gas connections if safe to do so.</li>
      <li>Assist children, elderly, and disabled persons to reach safety first.</li>
      <li>Keep important documents in waterproof containers.</li>
    </ul>
  </div>
            </div>
          </div>
        </div>
      </div>
      
    </>
  );

}

export default PinDetails;