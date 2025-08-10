<script>
(function(){
  function applyGuards() {
    const role = (localStorage.getItem("sfpRole") || "Guest").toLowerCase();
    document.querySelectorAll("[data-requires-role]").forEach(el => {
      const allowed = el.getAttribute("data-requires-role")
        .split(",")
        .map(r => r.trim().toLowerCase());
      const ok = allowed.includes(role);
      el.classList.toggle("hidden", !ok);
      el.setAttribute("aria-hidden", String(!ok));
    });
  }

  window.addEventListener("sfp-auth-changed", applyGuards);
  document.addEventListener("DOMContentLoaded", applyGuards);
})();
</script>
