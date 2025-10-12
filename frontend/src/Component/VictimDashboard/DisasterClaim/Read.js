// Import React hooks and dependencies
import React, { useEffect, useMemo, useState } from "react";
import axios from "../../../api/axios";
import { useNavigate } from "react-router-dom";
import AdminNav from "../../../Components/NavBar/adminNav";
import "./DS_Read.css";

// API endpoints configuration
const API = {
  list: "/damage",
  del: (id) => `/damage/${id}`,
};

// localStorage key for tracking reviewed claims
const REVIEWED_KEY = "damage_reviewed_ids_v1";

// Get claim status from localStorage
function getClaimStatus(claimId) {
  try {
    const claimStatuses = JSON.parse(localStorage.getItem('claimStatuses') || '{}');
    return claimStatuses[claimId] || null;
  } catch (error) {
    console.warn("Error reading claim statuses:", error);
    return null;
  }
}

// Get status display information
function getStatusInfo(claim, reviewed) {
  // Prioritize database status over localStorage
  if (claim.actionType || (claim.actionStatus && claim.actionStatus !== 'pending')) {
    // Use actionType for display if available, otherwise map actionStatus
    const displayText = claim.actionType || getStatusDisplayText(claim.actionStatus);
    const statusForClass = claim.actionType || claim.actionStatus;
    
    return {
      status: claim.actionStatus || 'under_review',
      text: displayText,
      class: getStatusClass(statusForClass),
      details: {
        status: claim.actionType || claim.actionStatus,
        actionDate: claim.actionDate,
        priority: 'medium', // default priority
        compensationAmount: claim.financialAmount,
        description: claim.actionNotes,
        financialRecommendation: claim.financialNotes,
        notes: claim.actionNotes
      },
      hasAction: true,
      source: 'database'
    };
  }
  
  // Fallback to localStorage
  const claimStatus = getClaimStatus(claim._id);
  if (claimStatus) {
    return {
      status: claimStatus.status,
      text: claimStatus.status,
      class: getStatusClass(claimStatus.status),
      details: claimStatus,
      hasAction: true,
      source: 'localStorage'
    };
  }
  
  return {
    status: reviewed ? 'reviewed' : 'pending',
    text: reviewed ? "Action Taken" : "Pending Review",
    class: reviewed ? 'reviewed' : 'pending',
    details: null,
    hasAction: false,
    source: 'default'
  };
}

// Get display text for status
function getStatusDisplayText(status) {
  const statusMap = {
    'pending': 'Pending Review',
    'under_review': 'Under Review',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'completed': 'Completed'
  };
  return statusMap[status] || status;
}

// Get CSS class for status
function getStatusClass(status) {
  if (!status) return 'pending';
  
  const statusLower = status.toLowerCase();
  
  // Handle specific action types
  if (statusLower === 'approved' || statusLower === 'approve claim' || statusLower === 'compensation approved') return 'approved';
  if (statusLower === 'rejected' || statusLower === 'reject claim') return 'rejected';
  if (statusLower === 'under investigation') return 'investigation';
  if (statusLower === 'requires documentation' || statusLower.includes('documentation')) return 'documentation';
  if (statusLower === 'assessment scheduled' || statusLower.includes('assessment')) return 'assessment';
  
  // Handle database status values
  if (statusLower === 'pending') return 'pending';
  if (statusLower === 'under_review') return 'investigation';
  if (statusLower === 'completed') return 'approved';
  
  // Handle legacy localStorage status values
  if (statusLower.includes('approved')) return 'approved';
  if (statusLower.includes('rejected')) return 'rejected';
  if (statusLower.includes('investigation')) return 'investigation';
  
  return 'reviewed';
}

// Utility function to format dates
const fmt = (d) =>
  d ? new Date(d).toLocaleString(undefined, { hour12: true }) : "—";

// Component to display map preview using Google Maps
function MapPreview({ location }) {
  if (!location) return <div className="map-placeholder">—</div>;
  
  // Parse latitude and longitude from location string
  const parts = String(location).split(",");
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  
  // Render embedded Google Maps if coordinates are valid
  if (!isNaN(lat) && !isNaN(lng)) {
    return (
      <iframe
        title={`map-${lat}-${lng}`}
        src={`https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
        width="200"
        height="140"
        style={{ borderRadius: 8, border: "none" }}
        loading="lazy"
      />
    );
  }
  
  // Fallback to showing location text if coordinates are invalid
  return <div className="map-placeholder">{location}</div>;
}

// Component to display various types of file attachments
function AttachmentGallery({ attachments }) {
  if (!attachments || attachments.length === 0) {
    return <div className="no-attachments">No attachments</div>;
  }

  return (
    <>
      <div className="attachment-gallery">
        {attachments.map((attachment, index) => {
          // Build attachment URL from either direct URL or filename
          const attachmentUrl = attachment.url || 
            (attachment.filename ? `/uploads/damage/${encodeURIComponent(attachment.filename)}` : null);
          
          if (!attachmentUrl) return null;

          // Determine file type based on extension
          const isImage = /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(attachment.filename || attachment.url || '');
          const isVideo = /\.(mp4|avi|mov|wmv|flv|webm)$/i.test(attachment.filename || attachment.url || '');
          const isDocx = /\.docx$/i.test(attachment.filename || attachment.url || '');
          const isPdf = /\.pdf$/i.test(attachment.filename || attachment.url || '');
          const isOtherDoc = /\.(doc|txt)$/i.test(attachment.filename || attachment.url || '');

          return (
            <div key={index} className="attachment-item">
              {/* Render different attachment types based on file extension */}
              {isImage ? (
                // Image attachments - display as clickable thumbnails
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="attachment-link"
                >
                  <img
                    src={attachmentUrl}
                    alt={`Attachment ${index + 1}`}
                    className="attachment-thumb"
                  />
                </a>
              ) : isVideo ? (
                // Video attachments - display with video player controls
                <div className="video-container">
                  <video
                    className="video-player"
                    controls
                    preload="metadata"
                    poster={attachmentUrl} // Use video URL as poster for now
                  >
                    <source src={attachmentUrl} type="video/mp4" />
                    <source src={attachmentUrl} type="video/webm" />
                    <source src={attachmentUrl} type="video/ogg" />
                    Your browser does not support the video tag.
                  </video>
                  <div className="video-info">
                    <span className="video-filename">{attachment.filename || `Video ${index + 1}`}</span>
                  </div>
                </div>
              ) : isDocx ? (
                // DOCX files - display with document icon
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="attachment-link"
                >
                  <div className="attachment-thumb docx-thumb">
                    <div className="docx-icon">📄</div>
                    <span className="file-name">{attachment.filename || `Document ${index + 1}`}</span>
                  </div>
                </a>
              ) : isPdf ? (
                // PDF files - display with PDF icon
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="attachment-link"
                >
                  <div className="attachment-thumb pdf-thumb">
                    <div className="pdf-icon">📕</div>
                    <span className="file-name">{attachment.filename || `PDF ${index + 1}`}</span>
                  </div>
                </a>
              ) : isOtherDoc ? (
                // Other document types (DOC, TXT) - display with document icon
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="attachment-link"
                >
                  <div className="attachment-thumb doc-thumb">
                    <div className="doc-icon">📄</div>
                    <span className="file-name">{attachment.filename || `Document ${index + 1}`}</span>
                  </div>
                </a>
              ) : (
                // Generic file types - display with file icon
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="attachment-link"
                >
                  <div className="attachment-thumb file-thumb">
                    <div className="file-icon">📎</div>
                    <span className="file-name">{attachment.filename || `File ${index + 1}`}</span>
                  </div>
                </a>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// Utility functions for managing reviewed claim IDs in localStorage

// Read reviewed claim IDs from localStorage
function readReviewedIds() {
  try {
    const raw = localStorage.getItem(REVIEWED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    console.warn("readReviewedIds error", e);
    return new Set();
  }
}

// Write reviewed claim IDs to localStorage
function writeReviewedIds(setOrArray) {
  try {
    const arr = Array.isArray(setOrArray) ? setOrArray : Array.from(setOrArray);
    localStorage.setItem(REVIEWED_KEY, JSON.stringify(arr));
  } catch (e) {
    console.warn("writeReviewedIds error", e);
  }
}

// Main component for displaying and managing disaster claims
export default function ReadClaim() {
  const navigate = useNavigate();
  
  // State management
  const [rows, setRows] = useState([]); // Array of claim records
  const [q, setQ] = useState(""); // Search query
  const [loading, setLoading] = useState(true); // Loading state
  const [deleting, setDeleting] = useState(null); // ID of claim being deleted
  const [taking, setTaking] = useState(null); // ID of claim action being taken
  const [reviewedIds, setReviewedIds] = useState(() => readReviewedIds()); // Set of reviewed claim IDs

  // Function to load claims data from the API
  const load = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API.list);
      
      // Handle different response data structures
      const data =
        Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.items)
          ? res.data.items
          : Array.isArray(res.data?.damages)
          ? res.data.damages
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];

      // Merge server's reviewed flag with localStorage-reviewed IDs and claim statuses
      const claimStatuses = JSON.parse(localStorage.getItem('claimStatuses') || '{}');
      const merged = data.map((d) => ({
        ...d,
        reviewed: !!d.reviewed || reviewedIds.has(String(d._id)) || !!claimStatuses[d._id],
      }));
      setRows(merged);
    } catch (e) {
      console.error(e);
      alert("Failed to load claims");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    // Load reviewed IDs from localStorage once
    setReviewedIds(readReviewedIds());
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep rows in sync if reviewedIds changes (e.g. from other tab)
  useEffect(() => {
    setRows((rs) => rs.map(r => ({ ...r, reviewed: !!r.reviewed || reviewedIds.has(String(r._id)) })));
  }, [reviewedIds]);

  // Filter claims based on search query
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    
    // Search across multiple fields
    return rows.filter((r) =>
      [
        r.name,
        r.nic,
        r.phone,
        r.email,
        r.address,
        r.postalCode,
        r.damageType,
        r.description,
        r.currentLocation,
        r.status,
        r.estimatedLoss ? `LKR ${Number(r.estimatedLoss).toLocaleString()}` : null,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [rows, q]);

  // Function to delete a claim
  const onDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this claim?")) return;
    
    try {
      setDeleting(id);
      await axios.delete(API.del(id));
      setRows((rs) => rs.filter((r) => r._id !== id));

      // Remove from localStorage-reviewed set if present
      const s = readReviewedIds();
      if (s.has(String(id))) {
        s.delete(String(id));
        writeReviewedIds(s);
        setReviewedIds(new Set(s));
      }
    } catch (e) {
      console.error(e);
      alert("Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  // Function to redirect to Take Action page
  const onActionTaken = (id) => {
    if (!id) return;
    
    const claim = rows.find(r => r._id === id);
    if (!claim) return;
    
    // Show alert first
    const userConfirmed = window.confirm("Get Actions");
    
    if (userConfirmed) {
      // Mark the claim as reviewed (action taken) permanently
      const updatedRows = rows.map(r => 
        r._id === id ? { ...r, reviewed: true } : r
      );
      setRows(updatedRows);
      
      // Update localStorage to persist the reviewed status
      const s = readReviewedIds();
      s.add(String(id));
      writeReviewedIds(s);
      setReviewedIds(new Set(s));
      
      // Store claim data in localStorage for the action page
      localStorage.setItem('selectedClaim', JSON.stringify(claim));
      
      // Navigate to the take action page
      navigate(`/victim/claim/action/${id}`);
    }
  };

  return (
    <>
      {/* Admin Header */}
      <AdminNav />
      
      <main className="claim-page">
        {/* Page header with title and controls */}
        <header className="claim-header">
          <h1>Submitted Reports</h1>
          <div className="header-right">
            <button
              className="btn btn--back"
              onClick={() => navigate("/victim/reports")}
            >
              Back
            </button>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="search-inp"
          />
          <div className="count-pill">{rows.length} total</div>
          <button
            className="btn btn--ghost"
            onClick={load}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {/* Main data table */}
      <div className="table-wrapper">
        <table className="claim-table">
          <thead>
            <tr>
              <th>Personal Details</th>
              <th>Contact Information</th>
              <th>Damage Details</th>
              <th>Location & Timing</th>
              <th>Map Preview</th>
              <th>All Attachments</th>
              <th>Status & Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Render each claim as a table row */}
            {filtered.map((r) => (
              <tr key={r._id} className={r.reviewed ? "row-reviewed" : ""}>
                {/* Personal Details Column */}
                <td className="details-column">
                  <div className="detail-group">
                    <div className="detail-item">
                      <span className="detail-label">Name:</span>
                      <span className="detail-value">{r.name || "—"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">NIC:</span>
                      <span className="detail-value">{r.nic || "—"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Address:</span>
                      <span className="detail-value">{r.address || "—"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Postal Code:</span>
                      <span className="detail-value">{r.postalCode || "—"}</span>
                    </div>
                  </div>
                </td>

                {/* Contact Information Column */}
                <td className="details-column">
                  <div className="detail-group">
                    <div className="detail-item">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{r.email || "—"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{r.phone || "—"}</span>
                    </div>
                  </div>
                </td>

                {/* Damage Details Column */}
                <td className="details-column">
                  <div className="detail-group">
                    <div className="detail-item">
                      <span className="detail-label">Damage Type:</span>
                      <span className="detail-value">{r.damageType || "—"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Estimated Loss:</span>
                      <span className="detail-value loss-amount">
                        {r.estimatedLoss !== undefined && r.estimatedLoss !== null 
                          ? `LKR ${Number(r.estimatedLoss).toLocaleString()}` 
                          : "—"}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Description:</span>
                      <span className="detail-value description-text">{r.description || "—"}</span>
                    </div>
                  </div>
                </td>

                {/* Location & Timing Column */}
                <td className="details-column">
                  <div className="detail-group">
                    <div className="detail-item">
                      <span className="detail-label">Location:</span>
                      <span className="detail-value location-text">{r.currentLocation || "—"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Occurred At:</span>
                      <span className="detail-value">{fmt(r.occurredAt)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Reported At:</span>
                      <span className="detail-value">{fmt(r.reportedAt || r.createdAt)}</span>
                    </div>
                  </div>
                </td>

                {/* Map Preview Column */}
                <td className="map-column">
                  <MapPreview location={r.currentLocation} />
                </td>

                {/* All Attachments Column */}
                <td className="attachments-column">
                  <AttachmentGallery attachments={r.attachments} />
                </td>

                {/* Status & Actions Column */}
                <td className="actions-column">
                  <div className="action-group">
                    <div className="status-indicator">
                      {(() => {
                        const statusInfo = getStatusInfo(r, r.reviewed);
                        return (
                          <>
                            <span className={`status-dot ${statusInfo.class}`}></span>
                            <span className="status-text">
                              {statusInfo.text}
                            </span>
                            {statusInfo.hasAction && statusInfo.details && (
                              <div className="status-details">
                                {statusInfo.details.priority && (
                                  <span className={`priority-badge priority-${statusInfo.details.priority}`}>
                                    {statusInfo.details.priority.toUpperCase()}
                                  </span>
                                )}
                                {statusInfo.details.compensationAmount && (
                                  <span className="compensation-amount">
                                    💰 {statusInfo.details.compensationAmount}
                                  </span>
                                )}
                                <span className="action-date">
                                  {new Date(statusInfo.details.actionDate).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <div className="action-buttons">
                      {/* Show Take Action button only for unreviewed claims */}
                      {!r.reviewed && (
                        <button
                          className="btn btn--action"
                          onClick={() => onActionTaken(r._id)}
                          disabled={taking === r._id}
                        >
                          {taking === r._id ? "Processing…" : "Take Action"}
                        </button>
                      )}
                      {/* Delete button for all claims */}
                      <button
                        className="btn btn--danger"
                        onClick={() => onDelete(r._id)}
                        disabled={deleting === r._id}
                      >
                        {deleting === r._id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state message when no records found */}
      {filtered.length === 0 && !loading && (
        <div className="empty">No records</div>
      )}
    </main>
    </>
  );
}
