// functions/index.js
const { onRequest } = require("firebase-functions/v2/https");
const functionsV1 = require("firebase-functions/v1"); // Auth-Trigger (1st gen)
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

if (!admin.apps.length) {
  // Default-Initialisierung: nimmt automatisch das richtige Projekt & Credentials
  admin.initializeApp();
}
const db = admin.firestore();

// ===== optionales CORS/Fehler-Wrapper =====
const USE_AUTH = false;
function handleRequest(handler) {
  return (req, res) => {
    cors(req, res, async () => {
      try {
        if (USE_AUTH) await requireAdmin(req);
        await handler(req, res);
      } catch (err) {
        console.error("❌ Fehler:", err);
        res.status(err.statusCode || 500).json({ error: err.message || String(err) });
      }
    });
  };
}

async function requireAdmin(req) {
  const authHeader = req.headers.authorization || "";
  const m = authHeader.match(/^Bearer (.+)$/i);
  if (!m) {
    const e = new Error("Kein Bearer-Token übermittelt"); e.statusCode = 401; throw e;
  }
  const idToken = m[1];
  const decoded = await admin.auth().verifyIdToken(idToken);
  if (!decoded || !(decoded.admin || (Array.isArray(decoded.roles) && decoded.roles.includes("admin")))) {
    const e = new Error("Nicht berechtigt (Admin erforderlich)"); e.statusCode = 403; throw e;
  }
}

// ===== Rollen-Helpers =====
const ALLOWED_ROLES = new Set(["admin", "gruppenleiter", "helfer", "anwärter"]);

function normalizeRoles(input, existingClaims = {}) {
  let roles = [];
  if (input === undefined || input === null) {
    const fromArray = Array.isArray(existingClaims.roles) ? existingClaims.roles : [];
    const fromBooleans = Array.from(ALLOWED_ROLES).filter((r) => existingClaims[r] === true);
    roles = [...fromArray, ...fromBooleans];
  } else if (Array.isArray(input)) {
    roles = input;
  } else if (typeof input === "string") {
    roles = input.split(",").map((s) => s.trim()).filter(Boolean);
  } else if (typeof input === "object") {
    roles = Object.entries(input).filter(([k, v]) => v === true && ALLOWED_ROLES.has(k)).map(([k]) => k);
  }
  roles = roles.filter((r) => ALLOWED_ROLES.has(r));
  return Array.from(new Set(roles));
}

function buildClaimsWithRoles(existingClaims = {}, roles = []) {
  const claims = { ...existingClaims };
  for (const r of ALLOWED_ROLES) delete claims[r];
  claims.roles = roles;
  for (const r of ALLOWED_ROLES) claims[r] = roles.includes(r);
  claims.admin = roles.includes("admin");
  return claims;
}

// ===== v2 HTTP-Funktionen: explizit mit App Engine default Service Account laufen lassen =====
const RUN_OPTS = { region: "us-central1", serviceAccount: "iuk-app@appspot.gserviceaccount.com" };

// Neuen Nutzer anlegen
exports.createUser = onRequest(RUN_OPTS, handleRequest(async (req, res) => {
  const { email, password, displayName } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "E-Mail und Passwort erforderlich" });
  const userRecord = await admin.auth().createUser({ email, password, displayName: displayName || "" });
  res.json({ uid: userRecord.uid });
}));

// Nutzer löschen
exports.deleteUser = onRequest(RUN_OPTS, handleRequest(async (req, res) => {
  const { uid } = req.body || {};
  if (!uid) return res.status(400).json({ error: "UID erforderlich" });
  await admin.auth().deleteUser(uid);
  res.json({ success: true });
}));

// Admin setzen/entfernen
exports.setUserAdmin = onRequest(RUN_OPTS, handleRequest(async (req, res) => {
  const { uid, makeAdmin } = req.body || {};
  if (!uid) return res.status(400).json({ error: "UID erforderlich" });
  const user = await admin.auth().getUser(uid);
  const currentClaims = user.customClaims || {};
  let roles = normalizeRoles(undefined, currentClaims);
  roles = makeAdmin ? Array.from(new Set([...roles, "admin"])) : roles.filter((r) => r !== "admin");
  const newClaims = buildClaimsWithRoles(currentClaims, roles);
  await admin.auth().setCustomUserClaims(uid, newClaims);
  res.json({ success: true, roles });
}));

// Nutzer aktualisieren
exports.updateUser = onRequest(RUN_OPTS, handleRequest(async (req, res) => {
  const { uid, displayName, roles: incomingRoles } = req.body || {};
  if (!uid) return res.status(400).json({ error: "UID erforderlich" });
  if (typeof displayName === "string") await admin.auth().updateUser(uid, { displayName });
  if (incomingRoles !== undefined) {
    const user = await admin.auth().getUser(uid);
    const currentClaims = user.customClaims || {};
    const roles = normalizeRoles(incomingRoles, currentClaims);
    const newClaims = buildClaimsWithRoles(currentClaims, roles);
    await admin.auth().setCustomUserClaims(uid, newClaims);
    return res.json({ success: true, roles });
  }
  res.json({ success: true });
}));

// Nur Rollen setzen
exports.setUserRoles = onRequest(RUN_OPTS, handleRequest(async (req, res) => {
  const { uid, roles: incomingRoles } = req.body || {};
  if (!uid) return res.status(400).json({ error: "UID erforderlich" });
  const user = await admin.auth().getUser(uid);
  const currentClaims = user.customClaims || {};
  const roles = normalizeRoles(incomingRoles, currentClaims);
  const newClaims = buildClaimsWithRoles(currentClaims, roles);
  await admin.auth().setCustomUserClaims(uid, newClaims);
  res.json({ success: true, roles });
}));

// Alle Nutzer auflisten
exports.listUsers = onRequest(RUN_OPTS, handleRequest(async (req, res) => {
  const listUsersResult = await admin.auth().listUsers(1000);
  const users = listUsersResult.users.map((ur) => {
    const cc = ur.customClaims || {};
    const roles = normalizeRoles(undefined, cc);
    return { uid: ur.uid, email: ur.email, displayName: ur.displayName || "", admin: roles.includes("admin"), roles };
  });
  res.json({ users });
}));

// ===== Diagnose: WhoAmI (zeigt Projekt & Service Account, hilft bei NOT_FOUND) =====
exports.whoami = onRequest(RUN_OPTS, async (req, res) => {
  try {
    const email = await fetch("http://metadata/computeMetadata/v1/instance/service-accounts/default/email", {
      headers: { "Metadata-Flavor": "Google" },
    }).then(r => r.text()).catch(() => "unbekannt");
    res.json({
      projectFromEnv: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || "unbekannt",
      firebaseConfigSet: !!process.env.FIREBASE_CONFIG,
      serviceAccountEmail: email,
      nodeVersion: process.version,
      functionsGen: "v2",
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ===== Test: Firestore-Write aus v2 =====
exports.testWrite = onRequest(RUN_OPTS, async (req, res) => {
  try {
    await db.collection("users").doc("test123").set({ hello: "world", ts: new Date() }, { merge: true });
    console.log("✅ Test-Dokument geschrieben.");
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Fehler beim Test-Write:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// ===== Auth Trigger (1st gen) =====
exports.onAuthCreate = functionsV1.region("us-central1").auth.user().onCreate(async (user) => {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const userDoc = {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    createdAt: now,
    roles: ["anwärter"],
  };

  try {
    await db.collection("users").doc(user.uid).set(userDoc, { merge: true });
    console.log(`✅ Firestore-Dokument für ${user.uid} angelegt.`);
  } catch (err) {
    console.error("❌ Fehler beim Firestore-Write:", err);
  }

  try {
    await admin.auth().setCustomUserClaims(user.uid, buildClaimsWithRoles({}, ["anwärter"]));
    console.log(`✅ Claims für ${user.uid} gesetzt.`);
  } catch (err) {
    console.error("❌ Fehler beim Claims-Setzen:", err);
  }
});

exports.onAuthDelete = functionsV1.region("us-central1").auth.user().onDelete(async (user) => {
  try {
    await db.collection("users").doc(user.uid).delete();
    console.log(`✅ Firestore-Dokument für ${user.uid} gelöscht.`);
  } catch (err) {
    console.error("❌ Fehler beim Firestore-Löschen:", err);
  }
});
