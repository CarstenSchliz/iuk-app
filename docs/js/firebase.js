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
  updateProfile
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

// 🔹 Functions (immer mit Region us-central1!)
export const functions = getFunctions(app, "us-central1");

// Auch im Window verfügbar machen, damit man im Browser testen kann
window.auth = auth;
window.functions = functions;

// Nutzer bleibt eingeloggt
setPersistence(auth, browserLocalPersistence);

// === Fehlertexte übersetzen ===
export function translateFirebaseError(errorCode) {
  switch (errorCode) {
    case "auth/invalid-email":
      return "Die eingegebene E-Mail-Adresse ist ungültig.";
    case "auth/user-disabled":
      return "Dieses Konto wurde deaktiviert. Bitte wenden Sie sich an den Administrator.";
    case "auth/user-not-found":
    case "auth/invalid-credential":
      return "Es existiert kein Benutzer mit dieser E-Mail.";
    case "auth/wrong-password":
      return "Das eingegebene Passwort ist falsch.";
    case "auth/email-already-in-use":
      return "Diese E-Mail-Adresse wird bereits verwendet.";
    case "auth/weak-password":
      return "Das Passwort ist zu schwach. Bitte mindestens 6 Zeichen verwenden.";
    case "auth/missing-password":
      return "Bitte geben Sie ein Passwort ein.";
    case "auth/missing-email":
      return "Bitte geben Sie eine E-Mail-Adresse ein.";
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
  await updateProfile(user, { photoURL: url });
  return url;
}

// === State Observer ===
export function observeAuthState(callback) {
  onAuthStateChanged(auth, callback);
}
