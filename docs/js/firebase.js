// public/js/firebase.js
// 🚀 Finale Version – enthält ALLE Funktionen

// === Firebase Module laden ===
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
  storageBucket: "iuk-app.appspot.com", // ✅ wichtig: richtige Endung .appspot.com
  messagingSenderId: "759014128178",
  appId: "1:759014128178:web:09c3690cd95b402c8ada2b",
  measurementId: "G-ZPD5VPD5TS"
};

// === Initialisieren ===
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);

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

// === Userprofil aktualisieren ===
export async function updateUserProfile(name, photoURL = null) {
  if (!auth.currentUser) throw new Error("Kein Benutzer eingeloggt");
  return updateProfile(auth.currentUser, {
    displayName: name,
    photoURL: photoURL || auth.currentUser.photoURL || null
  });
}

// === Profilbild hochladen ===
export async function uploadProfileImage(file) {
  if (!auth.currentUser) throw new Error("Kein Benutzer eingeloggt");

  const storageRef = ref(storage, `profileImages/${auth.currentUser.uid}.jpg`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  // Profil aktualisieren mit Bild
  await updateProfile(auth.currentUser, { photoURL: url });

  return url;
}

// === State Observer ===
export function observeAuthState(callback) {
  onAuthStateChanged(auth, callback);
}
