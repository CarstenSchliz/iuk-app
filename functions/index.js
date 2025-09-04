// functions/index.js
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();

// 🔹 Hilfsfunktion für CORS + Admincheck
function withCorsAndAdmin(handler) {
  return async (request) => {
    return new Promise((resolve, reject) => {
      cors(request.rawRequest, request.rawResponse, async () => {
        if (!request.auth?.token?.admin) {
          reject(new HttpsError("permission-denied", "Nur Admins dürfen diese Aktion ausführen."));
          return;
        }

        try {
          const result = await handler(request);
          resolve(result);
        } catch (err) {
          reject(new HttpsError("internal", err.message));
        }
      });
    });
  };
}

// 🔹 Neuen Nutzer anlegen
exports.createUser = onCall(
  withCorsAndAdmin(async (request) => {
    const { email, password, displayName } = request.data;
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || "",
    });
    return { uid: userRecord.uid };
  })
);

// 🔹 Nutzer löschen
exports.deleteUser = onCall(
  withCorsAndAdmin(async (request) => {
    const { uid } = request.data;
    await admin.auth().deleteUser(uid);
    return { success: true };
  })
);

// 🔹 Adminrechte setzen oder entfernen
exports.setUserAdmin = onCall(
  withCorsAndAdmin(async (request) => {
    const { uid, makeAdmin } = request.data;
    await admin.auth().setCustomUserClaims(uid, { admin: makeAdmin });
    return { success: true };
  })
);

// 🔹 Nutzer aktualisieren (Name etc.)
exports.updateUser = onCall(
  withCorsAndAdmin(async (request) => {
    const { uid, displayName } = request.data;
    await admin.auth().updateUser(uid, { displayName });
    return { success: true };
  })
);

// 🔹 Alle Nutzer auflisten
exports.listUsers = onCall(
  withCorsAndAdmin(async (_request) => {
    const listUsersResult = await admin.auth().listUsers(1000);
    const users = listUsersResult.users.map((userRecord) => ({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName || "",
      admin: userRecord.customClaims?.admin === true,
    }));
    return { users };
  })
);
