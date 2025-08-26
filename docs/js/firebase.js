// public/js/firebase.js
// Firebase Setup & Auth-Funktionen

// === Firebase Module importieren ===
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

// === Deine Firebase Config ===
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

// Persistenz: User bleibt eingeloggt (auch nach Reload)
setPersistence(auth, browserLocalPersistence);

// === Hilfsfunktion: Fehlertexte übersetzen ===
export function translateFirebaseError(errorCode) {
  switch (errorCode) {
    case "auth/invalid-email":
      return "Die eingegebene E-Mail-Adresse ist ungültig.";
    case "auth/user-disabled":
      return "Dieses Konto wurde deaktiviert.";
    case "auth/user-not-found":
      return "Es existiert kein Benutzer mit dieser E-Mail.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Das eingegebene Passwort ist falsch.";
    case "auth/email-already-in-use":
      return "Diese E-Mail-Adresse wird bereits verwendet.";
    case "auth/weak-password":
      return "Das Passwort ist zu schwach (mindestens 6 Zeichen).";
    case "auth/missing-password":
      return "Bitte geben Sie ein Passwort ein.";
    case "auth/network-request-failed":
      return "Netzwerkfehler – bitte Internetverbindung prüfen.";
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

  // ✅ Wichtig: im Auth-Profil merken, damit es beim Login wiederkommt
  await updateProfile(user, { photoURL: url });

  // Cache-Buster, damit Browser das neue Bild sofort zeigt
  return url + "&t=" + Date.now();
}

// === State Observer ===
// Kann in app.html genutzt werden, um zu prüfen ob jemand eingeloggt ist
export function observeAuthState(callback) {
  onAuthStateChanged(auth, callback);
}
