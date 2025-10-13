const express = require("express");
const AdminCtrl = require("../Controllers/AdminControl");
const router = express.Router();

// role guard: admin only
const requireAdmin = (req, res, next) =>
  req.session?.admin?.id ? next() : res.status(401).json({ ok:false, message:"Not authenticated (admin)" });

// Auth / registration
router.post("/register", AdminCtrl.register);
router.post("/login",    AdminCtrl.login);
router.get ("/auth/me",  AdminCtrl.authMe);
router.post("/logout",   AdminCtrl.logout);

// Profile
router.get   ("/me",          requireAdmin, AdminCtrl.me);
router.put   ("/me",          requireAdmin, AdminCtrl.updateMe);
router.put   ("/me/password", requireAdmin, AdminCtrl.updatePassword);
router.delete("/me",          requireAdmin, AdminCtrl.deleteMe);

module.exports = router;
