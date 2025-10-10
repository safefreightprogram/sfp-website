// functions/config.js
export async function onRequest(context) {
  const url = context.env.GAS_NEWSLETTER_EXEC || "";
  return new Response(
    JSON.stringify({ gasNewsletterExec: url }),
    {
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store, no-cache, must-revalidate"
      }
    }
  );
}
