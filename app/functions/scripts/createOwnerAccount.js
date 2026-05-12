/**
 * One-off: create or promote a development owner account.
 *
 * Required:
 *   OWNER_EMAIL="owner@example.com"
 *
 * Optional:
 *   OWNER_PASSWORD="strong-password"  If omitted, a password is generated for
 *                                     newly created users. Existing users keep
 *                                     their current password unless this is set.
 *   OWNER_DISPLAY_NAME="FixIT Owner"
 *   OWNER_SEED_PRO_PROFILE="false"    Skip the inactive freelancer dashboard seed.
 *   GCLOUD_PROJECT="fixit-app-48290171"
 *
 * Requires Application Default Credentials or GOOGLE_APPLICATION_CREDENTIALS.
 */
const crypto = require("node:crypto");
const admin = require("firebase-admin");

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "fixit-app-48290171";
const OWNER_EMAIL = (process.env.OWNER_EMAIL || "").trim().toLowerCase();
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || "";
const OWNER_DISPLAY_NAME = (process.env.OWNER_DISPLAY_NAME || "FixIT Owner").trim();
const OWNER_SEED_PRO_PROFILE = process.env.OWNER_SEED_PRO_PROFILE !== "false";

function generatePassword() {
  return `${crypto.randomBytes(15).toString("base64url")}A1!`;
}

function assertValidInput() {
  if (!OWNER_EMAIL || !OWNER_EMAIL.includes("@")) {
    throw new Error("Set OWNER_EMAIL to the email address for the owner account.");
  }
  if (OWNER_PASSWORD && OWNER_PASSWORD.length < 12) {
    throw new Error("OWNER_PASSWORD must be at least 12 characters.");
  }
}

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();

async function getOrCreateOwnerUser() {
  try {
    const user = await admin.auth().getUserByEmail(OWNER_EMAIL);
    const update = {
      emailVerified: true,
      disabled: false,
      displayName: user.displayName || OWNER_DISPLAY_NAME,
    };
    if (OWNER_PASSWORD) {
      update.password = OWNER_PASSWORD;
    }
    return {
      user: await admin.auth().updateUser(user.uid, update),
      created: false,
      password: OWNER_PASSWORD || null,
    };
  } catch (err) {
    if (err.code !== "auth/user-not-found") {
      throw err;
    }
    const generatedPassword = OWNER_PASSWORD || generatePassword();
    return {
      user: await admin.auth().createUser({
        email: OWNER_EMAIL,
        password: generatedPassword,
        displayName: OWNER_DISPLAY_NAME,
        emailVerified: true,
        disabled: false,
      }),
      created: true,
      password: generatedPassword,
    };
  }
}

async function main() {
  assertValidInput();

  const { user, created, password } = await getOrCreateOwnerUser();
  await admin.auth().setCustomUserClaims(user.uid, {
    ...(user.customClaims || {}),
    role: "owner",
  });

  await db
    .collection("users")
    .doc(user.uid)
    .set(
      {
        displayName: user.displayName || OWNER_DISPLAY_NAME,
        email: OWNER_EMAIL,
        pendingEmailChangeTo: null,
        pendingEmailChangeRequestedAt: null,
        phone: "",
        phoneVerifiedAt: null,
        country: "United States",
        addressLine: "",
        addressPlaceId: null,
        avatarUri: null,
        marketingEmailsEnabled: false,
        pushNotificationsEnabled: true,
        expoPushToken: null,
        pushTokenUpdatedAt: null,
        termsAcceptedAt: null,
        privacyAcceptedAt: null,
        termsVersion: "v1",
        privacyVersion: "v1",
        deletionRequestedAt: null,
        role: "owner",
        roleUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        roleUpdatedBy: "local-bootstrap",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  if (OWNER_SEED_PRO_PROFILE) {
    await db
      .collection("pro_profiles")
      .doc(user.uid)
      .set(
        {
          ownerId: user.uid,
          role: "freelancer",
          verification_status: "approved",
          isActive: false,
          categoryIds: ["handyman"],
          title: "Owner development workspace",
          subtitle: "Internal freelancer dashboard preview",
          eta: "30 min",
          fee: "$75+",
          imageUrl: "",
          bio: "Development-only profile for testing freelancer tools. It stays inactive so it is hidden from public marketplace discovery.",
          is_licensed: false,
          is_insured: false,
          admin_notes: "Owner dev profile, not a real service provider.",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  }

  await db.collection("admin_audit_logs").add({
    actorUid: "local-bootstrap",
    actorRole: "owner",
    action: created ? "create_owner_account" : "promote_owner_account",
    targetCollection: "users",
    targetId: user.uid,
    before: null,
    after: { email: OWNER_EMAIL, role: "owner", seededProProfile: OWNER_SEED_PRO_PROFILE },
    reason: "Development owner bootstrap",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // eslint-disable-next-line no-console
  console.log(`OK: ${created ? "created" : "updated"} owner ${OWNER_EMAIL} (${user.uid}).`);
  if (OWNER_SEED_PRO_PROFILE) {
    // eslint-disable-next-line no-console
    console.log("OK: seeded inactive approved freelancer dashboard profile.");
  }
  if (password) {
    // eslint-disable-next-line no-console
    console.log(`Temporary password: ${password}`);
  } else {
    // eslint-disable-next-line no-console
    console.log("Password was not changed for the existing user.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
