const express = require("express");
const EventEmitter = require("events");
const PDFDocument = require("pdfkit");
const router = express.Router();
const Alert = require("../models/AlertModels");
const User  = require("../models/RegModel");
const { sendAlertEmail } = require("../Services/notifyEmail");

console.log("[AlertRoute] loaded");

/* ---------------- Auth helpers ---------------- */
function requireAnyAuth(req, res, next) {
  if (req.session?.user || req.session?.admin) return next();
  return res.status(401).json({ ok: false, message: "Not authenticated" });
}
// role guard: user only
function requireUser(req, res, next) {
  if (req.session?.user) return next();
  return res.status(401).json({ ok: false, message: "Not authenticated (user)" });
}

/* ---------------- Utils ---------------- */
function asInt(v, d) { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.floor(n) : d; }
function escReg(s = "") { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function endOfDay(s) { const d = new Date(s); d.setHours(23,59,59,999); return d; }
const safe = (v) => (v === null || v === undefined ? "" : String(v));
const dt   = (v) => (v ? new Date(v).toLocaleString() : "");

// build report query
function buildReportQuery({ from, to, severity = "all", district = "all" }) {
  const q = {};
  const sev = String(severity).toLowerCase();
  if (sev === "green") q.alertType = /green/i;
  if (sev === "red")   q.alertType = /red/i;
  if (district && String(district).toLowerCase() !== "all") {
    q.district = new RegExp(`^${escReg(String(district))}$`, "i");
  }
  if (from || to) {
    q.createdAt = {};
    if (from) q.createdAt.$gte = new Date(from);
    if (to)   q.createdAt.$lte = endOfDay(to);
  }
  return q;
}

const bus = new EventEmitter();

// dashboard snapshot
async function buildSnapshot(limit = 20) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [agg] = await Alert.aggregate([
    {
      $facet: {
        total:   [{ $count: "n" }],
        last24h: [{ $match: { createdAt: { $gte: since } } }, { $count: "n" }],
        byType:  [{ $group: { _id: { $toLower: "$alertType" }, n: { $sum: 1 } } }],
        recent: [
          { $sort: { createdAt: -1 } },
          { $limit: Math.max(1, limit) },
          { $project: {
              _id: 1,
              title: "$topic",
              severity: { $toLower: "$alertType" },
              userName: "$adminName",
              district: 1,
              createdAt: 1,
            }
          },
        ],
      },
    },
  ]);
  const total   = agg?.total?.[0]?.n ?? 0;
  const last24h = agg?.last24h?.[0]?.n ?? 0;
  const typeMap = Object.fromEntries((agg?.byType || []).map(x => [x._id, x.n]));
  const red     = typeMap["red"]   || 0;
  const green   = typeMap["green"] || 0;

  const users = await User.countDocuments({});

  return {
    metrics: { total, red, green, last24h, activeUsers: users },
    alerts: agg?.recent || [],
  };
}

/* ---------------- Ping ---------------- */
router.get("/ping", (_req, res) => res.json({ ok: true, route: "alerts/ping" }));

/* ---------------- Dashboard endpoints ---------------- */
router.get("/metrics", async (_req, res) => {
  try {
    const snap = await buildSnapshot(8);
    return res.json(snap.metrics);
  } catch (e) {
    console.error("[GET /alerts/metrics]", e);
    res.status(500).json({ error: "METRICS_FAILED" });
  }
});

router.get("/recent", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, asInt(req.query.limit, 8)));
    const snapshot = await buildSnapshot(limit);
    return res.json(snapshot.alerts);
  } catch (e) {
    console.error("[GET /alerts/recent]", e);
    return res.status(500).json({ error: "RECENT_FAILED" });
  }
});

router.get("/pull", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(100, asInt(req.query.limit, 20)));
    const snapshot = await buildSnapshot(limit);
    return res.json(snapshot);
  } catch (e) {
    console.error("[GET /alerts/pull]", e);
    return res.status(500).json({ error: "PULL_FAILED" });
  }
});

/* ---------------- SSE realtime ---------------- */
router.get("/events", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders?.();

  const send = (type, data) =>
    res.write(`data: ${JSON.stringify({ type, data })}\n\n`);

  (async () => {
    try {
      const snap = await buildSnapshot(20);
      send("metrics", snap.metrics);
      send("alerts", snap.alerts);
    } catch {}
  })();

  const onUpdate = async () => {
    try {
      const snap = await buildSnapshot(20);
      send("metrics", snap.metrics);
      send("alerts", snap.alerts);
    } catch {}
  };

  bus.on("alerts:update", onUpdate);
  req.on("close", () => {
    bus.off("alerts:update", onUpdate);
    res.end();
  });
});

/* ---------------- Public list ---------------- */
router.get("/", async (req, res) => {
  try {
    const { district = "", page = "1", limit = "10", q = "" } = req.query;

    const where = {};
    if (district && String(district).trim())
      where.district = String(district).trim();
    if (q && String(q).trim()) {
      const rx = new RegExp(String(q).trim(), "i");
      where.$or = [{ topic: rx }, { message: rx }];
    }

    const pageNum = asInt(page, 1);
    const perPage = asInt(limit, 10);

    const [items, total] = await Promise.all([
      Alert.find(where)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * perPage)
        .limit(perPage)
        .lean(),
      Alert.countDocuments(where),
    ]);

    const pages = Math.max(1, Math.ceil(total / perPage));
    res.json({ ok: true, items, page: pageNum, pages, total });
  } catch (e) {
    console.error("[GET /alerts] error:", e);
    res.status(500).json({ ok: false, message: "Server error while fetching alerts" });
  }
});

/* ---------------- My alerts ---------------- */
router.get("/my", requireUser, async (req, res) => {
  try {
    const district = req.session.user?.district;
    if (!district) {
      return res.status(400).json({ ok: false, message: "User has no district set" });
    }
    const items = await Alert.find({ district }).sort({ createdAt: -1 }).lean();
    res.json({ ok: true, items });
  } catch (e) {
    console.error("[GET /alerts/my] error:", e);
    res.status(500).json({ ok: false, message: "Server error while fetching alerts" });
  }
});

/* ---------------- Report (JSON) ---------------- */
router.get("/report", async (req, res) => {
  try {
    const { from, to, severity = "all", district = "all" } = req.query;
    const query = buildReportQuery({ from, to, severity, district });

    const items = await Alert.find(query).sort({ createdAt: -1 }).lean();

    const total = items.length;
    const red   = items.filter(a => String(a.alertType).toLowerCase() === "red").length;
    const green = items.filter(a => String(a.alertType).toLowerCase() === "green").length;

    res.json({ ok: true, items, total, red, green, filters: { from, to, severity, district } });
  } catch (e) {
    console.error("[GET /alerts/report] error:", e);
    res.status(500).json({ ok: false, message: "Server error while building report" });
  }
});

// Report 
router.get("/report/pdf", async (req, res) => {
  try {
    const { from, to, severity = "all", district = "all" } = req.query;
    const query = buildReportQuery({ from, to, severity, district });
    const list = await Alert.find(query).sort({ createdAt: -1 }).lean();

    const total = list.length;
    const red   = list.filter(a => String(a.alertType).toLowerCase() === "red").length;
    const green = list.filter(a => String(a.alertType).toLowerCase() === "green").length;

    const filename = `alerts_${from || "all"}_${to || "all"}_${severity}_${district}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: "A4", margin: 50 }); 
    doc.pipe(res);

    const C = {
      ink: "#111111",
      sub: "#555555",
      line: "#E5E7EB",
      dim: "#777777",
    };

    const left  = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const usable = right - left;

    /* Header */
    const addHeader = () => {
      doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(18).text("Alert Report");
      doc.moveDown(0.3);

      doc.font("Helvetica").fontSize(10).fillColor(C.sub);
      const m1 = `Generated: ${new Date().toLocaleString()}`;
      const m2 = `Range: ${safe(from) || "—"} to ${safe(to) || "—"}`;
      const m3 = `Severity: ${safe(severity)}`;
      const m4 = `District: ${safe(district)}`;
      const m5 = `Totals — All: ${total}  Green: ${green}  Red: ${red}`;
      doc.text(`${m1}   •   ${m2}   •   ${m3}   •   ${m4}   •   ${m5}`, { width: usable });

      doc.moveDown(0.5);
      doc.strokeColor(C.line).lineWidth(1).moveTo(left, doc.y).lineTo(right, doc.y).stroke();
      doc.moveDown(0.5);
    };

    /* Footer */
    const addFooter = () => {
      doc.font("Helvetica").fontSize(9).fillColor(C.dim);
      const label = `Page ${doc.page.number}`;
      const w = doc.widthOfString(label);
      doc.text(label, right - w, doc.page.height - doc.page.margins.bottom + 10);
      doc.fillColor(C.ink);
    };

    /* Small label value line */
    const kv = (label, value, x, y, labelW, lineH = 13) => {
      doc.font("Helvetica").fontSize(9).fillColor(C.sub).text(label, x, y, { width: labelW });
      doc.font("Helvetica").fontSize(10).fillColor(C.ink).text(value || "—", x + labelW + 8, y, { width: usable - (labelW + 16) });
      return y + lineH;
    };

    /* Card for alerts */
    const card = (a) => {
      const boxH = 84;
      const y0 = doc.y;

      if (y0 + boxH + 24 > doc.page.height - doc.page.margins.bottom) {
        addFooter();
        doc.addPage();
        addHeader();
      }

      // container
      const y = doc.y;
      doc.save();
      doc.roundedRect(left, y, usable, boxH, 8).strokeColor(C.line).lineWidth(1).stroke();
      doc.restore();

      // Title row and right-aligned time
      doc.font("Helvetica-Bold").fontSize(12).fillColor(C.ink)
         .text(a.topic || a.title || "Untitled alert", left + 12, y + 10, { width: usable - 24 });

      doc.font("Helvetica").fontSize(10).fillColor(C.sub);
      const t = dt(a.createdAt);
      const w = doc.widthOfString(t);
      doc.text(t, right - w - 12, y + 10);

      // Details (monochrome, no badges)
      let yy = y + 32;
      const labelW = 80;
      yy = kv("Severity", (a.alertType || a.severity || "—").toString().toUpperCase(), left + 12, yy, labelW);
      yy = kv("District", a.district || "—", left + 12, yy, labelW);
      yy = kv("Location", a.disLocation || "—", left + 12, yy, labelW);
      yy = kv("Admin", a.adminName || "—", left + 12, yy, labelW);

      // bottom spacing and separator
      doc.moveTo(left, y + boxH).lineTo(right, y + boxH).strokeColor(C.line).stroke();
      doc.y = y + boxH + 14;
    };

    // Render
    addHeader();
    if (!list.length) {
      doc.font("Helvetica").fontSize(11).fillColor(C.sub).text("No alerts match the selected filters.", left, doc.y + 12);
      addFooter();
      doc.end();
      return;
    }
    list.forEach(card);
    addFooter();
    doc.end();
  } catch (e) {
    console.error("[GET /alerts/report/pdf] error:", e);
    if (!res.headersSent) {
      res.status(500).json({ ok: false, message: "Failed to generate PDF" });
    } else {
      try { res.end(); } catch {}
    }
  }
});

/* ---------------- Get one ---------------- */
router.get("/:alertId", async (req, res) => {
  try {
    const { alertId } = req.params;
    if (alertId === "stats") return res.json({ ok: true, stats: {} });
    const docu = await Alert.findById(alertId).lean();
    if (!docu) return res.status(404).json({ ok: false, message: "Alert not found" });
    res.json({ ok: true, alert: docu });
  } catch (e) {
    console.error("[GET /alerts/:alertId] error:", e);
    res.status(500).json({ ok: false, message: "Server error while fetching alert" });
  }
});

/* ---------------- Create ---------------- */
router.post("/", requireAnyAuth, async (req, res) => {
  try {
    const payload = {
      alertType:   req.body.alertType || "green",
      topic:       (req.body.topic || "").trim(),
      message:     (req.body.message || "").trim(),
      district:    (req.body.district || "").trim(),
      disLocation: (req.body.disLocation || "").trim(),
      adminName:   req.body.adminName || "System Admin",
    };

    if (!payload.topic || !payload.message) {
      return res.status(400).json({ ok: false, message: "Topic and message are required." });
    }
    if (!payload.district) {
      return res.status(400).json({ ok: false, message: "District is required." });
    }

    const alertDoc = await Alert.create(payload);
    const isRed = String(alertDoc.alertType).toLowerCase() === "red";

    const baseQuery = {
      email: { $exists: true, $ne: "" },
      $or: [{ emailAlerts: { $exists: false } }, { emailAlerts: true }],
    };

    const userQuery = isRed
      ? baseQuery
      : { ...baseQuery, district: new RegExp(`^${escReg(alertDoc.district)}$`, "i") };

    const users = await User.find(userQuery).select({ email: 1, _id: 0 }).lean();
    const emails = users.map((u) => u.email).filter(Boolean);

    console.log("[alerts] broadcasting", {
      type: alertDoc.alertType,
      district: alertDoc.district,
      recipients: emails.length,
      sample: emails.slice(0, 3),
    });

    await sendAlertEmail(emails, {
      level: alertDoc.alertType,
      title: alertDoc.topic,
      topic: alertDoc.topic,
      message: alertDoc.message,
      district: alertDoc.district,
      disLocation: alertDoc.disLocation,
      adminName: alertDoc.adminName,
      _id: alertDoc._id,
      createdAt: alertDoc.createdAt,
    });

    bus.emit("alerts:update");

    return res.json({
      ok: true,
      alert: alertDoc,
      emailed: emails.length,
      scope: isRed ? "all" : `district:${alertDoc.district}`,
    });
  } catch (e) {
    console.error("[POST /alerts] create error:", e);
    res.status(400).json({ ok: false, message: e.message });
  }
});

/* ---------------- Update ---------------- */
router.put("/:alertId", requireAnyAuth, async (req, res) => {
  try {
    const { alertId } = req.params;
    const patch = {};
    ["alertType", "topic", "message", "district", "disLocation", "adminName"].forEach((k) => {
      if (req.body[k] !== undefined)
        patch[k] = typeof req.body[k] === "string" ? req.body[k].trim() : req.body[k];
    });

    const updated = await Alert.findByIdAndUpdate(alertId, patch, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) return res.status(404).json({ ok: false, message: "Alert not found" });

    bus.emit("alerts:update");

    res.json({ ok: true, alert: updated });
  } catch (e) {
    console.error("[PUT /alerts/:alertId] update error:", e);
    res.status(400).json({ ok: false, message: e.message });
  }
});

/* ---------------- Delete ---------------- */
router.delete("/:alertId", requireAnyAuth, async (req, res) => {
  try {
    const { alertId } = req.params;
    const deleted = await Alert.findByIdAndDelete(alertId).lean();
    if (!deleted) return res.status(404).json({ ok: false, message: "Alert not found" });

    bus.emit("alerts:update");

    res.json({ ok: true, deletedId: alertId });
  } catch (e) {
    console.error("[DELETE /alerts/:alertId] delete error:", e);
    res.status(400).json({ ok: false, message: e.message });
  }
});

module.exports = router;
