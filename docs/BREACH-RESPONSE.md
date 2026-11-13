# Privacy breach response plan

Unity holds sensitive health information about young people. Under the **NZ Privacy Act 2020** a "notifiable privacy breach"
(one that has caused or is likely to cause **serious harm**) must be reported to the **Office of the Privacy Commissioner (OPC)**
and affected people **as soon as practicable** — aim for within 72 hours of becoming aware.

## Who
- **Breach lead:** Isherveer Bhullar (owner)
- **Backup:** _(name a second trusted person / school contact)_

## 1. Contain (first hours)
- Revoke compromised credentials: Firebase service-account keys, Google account sessions, API keys (rotate + re-restrict).
- If rules were weakened: redeploy the last tested `firestore.rules` immediately.
- If an account is abused: disable the user in Firebase Auth.
- Preserve evidence: export Cloud audit logs, note times. **Do not** copy user data around while investigating.

## 2. Assess (within 24 h)
- What data? Journal fields are client-side encrypted (ciphertext only) — a Firestore leak exposes dates, moods, star ratings,
  health numbers, nicknames, emails. Treat moods + health data as sensitive.
- How many users, which ones, is it still happening, could it identify a young person?
- Use OPC's **NotifyUs** self-assessment tool: https://privacy.org.nz/responsibilities/privacy-breaches/notify-us/

## 3. Notify (if serious harm is likely)
- **OPC** via NotifyUs.
- **Affected users** by email, in plain teen-friendly language: what happened, what data, what we've done, what they can do,
  how to reach us, and support lines (1737, Youthline 0800 376 633). Consider notifying parents/caregivers for under-16s and partner schools.
- If you can't contact someone directly, post a public notice in the app.

## 4. Review (within 2 weeks)
- Root cause, fix, add a rules test or check that would have caught it.
- Update this plan and the privacy policy if needed. Keep a written record of every breach (even non-notifiable ones).
