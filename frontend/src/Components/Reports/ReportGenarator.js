import React, { useState, useCallback } from "react";
import api from "../../api/axios";
import "./ReportGenarator.css";

const districts = [
  "all","Colombo","Gampaha","Kalutara","Kandy","Galle",
  "Matara","Hambantota","Jaffna","Kurunegala"
];

const isoLocal = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const addDaysLocal = (d, days) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};
const TODAY = isoLocal(new Date());
const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

/* ---------- deep scan helpers ---------- */
const keyLooksSeverity = (k) =>
  /(^|[_\-\s]|)(sev|servaty|serverty|severity|risk[_\-\s]*level|alert[_\-\s]*level|level|danger|priority|status|type)(\b|$)/i.test(
    k
  );

const findByKeyDeep = (root, maxDepth = 6) => {
  if (!root || typeof root !== "object") return undefined;
  const q = [root];
  const seen = new Set([root]);
  let depth = 0;
  while (q.length && depth <= maxDepth) {
    const next = [];
    for (const node of q) {
      if (Array.isArray(node)) {
        for (const v of node) if (v && typeof v === "object" && !seen.has(v)) { seen.add(v); next.push(v); }
      } else {
        for (const [k, v] of Object.entries(node)) {
          if (keyLooksSeverity(k) && v !== undefined && v !== null && String(v).trim() !== "") return v;
          if (v && typeof v === "object" && !seen.has(v)) { seen.add(v); next.push(v); }
        }
      }
    }
    depth += 1;
    q.splice(0, q.length, ...next);
  }
  return undefined;
};

const findByValueDeep = (root, maxDepth = 6) => {
  if (!root || typeof root !== "object") return undefined;
  const q = [root];
  const seen = new Set([root]);
  let depth = 0;
  while (q.length && depth <= maxDepth) {
    const next = [];
    for (const node of q) {
      if (Array.isArray(node)) {
        for (const v of node) {
          if (v !== null && v !== undefined) {
            if (typeof v !== "object") {
              const s = String(v).trim().toLowerCase();
              if (/^(red|green|critical|severe|danger|ok|safe|high|low|true|false|0|1)$/.test(s)) return v;
            } else if (!seen.has(v)) { seen.add(v); next.push(v); }
          }
        }
      } else {
        for (const [, v] of Object.entries(node)) {
          if (v !== null && v !== undefined) {
            if (typeof v !== "object") {
              const s = String(v).trim().toLowerCase();
              if (/^(red|green|critical|severe|danger|ok|safe|high|low|true|false|0|1)$/.test(s)) return v;
            } else if (!seen.has(v)) { seen.add(v); next.push(v); }
          }
        }
      }
    }
    depth += 1;
    q.splice(0, q.length, ...next);
  }
  return undefined;
};

/* ---------- field readers ---------- */
const normalizeSeverity = (item) => {
  let v = findByKeyDeep(item);
  if (v === undefined) v = findByValueDeep(item);

  if (v && typeof v === "object") {
    const pick = (o, ks) => { for (const k of ks) if (o?.[k] !== undefined && o[k] !== null) return o[k]; };
    v = pick(v, ["value","level","name","label","text","color","code","status","state"]) ?? JSON.stringify(v);
  }
  if (v === undefined) return { text: "—", cls: "sev-unknown" };

  let raw = String(v).trim();
  if (/^\d+$/.test(raw)) raw = Number(raw) >= 1 ? "red" : "green";
  else if (/^(true|false)$/i.test(raw)) raw = raw.toLowerCase() === "true" ? "red" : "green";

  const s = raw.toLowerCase();
  const greenSyn = ["green","ok","safe","normal","low","minor","good","ready"];
  const redSyn   = ["red","danger","critical","high","major","alert","severe","bad","warning"];

  if (greenSyn.includes(s)) return { text: "Green", cls: "sev-green" };
  if (redSyn.includes(s))   return { text: "Red",   cls: "sev-red" };
  return { text: raw, cls: `sev-${s.replace(/\s+/g,"-")}` };
};

const getFirstValue = (obj, keys) => {
  if (!obj || typeof obj !== "object") return undefined;
  const map = new Map(Object.keys(obj).map(k => [k.toLowerCase(), k]));
  for (const want of keys) {
    const k = map.get(want.toLowerCase());
    if (k !== undefined) {
      const v = obj[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") {
      const r = getFirstValue(v, keys);
      if (r !== undefined) return r;
    }
  }
  return undefined;
};

const getDateTime = (item) =>
  getFirstValue(item, [
    "createdAt","created_at","date","timestamp","time","updatedAt","updated_at","dateTime","datetime","alert_time"
  ]) || null;

const getDistrict = (item) =>
  getFirstValue(item, ["district","districtName","district_name","area","region","location","city"]) || "—";

const getTitle = (item) =>
  getFirstValue(item, ["title","headline","summary","description","topic","name","subject","message","text"]) || "—";

/* ---------- component ---------- */
export default function AlertReport() {
  const [from, setFrom] = useState(isoLocal(addDaysLocal(new Date(), -7)));
  const [to,   setTo]   = useState(TODAY);
  const [severity, setSeverity] = useState("all");
  const [district, setDistrict] = useState("all");
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState("");
  const [items, setItems]       = useState([]);
  const [totals, setTotals]     = useState({ total: 0, red: 0, green: 0 });

  const load = useCallback(async () => {
    let safeTo = to > TODAY ? TODAY : to;
    let safeFrom = from > safeTo ? safeTo : from;
    if (safeFrom > safeTo) { setErr("'From' date cannot be after 'To' date."); return; }
    setFrom(safeFrom);
    setTo(safeTo);
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/alerts/report", {
        params: { from: safeFrom, to: safeTo, severity, district },
        validateStatus: () => true,
        withCredentials: true,
      });
      if (res.data?.ok) {
        setItems(res.data.items || []);
        setTotals({
          total: res.data.total || 0,
          red:   res.data.red   || 0,
          green: res.data.green || 0,
        });
      } else {
        setErr(res.data?.message || "Failed to load");
      }
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [from, to, severity, district]);

  const downloadPdf = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const safeTo = to > TODAY ? TODAY : to;
    const safeFrom = from > safeTo ? safeTo : from;
    const qs = new URLSearchParams({ from: safeFrom, to: safeTo, severity, district }).toString();
    window.open(`${API}/alerts/report/pdf?${qs}`, "_blank", "noopener");
  };

  return (
    <div className="rg-page">
      <div className="rg-card">
        <div className="rg-header">
          <h2>Alert Report</h2>
          <div className="rg-sub">Range: {from} – {to}</div>
        </div>

        <form className="rg-filters" onSubmit={(e) => { e.preventDefault(); load(); }}>
          <div className="rg-row">
            <label>From
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => {
                  let f = e.target.value;
                  if (f > to) f = to;
                  if (f > TODAY) f = TODAY;
                  setFrom(f);
                }}
              />
            </label>
            <label>To
              <input
                type="date"
                value={to}
                min={from}
                max={TODAY}
                onChange={(e) => {
                  let t = e.target.value;
                  if (t > TODAY) t = TODAY;
                  if (t < from)  t = from;
                  setTo(t);
                }}
              />
            </label>
            <label>Severity
              <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="all">All</option>
                <option value="green">Green</option>
                <option value="red">Red</option>
              </select>
            </label>
            <label>District
              <select value={district} onChange={(e) => setDistrict(e.target.value)}>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <button className="rg-btn" disabled={loading}>{loading ? "Loading…" : "Apply"}</button>
            <button type="button" className="rg-btn" onClick={downloadPdf} disabled={loading || items.length === 0}>
              Download PDF
            </button>
          </div>
        </form>

        {err && <div className="rg-error">⚠️ {err}</div>}

        <div className="rg-kpis">
          <div className="rg-kpi"><div className="rg-v">{totals.total}</div><div className="rg-l">Total</div></div>
          <div className="rg-kpi good"><div className="rg-v">{totals.green}</div><div className="rg-l">Green</div></div>
          <div className="rg-kpi danger"><div className="rg-v">{totals.red}</div><div className="rg-l">Red</div></div>
        </div>

        <div className="rg-table" aria-busy={loading}>
          {loading ? (
            <div className="rg-skel">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="rg-skel-row" />)}</div>
          ) : items.length ? (
            <table>
              <thead>
                <tr>
                  <th>Date/Time</th>
                  <th>Severity</th>
                  <th>District</th>
                  <th>Title</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => {
                  const sev = normalizeSeverity(a);
                  const dt = getDateTime(a);
                  return (
                    <tr key={a._id || a.id || `${getTitle(a)}-${dt || Math.random()}`}>
                      <td>{dt ? new Date(dt).toLocaleString() : "—"}</td>
                      <td><span className={`sev ${sev.cls}`}>{sev.text}</span></td>
                      <td>{getDistrict(a)}</td>
                      <td className="cut" title={getTitle(a)}>{getTitle(a)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="rg-empty">No alerts match the selected filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}
