const assert = require("assert");
const fs = require("fs");
const path = require("path");

const functionsRoot = path.resolve(__dirname, "..");
const appRoot = path.resolve(functionsRoot, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(appRoot, relativePath), "utf8");
}

const index = fs.readFileSync(path.join(functionsRoot, "index.js"), "utf8");
const firestoreRules = read("firebase/firestore.rules");
const storageRules = read("firebase/storage.rules");
const indexes = JSON.parse(read("firebase/firestore.indexes.json"));

[
  "requireStaffRole",
  "writeAdminAuditLog",
  "exports.setUserRole",
  "exports.suspendUser",
  "exports.approveProProfile",
  "exports.rejectProProfile",
  "exports.approveTradeLicense",
  "exports.rejectTradeLicense",
  "exports.claimReviewQueueItem",
  "exports.onProProfileUpdatedEnqueueReview",
  "exports.onProComplianceUpdatedEnqueueReview",
  "exports.retryStaleAccountDeletions",
  "exports.sweepOrphanedStorage",
  "exports.scrubLegacyProCompliance",
].forEach((needle) => assert(index.includes(needle), `Missing ${needle} in functions index.`));

[
  "match /pro_compliance/{proId}",
  "match /admin_audit_logs/{logId}",
  "match /pro_review_queue/{queueId}",
  "match /trade_license_review_queue/{queueId}",
  "match /account_deletion_requests/{uid}",
  "proProtectedUpdateAllowed",
].forEach((needle) => assert(firestoreRules.includes(needle), `Missing ${needle} in Firestore rules.`));

assert(
  storageRules.includes("match /applications/{uid}/{allPaths=**}")
    && storageRules.includes("isStaff()"),
  "Storage rules must allow staff review reads for application documents.",
);

const indexedCollections = new Set(indexes.indexes.map((entry) => entry.collectionGroup));
[
  "pro_review_queue",
  "trade_license_review_queue",
  "content_review_queue",
  "account_deletion_requests",
].forEach((collection) => {
  assert(indexedCollections.has(collection), `Missing Firestore index for ${collection}.`);
});

console.log("Backend foundation smoke checks passed.");
