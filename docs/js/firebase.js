// public/js/firebase.js
// Firebase Setup & zentrale Auth/Storage/Firestore Funktionen

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
export const db = getFirestore(app);
export const storage = getStorage(app);

// === Persistenz (eingeloggt bleiben) ===
setPersistence(auth, browserLocalPersistence);

// === Fehlertexte übersetzen ===
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

// === Basis Auth Funktionen ===
export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function register(email, password) {
  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(userCred.user);
  // User-Dokument in Firestore anlegen
  await setDoc(doc(db, "users", userCred.user.uid), {
    email: userCred.user.email,
    displayName: "",
    phone: "",
    mobile: "",
    photoURL: ""
  });
  return userCred;
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export async function logout() {
  return signOut(auth);
}

// === State Observer ===
export function observeAuthState(callback) {
  onAuthStateChanged(auth, callback);
}

// === Profil aktualisieren (Name, Telefonnummer, Profilbild) ===
export async function updateUserProfile(updates) {
  const user = auth.currentUser;
  if (!user) throw new Error("Kein User eingeloggt");

  // Auth Profil updaten
  if (updates.displayName) {
    await updateProfile(user, { displayName: updates.displayName });
  }
  if (updates.photoURL) {
    await updateProfile(user, { photoURL: updates.photoURL });
  }

  // Firestore Dokument updaten
  const userRef = doc(db, "users", user.uid);
  await updateDoc(userRef, updates);
}

// === Profildaten laden (aus Firestore) ===
export async function loadUserProfile(uid) {
  const refDoc = doc(db, "users", uid);
  const snap = await getDoc(refDoc);
  if (snap.exists()) {
    return snap.data();
  }
  return null;
}

// === Profilbild hochladen ===
export async function uploadProfileImage(file) {
  const user = auth.currentUser;
  if (!user) throw new Error("Kein User eingeloggt");

  const fileRef = ref(storage, `profileImages/${user.uid}.jpg`);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);

  // Speichern im Profil + Firestore
  await updateUserProfile({ photoURL: url });
  return url;
}
