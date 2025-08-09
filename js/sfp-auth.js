// js/sfp-auth.js
window.SFPAuth = {
  isLoggedIn() {
    return !!localStorage.getItem("sfp_user");
  },
  user() {
    try { return JSON.parse(localStorage.getItem("sfp_user") || "{}"); } catch { return {}; }
  },
  hasRole(role) {
    const u = this.user();
    return Array.isArray(u.roles) && u.roles.includes(role);
  },
  logout() {
    localStorage.removeItem("sfp_user");
    location.href = "/login.html";
  }
};
