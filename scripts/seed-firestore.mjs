// Admin-only: uploads the bundled affirmations + helpline directory to Firestore.
// Clients can never write these collections (see firestore.rules) — this uses the Admin SDK.
//
// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS=/path/outside/repo/service-account.json \
//     npm run seed:firestore -- --project YOUR-PROJECT-ID
//   (or against the emulator: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed:firestore -- --project demo-unity)
//
// Never commit the service-account key. Re-verify every helpline before launch.
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const i = process.argv.indexOf('--project')
const projectId = i > -1 ? process.argv[i + 1] : process.env.GCLOUD_PROJECT
if (!projectId) {
  console.error('Pass --project <id>')
  process.exit(1)
}

const { SEED_AFFIRMATIONS } = await import('../src/data/affirmations.ts')
const { SEED_RESOURCES } = await import('../src/data/resources.ts')

initializeApp(process.env.FIRESTORE_EMULATOR_HOST ? { projectId } : { projectId, credential: applicationDefault() })
const db = getFirestore()

const strip = (o) => Object.fromEntries(Object.entries(o).filter(([k, v]) => v !== undefined && k !== 'id' && k !== 'needsVerify'))

const batch = db.batch()
for (const a of SEED_AFFIRMATIONS) batch.set(db.collection('affirmations').doc(a.id), strip(a))
for (const r of SEED_RESOURCES) batch.set(db.collection('resources').doc(r.id), strip(r))
await batch.commit()

const unverified = SEED_RESOURCES.filter((r) => r.needsVerify).map((r) => r.name)
console.log(`Seeded ${SEED_AFFIRMATIONS.length} affirmations and ${SEED_RESOURCES.length} resources into ${projectId}.`)
if (unverified.length) console.log(`⚠️  Still need verifying: ${unverified.join(', ')}`)
