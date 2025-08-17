// /js/role-gate.js
// Minimal helpers to gate UI elements and whole pages.
import { SFP } from "/js/sfp-auth.js";

function applyRoleAttributes() {
  document.querySelectorAll("[data-requires-role]").forEach(el => {
    const required = (el.getAttribute("data-requires-role") || "").split(/\s+/).filter(Boolean);
    const ok = (SFP.roles || []).some(r => required.includes(r));
    el.classList.toggle("hidden", !ok);
  });
}

export function guardPage(allowedRoles = []) {
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) return;
  const evaluate = () => {
    if (!SFP.user) return; // Wait until auth known
    const ok = (SFP.roles || []).some(r => allowedRoles.includes(r));
    if (!ok) window.location.href = "/login.html?next=" + encodeURIComponent(location.pathname);
  };
  evaluate();
  document.addEventListener("sfp-auth-changed", evaluate);
}

document.addEventListener("sfp-auth-changed", applyRoleAttributes);
