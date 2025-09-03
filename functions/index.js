const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// 🔹 Neuen Nutzer anlegen
exports.createUser = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError("permission-denied", "Nur Admins dürfen neue Nutzer anlegen.");
  }

  const { email, password, displayName } = data;

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || ""
    });
    return { success: true, uid: userRecord.uid };
  } catch (err) {
    throw new functions.https.HttpsError("internal", err.message);
  }
});

// 🔹 Nutzer löschen
exports.deleteUser = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError("permission-denied", "Nur Admins dürfen Nutzer löschen.");
  }

  const { uid } = data;

  try {
    await admin.auth().deleteUser(uid);
    return { success: true };
  } catch (err) {
    throw new functions.https.HttpsError("internal", err.message);
  }
});

// 🔹 Adminrechte setzen oder entfernen
exports.setUserAdmin = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError("permission-denied", "Nur Admins dürfen Adminrechte vergeben.");
  }

  const { uid, makeAdmin } = data;

  try {
    await admin.auth().setCustomUserClaims(uid, { admin: makeAdmin });
    return { success: true };
  } catch (err) {
    throw new functions.https.HttpsError("internal", err.message);
  }
});

// 🔹 Alle Nutzer auflisten
exports.listUsers = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError("permission-denied", "Nur Admins dürfen Benutzer auflisten.");
  }

  try {
    const maxResults = 1000; // max. Anzahl Nutzer pro Aufruf
    const listUsersResult = await admin.auth().listUsers(maxResults);
    const users = listUsersResult.users.map(userRecord => ({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName || "",
      admin: userRecord.customClaims && userRecord.customClaims.admin === true
    }));
    return { users };
  } catch (err) {
    throw new functions.https.HttpsError("internal", err.message);
  }
});

// 🔹 Benutzer aktualisieren (z. B. Name ändern)
exports.updateUser = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError("permission-denied", "Nur Admins dürfen Nutzer bearbeiten.");
  }

  const { uid, displayName } = data;

  try {
    await admin.auth().updateUser(uid, {
      displayName: displayName || ""
    });
    return { success: true };
  } catch (err) {
    throw new functions.https.HttpsError("internal", err.message);
  }
});

// 🔹 Einmal-Funktion: Mich selbst zum Admin machen
exports.makeMeAdmin = functions.https.onCall(async (data, context) => {
  // 👉 Hier deine eigene UID eintragen
  const myUid = "O1utEGpjUQT9oF8V0b6qbeZbsN72";

  try {
    await admin.auth().setCustomUserClaims(myUid, { admin: true });
    return { success: true, message: "✅ Nutzer ist jetzt Admin" };
  } catch (err) {
    throw new functions.https.HttpsError("internal", err.message);
  }
});
