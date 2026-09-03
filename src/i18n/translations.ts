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

  // LeaderboardPanel — standings sub-page
  'player': 'שחקן/ית',
  'players': 'שחקנים/יות',
  'ranked by XP': 'מדורג לפי נקודות ניסיון',
  'free for everyone': 'חינם לכולם',
  'All-time': 'כל הזמנים',
  'This week': 'השבוע',
  'Loading…': 'טוען…',
  'Couldn’t load the leaderboard. Check your connection and try again.':
    'לא ניתן לטעון את טבלת המובילים. בדוק את החיבור ונסה שוב.',
  'Couldn’t update that. Check your connection and try again.':
    'לא ניתן לעדכן. בדוק את החיבור ונסה שוב.',
  'Your standing': 'הדירוג שלך',
  'RANK': 'דירוג',
  'acc': 'דיוק',
  '(you)': '(את/ה)',
  'Hidden from the leaderboard': 'מוסתר/ת מטבלת המובילים',
  'Visible on the leaderboard': 'גלוי/ה בטבלת המובילים',
  'Join the board': 'הצטרף לטבלה',
  'You can see every player’s standing right now. Sign in with Google to take your own place — every correct answer you’ve ever played counts. Free, no subscription.':
    'אפשר לראות את הדירוג של כל שחקן/ית כבר עכשיו. התחבר עם Google כדי לתפוס את המקום שלך — כל תשובה נכונה שאי פעם ניגנת נספרת. חינם, ללא מנוי.',
  'No one’s on the board yet': 'אף אחד עוד לא בטבלה',
  'Finish a practice run while signed in and your name lands here first.':
    'סיים סיבוב תרגול כשאתה מחובר והשם שלך יופיע כאן ראשון.',
  'How is XP counted?': 'איך סופרים נקודות ניסיון?',

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
  // Family names
  'Perfect Session': 'סיבוב מושלם',
  'Speed Demon': 'שד מהירות',
  'Flawless Sprint': 'ספרינט ללא רבב',
  'On Fire': 'בוער',
  'Comeback': 'קאמבק',
  'Every String': 'כל המיתרים',
  'String Master': 'שליטה במיתר',
  'String Master · {s}': 'שליטה במיתר · {s}',
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
    'ענה על 10+ שאלות בסיבוב ללא שום טעות.',
  '25+ questions in a round, still zero mistakes.':
    '25+ שאלות בסיבוב, עדיין אפס טעויות.',
  '50+ questions in a round, still zero mistakes — a full clean run.':
    '50+ שאלות בסיבוב, עדיין אפס טעויות — סיבוב נקי לחלוטין.',
  // Speed Demon
  'Get 10+ correct answers in a round, at least 8 of them under 1.5s.':
    'קבל 10+ תשובות נכונות בסיבוב, לפחות 8 מהן מתחת ל-1.5 שנ׳.',
  '20+ correct answers, at least 16 of them under 1.5s.':
    '20+ תשובות נכונות, לפחות 16 מהן מתחת ל-1.5 שנ׳.',
  '40+ correct answers, at least 32 of them under 1.2s.':
    '40+ תשובות נכונות, לפחות 32 מהן מתחת ל-1.2 שנ׳.',
  // Flawless Sprint
  'Finish a whole round at 90% accuracy or better.':
    'סיים סיבוב שלם בדיוק של 90% ומעלה.',
  'Finish a whole round at 95% accuracy or better.':
    'סיים סיבוב שלם בדיוק של 95% ומעלה.',
  'Finish a whole round at 100% accuracy.':
    'סיים סיבוב שלם בדיוק של 100%.',
  // On Fire
  'Reach a streak of 15 in a single round.': 'הגע לרצף של 15 בסיבוב אחד.',
  'Reach a streak of 20 in a single round.': 'הגע לרצף של 20 בסיבוב אחד.',
  'Reach a streak of 30 in a single round.': 'הגע לרצף של 30 בסיבוב אחד.',
  // Comeback
  'Miss 3+ of your first 20 questions, then answer the next 8 in a row correctly.':
    'החמץ 3+ מ-20 השאלות הראשונות שלך, ואז ענה נכון על 8 הבאות ברצף.',
  'Miss 5+ of your first 20 questions, then answer the next 12 in a row correctly.':
    'החמץ 5+ מ-20 השאלות הראשונות שלך, ואז ענה נכון על 12 הבאות ברצף.',
  'Miss 8+ of your first 20 questions, then answer the next 18 in a row correctly.':
    'החמץ 8+ מ-20 השאלות הראשונות שלך, ואז ענה נכון על 18 הבאות ברצף.',
  // Every String
  'Finish a round that visited every string: 2x that many questions, 90% accuracy.':
    'סיים סיבוב שעבר בכל מיתר: פי 2 שאלות מכך, 90% דיוק.',
  'Visited every string: 4x that many questions, 90% accuracy.':
    'עבר בכל מיתר: פי 4 שאלות מכך, 90% דיוק.',
  'Visited every string: 6x that many questions, 95% accuracy.':
    'עבר בכל מיתר: פי 6 שאלות מכך, 95% דיוק.',
  // Per-string String Master — {s} is the translated string label
  'Answer 40+ questions on {s} at 90% accuracy or better.':
    'ענה על 40+ שאלות ב{s} בדיוק של 90% ומעלה.',
  '100+ questions on {s} at 92% accuracy or better.':
    '100+ שאלות ב{s} בדיוק של 92% ומעלה.',
  '200+ questions on {s} at 95% accuracy or better.':
    '200+ שאלות ב{s} בדיוק של 95% ומעלה.',
  // Full String Master
  'Earn String Master — Bronze on every string of this instrument.':
    'השג שליטה במיתר — ברונזה בכל מיתר של הכלי הזה.',
  'Earn String Master — Silver on every string.':
    'השג שליטה במיתר — כסף בכל מיתר.',
  'Earn String Master — Gold on every string.':
    'השג שליטה במיתר — זהב בכל מיתר.',
  // Neck Runner
  'Answer at least one question on every fret of the neck.':
    'ענה על לפחות שאלה אחת בכל סריג בצוואר.',
  'Answer at least 3 questions on every fret of the neck.':
    'ענה על לפחות 3 שאלות בכל סריג בצוואר.',
  'Answer at least 5 questions on every fret of the neck.':
    'ענה על לפחות 5 שאלות בכל סריג בצוואר.',
  // Both Ends
  'Answer 40+ questions above the 12th fret at 85% accuracy or better.':
    'ענה על 40+ שאלות מעל הסריג ה-12 בדיוק של 85% ומעלה.',
  '100+ questions above the 12th fret at 88% accuracy or better.':
    '100+ שאלות מעל הסריג ה-12 בדיוק של 88% ומעלה.',
  '200+ questions above the 12th fret at 92% accuracy or better.':
    '200+ שאלות מעל הסריג ה-12 בדיוק של 92% ומעלה.',
  // Low End
  'Answer 40+ questions on the bass low-E string at 90% accuracy or better.':
    'ענה על 40+ שאלות במיתר המי הנמוך של הבס בדיוק של 90% ומעלה.',
  '100+ questions on the low-E string at 93% accuracy or better.':
    '100+ שאלות במיתר המי הנמוך בדיוק של 93% ומעלה.',
  '200+ questions on the low-E string at 96% accuracy or better.':
    '200+ שאלות במיתר המי הנמוך בדיוק של 96% ומעלה.',
  // Week Warrior
  'Practise on 5 separate days within a single 7-day window.':
    'תרגל ב-5 ימים נפרדים בתוך חלון של 7 ימים.',
  '6 separate days within a single 7-day window.':
    '6 ימים נפרדים בתוך חלון של 7 ימים.',
  'All 7 days within a single 7-day window — a perfect week.':
    'כל 7 הימים בתוך חלון של 7 ימים — שבוע מושלם.',
  // Dedicated
  'Build a run of 7 consecutive practice days.': 'בנה רצף של 7 ימי תרגול רצופים.',
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
    'שמור על דיוק של 85% לאורך לפחות 200 שאלות, בכל הכלים.',
  '88% accuracy over at least 500 questions.':
    'דיוק של 88% לאורך לפחות 500 שאלות.',
  '92% accuracy over at least 1,000 questions.':
    'דיוק של 92% לאורך לפחות 1,000 שאלות.',
  // Quick Read
  'Hold an average answer time under 2.0s over 200+ questions.':
    'שמור על זמן מענה ממוצע מתחת ל-2.0 שנ׳ לאורך 200+ שאלות.',
  'Under 1.6s over 500+ questions.': 'מתחת ל-1.6 שנ׳ לאורך 500+ שאלות.',
  'Under 1.3s over 1,000+ questions.': 'מתחת ל-1.3 שנ׳ לאורך 1,000+ שאלות.',
  // Most Improved
  'Over 10+ practice days, lift your accuracy by 20 points from your first days to your latest.':
    'לאורך 10+ ימי תרגול, שפר את הדיוק שלך ב-20 נקודות מהימים הראשונים ועד האחרונים.',
  'Over 15+ practice days, lift your accuracy by 30 points.':
    'לאורך 15+ ימי תרגול, שפר את הדיוק שלך ב-30 נקודות.',
  'Over 20+ practice days, lift your accuracy by 40 points.':
    'לאורך 20+ ימי תרגול, שפר את הדיוק שלך ב-40 נקודות.',
  // Doubling Up
  'Earn String Master on every string of both guitar and bass.':
    'השג שליטה במיתר בכל מיתר, גם בגיטרה וגם בבס.',
  'Earn Full String Master — Silver on both guitar and bass.':
    'השג שליטה מלאה במיתרים — כסף, גם בגיטרה וגם בבס.',
  'Earn Full String Master — Gold and Neck Runner — Gold on both guitar and bass.':
    'השג שליטה מלאה במיתרים — זהב ורץ הצוואר — זהב, גם בגיטרה וגם בבס.',
  // Admin (role)
  'Granted to app administrators — read every Feedback board post, not just your own.':
    'ניתן למנהלי האפליקציה — קריאת כל הפוסטים בלוח המשוב, לא רק שלך.',
};

const dictionaries: Record<Lang, Record<string, string>> = { en: {}, he };

export function translate(lang: Lang, source: string): string {
  if (lang === 'en') return source;
  return dictionaries[lang][source] ?? source;
}

