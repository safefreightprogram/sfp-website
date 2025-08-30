export async function onRequest(context) {
  const { request, env } = context;

  // --- CORS helper (restrict to prod + preview domains if you want) ---
  const allowOrigin = (() => {
    const origin = request.headers.get("Origin") || "";
    const ok = [
      "https://www.safefreightprogram.com",
      "https://safefreightprogram.com",
      // add your preview domain if needed, e.g.:
      // "https://*.pages.dev"
    ];
    return ok.includes(origin) ? origin : "https://www.safefreightprogram.com";
  })();

  const corsHeaders = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };

  // --- Preflight (if browser ever sends one) ---
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }

  // --- Read incoming body and content-type ---
  const contentType = request.headers.get("Content-Type") || "application/x-www-form-urlencoded";
  const bodyText = await request.text();

  // --- GAS endpoint: set in CF Pages env var GAS_NEWSLETTER_URL (recommended) ---
  const gasUrl = env.GAS_NEWSLETTER_URL 
              || "https://script.google.com/macros/s/AKfycbyBUEiJWPmr1ClWvc9uAQPUJ7T2BIOjlofoJ00MFJsWwtrKwn6oGM3KHoGbWN3q5i9Hxg/exec";

  // --- Server-to-server fetch to GAS ---
  const upstream = await fetch(gasUrl, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: bodyText,
  });

  const upstreamBody = await upstream.text();
  const ct = upstream.headers.get("content-type") || "application/json; charset=utf-8";

  // --- Return to browser with the CORS headers added ---
  return new Response(upstreamBody, {
    status: upstream.status,
    headers: { ...corsHeaders, "Content-Type": ct, "Cache-Control": "no-store" },
  });
}
