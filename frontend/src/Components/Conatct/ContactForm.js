import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import "./ContactForm.css";

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    problem: "",
  });
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});

  const navigate = useNavigate(); 

  // Phone number validation function
  const validatePhoneNumber = (phone) => {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, "");
    
    // Check if it's empty
    if (!cleanPhone) {
      return "Phone number is required";
    }
    
    // Check if it starts with 0
    if (!cleanPhone.startsWith("0")) {
      return "Phone number must start with 0";
    }
    
    // Check if it's exactly 10 digits
    if (cleanPhone.length !== 10) {
      return "Phone number must be exactly 10 digits";
    }
    
    // Check for valid pattern (starts with 0, followed by 9 digits)
    const phoneRegex = /^0[0-9]{9}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return "Please enter a valid phone number (e.g., 0771234567)";
    }
    
    return null; // No error
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "name") {
      // Only allow letters and spaces
      const lettersOnly = value.replace(/[^a-zA-Z\s]/g, "");
      setFormData({ ...formData, [name]: lettersOnly });
    } else if (name === "phone") {
      // Allow numbers, +, -, (, ), and spaces for formatting
      const phoneValue = value.replace(/[^0-9+\-()\s]/g, "");
      setFormData({ ...formData, [name]: phoneValue });
      
      // Clear previous phone error when user starts typing
      if (errors.phone) {
        setErrors({ ...errors, phone: "" });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields
    const newErrors = {};
    
    // Validate phone number
    const phoneError = validatePhoneNumber(formData.phone);
    if (phoneError) {
      newErrors.phone = phoneError;
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    
    // Validate problem
    if (!formData.problem.trim()) {
      newErrors.problem = "Problem description is required";
    }
    
    // If there are validation errors, don't submit
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setMessage({ type: "error", text: "Please fix the errors below" });
      return;
    }
    
    // Clear any previous errors
    setErrors({});

    try {
      const res = await fetch("http://localhost:5000/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: data.message || "Contact form submitted successfully!" });
        setFormData({ name: "", email: "", phone: "", problem: "" });
        setErrors({});
      } else {
        setMessage({ type: "error", text: data.message || "Failed to submit contact form" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    }
  };

  return (
    <div>
      {/* Blue Header Section */}
      <div className="contact-header">
        <div className="header-bar"></div>
        <h1 className="contact-title">DISASTER DESCRIPTION</h1>
        <div className="contact-banner">
          <h2>CONTACT US</h2>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="contact-main-card">
        <div className="contact-layout">
          {/* Left Side - Contact Form */}
          <div className="contact-form-section">
            {message && (
              <p className={`contact-message ${message.type}`}>
                {message.text}
              </p>
            )}

            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Full Name"
                  className={errors.name ? "error" : ""}
                />
                {errors.name && <span className="error-message">{errors.name}</span>}
              </div>

              <div className="form-group">
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email Address"
                  className={errors.email ? "error" : ""}
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              <div className="form-group">
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Phone Number (e.g., 0771234567)"
                  className={errors.phone ? "error" : ""}
                />
                {errors.phone && <span className="error-message">{errors.phone}</span>}
                <small className="phone-help">
                  Enter your phone number starting with 0 and exactly 10 digits (e.g., 0771234567)
                </small>
              </div>

              <div className="form-group">
                <textarea
                  name="problem"
                  required
                  value={formData.problem}
                  onChange={handleChange}
                  placeholder="Describe your problem or concern..."
                  rows="4"
                  className={errors.problem ? "error" : ""}
                />
                {errors.problem && <span className="error-message">{errors.problem}</span>}
              </div>

              <button type="submit" className="submit-btn">SUBMIT</button>
            </form>
          </div>

          {/* Right Side - Contact Information */}
          <div className="contact-info-section">
            <div className="contact-info">
              <h3>General Inquiries</h3>
              <p><a href="mailto:info@disasterhub.org">info@SafeZone.org</a></p>
              
              <h3>General Inquiries</h3>
              <p><a href="mailto:info@disasterhub.org">info@SafeZone.org</a></p>
              
              <h3>Media Inquiries</h3>
              <p><a href="mailto:media@disasterhub.org">media@SafeZone.org</a></p>
              
              <h3>Our Office</h3>
              <p>
              383 Bauddhaloka Mawatha, Colombo 07<br/>
              </p>
              
              <div className="map-thumbnail">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.8!2d79.9!3d6.9!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae2593cf65a1e9d%3A0xe13da4b295e2f5d!2sColombo%2007!5e0!3m2!1sen!2slk!4v1234567890"
                  width="100%"
                  height="200"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="SafeZone Office Location"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactForm;
