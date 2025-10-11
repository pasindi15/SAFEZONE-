import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AdminNav from "../../../Components/NavBar/adminNav";
import "./RA_Read.css";

/* ---- API Endpoints Configuration ---- */
const API = {
  list: "http://localhost:5000/aids",        // Get all aid requests
  del: (id) => `http://localhost:5000/aid/${id}`, // Delete specific aid request
};

/* ---- Local Storage Helper Functions ---- */
// Key for storing reviewed aid request IDs in browser localStorage
const STORE_KEY = "aidReviewedIds";

// Load reviewed IDs from localStorage and return as a Set
const loadReviewed = () => {
  try { return new Set(JSON.parse(localStorage.getItem(STORE_KEY) || "[]")); }
  catch { return new Set(); } // Return empty set if localStorage fails
};

// Save reviewed IDs to localStorage
const saveReviewed = (set) => {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(Array.from(set))); }
  catch {} // Silently fail if localStorage is not available
};

/* ---- Date Formatting Utility ---- */
// Format date string to readable format with 12-hour time
const fmt = (d) => d ? new Date(d).toLocaleString(undefined, { hour12: true }) : "—";

/* ---- Map Preview Component ---- */
// Displays a Google Maps iframe for GPS coordinates or shows text for manual locations
function MapPreview({ location }) {
  if (!location) return <span>—</span>; // No location provided
  
  // Try to parse location as GPS coordinates (lat, lng)
  const [lat, lng] = location.split(",").map(Number);
  
  // If valid coordinates, show embedded Google Maps
  if (!isNaN(lat) && !isNaN(lng)) {
    return (
      <iframe
        title={`map-${lat}-${lng}`}
        src={`https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
        width="220"
        height="150"
        style={{ borderRadius: "8px", border: "1px solid #e5e9f1" }}
        allowFullScreen
      />
    );
  }
  
  // If not coordinates, show as text (manual location entry)
  return <span>{location}</span>;
}

export default function ReadAid({ hideActions, hideReview, hideDelete, showFulfill, onFulfill }) {
  /* ---- Component State Management ---- */
  const [rows, setRows] = useState([]);        // Array of aid request data
  const [q, setQ] = useState("");              // Search query string
  const [loading, setLoading] = useState(true); // Loading state for API calls
  const navigate = useNavigate();              // React Router navigation hook

  /* ---- Data Loading Function ---- */
  // Fetches aid requests from API and marks reviewed ones
  const load = async () => {
    try {
      setLoading(true); // Show loading state
      
      // Fetch aid requests from backend API
      const res = await axios.get(API.list);
      
      // Handle different possible response structures
      const data = Array.isArray(res.data) ? res.data
        : Array.isArray(res.data?.items) ? res.data.items
        : Array.isArray(res.data?.aids) ? res.data.aids
        : Array.isArray(res.data?.data) ? res.data.data
        : []; // Default to empty array if no valid data structure
      
      // Load previously reviewed IDs from localStorage
      const reviewedIds = loadReviewed();
      
      // Mark reviewed requests and update state
      setRows(data.map(d => reviewedIds.has(d._id) ? { ...d, reviewed: true } : d));
    } catch (e) {
      console.error(e); // Log error for debugging
      alert("Failed to load aid requests"); // Show user-friendly error
    } finally {
      setLoading(false); // Always clear loading state
    }
  };

  // Load data when component mounts
  useEffect(() => { load(); }, []);

  /* ---- Search Filtering Logic ---- */
  // Filter aid requests based on search query
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase(); // Clean search term
    
    // If no search term, return all rows
    if (!term) return rows;
    
    // Filter rows based on search term matching any field
    return rows.filter((r) =>
      [
        r.name, r.phone, r.nic, r.email, r.address,
        r.location, r.aidType, r.urgency, r.description,
      ].filter(Boolean).some((v) => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]); // Re-run when rows or search query changes

  /* ---- Delete Aid Request Handler ---- */
  // Deletes an aid request from both API and local state
  const onDelete = async (id) => {
    // Confirm deletion with user
    if (!id || !window.confirm("Delete this aid request?")) return;
    
    try {
      // Delete from backend API
      await axios.delete(API.del(id));
      
      // Remove from localStorage reviewed list
      const set = loadReviewed();
      set.delete(id);
      saveReviewed(set);
      
      // Remove from local state
      setRows((rs) => rs.filter((r) => r._id !== id));
    } catch (e) {
      console.error(e); // Log error for debugging
      alert("Delete failed"); // Show user-friendly error
    }
  };

  /* ---- Mark as Reviewed Handler ---- */
  // Marks an aid request as reviewed and saves to localStorage
  const onReview = (id) => {
    if (!id) return; // Safety check
    
    alert("Action taken"); // Show confirmation to user
    
    // Update local state to mark as reviewed
    setRows((rs) => rs.map((r) => (r._id === id ? { ...r, reviewed: true } : r)));
    
    // Save to localStorage for persistence
    const set = loadReviewed();
    set.add(id);
    saveReviewed(set);
  };

  return (
    <>
      {/* Admin Header */}
      <AdminNav />
      
      <main className="ra-page">
        {/* Page Header with Title and Controls */}
        <header className="ra-header">
          <h2>Aid Requests</h2>
          <div className="ra-toolbar">
            {/* Search Input Field */}
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, phone, NIC, email, location…"
              className="ra-search"
              disabled={loading}
            />
          {/* Back Navigation Button */}
          {!hideActions && (
            <button className="ra-btn ra-btn--ghost ra-btn--back" onClick={() => navigate("/victim/reports")}>
              Back
            </button>
          )}
        </div>
      </header>

      {/* Data Table Container */}
      <div className="ra-table-wrap">
        <table className="ra-table">
          {/* Table Header */}
          <thead>
            <tr>
              <th>#</th>
              <th>Name / Phone</th>
              <th>NIC / Email</th>
              <th>Address</th>
              <th>Location</th>
              <th>Type</th>
              <th>Urgency</th>
              <th>Submitted</th>
              <th>Details</th>
              <th>Actions</th>
            </tr>
          </thead>
          {/* Table Body */}
          <tbody>
            {/* Empty State Message */}
            {filtered.length === 0 && !loading && (
              <tr><td colSpan="10" className="muted">No records</td></tr>
            )}
            {/* Render Each Aid Request Row */}
            {filtered.map((r, i) => (
              <tr key={r._id || i} className={r.reviewed ? "ra-reviewed" : ""}>
                {/* Row Number */}
                <td>{i + 1}</td>
                {/* Name and Phone */}
                <td>
                  <div className="td-main">{r.name || "—"}</div>
                  <div className="td-sub">{r.phone || "—"}</div>
                </td>
                {/* NIC and Email */}
                <td>
                  <div className="td-sub">{r.nic || "—"}</div>
                  <div className="td-sub">{r.email || "—"}</div>
                </td>
                {/* Address */}
                <td className="td-mono">{r.address || "—"}</td>
                {/* Location with Map Preview */}
                <td><MapPreview location={r.location} /></td>
                {/* Aid Type Badge */}
                <td><span className="ra-badge">{r.aidType || "—"}</span></td>
                {/* Urgency Level with Color Coding */}
                <td>
                  <span className={`ra-pill ra-pill--${(r.urgency || "normal").toLowerCase()}`}>
                    {r.urgency || "Normal"}
                  </span>
                </td>
                {/* Submission Date */}
                <td className="td-mono">{fmt(r.createdAt || r.submittedAt)}</td>
                {/* Additional Details */}
                <td className="td-sub">{r.description || "—"}</td>
                {/* Action Buttons */}
                <td className="ra-td-actions">
                  {/* Fulfill Button */}
                  {showFulfill && (
                    <button
                      className="ra-btn ra-btn--primary"
                      onClick={() => (typeof onFulfill === 'function' ? onFulfill(r) : null)}
                    >
                      Fulfill
                    </button>
                  )}
                  {/* Review Button */}
                  {!hideReview && (
                    <button
                      className="ra-btn ra-btn--success"
                      onClick={() => onReview(r._id)}
                      disabled={r.reviewed}
                    >
                      {r.reviewed ? "Reviewed" : "Review"}
                    </button>
                  )}
                  {/* Delete Button */}
                  {!hideActions && !hideDelete && (
                    <button className="ra-btn ra-btn--danger" onClick={() => onDelete(r._id)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
    </>
  );
}



