// Unified Auth System for SFP
const SFPAuth = (function() {
  // CONFIG - UPDATE THIS LINE WITH YOUR GAS URL
  const GAS_URL = 'YOUR_GAS_DEPLOYMENT_URL_HERE'; // <-- PASTE YOUR GAS URL HERE
  
  const firebaseConfig = {
    apiKey: "AIzaSyBURlJUicOTobRLghN2RyEZfXEZvU_uiYU",
    authDomain: "safe-freight-program.firebaseapp.com",
    projectId: "safe-freight-program"
  };

  let app, auth, currentUser = null, currentRole = 'Guest';

  // Initialize Firebase
  async function init() {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getAuth, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    
    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      if (user) {
        await fetchRole();
        enforcePageAccess();
      } else if (requiresAuth()) {
        window.location.href = '/login.html?next=' + encodeURIComponent(location.pathname);
      }
      updateUI();
    });
  }

  // Fetch role from GAS
  async function fetchRole() {
    if (!currentUser) return;
    try {
      const res = await fetch(`${GAS_URL}?action=getRole&email=${currentUser.email}`);
      const data = await res.json();
      currentRole = data.role || 'Guest';
      localStorage.setItem('sfpRole', currentRole);
    } catch (e) {
      console.error('Role fetch failed:', e);
      currentRole = localStorage.getItem('sfpRole') || 'Guest';
    }
  }

  // Check page requirements
  function requiresAuth() {
    return document.body.dataset.requiresAuth === 'true';
  }

  function requiresRole() {
    return document.body.dataset.requiresRole || '';
  }

  // Enforce access
  function enforcePageAccess() {
    const required = requiresRole().toLowerCase();
    if (!required) return;
    
    const allowed = {
      'admin': ['admin'],
      'inspector': ['admin', 'ail inspector', 'inspector'],
      'ail': ['admin', 'ail inspector', 'inspector']
    };
    
    if (allowed[required] && !allowed[required].includes(currentRole.toLowerCase())) {
      window.location.href = '/no-access.html';
    }
  }

  // Update UI elements
  function updateUI() {
    // Update account indicator
    const indicator = document.getElementById('account-indicator');
    if (indicator) {
      if (currentUser) {
        indicator.innerHTML = `
          <div class="relative">
            <button onclick="SFPAuth.toggleMenu()" class="bg-white text-blue-900 px-3 py-1 rounded-full text-sm">
              ${currentUser.email.split('@')[0]}
            </button>
            <div id="auth-menu" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50">
              <div class="py-1">
                <div class="px-4 py-2 text-sm text-gray-700">Role: ${currentRole}</div>
                <hr>
                <a href="/account.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Account</a>
                ${currentRole.toLowerCase().includes('admin') ? '<a href="/admin-portal.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Admin Portal</a>' : ''}
                ${currentRole.toLowerCase().includes('inspector') || currentRole.toLowerCase().includes('ail') ? '<a href="/ail-portal.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">AIL Portal</a>' : ''}
                <hr>
                <button onclick="SFPAuth.logout()" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">Logout</button>
              </div>
            </div>
          </div>
        `;
      } else {
        indicator.innerHTML = '<a href="/login.html" class="text-white hover:underline text-sm">Login</a>';
      }
    }
    
    // Show/hide role-specific elements
    document.querySelectorAll('[data-requires-role]').forEach(el => {
      const required = el.dataset.requiresRole.toLowerCase();
      const show = currentRole.toLowerCase().includes(required) || 
                   (required === 'ail' && currentRole.toLowerCase().includes('inspector'));
      el.style.display = show ? '' : 'none';
    });
  }

  // Public methods
  return {
    init,
    async login(email, password) {
      const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
      await signInWithEmailAndPassword(auth, email, password);
      await fetchRole();
      return currentUser;
    },
    async logout() {
      const { signOut } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
      localStorage.clear();
      await signOut(auth);
      window.location.href = '/';
    },
    toggleMenu() {
      const menu = document.getElementById('auth-menu');
      if (menu) menu.classList.toggle('hidden');
    },
    getUser: () => currentUser,
    getRole: () => currentRole,
    callGAS: async (action, params = {}) => {
      const url = new URL(GAS_URL);
      url.searchParams.set('action', action);
      url.searchParams.set('email', currentUser?.email || '');
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
      const res = await fetch(url);
      return res.json();
    }
  };
})();

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => SFPAuth.init());
window.SFPAuth = SFPAuth;
