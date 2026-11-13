import { describe, expect, it } from 'vitest'
import {
  checkKeyFormat,
} from './crypto.testutil'
import {
  decryptString,
  encryptString,
  generateDataKey,
  hashPin,
  makeKeyCheck,
  unwrapDataKey,
  verifyKeyCheck,
  wrapDataKey,
  exportRawKey,
  constantTimeEqual,
} from './crypto'

describe('crypto', () => {
  it('round-trips strings with AES-GCM and never stores plaintext', async () => {
    const key = await generateDataKey()
    const ct = await encryptString(key, 'Kia ora — today was hard 😢')
    expect(ct.startsWith('v1:')).toBe(true)
    expect(ct).not.toContain('today')
    expect(await decryptString(key, ct)).toBe('Kia ora — today was hard 😢')
    checkKeyFormat(ct)
  })

  it('uses a fresh IV every time', async () => {
    const key = await generateDataKey()
    expect(await encryptString(key, 'same')).not.toBe(await encryptString(key, 'same'))
  })

  it('keeps empty strings empty', async () => {
    const key = await generateDataKey()
    expect(await encryptString(key, '')).toBe('')
    expect(await decryptString(key, '')).toBe('')
  })

  it('fails to decrypt with the wrong key', async () => {
    const a = await generateDataKey()
    const b = await generateDataKey()
    await expect(decryptString(b, await encryptString(a, 'secret'))).rejects.toThrow()
  })

  it('wraps and unwraps the data key with a passphrase', async () => {
    const dek = await generateDataKey()
    const wrap = await wrapDataKey(dek, 'correct horse battery', 1000)
    const back = await unwrapDataKey(wrap, 'correct horse battery')
    expect(await exportRawKey(back)).toBe(await exportRawKey(dek))
    await expect(unwrapDataKey(wrap, 'wrong passphrase')).rejects.toThrow()
  })

  it('verifies key checks', async () => {
    const dek = await generateDataKey()
    const check = await makeKeyCheck(dek)
    expect(await verifyKeyCheck(dek, check)).toBe(true)
    expect(await verifyKeyCheck(await generateDataKey(), check)).toBe(false)
  })

  it('hashes PINs with a salt', async () => {
    const a = await hashPin('1234')
    const again = await hashPin('1234', a.salt)
    expect(constantTimeEqual(a.hash, again.hash)).toBe(true)
    expect((await hashPin('1234')).hash).not.toBe(a.hash)
    expect(constantTimeEqual(a.hash, (await hashPin('1235', a.salt)).hash)).toBe(false)
  })
})
