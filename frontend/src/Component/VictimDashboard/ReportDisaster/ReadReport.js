/**
 * ReadReport.js - Submitted Reports Management Interface
 * 
 * This component displays a list of submitted disaster reports with search functionality.
 * It fetches data from the backend API and provides filtering capabilities.
 * 
 * Features:
 * - Real-time search across multiple report fields
 * - Responsive design with professional styling
 * - Delete functionality with confirmation
 * - Auto-refresh on new submissions
 * - Location data normalization (lat/lng to GeoJSON)
 */

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import AdminNav from "../../../Components/NavBar/adminNav";
import Read from "./Read";
import "./RD_Read.css";

// Backend API endpoint for victim reports
const API = "http://localhost:5000/victims";

/**
 * Normalizes victim data to ensure consistent format for the Read component
 * 
 * @param {Object} v - Raw victim data from API
 * @returns {Object} Normalized victim data with consistent field names and location format
 */
function adaptVictim(v) {
  const x = { ...v };

  // Normalize status field names (handle both 'status' and 'Status')
  if (!x.status && x.Status) x.status = x.Status;
  
  // Normalize name field names (handle both 'name' and 'victimName')
  if (!x.name && x.victimName) x.name = x.victimName;

  // Convert lat/lng coordinates to GeoJSON Point format if needed
  const hasGeoJson = x.location?.type === "Point" && Array.isArray(x.location.coordinates);
  const lat = x.lat != null ? parseFloat(x.lat) : null;
  const lng = x.lng != null ? parseFloat(x.lng) : null;

  // Create GeoJSON Point from lat/lng if not already in GeoJSON format
  if (!hasGeoJson && Number.isFinite(lat) && Number.isFinite(lng)) {
    x.location = { type: "Point", coordinates: [lng, lat] };
  }

  return x;
}

/**
 * Main ReadReport component for displaying and managing submitted disaster reports
 * 
 * @returns {JSX.Element} The rendered reports interface
 */
export default function ReadReport({ hideActions, compact, severity, showAssign, onAssign }) {
  // ========================================
  // State Management
  // ========================================
  
  /** Array of victim reports from the API */
  const [victims, setVictims] = useState([]);
  
  /** Loading state for API requests */
  const [loading, setLoading] = useState(true);
  
  /** Error message for failed API requests */
  const [err, setErr] = useState("");
  
  /** Search query string for filtering reports */
  const [q, setQ] = useState("");

  // ========================================
  // Data Fetching Functions
  // ========================================
  
  async function load() {
    setLoading(true);
    setErr("");
    
    try {
      const { data } = await axios.get(API);
      const raw = Array.isArray(data) ? data : data.victims || [];
      
      // Sort reports by creation date (newest first)
      const sorted = [...raw].sort((a, b) => {
        const ad = new Date(a.createdAt || a.date || 0).getTime();
        const bd = new Date(b.createdAt || b.date || 0).getTime();
        return bd - ad;
      });
      
      // Normalize data format and update state
      setVictims(sorted.map(adaptVictim));
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  }

  // ========================================
  // Event Handlers
  // ========================================
  
  /**
   * Handles deletion of a victim report
   * 
   * @param {string} id - The ID of the report to delete
   */
  async function handleDelete(id) {
    if (!window.confirm("Delete this report permanently?")) return;
    
    try {
      await axios.delete(`${API}/${id}`);
      setVictims((list) => list.filter((v) => (v._id || v.id) !== id));
    } catch (e) {
      alert("Delete failed");
    }
  }

  // ========================================
  // Effects and Side Effects
  // ========================================
  
  // Load reports on component mount
  useEffect(() => {
    load();
  }, []);

  // Listen for new report submissions to refresh the list automatically
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'lastVictimId' && e.newValue) {
        // New report submitted, refresh the list
        load();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ========================================
  // Computed Values
  // ========================================
  
  /**
   * Filters victims based on search query
   * Searches across multiple fields: name, NIC, email, phone, address, disaster type, description, location, and status
   */
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    // Optional severity filter: 'high' | 'medium' | 'low'
    const base = !severity
      ? victims
      : victims.filter((v) => {
          const raw = String(v.status || v.Status || "medium").toLowerCase();
          if (severity === "high") return /high/.test(raw);
          if (severity === "low") return /low/.test(raw);
          // default medium: not high and not low
          return !/high/.test(raw) && !/low/.test(raw);
        });

    if (!term) return base;

    return base.filter((v) =>
      [
        v.name,
        v.victimName,
        v.nic,
        v.phone,
        v.email,
        v.address,
        v.disasterType,
        v.description,
        v.locationStr,
        v.status,
        v.Status,
      ]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(term))
    );
  }, [victims, q, severity]);

  // ========================================
  // Render
  // ========================================
  
  return (
    <>
      {/* Admin Header */}
      <AdminNav />
      
      <main className="read-wrap container">
        {/* Header section with title, count, and search functionality */}
        <header className="read-head">
          <div className="header-left">
            <h1>Submitted Reports</h1>
            <div className="read-count">{victims.length} total</div>
          </div>
        <div className="header-right">
          {/* Search toolbar */}
          <div className="ra-toolbar">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search reports by name, NIC, email, phone, address, disaster type, description, location, or status..."
              className="ra-search"
              aria-label="Search reports"
            />
            {/* Clear search button - only visible when there's text */}
            {q && (
              <button 
                className="ra-btn ra-btn--ghost"
                onClick={() => setQ("")}
                title="Clear search"
                aria-label="Clear search"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Loading state */}
      {loading && <div className="read-empty">Loading reports…</div>}
      
      {/* Error state */}
      {err && <div className="read-error">{err}</div>}
      
      {/* Empty state - no reports */}
      {!loading && !err && victims.length === 0 && (
        <div className="read-empty">No reports found.</div>
      )}
      
      {/* Empty state - no search results */}
      {!loading && !err && victims.length > 0 && filtered.length === 0 && (
        <div className="read-empty">No reports match your search criteria.</div>
      )}

      {/* Reports grid - displays filtered results */}
      <section className="read-grid">
        {filtered.map((v) => (
          <Read
            key={v._id || v.id}
            victim={v}
            onDelete={handleDelete}
            hideActions={hideActions}
            compact={compact}
            showAssign={showAssign}
            onAssign={onAssign}
          />
        ))}
      </section>
    </main>
    </>
  );
}



