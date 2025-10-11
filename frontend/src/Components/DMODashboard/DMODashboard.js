import React, { useEffect, useState } from "react";
import axios from "axios";
import ReadAid from "../../Component/VictimDashboard/RequestAid/Read";
import ReadReport from "../../Component/VictimDashboard/ReportDisaster/ReadReport";
import Assign from "./Reports/Assign";
import { useNavigate } from "react-router-dom";
import FulfillAidDialog from "./Requests/Requests";
import Fill from "./Requests/Fill";
import Deployments from "./Reports/Deployments";
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Nav from '../NavBar/adminNav';

// Map controller component to handle center and zoom changes
function MapController({ center, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  
  return null;
}

export default function DMODashboard() {
  const navigate = useNavigate();
  const [active, setActive] = useState(() => {
    // Get saved active section from localStorage or default to "dashboard"
    return localStorage.getItem("dmo_active_section") || "dashboard";
  }); // "dashboard" | "reports" | "aid" | "filled"
  const [counts, setCounts] = useState({ reports: 0, aids: 0, approved: 0, rejected: 0, pending: 0 });
  const [assignFor, setAssignFor] = useState(null); // report id to assign
  const [assignVictim, setAssignVictim] = useState(null);
  const [fulfillOpen, setFulfillOpen] = useState(false);
  const [selectedAid, setSelectedAid] = useState(null);
  const [deploymentStatuses, setDeploymentStatuses] = useState({ pending: 0, inProgress: 0, completed: 0, teams: [] });
  const [teamLocations, setTeamLocations] = useState([]);
  const [mapCenter, setMapCenter] = useState([7.8731, 80.7718]);
  const [zoomLevel, setZoomLevel] = useState(7);
  const [statusMap, setStatusMap] = useState({});
  const defaultPosition = [7.8731, 80.7718]; // Default center of Sri Lanka
  
  // Create custom icons for different teams
  const teamIcons = {
    Army: new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    }),
    Police: new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    }),
    "Fire Brigade": new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })
  };

  // Load team locations from backend API
  const loadTeamLocations = () => {
    // First, get current deployments to validate locations
    fetch("http://localhost:5000/deployments")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((deploymentData) => {
        const deployments = Array.isArray(deploymentData?.deployments) ? deploymentData.deployments : [];
        const validDeploymentIds = new Set(deployments.map(d => d._id));
        
        // If no deployments, clear locations
        if (deployments.length === 0) {
          setTeamLocations([]);
          setStatusMap({});
          return;
        }
        
        // Then fetch team locations
        return fetch('http://localhost:5000/teamLocations')
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              // Filter locations to only include those with valid deployments
              const locations = Array.isArray(data.teamLocations) ? data.teamLocations : [];
              const validLocations = locations.filter(loc => validDeploymentIds.has(loc.deploymentId));
              setTeamLocations(validLocations);
              
              // Create status map from valid team locations
              const newStatusMap = {};
              validLocations.forEach(location => {
                if (location.deploymentId && location.status) {
                  newStatusMap[location.deploymentId] = location.status;
                }
              });
              setStatusMap(newStatusMap);
            } else {
              console.error('Error loading team locations:', data.message);
              setTeamLocations([]);
              setStatusMap({});
            }
          });
      })
      .catch(error => {
        console.error('Error fetching team locations:', error);
        // Set empty state on error
        setTeamLocations([]);
        setStatusMap({});
      });
  };
  
  useEffect(() => {
    loadTeamLocations();
    
    // Set up interval to refresh team locations
    const intervalId = setInterval(loadTeamLocations, 10000); // Refresh every 10 seconds
    
    // Add event listener for storage changes
    const handleStorageChange = (e) => {
      if (e.key === 'teamLocations' || e.key === 'deploymentStatuses') {
        loadTeamLocations();
      }
    };
    
    // Add event listener for custom status update event
    const handleStatusUpdate = (e) => {
      const { deploymentId, status } = e.detail;
      setStatusMap(prevStatusMap => ({
        ...prevStatusMap,
        [deploymentId]: status
      }));
    };
    
    // Add event listener for teams updated event
    const handleTeamsUpdated = () => {
      loadTeamLocations();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('statusUpdated', handleStatusUpdate);
    window.addEventListener('teamsUpdated', handleTeamsUpdated);
    
    return () => {
      clearInterval(intervalId); // Clean up interval on component unmount
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('statusUpdated', handleStatusUpdate);
      window.removeEventListener('teamsUpdated', handleTeamsUpdated);
    };
  }, []);

  // Load KPI counts on mount
  useEffect(() => {
    let mounted = true;
    async function loadCounts() {
      try {
        const [repRes, aidRes] = await Promise.allSettled([
          axios.get("http://localhost:5000/victims"),
          axios.get("http://localhost:5000/aids"),
        ]);

        const victimsData = repRes.status === "fulfilled" ? repRes.value.data : [];
        const aidsData = aidRes.status === "fulfilled" ? aidRes.value.data : [];

        const repList = Array.isArray(victimsData) ? victimsData : victimsData.victims || victimsData.items || victimsData.data || [];
        const aidList = Array.isArray(aidsData) ? aidsData : aidsData.aids || aidsData.items || aidsData.data || [];
        
        // Count approved, rejected, and pending reports from localStorage
        let approvedCount = 0;
        let rejectedCount = 0;
        let pendingCount = 0;
        
        repList.forEach(report => {
          const reportId = report._id || report.id;
          const savedStatus = localStorage.getItem(`report_status_${reportId}`);
          if (savedStatus === 'Approved') {
            approvedCount++;
          } else if (savedStatus === 'Rejected') {
            rejectedCount++;
          } else {
            // If no status is saved, it's pending
            pendingCount++;
          }
        });

        if (mounted) setCounts({ reports: repList.length, aids: aidList.length, approved: approvedCount, rejected: rejectedCount, pending: pendingCount });
      } catch {
        if (mounted) setCounts({ reports: 0, aids: 0, approved: 0, rejected: 0, pending: 0 });
      }
    }
    loadCounts();
    return () => { mounted = false; };
  }, []);
  
  // Load deployment statuses from localStorage
  useEffect(() => {
    // Get team data first
    fetch("http://localhost:5000/deployments")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => {
        const deployments = Array.isArray(data?.deployments) ? data.deployments : [];
        
        // If no deployments, set empty state and clear team locations
        if (deployments.length === 0) {
          setDeploymentStatuses({
            pending: 0,
            inProgress: 0,
            completed: 0,
            teams: []
          });
          // Clear team locations when no deployments exist
          setTeamLocations([]);
          return;
        }
        
        // Get saved statuses from localStorage
        const savedStatuses = localStorage.getItem('deploymentStatuses');
        const statusData = savedStatuses ? JSON.parse(savedStatuses) : {};
        
        // Count deployments by status
        let pending = 0;
        let inProgress = 0;
        let completed = 0;
        
        // Create team status data
        const teamData = deployments.map(deployment => {
          const status = statusData[deployment._id] || "Pending";
          
          // Count by status
          if (status === "Pending") pending++;
          else if (status === "In Progress") inProgress++;
          else if (status === "Completed") completed++;
          
          return {
            id: deployment._id,
            team: deployment.team,
            teamName: deployment.teamName || "Unnamed",
            location: deployment.location || "Unknown",
            status: status,
            type: deployment.urgent || "Medium"
          };
        });
        
        setDeploymentStatuses({
          pending,
          inProgress,
          completed,
          teams: teamData
        });
        
        // Filter team locations to only show those with valid deployments
        setTeamLocations(prevLocations => {
          const validDeploymentIds = new Set(deployments.map(d => d._id));
          return prevLocations.filter(loc => validDeploymentIds.has(loc.deploymentId));
        });
      })
      .catch(error => {
        console.error("Error loading deployments:", error);
        // Set empty state on error
        setDeploymentStatuses({
          pending: 0,
          inProgress: 0,
          completed: 0,
          teams: []
        });
        setTeamLocations([]);
      });
  }, []);

  return (
    <>
      <Nav />
      <main className="dmo-dashboard" style={{ display: "flex", minHeight: "calc(100vh - 120px)" }}>
      {/* Sidebar navigation */}
      <aside
        style={{
          width: 240,
          borderRight: "1px solid #e5e9f1",
          padding: 16,
          background: "#f9fbff",
          boxShadow: "4px 0 6px -1px rgba(0, 0, 0, 0.1), 2px 0 4px -1px rgba(0, 0, 0, 0.06)",
          position: "relative",
          zIndex: 10
        }}
        aria-label="DMO sections"
      >
        <h2 style={{ margin: "0 0 24px 0", fontSize: 18 }}>DMO Dashboard</h2>
        <nav>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            <li>
              <button
                onClick={() => {
                  setActive("dashboard");
                  localStorage.setItem("dmo_active_section", "dashboard");
                }}
                className={active === "dashboard" ? "ra-btn ra-btn--primary" : "ra-btn ra-btn--ghost"}
                aria-current={active === "dashboard" ? "page" : undefined}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 8,
                  marginBottom: 16,
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  transition: "all 0.3s ease",
                  transform: "translateZ(0)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px) translateZ(0)";
                  e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0) translateZ(0)";
                  e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                }}
              >
                Dashboard
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setActive("reports");
                  localStorage.setItem("dmo_active_section", "reports");
                }}
                className={active === "reports" ? "ra-btn ra-btn--primary" : "ra-btn ra-btn--ghost"}
                aria-current={active === "reports" ? "page" : undefined}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 8,
                  marginBottom: 16,
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  transition: "all 0.3s ease",
                  transform: "translateZ(0)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px) translateZ(0)";
                  e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0) translateZ(0)";
                  e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                }}
              >
                Incoming Disaster Reports
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setActive("aid");
                  localStorage.setItem("dmo_active_section", "aid");
                }}
                className={active === "aid" ? "ra-btn ra-btn--primary" : "ra-btn ra-btn--ghost"}
                aria-current={active === "aid" ? "page" : undefined}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 8,
                  marginBottom: 16,
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  transition: "all 0.3s ease",
                  transform: "translateZ(0)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px) translateZ(0)";
                  e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0) translateZ(0)";
                  e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                }}
              >
                Incoming Aid Requests
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setActive("filled");
                  localStorage.setItem("dmo_active_section", "filled");
                }}
                className={active === "filled" ? "ra-btn ra-btn--primary" : "ra-btn ra-btn--ghost"}
                aria-current={active === "filled" ? "page" : undefined}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 8,
                  marginBottom: 16,
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  transition: "all 0.3s ease",
                  transform: "translateZ(0)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px) translateZ(0)";
                  e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0) translateZ(0)";
                  e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                }}
              >
                Filled Requests
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setActive("deployments");
                  localStorage.setItem("dmo_active_section", "deployments");
                }}
                className={active === "deployments" ? "ra-btn ra-btn--primary" : "ra-btn ra-btn--ghost"}
                aria-current={active === "deployments" ? "page" : undefined}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 8,
                  marginBottom: 16,
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  transition: "all 0.3s ease",
                  transform: "translateZ(0)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px) translateZ(0)";
                  e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0) translateZ(0)";
                  e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                }}
              >
                Deployment Orders
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main content area */}
      <section style={{ flex: 1, padding: 16 }}>
        {active === "dashboard" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <div 
              style={{ background: "#ffffff", border: "1px solid #e5e9f1", borderRadius: 12, padding: 16, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", transition: "all 0.3s ease", transform: "translateZ(0)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px) translateZ(0)";
                e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
                e.currentTarget.style.border = "2px solid #3b82f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) translateZ(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                e.currentTarget.style.border = "1px solid #e5e9f1";
              }}
            >
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Total Disaster Reports</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{counts.reports}</div>
            </div>
            <div 
              style={{ background: "#ffffff", border: "1px solid #e5e9f1", borderRadius: 12, padding: 16, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", transition: "all 0.3s ease", transform: "translateZ(0)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px) translateZ(0)";
                e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
                e.currentTarget.style.border = "2px solid #3b82f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) translateZ(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                e.currentTarget.style.border = "1px solid #e5e9f1";
              }}
            >
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Total Aid Requests</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{counts.aids}</div>
            </div>
            <div 
              style={{ background: "#ffffff", border: "1px solid #e5e9f1", borderRadius: 12, padding: 16, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", transition: "all 0.3s ease", transform: "translateZ(0)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px) translateZ(0)";
                e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
                e.currentTarget.style.border = "2px solid #3b82f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) translateZ(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                e.currentTarget.style.border = "1px solid #e5e9f1";
              }}
            >
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Pending Disaster Reports</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{counts.pending}</div>
            </div>
            <div 
              style={{ background: "#ffffff", border: "1px solid #e5e9f1", borderRadius: 12, padding: 16, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", transition: "all 0.3s ease", transform: "translateZ(0)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px) translateZ(0)";
                e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
                e.currentTarget.style.border = "2px solid #3b82f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) translateZ(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                e.currentTarget.style.border = "1px solid #e5e9f1";
              }}
            >
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Approved Disaster Reports</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{counts.approved}</div>
            </div>
            <div 
              style={{ background: "#ffffff", border: "1px solid #e5e9f1", borderRadius: 12, padding: 16, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", transition: "all 0.3s ease", transform: "translateZ(0)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px) translateZ(0)";
                e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
                e.currentTarget.style.border = "2px solid #3b82f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) translateZ(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                e.currentTarget.style.border = "1px solid #e5e9f1";
              }}
            >
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Rejected Disaster Reports</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{counts.rejected}</div>
            </div>
            
            {/* Team Status & Deployments Section */}
            <div 
              style={{ background: "#ffffff", border: "1px solid #e5e9f1", borderRadius: 12, padding: 16, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", gridColumn: "1 / -1", marginTop: 24, transition: "all 0.3s ease", transform: "translateZ(0)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px) translateZ(0)";
                e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0) translateZ(0)";
                e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
              }}
            >
              <h3 style={{ margin: "0 0 16px 0" }}>Team Status & Deployments</h3>
              
              <div style={{ display: "flex", gap: "20px" }}>
                {/* Leaflet Map */}
                <div style={{ height: "350px", flex: "0 0 55%", borderRadius: "8px", overflow: "hidden" }}>
                <MapContainer center={mapCenter} zoom={zoomLevel} style={{ height: "100%", width: "100%" }}>
                  <MapController center={mapCenter} zoom={zoomLevel} />
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {teamLocations.map((team, index) => {
                    // Validate coordinates before creating marker
                    const lat = parseFloat(team.latitude);
                    const lng = parseFloat(team.longitude);
                    
                    // Skip invalid coordinates
                    if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
                      return null;
                    }
                    
                    return (
                      <Marker 
                        key={index} 
                        position={[lat, lng]}
                        icon={teamIcons[team.team] || teamIcons.Police} // Default to Police if team type not found
                      >
                        <Popup>
                          <div style={{ width: "300px", padding: "5px" }}>
                            <div style={{ 
                              backgroundColor: "#f0f0f0", 
                              padding: "8px", 
                              borderRadius: "4px",
                              marginBottom: "10px"
                            }}>
                              <div style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "5px" }}>{team.team} - Flood</div>
                              <div style={{ 
                                backgroundColor: 
                                  statusMap[team.deploymentId] === "Completed" ? "#4CAF50" : 
                                  statusMap[team.deploymentId] === "In Progress" ? "#FFA500" : 
                                  "#2196F3", 
                                color: "white", 
                                display: "inline-block", 
                                padding: "3px 8px", 
                                borderRadius: "4px",
                                marginBottom: "10px"
                              }}>
                                Status: {statusMap[team.deploymentId] || team.status || "Pending"}
                              </div>
                            </div>
                            
                            <div style={{ marginBottom: "10px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>Live Location</div>
                                <button 
                                  onClick={() => {
                                    // Center the map on this team's location
                                    setMapCenter([lat, lng]);
                                    setZoomLevel(15);
                                  }}
                                  style={{ 
                                    backgroundColor: "#007bff", 
                                    color: "white", 
                                    border: "none", 
                                    padding: "5px 10px", 
                                    borderRadius: "4px",
                                    cursor: "pointer"
                                  }}
                                >
                                  Get Live Location
                                </button>
                              </div>
                            </div>
                            
                            <div style={{ marginBottom: "5px" }}><strong>Current Position:</strong> {lat.toFixed(6)}, {lng.toFixed(6)}</div>
                            <div style={{ marginBottom: "5px" }}><strong>Last Updated:</strong> {team.lastUpdated || "Unknown"}</div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
                </div>
              
                {/* Right side - Status bars and team list */}
                <div style={{ flex: 1, maxWidth: "40%" }}>
              {/* Status bars */}
              {(deploymentStatuses.pending > 0 || deploymentStatuses.inProgress > 0 || deploymentStatuses.completed > 0) ? (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div>Pending</div>
                    <div>{deploymentStatuses.pending} teams</div>
                  </div>
                  <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, marginBottom: 12 }}>
                    <div style={{ 
                      height: "100%", 
                      width: `${deploymentStatuses.pending ? (deploymentStatuses.pending / (deploymentStatuses.pending + deploymentStatuses.inProgress + deploymentStatuses.completed) * 100) : 0}%`, 
                      background: "#f59e0b", 
                      borderRadius: 4 
                    }}></div>
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div>In Progress</div>
                    <div>{deploymentStatuses.inProgress} teams</div>
                  </div>
                  <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, marginBottom: 12 }}>
                    <div style={{ 
                      height: "100%", 
                      width: `${deploymentStatuses.inProgress ? (deploymentStatuses.inProgress / (deploymentStatuses.pending + deploymentStatuses.inProgress + deploymentStatuses.completed) * 100) : 0}%`, 
                      background: "#3b82f6", 
                      borderRadius: 4 
                    }}></div>
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div>Completed</div>
                    <div>{deploymentStatuses.completed} teams</div>
                  </div>
                  <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, marginBottom: 12 }}>
                    <div style={{ 
                      height: "100%", 
                      width: `${deploymentStatuses.completed ? (deploymentStatuses.completed / (deploymentStatuses.pending + deploymentStatuses.inProgress + deploymentStatuses.completed) * 100) : 0}%`, 
                      background: "#10b981", 
                      borderRadius: 4 
                    }}></div>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: 20, textAlign: "center", padding: "20px", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
                  <p style={{ margin: 0, color: "#666" }}>No active teams available</p>
                </div>
              )}
              
              {/* Team list */}
              {deploymentStatuses.teams && deploymentStatuses.teams.length > 0 ? (
                <div>
                  {deploymentStatuses.teams.map(team => (
                    <div key={team.id} style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      padding: "8px 12px", 
                      borderBottom: "1px solid #e5e9f1",
                      alignItems: "center"
                    }}>
                      <div style={{ fontWeight: "500" }}>{team.team}</div>
                      <div style={{ color: "#6b7280" }}>{team.teamName}</div>
                      <div style={{ color: "#6b7280" }}>{team.type}</div>
                      <div style={{ 
                        padding: "4px 12px", 
                        borderRadius: "16px", 
                        fontSize: "12px",
                        backgroundColor: team.status === "Completed" ? "#d1fae5" : 
                                        team.status === "In Progress" ? "#dbeafe" : "#fef3c7",
                        color: team.status === "Completed" ? "#065f46" : 
                               team.status === "In Progress" ? "#1e40af" : "#92400e"
                      }}>
                        {team.status}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : active === "reports" ? (
          <section aria-label="Incoming Disaster Reports">
            <ReadReport
              hideActions
              compact
              showAssign
              onAssign={(id, victim) => { setAssignFor(id); setAssignVictim(victim); }}
            />
          </section>
        ) : active === "aid" ? (
          <section aria-label="Incoming Aid Requests">
            <ReadAid hideActions hideReview showFulfill onFulfill={(aid) => { setSelectedAid(aid); setFulfillOpen(true); }} />
          </section>
        ) : active === "filled" ? (
          <section aria-label="Filled Requests">
            <div style={{ background: "#ffffff", border: "1px solid #e5e9f1", borderRadius: 12, padding: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", maxWidth: "90%", marginLeft: "auto", marginRight: "auto" }}>
              <Fill />
            </div>
          </section>
        ) : active === "deployments" ? (
          <section aria-label="Deployment Orders">
            <div style={{ background: "#ffffff", border: "1px solid #e5e9f1", borderRadius: 12, padding: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
              <Deployments />
            </div>
          </section>
        ) : null}
      </section>
      <FulfillAidDialog
        open={fulfillOpen}
        aid={selectedAid}
        onClose={() => { setFulfillOpen(false); setSelectedAid(null); }}
        onSubmit={(payload) => {
          console.log("fulfill aid:", payload);
          // Save the fulfilled request to the backend
          fetch("http://localhost:5000/requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...payload,
              fulfilledAt: new Date().toISOString()
            }),
          })
            .then(response => {
              if (!response.ok) {
                throw new Error("Failed to save request");
              }
              return response.json();
            })
            .then(() => {
              setFulfillOpen(false);
              setSelectedAid(null);
              alert("Fulfillment submitted");
            })
            .catch(error => {
              console.error("Error saving request:", error);
              alert("Failed to save request. Please try again.");
            });
        }}
      />
      {/* Assign modal */}
      <Assign
        open={!!assignFor}
        reportId={assignFor}
        victim={assignVictim}
        onClose={() => setAssignFor(null)}
        onSubmit={(payload) => {
          fetch("http://localhost:5000/deployments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
            .then((r) => (r.ok ? r.json() : Promise.reject(r)))
            .then(() => {
              setAssignFor(null);
              setAssignVictim(null);
              alert("Successfully assigned to team!");
              setActive("deployments");
              localStorage.setItem("dmo_active_section", "deployments");
            })
            .catch(() => {
              alert("Failed to create deployment");
            });
        }}
      />
    </main>
    </>
  );
}

