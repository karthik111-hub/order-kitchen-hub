# ServeSync — Restaurant Order Management App

## Overview
A two-role Expo mobile app for restaurants. A **Master** (waiter) builds the menu and places orders using a Zomato/Swiggy-style quantity cart. A **Chef** sees new tickets appear in the kitchen and pushes them through Pending → Preparing → Completed. Auto-refresh polling keeps both sides in sync.

## Users (password-gated role selection)
- **Admin** — password `MissionImpossible10*` — manages categories, menu items, tags. Sees all orders.
- **Master (Waiter)** — password `Sandy0088` — takes orders from the floor.
- **Chef** — password `Sari0808` — cooks tickets in the kitchen.
Passwords live in `/app/backend/.env` and are verified via `POST /api/auth/verify`.

## Features
### Admin
- **Categories tab** — create / delete categories (e.g., Starters, Main Course, Soups). Deleting a category cascades to its items.
- **Items tab** — pick a category, add items via a bottom-sheet form: photo picker, name, price, and an *optional* highlight tag (**Must Buy** / **Most Selling**).
- **Orders tab** — full order history with status filters.

### Master
- **Menu tab** — **list view** of dishes grouped by category, thumbnail on the left, price + Zomato-style ADD → stepper (+/-). Category filter chips (All / per-category). Tag pills (**MUST BUY** / **MOST SELLING**) shown next to item names. Sticky glass cart at the bottom.
- **Cart bottom sheet** — review items, optional table number + chef notes, "Send to Kitchen".
- **Orders tab** — order history with status pills + filter chips, polls every 5s.

### Chef
- Three tabs: **Pending / Preparing / Completed**.
- Large-typography ticket cards (order #, table, elapsed time colour-coded by urgency, items with big quantities, chef notes highlighted).
- Massive touch targets: "Start Preparing" and "Mark Complete" buttons transition orders through the workflow.
- Auto-refresh polling every 4s so new orders appear without user action.

## API (FastAPI + MongoDB)
- `POST /api/auth/verify` — validate role + password
- `GET/POST/DELETE /api/categories` — categories (delete cascades to items)
- `GET/POST/DELETE /api/menu` — menu items (`category` required, optional `tag`, `?category=` filter)
- `GET /api/orders?status=` · `POST /api/orders` · `PATCH /api/orders/{id}/status` · `GET /api/orders/{id}`
- `GET/POST/DELETE /api/razorpay/settings` · `GET /api/razorpay/settings/status`
- `POST /api/razorpay/intent` — creates a Razorpay order + intent record; returns hosted `checkout_url`
- `POST /api/razorpay/intent/{id}/finalize` — HMAC-SHA256 signature verification; creates a paid Order
- `GET /api/razorpay/checkout/{intent_id}` — HTML page hosting checkout.js
- `GET /api/reports/daily.xlsx?date=YYYY-MM-DD` — streamed Excel report with summary

## Order ID format
`YYYYMMDD-HHMMSS-XXXXXXXX` (uppercase hex, 8 chars). UI shows only the last segment.

## Payment flow
1. Master opens cart → 2 buttons: **Send Directly to Kitchen** (unpaid) or **Pay & Send** (Razorpay).
2. If Razorpay is not configured (`GET /razorpay/settings/status`), Pay & Send is disabled with a hint.
3. Otherwise, `POST /razorpay/intent` creates a Razorpay order + intent record. Client opens the backend-hosted checkout page via `expo-web-browser`.
4. Razorpay checkout.js posts payment result to `/razorpay/intent/{id}/finalize`. Signature is verified server-side; on success a paid Order is created.
5. Client polls the intent status; on completion, cart clears and Master lands on the Orders screen.

## Tech
- Expo Router (Stack + Tabs), React Native, expo-image, expo-image-picker, expo-blur, expo-haptics.
- FastAPI + Motor (async MongoDB). Pydantic response models — no `_id` leakage.

## Not in Scope (yet)
- Authentication, multi-restaurant tenancy, receipt printing, payments, categories/filters, item modifiers.
