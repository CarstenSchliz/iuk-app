// public/js/firebase.js
// === Firebase Setup & zentrale Funktionen ===

// --- Imports ---
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

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyDIuKwYoKQDyzy6qpmY2LGahJofZx6qnuw",
  authDomain: "iuk-app.firebaseapp.com",
  projectId: "iuk-app",
  storageBucket: "iuk-app.appspot.com", // ACHTUNG: richtiges Format
  messagingSenderId: "759014128178",
  appId: "1:759014128178:web:09c3690cd95b402c8ada2b",
  measurementId: "G-ZPD5VPD5TS"
};

// --- Init ---
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// User eingeloggt halten
setPersistence(auth, browserLocalPersistence);

// --- Fehlertexte übersetzen ---
export function translateFirebaseError(code) {
  switch (code) {
    case "auth/invalid-email": return "Die eingegebene E-Mail-Adresse ist ungültig.";
    case "auth/user-disabled": return "Dieses Konto wurde deaktiviert.";
    case "auth/user-not-found": return "Es existiert kein Benutzer mit dieser E-Mail.";
    case "auth/wrong-password":
    case "auth/invalid-credential": return "Das eingegebene Passwort ist falsch.";
    case "auth/email-already-in-use": return "Diese E-Mail-Adresse wird bereits verwendet.";
    case "auth/weak-password": return "Das Passwort ist zu schwach (mindestens 6 Zeichen).";
    case "auth/missing-password": return "Bitte geben Sie ein Passwort ein.";
    case "auth/network-request-failed": return "Netzwerkfehler – bitte Internetverbindung prüfen.";
    default: return "Ein unbekannter Fehler ist aufgetreten. (" + code + ")";
  }
}

// --- Auth Funktionen ---
export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function register(email, password) {
  const userCred = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(userCred.user);

  // User auch in Firestore speichern
  await setDoc(doc(db, "users", userCred.user.uid), {
    email: email,
    displayName: "",
    photoURL: "",
    createdAt: new Date()
  });

  return userCred;
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export async function logout() {
  return signOut(auth);
}

// --- Profil aktualisieren ---
export async function updateUserProfile(name, photoURL = null) {
  const user = auth.currentUser;
  if (!user) throw new Error("Kein User eingeloggt");

  await updateProfile(user, { displayName: name, photoURL: photoURL || user.photoURL });

  // Firestore auch updaten
  const userRef = doc(db, "users", user.uid);
  await updateDoc(userRef, {
    displayName: name,
    ...(photoURL && { photoURL })
  });
}

// --- Profilbild hochladen ---
export async function uploadProfileImage(file) {
  const user = auth.currentUser;
  if (!user) throw new Error("Kein User eingeloggt");

  const storageRef = ref(storage, `profileImages/${user.uid}.jpg`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  await updateUserProfile(user.displayName || "", url);
  return url;
}

// --- Firestore User laden ---
export async function getUserData(uid) {
  const refUser = doc(db, "users", uid);
  const snap = await getDoc(refUser);
  return snap.exists() ? snap.data() : null;
}

// --- Observer ---
export function observeAuthState(callback) {
  onAuthStateChanged(auth, callback);
}
