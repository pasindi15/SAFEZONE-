const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
  // enum: severity
  alertType: {
    type: String,
    enum: ["green", "red"],
    default: "green",
    required: true,
    lowercase: true,
    trim: true,
  },
  topic: {
    type: String,
    required: true,
    trim: true,
    maxlength: 140,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  // enum: district
  district: {
    type: String,
    required: true,
    enum: [
      "Ampara","Anuradhapura","Badulla","Batticaloa","Colombo","Galle","Gampaha","Hambantota",
      "Jaffna","Kalutara","Kandy","Kegalle","Kilinochchi","Kurunegala","Mannar","Matale","Matara",
      "Monaragala","Mullaitivu","Nuwara Eliya","Polonnaruwa","Puttalam","Ratnapura","Trincomalee","Vavuniya",
    ],
    trim: true,
  },
  disLocation: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 120,
  },
  // enum: admin type
  adminName: {
    type: String,
    required: true,
    enum: ["System Admin", "Disaster Management Officer", "Other"],
    default: "System Admin",
    trim: true,
  },
}, { timestamps: true, versionKey: false });

// index: district + createdAt
alertSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Alert", alertSchema);
