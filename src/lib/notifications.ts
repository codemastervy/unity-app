/** Daily check-in reminder — local notifications in the native apps (no server needed). */
import { isNative } from './platform'

const REMINDER_ID = 1001

export const remindersSupported = () => isNative()

async function plugin() {
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  return LocalNotifications
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<boolean> {
  if (!isNative()) return false
  const LN = await plugin()
  const perm = await LN.requestPermissions()
  if (perm.display !== 'granted') return false
  await LN.cancel({ notifications: [{ id: REMINDER_ID }] })
  await LN.schedule({
    notifications: [
      {
        id: REMINDER_ID,
        title: 'Kia ora 👋',
        // Never include health or journal content in notifications.
        body: 'How are you going today? Take a moment to check in.',
        schedule: { on: { hour, minute }, allowWhileIdle: true },
      },
    ],
  })
  return true
}

export async function cancelDailyReminder(): Promise<void> {
  if (!isNative()) return
  await (await plugin()).cancel({ notifications: [{ id: REMINDER_ID }] })
}
