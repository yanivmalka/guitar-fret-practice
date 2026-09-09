# Seasonal palettes — parallel session briefs

The skeleton is on `claude/seasonal-palettes` (commit `abbe3f8`). The
remaining work splits into **4 independent slices** plus a **final QA pass**.
Each slice is a separate session in its **own git worktree**, branched off
`claude/seasonal-palettes`, merged back into it when done. Then session E
does integrated QA, then one PR to `main`.

Design reference (all 12 combos):
<https://claude.ai/code/artifact/b5ef3f24-2fee-48bc-887b-46e258d962ea>

## Conflict map

| Slice | Owns (only these files) | Never touches |
|-------|-------------------------|---------------|
| A | `src/styles/00-tokens.css` — **only** the `[data-theme='winter-*']` and `[data-theme='spring-*']` blocks | `:root`, legacy `night`/`day`, summer/autumn blocks, any non-CSS file |
| B | `src/styles/00-tokens.css` — **only** the `[data-theme='summer-*']` and `[data-theme='autumn-*']` blocks | everything A owns, `:root`, legacy blocks |
| C | `src/components/settings/sections/GeneralSettingsSection.tsx`, a new `src/styles/` partial if needed | `00-tokens.css`, `theme.ts` |
| D | `src/design-preview/*`, `src/stats-redesign/*`, `scripts/check-theme-tokens.mts` (new) | the 12 season-mode blocks |

A and B edit the same file but disjoint blocks — git merges them cleanly as
long as **neither reformats or reorders** the file. Merge A first, then B.

## Start each session with

```
cd <repo>
git fetch origin
git worktree add ../gfp-<slice> claude/seasonal-palettes
cd ../gfp-<slice>
git switch -c claude/seasonal-palettes-<slice>
```

Finish with `npm run build` + `npm run lint` green, commit, then from the
main checkout: `git switch claude/seasonal-palettes && git merge --no-ff
claude/seasonal-palettes-<slice>`.

---

## Session A — Winter + Spring palette tuning

> אתה עובד על ענף `claude/seasonal-palettes` בפרויקט guitar-fret-practice,
> ב-worktree נפרד. המשימה: לכייל את פלטות הצבע של **חורף ואביב** בקובץ
> `src/styles/00-tokens.css`.
>
> ערוך **אך ורק** את הבלוקים `[data-theme='winter-night']`,
> `[data-theme='winter-day']`, `[data-theme='spring-dark']`,
> `[data-theme='spring-night']`, `[data-theme='spring-day']`. אל תיגע ב־
> `[data-theme='winter-dark']` (הוא זהה בכוונה לברירת המחדל הישנה), ב־`:root`,
> בבלוקים הישנים `night`/`day`, או בבלוקים של קיץ/סתיו.
>
> לכל בלוק ודא:
> - ניגודיות `--text-0`/`--text-1` על `--bg-0` ו־`--bg-2` עומדת בתקן AA
>   (4.5:1 לטקסט רגיל, 3:1 לטקסט גדול). במצבי `day` בדוק גם `--text-3` על
>   `--bg-1`.
> - `--success` / `--danger` / `--amber` נשארים קריאים וברורים על הרקע —
>   הם משמשים למפת החום של השליטה ולמשוב נכון/שגוי.
> - `--accent` נראה על `--bg-0` וגם כרקע שמאחוריו טקסט בצבע `--accent-ink`.
> - `--pick-accent` נבדל מספיק מ־`--accent`.
> - אם שינית `--bg-0` של בלוק כלשהו — עדכן את הערך המקביל ב־`THEME_BG`
>   שבקובץ `src/utils/theme.ts` (זו החריגה היחידה שלך מ־00-tokens.css).
>
> השווה מול דף הדיזיין: https://claude.ai/code/artifact/b5ef3f24-2fee-48bc-887b-46e258d962ea
>
> תצוגה מהירה של צירוף: הרץ `npm run dev`, ובקונסול של הדפדפן
> `document.documentElement.dataset.theme = 'spring-day'` וכו'.
>
> סיים עם `npm run build` ו־`npm run lint` ירוקים, ו-commit.

---

## Session B — Summer + Autumn palette tuning

> כמו Session A, אבל הבלוקים שלך הם **קיץ וסתיו**:
> `[data-theme='summer-dark']`, `[data-theme='summer-night']`,
> `[data-theme='summer-day']`, `[data-theme='autumn-dark']`,
> `[data-theme='autumn-night']`, `[data-theme='autumn-day']`.
>
> אל תיגע בבלוקים של חורף/אביב, ב־`:root`, או בבלוקים הישנים `night`/`day`.
> אותם קריטריונים של ניגודיות וצבעים פונקציונליים כמו ב־Session A. אם שינית
> `--bg-0` — עדכן את `THEME_BG` ב־`src/utils/theme.ts`.
>
> שים לב במיוחד: `summer-night` נבחר בכוונה לשמר את גוון הענבר של מצב הלילה
> הקיים, ו־`autumn-night` הוא הפלטה הכי חמה והכי מעומעמת מבין ה־12 — שמור על
> האופי הזה.
>
> סיים עם `npm run build` + `npm run lint` ירוקים, ו-commit.

---

## Session C — Two-axis picker UX + RTL

> אתה עובד על ענף `claude/seasonal-palettes` ב-worktree נפרד. בהגדרות יש כרגע
> שני בוררים מוערמים: "ערכת נושא" (כהה/לילה/יום) ואז "עונה"
> (חורף/אביב/קיץ/סתיו), שניהם `PickRow` ב־
> `src/components/settings/sections/GeneralSettingsSection.tsx`.
>
> המשימה:
> - החלט אם ההערמה הנוכחית מספקת או שעדיף רכיב אחד — למשל רשת דוגמיות של
>   4 עונות × 3 מצבים, או בורר עונה עם דוגמית צבע לכל אופציה. אם אתה בונה
>   רכיב חדש, ה־CSS שלו הולך ל-partial ממוספר תחת `src/styles/`, לא ל־
>   `00-tokens.css`.
> - ודא שהשורה של 4 העונות לא נשברת מכוער בטלפון צר (בדוק ~320px רוחב).
> - בדוק גם ב־LTR וגם בעברית (RTL) — החלף שפה בהגדרות. הצ'יפים והחיצים
>   צריכים להתנהג נכון בשני הכיוונים.
> - שמור על תבנית ה־`click()` של הפרויקט (`playClickSound()` + `haptic.tap()`)
>   לכל פקד אינטראקטיבי חדש.
> - כל מחרוזת חדשה שמוצגת למשתמש צריכה ערך `he` ב־`src/i18n/translations.ts`.
>
> **אל תיגע** ב־`00-tokens.css` או ב־`src/utils/theme.ts`.
>
> סיים עם `npm run build` + `npm run lint` ירוקים, ו-commit.

---

## Session D — Design labs migration + token guard

> אתה עובד על ענף `claude/seasonal-palettes` ב-worktree נפרד. שתי משימות:
>
> 1. `src/design-preview/*` ו־`src/stats-redesign/*` עדיין פולטים
>    `data-theme="light"` / `"night"` / `"day"` (הציר הישן). כרגע זה עובד דרך
>    בלוקים legacy שהושארו ב־`00-tokens.css`. החלט: או להעביר את המעבדות
>    לשמות `<season>-<mode>` (ואז הן יכולות להציג את הפלטות החדשות), או
>    להשאיר כמו שהוא במכוון ולתעד זאת. אם אתה מעביר — עדכן את קוד ה־TSX של
>    המעבדות ואת ה־CSS המקומי שלהן, **לא** את הבלוקים של 12 הצירופים.
>
> 2. הוסף `scripts/check-theme-tokens.mts` (בסגנון שאר `scripts/check-*.mts`)
>    שמנתח את `src/styles/00-tokens.css`, שולף את `--bg-0` מכל בלוק
>    `[data-theme='<season>-<mode>']`, ומוודא שהוא זהה לערך המקביל ב־
>    `THEME_BG` שב־`src/utils/theme.ts`. יוצא עם קוד שגיאה אם יש אי-התאמה.
>    הרצה: `node --experimental-strip-types scripts/check-theme-tokens.mts`.
>
> **אל תיגע** בבלוקים של 12 הצירופים ב־`00-tokens.css`.
>
> סיים עם `npm run build` + `npm run lint` ירוקים, והרץ את הסקריפט החדש.
> commit.

---

## Session E — Integrated visual QA + sync check (run last)

> הרץ אחרי ש־A, B, C, D מוזגו חזרה ל־`claude/seasonal-palettes`. אין כאן
> כמעט קוד — זו בדיקה.
>
> - `npm run dev`. עבור על כל 12 הצירופים (בורר עונה × בורר מצב תאורה)
>   בכל אחד מהמסכים: מסך הבית, תרגול "לפי סריג", תרגול "לפי תו" (רשת
>   הסריגים עם עמודות ההתקדמות — המסך הכי רגיש לצבע), מסך התוצאות, ומפות
>   השליטה. השווה מול דף הדיזיין:
>   https://claude.ai/code/artifact/b5ef3f24-2fee-48bc-887b-46e258d962ea
> - רשום כל בעיה (טקסט לא קריא, דגש נבלע, צבע פונקציונלי לא ברור) לקובץ
>   `.kiro/specs/seasonal-palettes/qa-findings.md` עם צירוף + מסך + תיאור.
>   תקן בעצמך רק תיקוני צבע קטנים וברורים; דברים גדולים יותר — החזר ל־A/B.
> - אימות סנכרון: בחר עונה, היכנס עם Google, בדוק ב"סימולציית משתמש" או
>   במכשיר שני שהערך `pref_season` נקלט. אין מיגרציה למסד הנתונים — הבלוב
>   של `user_settings` הוא חופשי.
> - כשהכל תקין: הכן PR ל־`main`. בגוף ה־PR ציין ש־`winter-dark` זהה
>   לברירת המחדל הישנה (אין שינוי למשתמשים קיימים) ושאין צורך במיגרציה.

---

## Merge order

```
A  ─┐
B  ─┼─→ claude/seasonal-palettes ─→ C ─→ D ─→ E ─→ PR to main
```

Merge A then B (same file, disjoint blocks). C and D are independent of
everything. E integrates and ships.
