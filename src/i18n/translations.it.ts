// Italian (it) dictionary, keyed by the English source string like `he` in
// translations.ts. Addresses the player as "tu". Landing in stages, mirroring
// Spanish / Portuguese stage 1: the app shell, settings, the drawer, the
// in-game screen, the Selector, Onboarding, Stats, the Leaderboard and the
// plan card. Everything not listed here falls back to English until a later
// stage adds it (see product-wishlist.md).

export const it: Record<string, string> = {
  // Instrument / title
  'Guitar': 'Chitarra',
  'Bass': 'Basso',
  'Fret Practice': 'Allenamento sui tasti',

  // Instrument picker — roadmap instruments (admin-only "coming soon" tiles)
  'Coming soon': 'Prossimamente',
  'Ukulele': 'Ukulele',
  'Mandolin': 'Mandolino',
  'Banjo': 'Banjo',

  // Settings — section titles / labels / help
  'Instrument': 'Strumento',
  'Playing': 'Pratica',
  'Instruments': 'Strumenti',
  'Strings': 'Corde',
  'Frets': 'Tasti',
  'Type': 'Tipo',
  'Acoustic': 'Acustica',
  'Electric': 'Elettrica',
  'Soprano': 'Soprano',
  'Concert': 'Concerto',
  'Tenor': 'Tenore',
  'Baritone': 'Baritono',
  '5-String Standard': '5 corde · standard',
  '5-String Parlor': '5 corde · parlor',
  '5-String Long Neck': '5 corde · manico lungo',
  '4-String Tenor (Irish, short scale)': '4 corde · tenore (irlandese, scala corta)',
  '4-String Tenor': '4 corde · tenore',
  '4-String Plectrum': '4 corde · plettro',
  '6-String (Guitar-Banjo)': '6 corde · banjo-chitarra',
  'Notes': 'Note',
  'Switches tuning, string count and fret range, then reloads the note samples.':
    'Cambia accordatura, numero di corde ed estensione dei tasti, poi ricarica i suoni delle note.',
  'Note names': 'Nomi delle note',
  'Written as': 'Scritte come',
  "Display only — the drill itself doesn't change.":
    'Cambia solo la visualizzazione — l’esercizio resta lo stesso.',
  'Letters (A, B, C…) or solfège syllables (Do, Re, Mi…).':
    'Lettere (A, B, C…) o sillabe del solfeggio (Do, Re, Mi…).',
  'A sharp (♯) is a half-step higher; a flat (♭) is a half-step lower. The same pitch can be written either way — C♯ and D♭ are one note. Pick which sign you see.':
    'Un diesis (♯) è un semitono sopra; un bemolle (♭) è un semitono sotto. La stessa altezza si può scrivere in entrambi i modi — C♯ e D♭ sono la stessa nota. Scegli quale segno vedere.',
  'A dièse (♯) is a half-step higher; a bémol (♭) is a half-step lower. The same pitch can be written either way — Do♯ and Re♭ are one note. Pick which sign you see.':
    'Un diesis (♯) è un semitono sopra; un bemolle (♭) è un semitono sotto. La stessa altezza si può scrivere in entrambi i modi — Do♯ e Re♭ sono la stessa nota. Scegli quale segno vedere.',
  'Sharps or flats': 'Diesis o bemolli',
  'Sharp (♯)': 'Diesis (♯)',
  'Flat (♭)': 'Bemolle (♭)',
  'Dièse (♯)': 'Diesis (♯)',
  'Bémol (♭)': 'Bemolle (♭)',
  'Score': 'Punteggio',
  'Score & celebrations': 'Punteggio e festeggiamenti',
  'Live score, streak multiplier and celebrations are shown.':
    'Vengono mostrati il punteggio in tempo reale, il moltiplicatore della serie e i festeggiamenti.',
  'Every answer is still recorded to your stats and personal bests either way.':
    'In ogni caso, ogni risposta viene comunque salvata nelle tue statistiche e nei tuoi record personali.',
  'On': 'Attivo',
  'Off': 'Disattivo',
  'Silent mode': 'Modalità silenziosa',
  'Sound & vibration': 'Suono e vibrazione',
  'Sound': 'Suono',
  'Vibrate': 'Vibrazione',
  'Silent': 'Silenzioso',
  'How the drill answers back, on one ladder from quietest to loudest. Silent: no sound and no per-button buzz, just a buzz on right / wrong answers plus the on-screen celebrations. Vibrate: no sound — a buzz on every button press and on right / wrong answers instead. Sound 1–5: note playback, chimes and tap sounds, louder each step; the limiter keeps even the loudest from distorting. Silent and Vibrate are great for practising with headphones off or a guitar in hand.':
    'Come ti risponde l’esercizio, su una scala dal più silenzioso al più forte. Silenzioso: nessun suono e nessuna vibrazione sui pulsanti, solo una vibrazione sulle risposte giuste / sbagliate più i festeggiamenti sullo schermo. Vibrazione: nessun suono — al suo posto una vibrazione a ogni tocco di un pulsante e sulle risposte giuste / sbagliate. Suono 1–5: la nota, i segnali e i suoni dei tocchi, più forti a ogni livello; il limitatore evita la distorsione anche al massimo. Silenzioso e Vibrazione sono perfetti per esercitarsi senza cuffie o con la chitarra in mano.',
  'Theme': 'Tema',
  'Dark': 'Scuro',
  'Night': 'Notte',
  'Day': 'Giorno',
  'Night is a warmer, dimmer palette for a dark room. Day is a light palette.':
    'Notte è una tavolozza più calda e tenue per una stanza buia. Giorno è una tavolozza chiara.',
  'Appearance': 'Aspetto',
  'Theme sets how light or dark the app is: Night is a warmer, dimmer palette for a dark room, Day is a light one. Season sets the colours layered over it — Winter is the original look. Auto follows your clock (Day from 07:00 to 19:00, Night after) and the real season where you are; picking a season by hand holds until that season ends.':
    'Il tema stabilisce quanto l’app è chiara o scura: Notte è una tavolozza più calda e tenue per una stanza buia, Giorno è una tavolozza chiara. La stagione stabilisce i colori applicati sopra — Inverno è l’aspetto originale. Automatico segue il tuo orologio (Giorno dalle 07:00 alle 19:00, Notte dopo) e la stagione reale dove ti trovi; se scegli una stagione a mano, resta finché quella stagione non finisce.',
  'Season': 'Stagione',
  'Winter': 'Inverno',
  'Spring': 'Primavera',
  'Summer': 'Estate',
  'Autumn': 'Autunno',
  'A seasonal colour palette layered over the theme. Winter is the original look.':
    'Una tavolozza di colori stagionale applicata sopra il tema. Inverno è l’aspetto originale.',
  'Mastery on the fretboard': 'Padronanza sulla tastiera',
  'The per-note / per-fret accuracy bars drawn over the circle and grid while stopped or paused.':
    'Le barre di precisione per nota / per tasto disegnate sul cerchio e sulla griglia quando il gioco è fermo o in pausa.',
  'Mastery keeps being tracked and shows on the Stats screen either way.':
    'La padronanza continua a essere registrata e compare comunque nella schermata delle statistiche.',
  'Questions counted': 'Domande conteggiate',
  'How many of your most recent questions the mastery bars are computed from. Free accounts use the last 250.':
    'Da quante delle tue domande più recenti vengono calcolate le barre di padronanza. Gli account gratuiti usano le ultime 250.',
  'Choose how many recent questions the mastery bars are counted from':
    'Scegli da quante domande recenti vengono calcolate le barre di padronanza',
  'Mastery time window': 'Periodo della padronanza',
  'Point the mastery bars at a recent-question count, a single day, or a date range':
    'Calcola le barre di padronanza da un numero di domande recenti, da un singolo giorno o da un intervallo di date',
  'What slice of your history the mastery bars are computed from. Free accounts use the last 250 questions. Older history saved without a date is not counted for a specific day or range.':
    'Quale parte della tua cronologia viene usata per calcolare le barre di padronanza. Gli account gratuiti usano le ultime 250 domande. La cronologia più vecchia salvata senza data non conta per un giorno o un intervallo specifico.',
  'Recent': 'Recenti',
  'A day': 'Un giorno',
  'A range': 'Un intervallo',
  'From': 'Da',
  'To': 'A',
  'showing': 'mostra',
  'showing last': 'mostra le ultime',
  'showing all questions': 'mostra tutte le domande',
  'All': 'Tutto',
  'Stats & progress': 'Statistiche e progressi',
  'Answer mode': 'Modalità di risposta',
  'How you answer': 'Come rispondi',
  'Voice mode asks for microphone permission the first time.':
    'La modalità voce chiede il permesso di usare il microfono la prima volta.',
  'Speak clearly and pause briefly between words — for sharp/flat notes, say the letter, pause, then “sharp” / “flat” as two separate words.':
    'Parla chiaramente e fai una breve pausa tra le parole — per le note con diesis/bemolle, di’ la lettera, fai una pausa, poi “sharp” / “flat” come due parole separate.',
  'Tap': 'Tocco',
  'Voice': 'Voce',
  'Admin-only experiment: play the target note on your guitar instead of tapping. Only works for “by fret” questions — a played note can’t say which string it came from, so “by note” questions stay on tap.':
    'Esperimento solo per amministratori: suona la nota sulla tua chitarra invece di toccare lo schermo. Funziona solo con le domande “per tasto” — una nota suonata non dice da quale corda arriva, quindi le domande “per nota” restano a tocco.',
  '🎸 Microphone blocked — enable it or switch to tap': '🎸 Microfono bloccato — attivalo o passa al tocco',
  '🎸 Pitch detection isn’t available on this device — use tap': '🎸 Il rilevamento dell’altezza non è disponibile su questo dispositivo — usa il tocco',
  '🎸 Didn’t catch that': '🎸 Non ho capito',
  '🎸 Play the note on your guitar': '🎸 Suona la nota sulla tua chitarra',
  'Voice engine': 'Motore vocale',
  'Auto picks the best available. Personal uses your calibrated profile; General uses the built-in model.':
    'Automatico sceglie il migliore disponibile. Personale usa il tuo profilo calibrato; Generale usa il modello integrato.',
  'Auto': 'Automatico',
  'Personal': 'Personale',
  'General': 'Generale',
  'Your voice profile': 'Il tuo profilo vocale',
  'Calibrating your own voice improves recognition when answering by voice.':
    'Calibrare la tua voce migliora il riconoscimento quando rispondi a voce.',
  'recordings': 'registrazioni',
  'enabled': 'attivo',
  'Add / review recordings': 'Aggiungi / rivedi le registrazioni',
  'Calibrate my voice': 'Calibra la mia voce',
  'Feedback board': 'Bacheca dei suggerimenti',
  'Leaderboard': 'Classifica',
  'Account': 'Account',
  'Signed in': 'Accesso effettuato',
  'Keeps your preferences and data in sync across devices.':
    'Mantiene le tue preferenze e i tuoi dati sincronizzati tra i dispositivi.',
  'Sign out': 'Esci',
  'Sign in with Google to keep your preferences and data across devices.':
    'Accedi con Google per avere le tue preferenze e i tuoi dati su tutti i dispositivi.',
  'Sign in with Google': 'Accedi con Google',

  // Account → About tile + live community counts
  'About': 'Informazioni',
  'Guitar Fret Practice is a small labor of love — built to turn learning the fretboard into a game instead of a chore. Made by an independent developer, with patient help from family and friends.':
    'Guitar Fret Practice è un piccolo progetto fatto con passione — creato per trasformare lo studio della tastiera in un gioco invece che in un dovere. Realizzato da uno sviluppatore indipendente, con il paziente aiuto di famiglia e amici.',
  'Registered users': 'Utenti registrati',
  'Active now': 'Attivi ora',
  'Guests online': 'Ospiti online',
  'See the full list and what earns each one': 'Vedi l’elenco completo e come ottenere ciascuna',
  'Badges': 'Medaglie',
  'Language': 'Lingua',
  'Left-handed': 'Mancino',
  'Button depth': 'Rilievo dei pulsanti',
  'Gives the buttons a raised, 3D look: a light rim on top, a solid edge underneath, and they sink a little when pressed. Off keeps them flat.':
    'Dà ai pulsanti un aspetto in rilievo, 3D: un bordo chiaro sopra, un bordo pieno sotto, e si abbassano un po’ quando li premi. Disattivo li lascia piatti.',
  'Mirrors the app for a left-handed player: the fretboard flips (nut on the right), and the menu, Quick Access and back buttons move to the left. Independent of language — it stays mirrored in Hebrew too.':
    'Specchia l’app per chi suona da mancino: la tastiera si capovolge (capotasto a destra) e il menu, l’Accesso rapido e i pulsanti indietro passano a sinistra. Indipendente dalla lingua — resta specchiata anche in ebraico.',
  'Colour-blind heatmap markers': 'Segni della mappa di calore per daltonici',
  'Adds a ✓ / • mark on the Stats-screen fretboard heatmap cells, on top of colour, so known vs. needs-work reads without relying on hue.':
    'Aggiunge un segno ✓ / • sulle celle della mappa di calore della tastiera nelle Statistiche, oltre al colore, così distingui ciò che conosci da ciò che va esercitato senza affidarti alla tinta.',

  // Hamburger drawer / dialogs
  'Settings': 'Impostazioni',
  'Close settings': 'Chiudi impostazioni',
  'Open settings': 'Apri impostazioni',
  'Game settings': 'Impostazioni di gioco',
  'Back': 'Indietro',
  'Microphone access': 'Accesso al microfono',
  'Answer out loud': 'Rispondi ad alta voce',
  'Voice mode listens for the note or fret you say instead of a tap.':
    'La modalità voce ascolta la nota o il tasto che pronunci, invece di un tocco.',
  'Your browser will ask to use the microphone next — audio stays on your device and is never recorded or uploaded.':
    'Ora il browser ti chiederà di usare il microfono — l’audio resta sul tuo dispositivo e non viene mai registrato né caricato.',
  'Allow microphone': 'Consenti il microfono',
  'Not now': 'Non ora',
  'Microphone is blocked': 'Il microfono è bloccato',
  "Your browser is refusing microphone access for this site, so voice answers can't work yet. Tap the 🔒 / 🎤 icon beside the address bar, set the microphone to":
    'Il browser sta negando l’accesso al microfono per questo sito, quindi le risposte a voce non funzionano ancora. Tocca l’icona 🔒 / 🎤 accanto alla barra degli indirizzi e imposta il microfono su',
  ', then reload the page.': ', poi ricarica la pagina.',
  'Allow': 'Consenti',
  'Got it': 'Ho capito',
  'Use tap instead': 'Usa il tocco',
  'Sign in': 'Accedi',
  'Save your progress': 'Salva i tuoi progressi',
  'Sign in to keep your history, badges and personal bests across devices. You can keep playing as a guest — everything still works, it just stays on this device.':
    'Accedi per avere la tua cronologia, le tue medaglie e i tuoi record personali su tutti i dispositivi. Puoi continuare a giocare come ospite — funziona tutto lo stesso, resta solo su questo dispositivo.',
  'Maybe later': 'Forse più tardi',
  'Press back again to exit': 'Premi di nuovo indietro per uscire',

  // In-game
  'STAGE COMPLETE': 'LIVELLO COMPLETATO',
  'Retry': 'Riprova',
  '🎤 Microphone blocked — enable it or switch to tap': '🎤 Microfono bloccato — attivalo o passa al tocco',
  '🎤 Voice needs a connection': '🎤 La voce richiede una connessione',
  '🎤 Voice isn’t working in this browser — try Chrome, or use tap':
    '🎤 La voce non funziona in questo browser — prova Chrome o usa il tocco',
  '🎤 Didn’t catch that': '🎤 Non ho capito',
  'Round Complete!': 'Round completato!',
  'pts': 'pt',
  'OK': 'OK',
  'Start': 'Inizia',
  'Resume': 'Riprendi',
  'Pause': 'Pausa',
  'Stop': 'Ferma',
  'Refresh': 'Aggiorna',
  'Privacy policy': 'Informativa sulla privacy',

  'QUESTIONS': 'DOMANDE',
  'streak': 'serie',
  'New badge': 'Nuova medaglia',
  'Badge upgraded': 'Medaglia migliorata',
  'Continue': 'Continua',
  'Listening…': 'In ascolto…',
  'Member since': 'Membro dal',
  'badges earned': 'medaglie ottenute',

  // Pinned badge shelf (Account section)
  'Choose badges to feature': 'Scegli le medaglie da mettere in vetrina',
  'Edit featured badges': 'Modifica le medaglie in vetrina',
  'Your badges': 'Le tue medaglie',
  'Feature up to 5 badges': 'Metti in vetrina fino a 5 medaglie',
  'Remove a badge to feature another.': 'Togli una medaglia per metterne in vetrina un’altra.',
  'See all badges': 'Vedi tutte le medaglie',

  // LeaderboardPanel — standings sub-page
  'player': 'giocatore',
  'players': 'giocatori',
  'ranked by XP': 'ordinati per XP',
  'free for everyone': 'gratis per tutti',
  'All-time': 'Di sempre',
  'This week': 'Questa settimana',
  'Loading…': 'Caricamento…',
  'Couldn’t load the leaderboard. Check your connection and try again.':
    'Impossibile caricare la classifica. Controlla la connessione e riprova.',
  'Couldn’t update that. Check your connection and try again.':
    'Impossibile aggiornare. Controlla la connessione e riprova.',
  'Your standing': 'La tua posizione',
  'RANK': 'POSIZIONE',
  'acc': 'prec.',
  '(you)': '(tu)',
  'Hidden from the leaderboard': 'Nascosto dalla classifica',
  'Visible on the leaderboard': 'Visibile in classifica',
  'Join the board': 'Entra in classifica',
  'You can see every player’s standing right now. Sign in with Google to take your own place — every correct answer you’ve ever played counts. Free, no subscription.':
    'Puoi già vedere la posizione di ogni giocatore. Accedi con Google per prendere il tuo posto — conta ogni risposta giusta che hai mai dato. Gratis, senza abbonamento.',
  'No one’s on the board yet': 'Non c’è ancora nessuno in classifica',
  'Finish a practice run while signed in and your name lands here first.':
    'Completa una sessione di pratica dopo aver effettuato l’accesso e il tuo nome comparirà qui per primo.',
  'How is XP counted?': 'Come si calcolano gli XP?',

  // SelectorPanel — mode/difficulty/fret-range picker
  'all': 'tutte le',
  'strings': 'corde',
  'frets': 'tasti',
  'only the dot-marker frets': 'solo i tasti con i segnatasti',
  'natural notes only (no sharps or flats)': 'solo note naturali (senza diesis né bemolli)',
  'every note, sharps and flats included': 'tutte le note, diesis e bemolli compresi',
  'alphabetical order': 'ordine alfabetico',
  'circle-of-fifths order': 'ordine del circolo delle quinte',
  'A fret lights up and you pick its note from the wheel':
    'Si illumina un tasto e scegli la sua nota sulla ruota',
  ', rotated to the string': ', ruotata in base alla corda',
  'A note name is shown and you tap every fret on the neck where it lands.':
    'Compare il nome di una nota e tocchi ogni tasto del manico in cui si trova.',
  'Note-by-Fret': 'Nota dal tasto',
  'Fret-by-Note': 'Tasto dalla nota',
  'Auto-advances through the difficulty stages.': 'Avanza automaticamente attraverso i livelli di difficoltà.',
  'How this works': 'Come funziona',
  'neck': 'manico',
  'neck fret range selector': 'selettore dell’estensione dei tasti del manico',
  'Precise fret range': 'Estensione dei tasti precisa',
  'Pick an exact fret N–M window to drill': 'Scegli un’estensione esatta di tasti N–M su cui esercitarti',
  'Fret range': 'Estensione dei tasti',
  'Full only while a precise fret window is on': 'Solo Completa finché è attiva un’estensione di tasti precisa',
  'Drill only part of the neck. Drag the handles to set the exact fret window — the shaded area is muted out, both here and on the home-screen neck.':
    'Esercitati solo su una parte del manico. Trascina le maniglie per impostare l’estensione esatta dei tasti — l’area ombreggiata resta esclusa, sia qui sia sul manico della schermata iniziale.',
  'Lowest fret': 'Tasto più basso',
  'Highest fret': 'Tasto più alto',
  'Multi': 'Più corde',
  'Note by Fret': 'Nota dal tasto',
  'Alpha': 'Alfabetico',
  'Fifths': 'Quinte',
  'By String': 'Per corda',
  'Fret by Note': 'Tasto dalla nota',
  "Read the note wheel like a clock: your open string sits at 12 o'clock, and the dots under each note show its fret. Answer before the timing bar empties.":
    'Leggi la ruota delle note come un orologio: la tua corda a vuoto sta alle ore 12 e i puntini sotto ogni nota indicano il suo tasto. Rispondi prima che la barra del tempo si svuoti.',
  'Answer before the timing bar empties.': 'Rispondi prima che la barra del tempo si svuoti.',
  'Dots': 'Segnatasti',
  'Naturals': 'Naturali',
  'Full': 'Completa',
  'Auto Advance to next difficulty': 'Avanzamento automatico alla difficoltà successiva',

  // Onboarding
  'Guitar Fret Practice': 'Guitar Fret Practice',
  'Master the fretboard with the clock method — one string at a time.':
    'Padroneggia la tastiera con il metodo dell’orologio — una corda alla volta.',
  'What do you play?': 'Che cosa suoni?',
  'Skip setup →': 'Salta la configurazione →',
  'How well do you know the fretboard?': 'Quanto conosci la tastiera?',
  "I'm just starting": 'Sto iniziando',
  'Start with dot frets on String 6': 'Inizia dai tasti con i segnatasti sulla corda 6',
  'I play but want to improve': 'Suono, ma voglio migliorare',
  'Quick 3-question test': 'Test rapido di 3 domande',
  'I know the full neck': 'Conosco tutto il manico',
  'Jump right in': 'Inizia subito',
  'Skip →': 'Salta →',
  'String': 'Corda',
  'what note is fret': 'che nota è il tasto',
  'Skip test →': 'Salta il test →',
  'Keep going!': 'Continua così!',
  'Good start!': 'Buon inizio!',
  'Nice work!': 'Ottimo lavoro!',
  'Impressive!': 'Impressionante!',
  'Dot Frets': 'Tasti con segnatasti',
  'Natural notes': 'Note naturali',
  'the full chromatic neck': 'tutto il manico cromatico',
  "correct — we've set you up on": 'giuste — ti abbiamo impostato su',
  'Change it anytime in the selector panel.': 'Puoi cambiarlo quando vuoi nel pannello di selezione.',
  "Let's go →": 'Andiamo →',

  // ProgressPanel — stats & progress screen
  'by note': 'per nota',
  'by fret': 'per tasto',
  'fret': 'tasto',
  'not played': 'non suonata',
  'known': 'conosciuta',
  'needs work': 'da esercitare',
  'unplayed': 'non suonata',
  'Not enough data yet.': 'Non ci sono ancora abbastanza dati.',
  'Not practiced yet': 'Non ancora esercitato',
  'Older sessions have no date stamp, so the timeline is empty. New sessions fill it in.':
    'Le sessioni più vecchie non hanno una data, quindi la cronologia è vuota. Le nuove sessioni la riempiranno.',
  'Play a few rounds and your all-time progress shows up here.':
    'Gioca qualche round e i tuoi progressi di sempre compariranno qui.',
  'accuracy': 'precisione',
  'day streak': 'giorni di fila',
  'answered': 'risposte',
  'Weakest notes': 'Note più deboli',
  'Nothing below 70% — nice.': 'Niente sotto il 70% — ottimo.',
  'By note': 'Per nota',
  'By string': 'Per corda',
  'By fret': 'Per tasto',
  'Fretboard heatmap': 'Mappa di calore della tastiera',
  'Daily timeline': 'Andamento giornaliero',
  'Accuracy %': '% di precisione',
  'Avg response time': 'Tempo medio di risposta',
  'Personal bests': 'Record personali',
  'No personal bests recorded yet.': 'Non ci sono ancora record personali.',
  'No practice in the last 7 days.': 'Nessuna pratica negli ultimi 7 giorni.',
  'All time': 'Di sempre',
  'Last 7 days': 'Ultimi 7 giorni',
  'across every': 'in ogni',
  'settings combination': 'combinazione di impostazioni',
  'Clear all history': 'Cancella tutta la cronologia',
  'Clear all stats?': 'Cancellare tutte le statistiche?',
  'This permanently erases your entire practice history and resets the all-time mastery for every note, string and settings combination. Your personal bests are kept.':
    'Questo cancella per sempre tutta la tua cronologia di pratica e azzera la padronanza di sempre per ogni nota, corda e combinazione di impostazioni. I tuoi record personali vengono mantenuti.',
  "This can't be undone.": 'Non si può annullare.',
  'Delete anyway': 'Cancella comunque',
  'Cancel': 'Annulla',

  // Instrument string labels (guitar + bass, "String N · note")
  'String 1 · high E': 'Corda 1 · Mi cantino',
  'String 2 · B': 'Corda 2 · Si',
  'String 3 · G': 'Corda 3 · Sol',
  'String 4 · D': 'Corda 4 · Re',
  'String 5 · A': 'Corda 5 · La',
  'String 6 · low E': 'Corda 6 · Mi basso',
  'String 1 · G': 'Corda 1 · Sol',
  'String 2 · D': 'Corda 2 · Re',
  'String 3 · A': 'Corda 3 · La',
  'String 4 · low E': 'Corda 4 · Mi basso',

  // Free / Pro / Premium tiering — ProGate lock states + the Upgrade card
  'Premium': 'Premium',
  // Free-tier ad strip
  'Advertisement': 'Pubblicità',
  'Ad': 'Annuncio',
  'Close ad': 'Chiudi l’annuncio',
  'Your ad could be here. Go Pro to remove ads.': 'Qui potrebbe esserci il tuo annuncio. Passa a Pro per rimuovere gli annunci.',
  'Unlock with Pro': 'Sblocca con Pro',
  'Unlock with Premium': 'Sblocca con Premium',
  'You have Pro': 'Hai Pro',
  "You're on Free": 'Hai il piano gratuito',
  'Your plan': 'Il tuo piano',
  'Included with Pro': 'Incluso in Pro',
  'Everything in Free, plus:': 'Tutto il piano gratuito, più:',
  'Everything you need to practice daily, at no cost.':
    'Tutto quello che ti serve per esercitarti ogni giorno, senza costi.',
  'The full fretboard drill — by note and by fret, on every string':
    'L’esercizio completo sulla tastiera — per nota e per tasto, su ogni corda',
  'Badges and achievements, with your pinned medal shelf':
    'Medaglie e traguardi, con la tua vetrina di medaglie in evidenza',
  'The leaderboard — XP, questions answered and accuracy':
    'La classifica — XP, domande risposte e precisione',
  'Cloud sync and full restore of your practice on every device':
    'Sincronizzazione nel cloud e ripristino completo della tua pratica su ogni dispositivo',
  'Your last 7 days of stats, plus the personal best for what you’re drilling':
    'Le tue statistiche degli ultimi 7 giorni, più il record personale di ciò su cui ti stai esercitando',
  'Free, forever': 'Gratis, per sempre',
  'Pro is for training seriously and tracking progress over time.':
    'Pro è per allenarsi sul serio e seguire i progressi nel tempo.',
  'Your full practice history — all-time stats and trends, not just the last 7 days':
    'La tua cronologia di pratica completa — statistiche e tendenze di sempre, non solo degli ultimi 7 giorni',
  'Mastery maps — per-note and per-fret accuracy overlays on the circle and grid':
    'Mappe di padronanza — precisione per nota e per tasto sul cerchio e sulla griglia',
  'Browse your personal bests across every settings combination':
    'Consulta i tuoi record personali in ogni combinazione di impostazioni',
  'A personal voice profile built from your own calibration recordings':
    'Un profilo vocale personale creato dalle tue registrazioni di calibrazione',
  'Your Pro access is complimentary.': 'Il tuo accesso Pro è in omaggio.',
  'Your Pro access came from a promotion.': 'Il tuo accesso Pro deriva da una promozione.',
  'Your Pro access was granted manually.': 'Il tuo accesso Pro è stato concesso manualmente.',
  'Your Pro access is from your subscription.': 'Il tuo accesso Pro deriva dal tuo abbonamento.',
  'Your Pro access is active.': 'Il tuo accesso Pro è attivo.',
  'It does not expire.': 'Non scade.',
  'Access runs until': 'L’accesso è valido fino al',
  'Pro isn’t on sale yet — everything above stays free to try in the meantime.':
    'Pro non è ancora in vendita — nel frattempo puoi provare gratis tutto quanto sopra.',
  'Free': 'Gratis',

  // Adaptive difficulty suggestion banner (wishlist §3)
  'You’re cruising through this — ready for a harder level?':
    'Te la stai cavando alla grande — pronto per un livello più difficile?',
  'This setup is fighting back. Want to ease off a level?':
    'Questa configurazione ti sta mettendo in difficoltà. Vuoi scendere di un livello?',
  'Switch the difficulty to': 'Cambia la difficoltà in',
  'Drop the difficulty to': 'Abbassa la difficoltà a',
  'Apply': 'Applica',
  'Dismiss': 'Ignora',

  // Learning-type navigation — the drawer's "Learn" group and its full pages
  'Learn': 'Impara',
  'Choose what to practise.': 'Scegli cosa esercitare.',
  'Current': 'Attuale',
  'Daily practice': 'Pratica quotidiana',
  'Intervals': 'Intervalli',
  'Scales': 'Scale',
  'Chords': 'Accordi',
  'Staff reading': 'Lettura dello spartito',
  'Game': 'Gioco',
  'Your daily plan is loading…': 'Caricamento del tuo piano quotidiano…',
  'Let the Teacher plan your practice': 'Lascia che l’Insegnante pianifichi la tua pratica',
  'Practise hearing and finding intervals': 'Esercitati ad ascoltare e trovare gli intervalli',

  // Fret range conflict dialog
  'Fret range too small': 'Estensione dei tasti troppo piccola',
  'The current fret range': 'L’estensione dei tasti attuale',
  ' allows fewer than ': ' consente meno di ',
  ' unique notes': ' note diverse',
  ' with the selected strings. Please expand the range.': ' con le corde scelte. Amplia l’estensione.',
  'Expand to minimum': 'Amplia al minimo',
  'I will expand': 'Amplio io',
  'Custom range': 'Estensione personalizzata',
  'Keep as is': 'Lascia così',
  'Set fret range': 'Imposta l’estensione dei tasti',
};
