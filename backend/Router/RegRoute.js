// Router/RegRoute.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const User = require("../models/RegModel");

/* ---------------- Helpers ---------------- */
function isEmail(s = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s));
}
function requiredFields(body, keys) {
  return keys.filter((k) => !body[k] || String(body[k]).trim() === "");
}
function requireUser(req, res, next) {
  if (req.session?.user?.id) return next();
  return res.status(401).json({ ok: false, message: "Not authenticated" });
}

/* ---------------- Session whoami ---------------- */
router.get("/me", (req, res) => {
  if (req.session?.user) return res.json({ ok: true, user: req.session.user });
  return res.status(401).json({ ok: false, user: null });
});

/* ---------------- LOGIN ---------------- */
router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    const plain = req.body.password || "";

    if (!email || !plain) {
      return res.status(400).json({ ok: false, message: "Email and password are required" });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ ok: false, message: "Invalid email" });
    }

    // explicitly include password (schema hides it)
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ ok: false, message: "Invalid email or password" });
    }

    const ok = await bcrypt.compare(plain, user.password);
    if (!ok) {
      return res.status(400).json({ ok: false, message: "Invalid email or password" });
    }

    req.session.user = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      district: user.district,
    };
    await req.session.save?.(); // <-- ensure cookie is persisted before response

    return res.json({ ok: true, user: req.session.user });
  } catch (e) {
    console.error("[LOGIN] error:", e);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/* ---------------- LOGOUT ---------------- */
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ ok: false, message: "Logout failed" });
    res.clearCookie("sid");
    return res.json({ ok: true });
  });
});

/* ---------------- REGISTER ---------------- */
router.post("/", async (req, res) => {
  try {
    const required = [
      "firstName","lastName","nic","email","contactNumber",
      "district","city","postalCode","password",
    ];
    const missing = requiredFields(req.body, required);
    if (missing.length) {
      return res.status(400).json({ ok: false, message: `Missing: ${missing.join(", ")}` });
    }

    const email = String(req.body.email).toLowerCase().trim();
    if (!isEmail(email)) {
      return res.status(400).json({ ok: false, message: "Invalid email" });
    }
    if (String(req.body.password).length < 6) {
      return res.status(400).json({ ok: false, message: "Password must be at least 6 characters" });
    }

    // Check existing user
    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return res.status(409).json({ ok: false, message: "User with given email already exists!" });
    }

    const saltRounds = Number(process.env.SALT || 10);
    const hashPassword = await bcrypt.hash(String(req.body.password), saltRounds);

    const user = await User.create({
      firstName: String(req.body.firstName).trim(),
      lastName: String(req.body.lastName).trim(),
      nic: String(req.body.nic).trim(),
      email,
      contactNumber: String(req.body.contactNumber).trim(),
      district: String(req.body.district).trim(),
      city: String(req.body.city).trim(),
      postalCode: String(req.body.postalCode).trim(),
      password: hashPassword,
    });

    // Auto-login (session)
    req.session.user = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      district: user.district,
    };
    await req.session.save?.(); 

    return res.status(201).json({ ok: true, user: req.session.user });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.email) {
      return res.status(409).json({ ok: false, message: "User with given email already exists!" });
    }

    console.error("[REGISTER] error:", error);
    return res.status(500).json({ ok: false, message: "Internal Server Error" });
  }
});

/* ---------------- SELF-DELETE ---------------- */
router.delete("/me", requireUser, async (req, res) => {
  try {
    const userId = req.session.user.id;
    await User.findByIdAndDelete(userId);

    req.session.destroy(() => {
      res.clearCookie("sid");
      return res.json({ ok: true, message: "Account deleted" });
    });
  } catch (e) {
    console.error("[DELETE /users/me] error:", e);
    return res.status(500).json({ ok: false, message: "Failed to delete account" });
  }
});

/* ---------------- CRUD (admin/utility) ---------------- */
const RegControl = require("../Controllers/RegControl");
router.get("/", RegControl.getAllUsers);
router.get("/:userId", RegControl.getUserById);
router.put("/:userId", RegControl.updateUser);
router.delete("/:userId", RegControl.deleteUser);

module.exports = router;
