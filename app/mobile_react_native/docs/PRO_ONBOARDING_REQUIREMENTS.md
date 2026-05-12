# Pro onboarding and compliance requirements (US-first)

This document defines the complete product, legal, data, and UI requirements for onboarding professionals (service providers) on FixIT.

Goal: allow a freelancer to apply, get verified, receive jobs, and submit quotes only when compliant.

---

## 1) Scope and principles

- Market scope (phase 1): United States only.
- Product role: FixIT is a marketplace connecting customers and independent professionals.
- Risk posture: enforce legal consent and verification before provider activity.
- Priority: keep onboarding simple enough for conversion, strict enough for trust and legal baseline.
- Architecture split: keep infrastructure in Firebase, financial and compliance workflows in dedicated providers.

Service ownership boundaries:
- Firebase: app data, state, permissions, workflow status, internal audit fields.
- Stripe Connect + Stripe Identity: payouts, KYC, bank verification, tax reporting support (1099 flows).
- Checkr: background checks and adjudication status sync.
- Twilio (phone masking): temporary relay numbers to reduce off-platform bypass and preserve dispute traceability.

---

## 2) Required onboarding flow (4 screens)

### Screen 1 — Identity and tax

Collect:
- legal full name (required)
- date of birth (required)
- service address (required)
- SSN / EIN (required for US payout/tax onboarding)
- government ID verification (required; Stripe Identity preferred in phase 1)

Validation:
- no empty required fields
- date format and age validation
- ID upload must complete before submission

### Screen 2 — Work profile and licensing

Collect:
- service categories (required; controlled list)
- service radius in miles (required)
- license number (conditional required)
- issuing authority (optional phase 1, recommended)
- expiration date (conditional required)
- optional license file upload

Rule:
- if selected service category is regulated (example: electrician, plumbing in licensed jurisdictions), license fields become required.

Validation:
- expiration date must be in the future
- cannot proceed for regulated categories without required license fields

### Screen 3 — Trust and insurance

Collect:
- COI upload (Certificate of Insurance, optional but recommended)
- self-declaration on criminal history (initial declaration before background result)

Rules:
- insured badge can only be granted after admin verifies submitted COI
- this step does not replace mandatory legal consent

### Screen 4 — Payouts and legal

Collect/flow:
- single CTA: `Connect with Stripe`
- open Stripe Connect onboarding (web flow)
- return onboarding status to app profile

Rules:
- no manual bank form in FixIT app
- payout eligibility depends on Stripe onboarding completion

Mandatory checkboxes:
- provider Terms of Service
- commission policy acknowledgment
- privacy policy acknowledgment
- independent contractor declaration
- marketplace disclaimer (FixIT does not insure provider work)
- declaration that submitted information is true and accurate

Rules:
- all mandatory checkboxes must be accepted to submit application

---

## 3) Insurance policy for phase 1

### Mandatory
- professional accepts legal disclaimer that provider is responsible for work-related damages/claims.
- platform does not present itself as work insurer.

### Optional but recommended
- allow COI (Certificate of Insurance) upload.
- if admin verifies COI, provider can get trust badge.

Customer-facing transparency:
- show `This pro is insured` when insurance is verified.
- otherwise show `This pro has not provided insurance details`.

Explicit copy guardrails:
- do not use wording that implies FixIT provides provider liability coverage.
- do not use wording that implies all providers are insured unless verified per profile.

---

## 4) Verification statuses and lifecycle

Primary field (implemented in app):
- `verification_status`: `pending_approval` | `approved` | `rejected`
- Customer discovery and incoming requests load only when `verification_status === "approved"` (plus `isActive`).
- Compliance document URLs belong in Firestore map `compliance_private` + Firebase Storage prefix `applications/{uid}/`; **not** shown to customers — public trust uses `is_licensed`, `is_insured`, and optional root `licenseNumber` text after admin verification.

Regulated categories (license fields mandatory on apply if **any** selected category matches):
`electrician`, `plumber`, `hvac`, `pest_control`, `locksmith`, `roofing`, `garage_door`, `pool_spa`.

Source of truth in code: `src/features/pro/data/regulatedCategoryIds.ts`.

**Appliance repair (not regulated in-app):** Most residential appliance work does not use the same license gate as the trades above, but **gas appliance** service (e.g. gas dryer, gas range) often requires a **licensed plumber or gas fitter** under state law. For MVP, `appliance_repair` stays out of `REGULATED_CATEGORY_IDS`; add an in-app scope / safety warning later if pros check “gas appliance” work.

Recommended support fields:
- `verification_submitted_at`
- `verification_reviewed_at`
- `verification_reviewed_by`
- `verification_rejection_reason` (optional, for support and audit)

Insurance status:
- `insurance_status`: `not_provided | submitted | verified | expired | rejected`

Background check status:
- `background_check_status`: `not_started | pending | clear | flagged`

---

## 5) Enforcement rules (critical)

Provider must be blocked from pro actions unless approved:
- cannot submit quote when `verification_status != approved`
- cannot receive dispatch when `verification_status != approved`
- cannot be listed as active discoverable provider when `verification_status != approved`
- cannot access unmasked customer phone numbers

Security model:
- enforce sensitive status transitions in Cloud Functions, not client-only writes
- Firestore rules must prevent unauthorized role/status changes from mobile client

---

## 6) Firestore data model (minimum)

Collection:
- `pro_profiles/{uid}`

Required fields:
- `uid`
- `role` (`pro`)
- `verification_status`
- `verification_submitted_at`
- `categories`
- `is_active`

Identity and legal fields:
- `legal_name`
- `date_of_birth`
- `service_address`
- `government_id_file_url`
- `independent_contractor_accepted`
- `independent_contractor_accepted_at`
- `terms_accepted_at`
- `commission_policy_accepted_at`
- `privacy_accepted_at`
- `marketplace_disclaimer_accepted_at`

License fields:
- `license_required` (derived per category)
- `license_number` (conditional required)
- `license_expiration_date` (conditional required)
- `license_file_url` (optional phase 1)

Payout fields:
- `stripe_connect_account_id`
- `stripe_onboarding_status`
- `payouts_enabled`
- `stripe_identity_status` (if Identity is used)

Insurance fields:
- `insurance_status`
- `insurance_disclaimer_accepted`
- `insurance_disclaimer_accepted_at`
- `coi_file_url` (optional)
- `insured_badge`
- `insured_badge_verified_at`
- `insured_badge_verified_by`

Background check fields:
- `background_check_status`
- `background_check_provider` (`checkr`)
- `background_check_completed_at`
- `background_check_report_id` (provider reference id)

Communication/bypass control fields:
- `phone_masking_enabled`
- `phone_masking_provider` (`twilio`)

---

## 7) Admin operations

Admin needs:
- queue of pending provider applications
- ability to open submitted documents
- approve/reject application
- set/clear insured badge after COI review
- monitor background-check states (clear/flagged)
- audit trail for reviewer and timestamps

---

## 8) UI and UX requirements

- onboarding is step-based with visible progress (1/4, 2/4, 3/4, 4/4)
- show blocked reason clearly when user tries to quote before approval
- keep language simple and explicit for legal consent text
- avoid mixing pro onboarding controls into customer account screens
- pro workspace should include a dedicated requirements screen summarizing all conditions
- show phone contact via masked relay only while booking is active and policy permits

---

## 9) Copy requirements (must appear in app)

Independent contractor declaration should clearly state:
- provider is an independent contractor, not employee/agent of FixIT
- provider is solely responsible for service execution and damages
- FixIT acts only as a marketplace and does not supervise field work

Marketplace insurance disclaimer should clearly state:
- FixIT does not provide provider liability/work insurance for jobs booked through the app
- provider may upload insurance proof for trust display

Background-check disclosure should state:
- provider eligibility may depend on third-party background screening results.

Phone-masking disclosure should state:
- direct personal phone numbers may be hidden; communication can be routed through masked numbers.

---

## 10) Out of scope for phase 1

- VAT-specific fields (non-US)
- fully automated insurance verification API
- advanced national multi-jurisdiction license policy engine
- platform-provided blanket insurance product
- custom in-house KYC or payout processing outside Stripe Connect

---

## 11) Definition of done for this feature

Complete only when:
- 4-step pro onboarding is implemented
- required legal consents are stored with timestamps
- verification status is enforced in backend/rules
- non-approved providers are blocked from quoting/dispatch
- Stripe Connect onboarding is linked and status is persisted
- background check status exists and can block approval when flagged
- phone masking policy is enforced in contact flows
- requirements summary screen exists under `/pro/requirements`
- admin review path exists for approve/reject and insurance badge
- docs are updated and aligned with README
