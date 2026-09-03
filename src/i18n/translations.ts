// Lightweight i18n: the English source string doubles as the lookup key, so
// call sites just wrap literal text in t('...') instead of inventing a
// separate key namespace. Missing entries (and English itself) fall back to
// the original string untouched.

export type Lang = 'en' | 'he';

export const LANGUAGES: Array<{ value: Lang; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'he', label: 'עברית' },
];

const he: Record<string, string> = {
  // Instrument / title
  'Guitar': 'גיטרה',
  'Bass': 'בס',
  'Fret Practice': 'תרגול סריגים',

  // Instrument picker — roadmap instruments (admin-only "coming soon" tiles)
  'Coming soon': 'בקרוב',
  'Ukulele': 'יוקללי',
  'Mandolin': 'מנדולינה',
  'Banjo': 'בנג׳ו',

  // Settings — section titles / labels / help
  'Instrument': 'כלי נגינה',
  'Switches tuning, string count and fret range, then reloads the note samples.':
    'מחליף כיוונון, מספר מיתרים וטווח סריגים, וטוען מחדש את דגימות התווים.',
  'Note names': 'שמות תווים',
  'Written as': 'נכתב כ',
  "Display only — the drill itself doesn't change.":
    'תצוגה בלבד — התרגול עצמו לא משתנה.',
  'Score': 'ניקוד',
  'Score & celebrations': 'ניקוד וחגיגות',
  'Live score, streak multiplier and celebrations are shown.':
    'ניקוד חי, מכפיל רצף וחגיגות מוצגים.',
  'Every answer is still recorded to your stats and personal bests either way.':
    'כל תשובה עדיין נרשמת לסטטיסטיקות ולשיאים האישיים שלך בכל מקרה.',
  'On': 'פעיל',
  'Off': 'כבוי',
  'Mastery on the fretboard': 'שליטה על גבי הסריג',
  'The per-note / per-fret accuracy bars drawn over the circle and grid while stopped or paused.':
    'פסי הדיוק לכל תו / לכל סריג, המוצגים מעל הגלגל והרשת בזמן עצירה או השהיה.',
  'Mastery keeps being tracked and shows on the Stats screen either way.':
    'השליטה ממשיכה להימדד ומוצגת במסך הסטטיסטיקות בכל מקרה.',
  'Stats & progress': 'סטטיסטיקות והתקדמות',
  'Answer mode': 'מצב מענה',
  'How you answer': 'איך אתה עונה',
  'Voice mode asks for microphone permission the first time.':
    'מצב קול מבקש הרשאת מיקרופון בפעם הראשונה.',
  'Tap': 'הקשה',
  'Voice': 'קול',
  'Voice engine': 'מנוע קול',
  'Auto picks the best available. Personal uses your calibrated profile; General uses the built-in model.':
    'אוטומטי בוחר את האפשרות הטובה ביותר הזמינה. אישי משתמש בפרופיל המכויל שלך; כללי משתמש במודל המובנה.',
  'Auto': 'אוטומטי',
  'Personal': 'אישי',
  'General': 'כללי',
  'Your voice profile': 'פרופיל הקול שלך',
  'Calibrating your own voice improves recognition when answering by voice.':
    'כיול הקול שלך משפר את הזיהוי בעת מענה בקול.',
  'recordings': 'הקלטות',
  'enabled': 'מופעל',
  'Add / review recordings': 'הוספה / סקירת הקלטות',
  'Calibrate my voice': 'כיול הקול שלי',
  'Feedback board': 'לוח משוב',
  'Leaderboard': 'טבלת מובילים',
  'Account': 'חשבון',
  'Signed in': 'מחובר/ת',
  'Keeps your preferences and data in sync across devices.':
    'שומר על ההעדפות והנתונים שלך מסונכרנים בין מכשירים.',
  'Sign out': 'התנתקות',
  'Sign in with Google to keep your preferences and data across devices.':
    'התחברות עם Google שומרת על ההעדפות והנתונים שלך בין מכשירים.',
  'Sign in with Google': 'התחברות עם Google',
  'See the full list and what earns each one': 'צפה ברשימה המלאה ובמה שמזכה בכל תג',
  'Badges': 'תגים',
  'Language': 'שפה',

  // Hamburger drawer / dialogs
  'Settings': 'הגדרות',
  'Close settings': 'סגירת הגדרות',
  'Open settings': 'פתיחת הגדרות',
  'Game settings': 'הגדרות משחק',
  'Back': 'חזרה',
  'Microphone access': 'גישה למיקרופון',
  'Answer out loud': 'לענות בקול',
  'Voice mode listens for the note or fret you say instead of a tap.':
    'מצב קול מקשיב לתו או לסריג שאתה אומר, במקום להקשה.',
  'Your browser will ask to use the microphone next — audio stays on your device and is never recorded or uploaded.':
    'הדפדפן שלך יבקש כעת להשתמש במיקרופון — האודיו נשאר במכשיר שלך ולעולם לא מוקלט או מועלה.',
  'Allow microphone': 'אפשור מיקרופון',
  'Not now': 'לא עכשיו',
  'Microphone is blocked': 'המיקרופון חסום',
  "Your browser is refusing microphone access for this site, so voice answers can't work yet. Tap the 🔒 / 🎤 icon beside the address bar, set the microphone to":
    'הדפדפן שלך חוסם גישה למיקרופון עבור האתר הזה, כך שתשובות קוליות עדיין לא יכולות לעבוד. הקש על הסמל 🔒 / 🎤 ליד שורת הכתובת, הגדר את המיקרופון למצב',
  ', then reload the page.': ', ולאחר מכן טען מחדש את הדף.',
  'Allow': 'אפשר',
  'Got it': 'הבנתי',
  'Use tap instead': 'השתמש בהקשה במקום',
  'Sign in': 'התחברות',
  'Save your progress': 'שמור את ההתקדמות שלך',
  'Sign in with Google to keep your history, badges and personal bests across devices. You can keep playing as a guest — everything still works, it just stays on this device.':
    'התחברות עם Google שומרת את ההיסטוריה, התגים והשיאים האישיים שלך בין מכשירים. אפשר להמשיך לשחק כאורח — הכול ימשיך לעבוד, זה פשוט יישאר במכשיר הזה.',
  'Maybe later': 'אולי מאוחר יותר',

  // In-game
  'STAGE COMPLETE': 'השלב הושלם',
  'Retry': 'נסה שוב',
  '🎤 Microphone blocked — enable it or switch to tap': '🎤 המיקרופון חסום — אפשר אותו או עבור להקשה',
  '🎤 Voice needs a connection': '🎤 קול דורש חיבור לרשת',
  '🎤 Voice isn’t working in this browser — try Chrome, or use tap':
    '🎤 קול לא עובד בדפדפן הזה — נסה Chrome, או השתמש בהקשה',
  '🎤 Didn’t catch that': '🎤 לא קלטתי את זה',
  '🎤 …': '🎤 …',
  'Round Complete!': 'הסיבוב הושלם!',
  'pts': 'נק׳',
  'OK': 'אישור',
  'Start': 'התחל',
  'Resume': 'המשך',
  'Pause': 'השהה',
  'Stop': 'עצור',
  'Refresh': 'רענון',

  'QUESTIONS': 'שאלות',
  'streak': 'רצף',
  'New badge': 'תג חדש',
  'Listening…': 'מקשיב…',
  'Member since': 'חבר/ה מאז',
  'badges earned': 'תגים הושגו',

  // Instrument string labels (guitar + bass, "String N · note")
  'String 1 · high E': 'מיתר 1 · מי גבוה',
  'String 2 · B': 'מיתר 2 · סי',
  'String 3 · G': 'מיתר 3 · סול',
  'String 4 · D': 'מיתר 4 · רה',
  'String 5 · A': 'מיתר 5 · לה',
  'String 6 · low E': 'מיתר 6 · מי נמוך',
  'String 1 · G': 'מיתר 1 · סול',
  'String 2 · D': 'מיתר 2 · רה',
  'String 3 · A': 'מיתר 3 · לה',
  'String 4 · low E': 'מיתר 4 · מי נמוך',
};

const dictionaries: Record<Lang, Record<string, string>> = { en: {}, he };

export function translate(lang: Lang, source: string): string {
  if (lang === 'en') return source;
  return dictionaries[lang][source] ?? source;
}

