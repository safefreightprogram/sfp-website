<script>
window.SFP_API_BASE = "PASTE_YOUR_GAS_WEB_APP_URL_HERE"; // .../exec

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
</script>
