const bcrypt = require("bcryptjs");
const Admin = require("../models/AdminModel");

const VALID = ["System Admin", "Disaster Management Officer", "Other"];
const isEmail = (s = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s));


class AdminControl {
  // validate admin credentials
  async register(req, res) {
    try {
      let { name, email, contactNumber, adminName, password } = req.body || {};

      name          = String(name || "").trim();
      email         = String(email || "").toLowerCase().trim();
      contactNumber = String(contactNumber || "").trim();
      adminName     = String(adminName || "").trim();
      password      = String(password || "");

      if (!name || !email || !contactNumber || !adminName || !password) {
        return res.status(400).json({ ok:false, message:"All fields are required" });
      }
      if (!isEmail(email)) {
        return res.status(400).json({ ok:false, message:"Invalid email" });
      }
      if (!VALID.includes(adminName)) {
        return res.status(400).json({ ok:false, message:"Invalid admin type" });
      }
      const exists = await Admin.findOne({ email });
      if (exists) return res.status(409).json({ ok:false, message:"Admin already exists" });
      const admin = await Admin.create({ name, email, contactNumber, adminName, password });
      return res.status(201).json({
        ok: true,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          contactNumber: admin.contactNumber,
          adminName: admin.adminName,
        },
      });
    } catch (e) {
      if (e?.code === 11000 && e?.keyPattern?.email) {
        return res.status(409).json({ ok:false, message:"Admin already exists" });
      }
      return res.status(500).json({ ok:false, message:"Server error during register" });
    }
  }

  // validate admin credentials
  async login(req, res) {
    try {
      const email = String(req.body.email || "").toLowerCase().trim();
      const plain = String(req.body.password || "");

      if (!email || !plain) return res.status(400).json({ ok:false, message:"Email and password are required" });
      if (!isEmail(email)) return res.status(400).json({ ok:false, message:"Invalid email" });
      const admin = await Admin.findOne({ email }).select("+password");
      if (!admin || !admin.password) {
        return res.status(401).json({ ok:false, message:"Invalid email or password" });
      }
      const ok = await bcrypt.compare(plain, admin.password);
      if (!ok) return res.status(401).json({ ok:false, message:"Invalid email or password" });
      req.session.regenerate(() => {
        req.session.admin = {
          id: admin._id,
          email: admin.email,
          name: admin.name,
          adminName: admin.adminName,
          type: "admin",
        };
        return res.json({ ok:true, admin: req.session.admin });
      });
    } catch (e) {
      console.error("[admin/login]", e);
      return res.status(500).json({ ok:false, message:"Server error" });
    }
  }

  // admin auth: session required
  authMe(req, res) {
    if (req.session?.admin) return res.json({ ok:true, admin: req.session.admin });
    return res.status(401).json({ ok:false, admin: null });
  }

  // logout
  logout(req, res) {
    req.session?.destroy(() => {
      res.clearCookie("sid");
      return res.json({ ok:true });
    });
  }

  async me(req, res) {
    try {
      const admin = await Admin.findById(req.session.admin.id).lean();
  if (!admin) return res.status(404).json({ ok:false, message:"Admin not found" });
  return res.json({ ok:true, admin });
    } catch (e) {
      console.error("[admin GET /me]", e);
      return res.status(500).json({ ok:false, message:"Server error" });
    }
  }

  async updateMe(req, res) {
    try {
      const patch = {
        name:          (req.body.name ?? "").trim(),
        email:         (req.body.email ?? "").toLowerCase().trim(),
        contactNumber: (req.body.contactNumber ?? "").trim(),
        adminName:     (req.body.adminName ?? "").trim(),
      };

      if (patch.email && !isEmail(patch.email)) {
        return res.status(400).json({ ok:false, message:"Invalid email" });
      }
      if (patch.adminName && !VALID.includes(patch.adminName)) {
        return res.status(400).json({ ok:false, message:"Invalid admin type" });
      }

  Object.keys(patch).forEach(k => { if (!patch[k]) delete patch[k]; });

      const updated = await Admin.findByIdAndUpdate(
        req.session.admin.id, patch, { new: true, runValidators: true }
      ).lean();

      if (!updated) return res.status(404).json({ ok:false, message:"Admin not found" });

      req.session.admin = {
        ...req.session.admin,
        name: updated.name,
        email: updated.email,
        adminName: updated.adminName,
      };

  return res.json({ ok:true, admin: updated });
    } catch (e) {
      if (e?.code === 11000 && e?.keyPattern?.email) {
        return res.status(409).json({ ok:false, message:"Email already in use" });
      }
      return res.status(500).json({ ok:false, message:"Failed to update profile" });
    }
  }

  async updatePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ ok:false, message:"Both currentPassword and newPassword are required" });
      }
      if (String(newPassword).length < 6) {
        return res.status(400).json({ ok:false, message:"New password must be at least 6 characters" });
      }

      const admin = await Admin.findById(req.session.admin.id).select("+password");
      if (!admin) return res.status(404).json({ ok:false, message:"Admin not found" });

      const ok = await bcrypt.compare(String(currentPassword), admin.password);
      if (!ok) return res.status(400).json({ ok:false, message:"Current password is incorrect" });

  admin.password = String(newPassword); // pre('save') will hash
  await admin.save();

  return res.json({ ok:true, message:"Password updated" });
    } catch (e) {
  return res.status(500).json({ ok:false, message:"Failed to update password" });
    }
  }

  async deleteMe(req, res) {
    try {
      await Admin.findByIdAndDelete(req.session.admin.id);
      req.session.destroy(() => {
        res.clearCookie("sid");
        return res.json({ ok:true, message:"Admin account deleted" });
      });
    } catch (e) {
  return res.status(500).json({ ok:false, message:"Failed to delete admin" });
    }
  }
}

module.exports = new AdminControl();
