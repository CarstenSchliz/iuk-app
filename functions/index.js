// functions/index.js
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();

// ==== Sicherheit (optional) ====
// Falls du Absicherung möchtest, auf true setzen:
// - Erwartet Authorization: Bearer <ID Token>
// - Erlaubt nur Admins (custom claim "admin": true)
const USE_AUTH = false;

// ---- CORS + Fehlerhandling Wrapper ----
function handleRequest(handler) {
  return (req, res) => {
    cors(req, res, async () => {
      try {
        if (USE_AUTH) {
          await requireAdmin(req);
        }
        await handler(req, res);
      } catch (err) {
        console.error("❌ Fehler:", err);
        const code = err.statusCode || 500;
        res.status(code).json({ error: err.message || String(err) });
      }
    });
  };
}

// ---- Auth-Middleware (optional) ----
async function requireAdmin(req) {
  const authHeader = req.headers.authorization || "";
  const m = authHeader.match(/^Bearer (.+)$/i);
  if (!m) {
    const e = new Error("Kein Bearer-Token übermittelt");
    e.statusCode = 401;
    throw e;
  }
  const idToken = m[1];
  const decoded = await admin.auth().verifyIdToken(idToken);
  if (!decoded || !(decoded.admin || (Array.isArray(decoded.roles) && decoded.roles.includes("admin")))) {
    const e = new Error("Nicht berechtigt (Admin erforderlich)");
    e.statusCode = 403;
    throw e;
  }
  // ok
}

// ==== Rollen-Setup ====
const ALLOWED_ROLES = new Set(["admin", "gruppenleiter", "helfer", "anwärter"]);

// Normalisiert eingehende Rollen -> Array<string> innerhalb ALLOWED_ROLES
function normalizeRoles(input, existingClaims = {}) {
  let roles = [];

  if (input === undefined || input === null) {
    // Nichts übergeben: aus bestehenden Claims ableiten
    const fromArray = Array.isArray(existingClaims.roles) ? existingClaims.roles : [];
    const fromBooleans = Array.from(ALLOWED_ROLES).filter((r) => existingClaims[r] === true);
    roles = [...fromArray, ...fromBooleans];
  } else if (Array.isArray(input)) {
    roles = input;
  } else if (typeof input === "string") {
    roles = input.split(",").map((s) => s.trim()).filter(Boolean);
  } else if (typeof input === "object") {
    // z.B. { admin:true, helfer:false, ... }
    roles = Object.entries(input)
      .filter(([k, v]) => v === true && ALLOWED_ROLES.has(k))
      .map(([k]) => k);
  }

  // Nur erlaubte, deduplizierte Rollen
  roles = roles.filter((r) => ALLOWED_ROLES.has(r));
  return Array.from(new Set(roles));
}

// Baut das endgültige Claims-Objekt:
// - roles: string[]
// - zusätzlich booleans je Rolle (legacy/Bequemlichkeit)
// - admin Convenience-Flag bleibt erhalten
function buildClaimsWithRoles(existingClaims = {}, roles = []) {
  const claims = { ...existingClaims };

  // Alte Boolean-Flags der bekannten Rollen löschen
  for (const r of ALLOWED_ROLES) delete claims[r];

  // Array setzen
  claims.roles = roles;

  // Booleans für jede Rolle (praktisch für einfache Checks)
  for (const r of ALLOWED_ROLES) {
    claims[r] = roles.includes(r);
  }

  // Convenience: admin-Flag
  claims.admin = roles.includes("admin");

  return claims;
}

// ==== Endpoints ====

// Neuen Nutzer anlegen
exports.createUser = onRequest(
  handleRequest(async (req, res) => {
    const { email, password, displayName } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "E-Mail und Passwort erforderlich" });
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || "",
    });

    res.json({ uid: userRecord.uid });
  })
);

// Nutzer löschen
exports.deleteUser = onRequest(
  handleRequest(async (req, res) => {
    const { uid } = req.body || {};
    if (!uid) return res.status(400).json({ error: "UID erforderlich" });

    await admin.auth().deleteUser(uid);
    res.json({ success: true });
  })
);

// Admin setzen/entfernen (abwärtskompatibel)
// Pflegt zusätzlich das roles[]-Array mit.
exports.setUserAdmin = onRequest(
  handleRequest(async (req, res) => {
    const { uid, makeAdmin } = req.body || {};
    if (!uid) return res.status(400).json({ error: "UID erforderlich" });

    const user = await admin.auth().getUser(uid);
    const currentClaims = user.customClaims || {};
    let roles = normalizeRoles(undefined, currentClaims);

    if (makeAdmin) {
      if (!roles.includes("admin")) roles.push("admin");
    } else {
      roles = roles.filter((r) => r !== "admin");
    }

    const newClaims = buildClaimsWithRoles(currentClaims, roles);
    await admin.auth().setCustomUserClaims(uid, newClaims);
    res.json({ success: true, roles });
  })
);

// Nutzer aktualisieren (Name + optional Rollen)
exports.updateUser = onRequest(
  handleRequest(async (req, res) => {
    const { uid, displayName, roles: incomingRoles } = req.body || {};
    if (!uid) return res.status(400).json({ error: "UID erforderlich" });

    // 1) Profileigenschaften
    if (typeof displayName === "string") {
      await admin.auth().updateUser(uid, { displayName });
    }

    // 2) Rollen aktualisieren (wenn übergeben)
    if (incomingRoles !== undefined) {
      const user = await admin.auth().getUser(uid);
      const currentClaims = user.customClaims || {};
      const roles = normalizeRoles(incomingRoles, currentClaims);
      const newClaims = buildClaimsWithRoles(currentClaims, roles);
      await admin.auth().setCustomUserClaims(uid, newClaims);
      return res.json({ success: true, roles });
    }

    res.json({ success: true });
  })
);

// Optional: separater Endpoint nur für Rollen
exports.setUserRoles = onRequest(
  handleRequest(async (req, res) => {
    const { uid, roles: incomingRoles } = req.body || {};
    if (!uid) return res.status(400).json({ error: "UID erforderlich" });

    const user = await admin.auth().getUser(uid);
    const currentClaims = user.customClaims || {};
    const roles = normalizeRoles(incomingRoles, currentClaims);
    const newClaims = buildClaimsWithRoles(currentClaims, roles);
    await admin.auth().setCustomUserClaims(uid, newClaims);
    res.json({ success: true, roles });
  })
);

// Alle Nutzer auflisten
exports.listUsers = onRequest(
  handleRequest(async (req, res) => {
    const listUsersResult = await admin.auth().listUsers(1000);
    const users = listUsersResult.users.map((ur) => {
      const cc = ur.customClaims || {};
      const roles = normalizeRoles(undefined, cc); // aus Claims ableiten
      return {
        uid: ur.uid,
        email: ur.email,
        displayName: ur.displayName || "",
        admin: roles.includes("admin"), // Convenience-Flag
        roles,                           // wichtig für die UI
      };
    });
    res.json({ users });
  })
);
