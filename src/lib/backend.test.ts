import { beforeEach, describe, expect, it } from 'vitest'
import { backend, isDemoBackend } from './backend'

describe('demo backend (simulated Firebase)', () => {
  beforeEach(async () => {
    localStorage.clear()
    await backend.signOut()
  })

  it('is used when no Firebase config is present', () => {
    expect(isDemoBackend).toBe(true)
    expect(backend.googleSupported).toBe(false)
  })

  it('signs up, rejects wrong password, verifies, and enforces owner-only access', async () => {
    await backend.signUp('a@example.com', 'password123')
    const me = await backend.currentUser()
    expect(me?.emailVerified).toBe(false)
    // Unverified users can't write (mirrors the Firestore rules).
    await expect(backend.setDoc(`users/${me!.uid}`, { x: 1 })).rejects.toMatchObject({ code: 'permission-denied' })
    expect(await backend.reloadVerified()).toBe(true)
    await backend.setDoc(`users/${me!.uid}`, { x: 1 })
    expect(await backend.getDoc(`users/${me!.uid}`)).toEqual({ x: 1 })
    await expect(backend.getDoc('users/someone-else')).rejects.toMatchObject({ code: 'permission-denied' })

    await backend.commit([
      { type: 'set', path: `users/${me!.uid}/entries/e1`, data: { mood: 'good' } },
      { type: 'set', path: `users/${me!.uid}/entries/e2`, data: { mood: 'sad' } },
    ])
    expect((await backend.listDocs(`users/${me!.uid}/entries`)).map((d) => d.id).sort()).toEqual(['e1', 'e2'])

    await backend.signOut()
    await expect(backend.signIn('a@example.com', 'wrong-password')).rejects.toMatchObject({ code: 'auth/invalid-credential' })
    await backend.signIn('A@example.com', 'password123')
    expect((await backend.currentUser())?.uid).toBe(me!.uid)
    await expect(backend.signUp('a@example.com', 'password123')).rejects.toMatchObject({ code: 'auth/email-already-in-use' })
  })

  it('rate-limits suggestions to one a minute', async () => {
    await backend.signUp('b@example.com', 'password123')
    await backend.reloadVerified()
    const uid = (await backend.currentUser())!.uid
    await backend.submitSuggestion(uid, 'I am enough', 'confidence')
    await expect(backend.submitSuggestion(uid, 'I am strong', 'confidence')).rejects.toMatchObject({ code: 'permission-denied' })
    const mine = await backend.listSuggestions(uid)
    expect(mine).toHaveLength(1)
    expect(mine[0].data.status).toBe('pending')
  })
})
