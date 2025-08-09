// js/sfp-auth.js
window.SFPAuth = {
  isLoggedIn() {
    // Replace with real session/JWT check
    // e.g. return !!localStorage.getItem("sfp_session");
    return !!localStorage.getItem("sfp_user");
  },
  hasRole(role) {
    try {
      const raw = localStorage.getItem("sfp_user");
      if (!raw) return false;
      const user = JSON.parse(raw);
      return Array.isArray(user.roles) && user.roles.includes(role);
    } catch {
      return false;
    }
  }
};
