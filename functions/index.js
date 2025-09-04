// functions/index.js
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();

// 🔹 Neuen Nutzer anlegen
exports.createUser = onCall((request) => {
  return new Promise((resolve, reject) => {
    cors(request.rawRequest, request.rawResponse, async () => {
      if (!request.auth?.token?.admin) {
        reject(new HttpsError("permission-denied", "Nur Admins dürfen neue Nutzer anlegen."));
        return;
      }

      const { email, password, displayName } = request.data;

      try {
        const userRecord = await admin.auth().createUser({
          email,
          password,
          displayName: displayName || ""
        });
        resolve({ uid: userRecord.uid });
      } catch (err) {
        reject(new HttpsError("internal", err.message));
      }
    });
  });
});

// 🔹 Nutzer löschen
exports.deleteUser = onCall((request) => {
  return new Promise((resolve, reject) => {
    cors(request.rawRequest, request.rawResponse, async () => {
      if (!request.auth?.token?.admin) {
        reject(new HttpsError("permission-denied", "Nur Admins dürfen Nutzer löschen."));
        return;
      }

      const { uid } = request.data;

      try {
        await admin.auth().deleteUser(uid);
        resolve({ success: true });
      } catch (err) {
        reject(new HttpsError("internal", err.message));
      }
    });
  });
});

// 🔹 Adminrechte setzen oder entfernen
exports.setUserAdmin = onCall((request) => {
  return new Promise((resolve, reject) => {
    cors(request.rawRequest, request.rawResponse, async () => {
      if (!request.auth?.token?.admin) {
        reject(new HttpsError("permission-denied", "Nur Admins dürfen Adminrechte vergeben."));
        return;
      }

      const { uid, makeAdmin } = request.data;

      try {
        await admin.auth().setCustomUserClaims(uid, { admin: makeAdmin });
        resolve({ success: true });
      } catch (err) {
        reject(new HttpsError("internal", err.message));
      }
    });
  });
});

// 🔹 Nutzer aktualisieren (Name etc.)
exports.updateUser = onCall((request) => {
  return new Promise((resolve, reject) => {
    cors(request.rawRequest, request.rawResponse, async () => {
      if (!request.auth?.token?.admin) {
        reject(new HttpsError("permission-denied", "Nur Admins dürfen Nutzer ändern."));
        return;
      }

      const { uid, displayName } = request.data;

      try {
        await admin.auth().updateUser(uid, { displayName });
        resolve({ success: true });
      } catch (err) {
        reject(new HttpsError("internal", err.message));
      }
    });
  });
});

// 🔹 Alle Nutzer auflisten
exports.listUsers = onCall((request) => {
  return new Promise((resolve, reject) => {
    cors(request.rawRequest, request.rawResponse, async () => {
      if (!request.auth?.token?.admin) {
        reject(new HttpsError("permission-denied", "Nur Admins dürfen Benutzer auflisten."));
        return;
      }

      try {
        const listUsersResult = await admin.auth().listUsers(1000);
        const users = listUsersResult.users.map((userRecord) => ({
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName || "",
          admin: userRecord.customClaims?.admin === true
        }));
        resolve({ users });
      } catch (err) {
        reject(new HttpsError("internal", err.message));
      }
    });
  });
});
