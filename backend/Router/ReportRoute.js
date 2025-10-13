const express = require("express");
const router = express.Router();


const { list, metrics } = require("../Controllers/ReportController");


if (typeof list !== "function") {
  throw new Error(
    "ReportController.list is not a function. Check Controllers/ReportController.js exports."
  );
}
if (typeof metrics !== "function") {
  console.warn("ReportController.metrics not found; /reports/metrics will be disabled");
}

// details
router.get("/", list);

// Optional KPIs endpoint
if (typeof metrics === "function") {
  router.get("/metrics", metrics);
}

module.exports = router;
