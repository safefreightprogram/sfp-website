// /js/sfp-config.js — central place for GAS endpoints (loaded on every page)

// === BASE ENDPOINT ===
window.SFP_GAS_BASE =
  "https://script.google.com/macros/s/AKfycbwDQtLK_9q5gN_bkIDHFLLyvsB2dv1e8JUAG2jLODoJVVN5WOu7_4x_P50FRg4zmRLBWQ/exec";

// === WELL-KNOWN ENDPOINTS ===
window.SFP_ROLES_URL               = `${window.SFP_GAS_BASE}?action=getRole`;
window.SFP_DRIVER_LOOKUP_URL       = `${window.SFP_GAS_BASE}?action=getDriverData`;
window.SFP_VEHICLE_LOOKUP_URL      = `${window.SFP_GAS_BASE}?action=getVehicleData`;
window.SFP_INSPECTION_SUBMIT_URL   = `${window.SFP_GAS_BASE}?action=submitInspection`;
window.SFP_UPDATE_PROFILE_URL      = `${window.SFP_GAS_BASE}?action=updateProfile`;
window.SFP_GET_PROFILE_URL         = `${window.SFP_GAS_BASE}?action=getProfile`;

// Optional: frozen map (handy for debugging/iteration)
window.SFP_ENDPOINTS = Object.freeze({
  base: window.SFP_GAS_BASE,
  getRole: window.SFP_ROLES_URL,
  getDriverData: window.SFP_DRIVER_LOOKUP_URL,
  getVehicleData: window.SFP_VEHICLE_LOOKUP_URL,
  submitInspection: window.SFP_INSPECTION_SUBMIT_URL,
  updateProfile: window.SFP_UPDATE_PROFILE_URL,
  getProfile: window.SFP_GET_PROFILE_URL,
});

/**
 * sfpApiCall(action, params)
 * - Uses GET with query params (aligned to typical GAS WebApp patterns).
 * - Adds a cache-buster to avoid aggressive intermediate caching.
 * - If available, includes an Authorization: Bearer <idToken> header (safe no-op for GAS if not used).
 */
window.sfpApiCall = async function sfpApiCall(action, params = {}) {
  const url = new URL(window.SFP_GAS_BASE);
  url.searchParams.set("action", action);

  // Add parameters (ignore null/undefined)
  Object.keys(params).forEach((k) => {
    const v = params[k];
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });

  // Cache bust
  url.searchParams.set("_ts", Date.now().toString(36));

  // Build headers
  const headers = {
    "X-Requested-With": "XMLHttpRequest",
  };

  // Optional Firebase ID token (if your GAS uses it; harmless if it doesn’t)
  try {
    const maybeToken =
      (window.SFP && window.SFP.idToken) ||
      (window.SFPAuth && window.SFPAuth.idToken && (await window.SFPAuth.idToken()));
    if (maybeToken) headers["Authorization"] = `Bearer ${maybeToken}`;
  } catch (_) {
    // Non-fatal if token fetch fails
  }

  // Optional user email (for logging/routing on GAS)
  if (window.SFP && window.SFP.user && window.SFP.user.email) {
    headers["X-SFP-User"] = window.SFP.user.email;
  }

  // Fetch + tolerant parse
  const res = await fetch(url.toString(), {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} – ${text.slice(0, 300)}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return res.json();
  }
  // Fallback: try to parse JSON from text; else return raw text
  const raw = await res.text();
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

// Quick manual test (optional; run in DevTools: await testSFPConnection())
window.testSFPConnection = async function testSFPConnection() {
  console.log("🧪 Testing SFP connection…");
  try {
    const roleResult = await sfpApiCall("getRole", {
      email: "safefreightprogram@gmail.com",
    });
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
