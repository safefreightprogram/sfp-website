// Enhanced sfp-security.js - Add this new file to your project
// This provides additional security layers on the client side

class SFPSecurityManager {
  constructor() {
    this.requestQueue = new Map();
    this.lastRequestTime = new Map();
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.maxRetries = 3;
  }

  // Rate limiting on client side (backup to server-side)
  checkClientRateLimit(action, maxRequests = 10, windowMs = 60000) {
    const key = action;
    const now = Date.now();
    
    if (!this.lastRequestTime.has(key)) {
      this.lastRequestTime.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    const limit = this.lastRequestTime.get(key);
    
    if (now > limit.resetTime) {
      this.lastRequestTime.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (limit.count >= maxRequests) {
      throw new Error(`Too many requests. Please wait ${Math.ceil((limit.resetTime - now) / 1000)} seconds.`);
    }
    
    limit.count++;
    return true;
  }

  // Secure API call wrapper
  async secureApiCall(url, options = {}, action = 'unknown') {
    // Client-side rate limiting
    this.checkClientRateLimit(action);
    
    // Add security headers
    const secureOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...options.headers
      }
    };

    // Add authentication if available
    try {
      const user = window.SFPAuth?.user?.();
      if (user) {
        const token = await user.getIdToken();
        secureOptions.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Could not get auth token:', e);
    }

    let lastError;
    
    // Retry logic with exponential backoff
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, secureOptions);
        
        if (response.status === 429) {
          // Rate limited - wait and retry
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          await this.sleep(waitTime);
          continue;
        }
        
        if (response.status === 401) {
          // Auth failed - redirect to login
          window.location.href = '/login.html?next=' + encodeURIComponent(window.location.pathname);
          throw new Error('Authentication required');
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Log successful requests (for debugging)
        console.log(`✅ ${action} successful:`, { url, status: response.status });
        
        return data;
        
      } catch (error) {
        lastError = error;
        console.warn(`🔄 Attempt ${attempt} failed for ${action}:`, error.message);
        
        if (attempt < this.maxRetries) {
          await this.sleep(1000 * attempt); // Progressive delay
        }
      }
    }
    
    // All retries failed
    console.error(`❌ ${action} failed after ${this.maxRetries} attempts:`, lastError);
    throw lastError;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Input validation helpers
  validateDriverId(input) {
    if (!input) throw new Error('Driver ID is required');
    
    const cleaned = input.toString().trim().toUpperCase();
    
    // Remove SFPD- prefix if present for validation
    const numberPart = cleaned.startsWith('SFPD-') ? cleaned.substring(5) : cleaned;
    
    // Check if it's exactly 6 digits
    if (!/^\d{6}$/.test(numberPart)) {
      throw new Error('Driver ID must be 6 digits (e.g., 001234)');
    }
    
    return `SFPD-${numberPart}`;
  }

  validateVehicleId(input) {
    if (!input) throw new Error('Vehicle ID is required');
    
    const cleaned = input.toString().trim().toUpperCase();
    
    // Remove SFPV- prefix if present for validation
    const numberPart = cleaned.startsWith('SFPV-') ? cleaned.substring(5) : cleaned;
    
    // Check if it's exactly 6 digits
    if (!/^\d{6}$/.test(numberPart)) {
      throw new Error('Vehicle ID must be 6 digits (e.g., 000001)');
    }
    
    return `SFPV-${numberPart}`;
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
    return email.toLowerCase().trim();
  }

  // Sanitize text input
  sanitizeText(input, maxLength = 1000) {
    if (!input) return '';
    
    return input
      .toString()
      .trim()
      .substring(0, maxLength)
      .replace(/[<>]/g, ''); // Remove potential XSS chars
  }

  // Check session validity
  checkSession() {
    const user = window.SFPAuth?.user?.();
    if (!user) {
      throw new Error('Session expired. Please log in again.');
    }
    
    // Check if token is expired (basic check)
    try {
      const token = user.accessToken;
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Date.now() / 1000;
        
        if (payload.exp && payload.exp < now) {
          throw new Error('Session expired. Please log in again.');
        }
      }
    } catch (e) {
      console.warn('Could not validate token:', e);
    }
    
    return true;
  }

  // Enhanced error reporting
  reportError(error, context = {}) {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      context: context
    };
    
    console.error('Security Error:', errorReport);
    
    // In production, you might want to send this to an error tracking service
    // this.sendErrorReport(errorReport);
  }

  // Secure form submission wrapper
  async secureFormSubmit(formData, endpoint, action) {
    try {
      this.checkSession();
      
      // Validate common fields
      if (formData.email) {
        formData.email = this.validateEmail(formData.email);
      }
      
      if (formData.driverId) {
        formData.driverId = this.validateDriverId(formData.driverId);
      }
      
      if (formData.vehicleId) {
        formData.vehicleId = this.validateVehicleId(formData.vehicleId);
      }
      
      // Sanitize text fields
      const textFields = ['comments', 'notes', 'name', 'address'];
      textFields.forEach(field => {
        if (formData[field]) {
          formData[field] = this.sanitizeText(formData[field]);
        }
      });
      
      const result = await this.secureApiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify(formData)
      }, action);
      
      return result;
      
    } catch (error) {
      this.reportError(error, { action, endpoint, formData: { ...formData, sensitive: 'REDACTED' } });
      throw error;
    }
  }
}

// Create global instance
window.SFPSecurity = new SFPSecurityManager();

// Enhanced lookup functions using security manager
window.secureLookupDriver = async function(driverId) {
  try {
    const validatedId = window.SFPSecurity.validateDriverId(driverId);
    
    const result = await window.SFPSecurity.secureApiCall(
      window.SFP_GAS_BASE + '?action=getDriverData&id=' + encodeURIComponent(validatedId),
      { method: 'GET' },
      'driver_lookup'
    );
    
    return result;
    
  } catch (error) {
    window.SFPSecurity.reportError(error, { action: 'driver_lookup', driverId });
    throw error;
  }
};

window.secureLookupVehicle = async function(vehicleId) {
  try {
    const validatedId = window.SFPSecurity.validateVehicleId(vehicleId);
    
    const result = await window.SFPSecurity.secureApiCall(
      window.SFP_GAS_BASE + '?action=getVehicleData&id=' + encodeURIComponent(validatedId),
      { method: 'GET' },
      'vehicle_lookup'
    );
    
    return result;
    
  } catch (error) {
    window.SFPSecurity.reportError(error, { action: 'vehicle_lookup', vehicleId });
    throw error;
  }
};

// Enhanced inspection submission
window.secureSubmitInspection = async function(inspectionData) {
  try {
    // Additional validation for inspection data
    const requiredFields = ['sfpvId', 'vehicleType', 'rego', 'inspectionDate', 'outcome'];
    for (const field of requiredFields) {
      if (!inspectionData[field]) {
        throw new Error(`${field} is required`);
      }
    }
    
    // Validate outcome
    if (!['Pass', 'Fail', 'Needs Repair'].includes(inspectionData.outcome)) {
      throw new Error('Invalid inspection outcome');
    }
    
    // Validate date
    const inspectionDate = new Date(inspectionData.inspectionDate);
    if (isNaN(inspectionDate.getTime())) {
      throw new Error('Invalid inspection date');
    }
    
    // Check date is not in future
    if (inspectionDate > new Date()) {
      throw new Error('Inspection date cannot
