// /js/sfp-api.js
window.SFP_API_BASE = "https://script.google.com/macros/s/AKfycbwEfKashz3fp3wzRG5D6Go2G2PxXCyrg_0gFYMERRAzSzYuonIQNhmzZI5sy2lVFENNXg/exec";

// Helper to get current Firebase ID token (if signed in)
async function sfpGetIdToken() {
  try {
    if (!window.SFPAuth || typeof SFPAuth.user !== "function") return null;
    const user = SFPAuth.user();
    if (!user || !user.getIdToken) return null;
    return await user.getIdToken(/* forceRefresh */ false);
  } catch (_) {
    return null;
  }
}

async function sfpApi(route, payload, { requireAuth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  const idToken = await sfpGetIdToken();
  if (idToken) headers["X-Firebase-ID-Token"] = idToken;
  else if (requireAuth) {
    throw new Error("Not signed in");
  }

  const res = await fetch(window.SFP_API_BASE, {
    method: "POST",
    headers,
    body: JSON.stringify(Object.assign({ route }, payload || {}))
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(data.error || "API error");
  return data;
}

window.sfpApi = sfpApi;
