// PASTE into /js/sfp-auth.js (or merge carefully).
// Loads roles (from custom claims) and scopes (from Firestore) into a global SFP object
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const auth = getAuth();
const db = getFirestore();

export let SFP = { user: null, roles: [], scopes: { ailIds: [], siteIds: [] } };

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    SFP = { user: null, roles: [], scopes: { ailIds: [], siteIds: [] } };
    document.dispatchEvent(new CustomEvent("sfp-auth-changed", { detail: SFP }));
    return;
  }

  const token = await user.getIdTokenResult(true);
  const roles = Array.isArray(token.claims?.roles) ? token.claims.roles : [];

  let scopes = { ailIds: [], siteIds: [] };
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const d = snap.data();
      scopes = d.scopes || scopes;
    }
  } catch(e){ console.warn("Failed to load scopes", e); }

  SFP = { user, roles, scopes };
  document.dispatchEvent(new CustomEvent("sfp-auth-changed", { detail: SFP }));
});
