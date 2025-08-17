// functions/index.js
// Node 18 runtime. Deploy with: firebase deploy --only functions:assignUserAccess
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

/**
 * Callable: assignUserAccess
 * Usage (admin only):
 *   await httpsCallable(getFunctions(), "assignUserAccess")({
 *     email: "user@example.com",
 *     addRoles: ["inspector"],
 *     removeRoles: [],
 *     scopes: { ailIds: ["AIL-0001"], siteIds: [] }
 *   });
 */
exports.assignUserAccess = functions.https.onCall(async (data, context) => {
  // Restrict to admins
  if (!context.auth?.token?.roles?.includes("admin")) {
    throw new functions.https.HttpsError("permission-denied", "Admin only.");
  }

  const { email, addRoles = [], removeRoles = [], scopes = {} } = data || {};
  if (!email) throw new functions.https.HttpsError("invalid-argument", "email required");

  // Find user by email
  const user = await admin.auth().getUserByEmail(email);

  // Merge roles (stored in custom claims)
  const currentClaims = user.customClaims || {};
  const currentRoles = new Set(Array.isArray(currentClaims.roles) ? currentClaims.roles : []);
  addRoles.forEach(r => currentRoles.add(r));
  removeRoles.forEach(r => currentRoles.delete(r));
  const roles = Array.from(currentRoles);

  await admin.auth().setCustomUserClaims(user.uid, { ...currentClaims, roles });

  // Persist profile & scopes
  const userDocRef = admin.firestore().collection("users").doc(user.uid);
  await userDocRef.set(
    {
      email,
      roles,
      scopes: scopes || {},
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  return { ok: true, uid: user.uid, roles };
});
