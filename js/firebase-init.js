<!-- load once in header.html, before other SFP scripts -->
<script src="https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.3/firebase-auth-compat.js"></script>
<script>
  // /js/firebase-init.js  (inline or external file)
  window.SFP = window.SFP || {};
  SFP.firebaseApp = firebase.initializeApp({
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
  });
  SFP.auth = firebase.auth();
</script>
