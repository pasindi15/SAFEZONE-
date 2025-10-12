// Validation utilities for VictimDashboard forms
export const NAME_REGEX = /^[a-zA-Z\s\-']+$/;

// Enhanced NIC validation:
export const NIC_REGEX = /^(\d{9}[VvXx]|\d{12})$/;

// Enhanced Phone validation: 
export const PHONE_REGEX = /^7\d{8}$/;

// Basic email validation pattern
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Sri Lankan phone digits (9-10 digits)
export const LK_PHONE_DIGITS = /^[0-9]{9,10}$/;

/* ---- Enhanced Validation Functions ---- */

/**
 * Validates NIC number with zero restrictions
 * @param {string} nic - NIC number to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export function validateNIC(nic) {
  if (!nic || !nic.trim()) {
    return { isValid: false, error: "NIC is required" };
  }

  const cleanNIC = nic.trim().toUpperCase();

  // Check basic format
  if (!NIC_REGEX.test(cleanNIC)) {
    return { isValid: false, error: "Use format: 123456789V or 200012345678" };
  }

  // Extract digits for zero validation
  let digits;
  if (cleanNIC.length === 12) {
    // New format: 12 digits
    digits = cleanNIC;
  } else if (cleanNIC.length === 10) {
    // Old format: 9 digits + V/X
    digits = cleanNIC.slice(0, 9);
  } else {
    return { isValid: false, error: "Invalid NIC format" };
  }

  // Check if all digits are zeros
  if (/^0+$/.test(digits)) {
    return { isValid: false, error: "NIC cannot be all zeros" };
  }

  // Check if first 4 digits are zeros
  if (digits.length >= 4 && /^0000/.test(digits)) {
    return { isValid: false, error: "First 4 digits of NIC cannot be zeros" };
  }

  return { isValid: true, error: "" };
}

/**
 * Validates phone number with zero restrictions
 * @param {string} phoneDigits - Phone digits to validate (without country code)
 * @returns {object} - { isValid: boolean, error: string }
 */
export function validatePhone(phoneDigits) {
  if (!phoneDigits || !phoneDigits.trim()) {
    return { isValid: false, error: "Phone number is required" };
  }

  const cleanDigits = phoneDigits.replace(/[^\d]/g, '');

  // Check if empty after cleaning
  if (!cleanDigits) {
    return { isValid: false, error: "Phone number is required" };
  }

  // Check length (9-10 digits for Sri Lankan numbers)
  if (cleanDigits.length < 9 || cleanDigits.length > 10) {
    return { isValid: false, error: "Phone number must be 9-10 digits" };
  }

  // Check if all digits are zeros
  if (/^0+$/.test(cleanDigits)) {
    return { isValid: false, error: "Phone number cannot be all zeros" };
  }

  // Check if first 4 digits are zeros
  if (cleanDigits.length >= 4 && /^0000/.test(cleanDigits)) {
    return { isValid: false, error: "First 4 digits of phone number cannot be zeros" };
  }

  // For Sri Lankan mobile numbers, should start with 7
  if (cleanDigits.length === 9 && !cleanDigits.startsWith('7')) {
    return { isValid: false, error: "Sri Lankan mobile numbers should start with 7" };
  }

  return { isValid: true, error: "" };
}

/**
 * Validates name field
 * @param {string} name - Name to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export function validateName(name) {
  if (!name || !name.trim()) {
    return { isValid: false, error: "Name is required" };
  }

  if (!NAME_REGEX.test(name.trim())) {
    return { isValid: false, error: "Name can only contain letters, spaces, hyphens, and apostrophes" };
  }

  return { isValid: true, error: "" };
}

/**
 * Validates email field (optional)
 * @param {string} email - Email to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export function validateEmail(email) {
  if (!email || !email.trim()) {
    return { isValid: true, error: "" }; // Email is optional
  }

  if (!EMAIL_REGEX.test(email.trim())) {
    return { isValid: false, error: "Please enter a valid email address" };
  }

  return { isValid: true, error: "" };
}

/**
 * Validates address field
 * @param {string} address - Address to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export function validateAddress(address) {
  if (!address || !address.trim()) {
    return { isValid: false, error: "Address is required" };
  }

  return { isValid: true, error: "" };
}

/**
 * Comprehensive form validation
 * @param {object} formData - Form data to validate
 * @param {array} requiredFields - Array of required field names
 * @returns {object} - { isValid: boolean, errors: object }
 */
export function validateForm(formData, requiredFields = []) {
  const errors = {};
  let isValid = true;

  // Validate required fields
  requiredFields.forEach(field => {
    if (!formData[field] || !formData[field].toString().trim()) {
      errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      isValid = false;
    }
  });

  // Validate specific fields if they exist
  if (formData.name) {
    const nameValidation = validateName(formData.name);
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error;
      isValid = false;
    }
  }

  if (formData.nic) {
    const nicValidation = validateNIC(formData.nic);
    if (!nicValidation.isValid) {
      errors.nic = nicValidation.error;
      isValid = false;
    }
  }

  if (formData.phoneDigits) {
    const phoneValidation = validatePhone(formData.phoneDigits);
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.error;
      isValid = false;
    }
  }

  if (formData.email) {
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error;
      isValid = false;
    }
  }

  if (formData.address) {
    const addressValidation = validateAddress(formData.address);
    if (!addressValidation.isValid) {
      errors.address = addressValidation.error;
      isValid = false;
    }
  }

  return { isValid, errors };
}
