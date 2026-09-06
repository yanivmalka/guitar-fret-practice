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
  'Ukulele': 'יוקולילי',
  'Mandolin': 'מנדולינה',
  'Banjo': "בנג'ו",

  // Settings — section titles / labels / help
  'Instrument': 'כלי נגינה',
  'Playing': 'נגינה',
  'Instruments': 'כלים',
  'Notes': 'תווים',
  'Switches tuning, string count and fret range, then reloads the note samples.':
    'כאן ניתן לשנות את הכיוון, את מספר המיתרים ואת טווח הסריגים. לאחר מכן דגימות התווים ייטענו מחדש.',
  'Note names': 'שמות התווים',
  'Written as': 'מוצגים כ־',
  "Display only — the drill itself doesn't change.":
    'שינוי התצוגה בלבד — התרגול עצמו אינו משתנה.',
  'Score': 'ניקוד',
  'Score & celebrations': 'ניקוד וחגיגות',
  'Live score, streak multiplier and celebrations are shown.':
    'במהלך התרגול יוצגו הניקוד, מכפיל הרצף והחגיגות.',
  'Every answer is still recorded to your stats and personal bests either way.':
    'בכל מקרה, כל תשובה עדיין נרשמת בסטטיסטיקות ובשיאים האישיים שלך.',
  'On': 'פעיל',
  'Off': 'כבוי',
  'Silent mode': 'מצב שקט',
  'Visual-only questions — no note playback or chime. Haptics and on-screen celebrations stay on. Great for practising with headphones off or a guitar in hand.':
    'שאלות חזותיות בלבד — ללא השמעת התו וללא צליל "נכון". הרטט והחגיגות על המסך נשארים פעילים. מצוין לתרגול בלי אוזניות או עם גיטרה אמיתית ביד.',
  'Theme': 'ערכת נושא',
  'Dark': 'כהה',
  'Night': 'לילה',
  'Day': 'יום',
  'Night is a warmer, dimmer palette for a dark room. Day is a light palette.':
    'לילה היא ערכת צבעים חמה ועמומה יותר לחדר חשוך. יום היא ערכת צבעים בהירה.',
  'Mastery on the fretboard': 'שליטה בצוואר',
  'The per-note / per-fret accuracy bars drawn over the circle and grid while stopped or paused.':
    'פסי הדיוק לכל תו ולכל סריג, המוצגים על גבי הגלגל והרשת בזמן עצירה או השהיה.',
  'Mastery keeps being tracked and shows on the Stats screen either way.':
    'מדד השליטה ממשיך להיאסף ויוצג במסך הסטטיסטיקות בכל מקרה.',
  'Questions counted': 'כמות שאלות בספירה',
  'How many of your most recent questions the mastery bars are computed from. Free accounts use the last 250.':
    'מכמה מהשאלות האחרונות שלך מחושבים פסי השליטה. חשבונות חינמיים משתמשים ב־250 האחרונות.',
  'Choose how many recent questions the mastery bars are counted from':
    'בחירת כמות השאלות האחרונות שמהן נספרים פסי השליטה',
  'All': 'הכל',
  'Stats & progress': 'סטטיסטיקות והתקדמות',
  'Answer mode': 'מצב מענה',
  'How you answer': 'איך עונים',
  'Voice mode asks for microphone permission the first time.':
    'במצב קול תתבקש לאשר גישה למיקרופון בפעם הראשונה.',
  'Tap': 'הקשה',
  'Voice': 'קול',
  'Voice engine': 'מנוע זיהוי קולי',
  'Auto picks the best available. Personal uses your calibrated profile; General uses the built-in model.':
    'אוטומטי בוחר את האפשרות הטובה ביותר הזמינה. אישי משתמש בפרופיל הקול שכיילת; כללי משתמש במודל המובנה.',
  'Auto': 'אוטומטי',
  'Personal': 'אישי',
  'General': 'כללי',
  'Your voice profile': 'פרופיל הקול שלך',
  'Calibrating your own voice improves recognition when answering by voice.':
    'כיול הקול שלך משפר את הזיהוי כשעונים באמצעות קול.',
  'recordings': 'הקלטות',
  'enabled': 'מופעל',
  'Add / review recordings': 'הוספה / סקירת הקלטות',
  'Calibrate my voice': 'כיול הקול שלי',
  'Feedback board': 'לוח המשוב',
  'Leaderboard': 'טבלת המובילים',
  'Account': 'חשבון',
  'Signed in': 'מחובר',
  'Keeps your preferences and data in sync across devices.':
    'שומר על ההעדפות והנתונים שלך מסונכרנים בין המכשירים.',
  'Sign out': 'התנתקות',
  'Sign in with Google to keep your preferences and data across devices.':
    'התחבר באמצעות Google כדי לשמור על ההעדפות והנתונים שלך מסונכרנים בין המכשירים.',
  'Sign in with Google': 'התחברות באמצעות Google',
  'See the full list and what earns each one': 'לצפייה ברשימה המלאה ובדרכים לזכות בכל תג',
  'Badges': 'תגים',
  'Language': 'שפה',

  // Hamburger drawer / dialogs
  'Settings': 'הגדרות',
  'Close settings': 'סגירת ההגדרות',
  'Open settings': 'פתיחת ההגדרות',
  'Game settings': 'הגדרות המשחק',
  'Back': 'חזרה',
  'Microphone access': 'גישה למיקרופון',
  'Answer out loud': 'מענה בקול',
  'Voice mode listens for the note or fret you say instead of a tap.':
    'במצב קול, אמור את התו או את הסריג במקום להקיש עליהם.',
  'Your browser will ask to use the microphone next — audio stays on your device and is never recorded or uploaded.':
    'הדפדפן שלך יבקש כעת גישה למיקרופון — השמע נשאר במכשיר שלך ואינו מוקלט או מועלה.',
  'Allow microphone': 'אישור גישה למיקרופון',
  'Not now': 'לא עכשיו',
  'Microphone is blocked': 'המיקרופון חסום',
  "Your browser is refusing microphone access for this site, so voice answers can't work yet. Tap the 🔒 / 🎤 icon beside the address bar, set the microphone to":
    'הדפדפן חוסם את הגישה למיקרופון עבור האתר הזה. הקש על הסמל 🔒 / 🎤 שליד שורת הכתובת והגדר את המיקרופון ל־',
  ', then reload the page.': ', ולאחר מכן טען מחדש את הדף.',
  'Allow': 'אפשר',
  'Got it': 'הבנתי',
  'Use tap instead': 'השתמש בהקשה במקום',
  'Sign in': 'התחברות',
  'Save your progress': 'שמור את ההתקדמות שלך',
  'Sign in to keep your history, badges and personal bests across devices. You can keep playing as a guest — everything still works, it just stays on this device.':
    'התחבר כדי לשמור את ההיסטוריה, התגים והשיאים האישיים שלך בין המכשירים. אפשר גם להמשיך לשחק כאורח — הכול ימשיך לעבוד, אבל הנתונים יישארו במכשיר הזה.',
  'Maybe later': 'אולי מאוחר יותר',
  'Press back again to exit': 'לחץ שוב כדי לצאת',

  // In-game
  'STAGE COMPLETE': 'השלב הושלם',
  'Retry': 'נסה שוב',
  '🎤 Microphone blocked — enable it or switch to tap': '🎤 המיקרופון חסום — אפשר גישה או עבור להקשה',
  '🎤 Voice needs a connection': '🎤 מצב קול דורש חיבור לרשת',
  '🎤 Voice isn’t working in this browser — try Chrome, or use tap':
    '🎤 מצב קול לא פועל בדפדפן הזה — נסה את Chrome או עבור להקשה',
  '🎤 Didn’t catch that': '🎤 לא הצלחתי לזהות',
  '🎤 …': '🎤 …',
  'Round Complete!': 'הסיבוב הושלם!',
  'pts': 'נק׳',
  'OK': 'אישור',
  'Start': 'התחל',
  'Resume': 'המשך',
  'Pause': 'השהה',
  'Stop': 'עצור',
  'Refresh': 'רענן',

  'QUESTIONS': 'שאלות',
  'streak': 'רצף',
  'New badge': 'תג חדש',
  'Badge upgraded': 'התג שודרג',
  'Continue': 'המשך',
  'Listening…': 'מקשיב…',
  'Member since': 'חבר מאז',
  'badges earned': 'תגים שנצברו',

  // Pinned badge shelf (Account section)
  'Choose badges to feature': 'בחר תגים להצגה',
  'Edit featured badges': 'עריכת התגים המוצגים',
  'Your badges': 'התגים שלך',
  'Feature up to 5 badges': 'הצג עד 5 תגים',
  'Remove a badge to feature another.': 'הסר תג כדי להוסיף אחר.',
  'See all badges': 'לרשימת התגים המלאה',

  // LeaderboardPanel — standings sub-page
  'player': 'שחקן',
  'players': 'שחקנים',
  'ranked by XP': 'מדורג לפי נקודות ניסיון',
  'free for everyone': 'חינם לכולם',
  'All-time': 'כל הזמנים',
  'This week': 'השבוע',
  'Loading…': 'טוען…',
  'Couldn’t load the leaderboard. Check your connection and try again.':
    'לא ניתן לטעון את טבלת המובילים. בדוק את החיבור ונסה שוב.',
  'Couldn’t update that. Check your connection and try again.':
    'לא ניתן לעדכן. בדוק את החיבור ונסה שוב.',
  'Your standing': 'המיקום שלך',
  'RANK': 'דירוג',
  'acc': 'דיוק',
  '(you)': '(אתה)',
  'Hidden from the leaderboard': 'מוסתר מטבלת המובילים',
  'Visible on the leaderboard': 'מוצג בטבלת המובילים',
  'Join the board': 'הצטרף לטבלה',
  'You can see every player’s standing right now. Sign in with Google to take your own place — every correct answer you’ve ever played counts. Free, no subscription.':
    'אפשר לראות עכשיו את המיקום של כל שחקן. התחבר באמצעות Google כדי להוסיף גם את השם שלך — כל תשובה נכונה שענית עליה עד היום נחשבת. חינם, ללא מנוי.',
  'No one’s on the board yet': 'עדיין אין שחקנים בטבלה',
  'Finish a practice run while signed in and your name lands here first.':
    'סיים סיבוב תרגול כשאתה מחובר, והשם שלך יופיע כאן ראשון.',
  'How is XP counted?': 'איך מחושבות נקודות הניסיון?',

  // SelectorPanel — mode/difficulty/fret-range picker
  'all': 'כל',
  'strings': 'מיתרים',
  'frets': 'סריגים',
  'only the dot-marker frets': 'רק סריגי הנקודות',
  'natural notes only (no sharps or flats)': 'תווים טבעיים בלבד (ללא דיאזים או במולים)',
  'every note, sharps and flats included': 'כל התווים, כולל דיאזים ובמולים',
  'alphabetical order': 'סדר אלפביתי',
  'circle-of-fifths order': 'סדר מעגל הקווינטות',
  'A fret lights up and you pick its note from the wheel':
    'סריג נדלק, ואתה בוחר בגלגל את התו שלו',
  ', rotated to the string': ', מסובב בהתאם למיתר',
  'A note name is shown and you tap every fret on the neck where it lands.':
    'שם של תו מוצג, ואתה מקיש על כל סריג בצוואר שבו התו הזה נמצא.',
  'Note-by-Fret': 'תו לפי סריג',
  'Fret-by-Note': 'סריג לפי תו',
  'Auto-advances through the difficulty stages.': 'מתקדם אוטומטית בין שלבי הקושי.',
  'How this works': 'איך זה עובד',
  'neck': 'צוואר',
  'neck fret range selector': 'בורר טווח הסריגים בצוואר',
  'Precise fret range': 'טווח סריגים מדויק',
  'Pick an exact fret N–M window to drill': 'בחירת חלון סריגים מדויק לתרגול — מסריג N עד סריג M',
  'Fret range': 'טווח סריגים',
  'Full only while a precise fret window is on': 'כשטווח סריגים מדויק מופעל, אפשר לתרגל רק במצב "מלא"',
  'Drill only part of the neck. Drag the handles to set the exact fret window — the shaded area is muted out, both here and on the home-screen neck.':
    'תרגול של חלק מהצוואר בלבד. גררו את הידיות כדי לקבוע את חלון הסריגים המדויק — האזור המוצלל מושתק, גם כאן וגם בצוואר שבמסך הבית.',
  'Lowest fret': 'הסריג הנמוך',
  'Highest fret': 'הסריג הגבוה',
  'Multi': 'מרובה',
  'Note by Fret': 'תו לפי סריג',
  'Alpha': 'אלפביתי',
  'Fifths': 'קווינטות',
  'By String': 'לפי מיתר',
  'Fret by Note': 'סריג לפי תו',
  "Read the note wheel like a clock: your open string sits at 12 o'clock, and the dots under each note show its fret. Answer before the timing bar empties.":
    'קרא את גלגל התווים כמו שעון: המיתר הפתוח נמצא בשעה 12, והנקודות שמתחת לכל תו מציינות את הסריג שלו. ענה לפני שפס הזמן מתרוקן.',
  'Answer before the timing bar empties.': 'ענה לפני שפס הזמן מתרוקן.',
  'Dots': 'נקודות',
  'Naturals': 'טבעיים',
  'Full': 'מלא',
  'Auto Advance to next difficulty': 'מעבר אוטומטי לרמת הקושי הבאה',

  // Onboarding
  'Guitar Fret Practice': 'תרגול סריגי גיטרה',
  'Master the fretboard with the clock method — one string at a time.':
    'למד להכיר את צוואר הגיטרה בשיטת השעון — מיתר אחד בכל פעם.',
  'What do you play?': 'על מה אתה מנגן?',
  'Skip setup →': 'דלג על ההגדרה →',
  'How well do you know the fretboard?': 'עד כמה אתה מכיר את צוואר הגיטרה?',
  "I'm just starting": 'אני רק מתחיל',
  'Start with dot frets on String 6': 'התחל עם סריגי הנקודות במיתר 6',
  'I play but want to improve': 'אני מנגן ורוצה להשתפר',
  'Quick 3-question test': 'מבחן קצר של 3 שאלות',
  'I know the full neck': 'אני מכיר את כל הצוואר',
  'Jump right in': 'התחל מיד',
  'Skip →': 'דלג →',
  'String': 'מיתר',
  'what note is fret': 'איזה תו נמצא בסריג',
  'Skip test →': 'דלג על המבחן →',
  'Keep going!': 'המשך כך!',
  'Good start!': 'התחלה טובה!',
  'Nice work!': 'עבודה מצוינת!',
  'Impressive!': 'מרשים!',
  'Dot Frets': 'סריגי נקודות',
  'Natural notes': 'תווים טבעיים',
  'the full chromatic neck': 'כל הצוואר הכרומטי',
  "correct — we've set you up on": 'נכונות — הגדרנו לך',
  'Change it anytime in the selector panel.': 'אפשר לשנות זאת בכל עת בפאנל הבחירה.',
  "Let's go →": 'בוא נתחיל →',

  // ProgressPanel — stats & progress screen
  'by note': 'לפי תו',
  'by fret': 'לפי סריג',
  'fret': 'סריג',
  'not played': 'לא נוגן',
  'known': 'מוכר',
  'needs work': 'דורש תרגול',
  'unplayed': 'לא נוגן',
  'Not enough data yet.': 'עדיין אין מספיק נתונים.',
  'Not practiced yet': 'עדיין לא תורגל',
  'Older sessions have no date stamp, so the timeline is empty. New sessions fill it in.':
    'בסשנים ישנים לא נשמר תאריך, ולכן ציר הזמן ריק. סשנים חדשים יתווספו אליו.',
  'No rounds recorded for this setup yet. Play a round and its stats show up here.':
    'עדיין לא נרשמו סיבובים עבור ההגדרה הזו. שחק סיבוב והסטטיסטיקות שלו יופיעו כאן.',
  'Play a few rounds and your all-time progress shows up here.':
    'שחק כמה סיבובים וההתקדמות שלך לאורך זמן תופיע כאן.',
  'accuracy': 'דיוק',
  'best streak': 'הרצף הטוב ביותר',
  'avg speed': 'מהירות ממוצעת',
  'day streak': 'רצף יומי',
  'answered': 'נענו',
  'Last round': 'הסיבוב האחרון',
  'Best speed': 'המהירות הטובה ביותר',
  'Weakest notes': 'התווים שדורשים הכי הרבה תרגול',
  'Nothing below 70% — nice.': 'אין תווים מתחת ל־70% — מצוין.',
  'By note': 'לפי תו',
  'By string': 'לפי מיתר',
  'By fret': 'לפי סריג',
  'Fretboard heatmap': 'מפת חום של צוואר הגיטרה',
  'Daily timeline': 'ציר זמן יומי',
  'Accuracy %': 'אחוז דיוק',
  'Avg response time': 'זמן תגובה ממוצע',
  'Personal bests': 'שיאים אישיים',
  'No personal bests recorded yet.': 'עדיין לא נרשמו שיאים אישיים.',
  'No practice in the last 7 days.': 'אין תרגול ב-7 הימים האחרונים.',
  'This setup': 'ההגדרה הזו',
  'All time': 'כל הזמנים',
  'Last 7 days': '7 הימים האחרונים',
  'the current settings': 'ההגדרות הנוכחיות',
  'across every': 'בכל',
  'settings combination': 'שילוב הגדרות',
  'Clear history for this setup': 'נקה את היסטוריית ההגדרה הזו',
  'Clear all history': 'נקה את כל ההיסטוריה',
  'Clear this setup’s history?': 'לנקות את היסטוריית ההגדרה הזו?',
  'Clear all stats?': 'לנקות את כל הסטטיסטיקות?',
  'This erases the practice history for the current settings combination only. Other combinations and your personal bests are kept.':
    'פעולה זו תמחק רק את היסטוריית התרגול של שילוב ההגדרות הנוכחי. שילובים אחרים והשיאים האישיים שלך יישמרו.',
  'This permanently erases your entire practice history and resets the all-time mastery for every note, string and settings combination. Your personal bests are kept.':
    'פעולה זו תמחק לצמיתות את כל היסטוריית התרגול שלך ותאפס את מדד השליטה לאורך זמן עבור כל תו, מיתר ושילוב הגדרות. השיאים האישיים שלך יישמרו.',
  "This can't be undone.": 'אי אפשר לבטל פעולה זו.',
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

  // ── Badges / Achievements wall ─────────────────────────────────────────────
  // Tiers
  'Bronze': 'ברונזה',
  'Silver': 'כסף',
  'Gold': 'זהב',
  'Platinum': 'פלטינה',
  // Wall chrome
  'unlocked': 'נפתחו',
  'Max': 'שיא',
  'Earned': 'הושג',
  // Admin test controls
  'Grant': 'הענק',
  'Reset': 'אפס',
  'Admin tools: Grant or Reset each badge to test it. History-based badges re-appear on reopen unless you also clear history.':
    'כלי מנהל: אפשר להעניק או לאפס כל תג לצורך בדיקה. תגים מבוססי־היסטוריה יחזרו בפתיחה מחדש, אלא אם מנקים גם את ההיסטוריה.',
  // Family names
  'Perfect Session': 'סיבוב מושלם',
  'Speed Demon': 'שד מהירות',
  'Flawless Sprint': 'ספרינט ללא רבב',
  'On Fire': 'בוער',
  'Comeback': 'קאמבק',
  'Every String': 'כל המיתרים',
  'String Master': 'שליטה במיתר',
  'String Master · {s}': 'שליטה · {s}',
  'Full String Master': 'שליטה מלאה במיתרים',
  'Neck Runner': 'רץ הצוואר',
  'Both Ends': 'שני הקצוות',
  'Low End': 'הקצה הנמוך',
  'Week Warrior': 'לוחם השבוע',
  'Dedicated': 'מסור',
  'Century': 'מאה',
  'Marathoner': 'רץ מרתון',
  'Sharpshooter': 'צלף',
  'Quick Read': 'קריאה מהירה',
  'Most Improved': 'המשתפר ביותר',
  'Doubling Up': 'הכפלה',
  'Admin': 'מנהל',
  // Earning conditions — Perfect Session
  'Answer 10+ questions in a round with no mistakes at all.':
    'ענה על 10+ שאלות בסיבוב בלי אף טעות.',
  '25+ questions in a round, still zero mistakes.':
    '25+ שאלות בסיבוב, ועדיין בלי אף טעות.',
  '50+ questions in a round, still zero mistakes — a full clean run.':
    '50+ שאלות בסיבוב, ועדיין בלי אף טעות — סיבוב נקי לחלוטין.',
  // Speed Demon
  'Get 10+ correct answers in a round, at least 8 of them under 1.5s.':
    'ענה נכון על 10+ שאלות בסיבוב, לפחות 8 מהן בתוך פחות מ־1.5 שנ׳.',
  '20+ correct answers, at least 16 of them under 1.5s.':
    '20+ תשובות נכונות, לפחות 16 מהן בתוך פחות מ־1.5 שנ׳.',
  '40+ correct answers, at least 32 of them under 1.2s.':
    '40+ תשובות נכונות, לפחות 32 מהן בתוך פחות מ־1.2 שנ׳.',
  // Flawless Sprint
  'Finish a whole round at 90% accuracy or better.':
    'סיים סיבוב שלם בדיוק של 90% ומעלה.',
  'Finish a whole round at 95% accuracy or better.':
    'סיים סיבוב שלם בדיוק של 95% ומעלה.',
  'Finish a whole round at 100% accuracy.':
    'סיים סיבוב שלם בדיוק של 100%.',
  // On Fire
  'Reach a streak of 15 in a single round.': 'הגיע לרצף של 15 תשובות נכונות בסיבוב אחד.',
  'Reach a streak of 20 in a single round.': 'הגיע לרצף של 20 תשובות נכונות בסיבוב אחד.',
  'Reach a streak of 30 in a single round.': 'הגיע לרצף של 30 תשובות נכונות בסיבוב אחד.',
  // Comeback
  'Miss 3+ of your first 20 questions, then answer the next 8 in a row correctly.':
    'פספס 3+ מתוך 20 השאלות הראשונות, ואז ענה נכון על 8 השאלות הבאות ברצף.',
  'Miss 5+ of your first 20 questions, then answer the next 12 in a row correctly.':
    'פספס 5+ מתוך 20 השאלות הראשונות, ואז ענה נכון על 12 השאלות הבאות ברצף.',
  'Miss 8+ of your first 20 questions, then answer the next 18 in a row correctly.':
    'פספס 8+ מתוך 20 השאלות הראשונות, ואז ענה נכון על 18 השאלות הבאות ברצף.',
  // Every String
  'Finish a round that visited every string: 2x that many questions, 90% accuracy.':
    'סיים סיבוב שעבר בכל המיתרים: פי 2 ממספר המיתרים בשאלות, בדיוק של 90%.',
  'Visited every string: 4x that many questions, 90% accuracy.':
    'עבר בכל המיתרים: פי 4 ממספר המיתרים בשאלות, בדיוק של 90%.',
  'Visited every string: 6x that many questions, 95% accuracy.':
    'עבר בכל המיתרים: פי 6 ממספר המיתרים בשאלות, בדיוק של 95%.',
  // Per-string String Master — {s} is the translated string label
  'Answer 40+ questions on {s} at 90% accuracy or better.':
    'ענה על 40+ שאלות על {s} בדיוק של 90% ומעלה.',
  '100+ questions on {s} at 92% accuracy or better.':
    '100+ שאלות על {s} בדיוק של 92% ומעלה.',
  '200+ questions on {s} at 95% accuracy or better.':
    '200+ שאלות על {s} בדיוק של 95% ומעלה.',
  // Full String Master
  'Earn String Master — Bronze on every string of this instrument.':
    'השג דרגת ברונזה של שליטה במיתר בכל מיתרי הכלי.',
  'Earn String Master — Silver on every string.':
    'השג דרגת כסף של שליטה במיתר בכל המיתרים.',
  'Earn String Master — Gold on every string.':
    'השג דרגת זהב של שליטה במיתר בכל המיתרים.',
  // Neck Runner
  'Answer at least one question on every fret of the neck.':
    'ענה על לפחות שאלה אחת בכל סריג בצוואר.',
  'Answer at least 3 questions on every fret of the neck.':
    'ענה על לפחות 3 שאלות בכל סריג בצוואר.',
  'Answer at least 5 questions on every fret of the neck.':
    'ענה על לפחות 5 שאלות בכל סריג בצוואר.',
  // Both Ends
  'Answer 40+ questions above the 12th fret at 85% accuracy or better.':
    'ענה על 40+ שאלות מעל הסריג ה־12 בדיוק של 85% ומעלה.',
  '100+ questions above the 12th fret at 88% accuracy or better.':
    '100+ שאלות מעל הסריג ה־12 בדיוק של 88% ומעלה.',
  '200+ questions above the 12th fret at 92% accuracy or better.':
    '200+ שאלות מעל הסריג ה־12 בדיוק של 92% ומעלה.',
  // Low End
  'Answer 40+ questions on the bass low-E string at 90% accuracy or better.':
    'ענה על 40+ שאלות על מיתר המי הנמוך בבס בדיוק של 90% ומעלה.',
  '100+ questions on the low-E string at 93% accuracy or better.':
    '100+ שאלות על מיתר המי הנמוך בבס בדיוק של 93% ומעלה.',
  '200+ questions on the low-E string at 96% accuracy or better.':
    '200+ שאלות על מיתר המי הנמוך בבס בדיוק של 96% ומעלה.',
  // Week Warrior
  'Practise on 5 separate days within a single 7-day window.':
    'תרגל ב־5 ימים שונים בתוך תקופה של 7 ימים.',
  '6 separate days within a single 7-day window.':
    'תרגל ב־6 ימים שונים בתוך תקופה של 7 ימים.',
  'All 7 days within a single 7-day window — a perfect week.':
    'תרגל בכל 7 הימים בתוך תקופה של 7 ימים — שבוע מושלם.',
  // Dedicated
  'Build a run of 7 consecutive practice days.': 'צור רצף של 7 ימי תרגול רצופים.',
  '14 consecutive practice days.': '14 ימי תרגול רצופים.',
  '30 consecutive practice days.': '30 ימי תרגול רצופים.',
  '60 consecutive practice days.': '60 ימי תרגול רצופים.',
  // Century
  'Answer 100 questions all-time, across every instrument.':
    'ענה על 100 שאלות בסך הכול, בכל הכלים.',
  '250 questions all-time.': '250 שאלות בסך הכול.',
  '500 questions all-time.': '500 שאלות בסך הכול.',
  '1,000 questions all-time.': '1,000 שאלות בסך הכול.',
  // Marathoner
  'Answer 1,000 questions all-time, across every instrument.':
    'ענה על 1,000 שאלות בסך הכול, בכל הכלים.',
  '2,500 questions all-time.': '2,500 שאלות בסך הכול.',
  '5,000 questions all-time.': '5,000 שאלות בסך הכול.',
  '10,000 questions all-time.': '10,000 שאלות בסך הכול.',
  // Sharpshooter
  'Hold 85% accuracy over at least 200 questions, across every instrument.':
    'שמור על דיוק של 85% לפחות לאורך 200 שאלות לפחות, בכל הכלים.',
  '88% accuracy over at least 500 questions.':
    'דיוק של 88% לפחות לאורך 500 שאלות לפחות.',
  '92% accuracy over at least 1,000 questions.':
    'דיוק של 92% לפחות לאורך 1,000 שאלות לפחות.',
  // Quick Read
  'Hold an average answer time under 2.0s over 200+ questions.':
    'שמור על זמן מענה ממוצע של פחות מ־2.0 שנ׳ לאורך 200+ שאלות.',
  'Under 1.6s over 500+ questions.': 'פחות מ־1.6 שנ׳ לאורך 500+ שאלות.',
  'Under 1.3s over 1,000+ questions.': 'פחות מ־1.3 שנ׳ לאורך 1,000+ שאלות.',
  // Most Improved
  'Over 10+ practice days, lift your accuracy by 20 points from your first days to your latest.':
    'לאורך 10+ ימי תרגול, שפר את הדיוק שלך ב־20 נקודות אחוז מהימים הראשונים ועד האחרונים.',
  'Over 15+ practice days, lift your accuracy by 30 points.':
    'לאורך 15+ ימי תרגול, שפר את הדיוק שלך ב־30 נקודות אחוז.',
  'Over 20+ practice days, lift your accuracy by 40 points.':
    'לאורך 20+ ימי תרגול, שפר את הדיוק שלך ב־40 נקודות אחוז.',
  // Doubling Up
  'Earn String Master on every string of both guitar and bass.':
    'השג שליטה במיתר בכל המיתרים, גם בגיטרה וגם בבס.',
  'Earn Full String Master — Silver on both guitar and bass.':
    'השג שליטה מלאה במיתרים בדרגת כסף, גם בגיטרה וגם בבס.',
  'Earn Full String Master — Gold and Neck Runner — Gold on both guitar and bass.':
    'השג שליטה מלאה במיתרים בדרגת זהב ורץ הצוואר בדרגת זהב, גם בגיטרה וגם בבס.',
  // Admin (role)
  'Granted to app administrators — read every Feedback board post, not just your own.':
    'מוענק למנהלי האפליקציה — מאפשר לקרוא את כל הפוסטים בלוח המשוב, לא רק את הפוסטים שלך.',

  // Free / Pro / Premium tiering — ProGate lock states + the Upgrade card
  'Premium': 'פרימיום',
  'Unlock with Pro': 'זמין במסלול Pro',
  'Unlock with Premium': 'זמין במסלול Premium',
  'You have Pro': 'יש לך Pro',
  "You're on Free": 'אתה במסלול החינמי',
  'Your plan': 'המסלול שלך',
  'Included with Pro': 'כלול גם ב-Pro',
  'Everything in Free, plus:': 'כל מה שיש בחינמי, ובנוסף:',
  'Everything you need to practice daily, at no cost.':
    'כל מה שצריך כדי לתרגל כל יום, ללא עלות.',
  'The full fretboard drill — by note and by fret, on every string':
    'תרגול מלא על סרגל הסריגים — לפי תו ולפי סריג, על כל מיתר.',
  'Badges and achievements, with your pinned medal shelf':
    'עיטורים והישגים, כולל מדף המדליות הנעוצות שלך.',
  'The leaderboard — XP, questions answered and accuracy':
    'לוח המובילים — ניקוד, מספר שאלות ודיוק.',
  'Cloud sync and full restore of your practice on every device':
    'סנכרון ענן ושחזור מלא של התרגול שלך בכל מכשיר.',
  'Your last 7 days of stats, plus the personal best for what you’re drilling':
    'סטטיסטיקות שבעת הימים האחרונים, בתוספת השיא האישי בתרגול הנוכחי.',
  'Free, forever': 'חינמי, לתמיד',
  'Pro is for training seriously and tracking progress over time.':
    'מסלול Pro מיועד לתרגול רציני ולמעקב אחר ההתקדמות לאורך זמן.',
  'Your full practice history — all-time stats and trends, not just the last 7 days':
    'כל היסטוריית התרגול שלך — סטטיסטיקות ומגמות מאז ומתמיד, לא רק שבעת הימים האחרונים.',
  'Mastery maps — per-note and per-fret accuracy overlays on the circle and grid':
    'מפות שליטה — שכבות דיוק לכל תו ולכל סריג על גבי הגלגל והרשת.',
  'Browse your personal bests across every settings combination':
    'עיון בשיאים האישיים שלך בכל צירוף הגדרות.',
  'A personal voice profile built from your own calibration recordings':
    'פרופיל קול אישי הנבנה מהקלטות הכיול שלך.',
  'Your Pro access is complimentary.': 'גישת ה־Pro שלך ניתנה ללא תשלום.',
  'Your Pro access came from a promotion.': 'גישת ה־Pro שלך התקבלה במסגרת מבצע.',
  'Your Pro access was granted manually.': 'גישת ה־Pro שלך הוענקה ידנית.',
  'Your Pro access is from your subscription.': 'גישת ה־Pro שלך היא חלק מהמנוי שלך.',
  'Your Pro access is active.': 'גישת ה־Pro שלך פעילה.',
  'It does not expire.': 'הגישה אינה פגה.',
  'Access runs until': 'הגישה בתוקף עד',
  'Pro isn’t on sale yet — everything above stays free to try in the meantime.':
    'מסלול Pro עדיין אינו נמכר — עד אז כל מה שלמעלה זמין לניסיון בחינם.',
  // Admin-only account tools (settings ▸ Account)
  'Admin: plan on your account': 'מנהל: המסלול בחשבון שלך',
  'Sets the plan on your own account only (Free, Pro or Premium). Writes to the entitlements table and syncs across your devices.':
    'קובע את המסלול בחשבון שלך בלבד (חינמי, Pro או Premium). נכתב לטבלת ההרשאות ומסונכרן בין המכשירים שלך.',
  // Debug panel (dev only)
  'Simulate tier (dev only — no DB change)':
    'הדמיית מסלול (למפתחים בלבד — ללא שינוי במסד הנתונים)',
  'Admin: view the app as': 'מנהל: הצג את האפליקציה בתור',
  'Hides every admin-only control so you see exactly what a regular user sees. Switch back here any time — this is a local view change only and does not change what your account can do.':
    'מסתיר כל פקד שמיועד למנהלים בלבד כדי שתראה בדיוק מה שמשתמש רגיל רואה. אפשר לחזור למצב מנהל כאן בכל רגע — זהו שינוי תצוגה מקומי בלבד ואינו משנה את מה שהחשבון שלך יכול לעשות.',
  'Regular user': 'משתמש רגיל',
  'Free': 'חינמי',

  // Guest-merge prompt (design §5.4) — shown on the first sign-in on a device
  // that already has local guest practice history.
  'Add this device’s progress to your account?':
    'להוסיף את ההתקדמות מהמכשיר הזה לחשבון שלך?',
  'You’ve practiced on this device without an account. Add that progress to your account, or keep only what’s already on your account?':
    'תרגלת על המכשיר הזה בלי חשבון. אפשר להוסיף את ההתקדמות הזו לחשבון שלך, או להשאיר רק את מה שכבר קיים בחשבון.',
  'Merge my progress': 'הוסף את ההתקדמות שלי',
  'Use account only': 'השתמש בחשבון בלבד',
  'Leave this practice off your account?': 'להשאיר את התרגול הזה מחוץ לחשבון?',
  'You have {n} rounds of practice saved on this device. If you continue, they stay on this device but are not added to your account.':
    'שמורים על המכשיר הזה {n} סיבובי תרגול. אם תמשיך, הם יישארו על המכשיר אך לא יתווספו לחשבון שלך.',

  // VoiceCalibration
  'Voice calibration': 'כיול קול',
  'Personal voice calibration': 'כיול קול אישי',
  'Profile name': 'שם הפרופיל',
  'Say just this word, on its own': 'אמור רק את המילה הזו, לבדה',
  'Say just the note name, on its own': 'אמור רק את שם התו, לבד',
  'Could not use the microphone — try again': 'לא ניתן להשתמש במיקרופון — נסה שוב',
  'No sound captured — try again, closer to the mic': 'לא נקלט קול — נסה שוב, קרוב יותר למיקרופון',
  'Recording too short — try again': 'ההקלטה קצרה מדי — נסה שוב',
  "That didn't sound like a note — try again": 'זה לא נשמע כמו תו — נסה שוב',
  'Saving the recording failed': 'שמירת ההקלטה נכשלה',
  'Recorded': 'הוקלטו',
  'notes': 'תווים',
  'accidentals': 'דיאזים/במולים',
  'Say:': 'אמור:',
  'Play last recording': 'נגן את ההקלטה האחרונה',
  'Speak the word on screen — calibration advances on its own': 'אמור את המילה שעל המסך — הכיול מתקדם בעצמו',
  'Take': 'הקלטה',
  'Previous': 'הקודם',
  'Next': 'הבא',
  'Delete profile': 'מחק פרופיל',
  'Reset automatic learning of the general mode': 'אפס למידה אוטומטית של המצב הכללי',
  'Checking recordings…': 'בודק הקלטות…',
  'Self-test recordings': 'בדיקה עצמית של ההקלטות',
  'All words are distinct enough — looks good.': 'כל המילים שונות מספיק זו מזו — נראה טוב.',
  'Finish & enable': 'סיים והפעל',
  'to go': 'נותרו',

  // VoiceLevelMeter
  'Microphone level good': 'רמת המיקרופון תקינה',
  'Microphone level low, speak louder': 'רמת המיקרופון נמוכה, דבר בקול רם יותר',
  'Good level': 'רמה טובה',
  'Too quiet — speak up': 'שקט מדי — דבר בקול רם יותר',

  // DebugLogPanel
  'Debug log': 'יומן ניפוי באגים',
  'Open debug log': 'פתח יומן ניפוי באגים',
  'Errors + voice · auto-clears daily': 'שגיאות + קול · מתנקה אוטומטית מדי יום',
  'Errors · auto-clears daily': 'שגיאות · מתנקה אוטומטית מדי יום',
  'Voice: on': 'קול: פעיל',
  'Voice: off': 'קול: כבוי',
  'Copied': 'הועתק',
  'Copy': 'העתק',
  'Clear': 'נקה',
  'Close': 'סגור',
  '(no errors)': '(אין שגיאות)',

  // FeedbackBoard
  'Couldn’t load the board. Check your connection and try again.':
    'לא הצלחנו לטעון את הלוח. בדוק את החיבור שלך ונסה שוב.',
  'Couldn’t send that. Check your connection and try again.':
    'לא הצלחנו לשלוח את זה. בדוק את החיבור שלך ונסה שוב.',
  'Sign in with Google to leave a comment, idea, or suggestion. Only admins can read the full board.':
    'התחבר עם Google כדי להשאיר תגובה, רעיון או הצעה. רק מנהלים יכולים לקרוא את הלוח המלא.',
  'Microphone access is off — turn it on to dictate.': 'הגישה למיקרופון כבויה — הפעל אותה כדי להכתיב.',
  'Voice typing isn’t available on this device.': 'הקלדה קולית אינה זמינה במכשיר הזה.',
  'Couldn’t hear that — try again.': 'לא שמעתי את זה — נסה שוב.',
  'What’s on your mind?': 'מה עובר לך בראש?',
  'Stop voice typing': 'עצור הקלדה קולית',
  'Start voice typing': 'התחל הקלדה קולית',
  'Sending…': 'שולח…',
  'Send': 'שלח',
  'Listening… say one sentence — it stops on its own.': 'מקשיב… אמור משפט אחד — ייעצר לבד.',
  'Thanks — your message was sent.': 'תודה — ההודעה שלך נשלחה.',
  'Unknown': 'לא ידוע',
  'You': 'אתה',
  'Handled': 'טופל',
  'Mark unhandled': 'סמן כלא מטופל',
  'Mark handled': 'סמן כמטופל',
  'Delete': 'מחק',
  'You haven’t sent anything yet.': 'עדיין לא שלחת שום דבר.',
  'Share a comment, idea, or suggestion. Admins read every post; below you can see the ones you’ve sent.':
    'שתף תגובה, רעיון או הצעה. מנהלים קוראים כל פוסט; למטה תוכל לראות את אלה ששלחת.',
  'Write': 'כתיבה',
  'Inbox': 'תיבת דואר נכנס',
  'Post a comment, idea, or suggestion of your own.': 'פרסם תגובה, רעיון או הצעה משלך.',
  'Every post from every user': 'כל פוסט מכל משתמש',
  'still to handle': 'עדיין לטיפול',
  'Mark one handled once you’ve dealt with it, or delete it.':
    'סמן פוסט כמטופל לאחר שטיפלת בו, או מחק אותו.',
  'No posts yet.': 'אין עדיין פוסטים.',
  'Nothing open — all caught up.': 'אין פתוחים — הכול מטופל.',
  'Delete post': 'מחיקת פוסט',
  'Delete this post?': 'למחוק את הפוסט הזה?',
  'This permanently removes it for everyone, including': 'פעולה זו מסירה אותו לצמיתות עבור כולם, כולל',
  'the author': 'הכותב',
  'It can’t be undone.': 'לא ניתן לבטל פעולה זו.',
  'Delete for everyone': 'מחק עבור כולם',

  // Adaptive difficulty suggestion banner (wishlist §3)
  'You’re cruising through this — ready for a harder level?':
    'אתה עובר את זה בקלות — מוכן לרמה קשה יותר?',
  'This setup is fighting back. Want to ease off a level?':
    'ההגדרה הזו נותנת לך בראש. רוצה לרדת רמה?',
  'Switch the difficulty to': 'החלף את דרגת הקושי ל־',
  'Drop the difficulty to': 'הורד את דרגת הקושי ל־',
  'Apply': 'החל',
  'Dismiss': 'סגור',

  // Premium Teacher — the Today card (premium-product-plan.md §6 P2)
  'Teacher': 'מאמן',
  'Today with your Teacher': 'היום עם המאמן שלך',
  'Recommended': 'מומלץ',
  'positions': 'עמדות',
  "Today's goal is done": 'יעד היום הושלם',
  'one more round?': 'עוד סבב?',
  'Daily goal': 'יעד יומי',
  "Start today's practice": 'התחל את התרגול של היום',
  'Practise my weak spots': 'תרגל את הנקודות החלשות שלי',
  'No weak spots yet — keep practising and the Teacher will find them.':
    'עדיין אין נקודות חלשות — המשך לתרגל והמאמן ימצא אותן.',
  'Why these?': 'למה אלה?',
  'Hide why': 'הסתר הסבר',
  'due for review': 'מיועד לחזרה',
  'weak spots': 'נקודות חלשות',
  'to reinforce': 'לחיזוק',
  'new ground': 'תחום חדש',
  'a fresh set to get started': 'סט חדש כדי להתחיל',
  'often missed': 'נענה שגוי לעיתים קרובות',
  'slow to recall': 'איטי להיזכר',
  'recent slips': 'טעויות אחרונות',
  'reinforcement': 'חיזוק',
  'not practised much': 'לא תורגל הרבה',
  'review': 'חזרה',

  // Premium Learning Path — the Path screen (premium-product-plan.md §9 P3)
  'Learning Path': 'מסלול הלמידה',
  'View your Learning Path': 'הצג את מסלול הלמידה שלך',
  'Follow a guided path from single notes onward': 'עקוב אחר מסלול מודרך, החל מתווים בודדים',
  'A guided journey through the fretboard. Practise from the Selector whenever you like — your answers still move you along this path.':
    'מסע מודרך על פני הצוואר. אפשר לתרגל מלוח הבחירה מתי שרוצים — התשובות שלך עדיין מקדמות אותך במסלול הזה.',
  'Practise toward this checkpoint': 'תרגל לקראת נקודת הציון הזו',
  'This is your next step.': 'זה הצעד הבא שלך.',
  'Every checkpoint mastered — keep it sharp.': 'כל נקודות הציון נשלטו — שמור על החדות.',
  'mastered': 'בשליטה',
  'Locked': 'נעול',
};

const dictionaries: Record<Lang, Record<string, string>> = { en: {}, he };

export function translate(lang: Lang, source: string): string {
  if (lang === 'en') return source;
  return dictionaries[lang][source] ?? source;
}

