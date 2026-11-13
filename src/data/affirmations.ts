/**
 * Seed affirmation library. Started from the old `af.html` / `Affirmation generator.py` list,
 * rewritten for teens: short, warm, plain language. Wealth / "abundance" / work phrases removed.
 * The live library can be updated in Firestore (`affirmations` collection, admin only).
 */

export type CategoryId =
  | 'confidence'
  | 'school'
  | 'friendships'
  | 'anxiety'
  | 'sport'
  | 'gratitude'
  | 'kindness'
  | 'tough-days'
  | 'rest'
  | 'whanau'
  | 'new-starts'

export interface Affirmation {
  id: string
  text: string
  category: CategoryId
  tags: string[]
  active: boolean
}

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'confidence', label: 'Confidence' },
  { id: 'school', label: 'School & exams' },
  { id: 'friendships', label: 'Friendships' },
  { id: 'anxiety', label: 'Anxiety & worry' },
  { id: 'sport', label: 'Sport' },
  { id: 'gratitude', label: 'Gratitude' },
  { id: 'kindness', label: 'Being kind to me' },
  { id: 'tough-days', label: 'Tough days' },
  { id: 'rest', label: 'Sleep & rest' },
  { id: 'whanau', label: 'Whānau & home' },
  { id: 'new-starts', label: 'New starts' },
]

type Seed = [text: string, category: CategoryId, tags: string[]]

const SEED: Seed[] = [
  // confidence
  ['I give myself permission to make mistakes. I am enough.', 'confidence', ['mistake', 'down']],
  ['I am allowed to take up space.', 'confidence', ['left-out']],
  ['My voice matters, even when it shakes.', 'confidence', ['first-day', 'anxious']],
  ['I am getting a little better every day.', 'confidence', ['mistake']],
  ['I don’t have to be perfect to be proud of myself.', 'confidence', ['mistake', 'exam']],
  ['I am more than my grades, my likes or my looks.', 'confidence', ['exam', 'social-media']],
  ['I can do hard things.', 'confidence', ['exam', 'game', 'first-day']],
  ['I trust myself to figure it out.', 'confidence', ['first-day', 'exam']],
  ['Comparing myself to others isn’t fair to me. I’m on my own path.', 'confidence', ['social-media']],
  ['I am capable of becoming whoever I want to be.', 'confidence', []],
  ['My past doesn’t decide my future.', 'confidence', ['mistake']],
  // school
  ['I’ve prepared what I can. That is enough.', 'school', ['exam']],
  ['One question at a time. One breath at a time.', 'school', ['exam', 'anxious']],
  ['A test measures one day, not my whole worth.', 'school', ['exam']],
  ['It’s okay to ask for help when I’m stuck.', 'school', ['exam']],
  ['My brain is still growing, and so am I.', 'school', ['mistake']],
  ['I can learn from this, whatever the result.', 'school', ['exam', 'mistake']],
  ['Small steps still count as progress.', 'school', ['exam', 'down']],
  ['I’m allowed to take breaks. Rest helps me learn.', 'school', ['exam', 'sleep']],
  // friendships
  ['I deserve friends who make me feel safe.', 'friendships', ['friend-fight', 'left-out']],
  ['It’s okay to set boundaries with people I care about.', 'friendships', ['friend-fight']],
  ['Disagreements don’t have to end friendships.', 'friendships', ['friend-fight']],
  ['I can say sorry, and I can forgive — when I’m ready.', 'friendships', ['friend-fight', 'mistake']],
  ['The right people will like me for who I really am.', 'friendships', ['left-out', 'first-day']],
  ['Being alone sometimes doesn’t mean I’m alone forever.', 'friendships', ['left-out']],
  ['I bring something good to the people around me.', 'friendships', ['left-out']],
  ['I can be a good friend to others and to myself.', 'friendships', []],
  // anxiety
  ['This feeling is uncomfortable, but it will pass.', 'anxiety', ['anxious', 'sleep']],
  ['I am safe right now. I can breathe slowly.', 'anxiety', ['anxious', 'sleep']],
  ['I don’t have to solve everything today.', 'anxiety', ['anxious', 'sleep', 'down']],
  ['My thoughts are not always facts.', 'anxiety', ['anxious', 'social-media']],
  ['I’ve gotten through hard moments before. I can get through this one.', 'anxiety', ['anxious', 'down']],
  ['Breathe in for four, out for six. I am here.', 'anxiety', ['anxious', 'exam', 'game']],
  ['It’s okay to step away and take a moment.', 'anxiety', ['anxious', 'friend-fight']],
  ['Worry is trying to protect me. I can thank it and let it go.', 'anxiety', ['anxious']],
  // sport
  ['I play for the love of it, not just the score.', 'sport', ['game']],
  ['My effort is something I can be proud of, win or lose.', 'sport', ['game']],
  ['Nerves mean I care. I can use that energy.', 'sport', ['game', 'anxious']],
  ['Every training makes me a little stronger.', 'sport', ['game']],
  ['I back myself and my team.', 'sport', ['game']],
  ['One play at a time. Reset and go again.', 'sport', ['game', 'mistake']],
  ['My body works hard for me and I’m thankful for it.', 'sport', ['game']],
  // gratitude
  ['I’m grateful for the people who have my back.', 'gratitude', ['family']],
  ['There is something good in today, even if it’s small.', 'gratitude', ['down']],
  ['I notice the little things that make me smile.', 'gratitude', []],
  ['I’m thankful for what I managed to do today.', 'gratitude', ['down']],
  ['Fresh air, a good song, a kind word — they all count.', 'gratitude', ['down']],
  ['I’m lucky to be learning and growing.', 'gratitude', []],
  // kindness to self
  ['I talk to myself the way I’d talk to a friend.', 'kindness', ['mistake', 'down']],
  ['I am worthy of love and care, just as I am.', 'kindness', ['down', 'left-out']],
  ['It’s okay not to be okay.', 'kindness', ['down']],
  ['I accept myself and give myself peace.', 'kindness', ['down']],
  ['Rest is not lazy. Rest is looking after me.', 'kindness', ['sleep']],
  ['My feelings are valid, all of them.', 'kindness', ['down', 'friend-fight', 'family']],
  ['I can be proud of myself for trying.', 'kindness', ['mistake', 'exam', 'game']],
  ['I belong in this world. I am cared for and I matter.', 'kindness', ['down', 'left-out']],
  // tough days
  ['Tough days don’t last forever.', 'tough-days', ['down']],
  ['I have made it through every hard day so far.', 'tough-days', ['down']],
  ['Asking for help is a strong thing to do.', 'tough-days', ['down', 'anxious']],
  ['I can take today one hour at a time.', 'tough-days', ['down', 'anxious']],
  ['Tomorrow is a fresh start.', 'tough-days', ['down', 'mistake', 'sleep']],
  ['I am stronger than I feel right now.', 'tough-days', ['down']],
  ['Healing isn’t a straight line, and that’s okay.', 'tough-days', ['down']],
  ['I choose to walk away from what drags me down.', 'tough-days', ['social-media', 'friend-fight']],
  // rest
  ['I’ve done enough for today. I can let it go.', 'rest', ['sleep']],
  ['My body knows how to rest. I can let it.', 'rest', ['sleep']],
  ['I can put my phone down and give my mind a break.', 'rest', ['sleep', 'social-media']],
  ['Tonight I let my thoughts float by like clouds.', 'rest', ['sleep', 'anxious']],
  ['Even if I don’t sleep straight away, resting still helps.', 'rest', ['sleep']],
  // whānau
  ['I am loved, even when home feels hard.', 'whanau', ['family']],
  ['I can share how I feel with someone I trust.', 'whanau', ['family', 'down']],
  ['I can’t control everyone else, but I can look after me.', 'whanau', ['family', 'friend-fight']],
  ['My whānau and my culture are part of my strength.', 'whanau', ['family']],
  ['It’s okay to need some space to cool down.', 'whanau', ['family', 'friend-fight']],
  // new starts
  ['New places get easier every day.', 'new-starts', ['first-day']],
  ['Everyone was new once. I can do this.', 'new-starts', ['first-day']],
  ['I’m open to new people and new chances.', 'new-starts', ['first-day', 'left-out']],
  ['Change can be scary and exciting at the same time.', 'new-starts', ['first-day', 'anxious']],
  ['I can start again as many times as I need.', 'new-starts', ['mistake', 'down']],
  ['Kia kaha — I am strong, and I can keep going.', 'new-starts', ['down', 'game', 'exam']],
]

export const SEED_AFFIRMATIONS: Affirmation[] = SEED.map(([text, category, tags], i) => ({
  id: `a${String(i + 1).padStart(3, '0')}`,
  text,
  category,
  tags,
  active: true,
}))

export interface Situation {
  id: string
  label: string
  emoji: string
  /** Matching tags, plus categories as a fallback. */
  tags: string[]
  categories: CategoryId[]
}

export const SITUATIONS: Situation[] = [
  { id: 'exam', label: 'Exam tomorrow', emoji: '📝', tags: ['exam'], categories: ['school'] },
  { id: 'friend-fight', label: 'Fight with a friend', emoji: '💬', tags: ['friend-fight'], categories: ['friendships'] },
  { id: 'first-day', label: 'First day', emoji: '🎒', tags: ['first-day'], categories: ['new-starts'] },
  { id: 'sleep', label: 'Can’t sleep', emoji: '🌙', tags: ['sleep'], categories: ['rest'] },
  { id: 'anxious', label: 'Feeling anxious', emoji: '🌊', tags: ['anxious'], categories: ['anxiety'] },
  { id: 'game', label: 'Big game', emoji: '🏉', tags: ['game'], categories: ['sport'] },
  { id: 'left-out', label: 'Feeling left out', emoji: '🫂', tags: ['left-out'], categories: ['friendships'] },
  { id: 'mistake', label: 'Made a mistake', emoji: '🔁', tags: ['mistake'], categories: ['kindness'] },
  { id: 'family', label: 'Stuff at home', emoji: '🏠', tags: ['family'], categories: ['whanau'] },
  { id: 'down', label: 'Feeling down', emoji: '🌧️', tags: ['down'], categories: ['tough-days'] },
  { id: 'social-media', label: 'Social media got to me', emoji: '📱', tags: ['social-media'], categories: ['confidence'] },
]
