// functions/index.js
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

// 🔹 Neuen Nutzer anlegen
exports.createUser = onCall(async (request) => {
  console.log("📥 createUser aufgerufen:", request.data);

  if (!request.auth?.token?.admin) {
    console.log("⛔ Zugriff verweigert (kein Admin) bei createUser");
    throw new HttpsError("permission-denied", "Nur Admins dürfen neue Nutzer anlegen.");
  }

  const { email, password, displayName } = request.data;

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || ""
    });
    console.log("✅ Nutzer angelegt:", userRecord.uid);
    return { uid: userRecord.uid };
  } catch (err) {
    console.error("❌ Fehler bei createUser:", err);
    throw new HttpsError("internal", err.message);
  }
});

// 🔹 Nutzer löschen
exports.deleteUser = onCall(async (request) => {
  console.log("📥 deleteUser aufgerufen:", request.data);

  if (!request.auth?.token?.admin) {
    console.log("⛔ Zugriff verweigert (kein Admin) bei deleteUser");
    throw new HttpsError("permission-denied", "Nur Admins dürfen Nutzer löschen.");
  }

  const { uid } = request.data;

  try {
    await admin.auth().deleteUser(uid);
    console.log("✅ Nutzer gelöscht:", uid);
    return { success: true };
  } catch (err) {
    console.error("❌ Fehler bei deleteUser:", err);
    throw new HttpsError("internal", err.message);
  }
});

// 🔹 Adminrechte setzen oder entfernen
exports.setUserAdmin = onCall(async (request) => {
  console.log("📥 setUserAdmin aufgerufen:", request.data);

  if (!request.auth?.token?.admin) {
    console.log("⛔ Zugriff verweigert (kein Admin) bei setUserAdmin");
    throw new HttpsError("permission-denied", "Nur Admins dürfen Adminrechte vergeben.");
  }

  const { uid, makeAdmin } = request.data;

  try {
    await admin.auth().setCustomUserClaims(uid, { admin: makeAdmin });
    console.log(`✅ Adminrechte ${makeAdmin ? "gesetzt" : "entfernt"} für`, uid);
    return { success: true };
  } catch (err) {
    console.error("❌ Fehler bei setUserAdmin:", err);
    throw new HttpsError("internal", err.message);
  }
});

// 🔹 Nutzer aktualisieren (Name etc.)
exports.updateUser = onCall(async (request) => {
  console.log("📥 updateUser aufgerufen:", request.data);

  if (!request.auth?.token?.admin) {
    console.log("⛔ Zugriff verweigert (kein Admin) bei updateUser");
    throw new HttpsError("permission-denied", "Nur Admins dürfen Nutzer ändern.");
  }

  const { uid, displayName } = request.data;

  try {
    await admin.auth().updateUser(uid, { displayName });
    console.log("✅ Nutzer aktualisiert:", uid);
    return { success: true };
  } catch (err) {
    console.error("❌ Fehler bei updateUser:", err);
    throw new HttpsError("internal", err.message);
  }
});

// 🔹 Alle Nutzer auflisten
exports.listUsers = onCall(async (request) => {
  console.log("📥 listUsers wurde aufgerufen");

  if (!request.auth?.token?.admin) {
    console.log("⛔ Zugriff verweigert – kein Admin bei listUsers");
    throw new HttpsError("permission-denied", "Nur Admins dürfen Benutzer auflisten.");
  }

  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    console.log(`✅ ${listUsersResult.users.length} Nutzer gefunden`);

    const users = listUsersResult.users.map((userRecord) => ({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName || "",
      admin: userRecord.customClaims?.admin === true
    }));

    return { users };
  } catch (err) {
    console.error("❌ Fehler in listUsers:", err);
    throw new HttpsError("internal", err.message);
  }
});
