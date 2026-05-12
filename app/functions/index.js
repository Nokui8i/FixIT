/**
 * Cloud Functions entry (minimal bootstrap).
 */
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentUpdated, onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

setGlobalOptions({ region: "us-central1" });
admin.initializeApp();

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

let stripeClient = null;

const PLATFORM_ROLES = ["customer", "freelancer", "manager", "admin", "owner"];
const STAFF_ROLES = ["manager", "admin", "owner"];
const ROLE_RANK = {
  customer: 0,
  freelancer: 1,
  manager: 2,
  admin: 3,
  owner: 4,
};
const REVIEW_QUEUE_COLLECTIONS = new Set([
  "pro_review_queue",
  "trade_license_review_queue",
  "content_review_queue",
]);

function normalizeRole(raw) {
  if (typeof raw !== "string") return "customer";
  const role = raw.trim().toLowerCase();
  if (role === "pro") return "freelancer";
  return PLATFORM_ROLES.includes(role) ? role : "customer";
}

function roleMeets(role, minimumRole) {
  return (ROLE_RANK[normalizeRole(role)] ?? 0) >= (ROLE_RANK[minimumRole] ?? 0);
}

function requireAuth(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  return uid;
}

async function loadUserRole(db, uid) {
  const snap = await db.collection("users").doc(uid).get();
  return normalizeRole(snap.data()?.role);
}

async function requireStaffRole(request, allowedRoles = STAFF_ROLES) {
  const uid = requireAuth(request);
  const db = admin.firestore();
  const tokenRole = normalizeRole(request.auth?.token?.role);
  const tokenAllowed = allowedRoles.includes(tokenRole);
  const role = tokenAllowed ? tokenRole : await loadUserRole(db, uid);
  if (!allowedRoles.includes(role)) {
    throw new HttpsError("permission-denied", "Manager, admin, or owner access required.");
  }
  return { uid, role };
}

function requireNonEmptyString(data, key, label, maxLength = 200) {
  const value = typeof data?.[key] === "string" ? data[key].trim() : "";
  if (!value) throw new HttpsError("invalid-argument", `${label} is required.`);
  if (value.length > maxLength) {
    throw new HttpsError("invalid-argument", `${label} is too long.`);
  }
  return value;
}

function optionalString(data, key, maxLength = 500) {
  const value = typeof data?.[key] === "string" ? data[key].trim() : "";
  return value.slice(0, maxLength);
}

function requireValidRole(data, key = "role") {
  const role = normalizeRole(data?.[key]);
  if (!PLATFORM_ROLES.includes(role)) {
    throw new HttpsError("invalid-argument", "Invalid role.");
  }
  return role;
}

function serverTimestamp() {
  return admin.firestore.FieldValue.serverTimestamp();
}

async function writeAdminAuditLog({
  actorUid,
  actorRole,
  action,
  targetCollection,
  targetId,
  reason = "",
  metadata = {},
}) {
  const db = admin.firestore();
  await db.collection("admin_audit_logs").add({
    actorUid,
    actorRole,
    action,
    targetCollection,
    targetId,
    reason,
    metadata,
    createdAt: serverTimestamp(),
  });
}

function getStripeClient() {
  if (stripeClient) return stripeClient;
  const secret = stripeSecretKey.value();
  if (!secret) {
    throw new HttpsError("failed-precondition", "STRIPE_SECRET_KEY is not configured.");
  }
  // Lazy require avoids startup failure when Stripe is not configured yet.
  // eslint-disable-next-line global-require
  const Stripe = require("stripe");
  stripeClient = new Stripe(secret);
  return stripeClient;
}

function asHttpsStripeError(error, fallback) {
  const msg =
    typeof error?.raw?.message === "string" && error.raw.message.trim()
      ? error.raw.message.trim()
      : typeof error?.message === "string" && error.message.trim()
        ? error.message.trim()
        : fallback;
  return new HttpsError("failed-precondition", msg);
}

exports.health = onRequest((req, res) => {
  res.status(200).json({ ok: true, service: "fixit-functions" });
});

async function deleteByQuery(colRef, field, uid) {
  let total = 0;
  while (true) {
    const snap = await colRef.where(field, "==", uid).limit(200).get();
    if (snap.empty) return total;
    for (const d of snap.docs) {
      await deleteDocDeep(d.ref);
      total += 1;
    }
  }
}

async function deleteByQueryOp(colRef, field, op, value) {
  let total = 0;
  while (true) {
    const snap = await colRef.where(field, op, value).limit(200).get();
    if (snap.empty) return total;
    for (const d of snap.docs) {
      await deleteDocDeep(d.ref);
      total += 1;
    }
  }
}

async function deleteDocDeep(ref) {
  try {
    await admin.firestore().recursiveDelete(ref);
  } catch {
    await ref.delete().catch(() => {});
  }
}

async function deleteUsersByEmail(db, email) {
  if (!email) return 0;
  const snap = await db.collection("users").where("email", "==", email).limit(500).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

async function deleteStoragePrefix(prefix) {
  const bucket = admin.storage().bucket();
  try {
    await bucket.deleteFiles({ prefix, force: true });
  } catch {
    // Ignore missing prefixes.
  }
}

async function deletionBlockReason(db, uid) {
  const deletionSnap = await db.collection("account_deletion_requests").doc(uid).get();
  const deletion = deletionSnap.data() || {};
  if (deletion.legalHold === true || deletion.status === "blocked") {
    return typeof deletion.blockReason === "string" ? deletion.blockReason : "Account has a staff hold.";
  }

  const blockingPaymentStatuses = new Set(["authorized", "requires_capture", "processing"]);
  for (const field of ["customerId", "proId"]) {
    const snap = await db.collection("payments").where(field, "==", uid).limit(50).get();
    const blocked = snap.docs.find((d) => blockingPaymentStatuses.has(String(d.data()?.status || "")));
    if (blocked) return "Payment reconciliation is still pending.";
  }

  const blockingBookingStatuses = new Set(["disputed", "in_progress"]);
  for (const field of ["customerId", "proId"]) {
    const snap = await db.collection("bookings").where(field, "==", uid).limit(50).get();
    const blocked = snap.docs.find((d) => blockingBookingStatuses.has(String(d.data()?.status || "")));
    if (blocked) return "Booking or dispute is still active.";
  }

  return "";
}

async function deleteFirestoreAccountData(db, uid, email) {
  const counts = {};
  const threadSnap = await db
    .collection("chat_threads")
    .where("participantIds", "array-contains", uid)
    .limit(1000)
    .get();
  const threadIds = threadSnap.docs.map((d) => d.id);

  // Remove requests created by this user and quotes linked to those requests.
  const myRequestSnap = await db
    .collection("service_requests")
    .where("customerId", "==", uid)
    .limit(1000)
    .get();
  const myRequestIds = myRequestSnap.docs.map((d) => d.id);
  counts.service_requests = myRequestSnap.size;
  for (const requestId of myRequestIds) {
    counts.quotesByRequest = (counts.quotesByRequest || 0)
      + await deleteByQuery(db.collection("quotes"), "requestId", requestId);
  }
  for (const d of myRequestSnap.docs) {
    await deleteDocDeep(d.ref);
  }

  counts.quotesCustomer = await deleteByQuery(db.collection("quotes"), "customerId", uid);
  counts.quotesPro = await deleteByQuery(db.collection("quotes"), "proId", uid);
  counts.notifications = await deleteByQuery(db.collection("notifications"), "userId", uid);
  counts.chatOwner = await deleteByQuery(db.collection("chat_threads"), "ownerId", uid);
  counts.chatCustomer = await deleteByQuery(db.collection("chat_threads"), "customerId", uid);
  counts.chatPro = await deleteByQuery(db.collection("chat_threads"), "proId", uid);
  counts.chatParticipant = await deleteByQueryOp(
    db.collection("chat_threads"),
    "participantIds",
    "array-contains",
    uid,
  );
  counts.bookingsCustomer = await deleteByQuery(db.collection("bookings"), "customerId", uid);
  counts.bookingsPro = await deleteByQuery(db.collection("bookings"), "proId", uid);
  counts.paymentsCustomer = await deleteByQuery(db.collection("payments"), "customerId", uid);
  counts.paymentsPro = await deleteByQuery(db.collection("payments"), "proId", uid);
  counts.reviewsCustomer = await deleteByQuery(db.collection("reviews"), "customerId", uid);
  counts.reviewsPro = await deleteByQuery(db.collection("reviews"), "proId", uid);
  counts.dataExports = await deleteByQuery(db.collection("data_export_requests"), "userId", uid);
  counts.proQueue = await deleteByQuery(db.collection("pro_review_queue"), "proId", uid);
  counts.tradeLicenseQueue = await deleteByQuery(
    db.collection("trade_license_review_queue"),
    "proId",
    uid,
  );
  counts.contentQueueCustomer = await deleteByQuery(
    db.collection("content_review_queue"),
    "customerId",
    uid,
  );
  counts.contentQueuePro = await deleteByQuery(db.collection("content_review_queue"), "proId", uid);
  counts.duplicateUsersByEmail = await deleteUsersByEmail(db, email);

  for (const threadId of threadIds) {
    await deleteDocDeep(db.collection("chat_messages").doc(threadId));
  }
  counts.chatMessageThreads = threadIds.length;

  await Promise.all([
    db.collection("users").doc(uid).delete().catch(() => {}),
    db.collection("pro_profiles").doc(uid).delete().catch(() => {}),
    db.collection("pro_compliance").doc(uid).delete().catch(() => {}),
  ]);
  counts.primaryDocs = 3;
  return counts;
}

async function deleteStorageAccountData(uid) {
  const prefixes = [
    `users/${uid}/`,
    `requests/${uid}/`,
    `exports/${uid}/`,
    `portfolio/${uid}/`,
    `pro_videos/${uid}/`,
    `applications/${uid}/`,
  ];
  await Promise.all(prefixes.map((prefix) => deleteStoragePrefix(prefix)));
  return prefixes;
}

async function deleteAuthAccount(uid) {
  try {
    await admin.auth().deleteUser(uid);
  } catch (err) {
    if (err?.code !== "auth/user-not-found") throw err;
  }
}

async function executeAccountDeletion({ uid, email, requestedBy = uid }) {
  const db = admin.firestore();
  const requestRef = db.collection("account_deletion_requests").doc(uid);
  const blockReason = await deletionBlockReason(db, uid);
  if (blockReason) {
    await requestRef.set(
      {
        uid,
        status: "blocked",
        blockReason,
        blockedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    throw new HttpsError("failed-precondition", blockReason);
  }

  await requestRef.set(
    {
      uid,
      requestedBy,
      status: "in_progress",
      requestedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      steps: {
        firestoreDeleted: false,
        storageDeleted: false,
        authDeleted: false,
      },
    },
    { merge: true },
  );

  try {
    const firestoreCounts = await deleteFirestoreAccountData(db, uid, email);
    await requestRef.set(
      {
        status: "in_progress",
        "steps.firestoreDeleted": true,
        firestoreCounts,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    const storagePrefixes = await deleteStorageAccountData(uid);
    await requestRef.set(
      {
        status: "in_progress",
        "steps.storageDeleted": true,
        storagePrefixes,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    await deleteAuthAccount(uid);
    await requestRef.set(
      {
        status: "completed",
        "steps.authDeleted": true,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    await db.collection("deletion_audit_logs").add({
      uid,
      requestedBy,
      status: "completed",
      createdAt: serverTimestamp(),
    });
    return { ok: true };
  } catch (err) {
    await requestRef.set(
      {
        status: "failed",
        lastError: typeof err?.message === "string" ? err.message.slice(0, 500) : "Deletion failed.",
        failedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    throw err;
  }
}

async function sendExpoPushMessage(message) {
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new HttpsError("internal", "Expo push send failed.");
  }
  return data;
}

async function loadProName(db, proId) {
  if (!proId) return "the pro";
  const userSnap = await db.collection("users").doc(proId).get().catch(() => null);
  const userData = userSnap?.data?.() || {};
  if (typeof userData.displayName === "string" && userData.displayName.trim()) {
    return userData.displayName.trim();
  }
  const proSnap = await db.collection("pro_profiles").doc(proId).get().catch(() => null);
  const proData = proSnap?.data?.() || {};
  if (typeof proData.title === "string" && proData.title.trim()) {
    return proData.title.trim();
  }
  return "the pro";
}

exports.deleteMyAccountSecure = onCall(async (request) => {
  const uid = request.auth?.uid;
  const email = typeof request.auth?.token?.email === "string" ? request.auth.token.email : "";
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const confirmText = typeof request.data?.confirmText === "string" ? request.data.confirmText.trim() : "";
  if (confirmText !== "DELETE") {
    throw new HttpsError("invalid-argument", "Confirmation text mismatch.");
  }

  return executeAccountDeletion({ uid, email, requestedBy: uid });
});

exports.sendMyTestPush = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const db = admin.firestore();
  const snap = await db.collection("users").doc(uid).get();
  const profile = snap.data() || {};
  const pushEnabled = profile.pushNotificationsEnabled !== false;
  if (!pushEnabled) {
    throw new HttpsError("failed-precondition", "Push notifications are turned off in settings.");
  }

  const expoPushToken = typeof profile.expoPushToken === "string" ? profile.expoPushToken : "";
  if (!expoPushToken || !expoPushToken.startsWith("ExponentPushToken[")) {
    throw new HttpsError("failed-precondition", "No valid Expo push token saved for this user.");
  }

  await sendExpoPushMessage({
    to: expoPushToken,
    sound: "default",
    title: "FixIT test notification",
    body: "Push notifications are active on this device.",
    data: {
      kind: "system",
      test: true,
    },
  });

  return { ok: true };
});

function publicProSnapshot(data) {
  if (!data || typeof data !== "object") return {};
  return {
    verification_status: data.verification_status || null,
    isActive: data.isActive !== false,
    is_licensed: data.is_licensed === true,
    is_insured: data.is_insured === true,
    categoryIds: Array.isArray(data.categoryIds) ? data.categoryIds : [],
  };
}

function compliancePrivateFrom(data) {
  return data?.compliance_private || {};
}

async function loadProCompliance(db, proId) {
  const snap = await db.collection("pro_compliance").doc(proId).get().catch(() => null);
  return snap?.data?.() || {};
}

function hasInsuranceEvidence(data, complianceData = {}) {
  const c = {
    ...compliancePrivateFrom(data),
    ...compliancePrivateFrom(complianceData),
  };
  return Boolean(
    (typeof c.coiUrl === "string" && c.coiUrl.trim())
      || (typeof c.insurancePolicyNumber === "string" && c.insurancePolicyNumber.trim()),
  );
}

function licenseReviewMap(data, complianceData = {}) {
  const compliance = {
    ...compliancePrivateFrom(data),
    ...compliancePrivateFrom(complianceData),
  };
  const map = compliance.licensesByCategoryId || {};
  return map && typeof map === "object" ? { ...map } : {};
}

function hasApprovedTradeLicense(data) {
  return Object.values(licenseReviewMap(data)).some((license) => {
    return license && typeof license === "object" && license.reviewStatus === "approved";
  });
}

async function upsertQueueItem(collectionName, docId, data) {
  const db = admin.firestore();
  const ref = db.collection(collectionName).doc(docId);
  const snap = await ref.get();
  const existing = snap.data() || {};
  const status = typeof existing.status === "string" ? existing.status : "pending";
  const requestedStatus = typeof data.status === "string" ? data.status : "";
  if (status === "resolved" && requestedStatus !== "resolved") return;
  const nextStatus =
    requestedStatus || (status === "in_review" || status === "escalated" ? status : "pending");
  await ref.set(
    {
      ...data,
      status: nextStatus,
      updatedAt: serverTimestamp(),
      createdAt: existing.createdAt || serverTimestamp(),
    },
    { merge: true },
  );
}

exports.setUserRole = onCall(async (request) => {
  const actor = await requireStaffRole(request, ["owner"]);
  const targetUid = requireNonEmptyString(request.data, "targetUid", "Target user ID", 128);
  const nextRole = requireValidRole(request.data, "role");
  const reason = requireNonEmptyString(request.data, "reason", "Reason", 500);
  if (targetUid === actor.uid && nextRole !== "owner") {
    throw new HttpsError("failed-precondition", "Owners cannot demote their own account.");
  }

  const db = admin.firestore();
  const userRef = db.collection("users").doc(targetUid);
  const before = (await userRef.get()).data() || {};
  const previousRole = normalizeRole(before.role);
  await userRef.set(
    {
      role: nextRole,
      roleUpdatedAt: serverTimestamp(),
      roleUpdatedBy: actor.uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  const userRecord = await admin.auth().getUser(targetUid).catch(() => null);
  if (userRecord) {
    await admin.auth().setCustomUserClaims(targetUid, {
      ...(userRecord.customClaims || {}),
      role: nextRole,
    });
  }

  await writeAdminAuditLog({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: "set_user_role",
    targetCollection: "users",
    targetId: targetUid,
    reason,
    metadata: { previousRole, nextRole },
  });
  return { ok: true, previousRole, nextRole };
});

exports.suspendUser = onCall(async (request) => {
  const actor = await requireStaffRole(request, ["admin", "owner"]);
  const targetUid = requireNonEmptyString(request.data, "targetUid", "Target user ID", 128);
  const reason = requireNonEmptyString(request.data, "reason", "Reason", 500);
  if (targetUid === actor.uid) {
    throw new HttpsError("failed-precondition", "Staff cannot suspend their own account.");
  }

  const db = admin.firestore();
  await db.collection("users").doc(targetUid).set(
    {
      account_status: "suspended",
      suspendedAt: serverTimestamp(),
      suspendedBy: actor.uid,
      suspensionReason: reason,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await admin.auth().updateUser(targetUid, { disabled: true }).catch(() => {});
  await writeAdminAuditLog({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: "suspend_user",
    targetCollection: "users",
    targetId: targetUid,
    reason,
  });
  return { ok: true };
});

exports.unsuspendUser = onCall(async (request) => {
  const actor = await requireStaffRole(request, ["admin", "owner"]);
  const targetUid = requireNonEmptyString(request.data, "targetUid", "Target user ID", 128);
  const reason = requireNonEmptyString(request.data, "reason", "Reason", 500);

  const db = admin.firestore();
  await db.collection("users").doc(targetUid).set(
    {
      account_status: "active",
      unsuspendedAt: serverTimestamp(),
      unsuspendedBy: actor.uid,
      suspensionReason: null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await admin.auth().updateUser(targetUid, { disabled: false }).catch(() => {});
  await writeAdminAuditLog({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: "unsuspend_user",
    targetCollection: "users",
    targetId: targetUid,
    reason,
  });
  return { ok: true };
});

exports.approveProProfile = onCall(async (request) => {
  const actor = await requireStaffRole(request);
  const proId = requireNonEmptyString(request.data, "proId", "Pro ID", 128);
  const reason = optionalString(request.data, "reason", 500) || "Approved by staff review.";
  const db = admin.firestore();
  const proRef = db.collection("pro_profiles").doc(proId);
  const beforeSnap = await proRef.get();
  if (!beforeSnap.exists) throw new HttpsError("not-found", "Pro profile not found.");
  const before = beforeSnap.data() || {};
  const compliance = await loadProCompliance(db, proId);
  const isLicensed =
    typeof request.data?.isLicensed === "boolean"
      ? request.data.isLicensed
      : hasApprovedTradeLicense({ ...before, ...compliance });
  const isInsured =
    typeof request.data?.isInsured === "boolean"
      ? request.data.isInsured
      : hasInsuranceEvidence(before, compliance);

  await proRef.set(
    {
      verification_status: "approved",
      isActive: true,
      is_licensed: isLicensed,
      is_insured: isInsured,
      admin_notes: reason,
      verification_approved_at: serverTimestamp(),
      verification_approved_by: actor.uid,
      verification_updated_at: serverTimestamp(),
      rejection_reason: null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await upsertQueueItem("pro_review_queue", proId, {
    proId,
    queueType: "pro_profile",
    status: "resolved",
    resolvedAt: serverTimestamp(),
    resolvedBy: actor.uid,
    resolution: "approved",
  });
  await writeAdminAuditLog({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: "approve_pro_profile",
    targetCollection: "pro_profiles",
    targetId: proId,
    reason,
    metadata: { before: publicProSnapshot(before), after: { isLicensed, isInsured } },
  });
  return { ok: true };
});

exports.rejectProProfile = onCall(async (request) => {
  const actor = await requireStaffRole(request);
  const proId = requireNonEmptyString(request.data, "proId", "Pro ID", 128);
  const reason = requireNonEmptyString(request.data, "reason", "Reason", 500);
  const db = admin.firestore();
  const proRef = db.collection("pro_profiles").doc(proId);
  const beforeSnap = await proRef.get();
  if (!beforeSnap.exists) throw new HttpsError("not-found", "Pro profile not found.");
  const before = beforeSnap.data() || {};

  await proRef.set(
    {
      verification_status: "rejected",
      isActive: false,
      is_licensed: false,
      is_insured: false,
      admin_notes: reason,
      rejection_reason: reason,
      verification_rejected_at: serverTimestamp(),
      verification_rejected_by: actor.uid,
      verification_updated_at: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await upsertQueueItem("pro_review_queue", proId, {
    proId,
    queueType: "pro_profile",
    status: "resolved",
    resolvedAt: serverTimestamp(),
    resolvedBy: actor.uid,
    resolution: "rejected",
  });
  await writeAdminAuditLog({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: "reject_pro_profile",
    targetCollection: "pro_profiles",
    targetId: proId,
    reason,
    metadata: { before: publicProSnapshot(before) },
  });
  return { ok: true };
});

exports.approveTradeLicense = onCall(async (request) => {
  const actor = await requireStaffRole(request);
  const proId = requireNonEmptyString(request.data, "proId", "Pro ID", 128);
  const categoryId = requireNonEmptyString(request.data, "categoryId", "Category ID", 80);
  const reason = optionalString(request.data, "reason", 500) || "Trade license approved.";
  const db = admin.firestore();
  const proRef = db.collection("pro_profiles").doc(proId);
  const snap = await proRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Pro profile not found.");
  const data = snap.data() || {};
  const complianceRef = db.collection("pro_compliance").doc(proId);
  const complianceData = await loadProCompliance(db, proId);
  const licenses = licenseReviewMap(data, complianceData);
  const license = licenses[categoryId];
  if (!license || typeof license !== "object") {
    throw new HttpsError("not-found", "Trade license packet not found.");
  }
  licenses[categoryId] = {
    ...license,
    reviewStatus: "approved",
    reviewedAt: admin.firestore.Timestamp.now(),
    reviewedBy: actor.uid,
    rejectionReason: null,
  };
  await complianceRef.set(
    {
      ownerId: proId,
      compliance_private: {
        ...compliancePrivateFrom(complianceData),
        licensesByCategoryId: licenses,
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await proRef.set(
    {
      is_licensed: true,
      verification_updated_at: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  const queueId = `${proId}_${categoryId}`;
  await upsertQueueItem("trade_license_review_queue", queueId, {
    proId,
    categoryId,
    queueType: "trade_license",
    status: "resolved",
    resolvedAt: serverTimestamp(),
    resolvedBy: actor.uid,
    resolution: "approved",
  });
  await writeAdminAuditLog({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: "approve_trade_license",
    targetCollection: "pro_profiles",
    targetId: proId,
    reason,
    metadata: { categoryId },
  });
  return { ok: true };
});

exports.rejectTradeLicense = onCall(async (request) => {
  const actor = await requireStaffRole(request);
  const proId = requireNonEmptyString(request.data, "proId", "Pro ID", 128);
  const categoryId = requireNonEmptyString(request.data, "categoryId", "Category ID", 80);
  const reason = requireNonEmptyString(request.data, "reason", "Reason", 500);
  const db = admin.firestore();
  const proRef = db.collection("pro_profiles").doc(proId);
  const snap = await proRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Pro profile not found.");
  const data = snap.data() || {};
  const complianceRef = db.collection("pro_compliance").doc(proId);
  const complianceData = await loadProCompliance(db, proId);
  const licenses = licenseReviewMap(data, complianceData);
  const license = licenses[categoryId];
  if (!license || typeof license !== "object") {
    throw new HttpsError("not-found", "Trade license packet not found.");
  }
  licenses[categoryId] = {
    ...license,
    reviewStatus: "rejected",
    reviewedAt: admin.firestore.Timestamp.now(),
    reviewedBy: actor.uid,
    rejectionReason: reason,
  };
  const anyApproved = Object.values(licenses).some((v) => v?.reviewStatus === "approved");
  await complianceRef.set(
    {
      ownerId: proId,
      compliance_private: {
        ...compliancePrivateFrom(complianceData),
        licensesByCategoryId: licenses,
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await proRef.set(
    {
      is_licensed: anyApproved,
      verification_updated_at: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  const queueId = `${proId}_${categoryId}`;
  await upsertQueueItem("trade_license_review_queue", queueId, {
    proId,
    categoryId,
    queueType: "trade_license",
    status: "resolved",
    resolvedAt: serverTimestamp(),
    resolvedBy: actor.uid,
    resolution: "rejected",
    rejectionReason: reason,
  });
  await writeAdminAuditLog({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: "reject_trade_license",
    targetCollection: "pro_profiles",
    targetId: proId,
    reason,
    metadata: { categoryId },
  });
  return { ok: true };
});

function queueRefFromRequest(data) {
  const collectionName = requireNonEmptyString(data, "collection", "Queue collection", 80);
  const queueId = requireNonEmptyString(data, "queueId", "Queue item ID", 160);
  if (!REVIEW_QUEUE_COLLECTIONS.has(collectionName)) {
    throw new HttpsError("invalid-argument", "Unsupported queue collection.");
  }
  return admin.firestore().collection(collectionName).doc(queueId);
}

exports.claimReviewQueueItem = onCall(async (request) => {
  const actor = await requireStaffRole(request);
  const ref = queueRefFromRequest(request.data);
  await ref.set(
    {
      status: "in_review",
      assignedTo: actor.uid,
      assignedRole: actor.role,
      claimedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await writeAdminAuditLog({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: "claim_review_queue_item",
    targetCollection: ref.parent.id,
    targetId: ref.id,
    reason: optionalString(request.data, "reason", 500),
  });
  return { ok: true };
});

exports.resolveReviewQueueItem = onCall(async (request) => {
  const actor = await requireStaffRole(request);
  const ref = queueRefFromRequest(request.data);
  const resolution = requireNonEmptyString(request.data, "resolution", "Resolution", 120);
  const reason = optionalString(request.data, "reason", 500);
  await ref.set(
    {
      status: "resolved",
      resolution,
      resolutionReason: reason,
      resolvedAt: serverTimestamp(),
      resolvedBy: actor.uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await writeAdminAuditLog({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: "resolve_review_queue_item",
    targetCollection: ref.parent.id,
    targetId: ref.id,
    reason,
    metadata: { resolution },
  });
  return { ok: true };
});

exports.escalateReviewQueueItem = onCall(async (request) => {
  const actor = await requireStaffRole(request);
  const ref = queueRefFromRequest(request.data);
  const reason = requireNonEmptyString(request.data, "reason", "Reason", 500);
  await ref.set(
    {
      status: "escalated",
      escalatedAt: serverTimestamp(),
      escalatedBy: actor.uid,
      escalationReason: reason,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await writeAdminAuditLog({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: "escalate_review_queue_item",
    targetCollection: ref.parent.id,
    targetId: ref.id,
    reason,
  });
  return { ok: true };
});

exports.createStripeConnectAccount = onCall({ secrets: [stripeSecretKey] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const db = admin.firestore();
  const proRef = db.collection("pro_profiles").doc(uid);
  const proSnap = await proRef.get();
  const pro = proSnap.data() || {};
  const existingId = typeof pro.stripe_connect_account_id === "string" ? pro.stripe_connect_account_id : "";
  if (existingId) {
    return { accountId: existingId, reused: true };
  }

  const userSnap = await db.collection("users").doc(uid).get().catch(() => null);
  const email = typeof userSnap?.data?.()?.email === "string" ? userSnap.data().email : undefined;
  let account;
  try {
    const stripe = getStripeClient();
    account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email,
      metadata: { uid },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
    });
  } catch (error) {
    throw asHttpsStripeError(error, "Could not create Stripe Connect account.");
  }

  await proRef.set(
    {
      stripe_connect_account_id: account.id,
      stripe_onboarding_status: "created",
      payouts_enabled: false,
      verification_updated_at: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return { accountId: account.id, reused: false };
});

exports.createStripeConnectOnboardingLink = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
    const db = admin.firestore();
    const proRef = db.collection("pro_profiles").doc(uid);
    const proSnap = await proRef.get();
    const pro = proSnap.data() || {};
    let accountId =
      typeof pro.stripe_connect_account_id === "string"
        ? pro.stripe_connect_account_id
        : "";

    if (!accountId) {
      try {
        const stripe = getStripeClient();
        const account = await stripe.accounts.create({
          type: "express",
          country: "US",
          metadata: { uid },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: "individual",
        });
        accountId = account.id;
      } catch (error) {
        throw asHttpsStripeError(
          error,
          "Could not create Stripe Connect account. Activate Connect in Stripe dashboard first.",
        );
      }
      await proRef.set(
        {
          stripe_connect_account_id: accountId,
          stripe_onboarding_status: "created",
          payouts_enabled: false,
          verification_updated_at: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    const refreshUrl =
      typeof request.data?.refreshUrl === "string" && request.data.refreshUrl.trim()
        ? request.data.refreshUrl.trim()
        : "https://fixit-app-48290171.web.app/stripe/onboarding/refresh";
    const returnUrl =
      typeof request.data?.returnUrl === "string" && request.data.returnUrl.trim()
        ? request.data.returnUrl.trim()
        : "https://fixit-app-48290171.web.app/stripe/onboarding/return";

    let accountLink;
    try {
      const stripe = getStripeClient();
      accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      });
    } catch (error) {
      throw asHttpsStripeError(error, "Could not create Stripe onboarding link.");
    }

    await proRef.set(
      {
        stripe_onboarding_status: "pending",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return {
      accountId,
      url: accountLink.url,
      expiresAt: accountLink.expires_at,
    };
  },
);

/** Confirms Connect account exists in Stripe and belongs to this Firebase user (metadata or Firestore). */
exports.verifyStripeConnectAccount = onCall({ secrets: [stripeSecretKey] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const stripeAccountId =
    typeof request.data?.stripeAccountId === "string" ? request.data.stripeAccountId.trim() : "";
  if (!stripeAccountId) {
    throw new HttpsError("invalid-argument", "stripeAccountId is required.");
  }
  if (!/^acct_[a-zA-Z0-9]+$/.test(stripeAccountId)) {
    throw new HttpsError(
      "invalid-argument",
      "That does not look like a Stripe Connect account ID (must start with acct_).",
    );
  }

  const db = admin.firestore();
  const proRef = db.collection("pro_profiles").doc(uid);
  const proSnap = await proRef.get();
  const pro = proSnap.data() || {};
  const savedStripeId =
    typeof pro.stripe_connect_account_id === "string"
      ? pro.stripe_connect_account_id.trim()
      : "";

  let account;
  try {
    account = await getStripeClient().accounts.retrieve(stripeAccountId);
  } catch (error) {
    throw asHttpsStripeError(error, "Stripe could not find this Connect account.");
  }

  const metadataUid =
    typeof account.metadata?.uid === "string" ? account.metadata.uid.trim() : "";
  const ownsByMetadata = metadataUid === uid;
  const ownsByFirestore = savedStripeId === stripeAccountId && savedStripeId.length > 0;
  if (!ownsByMetadata && !ownsByFirestore) {
    throw new HttpsError(
      "permission-denied",
      "This Stripe account is not linked to your FixIT profile. Use Connect in the app or contact support.",
    );
  }

  await proRef.set(
    {
      stripe_connect_account_id: account.id,
      stripe_onboarding_status: account.details_submitted ? "submitted" : "pending",
      payouts_enabled: Boolean(account.payouts_enabled),
      charges_enabled: Boolean(account.charges_enabled),
      verification_updated_at: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return {
    ok: true,
    accountId: account.id,
    detailsSubmitted: Boolean(account.details_submitted),
    payoutsEnabled: Boolean(account.payouts_enabled),
    chargesEnabled: Boolean(account.charges_enabled),
  };
});

exports.createStripeIdentityVerificationSession = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

    const stripe = getStripeClient();
    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: { uid },
    });

    const db = admin.firestore();
    await db
      .collection("pro_profiles")
      .doc(uid)
      .set(
        {
          stripe_identity_session_id: session.id,
          stripe_identity_status: session.status || "requires_input",
          verification_updated_at: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    return {
      sessionId: session.id,
      clientSecret: session.client_secret,
      status: session.status,
    };
  },
);

exports.createStripePaymentIntent = onCall({ secrets: [stripeSecretKey] }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const amountCents = Number(request.data?.amountCents || 0);
  if (!Number.isFinite(amountCents) || amountCents < 50) {
    throw new HttpsError("invalid-argument", "amountCents must be at least 50.");
  }
  const currency =
    typeof request.data?.currency === "string" && request.data.currency.trim()
      ? request.data.currency.trim().toLowerCase()
      : "usd";
  const requestId = typeof request.data?.requestId === "string" ? request.data.requestId : "";
  const quoteId = typeof request.data?.quoteId === "string" ? request.data.quoteId : "";
  const proId = typeof request.data?.proId === "string" ? request.data.proId : "";
  const bookingId = typeof request.data?.bookingId === "string" ? request.data.bookingId : "";

  const stripe = getStripeClient();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amountCents),
    currency,
    automatic_payment_methods: { enabled: true },
    metadata: {
      customerId: uid,
      requestId,
      quoteId,
      proId,
      bookingId,
    },
  });

  const db = admin.firestore();
  await db
    .collection("payments")
    .doc(paymentIntent.id)
    .set(
      {
        provider: "stripe",
        stripe_payment_intent_id: paymentIntent.id,
        status: paymentIntent.status,
        amountCents: Math.round(amountCents),
        currency,
        customerId: uid,
        proId: proId || null,
        requestId: requestId || null,
        quoteId: quoteId || null,
        bookingId: bookingId || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return {
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
    status: paymentIntent.status,
  };
});

exports.stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret] },
  async (req, res) => {
    let event;
    try {
      const sig = req.headers["stripe-signature"];
      const endpointSecret = stripeWebhookSecret.value();
      if (!sig || !endpointSecret) {
        throw new Error("Missing Stripe signature or webhook secret.");
      }
      const stripe = getStripeClient();
      event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    const db = admin.firestore();
    try {
      if (event.type === "account.updated") {
        const account = event.data.object;
        const uid = account?.metadata?.uid;
        if (uid) {
          await db
            .collection("pro_profiles")
            .doc(uid)
            .set(
              {
                stripe_connect_account_id: account.id,
                stripe_onboarding_status: account.details_submitted ? "submitted" : "pending",
                payouts_enabled: Boolean(account.payouts_enabled),
                charges_enabled: Boolean(account.charges_enabled),
                verification_updated_at: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true },
            );
        }
      }

      if (
        event.type === "identity.verification_session.verified" ||
        event.type === "identity.verification_session.requires_input" ||
        event.type === "identity.verification_session.canceled"
      ) {
        const session = event.data.object;
        const uid = session?.metadata?.uid;
        if (uid) {
          await db
            .collection("pro_profiles")
            .doc(uid)
            .set(
              {
                stripe_identity_session_id: session.id,
                stripe_identity_status: session.status || "requires_input",
                verification_updated_at: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true },
            );
        }
      }

      if (
        event.type === "payment_intent.succeeded" ||
        event.type === "payment_intent.payment_failed"
      ) {
        const pi = event.data.object;
        await db
          .collection("payments")
          .doc(pi.id)
          .set(
            {
              provider: "stripe",
              stripe_payment_intent_id: pi.id,
              status: pi.status,
              amountCents: pi.amount,
              currency: pi.currency,
              customerId: pi.metadata?.customerId || null,
              proId: pi.metadata?.proId || null,
              requestId: pi.metadata?.requestId || null,
              quoteId: pi.metadata?.quoteId || null,
              bookingId: pi.metadata?.bookingId || null,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
      }
    } catch (err) {
      res.status(500).send(`Webhook handler error: ${err.message}`);
      return;
    }

    res.json({ received: true });
  },
);

exports.onPaymentCapturedCreateReviewPrompt = onDocumentUpdated("payments/{paymentId}", async (event) => {
  const before = event.data?.before?.data() || {};
  const after = event.data?.after?.data() || {};
  const previousStatus = typeof before.status === "string" ? before.status : "";
  const nextStatus = typeof after.status === "string" ? after.status : "";

  const justCaptured =
    (nextStatus === "captured" || nextStatus === "succeeded" || nextStatus === "paid")
    && previousStatus !== nextStatus;
  if (!justCaptured) return;

  const customerId = typeof after.customerId === "string" ? after.customerId : "";
  const proId = typeof after.proId === "string" ? after.proId : "";
  const bookingId = typeof after.bookingId === "string" ? after.bookingId : "";
  if (!customerId || !bookingId) return;
  if (after.reviewPromptedAt) return;

  const db = admin.firestore();
  const proName = await loadProName(db, proId);
  await db.collection("notifications").add({
    userId: customerId,
    kind: "payment_succeeded",
    title: "Payment successful",
    body: "Your payment has been confirmed.",
    read: false,
    bookingId,
    proId,
    senderDisplayName: proName,
    useAppLogoForAvatar: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await db.collection("notifications").add({
    userId: customerId,
    kind: "review_request",
    title: `Rate ${proName}`,
    body: proName,
    read: false,
    bookingId,
    proId,
    senderDisplayName: proName,
    useAppLogoForAvatar: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await event.data.after.ref.set(
    { reviewPromptedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true },
  );
});

exports.remindPendingReviews = onSchedule("every 24 hours", async () => {
  const db = admin.firestore();
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const snap = await db
    .collection("payments")
    .where("status", "in", ["captured", "succeeded", "paid"])
    .limit(500)
    .get();

  for (const paymentDoc of snap.docs) {
    const p = paymentDoc.data() || {};
    const customerId = typeof p.customerId === "string" ? p.customerId : "";
    const proId = typeof p.proId === "string" ? p.proId : "";
    const bookingId = typeof p.bookingId === "string" ? p.bookingId : "";
    if (!customerId || !bookingId) continue;

    const promptedAtMs =
      typeof p.reviewPromptedAt?.toMillis === "function" ? p.reviewPromptedAt.toMillis() : 0;
    if (!promptedAtMs || now - promptedAtMs < oneDayMs) continue;

    const remindedAtMs =
      typeof p.reviewReminderSentAt?.toMillis === "function"
        ? p.reviewReminderSentAt.toMillis()
        : 0;
    if (remindedAtMs && now - remindedAtMs < oneDayMs) continue;

    const reviewId = `${bookingId}_${customerId}`;
    const reviewSnap = await db.collection("reviews").doc(reviewId).get();
    if (reviewSnap.exists) continue;
    const proName = await loadProName(db, proId);

    await db.collection("notifications").add({
      userId: customerId,
      kind: "review_request",
      title: `Rate ${proName}`,
      body: proName,
      read: false,
      bookingId,
      proId,
      senderDisplayName: proName,
      useAppLogoForAvatar: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await paymentDoc.ref.set(
      { reviewReminderSentAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true },
    );
  }
});

function toMillisOrZero(value) {
  if (!value) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

async function syncUserRoleFreelancerIfNotStaff(db, proId) {
  const userSnap = await db.collection("users").doc(proId).get();
  const user = userSnap.data() || {};
  const prevRoleRaw =
    typeof user.role === "string" ? user.role.trim().toLowerCase() : "customer";
  const staffRoles = new Set(["manager", "admin", "owner"]);
  if (!staffRoles.has(prevRoleRaw)) {
    await db.collection("users").doc(proId).set(
      { role: "freelancer", updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true },
    );
  }
}

async function deliverProApprovedNotification(db, proId) {
  const notifRef = await db.collection("notifications").add({
    userId: proId,
    kind: "pro_approved",
    title: "You're approved as a provider",
    body:
      "FixIT approved your application. Open the Pro workspace to receive incoming jobs and incoming leads.",
    read: false,
    useAppLogoForAvatar: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const userSnap = await db.collection("users").doc(proId).get();
  const user = userSnap.data() || {};
  const pushEnabled = user.pushNotificationsEnabled !== false;
  const expoPushToken = typeof user.expoPushToken === "string" ? user.expoPushToken : "";
  if (pushEnabled && expoPushToken.startsWith("ExponentPushToken[")) {
    try {
      await sendExpoPushMessage({
        to: expoPushToken,
        sound: "default",
        title: "You're approved as a provider",
        body: "FixIT approved your application — open Pro workspace to receive jobs.",
        data: {
          kind: "pro_approved",
          notificationId: notifRef.id,
        },
      });
    } catch (err) {
      console.error("deliverProApprovedNotification: Expo push failed", err?.message ?? err);
    }
  }
}

function isCompleteTradeLicense(license) {
  if (!license || typeof license !== "object") return false;
  return (
    typeof license.licenseNumber === "string" &&
    license.licenseNumber.trim().length > 0 &&
    typeof license.licenseState === "string" &&
    license.licenseState.trim().length > 0 &&
    typeof license.licenseExpirationDate === "string" &&
    license.licenseExpirationDate.trim().length > 0 &&
    typeof license.licenseDocumentUrl === "string" &&
    license.licenseDocumentUrl.trim().length > 0
  );
}

function stableJson(value) {
  return JSON.stringify(value || {});
}

async function enqueueProProfileReview(proId, data, source) {
  const status = typeof data.verification_status === "string" ? data.verification_status : "";
  if (status !== "pending_approval") return;
  await upsertQueueItem("pro_review_queue", proId, {
    queueType: "pro_profile",
    proId,
    ownerId: typeof data.ownerId === "string" ? data.ownerId : proId,
    title: typeof data.title === "string" ? data.title : "",
    verificationStatus: status,
    categoryIds: Array.isArray(data.categoryIds) ? data.categoryIds : [],
    source,
    submittedAt: data.verification_submitted_at || serverTimestamp(),
  });
}

async function enqueueTradeLicenseReviews(proId, data, source) {
  const licenses = licenseReviewMap(data);
  const tasks = Object.entries(licenses).map(async ([categoryId, license]) => {
    if (!isCompleteTradeLicense(license)) return;
    const queueId = `${proId}_${categoryId}`;
    await upsertQueueItem("trade_license_review_queue", queueId, {
      queueType: "trade_license",
      proId,
      categoryId,
      licenseNumber: license.licenseNumber,
      licenseState: license.licenseState,
      licenseExpirationDate: license.licenseExpirationDate,
      licenseDocumentUrl: license.licenseDocumentUrl,
      source,
      submittedAt: serverTimestamp(),
    });
  });
  await Promise.all(tasks);
}

exports.onProProfileCreatedEnqueueReview = onDocumentCreated("pro_profiles/{proId}", async (event) => {
  const after = event.data?.data() || {};
  const proId = event.params.proId;
  if (!proId) return;
  await enqueueProProfileReview(proId, after, "profile_created");
  await enqueueTradeLicenseReviews(proId, after, "profile_created");
});

exports.onProProfileUpdatedEnqueueReview = onDocumentUpdated("pro_profiles/{proId}", async (event) => {
  const before = event.data?.before?.data() || {};
  const after = event.data?.after?.data() || {};
  const proId = event.params.proId;
  if (!proId) return;

  const prevStatus = typeof before.verification_status === "string" ? before.verification_status : "";
  const nextStatus = typeof after.verification_status === "string" ? after.verification_status : "";
  if (prevStatus !== "pending_approval" && nextStatus === "pending_approval") {
    await enqueueProProfileReview(proId, after, "profile_submitted");
  }

  const beforeLicenses = before.compliance_private?.licensesByCategoryId || {};
  const afterLicenses = after.compliance_private?.licensesByCategoryId || {};
  if (stableJson(beforeLicenses) !== stableJson(afterLicenses)) {
    await enqueueTradeLicenseReviews(proId, after, "license_updated");
  }
});

exports.onProComplianceCreatedEnqueueReview = onDocumentCreated("pro_compliance/{proId}", async (event) => {
  const after = event.data?.data() || {};
  const proId = event.params.proId;
  if (!proId) return;
  await enqueueTradeLicenseReviews(proId, after, "compliance_created");
});

exports.onProComplianceUpdatedEnqueueReview = onDocumentUpdated("pro_compliance/{proId}", async (event) => {
  const before = event.data?.before?.data() || {};
  const after = event.data?.after?.data() || {};
  const proId = event.params.proId;
  if (!proId) return;
  const beforeLicenses = before.compliance_private?.licensesByCategoryId || {};
  const afterLicenses = after.compliance_private?.licensesByCategoryId || {};
  if (stableJson(beforeLicenses) !== stableJson(afterLicenses)) {
    await enqueueTradeLicenseReviews(proId, after, "compliance_license_updated");
  }
});

exports.onReviewCreatedEnqueueModeration = onDocumentCreated("reviews/{reviewId}", async (event) => {
  const review = event.data?.data() || {};
  const reviewId = event.params.reviewId;
  if (!reviewId) return;
  await upsertQueueItem("content_review_queue", reviewId, {
    queueType: "review",
    reviewId,
    customerId: typeof review.customerId === "string" ? review.customerId : "",
    proId: typeof review.proId === "string" ? review.proId : "",
    rating:
      typeof review.rating === "number"
        ? review.rating
        : typeof review.customerRating === "number"
          ? review.customerRating
          : null,
    source: "review_created",
    submittedAt: review.createdAt || serverTimestamp(),
  });
});

/**
 * When admin (or tooling) sets pro verification to approved, sync `users.role`, notify + push.
 */
exports.onProVerificationApprovedNotify = onDocumentUpdated("pro_profiles/{proId}", async (event) => {
  const before = event.data?.before?.data() || {};
  const after = event.data?.after?.data() || {};
  const prev =
    typeof before.verification_status === "string" ? before.verification_status.trim() : "";
  const next = typeof after.verification_status === "string" ? after.verification_status.trim() : "";
  if (prev === "approved" || next !== "approved") return;

  const proId = event.params.proId;
  if (!proId) return;

  const db = admin.firestore();
  await syncUserRoleFreelancerIfNotStaff(db, proId);
  await deliverProApprovedNotification(db, proId);
});

/**
 * Console-created `pro_profiles` may start as approved (no prior snapshot) — still sync users.role + notify.
 */
exports.onProProfileCreatedApprovedSync = onDocumentCreated("pro_profiles/{proId}", async (event) => {
  const after = event.data?.data() || {};
  const next =
    typeof after.verification_status === "string" ? after.verification_status.trim() : "";
  if (next !== "approved") return;

  const proId = event.params.proId;
  if (!proId) return;

  const db = admin.firestore();
  await syncUserRoleFreelancerIfNotStaff(db, proId);
  await deliverProApprovedNotification(db, proId);
});

exports.expireStaleStripeOnboarding = onSchedule("every 24 hours", async () => {
  const db = admin.firestore();
  const now = Date.now();
  const staleAfterMs = 14 * 24 * 60 * 60 * 1000; // 14 days

  const snap = await db
    .collection("pro_profiles")
    .where("stripe_onboarding_status", "in", ["created", "pending"])
    .limit(500)
    .get();

  for (const proDoc of snap.docs) {
    const data = proDoc.data() || {};
    const payoutsEnabled = data.payouts_enabled === true;
    if (payoutsEnabled) continue;

    const lastUpdatedMs = Math.max(
      toMillisOrZero(data.updatedAt),
      toMillisOrZero(data.verification_updated_at),
      toMillisOrZero(data.createdAt),
    );
    if (!lastUpdatedMs || now - lastUpdatedMs < staleAfterMs) continue;

    await proDoc.ref.set(
      {
        stripe_onboarding_status: "expired",
        stripe_connect_account_id: null,
        stripe_identity_session_id: null,
        stripe_identity_status: null,
        payouts_enabled: false,
        stripe_onboarding_expired_at: admin.firestore.FieldValue.serverTimestamp(),
        verification_updated_at: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
});

async function logCleanupFailure(kind, target, error) {
  await admin.firestore().collection("cleanup_failures").add({
    kind,
    target,
    error: typeof error?.message === "string" ? error.message.slice(0, 500) : "Cleanup failed.",
    retryCount: 0,
    createdAt: serverTimestamp(),
  });
}

exports.retryStaleAccountDeletions = onSchedule("every 6 hours", async () => {
  const db = admin.firestore();
  const snap = await db
    .collection("account_deletion_requests")
    .where("status", "in", ["requested", "in_progress", "failed"])
    .limit(50)
    .get();

  for (const deletionDoc of snap.docs) {
    const data = deletionDoc.data() || {};
    if (data.legalHold === true) continue;
    const uid = deletionDoc.id;
    const user = await admin.auth().getUser(uid).catch(() => null);
    try {
      await executeAccountDeletion({
        uid,
        email: typeof user?.email === "string" ? user.email : "",
        requestedBy: typeof data.requestedBy === "string" ? data.requestedBy : uid,
      });
    } catch (err) {
      await logCleanupFailure("account_deletion_retry", uid, err);
    }
  }
});

async function ownerExistsForStoragePrefix(root, uid) {
  const db = admin.firestore();
  const collectionName =
    root === "portfolio" || root === "pro_videos" || root === "applications"
      ? "pro_profiles"
      : "users";
  const snap = await db.collection(collectionName).doc(uid).get();
  return snap.exists;
}

exports.sweepOrphanedStorage = onSchedule("every 24 hours", async () => {
  const bucket = admin.storage().bucket();
  const roots = ["users", "requests", "exports", "portfolio", "pro_videos", "applications"];
  for (const root of roots) {
    let files = [];
    try {
      [files] = await bucket.getFiles({ prefix: `${root}/`, autoPaginate: false, maxResults: 500 });
    } catch (err) {
      await logCleanupFailure("storage_list", root, err);
      continue;
    }
    for (const file of files) {
      const [, uid] = file.name.split("/");
      if (!uid) continue;
      const exists = await ownerExistsForStoragePrefix(root, uid).catch(() => true);
      if (exists) continue;
      try {
        await file.delete({ ignoreNotFound: true });
      } catch (err) {
        await logCleanupFailure("orphan_storage_delete", file.name, err);
      }
    }
  }
});

exports.cleanupOldNotifications = onSchedule("every 24 hours", async () => {
  const db = admin.firestore();
  const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const snap = await db
    .collection("notifications")
    .where("createdAt", "<", cutoff)
    .limit(500)
    .get();
  for (const docSnap of snap.docs) {
    await docSnap.ref.delete().catch((err) => logCleanupFailure("notification_delete", docSnap.id, err));
  }
});

exports.escalateStaleReviewQueueItems = onSchedule("every 24 hours", async () => {
  const db = admin.firestore();
  const staleBeforeMs = Date.now() - 3 * 24 * 60 * 60 * 1000;
  for (const collectionName of REVIEW_QUEUE_COLLECTIONS) {
    const snap = await db.collection(collectionName).where("status", "==", "pending").limit(200).get();
    for (const queueDoc of snap.docs) {
      const data = queueDoc.data() || {};
      const submittedAtMs = toMillisOrZero(data.submittedAt || data.createdAt);
      if (!submittedAtMs || submittedAtMs > staleBeforeMs) continue;
      await queueDoc.ref.set(
        {
          status: "escalated",
          escalationReason: "Review queue item is older than 3 days.",
          escalatedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
  }
});

function legacyPrivateProFields(data) {
  const privateData = {};
  if (data.application_draft && typeof data.application_draft === "object") {
    privateData.application_draft = data.application_draft;
  }
  if (data.compliance_private && typeof data.compliance_private === "object") {
    privateData.compliance_private = data.compliance_private;
  }
  [
    "legalName",
    "dateOfBirth",
    "serviceAddress",
    "ssnOrEin",
    "baseLocationLat",
    "baseLocationLng",
    "gpsAddressDetected",
    "stripeAccountId",
    "work_profile",
  ].forEach((key) => {
    if (data[key] !== undefined) privateData[key] = data[key];
  });
  return privateData;
}

async function scrubLegacyProComplianceDoc(proDoc) {
  const data = proDoc.data() || {};
  const privateData = legacyPrivateProFields(data);
  if (Object.keys(privateData).length === 0) return false;

  const proId = proDoc.id;
  const db = admin.firestore();
  await db.collection("pro_compliance").doc(proId).set(
    {
      ownerId: typeof data.ownerId === "string" ? data.ownerId : proId,
      ...privateData,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  const remove = admin.firestore.FieldValue.delete();
  await proDoc.ref.set(
    {
      application_draft: remove,
      compliance_private: remove,
      legalName: remove,
      dateOfBirth: remove,
      serviceAddress: remove,
      ssnOrEin: remove,
      baseLocationLat: remove,
      baseLocationLng: remove,
      gpsAddressDetected: remove,
      stripeAccountId: remove,
      work_profile: remove,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return true;
}

exports.scrubLegacyProCompliance = onSchedule("every 24 hours", async () => {
  const db = admin.firestore();
  const snap = await db.collection("pro_profiles").limit(500).get();
  for (const proDoc of snap.docs) {
    try {
      await scrubLegacyProComplianceDoc(proDoc);
    } catch (err) {
      await logCleanupFailure("legacy_pro_compliance_scrub", proDoc.id, err);
    }
  }
});
