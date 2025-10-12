// src/pages/AlertFolder/AlertsPage.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import Alert from "./Alert";
import "./Alert.css";

export default function AlertsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get("/alerts?limit=100");
      setItems(data?.items || data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this alert?")) return;
    await axios.delete(`/alerts/${id}`);
    setItems((s) => s.filter((x) => (x._id || x.id) !== id));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="alerts-wrap">
      <div className="alerts-header">
        <div className="alerts-header-left">
          <button
            className="back-btn"
            onClick={() => navigate("/AdminHome")}
            aria-label="Back to Admin Home"
            type="button"
          >
            <span className="back-arrow">←</span>
            <span className="back-text">Back</span>
          </button>

          <h1 className="alerts-title">Alerts</h1>
        </div>

        <div className="alerts-actions">
          <button className="ghost-btn" onClick={load} type="button">
            ⟳ Refresh
          </button>
          <Link to="/AdminHome/AlertAdd" className="add-alert-btn">
            + Add Alert
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="alert-skel-wrap">
          <div className="alert-skel" />
          <div className="alert-skel" />
          <div className="alert-skel" />
        </div>
      ) : items.length === 0 ? (
        <div className="alert-empty">No alerts yet.</div>
      ) : (
        <div className="alerts-list">
          {items.map((a) => (
            <Alert key={a._id || a.id} alert={a} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
