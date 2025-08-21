// ==========================
// Firebase Setup & Funktionen
// ==========================

// Imports
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
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

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
export const db = getFirestore(app);
export const storage = getStorage(app);

// Persistenz: User bleibt eingeloggt
setPersistence(auth, browserLocalPersistence);

// ==========================
// Hilfsfunktion: Fehlertexte
// ==========================
export function translateFirebaseError(errorCode) {
  switch (errorCode) {
    case "auth/invalid-email": return "Die eingegebene E-Mail-Adresse ist ungültig.";
    case "auth/user-disabled": return "Dieses Konto wurde deaktiviert.";
    case "auth/user-not-found": return "Es existiert kein Benutzer mit dieser E-Mail.";
    case "auth/wrong-password":
    case "auth/invalid-credential": return "Das eingegebene Passwort ist falsch.";
    case "auth/email-already-in-use": return "Diese E-Mail-Adresse wird bereits verwendet.";
    case "auth/weak-password": return "Das Passwort ist zu schwach (mindestens 6 Zeichen).";
    case "auth/missing-password": return "Bitte geben Sie ein Passwort ein.";
    case "auth/network-request-failed": return "Netzwerkfehler – bitte Internetverbindung prüfen.";
    default: return "Ein unbekannter Fehler ist aufgetreten. (" + errorCode + ")";
  }
}

// ==========================
// Auth Funktionen
// ==========================
export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function register(email, password) {
  const userCred = await createUserWithEmailAndPassword(auth, email, password);

  // Standard-Dokument in Firestore anlegen
  await setDoc(doc(db, "users", userCred.user.uid), {
    email: email,
    name: "",
    phone: "",
    mobile: "",
    avatarUrl: ""
  });

  await sendEmailVerification(userCred.user);
  return userCred;
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export async function logout() {
  return signOut(auth);
}

export function observeAuthState(callback) {
  onAuthStateChanged(auth, callback);
}

// ==========================
// Firestore Funktionen
// ==========================
export async function getUserData(uid) {
  const refDoc = doc(db, "users", uid);
  const snapshot = await getDoc(refDoc);
  return snapshot.exists() ? snapshot.data() : null;
}

export async function updateUserData(uid, data) {
  const refDoc = doc(db, "users", uid);
  await updateDoc(refDoc, data);
}

// ==========================
// Profil Funktionen
// ==========================
export async function updateUserName(user, newName) {
  // 1. Auth-Profil aktualisieren
  await updateProfile(user, { displayName: newName });
  // 2. Firestore aktualisieren
  await updateUserData(user.uid, { name: newName });
}

export async function uploadAvatar(user, file) {
  const avatarRef = ref(storage, `avatars/${user.uid}.png`);
  await uploadBytes(avatarRef, file);
  const url = await getDownloadURL(avatarRef);

  // Firestore aktualisieren
  await updateUserData(user.uid, { avatarUrl: url });
  return url;
}
