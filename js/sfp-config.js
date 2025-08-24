// /js/sfp-config.js — central place for GAS endpoints (loaded on every page)

// === NEWSLETTER ENDPOINT ===
window.SFP_NEWSLETTER_URL = "https://script.google.com/macros/s/AKfycbxP4Ls6uFlZNTAhc8D7cqCbNs86mNH-LD-lKuWr3ifrcoFPVdttddreVqlXeXe6AwoLRA/exec";


// === BASE ENDPOINT ===
window.SFP_GAS_BASE =
  "https://script.google.com/macros/s/AKfycbwDQtLK_9q5gN_bkIDHFLLyvsB2dv1e8JUAG2jLODoJVVN5WOu7_4x_P50FRg4zmRLBWQ/exec";

// === WELL-KNOWN ENDPOINTS ===
window.SFP_ROLES_URL               = `${window.SFP_GAS_BASE}?action=getRole`;
window.SFP_DRIVER_LOOKUP_URL       = `${window.SFP_GAS_BASE}?action=getDriverData`;
window.SFP_VEHICLE_LOOKUP_URL      = `${window.SFP_GAS_BASE}?action=getVehicleData`;
window.SFP_INSPECTION_SUBMIT_URL   = `${window.SFP_GAS_BASE}?action=submitInspection`;
window.SFP_UPDATE_PROFILE_URL      = `${window.SFP_GAS_BASE}?action=updateProfile`;
window.SFP_GET_PROFILE_URL         = `${window.SFP_GAS_BASE}?action=getProfile`;z

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
 * Simple GET to GAS without custom headers to avoid CORS preflight.
 * NOTE: Do NOT add custom headers here (like X-Requested-With or Authorization),
 * or the browser will send an OPTIONS preflight that GAS won’t answer.
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

// Quick manual test (run in DevTools: await testSFPConnection())
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
