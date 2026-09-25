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

  // ── Stage 2a: badges, guest merge, voice calibration, feedback board,
  // quick access and the tuner ──────────────────────────────────────────
  // Badges / Achievements wall — tiers
  'Bronze': 'Bronzo',
  'Silver': 'Argento',
  'Gold': 'Oro',
  'Platinum': 'Platino',
  'Diamond': 'Diamante',
  'Master': 'Maestro',
  'Legendary I': 'Leggendario I',
  'Legendary II': 'Leggendario II',
  'Legendary III': 'Leggendario III',
  'Legendary IV': 'Leggendario IV',
  // Wall chrome
  'unlocked': 'sbloccate',
  'Max': 'Max',
  'Earned': 'Ottenuta',
  // Admin test controls
  'Grant': 'Assegna',
  'Reset': 'Azzera',
  'Admin tools: Grant or Reset each badge to test it. History-based badges re-appear on reopen unless you also clear history.':
    'Strumenti di amministrazione: assegna o azzera ogni medaglia per provarla. Le medaglie basate sulla cronologia ricompaiono alla riapertura, a meno che tu non cancelli anche la cronologia.',
  // Family names
  'Perfect Session': 'Sessione perfetta',
  'Speed Demon': 'Demone della velocità',
  'Flawless Sprint': 'Sprint impeccabile',
  'On Fire': 'In fiamme',
  'Comeback': 'Rimonta',
  'Every String': 'Tutte le corde',
  'String Master': 'Maestro della corda',
  'String Master · {s}': 'Maestro · {s}',
  'Full String Master': 'Maestro di tutte le corde',
  'Neck Runner': 'Corridore del manico',
  'Both Ends': 'Entrambi gli estremi',
  'Low End': 'Registro grave',
  'Week Warrior': 'Guerriero della settimana',
  'Dedicated': 'Costante',
  'Total Reps': 'Ripetizioni totali',
  'Sharpshooter': 'Tiratore scelto',
  'Quick Read': 'Lettura rapida',
  'Most Improved': 'Il più migliorato',
  'Doubling Up': 'Doppietta',
  'Multi-Instrumentalist': 'Polistrumentista',
  'Admin': 'Amministratore',
  // Earning conditions — Perfect Session
  'Answer 10+ questions in a round with no mistakes at all.':
    'Rispondi a 10+ domande in un round senza nessun errore.',
  '25+ questions in a round, still zero mistakes.': '25+ domande in un round, ancora zero errori.',
  '50+ questions in a round, still zero mistakes — a full clean run.':
    '50+ domande in un round, ancora zero errori — un round completamente pulito.',
  // Speed Demon
  'Get 10+ correct answers in a round, at least 8 of them under 1.5s.':
    'Dai 10+ risposte giuste in un round, almeno 8 in meno di 1,5 s.',
  '20+ correct answers, at least 16 of them under 1.5s.': '20+ risposte giuste, almeno 16 in meno di 1,5 s.',
  '40+ correct answers, at least 32 of them under 1.2s.': '40+ risposte giuste, almeno 32 in meno di 1,2 s.',
  // Flawless Sprint
  'Finish a whole round at 90% accuracy or better.':
    'Completa un intero round con il 90% di precisione o più.',
  'Finish a whole round at 95% accuracy or better.':
    'Completa un intero round con il 95% di precisione o più.',
  'Finish a whole round at 100% accuracy.': 'Completa un intero round con il 100% di precisione.',
  // On Fire
  'Reach a streak of 15 in a single round.': 'Raggiungi una serie di 15 in un solo round.',
  'Reach a streak of 20 in a single round.': 'Raggiungi una serie di 20 in un solo round.',
  'Reach a streak of 30 in a single round.': 'Raggiungi una serie di 30 in un solo round.',
  // Comeback
  'Miss 3+ of your first 20 questions, then answer the next 8 in a row correctly.':
    'Sbaglia 3+ delle prime 20 domande, poi rispondi giusto alle 8 successive di fila.',
  'Miss 5+ of your first 20 questions, then answer the next 12 in a row correctly.':
    'Sbaglia 5+ delle prime 20 domande, poi rispondi giusto alle 12 successive di fila.',
  'Miss 8+ of your first 20 questions, then answer the next 18 in a row correctly.':
    'Sbaglia 8+ delle prime 20 domande, poi rispondi giusto alle 18 successive di fila.',
  // Every String
  'Finish a round that visited every string: 2x that many questions, 90% accuracy.':
    'Completa un round che passi per tutte le corde: il doppio delle domande rispetto alle corde, 90% di precisione.',
  'Visited every string: 4x that many questions, 90% accuracy.':
    'Passando per tutte le corde: 4 volte più domande che corde, 90% di precisione.',
  'Visited every string: 6x that many questions, 95% accuracy.':
    'Passando per tutte le corde: 6 volte più domande che corde, 95% di precisione.',
  // Per-string String Master — {s} is the translated string label
  'Answer 40+ questions on {s} at 90% accuracy or better.':
    'Rispondi a 40+ domande su {s} con il 90% di precisione o più.',
  '100+ questions on {s} at 92% accuracy or better.': '100+ domande su {s} con il 92% di precisione o più.',
  '200+ questions on {s} at 95% accuracy or better.': '200+ domande su {s} con il 95% di precisione o più.',
  '400+ questions on {s} at 96% accuracy or better, over 14+ practice days.':
    '400+ domande su {s} con il 96% di precisione o più, in 14+ giorni di pratica.',
  '800+ questions on {s} at 97% accuracy or better, over 30+ practice days.':
    '800+ domande su {s} con il 97% di precisione o più, in 30+ giorni di pratica.',
  // Full String Master
  'Earn String Master — Bronze on every string of this instrument.':
    'Ottieni Maestro della corda — Bronzo su tutte le corde di questo strumento.',
  'Earn String Master — Silver on every string.': 'Ottieni Maestro della corda — Argento su tutte le corde.',
  'Earn String Master — Gold on every string.': 'Ottieni Maestro della corda — Oro su tutte le corde.',
  'Earn String Master — Platinum on every string.':
    'Ottieni Maestro della corda — Platino su tutte le corde.',
  'Earn String Master — Diamond on every string.':
    'Ottieni Maestro della corda — Diamante su tutte le corde.',
  // Neck Runner
  'Answer at least one question on every fret of the neck.':
    'Rispondi ad almeno una domanda su ogni tasto del manico.',
  'Answer at least 3 questions on every fret of the neck.':
    'Rispondi ad almeno 3 domande su ogni tasto del manico.',
  'Answer at least 5 questions on every fret of the neck.':
    'Rispondi ad almeno 5 domande su ogni tasto del manico.',
  'Answer at least 10 questions on every fret, spread across 14+ practice days.':
    'Rispondi ad almeno 10 domande su ogni tasto, distribuite in 14+ giorni di pratica.',
  'Answer at least 20 questions on every fret, spread across 30+ practice days.':
    'Rispondi ad almeno 20 domande su ogni tasto, distribuite in 30+ giorni di pratica.',
  // Both Ends
  'Answer 40+ questions above the 12th fret at 85% accuracy or better.':
    'Rispondi a 40+ domande oltre il 12° tasto con l’85% di precisione o più.',
  '100+ questions above the 12th fret at 88% accuracy or better.':
    '100+ domande oltre il 12° tasto con l’88% di precisione o più.',
  '200+ questions above the 12th fret at 92% accuracy or better.':
    '200+ domande oltre il 12° tasto con il 92% di precisione o più.',
  '400+ questions above the 12th fret at 93% accuracy or better, over 14+ practice days.':
    '400+ domande oltre il 12° tasto con il 93% di precisione o più, in 14+ giorni di pratica.',
  '800+ questions above the 12th fret at 94% accuracy or better, over 30+ practice days.':
    '800+ domande oltre il 12° tasto con il 94% di precisione o più, in 30+ giorni di pratica.',
  // Low End
  'Answer 40+ questions on the bass low-E string at 90% accuracy or better.':
    'Rispondi a 40+ domande sulla corda Mi (E) grave del basso con il 90% di precisione o più.',
  '100+ questions on the low-E string at 93% accuracy or better.':
    '100+ domande sulla corda Mi (E) grave con il 93% di precisione o più.',
  '200+ questions on the low-E string at 96% accuracy or better.':
    '200+ domande sulla corda Mi (E) grave con il 96% di precisione o più.',
  '400+ questions on the low-E string at 97% accuracy or better, over 14+ practice days.':
    '400+ domande sulla corda Mi (E) grave con il 97% di precisione o più, in 14+ giorni di pratica.',
  '800+ questions on the low-E string at 98% accuracy or better, over 30+ practice days.':
    '800+ domande sulla corda Mi (E) grave con il 98% di precisione o più, in 30+ giorni di pratica.',
  // Week Warrior
  'Practise on 5 separate days within a single 7-day window.':
    'Esercitati in 5 giorni diversi nello stesso arco di 7 giorni.',
  '6 separate days within a single 7-day window.': '6 giorni diversi nello stesso arco di 7 giorni.',
  'All 7 days within a single 7-day window — a perfect week.':
    'Tutti i 7 giorni dello stesso arco di 7 giorni — una settimana perfetta.',
  // Dedicated
  'Build a run of 7 consecutive practice days.': 'Metti in fila 7 giorni di pratica consecutivi.',
  '14 consecutive practice days.': '14 giorni di pratica consecutivi.',
  '30 consecutive practice days.': '30 giorni di pratica consecutivi.',
  '60 consecutive practice days.': '60 giorni di pratica consecutivi.',
  '90 consecutive practice days.': '90 giorni di pratica consecutivi.',
  '120 consecutive practice days.': '120 giorni di pratica consecutivi.',
  '180 consecutive practice days.': '180 giorni di pratica consecutivi.',
  '250 consecutive practice days.': '250 giorni di pratica consecutivi.',
  '300 consecutive practice days.': '300 giorni di pratica consecutivi.',
  '365 consecutive practice days — a full year, every day.':
    '365 giorni di pratica consecutivi — un anno intero, ogni giorno.',
  // Total Reps
  'Answer 100 questions all-time, across every instrument.':
    'Rispondi a 100 domande in totale, sommando tutti gli strumenti.',
  '250 questions all-time.': '250 domande in totale.',
  '500 questions all-time.': '500 domande in totale.',
  '1,000 questions all-time.': '1.000 domande in totale.',
  '2,500 questions all-time, spread across 20+ practice days.':
    '2.500 domande in totale, distribuite in 20+ giorni di pratica.',
  '5,000 questions all-time, spread across 40+ practice days.':
    '5.000 domande in totale, distribuite in 40+ giorni di pratica.',
  '10,000 questions all-time, spread across 70+ practice days.':
    '10.000 domande in totale, distribuite in 70+ giorni di pratica.',
  '20,000 questions all-time, spread across 110+ practice days.':
    '20.000 domande in totale, distribuite in 110+ giorni di pratica.',
  '35,000 questions all-time, spread across 160+ practice days.':
    '35.000 domande in totale, distribuite in 160+ giorni di pratica.',
  '50,000 questions all-time, spread across 220+ practice days.':
    '50.000 domande in totale, distribuite in 220+ giorni di pratica.',
  // Sharpshooter
  'Hold 85% accuracy over at least 200 questions, across every instrument.':
    'Mantieni l’85% di precisione su almeno 200 domande, sommando tutti gli strumenti.',
  '88% accuracy over at least 500 questions.': '88% di precisione su almeno 500 domande.',
  '92% accuracy over at least 1,000 questions.': '92% di precisione su almeno 1.000 domande.',
  '93% accuracy over at least 2,500 questions, spread across 30+ practice days.':
    '93% di precisione su almeno 2.500 domande, distribuite in 30+ giorni di pratica.',
  '94% accuracy over at least 5,000 questions, spread across 60+ practice days.':
    '94% di precisione su almeno 5.000 domande, distribuite in 60+ giorni di pratica.',
  // Quick Read
  'Hold an average answer time under 2.0s over 200+ questions.':
    'Mantieni un tempo medio di risposta sotto i 2,0 s su 200+ domande.',
  'Under 1.6s over 500+ questions.': 'Sotto 1,6 s su 500+ domande.',
  'Under 1.3s over 1,000+ questions.': 'Sotto 1,3 s su 1.000+ domande.',
  'Under 1.15s over 2,500+ questions, spread across 30+ practice days.':
    'Sotto 1,15 s su 2.500+ domande, distribuite in 30+ giorni di pratica.',
  'Under 1.05s over 5,000+ questions, spread across 60+ practice days.':
    'Sotto 1,05 s su 5.000+ domande, distribuite in 60+ giorni di pratica.',
  // Most Improved
  'Over 10+ practice days, lift your accuracy by 20 points from your first days to your latest.':
    'In 10+ giorni di pratica, alza la tua precisione di 20 punti dai primi giorni ai più recenti.',
  'Over 15+ practice days, lift your accuracy by 30 points.':
    'In 15+ giorni di pratica, alza la tua precisione di 30 punti.',
  'Over 20+ practice days, lift your accuracy by 40 points.':
    'In 20+ giorni di pratica, alza la tua precisione di 40 punti.',
  // Doubling Up
  'Earn String Master on every string of both guitar and bass.':
    'Ottieni Maestro della corda su tutte le corde, sia alla chitarra sia al basso.',
  'Earn Full String Master — Silver on both guitar and bass.':
    'Ottieni Maestro di tutte le corde — Argento, sia alla chitarra sia al basso.',
  'Earn Full String Master — Gold and Neck Runner — Gold on both guitar and bass.':
    'Ottieni Maestro di tutte le corde — Oro e Corridore del manico — Oro, sia alla chitarra sia al basso.',
  'Earn Full String Master — Platinum and Neck Runner — Platinum on both guitar and bass.':
    'Ottieni Maestro di tutte le corde — Platino e Corridore del manico — Platino, sia alla chitarra sia al basso.',
  'Earn Full String Master — Diamond and Neck Runner — Diamond on both guitar and bass.':
    'Ottieni Maestro di tutte le corde — Diamante e Corridore del manico — Diamante, sia alla chitarra sia al basso.',
  // Multi-Instrumentalist
  'Earn Full String Master — Silver on 2 different instruments.':
    'Ottieni Maestro di tutte le corde — Argento su 2 strumenti diversi.',
  'Earn Full String Master — Silver on 3 different instruments.':
    'Ottieni Maestro di tutte le corde — Argento su 3 strumenti diversi.',
  'Earn Full String Master — Gold on 4 different instruments.':
    'Ottieni Maestro di tutte le corde — Oro su 4 strumenti diversi.',
  'Earn Full String Master — Gold on all 5 instruments.':
    'Ottieni Maestro di tutte le corde — Oro su tutti e 5 gli strumenti.',
  'Earn Full String Master — Platinum on all 5 instruments.':
    'Ottieni Maestro di tutte le corde — Platino su tutti e 5 gli strumenti.',
  // Admin (role)
  'Granted to app administrators — read every Feedback board post, not just your own.':
    'Assegnata agli amministratori dell’app — permette di leggere tutti i messaggi della bacheca dei suggerimenti, non solo i tuoi.',
  // Guest-merge prompt — first sign-in on a device with local guest history
  'Add this device’s progress to your account?':
    'Aggiungere i progressi di questo dispositivo al tuo account?',
  'You’ve practiced on this device without an account. Add that progress to your account, or keep only what’s already on your account?':
    'Ti sei esercitato su questo dispositivo senza account. Vuoi aggiungere quei progressi al tuo account o tenere solo quello che c’è già?',
  'Merge my progress': 'Unisci i miei progressi',
  'Use account only': 'Usa solo l’account',
  'Leave this practice off your account?': 'Lasciare questa pratica fuori dal tuo account?',
  'You have {n} rounds of practice saved on this device. If you continue, they stay on this device but are not added to your account.':
    'Hai {n} round di pratica salvati su questo dispositivo. Se continui, restano su questo dispositivo ma non vengono aggiunti al tuo account.',
  // VoiceCalibration
  'Voice calibration': 'Calibrazione vocale',
  'Personal voice calibration': 'Calibrazione vocale personale',
  'Profile name': 'Nome del profilo',
  'Say just this word, on its own': 'Di’ solo questa parola, da sola',
  'Say just the note name, on its own': 'Di’ solo il nome della nota, da solo',
  'Speak clearly and pause briefly between words — later, when answering, say the letter, pause, then “sharp” / “flat” as two separate words.':
    'Parla chiaramente e fai una breve pausa tra le parole — poi, quando rispondi, di’ la lettera, fai una pausa e poi “sharp” / “flat” come due parole separate.',
  'Could not use the microphone — try again': 'Impossibile usare il microfono — riprova',
  'No sound captured — try again, closer to the mic':
    'Nessun suono rilevato — riprova, più vicino al microfono',
  'Recording too short — try again': 'Registrazione troppo breve — riprova',
  "That didn't sound like a note — try again": 'Non sembrava una nota — riprova',
  'Saving the recording failed': 'Impossibile salvare la registrazione',
  'Recorded': 'Registrate',
  'notes': 'note',
  'accidentals': 'alterazioni',
  'Say:': 'Di’:',
  'Play last recording': 'Riproduci l’ultima registrazione',
  'Export recordings to a folder (dev)': 'Esporta le registrazioni in una cartella (dev)',
  'Stop exporting recordings': 'Interrompi l’esportazione delle registrazioni',
  'Every accepted take is also saved as a WAV, named for scripts/eval-voice.mts.':
    'Ogni ripresa accettata viene salvata anche come WAV, con il nome atteso da scripts/eval-voice.mts.',
  'Could not write to the export folder — pick it again':
    'Impossibile scrivere nella cartella di esportazione — sceglila di nuovo',
  'Speak the word on screen — calibration advances on its own':
    'Di’ la parola sullo schermo — la calibrazione avanza da sola',
  'Take': 'Ripresa',
  'Previous': 'Precedente',
  'Next': 'Successivo',
  'Delete profile': 'Elimina profilo',
  'Reset automatic learning of the general mode': 'Azzera l’apprendimento automatico della modalità generale',
  'Checking recordings…': 'Controllo delle registrazioni…',
  'Self-test recordings': 'Autotest delle registrazioni',
  'All words are distinct enough — looks good.': 'Tutte le parole sono abbastanza distinte — va bene.',
  'Finish & enable': 'Termina e attiva',
  '“{a}” and “{b}” sound very similar — re-record one of them.':
    '“{a}” e “{b}” suonano troppo simili — registra di nuovo uno dei due.',
  'Recording extra takes to tell “{a}” and “{b}” apart':
    'Registrazione di riprese extra per distinguere “{a}” da “{b}”',
  'No recordings for “{prompt}” yet': 'Ancora nessuna registrazione per “{prompt}”',
  'Delete take {n} of {prompt}': 'Elimina la ripresa {n} di {prompt}',
  'Record {n} more takes for “{a}” and “{b}”': 'Registra altre {n} riprese per “{a}” e “{b}”',
  'to go': 'mancanti',
  // VoiceLevelMeter
  'Microphone level good': 'Livello del microfono buono',
  'Microphone level low, speak louder': 'Livello del microfono basso, parla più forte',
  'Good level': 'Livello buono',
  'Too quiet — speak up': 'Troppo basso — parla più forte',
  // DebugLogPanel
  'Debug log': 'Registro di debug',
  'Open debug log': 'Apri il registro di debug',
  'Errors + voice · auto-clears daily': 'Errori + voce · si svuota ogni giorno',
  'Errors · auto-clears daily': 'Errori · si svuota ogni giorno',
  'Voice: on': 'Voce: attiva',
  'Voice: off': 'Voce: disattivata',
  'Copied': 'Copiato',
  'Copy': 'Copia',
  'Clear': 'Svuota',
  'Close': 'Chiudi',
  '(no errors)': '(nessun errore)',
  // FeedbackBoard
  'Couldn’t load the board. Check your connection and try again.':
    'Impossibile caricare la bacheca. Controlla la connessione e riprova.',
  'Couldn’t send that. Check your connection and try again.':
    'Impossibile inviare. Controlla la connessione e riprova.',
  'Sign in with Google to leave a comment, idea, or suggestion. Only admins can read the full board.':
    'Accedi con Google per lasciare un commento, un’idea o un suggerimento. Solo gli amministratori possono leggere l’intera bacheca.',
  'Microphone access is off — turn it on to dictate.':
    'L’accesso al microfono è disattivato — attivalo per dettare.',
  'Voice typing isn’t available on this device.':
    'La dettatura vocale non è disponibile su questo dispositivo.',
  'Couldn’t hear that — try again.': 'Non ho sentito — riprova.',
  'What’s on your mind?': 'Cosa vuoi dirci?',
  'Stop voice typing': 'Ferma la dettatura vocale',
  'Start voice typing': 'Avvia la dettatura vocale',
  'Sending…': 'Invio…',
  'Send': 'Invia',
  'Listening… say one sentence — it stops on its own.': 'In ascolto… di’ una frase — si ferma da solo.',
  'Thanks — your message was sent.': 'Grazie — il tuo messaggio è stato inviato.',
  'Unknown': 'Sconosciuto',
  'You': 'Tu',
  'Handled': 'Gestito',
  'Mark unhandled': 'Segna come da gestire',
  'Mark handled': 'Segna come gestito',
  'Delete': 'Elimina',
  'You haven’t sent anything yet.': 'Non hai ancora inviato niente.',
  'Share a comment, idea, or suggestion. Admins read every post; below you can see the ones you’ve sent.':
    'Condividi un commento, un’idea o un suggerimento. Gli amministratori leggono ogni messaggio; qui sotto vedi quelli che hai inviato.',
  'Write': 'Scrivi',
  'Inbox': 'Posta in arrivo',
  'Post a comment, idea, or suggestion of your own.': 'Pubblica un tuo commento, idea o suggerimento.',
  'Every post from every user': 'Tutti i messaggi di tutti gli utenti',
  'still to handle': 'da gestire',
  'Mark one handled once you’ve dealt with it, or delete it.':
    'Segna un messaggio come gestito quando l’hai risolto, oppure eliminalo.',
  'No posts yet.': 'Ancora nessun messaggio.',
  'Nothing open — all caught up.': 'Niente in sospeso — tutto in pari.',
  'Delete post': 'Elimina messaggio',
  'Delete this post?': 'Eliminare questo messaggio?',
  'This permanently removes it for everyone, including':
    'Verrà eliminato definitivamente per tutti, compreso',
  'the author': 'l’autore',
  'It can’t be undone.': 'Non si può annullare.',
  'Delete for everyone': 'Elimina per tutti',
  // Quick Access — the floating home-screen control, its Settings row and pushpins
  'Quick access': 'Accesso rapido',
  'A floating button on the home screen for the settings you flip most. Pin up to 5 with the pushpins below, then double-tap the lower-right of the screen outside a drill to open it.':
    'Un pulsante mobile nella schermata iniziale per le impostazioni che cambi più spesso. Fissane fino a 5 con le puntine qui sotto, poi tocca due volte l’angolo in basso a destra dello schermo, fuori da un esercizio, per aprirlo.',
  'Pin to quick access?': 'Fissare nell’accesso rapido?',
  'Remove from quick access?': 'Togliere dall’accesso rapido?',
  'You can pin up to {n} settings. Remove one first.':
    'Puoi fissare fino a {n} impostazioni. Prima togline una.',
  'Quick access is full': 'L’accesso rapido è pieno',
  'You already have {n} shortcuts. Remove one to make room?':
    'Hai già {n} scorciatoie. Toglierne una per fare spazio?',
  'Remove one': 'Togline una',
  'Leave as is': 'Lascia così',
  'Remove a quick access shortcut': 'Togli una scorciatoia dall’accesso rapido',
  'Quick access holds five shortcuts. Remove one to make room.':
    'L’accesso rapido contiene cinque scorciatoie. Togline una per fare spazio.',
  'Remove {name} from quick access': 'Togli {name} dall’accesso rapido',
  'Yes': 'Sì',
  'No': 'No',
  'Double-tap the lower-right of the screen for quick access':
    'Tocca due volte l’angolo in basso a destra dello schermo per l’accesso rapido',
  'Double-tap the lower-left of the screen for quick access':
    'Tocca due volte l’angolo in basso a sinistra dello schermo per l’accesso rapido',
  'Quick access is off': 'L’accesso rapido è disattivato',
  "You haven't pinned any quick access shortcuts yet":
    'Non hai ancora fissato nessuna scorciatoia nell’accesso rapido',
  'What do the icons mean?': 'Cosa significano le icone?',
  'Quick access symbol legend': 'Legenda dei simboli dell’accesso rapido',
  'What each icon on the Quick Access widget means. Tapping a pinned shortcut cycles through these states in order.':
    'Cosa significa ogni icona dell’accesso rapido. Toccando una scorciatoia fissata si passa da uno stato all’altro in quest’ordine.',
  'Letters (A B C)': 'Lettere (A B C)',
  'Solfège (Do Re Mi)': 'Solfeggio (Do Re Mi)',
  'Sharps (♯)': 'Diesis (♯)',
  'Flats (♭)': 'Bemolle (♭)',
  // Tuner — the Learn-tab tile that opens a live chromatic tuner
  'Tuner': 'Accordatore',
  'Tune your strings using the microphone.': 'Accorda le corde con il microfono.',
  'Start listening': 'Inizia ad ascoltare',
  'Requesting microphone permission…': 'Richiesta del permesso per il microfono…',
  'Microphone access was denied. Allow it in your browser settings, then try again.':
    'L’accesso al microfono è stato negato. Consentilo nelle impostazioni del browser, poi riprova.',
  'Try again': 'Riprova',
  "Couldn't start the microphone.": 'Impossibile avviare il microfono.',
  'Listening… play a note.': 'In ascolto… suona una nota.',
  "Tap a note on the wheel to lock it as the string you're tuning. Tap it again to switch back to auto-detect.":
    'Tocca una nota sulla ruota per fissarla come la corda che stai accordando. Toccala di nuovo per tornare al rilevamento automatico.',
  'Tuning': 'Accordatura',
  'Detected': 'Rilevata',
  'String {n}': 'Corda {n}',
  'or': 'o',
  'Unpin': 'Sblocca',
  "Tap to lock this note at 12 o'clock": 'Tocca per fissare questa nota in alto, a ore 12',
  'Tap to unpin': 'Tocca per sbloccarla',
  'In tune': 'Intonata',
  'Tighten (raise pitch)': 'Tendi (alza l’intonazione)',
  'Loosen (lower pitch)': 'Allenta (abbassa l’intonazione)',
  '~{pct}% of the audible threshold': '~{pct}% della soglia udibile',
};
