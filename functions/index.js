const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();

// 🔹 Neuen Nutzer anlegen
exports.createUser = onCall(async (request) => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError("permission-denied", "Nur Admins dürfen neue Nutzer anlegen.");
  }

  const { email, password, displayName } = request.data;

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || ""
    });
    return { uid: userRecord.uid };
  } catch (err) {
    throw new HttpsError("internal", err.message);
  }
});

// 🔹 Nutzer löschen
exports.deleteUser = onCall(async (request) => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError("permission-denied", "Nur Admins dürfen Nutzer löschen.");
  }

  const { uid } = request.data;

  try {
    await admin.auth().deleteUser(uid);
    return { success: true };
  } catch (err) {
    throw new HttpsError("internal", err.message);
  }
});

// 🔹 Adminrechte setzen oder entfernen
exports.setUserAdmin = onCall(async (request) => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError("permission-denied", "Nur Admins dürfen Adminrechte vergeben.");
  }

  const { uid, makeAdmin } = request.data;

  try {
    await admin.auth().setCustomUserClaims(uid, { admin: makeAdmin });
    return { success: true };
  } catch (err) {
    throw new HttpsError("internal", err.message);
  }
});

// 🔹 Nutzer aktualisieren (Name etc.)
exports.updateUser = onCall(async (request) => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError("permission-denied", "Nur Admins dürfen Nutzer ändern.");
  }

  const { uid, displayName } = request.data;

  try {
    await admin.auth().updateUser(uid, { displayName });
    return { success: true };
  } catch (err) {
    throw new HttpsError("internal", err.message);
  }
});

// 🔹 Alle Nutzer auflisten (CORS-fähig für GitHub Pages)
exports.listUsers = onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const listUsersResult = await admin.auth().listUsers(1000);
      const users = listUsersResult.users.map((userRecord) => ({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || "",
        admin: userRecord.customClaims?.admin === true,
      }));

      res.set("Access-Control-Allow-Origin", "*");
      res.status(200).send({ users });
    } catch (err) {
      console.error("❌ Fehler in listUsers:", err);
      res.status(500).send({ error: err.message });
    }
  });
});
