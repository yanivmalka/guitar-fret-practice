// French (fr) dictionary, keyed by the English source string like `he` in
// translations.ts. Addresses the player as "tu", the usual register for a
// music-practice app. Landing in stages, mirroring Spanish stage 1: the app
// shell, settings, the drawer, the in-game screen, the Selector, Onboarding,
// Stats, the Leaderboard and the plan card. Everything not listed here falls
// back to English until a later stage adds it (see product-wishlist.md).
// French typography: a thin no-break space (U+202F) before ? ! : ; and %.

export const fr: Record<string, string> = {
  // Instrument / title
  'Guitar': 'Guitare',
  'Bass': 'Basse',
  'Fret Practice': 'Entraînement des cases',

  // Instrument picker — roadmap instruments (admin-only "coming soon" tiles)
  'Coming soon': 'Bientôt',
  'Ukulele': 'Ukulélé',
  'Mandolin': 'Mandoline',
  'Banjo': 'Banjo',

  // Settings — section titles / labels / help
  'Instrument': 'Instrument',
  'Playing': 'Jeu',
  'Instruments': 'Instruments',
  'Strings': 'Cordes',
  'Frets': 'Cases',
  'Type': 'Type',
  'Acoustic': 'Acoustique',
  'Electric': 'Électrique',
  'Soprano': 'Soprano',
  'Concert': 'Concert',
  'Tenor': 'Ténor',
  'Baritone': 'Baryton',
  '5-String Standard': '5 cordes · standard',
  '5-String Parlor': '5 cordes · parlor',
  '5-String Long Neck': '5 cordes · manche long',
  '4-String Tenor (Irish, short scale)': '4 cordes · ténor (irlandais, diapason court)',
  '4-String Tenor': '4 cordes · ténor',
  '4-String Plectrum': '4 cordes · plectre',
  '6-String (Guitar-Banjo)': '6 cordes · guitare-banjo',
  'Notes': 'Notes',
  'Switches tuning, string count and fret range, then reloads the note samples.':
    'Change l’accordage, le nombre de cordes et l’étendue des cases, puis recharge les sons des notes.',
  'Note names': 'Noms des notes',
  'Written as': 'Écrites en',
  "Display only — the drill itself doesn't change.":
    'Affichage uniquement — l’exercice ne change pas.',
  'Solfège (Do Re Mi)': 'Solfège (Do Ré Mi)',
  'Letters (A, B, C…) or solfège syllables (Do, Re, Mi…).':
    'Lettres (A, B, C…) ou syllabes de solfège (Do, Ré, Mi…).',
  'A sharp (♯) is a half-step higher; a flat (♭) is a half-step lower. The same pitch can be written either way — C♯ and D♭ are one note. Pick which sign you see.':
    'Un dièse (♯) monte d’un demi-ton ; un bémol (♭) descend d’un demi-ton. La même hauteur peut s’écrire des deux façons — C♯ et D♭ sont une seule note. Choisis le signe que tu veux voir.',
  'A dièse (♯) is a half-step higher; a bémol (♭) is a half-step lower. The same pitch can be written either way — Do♯ and Re♭ are one note. Pick which sign you see.':
    'Un dièse (♯) monte d’un demi-ton ; un bémol (♭) descend d’un demi-ton. La même hauteur peut s’écrire des deux façons — Do♯ et Ré♭ sont une seule note. Choisis le signe que tu veux voir.',
  'Sharps or flats': 'Dièses ou bémols',
  'Sharp (♯)': 'Dièse (♯)',
  'Flat (♭)': 'Bémol (♭)',
  'Dièse (♯)': 'Dièse (♯)',
  'Bémol (♭)': 'Bémol (♭)',
  'Score': 'Score',
  'Score & celebrations': 'Score et célébrations',
  'Live score, streak multiplier and celebrations are shown.':
    'Le score en direct, le multiplicateur de série et les célébrations sont affichés.',
  'Every answer is still recorded to your stats and personal bests either way.':
    'Dans tous les cas, chaque réponse reste enregistrée dans tes statistiques et tes records personnels.',
  'On': 'Activé',
  'Off': 'Désactivé',
  'Silent mode': 'Mode silencieux',
  'Sound & vibration': 'Son et vibration',
  'Sound': 'Son',
  'Vibrate': 'Vibreur',
  'Silent': 'Silencieux',
  'How the drill answers back, on one ladder from quietest to loudest. Silent: no sound and no per-button buzz, just a buzz on right / wrong answers plus the on-screen celebrations. Vibrate: no sound — a buzz on every button press and on right / wrong answers instead. Sound 1–5: note playback, chimes and tap sounds, louder each step; the limiter keeps even the loudest from distorting. Silent and Vibrate are great for practising with headphones off or a guitar in hand.':
    'Comment l’exercice te répond, sur une échelle du plus discret au plus fort. Silencieux : aucun son ni vibration sur les boutons, seulement une vibration sur les bonnes / mauvaises réponses et les célébrations à l’écran. Vibreur : aucun son — une vibration à chaque bouton et sur les bonnes / mauvaises réponses. Son 1–5 : la note jouée, les signaux et les sons de touche, plus forts à chaque niveau ; le limiteur évite toute distorsion, même au plus fort. Silencieux et Vibreur sont parfaits pour t’entraîner sans casque ou la guitare en main.',
  'Theme': 'Thème',
  'Dark': 'Sombre',
  'Night': 'Nuit',
  'Day': 'Jour',
  'Night is a warmer, dimmer palette for a dark room. Day is a light palette.':
    'Nuit est une palette plus chaude et plus douce pour une pièce sombre. Jour est une palette claire.',
  'Appearance': 'Apparence',
  'Theme sets how light or dark the app is: Night is a warmer, dimmer palette for a dark room, Day is a light one. Season sets the colours layered over it — Winter is the original look. Auto follows your clock (Day from 07:00 to 19:00, Night after) and the real season where you are; picking a season by hand holds until that season ends.':
    'Le thème règle la luminosité de l’app : Nuit est une palette plus chaude et plus douce pour une pièce sombre, Jour est une palette claire. La saison règle les couleurs appliquées par-dessus — Hiver est l’apparence d’origine. Auto suit ton horloge (Jour de 07:00 à 19:00, Nuit ensuite) et la vraie saison là où tu es ; une saison choisie à la main reste active jusqu’à la fin de cette saison.',
  'Season': 'Saison',
  'Winter': 'Hiver',
  'Spring': 'Printemps',
  'Summer': 'Été',
  'Autumn': 'Automne',
  'A seasonal colour palette layered over the theme. Winter is the original look.':
    'Une palette de couleurs de saison appliquée sur le thème. Hiver est l’apparence d’origine.',
  'Mastery on the fretboard': 'Maîtrise sur le manche',
  'The per-note / per-fret accuracy bars drawn over the circle and grid while stopped or paused.':
    'Les barres de précision par note / par case affichées sur le cercle et la grille à l’arrêt ou en pause.',
  'Mastery keeps being tracked and shows on the Stats screen either way.':
    'La maîtrise reste suivie et s’affiche dans les statistiques dans tous les cas.',
  'Questions counted': 'Questions prises en compte',
  'How many of your most recent questions the mastery bars are computed from. Free accounts use the last 250.':
    'Le nombre de tes questions les plus récentes utilisées pour calculer les barres de maîtrise. Les comptes gratuits utilisent les 250 dernières.',
  'Choose how many recent questions the mastery bars are counted from':
    'Choisis combien de questions récentes servent à calculer les barres de maîtrise',
  'Mastery time window': 'Période de maîtrise',
  'Point the mastery bars at a recent-question count, a single day, or a date range':
    'Calcule les barres de maîtrise sur un nombre de questions récentes, un seul jour ou une plage de dates',
  'What slice of your history the mastery bars are computed from. Free accounts use the last 250 questions. Older history saved without a date is not counted for a specific day or range.':
    'La partie de ton historique utilisée pour calculer les barres de maîtrise. Les comptes gratuits utilisent les 250 dernières questions. L’ancien historique enregistré sans date n’est pas compté pour un jour ou une plage précise.',
  'Recent': 'Récentes',
  'A day': 'Un jour',
  'A range': 'Une plage',
  'From': 'Du',
  'To': 'Au',
  'showing': 'affichage',
  'showing last': 'affichage des',
  'showing all questions': 'affichage de toutes les questions',
  'All': 'Tout',
  'Stats & progress': 'Statistiques et progrès',
  'Answer mode': 'Mode de réponse',
  'How you answer': 'Comment tu réponds',
  'Voice mode asks for microphone permission the first time.':
    'Le mode voix demande l’accès au micro la première fois.',
  'Speak clearly and pause briefly between words — for sharp/flat notes, say the letter, pause, then “sharp” / “flat” as two separate words.':
    'Parle clairement et marque une courte pause entre les mots — pour les notes avec dièse/bémol, dis la lettre, fais une pause, puis « sharp » / « flat » en deux mots séparés.',
  'Tap': 'Toucher',
  'Voice': 'Voix',
  'Admin-only experiment: play the target note on your guitar instead of tapping. Only works for “by fret” questions — a played note can’t say which string it came from, so “by note” questions stay on tap.':
    'Expérience réservée aux administrateurs : joue la note demandée sur ta guitare au lieu de toucher l’écran. Fonctionne uniquement pour les questions « par case » — une note jouée ne dit pas de quelle corde elle vient, donc les questions « par note » restent au toucher.',
  '🎸 Microphone blocked — enable it or switch to tap': '🎸 Micro bloqué — active-le ou passe au toucher',
  '🎸 Pitch detection isn’t available on this device — use tap': '🎸 La détection de hauteur n’est pas disponible sur cet appareil — utilise le toucher',
  '🎸 Didn’t catch that': '🎸 Pas compris',
  '🎸 Play the note on your guitar': '🎸 Joue la note sur ta guitare',
  'Voice engine': 'Moteur vocal',
  'Auto picks the best available. Personal uses your calibrated profile; General uses the built-in model.':
    'Auto choisit le meilleur disponible. Personnel utilise ton profil calibré ; Général utilise le modèle intégré.',
  'Auto': 'Auto',
  'Personal': 'Personnel',
  'General': 'Général',
  'Your voice profile': 'Ton profil vocal',
  'Calibrating your own voice improves recognition when answering by voice.':
    'Calibrer ta propre voix améliore la reconnaissance quand tu réponds à la voix.',
  'recordings': 'enregistrements',
  'enabled': 'activé',
  'Add / review recordings': 'Ajouter / revoir les enregistrements',
  'Calibrate my voice': 'Calibrer ma voix',
  'Feedback board': 'Boîte à idées',
  'Leaderboard': 'Classement',
  'Account': 'Compte',
  'Signed in': 'Connecté',
  'Keeps your preferences and data in sync across devices.':
    'Synchronise tes préférences et tes données entre tes appareils.',
  'Sign out': 'Se déconnecter',
  'Sign in with Google to keep your preferences and data across devices.':
    'Connecte-toi avec Google pour retrouver tes préférences et tes données sur tous tes appareils.',
  'Sign in with Google': 'Se connecter avec Google',

  // Account → About tile + live community counts
  'About': 'À propos',
  'Guitar Fret Practice is a small labor of love — built to turn learning the fretboard into a game instead of a chore. Made by an independent developer, with patient help from family and friends.':
    'Guitar Fret Practice est un petit projet fait avec passion — pensé pour transformer l’apprentissage du manche en jeu plutôt qu’en corvée. Créé par un développeur indépendant, avec l’aide patiente de sa famille et de ses amis.',
  'Registered users': 'Utilisateurs inscrits',
  'Active now': 'Actifs maintenant',
  'Guests online': 'Invités en ligne',
  'See the full list and what earns each one': 'Voir la liste complète et comment obtenir chacun',
  'Badges': 'Badges',
  'Language': 'Langue',
  'Left-handed': 'Gaucher',
  'Button depth': 'Relief des boutons',
  'Gives the buttons a raised, 3D look: a light rim on top, a solid edge underneath, and they sink a little when pressed. Off keeps them flat.':
    'Donne aux boutons un aspect en relief, en 3D : un liseré clair en haut, un bord plein en dessous, et ils s’enfoncent un peu quand on appuie. Désactivé les garde plats.',
  'Mirrors the app for a left-handed player: the fretboard flips (nut on the right), and the menu, Quick Access and back buttons move to the left. Independent of language — it stays mirrored in Hebrew too.':
    'Inverse l’app pour les gauchers : le manche se retourne (sillet à droite) et le menu, l’Accès rapide et les boutons retour passent à gauche. Indépendant de la langue — l’inversion reste aussi en hébreu.',
  'Colour-blind heatmap markers': 'Repères de la carte de chaleur pour daltoniens',
  'Adds a ✓ / • mark on the Stats-screen fretboard heatmap cells, on top of colour, so known vs. needs-work reads without relying on hue.':
    'Ajoute une marque ✓ / • sur les cases de la carte de chaleur du manche dans les statistiques, en plus de la couleur, pour distinguer l’acquis de ce qui est à travailler sans dépendre de la teinte.',

  // Hamburger drawer / dialogs
  'Settings': 'Réglages',
  'Close settings': 'Fermer les réglages',
  'Open settings': 'Ouvrir les réglages',
  'Game settings': 'Réglages du jeu',
  'Back': 'Retour',
  'Microphone access': 'Accès au micro',
  'Answer out loud': 'Réponds à voix haute',
  'Voice mode listens for the note or fret you say instead of a tap.':
    'Le mode voix écoute la note ou la case que tu prononces, au lieu d’un toucher.',
  'Your browser will ask to use the microphone next — audio stays on your device and is never recorded or uploaded.':
    'Ton navigateur va ensuite demander l’accès au micro — le son reste sur ton appareil et n’est jamais enregistré ni envoyé.',
  'Allow microphone': 'Autoriser le micro',
  'Not now': 'Pas maintenant',
  'Microphone is blocked': 'Le micro est bloqué',
  "Your browser is refusing microphone access for this site, so voice answers can't work yet. Tap the 🔒 / 🎤 icon beside the address bar, set the microphone to":
    'Ton navigateur refuse l’accès au micro pour ce site, donc les réponses vocales ne fonctionnent pas encore. Touche l’icône 🔒 / 🎤 à côté de la barre d’adresse et règle le micro sur',
  ', then reload the page.': ', puis recharge la page.',
  'Allow': 'Autoriser',
  'Got it': 'Compris',
  'Use tap instead': 'Utiliser le toucher',
  'Sign in': 'Se connecter',
  'Save your progress': 'Sauvegarde ta progression',
  'Sign in to keep your history, badges and personal bests across devices. You can keep playing as a guest — everything still works, it just stays on this device.':
    'Connecte-toi pour garder ton historique, tes badges et tes records personnels sur tous tes appareils. Tu peux continuer en invité — tout fonctionne pareil, mais reste sur cet appareil.',
  'Maybe later': 'Plus tard',
  'Press back again to exit': 'Appuie encore sur retour pour quitter',

  // In-game
  'STAGE COMPLETE': 'NIVEAU TERMINÉ',
  'Retry': 'Réessayer',
  '🎤 Microphone blocked — enable it or switch to tap': '🎤 Micro bloqué — active-le ou passe au toucher',
  '🎤 Voice needs a connection': '🎤 La voix nécessite une connexion',
  '🎤 Voice isn’t working in this browser — try Chrome, or use tap':
    '🎤 La voix ne fonctionne pas dans ce navigateur — essaie Chrome ou utilise le toucher',
  '🎤 Didn’t catch that': '🎤 Pas compris',
  'Round Complete!': 'Manche terminée !',
  'pts': 'pts',
  'OK': 'OK',
  'Start': 'Commencer',
  'Resume': 'Reprendre',
  'Pause': 'Pause',
  'Stop': 'Arrêter',
  'Refresh': 'Actualiser',
  'Privacy policy': 'Politique de confidentialité',

  'QUESTIONS': 'QUESTIONS',
  'streak': 'série',
  'New badge': 'Nouveau badge',
  'Badge upgraded': 'Badge amélioré',
  'Continue': 'Continuer',
  'Listening…': 'À l’écoute…',
  'Member since': 'Membre depuis',
  'badges earned': 'badges obtenus',

  // Pinned badge shelf (Account section)
  'Choose badges to feature': 'Choisis les badges à mettre en avant',
  'Edit featured badges': 'Modifier les badges en vedette',
  'Your badges': 'Tes badges',
  'Feature up to 5 badges': 'Mets en avant jusqu’à 5 badges',
  'Remove a badge to feature another.': 'Retire un badge pour en mettre un autre en avant.',
  'See all badges': 'Voir tous les badges',

  // LeaderboardPanel — standings sub-page
  'player': 'joueur',
  'players': 'joueurs',
  'ranked by XP': 'classés par XP',
  'free for everyone': 'gratuit pour tous',
  'All-time': 'Depuis le début',
  'This week': 'Cette semaine',
  'Loading…': 'Chargement…',
  'Couldn’t load the leaderboard. Check your connection and try again.':
    'Impossible de charger le classement. Vérifie ta connexion et réessaie.',
  'Couldn’t update that. Check your connection and try again.':
    'Impossible de mettre à jour. Vérifie ta connexion et réessaie.',
  'Your standing': 'Ta position',
  'RANK': 'RANG',
  'acc': 'préc.',
  '(you)': '(toi)',
  'Hidden from the leaderboard': 'Masqué du classement',
  'Visible on the leaderboard': 'Visible dans le classement',
  'Join the board': 'Rejoins le classement',
  'You can see every player’s standing right now. Sign in with Google to take your own place — every correct answer you’ve ever played counts. Free, no subscription.':
    'Tu peux déjà voir la position de chaque joueur. Connecte-toi avec Google pour prendre ta place — chaque bonne réponse que tu as donnée compte. Gratuit, sans abonnement.',
  'No one’s on the board yet': 'Personne n’est encore au classement',
  'Finish a practice run while signed in and your name lands here first.':
    'Termine une session d’entraînement en étant connecté et ton nom apparaîtra ici en premier.',
  'How is XP counted?': 'Comment l’XP est-elle comptée ?',

  // SelectorPanel — mode/difficulty/fret-range picker
  'all': 'toutes les',
  'strings': 'cordes',
  'frets': 'cases',
  'only the dot-marker frets': 'uniquement les cases à repère',
  'natural notes only (no sharps or flats)': 'notes naturelles uniquement (sans dièses ni bémols)',
  'every note, sharps and flats included': 'toutes les notes, dièses et bémols compris',
  'alphabetical order': 'ordre alphabétique',
  'circle-of-fifths order': 'ordre du cycle des quintes',
  'A fret lights up and you pick its note from the wheel':
    'Une case s’allume et tu choisis sa note sur la roue',
  ', rotated to the string': ', tournée selon la corde',
  'A note name is shown and you tap every fret on the neck where it lands.':
    'Un nom de note s’affiche et tu touches chaque case du manche où elle se trouve.',
  'Note-by-Fret': 'Note par case',
  'Fret-by-Note': 'Case par note',
  'Auto-advances through the difficulty stages.': 'Passe automatiquement d’un niveau de difficulté à l’autre.',
  'How this works': 'Comment ça marche',
  'neck': 'manche',
  'neck fret range selector': 'sélecteur de l’étendue des cases du manche',
  'Precise fret range': 'Étendue de cases précise',
  'Pick an exact fret N–M window to drill': 'Choisis une étendue exacte de cases N–M à travailler',
  'Fret range': 'Étendue des cases',
  'Full only while a precise fret window is on': 'Complet uniquement tant qu’une étendue de cases précise est active',
  'Drill only part of the neck. Drag the handles to set the exact fret window — the shaded area is muted out, both here and on the home-screen neck.':
    'Travaille seulement une partie du manche. Fais glisser les poignées pour fixer l’étendue exacte des cases — la zone grisée est exclue, ici comme sur le manche de l’écran d’accueil.',
  'Lowest fret': 'Case la plus basse',
  'Highest fret': 'Case la plus haute',
  'Multi': 'Multi',
  'Note by Fret': 'Note par case',
  'Alpha': 'Alphabétique',
  'Fifths': 'Quintes',
  'By String': 'Par corde',
  'Fret by Note': 'Case par note',
  "Read the note wheel like a clock: your open string sits at 12 o'clock, and the dots under each note show its fret. Answer before the timing bar empties.":
    'Lis la roue des notes comme une horloge : ta corde à vide est à midi, et les points sous chaque note indiquent sa case. Réponds avant que la barre de temps se vide.',
  'Answer before the timing bar empties.': 'Réponds avant que la barre de temps se vide.',
  'Dots': 'Repères',
  'Naturals': 'Naturelles',
  'Full': 'Complet',
  'Auto Advance to next difficulty': 'Passage automatique à la difficulté suivante',

  // Onboarding
  'Guitar Fret Practice': 'Guitar Fret Practice',
  'Master the fretboard with the clock method — one string at a time.':
    'Maîtrise le manche avec la méthode de l’horloge — une corde à la fois.',
  'What do you play?': 'De quoi joues-tu ?',
  'Skip setup →': 'Passer la configuration →',
  'How well do you know the fretboard?': 'Connais-tu bien le manche ?',
  "I'm just starting": 'Je débute',
  'Start with dot frets on String 6': 'Commence par les cases à repère sur la corde 6',
  'I play but want to improve': 'Je joue mais je veux progresser',
  'Quick 3-question test': 'Test rapide en 3 questions',
  'I know the full neck': 'Je connais tout le manche',
  'Jump right in': 'Commencer directement',
  'Skip →': 'Passer →',
  'String': 'Corde',
  'what note is fret': 'quelle note est la case',
  'Skip test →': 'Passer le test →',
  'Keep going!': 'Continue !',
  'Good start!': 'Bon début !',
  'Nice work!': 'Bien joué !',
  'Impressive!': 'Impressionnant !',
  'Dot Frets': 'Cases à repère',
  'Natural notes': 'Notes naturelles',
  'the full chromatic neck': 'tout le manche chromatique',
  "correct — we've set you up on": 'justes — on t’a configuré sur',
  'Change it anytime in the selector panel.': 'Tu peux le changer à tout moment dans le panneau de sélection.',
  "Let's go →": 'C’est parti →',

  // ProgressPanel — stats & progress screen
  'by note': 'par note',
  'by fret': 'par case',
  'fret': 'case',
  'not played': 'pas jouée',
  'known': 'acquise',
  'needs work': 'à travailler',
  'unplayed': 'pas jouée',
  'Not enough data yet.': 'Pas encore assez de données.',
  'Not practiced yet': 'Pas encore travaillé',
  'Older sessions have no date stamp, so the timeline is empty. New sessions fill it in.':
    'Les anciennes sessions n’ont pas de date, donc la chronologie est vide. Les nouvelles sessions la rempliront.',
  'Play a few rounds and your all-time progress shows up here.':
    'Joue quelques manches et ta progression globale apparaîtra ici.',
  'accuracy': 'précision',
  'day streak': 'jours d’affilée',
  'answered': 'répondues',
  'Weakest notes': 'Notes les plus faibles',
  'Nothing below 70% — nice.': 'Rien sous 70 % — bravo.',
  'By note': 'Par note',
  'By string': 'Par corde',
  'By fret': 'Par case',
  'Fretboard heatmap': 'Carte de chaleur du manche',
  'Daily timeline': 'Chronologie quotidienne',
  'Accuracy %': 'Précision (%)',
  'Avg response time': 'Temps de réponse moyen',
  'Personal bests': 'Records personnels',
  'No personal bests recorded yet.': 'Aucun record personnel pour l’instant.',
  'No practice in the last 7 days.': 'Aucun entraînement ces 7 derniers jours.',
  'All time': 'Depuis le début',
  'Last 7 days': '7 derniers jours',
  'across every': 'sur toutes les',
  'settings combination': 'combinaisons de réglages',
  'Clear all history': 'Effacer tout l’historique',
  'Clear all stats?': 'Effacer toutes les statistiques ?',
  'This permanently erases your entire practice history and resets the all-time mastery for every note, string and settings combination. Your personal bests are kept.':
    'Cela efface définitivement tout ton historique d’entraînement et remet à zéro la maîtrise globale de chaque note, corde et combinaison de réglages. Tes records personnels sont conservés.',
  "This can't be undone.": 'Action irréversible.',
  'Delete anyway': 'Effacer quand même',
  'Cancel': 'Annuler',

  // Instrument string labels (guitar + bass, "String N · note")
  'String 1 · high E': 'Corde 1 · Mi aigu',
  'String 2 · B': 'Corde 2 · Si',
  'String 3 · G': 'Corde 3 · Sol',
  'String 4 · D': 'Corde 4 · Ré',
  'String 5 · A': 'Corde 5 · La',
  'String 6 · low E': 'Corde 6 · Mi grave',
  'String 1 · G': 'Corde 1 · Sol',
  'String 2 · D': 'Corde 2 · Ré',
  'String 3 · A': 'Corde 3 · La',
  'String 4 · low E': 'Corde 4 · Mi grave',

  // Free / Pro / Premium tiering — ProGate lock states + the Upgrade card
  'Premium': 'Premium',
  // Free-tier ad strip
  'Advertisement': 'Publicité',
  'Ad': 'Pub',
  'Close ad': 'Fermer la publicité',
  'Your ad could be here. Go Pro to remove ads.': 'Ta publicité pourrait être ici. Passe à Pro pour supprimer les publicités.',
  'Unlock with Pro': 'Débloquer avec Pro',
  'Unlock with Premium': 'Débloquer avec Premium',
  'You have Pro': 'Tu as Pro',
  "You're on Free": 'Tu es en formule gratuite',
  'Your plan': 'Ta formule',
  'Included with Pro': 'Inclus avec Pro',
  'Everything in Free, plus:': 'Tout ce qu’offre la formule gratuite, plus :',
  'Everything you need to practice daily, at no cost.':
    'Tout ce qu’il faut pour t’entraîner chaque jour, gratuitement.',
  'The full fretboard drill — by note and by fret, on every string':
    'L’exercice complet du manche — par note et par case, sur toutes les cordes',
  'Badges and achievements, with your pinned medal shelf':
    'Badges et succès, avec ta vitrine de médailles',
  'The leaderboard — XP, questions answered and accuracy':
    'Le classement — XP, questions répondues et précision',
  'Cloud sync and full restore of your practice on every device':
    'Synchronisation dans le cloud et restauration complète de ton entraînement sur tous tes appareils',
  'Your last 7 days of stats, plus the personal best for what you’re drilling':
    'Tes statistiques des 7 derniers jours, plus le record personnel de ce que tu travailles',
  'Free, forever': 'Gratuit, pour toujours',
  'Pro is for training seriously and tracking progress over time.':
    'Pro, c’est pour s’entraîner sérieusement et suivre ses progrès dans le temps.',
  'Your full practice history — all-time stats and trends, not just the last 7 days':
    'Tout ton historique d’entraînement — statistiques et tendances depuis le début, pas seulement les 7 derniers jours',
  'Mastery maps — per-note and per-fret accuracy overlays on the circle and grid':
    'Cartes de maîtrise — précision par note et par case sur le cercle et la grille',
  'Browse your personal bests across every settings combination':
    'Consulte tes records personnels pour chaque combinaison de réglages',
  'A personal voice profile built from your own calibration recordings':
    'Un profil vocal personnel créé à partir de tes propres enregistrements de calibration',
  'Your Pro access is complimentary.': 'Ton accès Pro est offert.',
  'Your Pro access came from a promotion.': 'Ton accès Pro provient d’une promotion.',
  'Your Pro access was granted manually.': 'Ton accès Pro a été accordé manuellement.',
  'Your Pro access is from your subscription.': 'Ton accès Pro provient de ton abonnement.',
  'Your Pro access is active.': 'Ton accès Pro est actif.',
  'It does not expire.': 'Il n’expire pas.',
  'Access runs until': 'Accès valable jusqu’au',
  'Pro isn’t on sale yet — everything above stays free to try in the meantime.':
    'Pro n’est pas encore en vente — en attendant, tout ce qui précède reste gratuit à essayer.',
  'Free': 'Gratuit',

  // Adaptive difficulty suggestion banner (wishlist §3)
  'You’re cruising through this — ready for a harder level?':
    'Tu files à toute allure — prêt pour un niveau plus difficile ?',
  'This setup is fighting back. Want to ease off a level?':
    'Cette configuration te résiste. Tu veux descendre d’un niveau ?',
  'Switch the difficulty to': 'Passer la difficulté à',
  'Drop the difficulty to': 'Baisser la difficulté à',
  'Apply': 'Appliquer',
  'Dismiss': 'Ignorer',

  // Learning-type navigation — the drawer's "Learn" group and its full pages
  'Learn': 'Apprendre',
  'Choose what to practise.': 'Choisis ce que tu veux travailler.',
  'Current': 'Actuel',
  'Daily practice': 'Entraînement quotidien',
  'Intervals': 'Intervalles',
  'Scales': 'Gammes',
  'Chords': 'Accords',
  'Staff reading': 'Lecture de partition',
  'Game': 'Jeu',
  'Your daily plan is loading…': 'Chargement de ton programme du jour…',
  'Let the Teacher plan your practice': 'Laisse le Professeur planifier ton entraînement',
  'Practise hearing and finding intervals': 'Entraîne-toi à entendre et à trouver les intervalles',

  // Fret range conflict dialog
  'Fret range too small': 'Étendue de cases trop petite',
  'The current fret range': 'L’étendue de cases actuelle',
  ' allows fewer than ': ' permet moins de ',
  ' unique notes': ' notes différentes',
  ' with the selected strings. Please expand the range.': ' avec les cordes choisies. Élargis l’étendue.',
  'Expand to minimum': 'Élargir au minimum',
  'I will expand': 'Je vais l’élargir',
  'Custom range': 'Étendue personnalisée',
  'Keep as is': 'Laisser tel quel',
  'Set fret range': 'Définir l’étendue des cases',

  // ── Stage 2a: badges, guest merge, voice calibration, feedback board,
  // quick access and the tuner ──────────────────────────────────────────
  // Badges / Achievements wall — tiers
  'Bronze': 'Bronze',
  'Silver': 'Argent',
  'Gold': 'Or',
  'Platinum': 'Platine',
  'Diamond': 'Diamant',
  'Master': 'Maître',
  'Legendary I': 'Légendaire I',
  'Legendary II': 'Légendaire II',
  'Legendary III': 'Légendaire III',
  'Legendary IV': 'Légendaire IV',
  // Wall chrome
  'unlocked': 'débloqués',
  'Max': 'Max',
  'Earned': 'Obtenu',
  // Admin test controls
  'Grant': 'Accorder',
  'Reset': 'Réinitialiser',
  'Admin tools: Grant or Reset each badge to test it. History-based badges re-appear on reopen unless you also clear history.':
    'Outils d’administration : accorde ou réinitialise chaque badge pour le tester. Les badges basés sur l’historique réapparaissent à la réouverture, sauf si tu effaces aussi l’historique.',
  // Family names
  'Perfect Session': 'Session parfaite',
  'Speed Demon': 'Démon de la vitesse',
  'Flawless Sprint': 'Sprint impeccable',
  'On Fire': 'En feu',
  'Comeback': 'Retour en force',
  'Every String': 'Toutes les cordes',
  'String Master': 'Maître de la corde',
  'String Master · {s}': 'Maître · {s}',
  'Full String Master': 'Maître de toutes les cordes',
  'Neck Runner': 'Coureur du manche',
  'Both Ends': 'Les deux bouts',
  'Low End': 'Registre grave',
  'Week Warrior': 'Guerrier de la semaine',
  'Dedicated': 'Assidu',
  'Total Reps': 'Répétitions totales',
  'Sharpshooter': 'Tireur d’élite',
  'Quick Read': 'Lecture rapide',
  'Most Improved': 'Meilleure progression',
  'Doubling Up': 'Coup double',
  'Multi-Instrumentalist': 'Multi-instrumentiste',
  'Admin': 'Administrateur',
  // Earning conditions — Perfect Session
  'Answer 10+ questions in a round with no mistakes at all.':
    'Réponds à 10+ questions dans une manche sans aucune erreur.',
  '25+ questions in a round, still zero mistakes.': '25+ questions dans une manche, toujours zéro erreur.',
  '50+ questions in a round, still zero mistakes — a full clean run.':
    '50+ questions dans une manche, toujours zéro erreur — un sans-faute complet.',
  // Speed Demon
  'Get 10+ correct answers in a round, at least 8 of them under 1.5s.':
    'Donne 10+ bonnes réponses dans une manche, dont au moins 8 en moins de 1,5 s.',
  '20+ correct answers, at least 16 of them under 1.5s.':
    '20+ bonnes réponses, dont au moins 16 en moins de 1,5 s.',
  '40+ correct answers, at least 32 of them under 1.2s.':
    '40+ bonnes réponses, dont au moins 32 en moins de 1,2 s.',
  // Flawless Sprint
  'Finish a whole round at 90% accuracy or better.':
    'Termine une manche entière avec 90 % de précision ou plus.',
  'Finish a whole round at 95% accuracy or better.':
    'Termine une manche entière avec 95 % de précision ou plus.',
  'Finish a whole round at 100% accuracy.': 'Termine une manche entière avec 100 % de précision.',
  // On Fire
  'Reach a streak of 15 in a single round.': 'Atteins une série de 15 dans une seule manche.',
  'Reach a streak of 20 in a single round.': 'Atteins une série de 20 dans une seule manche.',
  'Reach a streak of 30 in a single round.': 'Atteins une série de 30 dans une seule manche.',
  // Comeback
  'Miss 3+ of your first 20 questions, then answer the next 8 in a row correctly.':
    'Rate 3+ de tes 20 premières questions, puis réponds juste aux 8 suivantes d’affilée.',
  'Miss 5+ of your first 20 questions, then answer the next 12 in a row correctly.':
    'Rate 5+ de tes 20 premières questions, puis réponds juste aux 12 suivantes d’affilée.',
  'Miss 8+ of your first 20 questions, then answer the next 18 in a row correctly.':
    'Rate 8+ de tes 20 premières questions, puis réponds juste aux 18 suivantes d’affilée.',
  // Every String
  'Finish a round that visited every string: 2x that many questions, 90% accuracy.':
    'Termine une manche qui passe par toutes les cordes : deux fois plus de questions que de cordes, 90 % de précision.',
  'Visited every string: 4x that many questions, 90% accuracy.':
    'En passant par toutes les cordes : 4 fois plus de questions que de cordes, 90 % de précision.',
  'Visited every string: 6x that many questions, 95% accuracy.':
    'En passant par toutes les cordes : 6 fois plus de questions que de cordes, 95 % de précision.',
  // Per-string String Master — {s} is the translated string label
  'Answer 40+ questions on {s} at 90% accuracy or better.':
    'Réponds à 40+ questions sur {s} avec 90 % de précision ou plus.',
  '100+ questions on {s} at 92% accuracy or better.':
    '100+ questions sur {s} avec 92 % de précision ou plus.',
  '200+ questions on {s} at 95% accuracy or better.':
    '200+ questions sur {s} avec 95 % de précision ou plus.',
  '400+ questions on {s} at 96% accuracy or better, over 14+ practice days.':
    '400+ questions sur {s} avec 96 % de précision ou plus, sur 14+ jours de pratique.',
  '800+ questions on {s} at 97% accuracy or better, over 30+ practice days.':
    '800+ questions sur {s} avec 97 % de précision ou plus, sur 30+ jours de pratique.',
  // Full String Master
  'Earn String Master — Bronze on every string of this instrument.':
    'Obtiens Maître de la corde — Bronze sur toutes les cordes de cet instrument.',
  'Earn String Master — Silver on every string.':
    'Obtiens Maître de la corde — Argent sur toutes les cordes.',
  'Earn String Master — Gold on every string.': 'Obtiens Maître de la corde — Or sur toutes les cordes.',
  'Earn String Master — Platinum on every string.':
    'Obtiens Maître de la corde — Platine sur toutes les cordes.',
  'Earn String Master — Diamond on every string.':
    'Obtiens Maître de la corde — Diamant sur toutes les cordes.',
  // Neck Runner
  'Answer at least one question on every fret of the neck.':
    'Réponds à au moins une question sur chaque case du manche.',
  'Answer at least 3 questions on every fret of the neck.':
    'Réponds à au moins 3 questions sur chaque case du manche.',
  'Answer at least 5 questions on every fret of the neck.':
    'Réponds à au moins 5 questions sur chaque case du manche.',
  'Answer at least 10 questions on every fret, spread across 14+ practice days.':
    'Réponds à au moins 10 questions sur chaque case, réparties sur 14+ jours de pratique.',
  'Answer at least 20 questions on every fret, spread across 30+ practice days.':
    'Réponds à au moins 20 questions sur chaque case, réparties sur 30+ jours de pratique.',
  // Both Ends
  'Answer 40+ questions above the 12th fret at 85% accuracy or better.':
    'Réponds à 40+ questions au-delà de la case 12 avec 85 % de précision ou plus.',
  '100+ questions above the 12th fret at 88% accuracy or better.':
    '100+ questions au-delà de la case 12 avec 88 % de précision ou plus.',
  '200+ questions above the 12th fret at 92% accuracy or better.':
    '200+ questions au-delà de la case 12 avec 92 % de précision ou plus.',
  '400+ questions above the 12th fret at 93% accuracy or better, over 14+ practice days.':
    '400+ questions au-delà de la case 12 avec 93 % de précision ou plus, sur 14+ jours de pratique.',
  '800+ questions above the 12th fret at 94% accuracy or better, over 30+ practice days.':
    '800+ questions au-delà de la case 12 avec 94 % de précision ou plus, sur 30+ jours de pratique.',
  // Low End
  'Answer 40+ questions on the bass low-E string at 90% accuracy or better.':
    'Réponds à 40+ questions sur la corde de mi (E) grave de la basse avec 90 % de précision ou plus.',
  '100+ questions on the low-E string at 93% accuracy or better.':
    '100+ questions sur la corde de mi (E) grave avec 93 % de précision ou plus.',
  '200+ questions on the low-E string at 96% accuracy or better.':
    '200+ questions sur la corde de mi (E) grave avec 96 % de précision ou plus.',
  '400+ questions on the low-E string at 97% accuracy or better, over 14+ practice days.':
    '400+ questions sur la corde de mi (E) grave avec 97 % de précision ou plus, sur 14+ jours de pratique.',
  '800+ questions on the low-E string at 98% accuracy or better, over 30+ practice days.':
    '800+ questions sur la corde de mi (E) grave avec 98 % de précision ou plus, sur 30+ jours de pratique.',
  // Week Warrior
  'Practise on 5 separate days within a single 7-day window.':
    'Pratique 5 jours différents sur une même période de 7 jours.',
  '6 separate days within a single 7-day window.': '6 jours différents sur une même période de 7 jours.',
  'All 7 days within a single 7-day window — a perfect week.':
    'Les 7 jours d’une même période de 7 jours — une semaine parfaite.',
  // Dedicated
  'Build a run of 7 consecutive practice days.': 'Enchaîne 7 jours de pratique consécutifs.',
  '14 consecutive practice days.': '14 jours de pratique consécutifs.',
  '30 consecutive practice days.': '30 jours de pratique consécutifs.',
  '60 consecutive practice days.': '60 jours de pratique consécutifs.',
  '90 consecutive practice days.': '90 jours de pratique consécutifs.',
  '120 consecutive practice days.': '120 jours de pratique consécutifs.',
  '180 consecutive practice days.': '180 jours de pratique consécutifs.',
  '250 consecutive practice days.': '250 jours de pratique consécutifs.',
  '300 consecutive practice days.': '300 jours de pratique consécutifs.',
  '365 consecutive practice days — a full year, every day.':
    '365 jours de pratique consécutifs — une année entière, chaque jour.',
  // Total Reps
  'Answer 100 questions all-time, across every instrument.':
    'Réponds à 100 questions au total, tous instruments confondus.',
  '250 questions all-time.': '250 questions au total.',
  '500 questions all-time.': '500 questions au total.',
  '1,000 questions all-time.': '1 000 questions au total.',
  '2,500 questions all-time, spread across 20+ practice days.':
    '2 500 questions au total, réparties sur 20+ jours de pratique.',
  '5,000 questions all-time, spread across 40+ practice days.':
    '5 000 questions au total, réparties sur 40+ jours de pratique.',
  '10,000 questions all-time, spread across 70+ practice days.':
    '10 000 questions au total, réparties sur 70+ jours de pratique.',
  '20,000 questions all-time, spread across 110+ practice days.':
    '20 000 questions au total, réparties sur 110+ jours de pratique.',
  '35,000 questions all-time, spread across 160+ practice days.':
    '35 000 questions au total, réparties sur 160+ jours de pratique.',
  '50,000 questions all-time, spread across 220+ practice days.':
    '50 000 questions au total, réparties sur 220+ jours de pratique.',
  // Sharpshooter
  'Hold 85% accuracy over at least 200 questions, across every instrument.':
    'Garde 85 % de précision sur au moins 200 questions, tous instruments confondus.',
  '88% accuracy over at least 500 questions.': '88 % de précision sur au moins 500 questions.',
  '92% accuracy over at least 1,000 questions.': '92 % de précision sur au moins 1 000 questions.',
  '93% accuracy over at least 2,500 questions, spread across 30+ practice days.':
    '93 % de précision sur au moins 2 500 questions, réparties sur 30+ jours de pratique.',
  '94% accuracy over at least 5,000 questions, spread across 60+ practice days.':
    '94 % de précision sur au moins 5 000 questions, réparties sur 60+ jours de pratique.',
  // Quick Read
  'Hold an average answer time under 2.0s over 200+ questions.':
    'Garde un temps de réponse moyen sous 2,0 s sur 200+ questions.',
  'Under 1.6s over 500+ questions.': 'Sous 1,6 s sur 500+ questions.',
  'Under 1.3s over 1,000+ questions.': 'Sous 1,3 s sur 1 000+ questions.',
  'Under 1.15s over 2,500+ questions, spread across 30+ practice days.':
    'Sous 1,15 s sur 2 500+ questions, réparties sur 30+ jours de pratique.',
  'Under 1.05s over 5,000+ questions, spread across 60+ practice days.':
    'Sous 1,05 s sur 5 000+ questions, réparties sur 60+ jours de pratique.',
  // Most Improved
  'Over 10+ practice days, lift your accuracy by 20 points from your first days to your latest.':
    'Sur 10+ jours de pratique, gagne 20 points de précision entre tes premiers jours et les plus récents.',
  'Over 15+ practice days, lift your accuracy by 30 points.':
    'Sur 15+ jours de pratique, gagne 30 points de précision.',
  'Over 20+ practice days, lift your accuracy by 40 points.':
    'Sur 20+ jours de pratique, gagne 40 points de précision.',
  // Doubling Up
  'Earn String Master on every string of both guitar and bass.':
    'Obtiens Maître de la corde sur toutes les cordes, à la guitare comme à la basse.',
  'Earn Full String Master — Silver on both guitar and bass.':
    'Obtiens Maître de toutes les cordes — Argent, à la guitare comme à la basse.',
  'Earn Full String Master — Gold and Neck Runner — Gold on both guitar and bass.':
    'Obtiens Maître de toutes les cordes — Or et Coureur du manche — Or, à la guitare comme à la basse.',
  'Earn Full String Master — Platinum and Neck Runner — Platinum on both guitar and bass.':
    'Obtiens Maître de toutes les cordes — Platine et Coureur du manche — Platine, à la guitare comme à la basse.',
  'Earn Full String Master — Diamond and Neck Runner — Diamond on both guitar and bass.':
    'Obtiens Maître de toutes les cordes — Diamant et Coureur du manche — Diamant, à la guitare comme à la basse.',
  // Multi-Instrumentalist
  'Earn Full String Master — Silver on 2 different instruments.':
    'Obtiens Maître de toutes les cordes — Argent sur 2 instruments différents.',
  'Earn Full String Master — Silver on 3 different instruments.':
    'Obtiens Maître de toutes les cordes — Argent sur 3 instruments différents.',
  'Earn Full String Master — Gold on 4 different instruments.':
    'Obtiens Maître de toutes les cordes — Or sur 4 instruments différents.',
  'Earn Full String Master — Gold on all 5 instruments.':
    'Obtiens Maître de toutes les cordes — Or sur les 5 instruments.',
  'Earn Full String Master — Platinum on all 5 instruments.':
    'Obtiens Maître de toutes les cordes — Platine sur les 5 instruments.',
  // Admin (role)
  'Granted to app administrators — read every Feedback board post, not just your own.':
    'Attribué aux administrateurs de l’app — permet de lire tous les messages de la boîte à idées, pas seulement les tiens.',
  // Guest-merge prompt — first sign-in on a device with local guest history
  'Add this device’s progress to your account?': 'Ajouter la progression de cet appareil à ton compte ?',
  'You’ve practiced on this device without an account. Add that progress to your account, or keep only what’s already on your account?':
    'Tu as pratiqué sur cet appareil sans compte. Ajouter cette progression à ton compte, ou garder seulement ce qui s’y trouve déjà ?',
  'Merge my progress': 'Fusionner ma progression',
  'Use account only': 'Utiliser seulement le compte',
  'Leave this practice off your account?': 'Laisser cette pratique hors de ton compte ?',
  'You have {n} rounds of practice saved on this device. If you continue, they stay on this device but are not added to your account.':
    'Tu as {n} manches de pratique enregistrées sur cet appareil. Si tu continues, elles restent sur cet appareil mais ne sont pas ajoutées à ton compte.',
  // VoiceCalibration
  'Voice calibration': 'Calibrage vocal',
  'Personal voice calibration': 'Calibrage vocal personnel',
  'Profile name': 'Nom du profil',
  'Say just this word, on its own': 'Dis seulement ce mot, tout seul',
  'Say just the note name, on its own': 'Dis seulement le nom de la note, tout seul',
  'Speak clearly and pause briefly between words — later, when answering, say the letter, pause, then “sharp” / “flat” as two separate words.':
    'Parle clairement et marque une courte pause entre les mots — ensuite, pour répondre, dis la lettre, fais une pause, puis « sharp » / « flat » en deux mots séparés.',
  'Could not use the microphone — try again': 'Impossible d’utiliser le micro — réessaie',
  'No sound captured — try again, closer to the mic': 'Aucun son capté — réessaie, plus près du micro',
  'Recording too short — try again': 'Enregistrement trop court — réessaie',
  "That didn't sound like a note — try again": 'Ça ne ressemblait pas à une note — réessaie',
  'Saving the recording failed': 'L’enregistrement n’a pas pu être sauvegardé',
  'Recorded': 'Enregistrés',
  'notes': 'notes',
  'accidentals': 'altérations',
  'Say:': 'Dis :',
  'Play last recording': 'Écouter le dernier enregistrement',
  'Export recordings to a folder (dev)': 'Exporter les enregistrements dans un dossier (dev)',
  'Stop exporting recordings': 'Arrêter d’exporter les enregistrements',
  'Every accepted take is also saved as a WAV, named for scripts/eval-voice.mts.':
    'Chaque prise acceptée est aussi enregistrée en WAV, nommée pour scripts/eval-voice.mts.',
  'Could not write to the export folder — pick it again':
    'Impossible d’écrire dans le dossier d’export — choisis-le à nouveau',
  'Speak the word on screen — calibration advances on its own':
    'Dis le mot affiché à l’écran — le calibrage avance tout seul',
  'Take': 'Prise',
  'Previous': 'Précédent',
  'Next': 'Suivant',
  'Delete profile': 'Supprimer le profil',
  'Reset automatic learning of the general mode': 'Réinitialiser l’apprentissage automatique du mode général',
  'Checking recordings…': 'Vérification des enregistrements…',
  'Self-test recordings': 'Autotest des enregistrements',
  'All words are distinct enough — looks good.': 'Tous les mots sont assez distincts — c’est bon.',
  'Finish & enable': 'Terminer et activer',
  '“{a}” and “{b}” sound very similar — re-record one of them.':
    '« {a} » et « {b} » se ressemblent trop — réenregistre l’un des deux.',
  'Recording extra takes to tell “{a}” and “{b}” apart':
    'Enregistrement de prises supplémentaires pour distinguer « {a} » de « {b} »',
  'No recordings for “{prompt}” yet': 'Pas encore d’enregistrement pour « {prompt} »',
  'Delete take {n} of {prompt}': 'Supprimer la prise {n} de {prompt}',
  'Record {n} more takes for “{a}” and “{b}”': 'Enregistrer {n} prises de plus pour « {a} » et « {b} »',
  'to go': 'restants',
  // VoiceLevelMeter
  'Microphone level good': 'Niveau du micro correct',
  'Microphone level low, speak louder': 'Niveau du micro faible, parle plus fort',
  'Good level': 'Bon niveau',
  'Too quiet — speak up': 'Trop faible — parle plus fort',
  // DebugLogPanel
  'Debug log': 'Journal de débogage',
  'Open debug log': 'Ouvrir le journal de débogage',
  'Errors + voice · auto-clears daily': 'Erreurs + voix · vidé chaque jour',
  'Errors · auto-clears daily': 'Erreurs · vidé chaque jour',
  'Voice: on': 'Voix : activée',
  'Voice: off': 'Voix : désactivée',
  'Copied': 'Copié',
  'Copy': 'Copier',
  'Clear': 'Effacer',
  'Close': 'Fermer',
  '(no errors)': '(aucune erreur)',
  // FeedbackBoard
  'Couldn’t load the board. Check your connection and try again.':
    'Impossible de charger la boîte à idées. Vérifie ta connexion et réessaie.',
  'Couldn’t send that. Check your connection and try again.':
    'Impossible d’envoyer. Vérifie ta connexion et réessaie.',
  'Sign in with Google to leave a comment, idea, or suggestion. Only admins can read the full board.':
    'Connecte-toi avec Google pour laisser un commentaire, une idée ou une suggestion. Seuls les administrateurs peuvent tout lire.',
  'Microphone access is off — turn it on to dictate.':
    'L’accès au micro est désactivé — active-le pour dicter.',
  'Voice typing isn’t available on this device.': 'La saisie vocale n’est pas disponible sur cet appareil.',
  'Couldn’t hear that — try again.': 'Je n’ai pas entendu — réessaie.',
  'What’s on your mind?': 'Qu’as-tu en tête ?',
  'Stop voice typing': 'Arrêter la saisie vocale',
  'Start voice typing': 'Démarrer la saisie vocale',
  'Sending…': 'Envoi…',
  'Send': 'Envoyer',
  'Listening… say one sentence — it stops on its own.': 'J’écoute… dis une phrase — ça s’arrête tout seul.',
  'Thanks — your message was sent.': 'Merci — ton message a été envoyé.',
  'Unknown': 'Inconnu',
  'You': 'Toi',
  'Handled': 'Traité',
  'Mark unhandled': 'Marquer comme non traité',
  'Mark handled': 'Marquer comme traité',
  'Delete': 'Supprimer',
  'You haven’t sent anything yet.': 'Tu n’as encore rien envoyé.',
  'Share a comment, idea, or suggestion. Admins read every post; below you can see the ones you’ve sent.':
    'Partage un commentaire, une idée ou une suggestion. Les administrateurs lisent chaque message ; tu vois ci-dessous ceux que tu as envoyés.',
  'Write': 'Écrire',
  'Inbox': 'Boîte de réception',
  'Post a comment, idea, or suggestion of your own.': 'Publie ton propre commentaire, idée ou suggestion.',
  'Every post from every user': 'Tous les messages de tous les utilisateurs',
  'still to handle': 'à traiter',
  'Mark one handled once you’ve dealt with it, or delete it.':
    'Marque un message comme traité une fois réglé, ou supprime-le.',
  'No posts yet.': 'Aucun message pour l’instant.',
  'Nothing open — all caught up.': 'Rien en attente — tout est à jour.',
  'Delete post': 'Supprimer le message',
  'Delete this post?': 'Supprimer ce message ?',
  'This permanently removes it for everyone, including':
    'Il sera supprimé définitivement pour tout le monde, y compris',
  'the author': 'l’auteur',
  'It can’t be undone.': 'C’est irréversible.',
  'Delete for everyone': 'Supprimer pour tout le monde',
  // Quick Access — the floating home-screen control, its Settings row and pushpins
  'Quick access': 'Accès rapide',
  'A floating button on the home screen for the settings you flip most. Pin up to 5 with the pushpins below, then double-tap the lower-right of the screen outside a drill to open it.':
    'Un bouton flottant sur l’écran d’accueil pour les réglages que tu changes le plus. Épingle-en jusqu’à 5 avec les punaises ci-dessous, puis touche deux fois le coin inférieur droit de l’écran, hors d’un exercice, pour l’ouvrir.',
  'Pin to quick access?': 'Épingler dans l’accès rapide ?',
  'Remove from quick access?': 'Retirer de l’accès rapide ?',
  'You can pin up to {n} settings. Remove one first.':
    'Tu peux épingler jusqu’à {n} réglages. Retires-en un d’abord.',
  'Quick access is full': 'L’accès rapide est plein',
  'You already have {n} shortcuts. Remove one to make room?':
    'Tu as déjà {n} raccourcis. En retirer un pour faire de la place ?',
  'Remove one': 'En retirer un',
  'Leave as is': 'Laisser tel quel',
  'Remove a quick access shortcut': 'Retirer un raccourci de l’accès rapide',
  'Quick access holds five shortcuts. Remove one to make room.':
    'L’accès rapide contient cinq raccourcis. Retires-en un pour faire de la place.',
  'Remove {name} from quick access': 'Retirer {name} de l’accès rapide',
  'Yes': 'Oui',
  'No': 'Non',
  'Double-tap the lower-right of the screen for quick access':
    'Touche deux fois le coin inférieur droit de l’écran pour l’accès rapide',
  'Double-tap the lower-left of the screen for quick access':
    'Touche deux fois le coin inférieur gauche de l’écran pour l’accès rapide',
  'Quick access is off': 'L’accès rapide est désactivé',
  "You haven't pinned any quick access shortcuts yet":
    'Tu n’as encore épinglé aucun raccourci dans l’accès rapide',
  'What do the icons mean?': 'Que signifient les icônes ?',
  'Quick access symbol legend': 'Légende des symboles de l’accès rapide',
  'What each icon on the Quick Access widget means. Tapping a pinned shortcut cycles through these states in order.':
    'Ce que signifie chaque icône de l’accès rapide. Toucher un raccourci épinglé fait défiler ces états dans cet ordre.',
  'Letters (A B C)': 'Lettres (A B C)',
  'Sharps (♯)': 'Dièses (♯)',
  'Flats (♭)': 'Bémols (♭)',
  // Tuner — the Learn-tab tile that opens a live chromatic tuner
  'Tuner': 'Accordeur',
  'Tune your strings using the microphone.': 'Accorde tes cordes avec le micro.',
  'Start listening': 'Commencer l’écoute',
  'Requesting microphone permission…': 'Demande d’autorisation du micro…',
  'Microphone access was denied. Allow it in your browser settings, then try again.':
    'L’accès au micro a été refusé. Autorise-le dans les réglages du navigateur, puis réessaie.',
  'Try again': 'Réessayer',
  "Couldn't start the microphone.": 'Impossible de démarrer le micro.',
  'Listening… play a note.': 'J’écoute… joue une note.',
  "Tap a note on the wheel to lock it as the string you're tuning. Tap it again to switch back to auto-detect.":
    'Touche une note de la roue pour la fixer comme la corde que tu accordes. Touche-la à nouveau pour revenir à la détection automatique.',
  'Tuning': 'Accordage',
  'Detected': 'Détectée',
  'String {n}': 'Corde {n}',
  'or': 'ou',
  'Unpin': 'Libérer',
  "Tap to lock this note at 12 o'clock": 'Touche pour fixer cette note en haut, à midi',
  'Tap to unpin': 'Touche pour la libérer',
  'In tune': 'Juste',
  'Tighten (raise pitch)': 'Tends (monte la hauteur)',
  'Loosen (lower pitch)': 'Détends (baisse la hauteur)',
  '~{pct}% of the audible threshold': '~{pct} % du seuil audible',
};
