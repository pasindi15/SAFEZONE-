const mongoose = require("mongoose");
const Aid = require("../models/AidModel");

/* ---------- Validators (same as frontend) ---------- */
const NIC_RE   = /^(\d{9}[VvXx]|\d{12})$/;
const PHONE_RE = /^(?:\+94|0)?7\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const badReq   = (res, msg) => res.status(400).json({ ok: false, message: msg });
const notFound = (res)      => res.status(404).json({ ok: false, message: "Aid request not found" });

const normalizeId = (raw) => (raw ?? "").toString().trim();
const isHex24     = (s) => /^[0-9a-fA-F]{24}$/.test(s);

/* ---------- Create: ALWAYS new _id ---------- */
exports.createAid = async (req, res) => {
  try {
    const {
      name = "",
      nic = "",
      phone = "",
      email = "",
      address = "",
      location = "",
      aidType = "",
      urgency = "Normal",
      description = "",
      requestedAt,
      _id, id, createdAt, updatedAt, ...rest
    } = req.body || {};

    if (!name.trim())                         return badReq(res, "Name is required");
    if (!NIC_RE.test(String(nic).trim()))     return badReq(res, "Invalid NIC");
    if (!PHONE_RE.test(String(phone).trim())) return badReq(res, "Invalid phone");
    if (!EMAIL_RE.test(String(email).trim())) return badReq(res, "Invalid email");
    if (!address.trim())                      return badReq(res, "Address is required");
    if (!location.trim())                     return badReq(res, "Location is required");
    if (!aidType)                             return badReq(res, "Aid type is required");
    if (!["Normal", "High", "Critical"].includes(urgency))
                                              return badReq(res, "Invalid urgency");

    const clean = {
      name: name.trim(),
      nic: nic.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      address: address.trim(),
      location: location.trim(),
      aidType,
      urgency,
      description: description?.trim() || "",
      requestedAt: requestedAt ? new Date(requestedAt) : new Date(),
    };

    const doc = new Aid(clean);
    await doc.save();
    return res.status(201).json({ ok: true, aid: doc });
  } catch (err) {
    console.error("createAid error:", err);
    return res.status(500).json({ ok: false, message: "Server error", error: err.message });
  }
};

/* ---------- List (q/page/limit) ---------- */
exports.listAids = async (req, res) => {
  try {
    const q      = (req.query.q || "").toString().trim();
    const page   = Math.max(parseInt(req.query.page  ?? "1", 10), 1);
    const limit  = Math.max(parseInt(req.query.limit ?? "50", 10), 1);
    const skip   = (page - 1) * limit;

    const filt = {};
    if (q) {
      const rx = new RegExp(q, "i");
      filt.$or = [
        { name: rx }, { nic: rx }, { phone: rx }, { email: rx },
        { address: rx }, { location: rx }, { aidType: rx }, { description: rx },
      ];
    }

    const [items, total] = await Promise.all([
      Aid.find(filt).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Aid.countDocuments(filt),
    ]);

    return res.json({ ok: true, total, page, limit, items });
  } catch (err) {
    console.error("listAids error:", err);
    return res.status(500).json({ ok: false, message: "Server error", error: err.message });
  }
};

/* ---------- Read one ---------- */
exports.getAid = async (req, res) => {
  try {
    const id = normalizeId(req.params.id);
    if (!isHex24(id)) return badReq(res, "Invalid id");

    const doc = await Aid.findById(id);
    if (!doc) return notFound(res);

    return res.json({ ok: true, aid: doc });
  } catch (err) {
    console.error("getAid error:", err);
    return res.status(500).json({ ok: false, message: "Server error", error: err.message });
  }
};

/* ---------- Update ---------- */
exports.updateAid = async (req, res) => {
  try {
    const id = normalizeId(req.params.id);
    if (!isHex24(id)) return badReq(res, "Invalid id");

    const payload = { ...req.body };
    delete payload._id;
    delete payload.id;
    delete payload.createdAt;
    delete payload.updatedAt;

    if (payload.nic && !NIC_RE.test(String(payload.nic).trim()))
      return badReq(res, "Invalid NIC");
    if (payload.phone && !PHONE_RE.test(String(payload.phone).trim()))
      return badReq(res, "Invalid phone");
    if (payload.email && !EMAIL_RE.test(String(payload.email).trim()))
      return badReq(res, "Invalid email");
    if (payload.urgency && !["Normal", "High", "Critical"].includes(payload.urgency))
      return badReq(res, "Invalid urgency");

    ["name", "email", "address", "location", "description"].forEach((k) => {
      if (typeof payload[k] === "string") payload[k] = payload[k].trim();
    });
    if (typeof payload.email === "string") payload.email = payload.email.toLowerCase();
    if (payload.requestedAt) payload.requestedAt = new Date(payload.requestedAt);

    const updated = await Aid.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true, runValidators: true }
    );
    if (!updated) return notFound(res);

    return res.json({ ok: true, aid: updated });
  } catch (err) {
    console.error("updateAid error:", err);
    return res.status(500).json({ ok: false, message: "Server error", error: err.message });
  }
};

/* ---------- Delete ---------- */
exports.deleteAid = async (req, res) => {
  try {
    const id = normalizeId(req.params.id);
    if (!isHex24(id)) return badReq(res, "Invalid id");

    const del = await Aid.findByIdAndDelete(id);
    if (!del) return notFound(res);

    return res.json({ ok: true, deletedId: id });
  } catch (err) {
    console.error("deleteAid error:", err);
    return res.status(500).json({ ok: false, message: "Server error", error: err.message });
  }
};
