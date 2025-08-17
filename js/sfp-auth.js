// /js/sfp-auth.js
// Firebase v10+ modular SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase configuration - your current setup
const firebaseConfig = {
  apiKey: "AIzaSyBURlJUicOTobRLghN2RyEZfXEZvU_uiYU",
  authDomain: "safe-freight-program.firebaseapp.com", // Fixed: should match your project
  projectId: "safe-freight-program", // Fixed: should match your project  
  appId: "1:289281705793:web:94520fbf0138a6802103c0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- ID token helper (exported) ---
async function getIdToken(forceRefresh = false) {
  const u = auth.currentUser;
  if (!u) return null;
  return await u.getIdToken(forceRefresh);
}

// --- Enhanced GAS API call helper ---
async function callGASEndpoint(action, params = {}) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Build URL with action and email
    const url = new URL(window.SFP_GAS_BASE || '');
    url.searchParams.set('action', action);
    url.searchParams.set('email', user.email);
    
    // Add other parameters
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.set(key, params[key]);
      }
    });

    console.log(`🔗 Calling GAS: ${action}`, params);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ GAS response for ${action}:`, data);
    
    return data;
  } catch (error) {
    console.error(`❌ GAS call failed for ${action}:`, error);
    throw error;
  }
}

// --- Minimal global auth API ---
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
  await signOut(auth);
}

async function sfpReset(email) {
  await sendPasswordResetEmail(auth, email);
}

// Called after login/signup to pull role from GAS
async function sfpAfterAuth(user) {
  try {
    console.log('🔑 Fetching user role from GAS...');
    
    // Use our enhanced GAS call
    const data = await callGASEndpoint('getRole');
    
    if (data && data.role) {
      localStorage.setItem("sfpRole", data.role);
      localStorage.setItem("sfpOrgId", data.orgId || "");
      console.log(`✅ Role fetched: ${data.role}, Org: ${data.orgId || 'None'}`);
    } else {
      console.warn('⚠️ No role data returned from GAS, defaulting to Guest');
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

// --- Enhanced API functions for easier use ---
async function sfpLookupDriver(driverId) {
  return await callGASEndpoint('getDriverData', { id: driverId });
}

async function sfpLookupVehicle(vehicleId) {
  return await callGASEndpoint('getVehicleData', { id: vehicleId });
}

async function sfpSubmitInspection(inspectionData) {
  // For inspection submission, we need to use POST with JSON body
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(window.SFP_GAS_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        action: 'submitInspection',
        email: user.email,
        ...inspectionData
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Inspection submitted:', data);
    return data;
  } catch (error) {
    console.error('❌ Inspection submission failed:', error);
    throw error;
  }
}

// Expose legacy helper API (unchanged but enhanced)
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
  // Enhanced API functions
  lookupDriver: sfpLookupDriver,
  lookupVehicle: sfpLookupVehicle,
  submitInspection: sfpSubmitInspection,
  callGAS: callGASEndpoint
};

// ---- Enhanced SFP object with GAS integration ----
export let SFP = { 
  user: null, 
  roles: [], 
  scopes: { ailIds: [], siteIds: [] },
  gasConnected: false
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    SFP = { 
      user: null, 
      roles: [], 
      scopes: { ailIds: [], siteIds: [] },
      gasConnected: false
    };
    document.dispatchEvent(new CustomEvent("sfp-auth-changed", { detail: SFP }));
    return;
  }

  console.log('🔄 Auth state changed, updating SFP object...');

  // Try to get roles from Firebase custom claims first
  let roles = [];
  try {
    const token = await user.getIdTokenResult(true);
    roles = Array.isArray(token.claims?.roles) ? token.claims.roles : [];
    console.log('🎭 Firebase roles:', roles);
  } catch (e) {
    console.warn('⚠️ Could not fetch Firebase custom claims:', e);
  }

  // If no Firebase roles, try to determine from GAS role
  if (roles.length === 0) {
    const gasRole = sfpGetCurrentRole();
    console.log('🎭 GAS role:', gasRole);
    
    // Map GAS roles to array format
    if (gasRole && gasRole !== 'Guest') {
      switch (gasRole.toLowerCase()) {
        case 'admin':
          roles = ['admin'];
          break;
        case 'ail inspector':
          roles = ['inspector', 'ail'];
          break;
        case 'ail manager':
          roles = ['ail_manager', 'inspector'];
          break;
        case 'driver':
          roles = ['driver'];
          break;
        default:
          roles = ['guest'];
      }
    }
  }

  // Try to pull scopes from Firestore (optional - may not exist yet)
  let scopes = { ailIds: [], siteIds: [] };
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const d = snap.data();
      scopes = d.scopes || scopes;
      console.log('📊 Firestore scopes:', scopes);
    }
  } catch (e) {
    console.warn("⚠️ Failed to load Firestore scopes (may not exist yet):", e);
  }

  // Test GAS connection
  let gasConnected = false;
  try {
    await callGASEndpoint('getRole');
    gasConnected = true;
    console.log('✅ GAS connection verified');
  } catch (e) {
    console.warn('⚠️ GAS connection failed:', e);
  }

  SFP = { user, roles, scopes, gasConnected };
  document.dispatchEvent(new CustomEvent("sfp-auth-changed", { detail: SFP }));
  
  console.log('🎉 SFP object updated:', SFP);
});

// Enhanced global test function
window.testSFPAuth = async function() {
  console.log('🧪 Testing SFP Auth system...');
  
  const user = auth.currentUser;
  if (!user) {
    console.error('❌ No user logged in');
    return false;
  }
  
  console.log('👤 Current user:', user.email);
  console.log('🎭 Current role:', sfpGetCurrentRole());
  console.log('🏢 Current org:', sfpGetOrgId());
  console.log('📊 SFP object:', SFP);
  
  try {
    // Test GAS connection
    const roleData = await callGASEndpoint('getRole');
    console.log('✅ GAS role check:', roleData);
    
    // Test driver lookup
    const driverData = await sfpLookupDriver('SFPD-001234');
    console.log('✅ Driver lookup test:', driverData);
    
    // Test vehicle lookup
    const vehicleData = await sfpLookupVehicle('SFPV-000001');
    console.log('✅ Vehicle lookup test:', vehicleData);
    
    console.log('🎉 All SFP Auth tests passed!');
    return true;
    
  } catch (error) {
    console.error('💥 SFP Auth test failed:', error);
    return false;
  }
};
