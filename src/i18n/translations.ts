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
  'Sign in to keep your history, badges and personal bests across devices. You can keep playing as a guest — everything still works, it just stays on this device.':
    'התחברות שומרת את ההיסטוריה, התגים והשיאים האישיים שלך בין מכשירים. אפשר להמשיך לשחק כאורח — הכול ימשיך לעבוד, זה פשוט יישאר במכשיר הזה.',
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

  // SelectorPanel — mode/difficulty/fret-range picker
  'all': 'כל',
  'strings': 'מיתרים',
  'frets': 'סריגים',
  'only the dot-marker frets': 'רק סריגי הנקודות',
  'natural notes only (no sharps or flats)': 'תווים טבעיים בלבד (ללא דיאזים או במולים)',
  'every note, sharps and flats included': 'כל תו, כולל דיאזים ובמולים',
  'alphabetical order': 'סדר אלפביתי',
  'circle-of-fifths order': 'סדר מעגל הקווינטות',
  'A fret lights up and you pick its note from the wheel':
    'סריג נדלק ואתה בוחר את התו שלו מהגלגל',
  ', rotated to the string': ', מסובב לפי המיתר',
  'A note name is shown and you tap every fret on the neck where it lands.':
    'שם תו מוצג ואתה מקיש על כל סריג בצוואר שבו הוא נמצא.',
  'Note-by-Fret': 'תו-לפי-סריג',
  'Fret-by-Note': 'סריג-לפי-תו',
  'Auto-advances through the difficulty stages.': 'מתקדם אוטומטית בין שלבי הקושי.',
  'How this works': 'איך זה עובד',
  'neck': 'צוואר',
  'neck fret range selector': 'בורר טווח סריגים בצוואר',
  'Multi': 'מרובה',
  'Note by Fret': 'תו לפי סריג',
  'Alpha': 'אלפביתי',
  'Fifths': 'קווינטות',
  'By String': 'לפי מיתר',
  'Fret by Note': 'סריג לפי תו',
  "Read the note wheel like a clock: your open string sits at 12 o'clock, and the dots under each note show its fret. Answer before the timing bar empties.":
    'קרא את גלגל התווים כמו שעון: המיתר הפתוח שלך יושב ב-12, והנקודות מתחת לכל תו מראות את הסריג שלו. ענה לפני שפס הזמן מתרוקן.',
  'Answer before the timing bar empties.': 'ענה לפני שפס הזמן מתרוקן.',
  'Dots': 'נקודות',
  'Naturals': 'טבעיים',
  'Full': 'מלא',
  'Auto Advance to next difficulty': 'התקדמות אוטומטית לרמת הקושי הבאה',

  // Onboarding
  'Guitar Fret Practice': 'תרגול סריגי גיטרה',
  'Master the fretboard with the clock method — one string at a time.':
    'שלוט בגריף בשיטת השעון — מיתר אחד בכל פעם.',
  'What do you play?': 'מה אתה מנגן?',
  'Skip setup →': 'דלג על ההגדרה →',
  'How well do you know the fretboard?': 'עד כמה אתה מכיר את הגריף?',
  "I'm just starting": 'רק מתחיל/ה',
  'Start with dot frets on String 6': 'התחל עם סריגי הנקודות במיתר 6',
  'I play but want to improve': 'אני מנגן/ת אבל רוצה להשתפר',
  'Quick 3-question test': 'מבחן מהיר של 3 שאלות',
  'I know the full neck': 'אני מכיר/ה את כל הצוואר',
  'Jump right in': 'קפוץ ישר פנימה',
  'Skip →': 'דלג →',
  'String': 'מיתר',
  'what note is fret': 'איזה תו הוא סריג',
  'Skip test →': 'דלג על המבחן →',
  'Keep going!': 'המשך כך!',
  'Good start!': 'התחלה טובה!',
  'Nice work!': 'עבודה יפה!',
  'Impressive!': 'מרשים!',
  'Dot Frets': 'סריגי נקודות',
  'Natural notes': 'תווים טבעיים',
  'the full chromatic neck': 'כל הצוואר הכרומטי',
  "correct — we've set you up on": 'נכונות — הגדרנו אותך על',
  'Change it anytime in the selector panel.': 'ניתן לשנות זאת בכל עת בפאנל הבחירה.',
  "Let's go →": 'בואו נתחיל →',

  // ProgressPanel — stats & progress screen
  'by note': 'לפי תו',
  'by fret': 'לפי סריג',
  'fret': 'סריג',
  'not played': 'לא נוגן',
  'known': 'ידוע',
  'needs work': 'דורש עבודה',
  'unplayed': 'לא נוגן',
  'Not enough data yet.': 'עדיין אין מספיק נתונים.',
  'Not practiced yet': 'עדיין לא תורגל',
  'Older sessions have no date stamp, so the timeline is empty. New sessions fill it in.':
    'לסשנים ישנים אין חותמת תאריך, אז ציר הזמן ריק. סשנים חדשים ימלאו אותו.',
  'No rounds recorded for this setup yet. Play a round and its stats show up here.':
    'עדיין לא נרשמו סיבובים עבור ההגדרה הזו. שחק סיבוב והסטטיסטיקות שלו יופיעו כאן.',
  'Play a few rounds and your all-time progress shows up here.':
    'שחק כמה סיבובים וההתקדמות שלך לאורך זמן תופיע כאן.',
  'accuracy': 'דיוק',
  'best streak': 'רצף הכי טוב',
  'avg speed': 'מהירות ממוצעת',
  'day streak': 'רצף ימים',
  'answered': 'נענו',
  'Last round': 'סיבוב אחרון',
  'Best speed': 'המהירות הטובה ביותר',
  'Weakest notes': 'התווים החלשים ביותר',
  'Nothing below 70% — nice.': 'שום דבר מתחת ל-70% — יפה.',
  'By note': 'לפי תו',
  'By string': 'לפי מיתר',
  'By fret': 'לפי סריג',
  'Fretboard heatmap': 'מפת חום של הגריף',
  'Daily timeline': 'ציר זמן יומי',
  'Personal bests': 'שיאים אישיים',
  'No personal bests recorded yet.': 'עדיין לא נרשמו שיאים אישיים.',
  'This setup': 'ההגדרה הזו',
  'All time': 'כל הזמנים',
  'the current settings': 'ההגדרות הנוכחיות',
  'across every': 'בכל',
  'settings combination': 'שילוב הגדרות',
  'Clear history for this setup': 'נקה היסטוריה עבור ההגדרה הזו',
  'Clear all history': 'נקה את כל ההיסטוריה',
  'Clear this setup’s history?': 'לנקות את ההיסטוריה של ההגדרה הזו?',
  'Clear all stats?': 'לנקות את כל הסטטיסטיקות?',
  'This erases the practice history for the current settings combination only. Other combinations and your personal bests are kept.':
    'זה מוחק את היסטוריית התרגול עבור שילוב ההגדרות הנוכחי בלבד. שילובים אחרים והשיאים האישיים שלך נשמרים.',
  'This permanently erases your entire practice history and resets the all-time mastery for every note, string and settings combination. Your personal bests are kept.':
    'זה מוחק לצמיתות את כל היסטוריית התרגול שלך ומאפס את השליטה לאורך זמן עבור כל תו, מיתר ושילוב הגדרות. השיאים האישיים שלך נשמרים.',
  "This can't be undone.": 'לא ניתן לבטל פעולה זו.',
  'Delete anyway': 'מחק בכל זאת',
  'Cancel': 'ביטול',

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

