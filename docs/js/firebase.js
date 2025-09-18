// docs/js/firebase.js
// Firebase Setup & Auth-Funktionen

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword as fbUpdatePassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

import {
  getFunctions
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";

import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// === Firebase Config ===
const firebaseConfig = {
  apiKey: "AIzaSyDIuKwYoKQDyzy6qpmY2LGahJofZx6qnuw",
  authDomain: "iuk-app.firebaseapp.com",
  projectId: "iuk-app",
  storageBucket: "iuk-app.firebasestorage.app",
  messagingSenderId: "759014128178",
  appId: "1:759014128178:web:09c3690cd95b402c8ada2b",
  measurementId: "G-ZPD5VPD5TS"
};

// === Initialisieren ===
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const storage = getStorage(app);
export const db = getFirestore(app);

// ❗ Functions mit Region us-central1 initialisieren
export const functions = getFunctions(app, "us-central1");

// In Console verfügbar machen (Debugging)
window.auth = auth;
window.functions = functions;
window.db = db;

// Nutzer bleibt eingeloggt
setPersistence(auth, browserLocalPersistence);

// === Fehlertexte übersetzen ===
export function translateFirebaseError(errorCode) {
  switch (errorCode) {
    // Anmeldefehler
    case "auth/invalid-email":
      return "Die eingegebene E-Mail-Adresse ist ungültig.";
    case "auth/user-disabled":
      return "Dieses Konto wurde deaktiviert. Bitte wenden Sie sich an den Administrator.";
    case "auth/user-not-found":
      return "Es existiert kein Benutzer mit dieser E-Mail.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Das eingegebene Passwort ist falsch.";

    // Registrierungsfehler
    case "auth/email-already-in-use":
      return "Diese E-Mail-Adresse wird bereits verwendet.";
    case "auth/weak-password":
      return "Das Passwort ist zu schwach. Bitte mindestens 6 Zeichen verwenden.";
    case "auth/missing-password":
      return "Bitte geben Sie ein Passwort ein.";

    // Passwort-Reset
    case "auth/missing-email":
      return "Bitte geben Sie eine E-Mail-Adresse ein.";

    // Netzwerk & Sonstiges
    case "auth/network-request-failed":
      return "Netzwerkfehler – bitte Internetverbindung prüfen.";
    case "auth/too-many-requests":
      return "Zu viele Anmeldeversuche. Bitte versuchen Sie es später erneut.";
    case "auth/internal-error":
      return "Interner Fehler bei der Anmeldung. Bitte später erneut versuchen.";

    default:
      return "Ein unbekannter Fehler ist aufgetreten. (" + errorCode + ")";
  }
}

// === Auth Funktionen ===
export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function register(email, password) {
  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(userCred.user);
  return userCred;
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export async function logout() {
  return signOut(auth);
}

// === Profil aktualisieren (Name etc.) ===
export async function updateUserProfile(user, data) {
  return updateProfile(user, data);
}

// === Profilbild hochladen & speichern ===
export async function uploadProfileImage(user, file) {
  if (!user) throw new Error("Kein Nutzer eingeloggt.");

  const storageRef = ref(storage, `profileImages/${user.uid}/avatar.png`);
  await uploadBytes(storageRef, file);

  const url = await getDownloadURL(storageRef);

  // im Auth-Profil speichern
  await updateProfile(user, { photoURL: url });

  return url;
}

// === Firestore: Rollen des Nutzers laden ===
export async function getUserRoles(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data().roles || [];
  }
  return [];
}

// === State Observer ===
export function observeAuthState(callback) {
  onAuthStateChanged(auth, callback);
}

// === Passwort ändern mit Re-Auth ===
export async function changePassword(user, currentPwd, newPwd) {
  if (!user || !user.email) throw new Error("Kein gültiger Benutzer.");

  // Mit aktuellem Passwort re-authentifizieren
  const cred = EmailAuthProvider.credential(user.email, currentPwd);
  await reauthenticateWithCredential(user, cred);

  // Neues Passwort setzen
  await fbUpdatePassword(user, newPwd);
}
