/**
 * One-off: set users.role + approved pro_profiles for a dev UID.
 * Run from repo: node scripts/seedDevFreelancer.js
 * Requires: Application Default Credentials (e.g. gcloud auth application-default login)
 *           or GOOGLE_APPLICATION_CREDENTIALS to a service account with Firestore access.
 */
const admin = require("firebase-admin");

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "fixit-app-48290171";
const UID = process.env.DEV_FREELANCER_UID || "U7gFcFFZrrUOO9M9kePtRStrjYq2";

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();

async function main() {
  await db
    .collection("users")
    .doc(UID)
    .set(
      {
        role: "freelancer",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  await db
    .collection("pro_profiles")
    .doc(UID)
    .set(
      {
        ownerId: UID,
        role: "freelancer",
        verification_status: "approved",
        isActive: true,
        categoryIds: ["handyman", "plumber", "locksmith"],
        title: "Dev freelancer",
        subtitle: "Full marketplace access while developing",
        eta: "30 min",
        fee: "$75+",
        imageUrl: "",
        bio: "Development account — registered freelancer. Edit in Pro workspace / public page.",
        is_licensed: true,
        is_insured: true,
        admin_notes: "",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  // eslint-disable-next-line no-console
  console.log(`OK: users/${UID} role=freelancer, pro_profiles/${UID} approved + active.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
