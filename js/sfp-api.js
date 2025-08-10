// /js/sfp-api.js
window.SFP_API_BASE = "https://script.google.com/macros/s/AKfycbwEfKashz3fp3wzRG5D6Go2G2PxXCyrg_0gFYMERRAzSzYuonIQNhmzZI5sy2lVFENNXg/exec";

async function sfpApi(route, payload) {
  const res = await fetch(window.SFP_API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.assign({ route }, payload || {}))
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "API error");
  return data;
}

window.sfpApi = sfpApi;
