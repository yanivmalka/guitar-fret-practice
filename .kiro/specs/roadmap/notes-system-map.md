# דוח מיפוי — מערכת ה־Notes כתחום למידה, כבסיס ל־Intervals

## Context

המשתמש רוצה לתכנן את מערכת ה־Intervals כתחום למידה עצמאי, במקביל ל־Notes.
לפני התכנון הוא ביקש מיפוי מלא — פדגוגי וטכני — של איך מערכת ה־Notes בנויה
בפועל היום, כדי לבדוק אם אפשר לבנות את Intervals באותו מבנה. **זהו דוח מיפוי
בלבד. לא שונה ולא ישונה שום קוד בשלב הזה.**

הערה חשובה: כבר קיים בקוד "פרוסה אנכית ראשונה" של Intervals (P4) — קבצים
`src/utils/intervals.ts`, `src/learning/intervalItem.ts`,
`src/learning/intervalDrill.ts`, ענף `interval` ב־`useGameEngine`,
`IntervalCard` / `IntervalPracticeScreen`, ו־`intervalSrs` בתוך blob מצב־הלמידה
(migration 0014). הדוח מציין לאורך הדרך מה כבר קיים ומה חסר.

---

## 1. נקודת הכניסה

**היררכיה: Drawer → "Learn" → Notes**

- מגירת ההמבורגר מכילה עמוד־משנה יחיד בשם `learn` (מוגדר ב־`settingsSections`
  בתוך [src/App.tsx](src/App.tsx#L1553)), שמרנדר את [src/components/LearnHub.tsx](src/components/LearnHub.tsx).
- `LearnHub` מציג רשת אריחים, אחד לכל תחום למידה:
  - `📅 Daily practice` — Premium (`can('premiumTeacher')`)
  - `🎵 Notes` — פתוח תמיד
  - `🎸 Intervals` — Premium (`can('intervalDrill')`)
  - אריחי "Coming soon" סטטיים: Scales / Chords / Staff reading / Game
- לחיצה על אריח קוראת ל־`onPick(d)` → ב־App: `setActiveDomain(d)`
  ([src/App.tsx](src/App.tsx#L1563)). `activeDomain` הוא state
  ([src/App.tsx](src/App.tsx#L900)), **לא נשמר** — כל טעינה מתחילה ב־`'notes'`.

**מה זה בעצם "מסך Notes":**

- `activeDomain === 'notes'` = מסך הבית = ה־Selector עצמו
  (`renderSelectorPanel` → [src/components/SelectorPanel.tsx](src/components/SelectorPanel.tsx),
  [src/App.tsx](src/App.tsx#L2308)). **אין מסך Notes ייעודי — Notes הוא ליבת
  האפליקציה הרגילה.**
- `activeDomain === 'daily'` → [src/components/DailyPracticeScreen.tsx](src/components/DailyPracticeScreen.tsx)
  (עמוד מלא, גייטד ב־`premiumTeacher`), חזרה → `'notes'`.
- `activeDomain === 'intervals'` → [src/components/IntervalPracticeScreen.tsx](src/components/IntervalPracticeScreen.tsx)
  (עמוד מלא, גייטד ב־`intervalDrill`), חזרה → `'notes'`.
- בנוסף: **מסך ה־Learning Path** ([src/components/LearningPathScreen.tsx](src/components/LearningPathScreen.tsx),
  P3) — עמוד מלא נפרד, נפתח מקישור "View your Learning Path" בכרטיס ה־Today,
  ומנוהל ע"י view-state `showPath` ([src/App.tsx](src/App.tsx#L2131)).

**סיכום ההיררכיה של Notes:** Learn (עמוד מגירה) → אריח "Notes" → ה־Selector.
שלושה משטחים נוספים הקשורים ל־Notes, כולם Premium, כולם עובדים על אותו מודל
תווים + SRS: Daily practice (כרטיס Today / Teacher), ו־Learning Path.

---

## 2. יחידת הלמידה

**היחידה האטומית = מיקום על הצוואר `(string, fret)` = "NoteItem".**

- מזהה: `"<string>:<fret>"` — [src/learning/noteItem.ts](src/learning/noteItem.ts),
  הפונקציה `noteItemId(string, fret)`.
- **לא** שם תו: אותו שם תו מופיע בהרבה מיקומים והם לא באותה רמת קושי (כתוב
  במפורש בכותרת הקובץ).
- כל שכבת הלמידה נעולה על המזהה הזה: `weakness.ts`, `srs.ts`, `planner.ts`,
  `learningState.ts`, וה־sync. אף מודול לא גוזר מזהה משלו.
- `noteItem.ts` מוצהר כ**מכוון־תווים בלבד** ולא יגדל אי־פעם שדה `domain` —
  תחום שני מקבל helper זהות משלו (וזה בדיוק מה שקורה: `intervalItem.ts`).

**איך היחידות מסודרות ל־progression — שתי שכבות נפרדות:**

1. **Free / למידה עצמית — `stageSequence.ts`:**
   `buildStageSequence(instrument)` ב־[src/utils/stageSequence.ts](src/utils/stageSequence.ts)
   בונה תוכנית לימוד ליניארית ל־Auto Advance: חצי־צוואר (0–12 ואז 12–max) →
   מיתר גבוה→נמוך (6→1) → dots/naturals/full × byFret/byNote → זוגות מיתרים →
   כל הצוואר. שקול ל־~86 שלבים.
2. **Premium / מונחה — `PATH_CHECKPOINTS`:**
   ב־[src/learning/path.ts](src/learning/path.ts). רצף קבוע של 6 checkpoints,
   כל אחד `CheckpointRegion` (מערך strings, `fretFrom`, `fretTo`,
   `scope: 'naturals' | 'all'`) שמתממש למיקומים דרך `checkpointItemIds()`.
   סדר: open naturals → open-position naturals → first-five naturals →
   first-octave naturals → first-five all → first-octave all.
3. **נפרד לגמרי — שכבת ה־Game:** [src/game/worlds.ts](src/game/worlds.ts) +
   `stages.ts` — 15 עולמות / 139 שלבים, מסונכרן לענן, אך עדיין לא מחובר ל־UI
   של Learn (אריח "Game" סטטי). מוצהר במפורש כ**לא מאוחד** עם Practice או עם
   ה־Path ([src/game/models.ts](src/game/models.ts#L13)).

---

## 3. מבנה ה־Learning Path

- **קיים curriculum מוגדר:** `PATH_CHECKPOINTS` — רצף קבוע, **מכוון־תווים בלבד**
  לפי כותרת הקובץ (בלי intervals/scales/chords/staff/pitch).
- כל `Checkpoint`: `id`, `order`, `title`, `blurb` (שורה אחת), `region`,
  ו־`targets: StageTargets` — שלושה רפים עולים של `minAccuracy` (1★/2★/3★).
- **שימוש חוזר ממוקד ב־`src/game/`:** רק מתמטיקת הרפים —
  `StageTargets` מ־[src/game/models.ts](src/game/models.ts) ו־`evaluateStars` /
  `meetsGoal` מ־[src/game/stageResult.ts](src/game/stageResult.ts). לא מאומצת
  מסגרת World/Stage/GameProgress.
- **המטריקה שמשווים לרפים** = **אחוז המיקומים בצ'קפוינט ש"נשלטו" (mastered)**,
  לא ריצת דריל בודדת. `pctMastered` בתוך `evaluatePath()` ב־
  [src/learning/pathProgress.ts](src/learning/pathProgress.ts).
- **"נשלט" למיקום בודד** (`isMastered` שם): דלי SRS ≥ `MASTERED_BUCKET` (=3),
  **או** דיוק בחלון האחרון ≥ 0.85 עם ≥ 3 ניסיונות מתוך 12 האחרונים, בטווח 45
  יום.
- **Unlocks / gates:**
  - `unlocked` — הצ'קפוינט הראשון תמיד פתוח; כל אחד אחר נפתח ברגע שקודמו
    `reached` (עבר את רף ה־1★ אי־פעם).
  - `currentCheckpointIndex` = הצ'קפוינט הראשון עם best-stars שמור < 3★.
- **מה לומדים קודם:** ב־[src/hooks/useLearning.ts](src/hooks/useLearning.ts#L271)
  נגזר `pathItems` — עד 6 מיקומים לא־נשלטים מהצ'קפוינט הנוכחי — וה־planner
  משלב אותם בתוכנית היומית **אחרי overdue + weak, לפני consolidation/coverage**
  ([src/learning/planner.ts](src/learning/planner.ts#L172)).
- **Persistence:** `PathProgress.bestStars` לכל `checkpoint.id`, **מונוטוני**
  (`foldCheckpointStars`), מוזג ב־`mergePathProgress` (max לכל id). יושב באותו
  blob מצב־למידה (migration 0013).

---

## 4. מסך הלימוד עצמו

**אין מסך לימוד תיאורטי ל־Notes.** אין הסבר תיאורטי, אין דוגמאות מפורטות, אין
שלב "לימוד" נפרד לפני התרגול. הלמידה היא כולה learning-by-drilling + חזרה מרווחת
+ מסלול נראה־לעין.

מה כן קיים "לפני שמתרגלים":

- **בועת "?" ב־Selector** — [src/components/SelectorPanel.tsx](src/components/SelectorPanel.tsx#L85)
  (`selectionSummary`) + טקסט "שיטת השעון" ([src/components/SelectorPanel.tsx](src/components/SelectorPanel.tsx#L269)):
  סיכום בשפה פשוטה של מה הסיבוב הזה מתרגל + איך לקרוא את ה־`NoteCircle` כמו שעון.
- **`LearningPathScreen`** — טקסט `lp-intro`, `blurb` לכל צ'קפוינט (שורה),
  פס `% mastered`, כוכבים, "This is your next step." אין המחשה של המושג על
  הצוואר.
- **`TodayCard`** — רשימת "Why these?" נפתחת: כל מיקום כ"תווית מיתר · פרט N →
  שם תו", ותגית סיבה (due for review / often missed / slow to recall / recent
  slips / reinforcement / not practised much) — [src/components/TodayCard.tsx](src/components/TodayCard.tsx#L38).
- **`DailyPracticeScreen`** — עוטף את `TodayCard` בעמוד מלא.

**המחשה על הצוואר:** ה־SVG `fret-neck` ב־`SelectorPanel` מראה מיתרים נבחרים +
הצללת חצאי־צוואר (תצוגה מקדימה של הסטאפ). בזמן משחק — `FretGrid` / `NoteCircle`.

**מידע נוסף מעבר לשאלת תרגול:** בפועל אין. אין שכבת תוכן דידקטי.

---

## 5. התרגול

**שני סוגי שאלות** (ב־[src/hooks/useGameEngine.ts](src/hooks/useGameEngine.ts),
`mode: 'byFret' | 'byNote'`):

- **byFret:** פרט מודגש → בחר את התו ב־`NoteCircle` (גלגל circle-of-fifths /
  אלפביתי).
- **byNote:** שם תו מוצג → הקש על כל הפרטים התואמים ב־`FretGrid` (עוקב
  `remainingFrets` / `foundFrets`).

**מה המשתמש בוחר** (ב־[src/hooks/useSelector.ts](src/hooks/useSelector.ts)):
מיתרים (+ Multi), byNote/byFret, חצאי־פרטים 0–12 / 12–max (או חלון מדויק, Pro),
קושי `dots`/`naturals`/`full`, Auto Advance, סדר (fifths/alphabet, רק ב־byFret),
byString, נוטציה.

**מה קבוע / נגזר:** זמן לשאלה (`getTime` לפי קושי + חצאים), `maxQuestions` לפי
קושי (15/20/25), בחירת שאלות דרך `pickSmartFret` / shuffle-bag + coverage-pool
במנוע.

**איך הקושי משתנה:** שלושה שלבים בשם (`Difficulty`) dots → naturals → full —
משנה אילו תווים בבריכה (`dotsOnly` / `wholeToneOnly`), זמן, וכמות שאלות. Auto
Advance משרשר שלבים. באנר הצעה אדפטיבי ([src/components/AdjustSuggestionBanner.tsx](src/components/AdjustSuggestionBanner.tsx),
[src/App.tsx](src/App.tsx#L1123)) מציע צעד למעלה/למטה לפי דיוק אחרון בקומבינציה.

**איך המערכת מחליטה אילו שאלות:**

- **משחק Selector רגיל:** המנוע בוחר מתוך חלון־הפרטים / המיתר/ים / בריכת הקושי.
- **סשן Teacher:** [src/learning/planner.ts](src/learning/planner.ts) —
  `buildDailyPlan` בוחר ≤ 8 מיקומים בסדר עדיפות (overdue SRS → weak → path →
  consolidation → coverage), פולט `DrillConfig` עם `candidates` מפורש, והמנוע
  שואל **רק** עליהם. אדפטיביות קלה: ±1 שנייה לפי דיוק אחרון של האשכול; 12
  שאלות קבוע, בסיס 6 שניות.

---

## 6. SRS / mastery

**מה נשמר** (לכל כלי־נגינה) ב־`localStorage['learningState']`
([src/learning/learningState.ts](src/learning/learningState.ts)):
`{ version, instruments: { <id>: { srs, intervalSrs, daily, path, lastAnswerAt, updatedAt } } }`.
מראה בענן: `user_learning_state.data` JSONB (migrations 0012/0013/0014), ממוזג
**per-key / per-item, לעולם לא last-writer-wins** ([src/learning/learningSync.ts](src/learning/learningSync.ts)).

**ה־item שה־SRS עוקב אחריו** = NoteItem (`"string:fret"`).
`SrsItem { bucket 0..6, dueAt, lastReviewedAt, reps, lapses }` —
[src/learning/srs.ts](src/learning/srs.ts). Leitner, מרווחים קבועים
`BUCKET_INTERVALS_MS` = [0, 20m, 2h, 1d, 3d, 7d, 14d].

**השפעת תשובה:**

- נכונה → `bucket + 1`, `dueAt` נדחף החוצה (`reviewSrsItem`).
- שגויה / timeout → `bucket = 0`, `dueAt = now + 3min` (`LAPSE_DELAY_MS`),
  `lapses + 1`.

**Due items:** `dueItems(map, now)` — `dueAt ≤ now`, ממוין הכי־באיחור קודם.
`overdueByMs` מדרג ל־planner.

**שילוב עם ה־Learning Path:** ב־[src/hooks/useLearning.ts](src/hooks/useLearning.ts)
כל תשובה מוזנת פנימה:

- `recordAnswer` (סשן Teacher) → `recordTeacherAnswer` = SRS + טיק ליעד היומי.
- `recordPracticeAnswer` (תשובת byFret רגילה ב־Selector, Premium בלבד) → SRS
  בלבד, בלי טיק ליעד (כדי שה־Teacher ילמד מכל משחק תווים).
- שניהם no-op כשלא Premium. מחובר ב־[src/App.tsx](src/App.tsx#L317) (history
  sink / game-end) ו־[src/App.tsx](src/App.tsx#L605).
- `pathView` (`evaluatePath`) קורא **אותם** שורות היסטוריה + מפת SRS כדי לחשב
  את אחוז ה־mastered.

**Mastery נפרד (ישן יותר, תמיד פעיל):** [src/utils/mastery.ts](src/utils/mastery.ts) —
`MasteryLevel` = unplayed / needsWork / known (סף 0.7), עם חלון (250 אחרונות
ל־Free / נבחר ל־Pro), מזין את שכבת ה־overlay של הצוואר וה־note-circle. **זה לא
ה־SRS.** `weakness.ts` מצהיר במפורש שהוא לא מחליף אותו.

---

## 7. Progress

**מדדים שהמשתמש רואה:**

- **יעד יומי:** `dailyGoal.completed / dailyGoal.target` (ברירת מחדל 12), פס
  ב־`TodayCard` / `DailyPracticeScreen`. מתגלגל לפי יום קלנדרי (`rollDailyGoal`).
- **Learning Path:** לכל צ'קפוינט — `pctMastered` (%), `masteredCount/totalCount`
  ("positions"), 0–3 כוכבים (live מול best שמור, מונוטוני), דגלי
  unlocked/current/mastered. ב־`LearningPathScreen`.
- **`trackedCount`** — כמה מיקומים נפרדים ה־SRS עוקב אחריהם (מוצג כהקשר).
- **מסך Stats & progress** (`ProgressPanel` / `stats-redesign`) + overlay שליטה
  על הצוואר (`utils/mastery.ts`) — קדם־Premium, לפי `historyKey`.

**"למדתי X מתוך Y":** ב־Path בלבד — מיקומים נשלטים חלקי סך המיקומים בצ'קפוינט
(`checkpointItemIds` נותן את ה־Y). **אין מספר גלובלי אחד** "X/Y תווים נלמדו".

**exposure / practice / mastery:** קיימים שלושה מצבים משתמעים, לא כשכבות
פורמליות בקוד:

- **unplayed** — אין שורת SRS ואין היסטוריה.
- **practised** — יש שורת SRS / היסטוריה, אך `bucket < 3` ודיוק < 0.85.
- **mastered** — `isMastered`: `bucket ≥ 3` או דיוק אחרון ≥ 0.85.
- **weak** — חתך רוחבי ב־[src/learning/weakness.ts](src/learning/weakness.ts):
  דיוק נמוך / איטי / החמצות אחרונות / overdue.

---

## 8. Completion

- **סיום "יחידת לימוד" (מיקום בודד):** אין אירוע בדיד — דלי ה־SRS שלו מתקדם,
  הוא עשוי להתהפך ל־`mastered` ב־`evaluatePath`, ונושר מ־`pathItems` /
  מרשימות ה־weak.
- **סיום שלב (צ'קפוינט):** `foldCheckpointStars` כותב את דרגת הכוכבים החדשה
  (מונוטוני) ברגע ש־`liveStars` עובר לראשונה את ה־best השמור
  ([src/hooks/useLearning.ts](src/hooks/useLearning.ts#L246)). הגעה ל־1★ פותחת
  את הצ'קפוינט הבא. `currentCheckpointIndex` מתקדם כשצ'קפוינט מגיע ל־3★.
  `LearningPathScreen` מציג "This is your next step." / "Every checkpoint
  mastered — keep it sharp."
- **סיום כל התחום:** **אין אירוע/מסך "domain complete".** `currentCheckpointIndex`
  נצמד לצ'קפוינט האחרון; הכרטיס אומר "Every checkpoint mastered." היעד היומי /
  weak spots ממשיכים לרוץ (תחזוקה).
- **סיום סשן:** ה־effect של game-end ב־[src/App.tsx](src/App.tsx#L1350) —
  סשני Teacher/interval הם חד־פעמיים: התוכנית נזרקת, חוזרים ל־Selector;
  personal-best / badges / leaderboard **מדולגים** לריצות Teacher ו־interval
  (`wasTeacherRunRef` / `wasIntervalRunRef`).

---

## 9. UI / UX

**קומפוננטות רלוונטיות ל־Notes:** `LearnHub`, `SelectorPanel`, `NoteCircle`,
`FretGrid`, `FretRangeNeck` / `FretRangeControl`, `TodayCard`,
`DailyPracticeScreen`, `LearningPathScreen`, `AdjustSuggestionBanner`,
`ProgressPanel`, `SpeedBar`, `AnimatedScore`.

**דפוסי UI חוזרים:**

- **מעטפת עמוד מלא** (`settings-page` / `lp-page`): כפתור back (Chevron) +
  hero (אייקון/אמוג'י + כותרת) + body עטוף ב־`<ProGate variant="replace">`.
  בשימוש ב־`DailyPracticeScreen`, `IntervalPracticeScreen`, `LearningPathScreen`
  (וגם Stats). **נשען לשימוש חוזר גבוה.**
- **סגנון `teacher-card`** (תג ⭐ Premium, כותרת, summary, actions,
  why-toggle) — משותף ל־`TodayCard` ו־`IntervalCard`.
- **עטיפת `click()`** = `playClickSound()` + `haptic.tap()` על כל פקד
  (קונבנציה מ־CLAUDE.md).
- **שורת צ'קפוינט:** צ'יפ אינדקס + כותרת + כוכבים/מנעול + blurb + פס
  `lp-cp-bar` + meta (`% mastered`, `n/m positions`) + "next step". CSS
  ב־[src/styles/23-learning-path.css](src/styles/23-learning-path.css).

**מבנה שאפשר למחזר כמעט כמו שהוא ל־Intervals:** מעטפת העמוד המלא, מעטפת
הכרטיס, שורת־הצ'קפוינט + רשימת ה־Path, עטיפת ה־ProGate, ואריח המגירה —
כולם כבר קיימים ומקצתם כבר ממוחזרים (`IntervalPracticeScreen` הוא כמעט העתק
של `DailyPracticeScreen`; `IntervalCard` כבר משתמש ב־`teacher-card`).

---

## 10. הפרדה בין המנוע לבין התוכן

**תשתית generic (לשימוש חוזר ב־Intervals; חלקה כבר ממוחזר):**

- [src/hooks/useGameEngine.ts](src/hooks/useGameEngine.ts) /
  [src/hooks/useDrillSession.ts](src/hooks/useDrillSession.ts) /
  [src/drill/DrillConfig.ts](src/drill/DrillConfig.ts) / `SessionResult` —
  ה־runner היחיד לסשן. `DrillConfig.candidates` + `DrillConfig.interval` הם
  תפרי־התוכן. `drillConfigToGameSettings` / `computeSessionResult`.
- [src/learning/srs.ts](src/learning/srs.ts) — Leitner אגנוסטי־תחום לגמרי
  (כבר מריץ את `intervalSrs` ללא שינוי; מחרוזת ה־id אטומה עבורו).
- [src/learning/learningState.ts](src/learning/learningState.ts) (ה־blob) +
  [src/learning/learningSync.ts](src/learning/learningSync.ts) (מיזוג per-item
  + reconcile ענן) — כבר נושאים `intervalSrs`, migration 0014.
- `useScoring`, `useHistory`, `HistoryEntry` (כבר עם `intervalItemId` אופציונלי),
  feedback/haptics, i18n `t()`, `ProGate`, מעטפת העמוד המלא, entitlement
  `can(...)`.
- [src/game/stageResult.ts](src/game/stageResult.ts) `evaluateStars` /
  `meetsGoal` + `StageTargets` — מתמטיקת רפים generic (כבר ממוחזרת ע"י ה־Path).

**קוד Notes-specific (צריך תאום בטעם Intervals, לא שימוש חוזר):**

- [src/learning/noteItem.ts](src/learning/noteItem.ts) — מוצהר "לעולם לא שדה
  `domain`"; ל־Intervals כבר יש `intervalItem.ts`.
- [src/learning/weakness.ts](src/learning/weakness.ts) — קורא שורות
  `(string, fret)`; `analyzeWeakness` / `leastPractisedPositions`. **אין
  מקבילה ל־intervals.**
- [src/learning/planner.ts](src/learning/planner.ts) — מכוון־תווים,
  `mode: 'byFret'`, בונה דרילים לפי חלון־פרטים ממיקומים, משלב `pathItems`.
  [src/learning/intervalDrill.ts](src/learning/intervalDrill.ts) הוא המקבילה
  אך **הרבה יותר דקה** (בלי weakness, בלי consolidation, בלי path).
- [src/learning/path.ts](src/learning/path.ts) /
  [src/learning/pathProgress.ts](src/learning/pathProgress.ts) — צ'קפוינטים
  מוגדרים כאזורי־צוואר של מיקומים; "% mastered" מעל מיקומים. **אין צ'קפוינטי
  intervals** (wishlist: "The Path is still notes-only").
- `useDerivedNotes.ts`, `NoteCircle`, `FretGrid` (חלקית משותפים — מנוע
  ה־interval ממחזר את משטחי byNote/byFret), `stageSequence.ts`, מודל הקושי של
  `useSelector`.

**מה כדאי להשאיר משותף ומה נפרד:**

- **משותף:** ה־runner, ה־SRS, ה־blob + sync, scoring/history, מתמטיקת
  הכוכבים, מעטפות ה־UI, ProGate/entitlement.
- **נפרד לכל תחום:** זהות ה־item, מחולל השאלה + ה־prompt, מנתח ה־weakness,
  ה־planner, תוכן ה־path/checkpoints, ההגדרה של "מה זה נשלט".

---

## Notes → Intervals: מה ניתן לשכפל

### A. ניתן לשכפל כמעט 1:1 (חלקו כבר קיים)

| פריט | קובץ / פונקציה | מצב |
|---|---|---|
| אריח המגירה | `LearnHub` tile `'intervals'` | **קיים** |
| מעטפת עמוד מלא | `IntervalPracticeScreen` ← העתק של `DailyPracticeScreen` / `LearningPathScreen` | **קיים** |
| מעטפת כרטיס | `IntervalCard` משתמש ב־`.teacher-card` | **קיים** |
| מנוע SRS | [src/learning/srs.ts](src/learning/srs.ts) — `intervalSrs` רץ עליו ללא שינוי | **קיים** |
| Persistence + sync ענן | blob + `learningSync` + migration 0014 | **קיים** |
| Runner לסשן | `useDrillSession` + ענף `interval` ב־`useGameEngine` | **קיים** |
| ניתוב היסטוריה | `HistoryEntry.intervalItemId` + `intervalSink` ב־[src/App.tsx](src/App.tsx#L293) | **קיים** |
| מתמטיקת רפי־כוכבים | `evaluateStars` / `StageTargets` — ניתנת לשימוש כמו שהיא לצ'קפוינטי intervals | לשימוש חוזר |
| Gating | `ProGate` / `can('intervalDrill')` | **קיים** |

### B. ניתן לשכפל את המבנה אבל צריך תוכן / לוגיקה אחרת

- **זהות ה־item:** `intervalItem.ts` קיים אך **quality-only + עולה בלבד**
  (`interval:<semitones>`, m2…M7). תחום מלא כנראה ירצה `(interval, root/context)`
  או גרנולריות per-string-set (plan §5; wishlist follow-ups שורות 694–710).
- **צ'קפוינטי Learning Path:** צריך רשימת צ'קפוינטים ל־intervals (אנלוג
  ל־`PATH_CHECKPOINTS`) — למשל "שלישיות על מיתרים 6–5", "כל האינטרוולים
  בפוזיציה פתוחה". `evaluatePath` יזדקק ל־`isMastered` מודע־intervals +
  materialiser פריטים, או `evaluateIntervalPath` מקביל.
- **Planner:** צריך `buildIntervalDailyPlan` עם weakness + consolidation +
  שילוב path (היום ל־`buildIntervalDrill` אין כלום מזה). לחלופין הדרך הקשה
  ש־wishlist מסמן: מיזוג interval-SRS + note-SRS למיקס יומי משוקלל אחד.
- **מנתח weakness:** `analyzeIntervalWeakness` מעל שורות היסטוריה מתויגות
  interval (דיוק / latency / overdue לכל interval id).
- **משטחי Progress:** `IntervalPracticeScreen` מציג היום רק `trackedCount` —
  רשימת צ'קפוינטים + % mastered + יעד intervals יומי צריכים בנייה (חיקוי
  `LearningPathScreen` / `TodayCard`).
- **הגדרת "נשלט":** לבחור ספים מתאימים ל־intervals (פחות פריטים ⇒ חלונות /
  ספירות אחרים).
- **מחולל שאלה / prompt:** `IntervalPrompt` קיים; להרחיב ל־יורד /
  by-name-with-root / זיהוי־משתי־נקודות (plan §8: "(interval,
  identify-from-position)").

### C. חייב להיות שונה ב־Intervals

- **יחידת הלמידה אינה מיקום על הצוואר** — היא **יחס** (מרחק בחצאי־טונים,
  אופציונלית מושרש/מאוית). `noteItem.ts` לא ניתן לשימוש חוזר (בכוונה).
- **"המיקומים" של צ'קפוינט הופכים לתאי "interval × context"**, לא
  `(string, fret)` — `checkpointItemIds` / `CheckpointRegion` (strings + חלון
  פרטים + naturals/all) לא ממופה; צריך מודל בחירה/אזור משלו.
- **ציר הקושי שונה:** לא dots/naturals/full. יותר כמו: סט אינטרוולים (שלישיות
  → +חמישיות → הכל), כיוון (עולה → +יורד), צורה (on-neck מול by-name), מוטת
  פרטים, מיתר בודד מול חוצה־מיתרים.
- **`useDerivedNotes` / רשימת circle-of-fifths** מכוונות־תו; דרילי intervals
  גוזרים תו־מטרה משורש + חצאי־טונים (`noteNameAtSemitones`,
  `targetPositionsForInterval` ב־[src/utils/intervals.ts](src/utils/intervals.ts)).
- **Auto Advance / `stageSequence.ts`** הוא curriculum תווים; intervals צריכים
  רצף מסודר משלהם אם יקבלו autoplay.
- **תיאוריה / המחשה:** ל־intervals ייתכן שדווקא נחוצה שכבת הדידקטיקה ש־Notes
  מעולם לא היו לו (הראיית הצורה על הצוואר) — פריט **חדש**, לא משוכפל.
- **מיקס ה־planner:** ה־wishlist מסמן במפורש ששילוב intervals לתוך הסשן היומי
  של התווים **לא פתור** ודורש התייחסות משותפת ל־note-SRS ו־interval-SRS —
  חלק חדש באמת.

### פערים ידועים כיום ב־P4 (מ־product-wishlist.md, שורות 677–715)

- אין צ'קפוינטי Path ל־intervals.
- ה־planner (`buildDailyPlan`) לא משלב פריטי interval — סשן interval מופעל רק
  מהכרטיס.
- אין קושי אדפטיבי ל־intervals (חלון פרטים 0–12 קבוע, 12 שאלות, 7ש').
- גרנולריות ה־SRS: quality-only ועולה בלבד.
- `buildIntervalDrill` משתמש בכל המיתרים (multi-string by-note/by-fret).

---

## אימות

זהו דוח מיפוי — אין קוד לבנות או להריץ. אימות = הצלבה מול הקבצים המקושרים
לעיל. הרפרנסים המהירים ביותר לבדיקה עצמית:

- זרימת נקודת הכניסה: `LearnHub.onPick` → `setActiveDomain` ב־`App.tsx`.
- שרשרת המודל: `useSelector` → `useDerivedNotes` → `useGameEngine`
  (מ־CLAUDE.md) + `useLearning` → `planner` / `pathProgress`.
- סקריפטי בדיקה ידניים קיימים: `scripts/check-learning.mts`,
  `scripts/check-learning-path.mts`, `scripts/check-intervals.mts`
  (`node --experimental-strip-types scripts/check-*.mts`).
