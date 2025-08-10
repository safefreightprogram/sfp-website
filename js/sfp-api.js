// /js/sfp-api.js
async function withAuthHeaders(headers = {}) {
  const t = await window.SFPAuth.getIdToken().catch(() => null);
  return {
    "Content-Type": "application/json",
    ...(t ? { "Authorization": `Bearer ${t}` } : {}),
    ...headers
  };
}

async function request(url, { method = "GET", body = undefined, headers = {} } = {}, _retry = false) {
  const res = await fetch(url, {
    method,
    headers: await withAuthHeaders(headers),
    body: body ? JSON.stringify(body) : undefined,
    credentials: "omit"
  });

  if (res.status === 401 && !_retry) {
    await window.SFPAuth.getIdToken(true).catch(() => null);
    return request(url, { method, body, headers }, true);
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${txt}`);
  }

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

// Convenience helpers
async function getJson(url) { return request(url, { method: "GET" }); }
async function postJson(url, body) { return request(url, { method: "POST", body }); }

window.SFPApi = { request, getJson, postJson };

// Configure these in your page (or header)
// window.SFP_GAS_BASE = "https://script.google.com/macros/s/XXXXX/exec";
// window.SFP_ROLES_URL = `${window.SFP_GAS_BASE}?action=getRole`;
