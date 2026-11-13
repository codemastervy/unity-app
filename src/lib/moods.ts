export type MoodId = 'great' | 'good' | 'okay' | 'meh' | 'sad' | 'angry' | 'thoughtful' | 'sparkly'

export interface Mood {
  id: MoodId
  emoji: string
  label: string
  /** Circle colour on the calendar (decorative; the emoji + label carry the meaning). */
  color: string
  /** 1–5, used only for the gentle "mood over time" chart. */
  score: number
  /** Counts towards the "several low days in a row" gentle check-in card. */
  low: boolean
}

export const MOODS: Mood[] = [
  { id: 'great', emoji: '😄', label: 'Great', color: '#FFC93C', score: 5, low: false },
  { id: 'good', emoji: '🙂', label: 'Good', color: '#8BD3A0', score: 4, low: false },
  { id: 'okay', emoji: '😐', label: 'Okay', color: '#A8D8E8', score: 3, low: false },
  { id: 'meh', emoji: '😕', label: 'Meh', color: '#B7C4D6', score: 2, low: false },
  { id: 'sad', emoji: '😢', label: 'Sad', color: '#7AA7E8', score: 1, low: true },
  { id: 'angry', emoji: '😠', label: 'Angry', color: '#F28B82', score: 1, low: true },
  { id: 'thoughtful', emoji: '🤔', label: 'Thoughtful', color: '#C7B8F5', score: 3, low: false },
  { id: 'sparkly', emoji: '✨', label: 'Sparkly', color: '#FFB4D6', score: 5, low: false },
]

export const MOOD_IDS = MOODS.map((m) => m.id)

const byId = new Map(MOODS.map((m) => [m.id, m]))
export function getMood(id: string): Mood | undefined {
  return byId.get(id as MoodId)
}
