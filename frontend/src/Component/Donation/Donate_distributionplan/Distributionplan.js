// frontend/src/Component/Donation/Donate_distributionplan/Distributionplan.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom"; // Add this import
import "../../DonationDashboard/donationcss/donate_dashboard.css";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

/* small progress bar for inside the modal */
function PBar({ label, value, color }) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
        <span>{label}</span><span>{pct}%</span>
      </div>
      <div style={{ height: 10, background: "#e5e7eb", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
    </div>
  );
}

/* timeline + storage */
const TL_ORDER = ["teamAssigned","vehicleLoaded","enRoute","checkpointVerified","distributionStart","returnReport"];
const TL_LABELS = {
  teamAssigned:"Team assigned",
  vehicleLoaded:"Vehicle loaded",
  enRoute:"En route to sector 7",
  checkpointVerified:"Checkpoint verified",
  distributionStart:"Distribution start",
  returnReport:"Return & report",
};
const TL_STORAGE_KEY = "opTimeline:v1";
const readTLStore = () => {
  try {
    const raw = localStorage.getItem(TL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

/* inventory mapping */
const ITEM_OPTIONS = [
  { value:"dry_rations", label:"Dry rations", unit:"packs" },
  { value:"water",       label:"Water",       unit:"liters" },
  { value:"bedding",     label:"Bedding",     unit:"sets"   },
  { value:"medical",     label:"Medical kits",unit:"kits"   },
  { value:"clothing",    label:"Clothing",    unit:"sets"   },
  { value:"hygiene",     label:"Hygiene packs",unit:"packs" },
];
const itemMeta = Object.fromEntries(ITEM_OPTIONS.map(o => [o.value, o]));

export default function Distributionplan({ onClose }) {
  const navigate = useNavigate(); // Add this hook
  const [selfClosed, setSelfClosed] = useState(false);
  
  // Create portal element and add to DOM
  const [portalEl] = useState(() => {
    const el = document.createElement("div");
    el.id = "dp-portal";
    return el;
  });

  // Mount/unmount portal element
  useEffect(() => {
    // Add portal to DOM
    document.body.appendChild(portalEl);
    // Lock body scroll
    document.body.classList.add("dp-lock-scroll");

    // Cleanup on unmount
    return () => {
      try {
        document.body.removeChild(portalEl);
        document.body.classList.remove("dp-lock-scroll");
      } catch (e) {
        // Element might have already been removed
        console.warn("Portal cleanup error:", e);
      }
    };
  }, [portalEl]);

  const escHandlerRef = useRef(null);
  const storageHandlerRef = useRef(null);

  // Simple cleanup function - navigate to specific page
  const cleanupAndClose = useCallback(() => {
  // unlock scroll now; the component will unmount next tick
  document.body.classList.remove("dp-lock-scroll");

  // let parent hide the modal if it passed onClose
  onClose?.();

  // route to Donation page (adjust the path if your route is different)
  // setTimeout ensures unmount occurs before navigation for a smooth exit
  setTimeout(() => {
    navigate("/donation", { replace: true });
  }, 0);
}, [onClose, navigate]);

  // Add escape key handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cleanupAndClose();
      }
    };
    
    escHandlerRef.current = handleEscape;
    document.addEventListener("keydown", handleEscape);
    
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [cleanupAndClose]);

  /* ---------- data ---------- */
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [operations, setOperations] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [tick, setTick] = useState(0);
  const [dataSource, setDataSource] = useState({ inventory: 'loading', operations: 'loading', volunteers: 'loading' });

  // Create a refresh function that can be called manually
  const refreshData = useCallback(async () => {
    setLoading(true);
    setErr("");
    
    try {
      // Try to fetch from API first - prioritize inventory data for actual values
      const [opsRes, volRes, invRes] = await Promise.all([
        fetch(`${API_BASE}/api/operations`).catch(() => ({ ok: false, status: 'offline' })),
        fetch(`${API_BASE}/api/volunteer?assigned=true&limit=500`).catch(() => ({ ok: false, status: 'offline' })),
        fetch(`${API_BASE}/api/inventory`).catch(() => ({ ok: false, status: 'offline' })),
      ]);

      let ops, vols, inv;

      // Always try to get real inventory data, even if other APIs fail
      if (invRes.ok) {
        inv = await invRes.json();
        console.log("Real inventory data refreshed:", inv);
        setDataSource(prev => ({ ...prev, inventory: 'api' }));
      } else {
        console.warn("Inventory API not available, using fallback data");
        inv = { items: [
          { item: "dry_rations", quantity: 250 },
          { item: "water", quantity: 500 },
          { item: "bedding", quantity: 80 },
          { item: "medical", quantity: 45 },
          { item: "clothing", quantity: 120 },
          { item: "hygiene", quantity: 90 }
        ]};
        setDataSource(prev => ({ ...prev, inventory: 'fallback' }));
      }

      if (opsRes.ok && volRes.ok) {
        // Both operations and volunteers APIs are working
        ops = await opsRes.json();
        vols = await volRes.json();
        setDataSource(prev => ({ ...prev, operations: 'api', volunteers: 'api' }));
      } else {
        // Use fallback for operations and volunteers if needed
        if (!opsRes.ok) {
          console.warn("Operations API not available, using fallback data");
          ops = [{
            _id: "demo-op-1",
            operationName: "Emergency Relief Operation",
            status: "active",
            location: "Colombo, Sri Lanka",
            timeline: {
              teamAssigned: "done",
              vehicleLoaded: "done", 
              enRoute: "warn",
              checkpointVerified: "pending",
              distributionStart: "pending",
              returnReport: "pending"
            }
          }];
          setDataSource(prev => ({ ...prev, operations: 'fallback' }));
        } else {
          ops = await opsRes.json();
          setDataSource(prev => ({ ...prev, operations: 'api' }));
        }
        
        if (!volRes.ok) {
          console.warn("Volunteers API not available, using fallback data");
          vols = { items: [
            { _id: "vol-1", fullName: "John Smith", volunteerType: "individual", operationId: "demo-op-1" },
            { _id: "vol-2", fullName: "Sarah Johnson", volunteerType: "team", operationId: "demo-op-1" },
            { _id: "vol-3", fullName: "Mike Wilson", volunteerType: "individual", operationId: "demo-op-1" }
          ]};
          setDataSource(prev => ({ ...prev, volunteers: 'fallback' }));
        } else {
          vols = await volRes.json();
          setDataSource(prev => ({ ...prev, volunteers: 'api' }));
        }
      }

      setOperations(Array.isArray(ops) ? ops : (ops.data || ops.items || []));
      setVolunteers(Array.isArray(vols?.items) ? vols.items : (Array.isArray(vols) ? vols : []));
      setInventory(inv?.items || (Array.isArray(inv) ? inv : []));
      
    } catch (e) {
      console.warn("Error refreshing data:", e);
      setErr("Failed to refresh data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    
    const onStorage = (e) => { if (e.key === TL_STORAGE_KEY) setTick(t => t + 1); };
    storageHandlerRef.current = onStorage;
    window.addEventListener("storage", onStorage);
    return () => { window.removeEventListener("storage", onStorage); };
  }, [refreshData]);

  const activeOp = useMemo(() => {
    if (!operations?.length) return null;
    return operations.find(o => (o.status || "").toLowerCase() === "active") || operations[0];
  }, [operations]);

  const timeline = useMemo(() => {
    if (!activeOp) return [];
    const ls = readTLStore();
    const storeKey = String(activeOp?._id || activeOp?.operationName || "unknown");
    const local = ls?.[storeKey] || {};
    const src = Object.keys(local).length ? local : activeOp?.timeline || {};
    return TL_ORDER.map(k => ({ key: k, label: TL_LABELS[k], state: src[k] || "pending" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOp?._id, activeOp?.operationName, activeOp?.timeline, tick]);

  const assignedToActive = useMemo(() => {
    if (!activeOp) return [];
    const opId = String(activeOp._id || "");
    const opName = (activeOp.operationName || "").trim().toLowerCase();
    return (Array.isArray(volunteers) ? volunteers : []).filter(v => {
      const byId  = opId && String(v?.operationId || "") === opId;
      const byTxt = opName && (v?.assignedTo || "").trim().toLowerCase() === opName;
      return byId || byTxt;
    });
  }, [volunteers, activeOp]);

  const totals = useMemo(() => {
    const map = Object.fromEntries(ITEM_OPTIONS.map(o => [o.value, 0]));
    for (const it of Array.isArray(inventory) ? inventory : []) {
      const key = String(it?.item || "");
      if (key in map) map[key] += Number(it?.quantity || 0);
    }
    return map;
  }, [inventory]);

  const familiesCoverage  = Math.min(100, Math.round((totals["dry_rations"] || 0) / 10));
  const resourcesCoverage = (() => {
    const vals = Object.values(totals);
    if (!vals.length) return 0;
    return Math.round(vals.reduce((a, n) => a + (n > 0 ? 1 : 0), 0) / vals.length * 100);
  })();

  if (selfClosed) return null; // fallback path when no onClose provided

  const content = (
    <div className="distributionplan-component">
      <div
        className="dp-modal-backdrop"
        onClick={(e) => e.target === e.currentTarget && cleanupAndClose()}
        data-open="true"
      >
      <div className="dp-modal-body" onClick={(e) => e.stopPropagation()}>
        <button
          className="dp-modal-close"
          type="button"
          aria-label="Close"
          onClick={(e) => { 
            e.preventDefault(); 
            e.stopPropagation(); 
            cleanupAndClose(); 
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {loading ? (
          <div className="dp-loading">
            <div className="dp-loading-spinner" /> 
            <span>Loading distribution plan…</span>
          </div>
        ) : err ? (
          <div className="dp-error">
            <div className="dp-error-content">
              <span className="dp-error-icon">⚠</span>
              {err}
            </div>
          </div>
        ) : !activeOp ? (
          <div className="dp-empty">
            <div className="dp-empty-icon">📋</div>
            <h3 className="dp-empty-title">No operations</h3>
            <p className="dp-empty-subtitle">Create an operation to view the distribution plan.</p>
          </div>
        ) : (
          <section className="dp-panel">
            <div className="dp-header">
              <div className="dp-title-section">
                <h1 className="dp-title">Distribution Plan</h1>
                <p className="dp-subtitle">
                  {activeOp.operationName} • Status:{" "}
                  <span className={`dp-status-badge dp-status-${(activeOp.status || "pending").toLowerCase()}`}>
                    {activeOp.status || "Pending"}
                  </span>
                </p>
              </div>
            </div>

            {/* Timeline + Map */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(340px,420px) 1fr", gap: 20, marginBottom: 24 }}>
              <div className="dp-timeline-card">
                <div className="dp-timeline-head">
                  <div>
                    <div className="dp-timeline-title">Timeline</div>
                    <div className="dp-timeline-sub">
                      Active operation: <span className="dp-timeline-op">{activeOp.operationName}</span>
                    </div>
                  </div>
                </div>
                <div className="dp-timeline-list">
                  {timeline.map((s, idx) => (
                    <div key={s.key} className="dp-timeline-step">
                      <span className={`dp-timeline-dot ${s.state === "done" ? "dp-dot-done" : s.state === "warn" ? "dp-dot-warn" : "dp-dot-pending"}`} />
                      {idx < timeline.length - 1 && <div className="dp-timeline-line" />}
                      <div className="dp-timeline-label">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dp-timeline-card" style={{ height: "100%" }}>
                <div className="dp-timeline-head">
                  <div>
                    <div className="dp-timeline-title">Distribution area Map</div>
                    <div className="dp-timeline-sub">
                      Location: <span className="dp-timeline-op">{activeOp.location || "—"}</span>
                    </div>
                  </div>
                </div>
                {activeOp.location ? (
                  <div style={{ borderRadius: 12, overflow: "hidden" }}>
                    <iframe
                      title="map"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(activeOp.location)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                      style={{ width: "100%", height: 300, border: 0 }}
                      loading="lazy"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="dp-empty-panel">No location set for this operation.</div>
                )}
              </div>
            </div>

            {/* KPIs + Team */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(320px, 420px)", gap: 20 }}>
              <div className="dp-timeline-card">
                <div className="dp-timeline-head">
                  <div>
                    <div className="dp-timeline-title">Emergency resources available</div>
                    <div className="dp-timeline-sub">
                      Live from inventory
                      {dataSource.inventory === 'api' && (
                        <span style={{ color: '#22c55e', marginLeft: '8px', fontSize: '11px' }}>
                          ✓ Live Data
                        </span>
                      )}
                      {dataSource.inventory === 'fallback' && (
                        <span style={{ color: '#f59e0b', marginLeft: '8px', fontSize: '11px' }}>
                          ⚠ Demo Data
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={refreshData}
                    disabled={loading}
                    style={{
                      background: loading ? '#f3f4f6' : 'none',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      color: loading ? '#9ca3af' : '#6b7280',
                      opacity: loading ? 0.6 : 1
                    }}
                    title="Refresh data"
                  >
                    {loading ? '⏳' : '🔄'} Refresh
                  </button>
                </div>

                <div className="dp-kpi-grid">
                  {["medical","clothing","water","dry_rations"].map(v => {
                    const k = { ...itemMeta[v], have: totals[v] || 0 };
                    return (
                      <div key={k.value} className="dp-kpi">
                        <div className="dp-kpi-emoji">📦</div>
                        <div>
                          <div className="dp-num">{Number(k.have).toLocaleString()}</div>
                          <div className="dp-muted dp-small">{k.label}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 16, overflowX: "auto" }}>
                  <table className="dp-inv-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Have</th>
                        <th>Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ITEM_OPTIONS.map(meta => (
                        <tr key={meta.value}>
                          <td>{meta.label}</td>
                          <td>{totals[meta.value] || 0}</td>
                          <td>{meta.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="dp-vm-timeline-card">
                <div className="dp-vm-timeline-head">
                  <div>
                    <div className="dp-vm-timeline-title">Team</div>
                    <div className="dp-vm-timeline-sub">
                      Active operation: <span className="dp-vm-timeline-op">{activeOp.operationName}</span>
                    </div>
                  </div>
                </div>

                <div className="dp-vm-volunteer-list-container">
                  {assignedToActive.length === 0 ? (
                    <div className="dp-vm-volunteer-empty-state">
                      <div className="dp-vm-empty-icon">👥</div>
                      <h4>No volunteers assigned</h4>
                      <p>This operation doesn't have any assigned volunteers yet.</p>
                    </div>
                  ) : (
                    <>
                      <div className="dp-vm-volunteer-count-display">
                        {assignedToActive.length} VOLUNTEER{assignedToActive.length > 1 ? "S" : ""} ASSIGNED
                      </div>
                      <div className="dp-vm-volunteer-names-list">
                        {assignedToActive.map((v, i) => {
                          const name = v?.fullName || "—";
                          const type = v?.volunteerType || "individual";
                          return (
                            <div key={v?._id || i} className="dp-vm-volunteer-name-item">
                              <div className="dp-vm-volunteer-name-avatar">{name.charAt(0)}</div>
                              <div className="dp-vm-volunteer-name-details">
                                <div className="dp-vm-volunteer-name-text">{name}</div>
                                <div className="dp-vm-volunteer-name-type">{type === "team" ? "Team Lead" : "Individual"}</div>
                              </div>
                              <div className="dp-vm-volunteer-status-dot"></div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
    </div>
  );

  return createPortal(content, portalEl);
}