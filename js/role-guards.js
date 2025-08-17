// /js/role-guard.js
// Purpose: Enforce role-based access at page level and hide gated UI elements.
// Works alongside /js/page-guard.js (login requirement).
//
// How it works:
// - Page-level: add data-requires-role="admin" (or "ail" / "inspector") to <body>
//   Example: <body data-requires-auth="true" data-requires-role="admin">
// - Element-level: add data-requires-role="admin" to any nav/button/link to auto-hide if the user lacks that role.
//   Example: <a href="/admin-portal.html" data-requires-role="admin">Admin</a>
//
// Behaviour:
// - If the page requires a role and the current user doesn't match, user is redirected to /account.html with context.
// - Elements with a role requirement are toggled hidden/visible based on current role.
// - Reacts in real-time to login/logout/role changes via `sfp-auth-changed`.

(function () {
  const ROLE_ATTR = "data-requires-role";

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function getCurrentRole() {
    try {
      if (window.SFPAuth && typeof SFPAuth.role === "function") {
        return SFPAuth.role() || "Guest";
      }
    } catch (e) {}
    return "Guest";
  }

  function pageRequiredRole() {
    const v = document.body && document.body.getAttribute(ROLE_ATTR);
    return v ? v.trim().toLowerCase() : "";
  }

  function roleMatches(required, current) {
    if (!required) return true; // nothing required
    if (!current) return false;
    return String(current).toLowerCase() === String(required).toLowerCase();
  }

  function redirectForRole(requiredRole) {
    const here = encodeURIComponent(window.location.pathname + window.location.search);
    const need = encodeURIComponent(requiredRole || "");
    const url = `/account.html?denied=role${need ? `&need=${need}` : ""}&next=${here}`;
    window.location.replace(url);
  }

  function enforceRoles() {
    const currentRole = getCurrentRole();
    const requiredPageRole = pageRequiredRole();

    // Page-level enforcement
    if (requiredPageRole && !roleMatches(requiredPageRole, currentRole)) {
      redirectForRole(requiredPageRole);
      return; // bail; page is not permitted
    }

    // Element-level gating (hide/show)
    document.querySelectorAll("[" + ROLE_ATTR + "]").forEach((el) => {
      const req = (el.getAttribute(ROLE_ATTR) || "").toLowerCase();
      if (!roleMatches(req, currentRole)) {
        el.classList.add("hidden");
        el.setAttribute("aria-hidden", "true");
        // If it's a link, also neutralise focus/tab-stop
        if (el.tagName === "A" || el.tabIndex >= 0) el.tabIndex = -1;
      } else {
        el.classList.remove("hidden");
        el.removeAttribute("aria-hidden");
        if (el.tagName === "A") el.removeAttribute("tabindex");
      }
    });
  }

  function bindRealtime() {
    window.addEventListener("sfp-auth-changed", enforceRoles);
  }

  ready(() => {
    if (!window.SFPAuth) {
      console.warn("[role-guard] SFPAuth not found. Ensure /js/sfp-auth.js loads before this file.");
    }
    enforceRoles();
    bindRealtime();
  });
})();
