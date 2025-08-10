// /js/account-indicator.js
// Expect: localStorage.sfp_session = JSON.stringify({ token:"...", name:"Your Name", avatarUrl:"" })
(() => {
  const el = document.getElementById('account-indicator');
  if (!el) return;

  let session = {};
  try { session = JSON.parse(localStorage.getItem('sfp_session') || '{}'); } catch {}

  const isLoggedIn = !!session.token;
  const name = session.name || 'Account';
  const avatarUrl = session.avatarUrl || '';

  if (!isLoggedIn) return;

  el.href = "/account.html";
  el.title = name;

  if (avatarUrl) {
    el.innerHTML = `<img src="${avatarUrl}" alt="${name}" class="h-8 w-8 rounded-full object-cover">`;
  } else {
    el.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12a5 5 0 100-10 5 5 0 000 10z"/>
        <path fill-rule="evenodd" d="M2 20.25A7.75 7.75 0 0115.5 15h-7A6.5 6.5 0 002 21.5v-1.25z" clip-rule="evenodd"/>
      </svg>`;
  }
})();
