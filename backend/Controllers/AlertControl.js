const Alert = require("../models/AlertModels");
const User = require("../models/RegModel");

// pagination: clamp limit
const getAllAlerts = async (req, res) => {
  try {
    const { district, page = 1, limit = 20 } = req.query;
    const q = {};
    if (district && String(district).trim()) {
      const list = String(district)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (list.length === 1) q.district = list[0];
      else if (list.length > 1) q.district = { $in: list };
    }
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const [items, total] = await Promise.all([
      Alert.find(q).sort({ createdAt: -1 }).skip((pageNum - 1) * lim).limit(lim),
      Alert.countDocuments(q),
    ]);
    const pages = Math.max(Math.ceil(total / lim), 1);
    return res.status(200).json({ ok: true, items, total, page: pageNum, pages });
  } catch (err) {
    return res.status(500).json({ ok: false, message: "Server error while fetching alerts" });
  }
};

// validate alert body
const addAlert = async (req, res) => {
  try {
    const { alertType = "green", topic, message, district, disLocation, adminName } = req.body;
    if (!topic?.trim() || !message?.trim() || !district || !disLocation?.trim() || !adminName) {
      return res.status(400).json({ ok: false, message: "Missing required fields" });
    }
    const doc = await Alert.create({
      topic: topic.trim(),
      message: message.trim(),
      district,
      disLocation: disLocation.trim(),
      adminName,
    });

    // if red, sends to ALL 

    return res.status(201).json({ ok: true, alert: doc });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Failed to save alert" });
  }
};

// id guard: ObjectId
const getAlertID = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.alertId);
    if (!alert) return res.status(404).json({ ok: false, message: "Alert not found" });
    return res.status(200).json({ ok: true, alert });
  } catch (err) {
    return res.status(500).json({ ok: false, message: "Server error while retrieving alert" });
  }
};

const updateAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { topic, message, district, disLocation, adminName } = req.body;
    const updated = await Alert.findByIdAndUpdate(
      alertId,
      { topic, message, district, disLocation, adminName },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Alert not found" });
    return res.status(200).json({ ok: true, alert: updated });
  } catch (err) {
    return res.status(500).json({ ok: false, message: "Server error while updating alert" });
  }
};

const deleteAlert = async (req, res) => {
  try {
    const delAlert = await Alert.findByIdAndDelete(req.params.alertId);
    if (!delAlert) return res.status(404).json({ ok: false, message: "Alert not found" });
    return res.status(200).json({ ok: true, alert: delAlert });
  } catch (err) {
    return res.status(500).json({ ok: false, message: "Server error while deleting alert" });
  }
};

module.exports = { getAllAlerts, addAlert, getAlertID, updateAlert, deleteAlert };
