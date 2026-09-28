<p align="center">
  <img src="icon-192.png" width="72" alt="Rounds logo">
</p>

<h1 align="center">Rounds</h1>

<p align="center">
  <b>Stop doing free revision rounds.</b><br>
  An app for freelance designers that counts every round of client feedback,<br>
  flags work beyond the agreement and turns it into a price and a ready message.
</p>

<p align="center">
  <a href="https://rounds-gamma-inky.vercel.app"><b>Open the app</b></a> ·
  <a href="https://rounds.gt.tc"><b>Website</b></a>
</p>

<p align="center">
  <img src="docs/preview.jpg" width="720" alt="Rounds preview">
</p>

---

## The problem

You agree on two revision rounds. You end up on round five, for free. Feedback arrives through email, WhatsApp and calls, and nobody keeps count. Asking the client to pay for extra work feels awkward, so most freelancers just do it.

## How Rounds helps

1. **Paste the feedback.** From email, WhatsApp or a call. Every line becomes a change.
2. **See what's extra.** Rounds knows what your agreement covers and suggests the hours for everything else. You make the final call.
3. **Send the price.** A ready message in English, German or Russian. Copy it, send it, get paid.

## Features

| | |
|---|---|
| **Estimates** | Type or paste changes, get suggested time per change, adjust with − / +, see the total update live |
| **Projects** | Fixed fee, included rounds, hourly rate and deliverables per client |
| **Round tracking** | Every round is counted; rounds past the agreement and new deliverables are flagged automatically |
| **Client messages** | Ready-to-send replies in EN / DE / RU with paid and included changes separated |
| **Client view** | Preview the approval screen your client will see: extras to tick, name and time (shareable link comes with Pro) |
| **Change log** | Copy a log of all changes for your invoice |
| **Activity & earnings** | Extra income per month, approvals, deliveries |
| **Accounts & sync** | Optional account, projects sync across devices; recovery key instead of email reset |
| **Works offline** | Installable PWA for iPhone, Android and desktop |
| **Languages** | English, Deutsch, Русский |
| **Themes** | Light, dark or follow the system |

## Plans

| Free | Pro (coming soon) |
|---|---|
| Up to 10 projects | Unlimited projects |
| Unlimited estimates | Client approval link |
| Client messages in EN, DE, RU | Change log for invoices |
| €0 | €9 / month · first 100 on the waitlist get a year free |

---

## Tech stack

- **Frontend:** a single `index.html` — vanilla JavaScript, no framework, no build step
- **Backend:** one serverless function `api/r.js` on **Vercel** (Node.js)
- **Database:** **Upstash Redis** (via Vercel Storage), REST API
- **Offline:** Service Worker `sw.js` + Web App Manifest

## Project structure

```
.
├── index.html              # the whole app (UI, logic, translations)
├── api/
│   └── r.js                # accounts & sync API
├── sw.js                   # service worker (offline cache)
├── manifest.webmanifest    # PWA manifest
├── vercel.json             # routing, caching and security headers
├── icon-*.png, favicon.*   # icons
└── docs/preview.jpg        # image for this README
```

## Deploy your own

1. **Fork** this repository.
2. In **Vercel** → *Add New Project* → import the repo. No build settings needed.
3. In the project → **Storage** → *Create* → **Upstash for Redis** (Free plan). Connect it to Production and Preview. The environment variables are added automatically.
4. *(Optional)* **Settings → Environment Variables:** add `ADMIN_EMAILS` with your email to see the admin panel in *Account*.
5. **Redeploy.** Done.

| Variable | Required | Purpose |
|---|---|---|
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | yes | Upstash Redis connection (added by Vercel Storage) |
| `ADMIN_EMAILS` | no | Comma-separated emails with admin access |

Without a database the app still works fully offline on each device; only accounts and sync are disabled.

## Run locally

```bash
npx vercel dev
```

Or just open `index.html` through any static server — everything except accounts works without a backend.

## Security

- Passwords and recovery keys are hashed with **scrypt** and compared in constant time
- Random 256-bit session tokens, 180-day sessions, sign-out from all devices on password reset
- Rate limits on sign-in, sign-up, recovery and account deletion
- Every user can read and write only their own data
- Content Security Policy, `X-Frame-Options`, `nosniff`, HSTS and a strict referrer policy
- All user input is escaped before rendering

Found a vulnerability? Please report it privately by email instead of opening a public issue.

## Roadmap

- [x] Estimates, projects, rounds, client messages
- [x] Accounts and sync across devices
- [x] German language, light theme
- [ ] Pro plan and payments
- [ ] Shareable client approval link
- [ ] Custom domain
- [ ] Native iOS / Android apps

---

<p align="center">
  Made for freelancers who are tired of round five.<br>
  © 2026 Rounds
</p>
