const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();
const db = admin.firestore();

// ==== Region für alle Funktionen festlegen (eur3 = europe-west3) ====
const REGION = "europe-west3";

// ==== Sicherheit (optional) ====
const USE_AUTH = false;

function handleRequest(handler) {
  return (req, res) => {
    cors(req, res, async () => {
      try {
        if (USE_AUTH) {
          await requireAdmin(req);
        }
        await handler(req, res);
      } catch (err) {
        console.error("❌ Fehler:", err);
        const code = err.statusCode || 500;
        res.status(code).json({ error: err.message || String(err) });
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

// ==== Rollen-Setup ====
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

// ==== Auth Trigger (v1) ====

// User automatisch in Firestore anlegen
exports.onAuthCreate = functions.region(REGION).auth.user().onCreate(async (user) => {
  console.log("👤 Neuer User erstellt:", user.uid, user.email);

  try {
    const defaultRole = ["anwärter"];

    await db.collection("users").doc(user.uid).set(
      {
        displayName: user.displayName || "",
        email: user.email || "",
        roles: defaultRole,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await admin.auth().setCustomUserClaims(user.uid, {
      roles: defaultRole,
      anwärter: true,
      admin: false,
    });

    console.log("✅ Firestore-Dokument + Claims gesetzt:", user.uid);
  } catch (err) {
    console.error("❌ Fehler in onAuthCreate:", err);
  }
});

// User aus Firestore löschen
exports.onAuthDelete = functions.region(REGION).auth.user().onDelete(async (user) => {
  try {
    await db.collection("users").doc(user.uid).delete();
    console.log("🗑️ User aus Firestore gelöscht:", user.uid);
  } catch (err) {
    console.error("❌ Fehler in onAuthDelete:", err);
  }
});

// ==== HTTP-Endpoints ====

// Test-Write
exports.testWrite = functions.region(REGION).https.onRequest(async (req, res) => {
  try {
    const info = {
      GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
      GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
      FIREBASE_CONFIG: process.env.FIREBASE_CONFIG,
      adminAppProjectId: admin.app().options.projectId,
    };
    console.log("📌 ENV + Admin SDK Info:", info);

    await db.collection("users").doc("test123").set(
      {
        hello: "world",
        ts: new Date(),
      },
      { merge: true }
    );

    res.json({ success: true, info });
  } catch (err) {
    console.error("❌ Fehler beim Test-Write:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Neuen Nutzer anlegen
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

  res.json({ uid: userRecord.uid });
}));

// Nutzer löschen
exports.deleteUser = functions.region(REGION).https.onRequest(handleRequest(async (req, res) => {
  const { uid } = req.body || {};
  if (!uid) return res.status(400).json({ error: "UID erforderlich" });

  await admin.auth().deleteUser(uid);
  res.json({ success: true });
}));

// Admin setzen/entfernen
exports.setUserAdmin = functions.region(REGION).https.onRequest(handleRequest(async (req, res) => {
  const { uid, makeAdmin } = req.body || {};
  if (!uid) return res.status(400).json({ error: "UID erforderlich" });

  const user = await admin.auth().getUser(uid);
  const currentClaims = user.customClaims || {};
  let roles = normalizeRoles(undefined, currentClaims);

  if (makeAdmin) {
    if (!roles.includes("admin")) roles.push("admin");
  } else {
    roles = roles.filter((r) => r !== "admin");
  }

  const newClaims = buildClaimsWithRoles(currentClaims, roles);
  await admin.auth().setCustomUserClaims(uid, newClaims);
  res.json({ success: true, roles });
}));

// Nutzer aktualisieren
exports.updateUser = functions.region(REGION).https.onRequest(handleRequest(async (req, res) => {
  const { uid, displayName, roles: incomingRoles } = req.body || {};
  if (!uid) return res.status(400).json({ error: "UID erforderlich" });

  if (typeof displayName === "string") {
    await admin.auth().updateUser(uid, { displayName });
  }

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
exports.setUserRoles = functions.region(REGION).https.onRequest(handleRequest(async (req, res) => {
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
exports.listUsers = functions.region(REGION).https.onRequest(handleRequest(async (req, res) => {
  const listUsersResult = await admin.auth().listUsers(1000);
  const users = listUsersResult.users.map((ur) => {
    const cc = ur.customClaims || {};
    const roles = normalizeRoles(undefined, cc);
    return {
      uid: ur.uid,
      email: ur.email,
      displayName: ur.displayName || "",
      admin: roles.includes("admin"),
      roles,
    };
  });
  res.json({ users });
}));
