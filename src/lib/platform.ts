import { Capacitor } from '@capacitor/core'

export const isNative = () => Capacitor.isNativePlatform()
export const platform = () => Capacitor.getPlatform() as 'ios' | 'android' | 'web'

export function newId(): string {
  return globalThis.crypto.randomUUID()
}
