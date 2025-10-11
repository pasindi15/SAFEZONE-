/**
 * ReportsHub Component - Professional Dashboard for Submitted Records

 * @author ITP Development Team
 * @version 1.0.0
 */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import AdminNav from "../../../Components/NavBar/adminNav";
import "./ReportsHub.css";

/* ========================================
   Icon Components - Lightweight SVG Icons
   ======================================== */

// Common stroke properties for consistent icon styling
const Stroke = { 
  fill: "none", 
  stroke: "currentColor", 
  strokeWidth: 1.6, 
  strokeLinecap: "round", 
  strokeLinejoin: "round" 
};

/**
 * Triangle Alert Icon - Used for disaster reports
 * Represents warning/alert state for emergency situations
 */
const IconTriangleAlert = (props) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden {...props}>
    <path d="M12 2L22 20H2L12 2z" {...Stroke} />
    <path d="M12 8v6" {...Stroke} />
    <circle cx="12" cy="18" r="1" fill="currentColor" />
  </svg>
);

/**
 * Aid Icon - Used for aid requests
 * Represents assistance, help, and support services
 */
const IconAid = (props) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden {...props}>
    <circle cx="12" cy="12" r="9" {...Stroke} />
    <path d="M12 8v8M8 12h8" {...Stroke} />
  </svg>
);

/**
 * Document Check Icon - Used for damage claims
 * Represents completed forms, verified claims, and documentation
 */
const IconDocCheck = (props) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden {...props}>
    <path d="M8 3h6l4 4v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" {...Stroke} />
    <path d="M14 3v5h5" {...Stroke} />
    <path d="M8.8 15.2 11 17.4l4.2-4.2" {...Stroke} />
  </svg>
);

/**
 * Refresh Icon - Used for refresh button
 * Represents data reload and synchronization
 */
const IconRefresh = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden {...props}>
    <path d="M20 12a8 8 0 1 1-2.34-5.66" {...Stroke} />
    <path d="M20 4v6h-6" {...Stroke} />
  </svg>
);

/* ========================================
   Utility Functions
   ======================================== */

/**
 * Extracts array data from various API response formats
 * Handles different response structures from backend endpoints
 * 
 * @param {Object|Array} payload - API response data
 * @returns {Array} Extracted array data
 */
const pickArray = (payload) => {
  // If already an array, return it
  if (Array.isArray(payload)) return payload;
  
  const data = payload || {};
  
  // Check common array property names in API responses
  if (Array.isArray(data.victims)) return data.victims;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.aids)) return data.aids;
  if (Array.isArray(data.claims)) return data.claims;
  if (data.ok && Array.isArray(data.items)) return data.items;
  
  // Return empty array if no valid array found
  return [];
};

/**
 * Formats date/time values for display
 * Converts timestamps to localized string format
 * 
 * @param {string|Date} value - Date value to format
 * @returns {string} Formatted date string or "—" if invalid
 */
const fmt = (value) => {
  if (!value) return "—";
  
  try {
    return new Date(value).toLocaleString(undefined, { 
      hour12: true,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.warn('Invalid date format:', value);
    return "—";
  }
};

/* ========================================
   Main Component
   ======================================== */

/**
 * ReportsHub - Main dashboard component
 * Manages state and data fetching for all record types
 */
export default function ReportsHub() {
  // ========================================
  // State Management
  // ========================================
  
  /** Loading state for refresh operations */
  const [loading, setLoading] = useState(true);
  
  /** Array of disaster reports from victims */
  const [reportList, setReportList] = useState([]);
  
  /** Array of aid requests */
  const [aidList, setAidList] = useState([]);
  
  /** Array of damage claims */
  const [claimList, setClaimList] = useState([]);

  // ========================================
  // Data Fetching Functions
  // ========================================

  /**
   * Loads all data from backend APIs
   * Uses Promise.allSettled to handle partial failures gracefully
   * Updates all state arrays with fetched data
   */
  const load = async () => {
    try {
      setLoading(true);
      
      // Fetch data from all three endpoints simultaneously
      const [reportsRes, aidsRes, claimsRes] = await Promise.allSettled([
        axios.get("http://localhost:5000/victims"),
        axios.get("http://localhost:5000/aids"),
        axios.get("http://localhost:5000/damage"),
      ]);
      
      // Update state with successful responses, empty arrays for failures
      setReportList(reportsRes.status === "fulfilled" ? pickArray(reportsRes.value.data) : []);
      setAidList(aidsRes.status === "fulfilled" ? pickArray(aidsRes.value.data) : []);
      setClaimList(claimsRes.status === "fulfilled" ? pickArray(claimsRes.value.data) : []);
      
    } catch (error) {
      console.error('Error loading data:', error);
      // Reset to empty arrays on error
      setReportList([]);
      setAidList([]);
      setClaimList([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh data every 30 seconds to keep Last Submitted data current
  useEffect(() => {
    // Initial load
    load();
    
    // Set up auto-refresh interval
    const refreshInterval = setInterval(load, 30000);
    
    // Cleanup interval on unmount
    return () => clearInterval(refreshInterval);
  }, []);

  // ========================================
  // Effects
  // ========================================

  // ========================================
  // Utility Functions
  // ========================================

  /**
   * Finds the most recent timestamp from an array of records
   * Checks multiple possible date fields to find the latest entry
   * 
   * @param {Array} arr - Array of records to check
   * @param {Array} keys - Array of date field names to check
   * @returns {Date|null} Most recent date or null if none found
   */
  const last = (arr, keys = ["reportedAt", "occurredAt", "createdAt"]) => {
    if (!arr?.length) return null;
    
    // Extract all valid timestamps from the array
    const times = arr
      .map(record => keys.map(key => record[key]).find(Boolean))
      .filter(Boolean)
      .map(value => new Date(value).getTime());
    
    // Return the most recent date
    return times.length ? new Date(Math.max(...times)) : null;
  };

  // ========================================
  // Computed Values
  // ========================================

  /** Most recent report timestamp */
  const reportLast = last(reportList, ["createdAt", "date"]);
  
  /** Most recent aid request timestamp */
  const aidLast = last(aidList, ["createdAt"]);
  
  /** Most recent damage claim timestamp */
  const claimLast = last(claimList, ["createdAt"]);


  /**
   * Gets the location string from the most recent report of a specific type
   * @param {string} type - Record type ('victim', 'aid', 'claim')
   * @param {Array} list - Array of records for that type
   * @returns {string} Location string or "—"
   */
  const getLatestLocationByType = (type, list) => {
    if (!list?.length) return "—";
    
    // Sort by creation timestamp and get most recent
    const sortedList = [...list].sort((a, b) => {
      const aTime = new Date(a.createdAt || a.reportedAt || a.requestedAt || a.date);
      const bTime = new Date(b.createdAt || b.reportedAt || b.requestedAt || b.date);
      return bTime - aTime; // Most recent first
    });
    
    const latestRecord = sortedList[0];
    
    // Extract location based on record type
    if (type === 'victim') {
      // For victim reports, extract coordinates from GeoJSON location field
      if (latestRecord.location?.coordinates?.length === 2) {
        const [lng, lat] = latestRecord.location.coordinates;
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }
      return latestRecord.address || "—";
    } else if (type === 'aid') {
      return latestRecord.location || latestRecord.address || "—";
    } else if (type === 'claim') {
      return latestRecord.currentLocation || latestRecord.address || "—";
    }
    
    return "—";
  };

  /** Location of the most recent report for each type */
  const reportLocation = getLatestLocationByType('victim', reportList);
  const aidLocation = getLatestLocationByType('aid', aidList);
  const claimLocation = getLatestLocationByType('claim', claimList);

  // ========================================
  // Render
  // ========================================

  return (
    <>
      {/* Admin Header */}
      <AdminNav />
      
      <main className="reports-hub container light-theme">
        {/* ========================================
             Header Section
             ======================================== */}
        <header className="hub-top">
          <h1>Submitted Records</h1>
          <div className="header-actions">
            <Link 
              to="/victim/records" 
              className="btn btn--primary"
              aria-label="View detailed records and analytics"
            >
              📊 Records
            </Link>
            <button 
              className="btn btn--ghost" 
              onClick={load} 
              disabled={loading}
              aria-label={loading ? "Refreshing data" : "Refresh data"}
            >
              <IconRefresh /> 
              <span>{loading ? "Refreshing…" : "Refresh"}</span>
            </button>
          </div>
        </header>

      {/* ========================================
           Recent Requests Summary Section
           ======================================== */}
      <section className="recent" aria-labelledby="recent-heading">
        <div className="recent-head">
          <h3 id="recent-heading">Recent Requests</h3>
          <span className="live-dot" title="Live data updates" aria-label="Live data">
            Live
          </span>
        </div>
        
        {/* Summary table showing counts and last submission times */}
        <table className="recent-table" role="table">
          <thead>
            <tr>
              <th scope="col">Type</th>
              <th scope="col">Count</th>
              <th scope="col">Last submitted</th>
              <th scope="col">Location</th>
            </tr>
          </thead>
          <tbody>
            {/* Disaster Reports Row */}
            <tr>
              <td className="type">
                <span className=" type-icon type-report" aria-label="Disaster report">
                  <IconTriangleAlert />
                </span>
                Report
              </td>
              <td>
                <span className="count count-report" aria-label={`${reportList.length} reports`}>
                  {reportList.length}
                </span>
              </td>
              <td>{fmt(reportLast)}</td>
              <td className="location-cell">
                <span className="location-text" title={reportLocation}>
                  {reportLocation}
                </span>
              </td>
            </tr>
            
            {/* Aid Requests Row */}
            <tr>
              <td className="type">
                <span className="type-icon type-aid" aria-label="Aid request">
                  <IconAid />
                </span>
                Aid
              </td>
              <td>
                <span className="count count-aid" aria-label={`${aidList.length} aid requests`}>
                  {aidList.length}
                </span>
              </td>
              <td>{fmt(aidLast)}</td>
              <td className="location-cell">
                <span className="location-text" title={aidLocation}>
                  {aidLocation}
                </span>
              </td>
            </tr>
            
            {/* Damage Claims Row */}
            <tr>
              <td className="type">
                <span className="type-icon type-claim" aria-label="Damage claim">
                  <IconDocCheck />
                </span>
                Claim
              </td>
              <td>
                <span className="count count-claim" aria-label={`${claimList.length} damage claims`}>
                  {claimList.length}
                </span>
              </td>
              <td>{fmt(claimLast)}</td>
              <td className="location-cell">
                <span className="location-text" title={claimLocation}>
                  {claimLocation}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ========================================
           Action Cards Section
           ======================================== */}
      <section 
        className="cards" 
        aria-label="Record type cards"
        style={{
          display: 'grid !important',
          gridTemplateColumns: 'repeat(3, 1fr) !important',
          gap: 'var(--space-xl) !important',
          width: '100% !important'
        }}
      >
        
        {/* Disaster Reports Card */}
        <article className="card">
          <div className="card-head">
            <span className="icon-pill report" aria-label="Disaster reports">
              <IconTriangleAlert />
            </span>
            <div>
              <h4>Report Disaster</h4>
              <p>Citizen incident reports with photos & map.</p>
            </div>
            <span className="badge" aria-label={`${reportList.length} total reports`}>
              {reportList.length}
            </span>
          </div>
          <div className="meta">
            <span className="label">Last submitted</span>
            <span className="val">{fmt(reportLast)}</span>
          </div>
          <Link 
            to="/victim/read" 
            className="btn btn--primary"
            aria-label="View all disaster reports"
          >
            View Reports 
          </Link>
        </article>

        {/* Aid Requests Card */}
        <article className="card">
          <div className="card-head">
            <span className="icon-pill aid" aria-label="Aid requests">
              <IconAid />
            </span>
            <div>
              <h4>Request Aid</h4>
              <p>Requests for food, water, shelter, medical help.</p>
            </div>
            <span className="badge" aria-label={`${aidList.length} total aid requests`}>
              {aidList.length}
            </span>
          </div>
          <div className="meta">
            <span className="label">Last submitted</span>
            <span className="val">{fmt(aidLast)}</span>
          </div>
          <Link 
            to="/victim/aid/records" 
            className="btn btn--primary"
            aria-label="View all aid requests"
          >
            View Aid 
          </Link>
        </article>

        {/* Damage Claims Card */}
        <article className="card">
          <div className="card-head">
            <span className="icon-pill claim" aria-label="Damage claims">
              <IconDocCheck />
            </span>
            <div>
              <h4>Damage Claiming</h4>
              <p>Damage claims with estimated loss.</p>
            </div>
            <span className="badge" aria-label={`${claimList.length} total damage claims`}>
              {claimList.length}
            </span>
          </div>
          <div className="meta">
            <span className="label">Last submitted</span>
            <span className="val">{fmt(claimLast)}</span>
          </div>
          <Link 
            to="/victim/claim/records" 
            className="btn btn--primary"
            aria-label="View all damage claims"
          >
            View Claims 
          </Link>
        </article>
      </section>
    </main>
    </>
  );
}


