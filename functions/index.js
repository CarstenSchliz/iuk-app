const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();
const db = admin.firestore();

const REGION = "europe-west3";

// ===== Rollen-Definition =====
const ALLOWED_ROLES = new Set(["admin", "gruppenleiter", "helfer", "anwärter"]);

function normalizeRoles(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.filter((r) => ALLOWED_ROLES.has(r));
  }
  if (typeof input === "string") {
    return input.split(",").map((s) => s.trim()).filter((r) => ALLOWED_ROLES.has(r));
  }
  return [];
}

function buildClaims(roles) {
  const claims = {};
  for (const r of ALLOWED_ROLES) {
    claims[r] = roles.includes(r);
  }
  claims.roles = roles;
  claims.admin = roles.includes("admin");
  return claims;
}

// ===== Middleware: prüfen ob Aufrufer Admin/GL =====
async function requireAdminOrGL(req) {
  const authHeader = req.headers.authorization || "";
  const m = authHeader.match(/^Bearer (.+)$/i);
  if (!m) {
    const e = new Error("Kein Bearer-Token übermittelt");
    e.statusCode = 401;
    throw e;
  }

  const idToken = m[1];
  const decoded = await admin.auth().verifyIdToken(idToken);

  if (!(decoded.admin || decoded.gruppenleiter)) {
    const e = new Error("Nicht berechtigt (Admin oder Gruppenleiter erforderlich)");
    e.statusCode = 403;
    throw e;
  }
  return decoded;
}

// ===== Helper für CORS-Handler =====
function handleRequest(handler) {
  return (req, res) => {
    cors(req, res, async () => {
      try {
        const caller = await requireAdminOrGL(req);
        await handler(req, res, caller);
      } catch (err) {
        console.error("❌ Fehler:", err);
        res.status(err.statusCode || 500).json({ error: err.message || String(err) });
      }
    });
  };
}

// ===== Auth Trigger =====

// User anlegen → Firestore + Claims
exports.onAuthCreate = functions.region(REGION).auth.user().onCreate(async (user) => {
  try {
    const defaultRoles = ["anwärter"];

    await db.collection("users").doc(user.uid).set(
      {
        displayName: user.displayName || "",
        email: user.email || "",
        roles: defaultRoles,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await admin.auth().setCustomUserClaims(user.uid, buildClaims(defaultRoles));

    console.log("✅ Neuer User mit Standardrolle gespeichert:", user.uid);
  } catch (err) {
    console.error("❌ Fehler in onAuthCreate:", err);
  }
});

// User löschen → Firestore löschen
exports.onAuthDelete = functions.region(REGION).auth.user().onDelete(async (user) => {
  try {
    await db.collection("users").doc(user.uid).delete();
    console.log("🗑️ User-Dokument entfernt:", user.uid);
  } catch (err) {
    console.error("❌ Fehler in onAuthDelete:", err);
  }
});

// ===== HTTP-Endpoints =====

// Nutzer erstellen
exports.createUser = functions.region(REGION).https.onRequest(handleRequest(async (req, res) => {
  const { email, password, displayName } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "E-Mail und Passwort erforderlich" });
  }

  const userRecord = await admin.auth().createUser({
    email,
    password,
    displayName: displayName || "",
  });

  // Firestore-Eintrag
  await db.collection("users").doc(userRecord.uid).set({
    displayName: displayName || "",
    email,
    roles: ["anwärter"],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Default Claims
  await admin.auth().setCustomUserClaims(userRecord.uid, buildClaims(["anwärter"]));

  res.json({ uid: userRecord.uid });
}));

// Nutzer löschen
exports.deleteUser = functions.region(REGION).https.onRequest(handleRequest(async (req, res) => {
  const { uid } = req.body || {};
  if (!uid) return res.status(400).json({ error: "UID erforderlich" });

  await admin.auth().deleteUser(uid);
  await db.collection("users").doc(uid).delete();

  res.json({ success: true });
}));

// Nutzer aktualisieren (Name + Rollen)
exports.updateUser = functions.region(REGION).https.onRequest(handleRequest(async (req, res) => {
  const { uid, displayName, roles: incomingRoles } = req.body || {};
  if (!uid) return res.status(400).json({ error: "UID erforderlich" });

  const roles = normalizeRoles(incomingRoles);

  // Firestore aktualisieren
  await db.collection("users").doc(uid).set(
    {
      displayName: displayName || "",
      roles,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Auth aktualisieren
  if (displayName) {
    await admin.auth().updateUser(uid, { displayName });
  }
  await admin.auth().setCustomUserClaims(uid, buildClaims(roles));

  res.json({ success: true, roles });
}));

// Nutzer auflisten
exports.listUsers = functions.region(REGION).https.onRequest(handleRequest(async (req, res) => {
  const listUsersResult = await admin.auth().listUsers(1000);
  const users = [];

  for (const ur of listUsersResult.users) {
    const doc = await db.collection("users").doc(ur.uid).get();
    const data = doc.exists ? doc.data() : {};
    users.push({
      uid: ur.uid,
      email: ur.email,
      displayName: ur.displayName || data.displayName || "",
      roles: data.roles || [],
    });
  }

  res.json({ users });
}));
