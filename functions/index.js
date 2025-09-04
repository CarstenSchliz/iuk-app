// functions/index.js
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();

// Hilfsfunktion: CORS + Fehlerbehandlung
function handleRequest(handler) {
  return (req, res) => {
    cors(req, res, async () => {
      try {
        await handler(req, res);
      } catch (err) {
        console.error("❌ Fehler:", err);
        res.status(500).json({ error: err.message });
      }
    });
  };
}

// 🔹 Neuen Nutzer anlegen
exports.createUser = onRequest(handleRequest(async (req, res) => {
  const { email, password, displayName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "E-Mail und Passwort erforderlich" });
  }

  const userRecord = await admin.auth().createUser({
    email,
    password,
    displayName: displayName || ""
  });

  res.json({ uid: userRecord.uid });
}));

// 🔹 Nutzer löschen
exports.deleteUser = onRequest(handleRequest(async (req, res) => {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: "UID erforderlich" });

  await admin.auth().deleteUser(uid);
  res.json({ success: true });
}));

// 🔹 Adminrechte setzen oder entfernen
exports.setUserAdmin = onRequest(handleRequest(async (req, res) => {
  const { uid, makeAdmin } = req.body;
  if (!uid) return res.status(400).json({ error: "UID erforderlich" });

  await admin.auth().setCustomUserClaims(uid, { admin: makeAdmin });
  res.json({ success: true });
}));

// 🔹 Nutzer aktualisieren
exports.updateUser = onRequest(handleRequest(async (req, res) => {
  const { uid, displayName } = req.body;
  if (!uid) return res.status(400).json({ error: "UID erforderlich" });

  await admin.auth().updateUser(uid, { displayName });
  res.json({ success: true });
}));

// 🔹 Alle Nutzer auflisten
exports.listUsers = onRequest(handleRequest(async (req, res) => {
  const listUsersResult = await admin.auth().listUsers(1000);
  const users = listUsersResult.users.map((userRecord) => ({
    uid: userRecord.uid,
    email: userRecord.email,
    displayName: userRecord.displayName || "",
    admin: userRecord.customClaims?.admin === true
  }));
  res.json({ users });
}));
