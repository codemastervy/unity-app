/**
 * Seed helpline directory. Checked against the Mental Health Foundation
 * June 2026 helplines list. ⚠️ RE-VERIFY EVERY ENTRY ON THE OFFICIAL SITES BEFORE LAUNCH,
 * then update `lastVerified`. Entries marked `needsVerify` had uncertain details.
 * The live directory lives in Firestore (`resources` collection, admin only) so it can be
 * updated without a new app release.
 */

export type SectionId = 'counselling' | 'young-people' | 'specific' | 'apps'

export interface Resource {
  id: string
  name: string
  section: SectionId
  description: string
  phone?: string // dialable digits
  phoneLabel?: string
  sms?: string
  url?: string
  hours?: string // only when NOT 24/7 or free
  logo?: string // optional image URL; initials are shown otherwise
  lastVerified: string
  needsVerify?: boolean
}

export const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'counselling', label: 'For counselling and support' },
  { id: 'young-people', label: 'For children and young people' },
  { id: 'specific', label: 'For help with specific issues' },
  { id: 'apps', label: 'Free apps and online tools' },
]

const V = '2026-06-01'

export const SEED_RESOURCES: Resource[] = [
  { id: '1737', name: '1737 Need to talk?', section: 'counselling', description: 'Free call or text any time to talk with a trained counsellor.', phone: '1737', sms: '1737', url: 'https://1737.org.nz', lastVerified: V },
  { id: 'lifeline', name: 'Lifeline', section: 'counselling', description: 'Free, confidential support any time.', phone: '0800543354', phoneLabel: '0800 543 354', sms: '4357', url: 'https://www.lifeline.org.nz', lastVerified: V },
  { id: 'suicide-crisis', name: 'Suicide Crisis Helpline', section: 'counselling', description: 'If you are thinking about suicide, or worried about someone.', phone: '0508828865', phoneLabel: '0508 828 865', url: 'https://www.lifeline.org.nz/services/suicide-crisis-helpline', lastVerified: V },
  { id: 'depression', name: 'Depression Helpline', section: 'counselling', description: 'Talk to a trained counsellor about how you’re feeling.', phone: '0800111757', phoneLabel: '0800 111 757', sms: '4202', url: 'https://depression.org.nz', lastVerified: V },
  { id: 'samaritans', name: 'Samaritans', section: 'counselling', description: 'Confidential support if you’re feeling alone or overwhelmed.', phone: '0800726666', phoneLabel: '0800 726 666', url: 'https://www.samaritans.org.nz', lastVerified: V },
  { id: 'healthline', name: 'Healthline', section: 'counselling', description: 'Free health advice from a registered nurse.', phone: '0800611116', phoneLabel: '0800 611 116', lastVerified: V },
  { id: 'youthline', name: 'Youthline', section: 'young-people', description: 'Support for young people, by phone, text or webchat.', phone: '0800376633', phoneLabel: '0800 376 633', sms: '234', url: 'https://www.youthline.co.nz', lastVerified: V },
  { id: 'whatsup', name: 'What’s Up (ages 5–18)', section: 'young-people', description: 'Phone counselling for children and teens.', phone: '08009428787', phoneLabel: '0800 942 8787', url: 'https://www.whatsup.co.nz', hours: 'Check website for hours', lastVerified: V },
  { id: 'lowdown', name: 'The Lowdown', section: 'young-people', description: 'Helping young New Zealanders recognise and understand depression or anxiety.', sms: '5626', url: 'https://thelowdown.co.nz', lastVerified: V },
  { id: 'alcohol-drug', name: 'Alcohol Drug Helpline', section: 'specific', description: 'Free, confidential advice about drinking or other drug use.', phone: '0800787797', phoneLabel: '0800 787 797', sms: '8681', url: 'https://alcoholdrughelp.org.nz', lastVerified: V, needsVerify: true },
  { id: 'groov', name: 'Groov', section: 'apps', description: 'Free app with small, daily actions for your wellbeing.', url: 'https://groov.nz', lastVerified: V, needsVerify: true },
  { id: 'small-steps', name: 'Small Steps', section: 'apps', description: 'Free online tools to help with stress and anxiety.', url: 'https://depression.org.nz/small-steps', lastVerified: V, needsVerify: true },
  { id: 'sparx', name: 'SPARX', section: 'apps', description: 'Free online game-based programme for young people feeling down or stressed.', url: 'https://www.sparx.org.nz', lastVerified: V },
]

/** Shown in the "Need help now?" sheet. */
export const HELP_NOW_IDS = ['1737', 'lifeline', 'suicide-crisis', 'youthline']

export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
export function smsHref(sms: string) {
  return `sms:${sms.replace(/[^\d+]/g, '')}`
}
