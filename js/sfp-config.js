// /js/sfp-config.js — Updated with newsletter endpoint

// === NEWSLETTER ENDPOINT (Primary) ===
window.SFP_NEWSLETTER_URL = "/api/newsletter";

// === BASE ENDPOINT ===
window.SFP_GAS_BASE = "https://script.google.com/macros/s/AKfycbwDQtLK_9q5gN_bkIDHFLLyvsB2dv1e8JUAG2jLODoJVVN5WOu7_4x_P50FRg4zmRLBWQ/exec";

// === WELL-KNOWN ENDPOINTS ===
window.SFP_ROLES_URL = `${window.SFP_GAS_BASE}?action=getRole`;
window.SFP_DRIVER_LOOKUP_URL = `${window.SFP_GAS_BASE}?action=getDriverData`;
window.SFP_VEHICLE_LOOKUP_URL = `${window.SFP_GAS_BASE}?action=getVehicleData`;
window.SFP_INSPECTION_SUBMIT_URL = `${window.SFP_GAS_BASE}?action=submitInspection`;
window.SFP_UPDATE_PROFILE_URL = `${window.SFP_GAS_BASE}?action=updateProfile`;
window.SFP_GET_PROFILE_URL = `${window.SFP_GAS_BASE}?action=getProfile`;

// Consolidated endpoints object
window.SFP_ENDPOINTS = Object.freeze({
  newsletter: window.SFP_NEWSLETTER_URL,
  base: window.SFP_GAS_BASE,
  getRole: window.SFP_ROLES_URL,
  getDriverData: window.SFP_DRIVER_LOOKUP_URL,
  getVehicleData: window.SFP_VEHICLE_LOOKUP_URL,
  submitInspection: window.SFP_INSPECTION_SUBMIT_URL,
  updateProfile: window.SFP_UPDATE_PROFILE_URL,
  getProfile: window.SFP_GET_PROFILE_URL,
});

/**
 * Newsletter-specific API call function
 */
window.sfpNewsletterCall = async function sfpNewsletterCall(action, params = {}) {
  const formData = new URLSearchParams({
    action: action,
    ...params
  });

  console.log('Newsletter API call:', action, params);
  
  const response = await fetch(window.SFP_NEWSLETTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} ${response.statusText} – ${text.slice(0, 300)}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const rawText = await response.text();
  try { 
    return JSON.parse(rawText); 
  } catch { 
    return rawText; 
  }
};

/**
 * Regular SFP API call function (existing)
 */
window.sfpApiCall = async function sfpApiCall(action, params = {}) {
  const url = new URL(window.SFP_GAS_BASE);
  url.searchParams.set("action", action);
  Object.keys(params).forEach((k) => {
    const v = params[k];
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });
  url.searchParams.set("_ts", Date.now().toString(36)); // cache-bust

  const res = await fetch(url.toString(), { method: "GET" }); // no headers!

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} – ${text.slice(0, 300)}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();

  const raw = await res.text();
  try { return JSON.parse(raw); } catch { return raw; }
};

// Newsletter testing function
window.testNewsletterConnection = async function testNewsletterConnection() {
  console.log("🧪 Testing Newsletter connection...");
  try {
    const result = await sfpNewsletterCall("newsletter_subscribe", {
      email: "test@example.com",
      name: "Test User",
      segment: "pro",
      consent: "true"
    });
    console.log("✅ Newsletter test result:", result);
    return true;
  } catch (err) {
    console.error("💥 Newsletter test failed:", err);
    return false;
  }
};

// Quick manual test for main SFP system
window.testSFPConnection = async function testSFPConnection() {
  console.log("🧪 Testing SFP connection…");
  try {
    const roleResult = await sfpApiCall("getRole", { email: "safefreightprogram@gmail.com" });
    console.log("✅ Role check:", roleResult);

    const driverResult = await sfpApiCall("getDriverData", {
      id: "SFPD-001234",
      email: "safefreightprogram@gmail.com",
    });
    console.log("✅ Driver lookup:", driverResult);

    const vehicleResult = await sfpApiCall("getVehicleData", {
      id: "SFPV-000001",
      email: "safefreightprogram@gmail.com",
    });
    console.log("✅ Vehicle lookup:", vehicleResult);

    console.log("🎉 All SFP API tests passed!");
    return true;
  } catch (err) {
    console.error("💥 SFP connection test failed:", err);
    return false;
  }
};
