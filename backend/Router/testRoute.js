const express = require("express");
const router = express.Router();
console.log("[TestRoute] loaded");

const {
  __runOnceLKA,
  __forceBroadcastOnce,
  __clearCountryState
} = require("../Jobs/weatherSriLankaBroadcastCron");

const User = require("../models/RegModel");
const { sendEmail } = require("../utils/mailer");
const { alertEmailHTML } = require("../Services/templates");

// Simple email validator
const isValidEmail = (s) =>
  typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// sanity
router.get("/ping", (_req, res) => {
  console.log("[TestRoute] /tools/ping hit");
  res.json({ ok: true, ping: "pong" });
});

// run country scan once (normal behavior) — will SKIP if hash unchanged
router.get("/check-lka-now", async (_req, res) => {
  try {
    console.log("[TestRoute] /tools/check-lka-now hit");
    await __runOnceLKA(); // normal: will skip if no change
    res.json({ ok: true, msg: "Sri Lanka weather scan executed (normal)." });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// run country scan once AND broadcast even if no change / even if empty digest (see env/guard in job)
router.get("/check-lka-now-force", async (_req, res) => {
  try {
    console.log("[TestRoute] /tools/check-lka-now-force hit");
    await __forceBroadcastOnce(); // force = true
    res.json({ ok: true, msg: "Sri Lanka weather scan executed (FORCED broadcast)." });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// clear stored country state so next normal run will broadcast again if alerts exist
router.post("/reset-lka-state", async (_req, res) => {
  try {
    await __clearCountryState();
    res.json({ ok: true, msg: "Sri Lanka alert state cleared." });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// send a manual test alert to ONE address (pipeline check)
router.post("/send-test-alert", async (req, res) => {
  try {
    console.log("[/send-test-alert] body=", req.body);

    const to =
      req.body?.to ||
      req.body?.email ||
      process.env.TEST_EMAIL_TO ||
      process.env.SMTP_USER ||
      process.env.EMAIL_USER;

    const place   = req.body?.place   ?? "Colombo";
    const event   = req.body?.event   ?? "Manual Test Alert";
    const message = req.body?.message ?? "This is a manual test alert.";

    if (!to) {
      return res.status(400).json({ ok: false, error: "No recipients defined" });
    }
    if (!isValidEmail(to)) {
      return res.status(400).json({ ok: false, error: "Invalid 'to' email address." });
    }

    // Build SINGLE-alert email with the fields your template expects
    const html = alertEmailHTML(
      {
        level: "INFO",
        title: event,
        district: place,
        disLocation: "",
        adminName: "SafeZone",
        createdAt: new Date().toISOString(),
        message
      },
      { reason: "manual test" } // harmless if your template ignores this
    );

    const subject = `⚠️ Weather Alert (TEST) — ${place}`;
    const r = await sendEmail({ to, subject, html }); // use object form
    console.log("[TestRoute] test email sent ->", to);

    res.json({ ok: true, msg: "Test email sent", messageId: r?.messageId || null, to });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// === send a manual test alert to ALL users
router.post("/send-test-alert-all", async (req, res) => {
  try {
    const {
      place = "Sri Lanka",
      event = "Auto Alert System of SafeZone",
      message = "Heavy rain incoming to your area.",
      limit,
      onlyEnabled = true
    } = req.body || {};

    // select recipients (optionally only enabled)
    const query = onlyEnabled ? { alertsEnabled: true } : {};
    let usersRaw = await User.find(query, { email: 1, firstName: 1 }).lean();

    // filter invalid/missing emails
    const invalid = usersRaw.filter(u => !isValidEmail(u.email)).map(u => u.email);
    let users = usersRaw.filter(u => isValidEmail(u.email));

    if (!users.length) {
      return res.json({ ok: false, msg: "No valid recipient emails found.", invalidCount: invalid.length, invalidSample: invalid.slice(0, 5) });
    }

    if (Number.isFinite(Number(limit)) && Number(limit) > 0) {
      users = users.slice(0, Number(limit));
    }

    const subject = `⚠️ SafeZone (TEST BROADCAST) — ${place}`;
    const sent = [];
    const fails = [];

    // send sequentially (simple & avoids SMTP throttling bursts)
    for (const u of users) {
      try {
        const html = alertEmailHTML(
          {
            level: "INFO",
            title: event,
            district: place,
            disLocation: "",
            adminName: "SafeZone",
            createdAt: new Date().toISOString(),
            message
          },
          { reason: "manual test broadcast" }
        );
        const r = await sendEmail({ to: u.email, subject, html }); // object form
        sent.push({ email: u.email, id: r?.messageId || null });
      } catch (err) {
        fails.push({ email: u.email, error: err.message });
      }
    }

    res.json({
      ok: true,
      attempted: users.length,
      sent: sent.length,
      failed: fails.length,
      invalidCount: invalid.length,
      sampleInvalid: invalid.slice(0, 5),
      sampleSent: sent.slice(0, 5),
      sampleFailed: fails.slice(0, 5)
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// enable alerts for all users + set default district if missing
router.post("/enable-alerts-for-all", async (req, res) => {
  try {
    const { district = "Colombo" } = req.body || {};

    const r1 = await User.updateMany({}, { $set: { alertsEnabled: true } });
    const r2 = await User.updateMany(
      { $or: [{ district: { $exists: false } }, { district: "" }] },
      { $set: { district } }
    );

    res.json({ ok: true, enabled: r1.modifiedCount, districtSet: r2.modifiedCount, district });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
