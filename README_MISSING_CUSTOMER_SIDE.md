# FixIT - Customer Side Checkbox Tracker

Use this as the live checklist for customer-side completion.

## Already Done

- [x] Firebase project connected
- [x] Firestore rules deployed
- [x] Storage rules deployed
- [x] Core app collections wired in code (`users`, `categories`, `pro_profiles`, `service_requests`, `chat_threads`, `chat_messages`, `notifications`, `banners`)
- [x] Demo fallback removed from key discovery/messages flows

## 1) Authentication UX (High)

- [ ] Build Sign up screen (Email/Password)
- [ ] Build Sign in screen (Email/Password)
- [ ] Add auth gate (guest vs signed-in customer)
- [ ] Add proper sign-out UX + session handling
- [ ] Migrate from anonymous-first to real account-first flow

## 2) Offers / Quotes Flow (High)

- [ ] Listen to `quotes` by `requestId` in offers screen
- [ ] Add quote sorting/filtering UI
- [ ] Implement secure "Accept Quote" path
- [ ] Prevent client-only unsafe status transitions

## 3) Booking Flow (High)

- [ ] Create bookings from accepted quotes (`bookings`)
- [ ] Show booking timeline and current status
- [ ] Add customer "My Requests / My Bookings" history page

## 4) Payments (High)

- [ ] Integrate Stripe client flow
- [ ] Create and confirm payment intent
- [ ] Add webhook-driven payment status sync (`payments`)
- [ ] Show payment success/failure UI states

## 5) Request Attachments (High)

- [ ] Add image/video picker in request form
- [ ] Upload request media to Storage paths
- [ ] Save media URLs/refs in Firestore request docs
- [ ] Render request attachments in customer/pro views

## 6) Location & Addresses (Medium)

- [ ] Save selected address/location in Firestore
- [ ] Support multiple saved addresses
- [ ] Use saved coordinates in discovery + request context

## 7) Notifications Producer Flow (Medium)

- [ ] Add notification producer logic (server-side)
- [ ] Emit notification on new quote
- [ ] Emit notification on new message
- [ ] Emit notification on booking status changes
- [ ] Emit notification on payment events

## 8) Data Quality / Content (Medium)

- [ ] Seed real categories in Firestore
- [ ] Seed real banners in Firestore
- [ ] Ensure empty states are clean on all customer pages
- [ ] Remove remaining placeholder text where backend exists

## 9) Security Hardening (High Before Launch)

- [ ] Tighten Firestore rules to strict ownership/role checks
- [ ] Tighten Storage rules to least privilege per path
- [ ] Move sensitive transitions to Cloud Functions
- [ ] Complete collection-by-collection security audit

## 10) Cloud Functions Completion (High)

- [ ] Implement quote acceptance backend handler
- [ ] Implement booking transition handlers
- [ ] Implement payment lifecycle handlers
- [ ] Implement notification fan-out handlers

## 11) Testing & Release Readiness (Medium)

- [ ] Add integration tests for main customer journeys
- [ ] Add analytics events for customer funnel
- [ ] Validate offline/failure states
- [ ] Validate denied-permission states
- [ ] Final EAS release checks

## MVP Done Criteria (Customer Side)

- [ ] Customer can register/login
- [ ] Customer can create request (with optional attachments)
- [ ] Customer receives and compares live quotes
- [ ] Customer accepts quote and creates booking
- [ ] Customer completes payment in app
- [ ] Customer tracks booking + receives notifications
- [ ] Customer sees full request/booking/payment history

