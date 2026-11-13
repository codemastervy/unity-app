# Firebase setup (free Spark plan)

Unity runs without Firebase. Do this only to switch on optional accounts, sync, live content and suggestions.

## 1. Create the project
1. https://console.firebase.google.com → **Add project** → name `unity-nz` (any). **Turn Google Analytics OFF** (no tracking SDKs).
2. Stay on **Spark (free)**. Only move to Blaze if scheduled push needs Cloud Functions — set a **$1 budget alert first**.

## 2. Firestore — region matters, it can't be changed later
1. Build → Firestore Database → Create → **Production mode** → location **`australia-southeast1` (Sydney)**.
2. Never use test-mode rules.

## 3. Authentication
1. Build → Authentication → Sign-in method → enable **Email/Password** and **Google**.
2. Settings → **User actions**: keep "Email enumeration protection" ON.
3. Settings → Authorized domains: keep only your hosting domains (+ `localhost` for dev).

## 4. Web app config
1. Project settings → Your apps → **Web** → register (enable Hosting).
2. Copy the config values into `.env` (copy from `.env.example`). `.env` is gitignored.
3. Put the project ID in `.firebaserc`.

## 5. Restrict the API key
Google Cloud console → APIs & Services → Credentials → the "Browser key":
- Application restrictions → **Websites**: `https://<project>.web.app/*`, `https://<project>.firebaseapp.com/*`, your custom domain, `http://localhost:5173/*` (dev only).
- API restrictions → only: Identity Toolkit API, Token Service API, Cloud Firestore API, Firebase Installations API, Firebase App Check API.

## 6. App Check (enforced)
1. Google Cloud → **reCAPTCHA Enterprise** → create a **website key** for your domains → put it in `VITE_RECAPTCHA_ENTERPRISE_KEY`.
2. Firebase → App Check → register the web app with reCAPTCHA Enterprise.
3. Watch the metrics for a day, then click **Enforce** for **Cloud Firestore** and **Authentication**.
4. Local dev: App Check → Manage debug tokens → add one → `VITE_APPCHECK_DEBUG_TOKEN` in `.env` (dev builds only).
5. Native (later): register iOS (App Attest) and Android (Play Integrity) apps before enforcing, or the native apps will be blocked.

## 7. Deploy rules + seed content
```bash
npx firebase login
npm run test:rules                         # must pass
npx firebase deploy --only firestore:rules
# Admin seed: download a service-account key OUTSIDE the repo, never commit it
GOOGLE_APPLICATION_CREDENTIALS=~/keys/unity-admin.json npm run seed:firestore -- --project <project-id>
```

## 8. Deploy the PWA
```bash
npm run deploy     # check + rules tests + build + deploy hosting & rules
```
Then check https://securityheaders.com and Lighthouse (PWA, accessibility) against the live URL.

## Moderating suggestions
Firestore console → `suggestions` → set `status` to `approved` or `rejected`. To publish an approved one, add it to
`affirmations` (fields: `text`, `category`, `tags`, `active: true`). Clients can never write to `affirmations`.

## Updating helplines
Edit the `resources` collection in the console (or `src/data/resources.ts` + re-run the seed). Always update `lastVerified`.
