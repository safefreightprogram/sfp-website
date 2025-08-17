// /js/sfp-auth.js
// Firebase v10+ modular SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore, doc, getDocFromServer,
  disableNetwork, enableNetwork
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Firebase configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyBURlJUicOTobRLghN2RyEZfXEZvU_uiYU",
  authDomain: "safe-freight-program.firebaseapp.com",
  projectId: "safe-freight-program",
  appId: "1:289281705793:web:94520fbf0138a6802103c0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ✅ Force long-polling transport (no WebChannel / Listen 400 spam)
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false
});

// ---- ID token helper (exported) ----
async function getIdToken(forceRefresh = false) {
  const u = auth.currentUser;
  if (!u) return null;
  return await u.getIdToken(forceRefresh);
}

// ---- GAS helper (simple GET, no custom headers -> no preflight) ----
function buildGASUrl(action, params = {}) {
  const base = window.SFP_GAS_BASE || "";
  if (!base) throw new Error("SFP_GAS_BASE not set");
  const url = new URL(base);
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });
  // cache-bust to avoid intermediates
  url.searchParams.set("_ts", Date.now().toString(36));
  return url;
}

async function callGASEndpoint(action, params = {}) {
  // attach user email if signed in (helps GAS identify requester), but do not add headers
  const u = auth.currentUser;
  const merged = { ...params };
  if (u?.email && !merged.email) merged.email = u.email;

  const url = buildGASUrl(action, merged);
  const res = await fetch(url.toString(), { method: "GET" }); // no headers!

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} – ${t.slice(0, 300)}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  const raw = await res.text();
  try { return JSON.parse(raw); } catch { return raw; }
}

// ---- Minimal global auth API ----
async function sfpLogin(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await sfpAfterAuth(cred.user);
  return cred.user;
}

async function sfpSignup(email, password, displayName = "") {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) await updateProfile(cred.user, { displayName });
  await sfpAfterAuth(cred.user);
  return cred.user;
}

async function sfpLogout() {
  localStorage.removeItem("sfpRole");
  localStorage.removeItem("sfpOrgId");
  // Silence Firestore chatter while logged out
  try { await disableNetwork(db); } catch {}
  await signOut(auth);
}

async function sfpReset(email) {
  await sendPasswordResetEmail(auth, email);
}

// Called after login/signup to pull role from GAS
async function sfpAfterAuth(user) {
  try {
    console.log("🔑 Fetching user role from GAS…");
    const data = await callGASEndpoint("getRole");
    if (data && data.role) {
      localStorage.setItem("sfpRole", data.role);
      localStorage.setItem("sfpOrgId", data.orgId || "");
      console.log(`✅ Role fetched: ${data.role}, Org: ${data.orgId || "None"}`);
    } else {
      console.warn("⚠️ No role data returned from GAS, defaulting to Guest");
      localStorage.setItem("sfpRole", "Guest");
      localStorage.setItem("sfpOrgId", "");
    }
  } catch (e) {
    console.error("❌ Role fetch failed:", e);
    localStorage.setItem("sfpRole", "Guest");
    localStorage.setItem("sfpOrgId", "");
  }
}

function sfpGetCurrentUser() { return auth.currentUser; }
function sfpGetCurrentRole() { return localStorage.getItem("sfpRole") || "Guest"; }
function sfpGetOrgId() { return localStorage.getItem("sfpOrgId") || ""; }

// ---- Convenience wrappers to GAS (GET-only for now to avoid CORS) ----
async function sfpLookupDriver(driverId) {
  if (!driverId) throw new Error("driverId required");
  return callGASEndpoint("getDriverData", { id: driverId });
}

async function sfpLookupVehicle(vehicleId) {
  if (!vehicleId) throw new Error("vehicleId required");
  return callGASEndpoint("getVehicleData", { id: vehicleId });
}

// Submit inspection via GET for now (avoids preflight). If payloads grow, switch later.
async function sfpSubmitInspection(inspectionData) {
  if (!inspectionData) throw new Error("inspectionData required");
  const payload = {};
  Object.entries(inspectionData).forEach(([k, v]) => {
    payload[k] = (v && typeof v === "object") ? JSON.stringify(v) : v;
  });
  return callGASEndpoint("submitInspection", payload);
}

// Expose legacy helper API
window.SFPAuth = {
  login: sfpLogin,
  signup: sfpSignup,
  logout: sfpLogout,
  reset: sfpReset,
  user: sfpGetCurrentUser,
  role: sfpGetCurrentRole,
  orgId: sfpGetOrgId,
  getIdToken,
  _auth: auth,
  lookupDriver: sfpLookupDriver,
  lookupVehicle: sfpLookupVehicle,
  submitInspection: sfpSubmitInspection,
  callGAS: callGASEndpoint
};

// ---- Public SFP snapshot object ----
export let SFP = {
  user: null,
  roles: [],
  scopes: { ailIds: [], siteIds: [] },
  gasConnected: false
};

// ---- SINGLE Enhanced auth state handler with better error handling ----
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // Hard stop Firestore networking while logged out
    try { 
      await disableNetwork(db);
      console.log("🔌 Firestore network disabled (logged out)");
    } catch (e) {
      console.warn("Could not disable Firestore network:", e);
    }
    
    SFP = {
      user: null,
      roles: [],
      scopes: { ailIds: [], siteIds: [] },
      gasConnected: false
    };
    document.dispatchEvent(new CustomEvent("sfp-auth-changed", { detail: { user: null } }));
    return;
  }

  console.log("🔄 Auth state changed, updating SFP object…");

  // Enable networking with error handling
  try { 
    await enableNetwork(db);
    console.log("✅ Firestore network enabled");
  } catch (e) {
    console.warn("⚠️ Could not enable Firestore network:", e);
  }

  // Get roles from Firebase custom claims
  let roles = [];
  try {
    const token = await user.getIdTokenResult(true);
    roles = Array.isArray(token.claims?.roles) ? token.claims.roles : [];
    console.log("🎭 Firebase roles:", roles);
  } catch (e) {
    console.warn("⚠️ Could not fetch Firebase custom claims:", e);
  }

  // Fall back to GAS role
  if (roles.length === 0) {
    const gasRole = sfpGetCurrentRole();
    console.log("🎭 GAS role:", gasRole);
    if (gasRole && gasRole !== "Guest") {
      switch ((gasRole || "").toLowerCase()) {
        case "admin": roles = ["admin"]; break;
        case "ail inspector": roles = ["inspector", "ail"]; break;
        case "ail manager": roles = ["ail_manager", "inspector"]; break;
        case "driver": roles = ["driver"]; break;
        default: roles = ["guest"];
      }
    } else {
      roles = ["guest"];
    }
  }

  // Enhanced Firestore scope reading with timeout
  let scopes = { ailIds: [], siteIds: [] };
  if (user.uid) {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Firestore timeout")), 5000)
      );
      
      const firestorePromise = getDocFromServer(doc(db, "users", user.uid));
      
      const snap = await Promise.race([firestorePromise, timeoutPromise]);
      
      if (snap && snap.exists()) {
        const d = snap.data();
        scopes = d.scopes || scopes;
        console.log("📊 Firestore scopes loaded:", scopes);
      } else {
        console.log("📊 No Firestore document for user");
      }
    } catch (e) {
      if (e.message === "Firestore timeout") {
        console.warn("⏱️ Firestore read timed out - using default scopes");
      } else if (e.code === 'permission-denied') {
        console.warn("🔒 Firestore permission denied - check security rules");
      } else if (e.code === 'unavailable') {
        console.warn("🔌 Firestore unavailable - may be offline");
      } else {
        console.warn("⚠️ Failed to load Firestore scopes:", e.message || e);
      }
    }
  }

  // Quick GAS connectivity check
  let gasConnected = false;
  try { 
    await callGASEndpoint("getRole"); 
    gasConnected = true;
    console.log("✅ GAS connection successful");
  } catch (e) {
    console.warn("⚠️ GAS connection failed:", e.message || e);
  }

  SFP = { user, roles, scopes, gasConnected };
  document.dispatchEvent(new CustomEvent("sfp-auth-changed", { detail: { user } }));
  console.log("🎉 SFP object updated:", SFP);
});

// Add connection state monitoring
if (typeof window !== 'undefined') {
  // Monitor online/offline status
  window.addEventListener('online', async () => {
    console.log("🌐 Network connection restored");
    const user = auth.currentUser;
    if (user) {
      try {
        await enableNetwork(db);
        console.log("✅ Firestore re-enabled after network restore");
      } catch (e) {
        console.warn("Could not re-enable Firestore:", e);
      }
    }
  });

  window.addEventListener('offline', async () => {
    console.log("📵 Network connection lost");
    try {
      await disableNetwork(db);
      console.log("🔌 Firestore disabled due to network loss");
    } catch (e) {
      console.warn("Could not disable Firestore:", e);
    }
  });
}

// Enhanced diagnostic function
window.testSFPAuth = async function () {
  console.log("🧪 Testing SFP Auth system…");
  console.log("=".repeat(50));
  
  // Check Firebase configuration
  console.log("🔧 Firebase Config:", {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    apiKey: firebaseConfig.apiKey ? "✅ Set" : "❌ Missing"
  });
  
  // Check authentication status
  const user = auth.currentUser;
  if (!user) { 
    console.error("❌ No user logged in"); 
    console.log("💡 Tip: Log in first before running tests");
    return false; 
  }

  console.log("👤 Current user:", user.email);
  console.log("🆔 User UID:", user.uid);
  console.log("🎭 Current role:", sfpGetCurrentRole());
  console.log("🏢 Current org:", sfpGetOrgId());
  console.log("📊 SFP object:", SFP);
  
  // Test Firestore connection
  console.log("\n📚 Testing Firestore connection...");
  try {
    await enableNetwork(db);
    const testDoc = await getDocFromServer(doc(db, "users", user.uid));
    if (testDoc.exists()) {
      console.log("✅ Firestore connection successful");
      console.log("📄 User document:", testDoc.data());
    } else {
      console.log("⚠️ User document doesn't exist in Firestore");
    }
  } catch (e) {
    console.error("❌ Firestore test failed:", e.message);
    if (e.code === 'permission-denied') {
      console.log("💡 Check Firestore security rules in Firebase Console");
    }
  }
  
  // Test GAS endpoints
  console.log("\n🔗 Testing GAS endpoints...");
  try {
    const roleData = await callGASEndpoint("getRole");
    console.log("✅ GAS role check:", roleData);

    const driverData = await sfpLookupDriver("SFPD-001234");
    console.log("✅ Driver lookup test:", driverData);

    const vehicleData = await sfpLookupVehicle("SFPV-000001");
    console.log("✅ Vehicle lookup test:", vehicleData);

    console.log("\n🎉 All SFP Auth tests passed!");
    return true;
  } catch (error) {
    console.error("💥 GAS test failed:", error);
    console.log("💡 Check GAS deployment and permissions");
    return false;
  }
};
