import { expect } from 'vitest'
import { fromBase64 } from './crypto'

/** v1 ciphertext = 12-byte IV + ciphertext + 16-byte tag. */
export function checkKeyFormat(ct: string) {
  const bytes = fromBase64(ct.split(':')[1])
  expect(bytes.length).toBeGreaterThan(12 + 16)
}
