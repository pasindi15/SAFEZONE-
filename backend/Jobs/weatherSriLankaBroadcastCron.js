console.log("[weatherLKA] module loaded");

const cron = require("node-cron");
const crypto = require("crypto");

const User = require("../models/RegModel");
const SystemState = require("../models/SystemState");
const { sendEmail } = require("../utils/mailer");
const { getAlertsForLatLon } = require("../Services/openweather");
const { countryDigestHTML } = require("../Services/templates");

// ---- Configs / Flags --------------------------------------------------------
const KEY = "LKA_COUNTRY_ALERT_HASH";
const TZ = process.env.LKA_TZ || "Asia/Colombo"; // schedule in Sri Lanka time
const ALWAYS_EMAIL_NO_ALERTS = process.env.LKA_ALWAYS_EMAIL_NO_ALERTS === "true";

// 25 districts (representative lat/lon)
const DISTRICT_LL = {
  Ampara:{lat:7.3018,lon:81.6747}, Anuradhapura:{lat:8.3114,lon:80.4037},
  Badulla:{lat:6.9934,lon:81.0550}, Batticaloa:{lat:7.7300,lon:81.6924},
  Colombo:{lat:6.9271,lon:79.8612}, Galle:{lat:6.0535,lon:80.2210},
  Gampaha:{lat:7.0897,lon:79.9994}, Hambantota:{lat:6.1246,lon:81.1185},
  Jaffna:{lat:9.6615,lon:80.0255}, Kalutara:{lat:6.5854,lon:79.9607},
  Kandy:{lat:7.2906,lon:80.6337}, Kegalle:{lat:7.2513,lon:80.3464},
  Kilinochchi:{lat:9.3803,lon:80.3773}, Kurunegala:{lat:7.4863,lon:80.3623},
  Mannar:{lat:8.9778,lon:79.9044}, Matale:{lat:7.4675,lon:80.6234},
  Matara:{lat:5.9549,lon:80.5550}, Monaragala:{lat:6.8721,lon:81.3509},
  Mullaitivu:{lat:9.2671,lon:80.8128}, "Nuwara Eliya":{lat:6.9497,lon:80.7891},
  Polonnaruwa:{lat:7.9403,lon:81.0188}, Puttalam:{lat:8.0408,lon:79.8391},
  Ratnapura:{lat:6.7056,lon:80.3847}, Trincomalee:{lat:8.5874,lon:81.2152},
  Vavuniya:{lat:8.7542,lon:80.4989}
};

// Helpers
const hash = (obj) =>
  crypto.createHash("sha1").update(JSON.stringify(obj)).digest("hex").slice(0, 16);

const isValidEmail = (s) =>
  typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// Build national digest
async function scanSriLanka() {
  const digest = [];

  for (const [district, { lat, lon }] of Object.entries(DISTRICT_LL)) {
    try {
      const { alerts } = await getAlertsForLatLon({ lat, lon });
      if (alerts.length) {
        digest.push({
          district,
          alerts: alerts.map(a => ({
            source: a.source,
            event: a.event,
            description: a.description,
            severity: a.severity
          }))
        });
      }
    } catch (e) {
      console.error(`[weatherLKA] fetch error ${district}:`, e.message);
    }
  }

  digest.sort((a, b) => a.district.localeCompare(b.district));
  return { digest, countryHash: hash(digest) };
}

// Ensure we only email on RED 
function hasRedAlerts(digest) {
  return digest.some(d =>
    Array.isArray(d.alerts) &&
    d.alerts.some(a => String(a.severity || "").toLowerCase() === "red")
  );
}

//  Accepts { force } to send even if no state change
async function runBroadcastCycle({ force = false } = {}) {
  console.log("[weatherLKA] broadcast cycle start");

  const { digest, countryHash } = await scanSriLanka();
  console.log(`[weatherLKA] districts with alerts: ${digest.length}`);
  console.log(`[weatherLKA] country hash: ${countryHash}`);

  const state = await SystemState.findOne({ key: KEY });
  const lastHash = state?.value?.hash || "";

  if (!force && countryHash === lastHash) {
    console.log("[weatherLKA] no change -> skip broadcast");
    return;
  }

  // Update stored state
  await SystemState.findOneAndUpdate(
    { key: KEY },
    { $set: { value: { hash: countryHash, at: new Date().toISOString(), digest } } },
    { upsert: true }
  );

  // Only email if there's a RED alert
  const redNow = hasRedAlerts(digest);
  if (!redNow && !force && !ALWAYS_EMAIL_NO_ALERTS) {
    console.log("[weatherLKA] no RED alerts; email suppressed (by design).");
    return;
  }

  // Build digest email safely
  const subject = force
    ? "⚠️ Sri Lanka Weather Alerts (Forced Update)"
    : "⚠️ Sri Lanka Weather Alerts Update";

  const htmlFromTpl = countryDigestHTML
    ? countryDigestHTML({
        title: subject,
        items: digest
      })
    : null;

  const html =
    (typeof htmlFromTpl === "string" && htmlFromTpl.trim())
      ? htmlFromTpl
      : `<h2>${subject}</h2><pre>${JSON.stringify(digest, null, 2)}</pre>`;

  //  SEND TO OPTED-IN USERS 
  const usersRaw = await User.find(
    { $or: [{ emailAlerts: { $exists: false } }, { emailAlerts: { $ne: false } }] },
    { email: 1 }
  ).lean();

  const emails = Array.from(
    new Set(
      usersRaw
        .map(u => (u.email || "").toLowerCase().trim())
        .filter(isValidEmail)
    )
  );

  console.log("[alerts] broadcasting", {
    type: redNow ? "red" : "digest",
    recipients: emails.length,
    sample: emails.slice(0, 3)
  });

  if (emails.length === 0) {
    console.log("[weatherLKA] no valid recipients; skipping email send.");
    return;
  }

  // Send in BCC batches
  const chunkSize = 50;
  let sent = 0, failed = 0;

  for (let i = 0; i < emails.length; i += chunkSize) {
    const bcc = emails.slice(i, i + chunkSize);
    try {
      await sendEmail({
        to: "alerts@safezone.local", 
        bcc,
        subject,
        html
      });
      sent += bcc.length;
    } catch (e) {
      failed += bcc.length;
      console.error("[sendAlertEmail] batch error:", e.message);
    }
  }

  console.log("[sendAlertEmail] completed:", `${sent} sent, ${failed} failed`);
  console.log("[weatherLKA] broadcast cycle end");
}

function startSriLankaBroadcastCron() {
  console.log("[weatherLKA] scheduler starting (*/30 * * * *)");
  cron.schedule(
    "*/30 * * * *",
    () => {
      console.log("[weatherLKA] cron tick");
      runBroadcastCycle().catch(err => console.error("[weatherLKA] run error:", err));
    },
    { timezone: TZ } 
  );

  // also run once on boot
  runBroadcastCycle().catch(err => console.error("[weatherLKA] initial run error:", err));
}

// expose helpers for routes
async function forceBroadcastOnce() {
  return runBroadcastCycle({ force: true });
}
async function clearCountryState() {
  await SystemState.deleteOne({ key: KEY });
  console.log("[weatherLKA] state cleared");
}

module.exports = {
  startSriLankaBroadcastCron,
  __runOnceLKA: runBroadcastCycle,
  __forceBroadcastOnce: forceBroadcastOnce,
  __clearCountryState: clearCountryState
};
