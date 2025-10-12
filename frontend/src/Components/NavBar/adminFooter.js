import React from "react";
import "./adminFooter.css";

export default function adminFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="admin-footer">
      <div className="admin-footer-container">
        <div className="admin-footer-left">
          <span className="brand">SafeZone Admin Panel</span>
          <span className="divider">|</span>
          <span className="version">v1.0.0</span>
          <span className="divider">|</span>
          <span className="copyright">© {year} SafeZone</span>
        </div>

        <div className="admin-footer-right">
          <a href="/AdminDocs" className="link">Docs</a>
          <a href="/AdminStatus" className="link">Status</a>
          <a href="/Support" className="link">Support</a>
          <a
            href="https://github.com/Deeghau0816/SafeZone_DMS"
            className="link"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
