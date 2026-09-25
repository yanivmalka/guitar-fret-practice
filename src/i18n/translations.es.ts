// Spanish (es) dictionary, keyed by the English source string like `he` in
// translations.ts. Neutral Spanish, addressing the player as "tú" (works for
// Spain and Latin America). Landing in stages: this first stage covers the app
// shell, settings, the drawer, the in-game screen, the Selector, Onboarding,
// Stats, the Leaderboard and the plan card. Everything not listed here falls
// back to English until a later stage adds it (see product-wishlist.md).

export const es: Record<string, string> = {
  // Instrument / title
  'Guitar': 'Guitarra',
  'Bass': 'Bajo',
  'Fret Practice': 'Práctica de trastes',

  // Instrument picker — roadmap instruments (admin-only "coming soon" tiles)
  'Coming soon': 'Próximamente',
  'Ukulele': 'Ukelele',
  'Mandolin': 'Mandolina',
  'Banjo': 'Banjo',

  // Settings — section titles / labels / help
  'Instrument': 'Instrumento',
  'Playing': 'Práctica',
  'Instruments': 'Instrumentos',
  'Strings': 'Cuerdas',
  'Frets': 'Trastes',
  'Type': 'Tipo',
  'Acoustic': 'Acústica',
  'Electric': 'Eléctrica',
  'Soprano': 'Soprano',
  'Concert': 'Concierto',
  'Tenor': 'Tenor',
  'Baritone': 'Barítono',
  '5-String Standard': '5 cuerdas · estándar',
  '5-String Parlor': '5 cuerdas · parlor',
  '5-String Long Neck': '5 cuerdas · mástil largo',
  '4-String Tenor (Irish, short scale)': '4 cuerdas · tenor (irlandés, escala corta)',
  '4-String Tenor': '4 cuerdas · tenor',
  '4-String Plectrum': '4 cuerdas · plectro',
  '6-String (Guitar-Banjo)': '6 cuerdas · guitarra-banjo',
  'Notes': 'Notas',
  'Switches tuning, string count and fret range, then reloads the note samples.':
    'Cambia la afinación, el número de cuerdas y el rango de trastes, y luego vuelve a cargar los sonidos de las notas.',
  'Note names': 'Nombres de las notas',
  'Written as': 'Escritas como',
  "Display only — the drill itself doesn't change.":
    'Solo cambia cómo se muestran — el ejercicio no cambia.',
  'Letters (A, B, C…) or solfège syllables (Do, Re, Mi…).':
    'Letras (A, B, C…) o sílabas de solfeo (Do, Re, Mi…).',
  'A sharp (♯) is a half-step higher; a flat (♭) is a half-step lower. The same pitch can be written either way — C♯ and D♭ are one note. Pick which sign you see.':
    'Un sostenido (♯) es un semitono más agudo; un bemol (♭) es un semitono más grave. La misma altura se puede escribir de las dos formas — C♯ y D♭ son la misma nota. Elige qué signo quieres ver.',
  'A dièse (♯) is a half-step higher; a bémol (♭) is a half-step lower. The same pitch can be written either way — Do♯ and Re♭ are one note. Pick which sign you see.':
    'Un sostenido (♯) es un semitono más agudo; un bemol (♭) es un semitono más grave. La misma altura se puede escribir de las dos formas — Do♯ y Re♭ son la misma nota. Elige qué signo quieres ver.',
  'Sharps or flats': 'Sostenidos o bemoles',
  'Sharp (♯)': 'Sostenido (♯)',
  'Flat (♭)': 'Bemol (♭)',
  'Dièse (♯)': 'Sostenido (♯)',
  'Bémol (♭)': 'Bemol (♭)',
  'Score': 'Puntuación',
  'Score & celebrations': 'Puntuación y celebraciones',
  'Live score, streak multiplier and celebrations are shown.':
    'Se muestran la puntuación en vivo, el multiplicador de racha y las celebraciones.',
  'Every answer is still recorded to your stats and personal bests either way.':
    'En cualquier caso, cada respuesta se sigue guardando en tus estadísticas y récords personales.',
  'On': 'Activado',
  'Off': 'Desactivado',
  'Silent mode': 'Modo silencio',
  'Sound & vibration': 'Sonido y vibración',
  'Sound': 'Sonido',
  'Vibrate': 'Vibración',
  'Silent': 'Silencio',
  'How the drill answers back, on one ladder from quietest to loudest. Silent: no sound and no per-button buzz, just a buzz on right / wrong answers plus the on-screen celebrations. Vibrate: no sound — a buzz on every button press and on right / wrong answers instead. Sound 1–5: note playback, chimes and tap sounds, louder each step; the limiter keeps even the loudest from distorting. Silent and Vibrate are great for practising with headphones off or a guitar in hand.':
    'Cómo te responde el ejercicio, en una escala de lo más silencioso a lo más fuerte. Silencio: sin sonido ni vibración al pulsar botones, solo una vibración en las respuestas correctas / incorrectas y las celebraciones en pantalla. Vibración: sin sonido — en su lugar, una vibración en cada pulsación y en las respuestas correctas / incorrectas. Sonido 1–5: la nota, los avisos y los sonidos de toque, más fuertes en cada nivel; el limitador evita la distorsión incluso en el más alto. Silencio y Vibración son ideales para practicar sin auriculares o con la guitarra en la mano.',
  'Theme': 'Tema',
  'Dark': 'Oscuro',
  'Night': 'Noche',
  'Day': 'Día',
  'Night is a warmer, dimmer palette for a dark room. Day is a light palette.':
    'Noche es una paleta más cálida y tenue para una habitación oscura. Día es una paleta clara.',
  'Appearance': 'Apariencia',
  'Theme sets how light or dark the app is: Night is a warmer, dimmer palette for a dark room, Day is a light one. Season sets the colours layered over it — Winter is the original look. Auto follows your clock (Day from 07:00 to 19:00, Night after) and the real season where you are; picking a season by hand holds until that season ends.':
    'El tema define lo clara u oscura que es la app: Noche es una paleta más cálida y tenue para una habitación oscura, y Día es una paleta clara. La estación define los colores que van encima — Invierno es el aspecto original. Automático sigue tu reloj (Día de 07:00 a 19:00, Noche después) y la estación real donde estás; si eliges una estación a mano, se mantiene hasta que esa estación termine.',
  'Season': 'Estación',
  'Winter': 'Invierno',
  'Spring': 'Primavera',
  'Summer': 'Verano',
  'Autumn': 'Otoño',
  'A seasonal colour palette layered over the theme. Winter is the original look.':
    'Una paleta de colores de temporada sobre el tema. Invierno es el aspecto original.',
  'Mastery on the fretboard': 'Dominio en el diapasón',
  'The per-note / per-fret accuracy bars drawn over the circle and grid while stopped or paused.':
    'Las barras de precisión por nota / por traste que se dibujan sobre el círculo y la cuadrícula cuando está detenido o en pausa.',
  'Mastery keeps being tracked and shows on the Stats screen either way.':
    'El dominio se sigue registrando y aparece en la pantalla de estadísticas en cualquier caso.',
  'Questions counted': 'Preguntas contadas',
  'How many of your most recent questions the mastery bars are computed from. Free accounts use the last 250.':
    'De cuántas de tus preguntas más recientes se calculan las barras de dominio. Las cuentas gratuitas usan las últimas 250.',
  'Choose how many recent questions the mastery bars are counted from':
    'Elige de cuántas preguntas recientes se calculan las barras de dominio',
  'Mastery time window': 'Periodo de dominio',
  'Point the mastery bars at a recent-question count, a single day, or a date range':
    'Calcula las barras de dominio a partir de un número de preguntas recientes, un solo día o un rango de fechas',
  'What slice of your history the mastery bars are computed from. Free accounts use the last 250 questions. Older history saved without a date is not counted for a specific day or range.':
    'De qué parte de tu historial se calculan las barras de dominio. Las cuentas gratuitas usan las últimas 250 preguntas. El historial antiguo guardado sin fecha no cuenta para un día o rango concreto.',
  'Recent': 'Recientes',
  'A day': 'Un día',
  'A range': 'Un rango',
  'From': 'Desde',
  'To': 'Hasta',
  'showing': 'mostrando',
  'showing last': 'mostrando las últimas',
  'showing all questions': 'mostrando todas las preguntas',
  'All': 'Todo',
  'Stats & progress': 'Estadísticas y progreso',
  'Answer mode': 'Modo de respuesta',
  'How you answer': 'Cómo respondes',
  'Voice mode asks for microphone permission the first time.':
    'El modo voz pide permiso para usar el micrófono la primera vez.',
  'Speak clearly and pause briefly between words — for sharp/flat notes, say the letter, pause, then “sharp” / “flat” as two separate words.':
    'Habla con claridad y haz una pausa breve entre palabras — para notas con sostenido/bemol, di la letra, haz una pausa y luego “sharp” / “flat” como dos palabras separadas.',
  'Tap': 'Tocar',
  'Voice': 'Voz',
  'Admin-only experiment: play the target note on your guitar instead of tapping. Only works for “by fret” questions — a played note can’t say which string it came from, so “by note” questions stay on tap.':
    'Experimento solo para administradores: toca la nota en tu guitarra en lugar de pulsarla. Solo funciona en las preguntas “por traste” — una nota tocada no indica de qué cuerda viene, así que las preguntas “por nota” siguen siendo por toque.',
  '🎸 Microphone blocked — enable it or switch to tap': '🎸 Micrófono bloqueado — actívalo o cambia a tocar',
  '🎸 Pitch detection isn’t available on this device — use tap': '🎸 La detección de altura no está disponible en este dispositivo — usa tocar',
  '🎸 Didn’t catch that': '🎸 No lo he captado',
  '🎸 Play the note on your guitar': '🎸 Toca la nota en tu guitarra',
  'Voice engine': 'Motor de voz',
  'Auto picks the best available. Personal uses your calibrated profile; General uses the built-in model.':
    'Automático elige el mejor disponible. Personal usa tu perfil calibrado; General usa el modelo integrado.',
  'Auto': 'Automático',
  'Personal': 'Personal',
  'General': 'General',
  'Your voice profile': 'Tu perfil de voz',
  'Calibrating your own voice improves recognition when answering by voice.':
    'Calibrar tu propia voz mejora el reconocimiento al responder por voz.',
  'recordings': 'grabaciones',
  'enabled': 'activado',
  'Add / review recordings': 'Añadir / revisar grabaciones',
  'Calibrate my voice': 'Calibrar mi voz',
  'Feedback board': 'Tablón de sugerencias',
  'Leaderboard': 'Clasificación',
  'Account': 'Cuenta',
  'Signed in': 'Sesión iniciada',
  'Keeps your preferences and data in sync across devices.':
    'Mantiene tus preferencias y datos sincronizados entre dispositivos.',
  'Sign out': 'Cerrar sesión',
  'Sign in with Google to keep your preferences and data across devices.':
    'Inicia sesión con Google para conservar tus preferencias y datos en todos tus dispositivos.',
  'Sign in with Google': 'Iniciar sesión con Google',

  // Account → About tile + live community counts
  'About': 'Acerca de',
  'Guitar Fret Practice is a small labor of love — built to turn learning the fretboard into a game instead of a chore. Made by an independent developer, with patient help from family and friends.':
    'Guitar Fret Practice es un pequeño proyecto hecho con cariño — creado para que aprender el diapasón sea un juego y no una obligación. Hecho por un desarrollador independiente, con la paciente ayuda de familia y amigos.',
  'Registered users': 'Usuarios registrados',
  'Active now': 'Activos ahora',
  'Guests online': 'Invitados en línea',
  'See the full list and what earns each one': 'Ver la lista completa y cómo se gana cada una',
  'Badges': 'Insignias',
  'Language': 'Idioma',
  'Left-handed': 'Zurdo',
  'Button depth': 'Relieve de los botones',
  'Gives the buttons a raised, 3D look: a light rim on top, a solid edge underneath, and they sink a little when pressed. Off keeps them flat.':
    'Da a los botones un aspecto en relieve, en 3D: un borde claro arriba, un canto sólido abajo, y se hunden un poco al pulsarlos. Desactivado los deja planos.',
  'Mirrors the app for a left-handed player: the fretboard flips (nut on the right), and the menu, Quick Access and back buttons move to the left. Independent of language — it stays mirrored in Hebrew too.':
    'Refleja la app para quien toca con la mano izquierda: el diapasón se invierte (la cejuela a la derecha) y el menú, el Acceso rápido y los botones de volver pasan a la izquierda. Es independiente del idioma — también queda reflejada en hebreo.',
  'Colour-blind heatmap markers': 'Marcas del mapa de calor para daltonismo',
  'Adds a ✓ / • mark on the Stats-screen fretboard heatmap cells, on top of colour, so known vs. needs-work reads without relying on hue.':
    'Añade una marca ✓ / • en las celdas del mapa de calor del diapasón en Estadísticas, además del color, para distinguir lo dominado de lo que necesita práctica sin depender del tono.',

  // Hamburger drawer / dialogs
  'Settings': 'Ajustes',
  'Close settings': 'Cerrar ajustes',
  'Open settings': 'Abrir ajustes',
  'Game settings': 'Ajustes del juego',
  'Back': 'Atrás',
  'Microphone access': 'Acceso al micrófono',
  'Answer out loud': 'Responde en voz alta',
  'Voice mode listens for the note or fret you say instead of a tap.':
    'El modo voz escucha la nota o el traste que dices en lugar de un toque.',
  'Your browser will ask to use the microphone next — audio stays on your device and is never recorded or uploaded.':
    'A continuación tu navegador pedirá usar el micrófono — el audio se queda en tu dispositivo y nunca se graba ni se sube.',
  'Allow microphone': 'Permitir micrófono',
  'Not now': 'Ahora no',
  'Microphone is blocked': 'El micrófono está bloqueado',
  "Your browser is refusing microphone access for this site, so voice answers can't work yet. Tap the 🔒 / 🎤 icon beside the address bar, set the microphone to":
    'Tu navegador está bloqueando el micrófono para este sitio, así que las respuestas por voz aún no funcionan. Toca el icono 🔒 / 🎤 junto a la barra de direcciones y pon el micrófono en',
  ', then reload the page.': ', y luego recarga la página.',
  'Allow': 'Permitir',
  'Got it': 'Entendido',
  'Use tap instead': 'Usar tocar',
  'Sign in': 'Iniciar sesión',
  'Save your progress': 'Guarda tu progreso',
  'Sign in to keep your history, badges and personal bests across devices. You can keep playing as a guest — everything still works, it just stays on this device.':
    'Inicia sesión para conservar tu historial, tus insignias y tus récords personales en todos tus dispositivos. Puedes seguir jugando como invitado — todo funciona igual, pero se queda en este dispositivo.',
  'Maybe later': 'Quizás más tarde',
  'Press back again to exit': 'Pulsa atrás otra vez para salir',

  // In-game
  'STAGE COMPLETE': 'NIVEL COMPLETADO',
  'Retry': 'Reintentar',
  '🎤 Microphone blocked — enable it or switch to tap': '🎤 Micrófono bloqueado — actívalo o cambia a tocar',
  '🎤 Voice needs a connection': '🎤 La voz necesita conexión',
  '🎤 Voice isn’t working in this browser — try Chrome, or use tap':
    '🎤 La voz no funciona en este navegador — prueba Chrome o usa tocar',
  '🎤 Didn’t catch that': '🎤 No lo he captado',
  'Round Complete!': '¡Ronda completada!',
  'pts': 'pts',
  'OK': 'Aceptar',
  'Start': 'Empezar',
  'Resume': 'Continuar',
  'Pause': 'Pausa',
  'Stop': 'Detener',
  'Refresh': 'Actualizar',
  'Privacy policy': 'Política de privacidad',

  'QUESTIONS': 'PREGUNTAS',
  'streak': 'racha',
  'New badge': 'Nueva insignia',
  'Badge upgraded': 'Insignia mejorada',
  'Continue': 'Continuar',
  'Listening…': 'Escuchando…',
  'Member since': 'Miembro desde',
  'badges earned': 'insignias ganadas',

  // Pinned badge shelf (Account section)
  'Choose badges to feature': 'Elige insignias para destacar',
  'Edit featured badges': 'Editar insignias destacadas',
  'Your badges': 'Tus insignias',
  'Feature up to 5 badges': 'Destaca hasta 5 insignias',
  'Remove a badge to feature another.': 'Quita una insignia para destacar otra.',
  'See all badges': 'Ver todas las insignias',

  // LeaderboardPanel — standings sub-page
  'player': 'jugador',
  'players': 'jugadores',
  'ranked by XP': 'ordenado por XP',
  'free for everyone': 'gratis para todos',
  'All-time': 'Histórico',
  'This week': 'Esta semana',
  'Loading…': 'Cargando…',
  'Couldn’t load the leaderboard. Check your connection and try again.':
    'No se pudo cargar la clasificación. Comprueba tu conexión e inténtalo de nuevo.',
  'Couldn’t update that. Check your connection and try again.':
    'No se pudo actualizar. Comprueba tu conexión e inténtalo de nuevo.',
  'Your standing': 'Tu posición',
  'RANK': 'PUESTO',
  'acc': 'prec.',
  '(you)': '(tú)',
  'Hidden from the leaderboard': 'Oculto en la clasificación',
  'Visible on the leaderboard': 'Visible en la clasificación',
  'Join the board': 'Únete a la clasificación',
  'You can see every player’s standing right now. Sign in with Google to take your own place — every correct answer you’ve ever played counts. Free, no subscription.':
    'Ya puedes ver la posición de cada jugador. Inicia sesión con Google para ocupar tu lugar — cuenta cada respuesta correcta que hayas dado. Gratis, sin suscripción.',
  'No one’s on the board yet': 'Todavía no hay nadie en la clasificación',
  'Finish a practice run while signed in and your name lands here first.':
    'Termina una sesión de práctica con la sesión iniciada y tu nombre aparecerá aquí el primero.',
  'How is XP counted?': '¿Cómo se cuenta la XP?',

  // SelectorPanel — mode/difficulty/fret-range picker
  'all': 'las',
  'strings': 'cuerdas',
  'frets': 'trastes',
  'only the dot-marker frets': 'solo los trastes con marca de punto',
  'natural notes only (no sharps or flats)': 'solo notas naturales (sin sostenidos ni bemoles)',
  'every note, sharps and flats included': 'todas las notas, con sostenidos y bemoles',
  'alphabetical order': 'orden alfabético',
  'circle-of-fifths order': 'orden del círculo de quintas',
  'A fret lights up and you pick its note from the wheel':
    'Se ilumina un traste y eliges su nota en la rueda',
  ', rotated to the string': ', girada según la cuerda',
  'A note name is shown and you tap every fret on the neck where it lands.':
    'Aparece el nombre de una nota y tocas cada traste del mástil donde se encuentra.',
  'Note-by-Fret': 'Nota por traste',
  'Fret-by-Note': 'Traste por nota',
  'Auto-advances through the difficulty stages.': 'Avanza automáticamente por los niveles de dificultad.',
  'How this works': 'Cómo funciona',
  'neck': 'mástil',
  'neck fret range selector': 'selector del rango de trastes del mástil',
  'Precise fret range': 'Rango de trastes preciso',
  'Pick an exact fret N–M window to drill': 'Elige un rango exacto de trastes N–M para practicar',
  'Fret range': 'Rango de trastes',
  'Full only while a precise fret window is on': 'Solo Completo mientras haya un rango de trastes preciso',
  'Drill only part of the neck. Drag the handles to set the exact fret window — the shaded area is muted out, both here and on the home-screen neck.':
    'Practica solo una parte del mástil. Arrastra los tiradores para fijar el rango exacto de trastes — la zona sombreada queda fuera, tanto aquí como en el mástil de la pantalla principal.',
  'Lowest fret': 'Traste más bajo',
  'Highest fret': 'Traste más alto',
  'Multi': 'Varias',
  'Note by Fret': 'Nota por traste',
  'Alpha': 'Alfabético',
  'Fifths': 'Quintas',
  'By String': 'Por cuerda',
  'Fret by Note': 'Traste por nota',
  "Read the note wheel like a clock: your open string sits at 12 o'clock, and the dots under each note show its fret. Answer before the timing bar empties.":
    'Lee la rueda de notas como un reloj: tu cuerda al aire está en las 12 y los puntos bajo cada nota indican su traste. Responde antes de que se vacíe la barra de tiempo.',
  'Answer before the timing bar empties.': 'Responde antes de que se vacíe la barra de tiempo.',
  'Dots': 'Puntos',
  'Naturals': 'Naturales',
  'Full': 'Completo',
  'Auto Advance to next difficulty': 'Avance automático a la siguiente dificultad',

  // Onboarding
  'Guitar Fret Practice': 'Guitar Fret Practice',
  'Master the fretboard with the clock method — one string at a time.':
    'Domina el diapasón con el método del reloj — una cuerda cada vez.',
  'What do you play?': '¿Qué tocas?',
  'Skip setup →': 'Omitir configuración →',
  'How well do you know the fretboard?': '¿Cuánto conoces el diapasón?',
  "I'm just starting": 'Estoy empezando',
  'Start with dot frets on String 6': 'Empieza con los trastes de punto en la cuerda 6',
  'I play but want to improve': 'Toco, pero quiero mejorar',
  'Quick 3-question test': 'Prueba rápida de 3 preguntas',
  'I know the full neck': 'Conozco todo el mástil',
  'Jump right in': 'Empieza ya',
  'Skip →': 'Omitir →',
  'String': 'Cuerda',
  'what note is fret': 'qué nota es el traste',
  'Skip test →': 'Omitir prueba →',
  'Keep going!': '¡Sigue así!',
  'Good start!': '¡Buen comienzo!',
  'Nice work!': '¡Buen trabajo!',
  'Impressive!': '¡Impresionante!',
  'Dot Frets': 'Trastes de punto',
  'Natural notes': 'Notas naturales',
  'the full chromatic neck': 'todo el mástil cromático',
  "correct — we've set you up on": 'correctas — te hemos configurado en',
  'Change it anytime in the selector panel.': 'Puedes cambiarlo cuando quieras en el panel de selección.',
  "Let's go →": '¡Vamos! →',

  // ProgressPanel — stats & progress screen
  'by note': 'por nota',
  'by fret': 'por traste',
  'fret': 'traste',
  'not played': 'sin tocar',
  'known': 'dominada',
  'needs work': 'por practicar',
  'unplayed': 'sin tocar',
  'Not enough data yet.': 'Todavía no hay suficientes datos.',
  'Not practiced yet': 'Aún sin practicar',
  'Older sessions have no date stamp, so the timeline is empty. New sessions fill it in.':
    'Las sesiones antiguas no tienen fecha, así que la línea de tiempo está vacía. Las sesiones nuevas la irán llenando.',
  'Play a few rounds and your all-time progress shows up here.':
    'Juega algunas rondas y aquí aparecerá tu progreso total.',
  'accuracy': 'precisión',
  'day streak': 'días de racha',
  'answered': 'respondidas',
  'Weakest notes': 'Notas más débiles',
  'Nothing below 70% — nice.': 'Nada por debajo del 70% — ¡bien!',
  'By note': 'Por nota',
  'By string': 'Por cuerda',
  'By fret': 'Por traste',
  'Fretboard heatmap': 'Mapa de calor del diapasón',
  'Daily timeline': 'Línea de tiempo diaria',
  'Accuracy %': '% de precisión',
  'Avg response time': 'Tiempo medio de respuesta',
  'Personal bests': 'Récords personales',
  'No personal bests recorded yet.': 'Todavía no hay récords personales.',
  'No practice in the last 7 days.': 'Sin práctica en los últimos 7 días.',
  'All time': 'Histórico',
  'Last 7 days': 'Últimos 7 días',
  'across every': 'en cada',
  'settings combination': 'combinación de ajustes',
  'Clear all history': 'Borrar todo el historial',
  'Clear all stats?': '¿Borrar todas las estadísticas?',
  'This permanently erases your entire practice history and resets the all-time mastery for every note, string and settings combination. Your personal bests are kept.':
    'Esto borra para siempre todo tu historial de práctica y reinicia el dominio histórico de cada nota, cuerda y combinación de ajustes. Tus récords personales se conservan.',
  "This can't be undone.": 'No se puede deshacer.',
  'Delete anyway': 'Borrar de todos modos',
  'Cancel': 'Cancelar',

  // Instrument string labels (guitar + bass, "String N · note")
  'String 1 · high E': 'Cuerda 1 · Mi agudo',
  'String 2 · B': 'Cuerda 2 · Si',
  'String 3 · G': 'Cuerda 3 · Sol',
  'String 4 · D': 'Cuerda 4 · Re',
  'String 5 · A': 'Cuerda 5 · La',
  'String 6 · low E': 'Cuerda 6 · Mi grave',
  'String 1 · G': 'Cuerda 1 · Sol',
  'String 2 · D': 'Cuerda 2 · Re',
  'String 3 · A': 'Cuerda 3 · La',
  'String 4 · low E': 'Cuerda 4 · Mi grave',

  // Free / Pro / Premium tiering — ProGate lock states + the Upgrade card
  'Premium': 'Premium',
  // Free-tier ad strip
  'Advertisement': 'Publicidad',
  'Ad': 'Anuncio',
  'Close ad': 'Cerrar anuncio',
  'Your ad could be here. Go Pro to remove ads.': 'Tu anuncio podría estar aquí. Pásate a Pro para quitar los anuncios.',
  'Unlock with Pro': 'Desbloquear con Pro',
  'Unlock with Premium': 'Desbloquear con Premium',
  'You have Pro': 'Tienes Pro',
  "You're on Free": 'Estás en el plan gratuito',
  'Your plan': 'Tu plan',
  'Included with Pro': 'Incluido con Pro',
  'Everything in Free, plus:': 'Todo lo del plan gratuito, y además:',
  'Everything you need to practice daily, at no cost.':
    'Todo lo que necesitas para practicar a diario, sin coste.',
  'The full fretboard drill — by note and by fret, on every string':
    'El ejercicio completo del diapasón — por nota y por traste, en todas las cuerdas',
  'Badges and achievements, with your pinned medal shelf':
    'Insignias y logros, con tu estante de medallas destacadas',
  'The leaderboard — XP, questions answered and accuracy':
    'La clasificación — XP, preguntas respondidas y precisión',
  'Cloud sync and full restore of your practice on every device':
    'Sincronización en la nube y restauración completa de tu práctica en cada dispositivo',
  'Your last 7 days of stats, plus the personal best for what you’re drilling':
    'Tus estadísticas de los últimos 7 días, más el récord personal de lo que estás practicando',
  'Free, forever': 'Gratis, para siempre',
  'Pro is for training seriously and tracking progress over time.':
    'Pro es para entrenar en serio y seguir tu progreso a lo largo del tiempo.',
  'Your full practice history — all-time stats and trends, not just the last 7 days':
    'Tu historial de práctica completo — estadísticas y tendencias de siempre, no solo de los últimos 7 días',
  'Mastery maps — per-note and per-fret accuracy overlays on the circle and grid':
    'Mapas de dominio — precisión por nota y por traste sobre el círculo y la cuadrícula',
  'Browse your personal bests across every settings combination':
    'Consulta tus récords personales en cada combinación de ajustes',
  'A personal voice profile built from your own calibration recordings':
    'Un perfil de voz personal creado con tus propias grabaciones de calibración',
  'Your Pro access is complimentary.': 'Tu acceso Pro es un obsequio.',
  'Your Pro access came from a promotion.': 'Tu acceso Pro viene de una promoción.',
  'Your Pro access was granted manually.': 'Tu acceso Pro se concedió manualmente.',
  'Your Pro access is from your subscription.': 'Tu acceso Pro viene de tu suscripción.',
  'Your Pro access is active.': 'Tu acceso Pro está activo.',
  'It does not expire.': 'No caduca.',
  'Access runs until': 'El acceso dura hasta el',
  'Pro isn’t on sale yet — everything above stays free to try in the meantime.':
    'Pro aún no está a la venta — mientras tanto, puedes probar gratis todo lo anterior.',
  'Free': 'Gratis',

  // Adaptive difficulty suggestion banner (wishlist §3)
  'You’re cruising through this — ready for a harder level?':
    'Esto te está resultando fácil — ¿listo para un nivel más difícil?',
  'This setup is fighting back. Want to ease off a level?':
    'Esta configuración se te resiste. ¿Quieres bajar un nivel?',
  'Switch the difficulty to': 'Cambiar la dificultad a',
  'Drop the difficulty to': 'Bajar la dificultad a',
  'Apply': 'Aplicar',
  'Dismiss': 'Descartar',

  // Learning-type navigation — the drawer's "Learn" group and its full pages
  'Learn': 'Aprender',
  'Choose what to practise.': 'Elige qué practicar.',
  'Current': 'Actual',
  'Daily practice': 'Práctica diaria',
  'Intervals': 'Intervalos',
  'Scales': 'Escalas',
  'Chords': 'Acordes',
  'Staff reading': 'Lectura de partitura',
  'Game': 'Juego',
  'Your daily plan is loading…': 'Cargando tu plan diario…',
  'Let the Teacher plan your practice': 'Deja que el Profesor planifique tu práctica',
  'Practise hearing and finding intervals': 'Practica a oír y encontrar intervalos',

  // Fret range conflict dialog
  'Fret range too small': 'Rango de trastes demasiado pequeño',
  'The current fret range': 'El rango de trastes actual',
  ' allows fewer than ': ' permite menos de ',
  ' unique notes': ' notas distintas',
  ' with the selected strings. Please expand the range.': ' con las cuerdas elegidas. Amplía el rango.',
  'Expand to minimum': 'Ampliar al mínimo',
  'I will expand': 'Lo ampliaré yo',
  'Custom range': 'Rango personalizado',
  'Keep as is': 'Dejarlo así',
  'Set fret range': 'Fijar rango de trastes',

  // ── Stage 2a: badges, guest merge, voice calibration, feedback board,
  // quick access and the tuner ──────────────────────────────────────────
  // Badges / Achievements wall — tiers
  'Bronze': 'Bronce',
  'Silver': 'Plata',
  'Gold': 'Oro',
  'Platinum': 'Platino',
  'Diamond': 'Diamante',
  'Master': 'Maestro',
  'Legendary I': 'Legendario I',
  'Legendary II': 'Legendario II',
  'Legendary III': 'Legendario III',
  'Legendary IV': 'Legendario IV',
  // Wall chrome
  'unlocked': 'desbloqueadas',
  'Max': 'Máx.',
  'Earned': 'Obtenida',
  // Admin test controls
  'Grant': 'Otorgar',
  'Reset': 'Restablecer',
  'Admin tools: Grant or Reset each badge to test it. History-based badges re-appear on reopen unless you also clear history.':
    'Herramientas de administrador: otorga o restablece cada insignia para probarla. Las insignias basadas en el historial reaparecen al volver a abrir, salvo que también borres el historial.',
  // Family names
  'Perfect Session': 'Sesión perfecta',
  'Speed Demon': 'Demonio de la velocidad',
  'Flawless Sprint': 'Sprint impecable',
  'On Fire': 'En llamas',
  'Comeback': 'Remontada',
  'Every String': 'Todas las cuerdas',
  'String Master': 'Maestro de la cuerda',
  'String Master · {s}': 'Maestro · {s}',
  'Full String Master': 'Maestro de todas las cuerdas',
  'Neck Runner': 'Corredor del mástil',
  'Both Ends': 'Ambos extremos',
  'Low End': 'Registro grave',
  'Week Warrior': 'Guerrero de la semana',
  'Dedicated': 'Constante',
  'Total Reps': 'Repeticiones totales',
  'Sharpshooter': 'Tirador de élite',
  'Quick Read': 'Lectura rápida',
  'Most Improved': 'El que más mejoró',
  'Doubling Up': 'Por partida doble',
  'Multi-Instrumentalist': 'Multiinstrumentista',
  'Admin': 'Administrador',
  // Earning conditions — Perfect Session
  'Answer 10+ questions in a round with no mistakes at all.':
    'Responde 10+ preguntas en una ronda sin ningún error.',
  '25+ questions in a round, still zero mistakes.': '25+ preguntas en una ronda, y sigue sin haber errores.',
  '50+ questions in a round, still zero mistakes — a full clean run.':
    '50+ preguntas en una ronda, y sigue sin haber errores — una ronda totalmente limpia.',
  // Speed Demon
  'Get 10+ correct answers in a round, at least 8 of them under 1.5s.':
    'Consigue 10+ respuestas correctas en una ronda, al menos 8 en menos de 1,5 s.',
  '20+ correct answers, at least 16 of them under 1.5s.':
    '20+ respuestas correctas, al menos 16 en menos de 1,5 s.',
  '40+ correct answers, at least 32 of them under 1.2s.':
    '40+ respuestas correctas, al menos 32 en menos de 1,2 s.',
  // Flawless Sprint
  'Finish a whole round at 90% accuracy or better.':
    'Termina una ronda completa con un 90% de precisión o más.',
  'Finish a whole round at 95% accuracy or better.':
    'Termina una ronda completa con un 95% de precisión o más.',
  'Finish a whole round at 100% accuracy.': 'Termina una ronda completa con un 100% de precisión.',
  // On Fire
  'Reach a streak of 15 in a single round.': 'Alcanza una racha de 15 en una sola ronda.',
  'Reach a streak of 20 in a single round.': 'Alcanza una racha de 20 en una sola ronda.',
  'Reach a streak of 30 in a single round.': 'Alcanza una racha de 30 en una sola ronda.',
  // Comeback
  'Miss 3+ of your first 20 questions, then answer the next 8 in a row correctly.':
    'Falla 3+ de tus primeras 20 preguntas y luego acierta las 8 siguientes seguidas.',
  'Miss 5+ of your first 20 questions, then answer the next 12 in a row correctly.':
    'Falla 5+ de tus primeras 20 preguntas y luego acierta las 12 siguientes seguidas.',
  'Miss 8+ of your first 20 questions, then answer the next 18 in a row correctly.':
    'Falla 8+ de tus primeras 20 preguntas y luego acierta las 18 siguientes seguidas.',
  // Every String
  'Finish a round that visited every string: 2x that many questions, 90% accuracy.':
    'Termina una ronda que pase por todas las cuerdas: el doble de preguntas que de cuerdas, 90% de precisión.',
  'Visited every string: 4x that many questions, 90% accuracy.':
    'Pasando por todas las cuerdas: 4 veces más preguntas que cuerdas, 90% de precisión.',
  'Visited every string: 6x that many questions, 95% accuracy.':
    'Pasando por todas las cuerdas: 6 veces más preguntas que cuerdas, 95% de precisión.',
  // Per-string String Master — {s} is the translated string label
  'Answer 40+ questions on {s} at 90% accuracy or better.':
    'Responde 40+ preguntas en {s} con un 90% de precisión o más.',
  '100+ questions on {s} at 92% accuracy or better.': '100+ preguntas en {s} con un 92% de precisión o más.',
  '200+ questions on {s} at 95% accuracy or better.': '200+ preguntas en {s} con un 95% de precisión o más.',
  '400+ questions on {s} at 96% accuracy or better, over 14+ practice days.':
    '400+ preguntas en {s} con un 96% de precisión o más, a lo largo de 14+ días de práctica.',
  '800+ questions on {s} at 97% accuracy or better, over 30+ practice days.':
    '800+ preguntas en {s} con un 97% de precisión o más, a lo largo de 30+ días de práctica.',
  // Full String Master
  'Earn String Master — Bronze on every string of this instrument.':
    'Consigue Maestro de la cuerda — Bronce en todas las cuerdas de este instrumento.',
  'Earn String Master — Silver on every string.':
    'Consigue Maestro de la cuerda — Plata en todas las cuerdas.',
  'Earn String Master — Gold on every string.': 'Consigue Maestro de la cuerda — Oro en todas las cuerdas.',
  'Earn String Master — Platinum on every string.':
    'Consigue Maestro de la cuerda — Platino en todas las cuerdas.',
  'Earn String Master — Diamond on every string.':
    'Consigue Maestro de la cuerda — Diamante en todas las cuerdas.',
  // Neck Runner
  'Answer at least one question on every fret of the neck.':
    'Responde al menos una pregunta en cada traste del mástil.',
  'Answer at least 3 questions on every fret of the neck.':
    'Responde al menos 3 preguntas en cada traste del mástil.',
  'Answer at least 5 questions on every fret of the neck.':
    'Responde al menos 5 preguntas en cada traste del mástil.',
  'Answer at least 10 questions on every fret, spread across 14+ practice days.':
    'Responde al menos 10 preguntas en cada traste, repartidas en 14+ días de práctica.',
  'Answer at least 20 questions on every fret, spread across 30+ practice days.':
    'Responde al menos 20 preguntas en cada traste, repartidas en 30+ días de práctica.',
  // Both Ends
  'Answer 40+ questions above the 12th fret at 85% accuracy or better.':
    'Responde 40+ preguntas por encima del traste 12 con un 85% de precisión o más.',
  '100+ questions above the 12th fret at 88% accuracy or better.':
    '100+ preguntas por encima del traste 12 con un 88% de precisión o más.',
  '200+ questions above the 12th fret at 92% accuracy or better.':
    '200+ preguntas por encima del traste 12 con un 92% de precisión o más.',
  '400+ questions above the 12th fret at 93% accuracy or better, over 14+ practice days.':
    '400+ preguntas por encima del traste 12 con un 93% de precisión o más, a lo largo de 14+ días de práctica.',
  '800+ questions above the 12th fret at 94% accuracy or better, over 30+ practice days.':
    '800+ preguntas por encima del traste 12 con un 94% de precisión o más, a lo largo de 30+ días de práctica.',
  // Low End
  'Answer 40+ questions on the bass low-E string at 90% accuracy or better.':
    'Responde 40+ preguntas en la cuerda Mi (E) grave del bajo con un 90% de precisión o más.',
  '100+ questions on the low-E string at 93% accuracy or better.':
    '100+ preguntas en la cuerda Mi (E) grave con un 93% de precisión o más.',
  '200+ questions on the low-E string at 96% accuracy or better.':
    '200+ preguntas en la cuerda Mi (E) grave con un 96% de precisión o más.',
  '400+ questions on the low-E string at 97% accuracy or better, over 14+ practice days.':
    '400+ preguntas en la cuerda Mi (E) grave con un 97% de precisión o más, a lo largo de 14+ días de práctica.',
  '800+ questions on the low-E string at 98% accuracy or better, over 30+ practice days.':
    '800+ preguntas en la cuerda Mi (E) grave con un 98% de precisión o más, a lo largo de 30+ días de práctica.',
  // Week Warrior
  'Practise on 5 separate days within a single 7-day window.':
    'Practica 5 días distintos dentro de un mismo periodo de 7 días.',
  '6 separate days within a single 7-day window.': '6 días distintos dentro de un mismo periodo de 7 días.',
  'All 7 days within a single 7-day window — a perfect week.':
    'Los 7 días de un mismo periodo de 7 días — una semana perfecta.',
  // Dedicated
  'Build a run of 7 consecutive practice days.': 'Encadena 7 días de práctica consecutivos.',
  '14 consecutive practice days.': '14 días de práctica consecutivos.',
  '30 consecutive practice days.': '30 días de práctica consecutivos.',
  '60 consecutive practice days.': '60 días de práctica consecutivos.',
  '90 consecutive practice days.': '90 días de práctica consecutivos.',
  '120 consecutive practice days.': '120 días de práctica consecutivos.',
  '180 consecutive practice days.': '180 días de práctica consecutivos.',
  '250 consecutive practice days.': '250 días de práctica consecutivos.',
  '300 consecutive practice days.': '300 días de práctica consecutivos.',
  '365 consecutive practice days — a full year, every day.':
    '365 días de práctica consecutivos — un año entero, todos los días.',
  // Total Reps
  'Answer 100 questions all-time, across every instrument.':
    'Responde 100 preguntas en total, sumando todos los instrumentos.',
  '250 questions all-time.': '250 preguntas en total.',
  '500 questions all-time.': '500 preguntas en total.',
  '1,000 questions all-time.': '1.000 preguntas en total.',
  '2,500 questions all-time, spread across 20+ practice days.':
    '2.500 preguntas en total, repartidas en 20+ días de práctica.',
  '5,000 questions all-time, spread across 40+ practice days.':
    '5.000 preguntas en total, repartidas en 40+ días de práctica.',
  '10,000 questions all-time, spread across 70+ practice days.':
    '10.000 preguntas en total, repartidas en 70+ días de práctica.',
  '20,000 questions all-time, spread across 110+ practice days.':
    '20.000 preguntas en total, repartidas en 110+ días de práctica.',
  '35,000 questions all-time, spread across 160+ practice days.':
    '35.000 preguntas en total, repartidas en 160+ días de práctica.',
  '50,000 questions all-time, spread across 220+ practice days.':
    '50.000 preguntas en total, repartidas en 220+ días de práctica.',
  // Sharpshooter
  'Hold 85% accuracy over at least 200 questions, across every instrument.':
    'Mantén un 85% de precisión en al menos 200 preguntas, sumando todos los instrumentos.',
  '88% accuracy over at least 500 questions.': 'Un 88% de precisión en al menos 500 preguntas.',
  '92% accuracy over at least 1,000 questions.': 'Un 92% de precisión en al menos 1.000 preguntas.',
  '93% accuracy over at least 2,500 questions, spread across 30+ practice days.':
    'Un 93% de precisión en al menos 2.500 preguntas, repartidas en 30+ días de práctica.',
  '94% accuracy over at least 5,000 questions, spread across 60+ practice days.':
    'Un 94% de precisión en al menos 5.000 preguntas, repartidas en 60+ días de práctica.',
  // Quick Read
  'Hold an average answer time under 2.0s over 200+ questions.':
    'Mantén un tiempo medio de respuesta por debajo de 2,0 s en 200+ preguntas.',
  'Under 1.6s over 500+ questions.': 'Por debajo de 1,6 s en 500+ preguntas.',
  'Under 1.3s over 1,000+ questions.': 'Por debajo de 1,3 s en 1.000+ preguntas.',
  'Under 1.15s over 2,500+ questions, spread across 30+ practice days.':
    'Por debajo de 1,15 s en 2.500+ preguntas, repartidas en 30+ días de práctica.',
  'Under 1.05s over 5,000+ questions, spread across 60+ practice days.':
    'Por debajo de 1,05 s en 5.000+ preguntas, repartidas en 60+ días de práctica.',
  // Most Improved
  'Over 10+ practice days, lift your accuracy by 20 points from your first days to your latest.':
    'A lo largo de 10+ días de práctica, sube tu precisión 20 puntos desde tus primeros días hasta los más recientes.',
  'Over 15+ practice days, lift your accuracy by 30 points.':
    'A lo largo de 15+ días de práctica, sube tu precisión 30 puntos.',
  'Over 20+ practice days, lift your accuracy by 40 points.':
    'A lo largo de 20+ días de práctica, sube tu precisión 40 puntos.',
  // Doubling Up
  'Earn String Master on every string of both guitar and bass.':
    'Consigue Maestro de la cuerda en todas las cuerdas, tanto en guitarra como en bajo.',
  'Earn Full String Master — Silver on both guitar and bass.':
    'Consigue Maestro de todas las cuerdas — Plata, tanto en guitarra como en bajo.',
  'Earn Full String Master — Gold and Neck Runner — Gold on both guitar and bass.':
    'Consigue Maestro de todas las cuerdas — Oro y Corredor del mástil — Oro, tanto en guitarra como en bajo.',
  'Earn Full String Master — Platinum and Neck Runner — Platinum on both guitar and bass.':
    'Consigue Maestro de todas las cuerdas — Platino y Corredor del mástil — Platino, tanto en guitarra como en bajo.',
  'Earn Full String Master — Diamond and Neck Runner — Diamond on both guitar and bass.':
    'Consigue Maestro de todas las cuerdas — Diamante y Corredor del mástil — Diamante, tanto en guitarra como en bajo.',
  // Multi-Instrumentalist
  'Earn Full String Master — Silver on 2 different instruments.':
    'Consigue Maestro de todas las cuerdas — Plata en 2 instrumentos distintos.',
  'Earn Full String Master — Silver on 3 different instruments.':
    'Consigue Maestro de todas las cuerdas — Plata en 3 instrumentos distintos.',
  'Earn Full String Master — Gold on 4 different instruments.':
    'Consigue Maestro de todas las cuerdas — Oro en 4 instrumentos distintos.',
  'Earn Full String Master — Gold on all 5 instruments.':
    'Consigue Maestro de todas las cuerdas — Oro en los 5 instrumentos.',
  'Earn Full String Master — Platinum on all 5 instruments.':
    'Consigue Maestro de todas las cuerdas — Platino en los 5 instrumentos.',
  // Admin (role)
  'Granted to app administrators — read every Feedback board post, not just your own.':
    'Se otorga a los administradores de la app — permite leer todas las publicaciones del tablón de sugerencias, no solo las tuyas.',
  // Guest-merge prompt — first sign-in on a device with local guest history
  'Add this device’s progress to your account?': '¿Añadir el progreso de este dispositivo a tu cuenta?',
  'You’ve practiced on this device without an account. Add that progress to your account, or keep only what’s already on your account?':
    'Has practicado en este dispositivo sin cuenta. ¿Añades ese progreso a tu cuenta o te quedas solo con lo que ya hay en ella?',
  'Merge my progress': 'Unir mi progreso',
  'Use account only': 'Usar solo la cuenta',
  'Leave this practice off your account?': '¿Dejar esta práctica fuera de tu cuenta?',
  'You have {n} rounds of practice saved on this device. If you continue, they stay on this device but are not added to your account.':
    'Tienes {n} rondas de práctica guardadas en este dispositivo. Si continúas, se quedan en este dispositivo pero no se añaden a tu cuenta.',
  // VoiceCalibration
  'Voice calibration': 'Calibración de voz',
  'Personal voice calibration': 'Calibración de voz personal',
  'Profile name': 'Nombre del perfil',
  'Say just this word, on its own': 'Di solo esta palabra, sin nada más',
  'Say just the note name, on its own': 'Di solo el nombre de la nota, sin nada más',
  'Speak clearly and pause briefly between words — later, when answering, say the letter, pause, then “sharp” / “flat” as two separate words.':
    'Habla con claridad y haz una pausa breve entre palabras — después, al responder, di la letra, haz una pausa y luego “sharp” / “flat” como dos palabras separadas.',
  'Could not use the microphone — try again': 'No se pudo usar el micrófono — inténtalo de nuevo',
  'No sound captured — try again, closer to the mic':
    'No se captó ningún sonido — inténtalo de nuevo, más cerca del micrófono',
  'Recording too short — try again': 'Grabación demasiado corta — inténtalo de nuevo',
  "That didn't sound like a note — try again": 'Eso no sonó como una nota — inténtalo de nuevo',
  'Saving the recording failed': 'No se pudo guardar la grabación',
  'Recorded': 'Grabadas',
  'notes': 'notas',
  'accidentals': 'alteraciones',
  'Say:': 'Di:',
  'Play last recording': 'Reproducir la última grabación',
  'Export recordings to a folder (dev)': 'Exportar grabaciones a una carpeta (dev)',
  'Stop exporting recordings': 'Dejar de exportar grabaciones',
  'Every accepted take is also saved as a WAV, named for scripts/eval-voice.mts.':
    'Cada toma aceptada también se guarda como WAV, con el nombre que espera scripts/eval-voice.mts.',
  'Could not write to the export folder — pick it again':
    'No se pudo escribir en la carpeta de exportación — elígela de nuevo',
  'Speak the word on screen — calibration advances on its own':
    'Di la palabra que aparece en pantalla — la calibración avanza sola',
  'Take': 'Toma',
  'Previous': 'Anterior',
  'Next': 'Siguiente',
  'Delete profile': 'Borrar perfil',
  'Reset automatic learning of the general mode': 'Restablecer el aprendizaje automático del modo general',
  'Checking recordings…': 'Comprobando grabaciones…',
  'Self-test recordings': 'Autoprueba de las grabaciones',
  'All words are distinct enough — looks good.':
    'Todas las palabras se distinguen lo suficiente — todo bien.',
  'Finish & enable': 'Terminar y activar',
  '“{a}” and “{b}” sound very similar — re-record one of them.':
    '“{a}” y “{b}” suenan demasiado parecidos — vuelve a grabar uno de ellos.',
  'Recording extra takes to tell “{a}” and “{b}” apart':
    'Grabando tomas extra para distinguir “{a}” de “{b}”',
  'No recordings for “{prompt}” yet': 'Aún no hay grabaciones de “{prompt}”',
  'Delete take {n} of {prompt}': 'Borrar la toma {n} de {prompt}',
  'Record {n} more takes for “{a}” and “{b}”': 'Grabar {n} tomas más de “{a}” y “{b}”',
  'to go': 'restantes',
  // VoiceLevelMeter
  'Microphone level good': 'Nivel del micrófono correcto',
  'Microphone level low, speak louder': 'Nivel del micrófono bajo, habla más alto',
  'Good level': 'Buen nivel',
  'Too quiet — speak up': 'Demasiado bajo — habla más alto',
  // DebugLogPanel
  'Debug log': 'Registro de depuración',
  'Open debug log': 'Abrir registro de depuración',
  'Errors + voice · auto-clears daily': 'Errores + voz · se borra a diario',
  'Errors · auto-clears daily': 'Errores · se borra a diario',
  'Voice: on': 'Voz: activada',
  'Voice: off': 'Voz: desactivada',
  'Copied': 'Copiado',
  'Copy': 'Copiar',
  'Clear': 'Borrar',
  'Close': 'Cerrar',
  '(no errors)': '(sin errores)',
  // FeedbackBoard
  'Couldn’t load the board. Check your connection and try again.':
    'No se pudo cargar el tablón. Revisa tu conexión e inténtalo de nuevo.',
  'Couldn’t send that. Check your connection and try again.':
    'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.',
  'Sign in with Google to leave a comment, idea, or suggestion. Only admins can read the full board.':
    'Inicia sesión con Google para dejar un comentario, una idea o una sugerencia. Solo los administradores pueden leer el tablón completo.',
  'Microphone access is off — turn it on to dictate.':
    'El acceso al micrófono está desactivado — actívalo para dictar.',
  'Voice typing isn’t available on this device.':
    'El dictado por voz no está disponible en este dispositivo.',
  'Couldn’t hear that — try again.': 'No te he oído — inténtalo de nuevo.',
  'What’s on your mind?': '¿Qué quieres contarnos?',
  'Stop voice typing': 'Detener el dictado por voz',
  'Start voice typing': 'Iniciar el dictado por voz',
  'Sending…': 'Enviando…',
  'Send': 'Enviar',
  'Listening… say one sentence — it stops on its own.': 'Escuchando… di una frase — se detiene sola.',
  'Thanks — your message was sent.': 'Gracias — tu mensaje se ha enviado.',
  'Unknown': 'Desconocido',
  'You': 'Tú',
  'Handled': 'Atendido',
  'Mark unhandled': 'Marcar como pendiente',
  'Mark handled': 'Marcar como atendido',
  'Delete': 'Borrar',
  'You haven’t sent anything yet.': 'Todavía no has enviado nada.',
  'Share a comment, idea, or suggestion. Admins read every post; below you can see the ones you’ve sent.':
    'Comparte un comentario, una idea o una sugerencia. Los administradores leen todas las publicaciones; abajo puedes ver las que has enviado.',
  'Write': 'Escribir',
  'Inbox': 'Bandeja de entrada',
  'Post a comment, idea, or suggestion of your own.': 'Publica tu propio comentario, idea o sugerencia.',
  'Every post from every user': 'Todas las publicaciones de todos los usuarios',
  'still to handle': 'pendientes',
  'Mark one handled once you’ve dealt with it, or delete it.':
    'Marca una como atendida cuando la hayas resuelto, o bórrala.',
  'No posts yet.': 'Aún no hay publicaciones.',
  'Nothing open — all caught up.': 'Nada pendiente — todo al día.',
  'Delete post': 'Borrar publicación',
  'Delete this post?': '¿Borrar esta publicación?',
  'This permanently removes it for everyone, including': 'Esto la elimina para siempre para todos, incluido',
  'the author': 'el autor',
  'It can’t be undone.': 'No se puede deshacer.',
  'Delete for everyone': 'Borrar para todos',
  // Quick Access — the floating home-screen control, its Settings row and pushpins
  'Quick access': 'Acceso rápido',
  'A floating button on the home screen for the settings you flip most. Pin up to 5 with the pushpins below, then double-tap the lower-right of the screen outside a drill to open it.':
    'Un botón flotante en la pantalla de inicio para los ajustes que más cambias. Fija hasta 5 con las chinchetas de abajo y luego toca dos veces la esquina inferior derecha de la pantalla, fuera de un ejercicio, para abrirlo.',
  'Pin to quick access?': '¿Fijar en el acceso rápido?',
  'Remove from quick access?': '¿Quitar del acceso rápido?',
  'You can pin up to {n} settings. Remove one first.': 'Puedes fijar hasta {n} ajustes. Quita uno primero.',
  'Quick access is full': 'El acceso rápido está lleno',
  'You already have {n} shortcuts. Remove one to make room?':
    'Ya tienes {n} atajos. ¿Quitar uno para hacer sitio?',
  'Remove one': 'Quitar uno',
  'Leave as is': 'Dejarlo así',
  'Remove a quick access shortcut': 'Quitar un atajo del acceso rápido',
  'Quick access holds five shortcuts. Remove one to make room.':
    'El acceso rápido admite cinco atajos. Quita uno para hacer sitio.',
  'Remove {name} from quick access': 'Quitar {name} del acceso rápido',
  'Yes': 'Sí',
  'No': 'No',
  'Double-tap the lower-right of the screen for quick access':
    'Toca dos veces la esquina inferior derecha de la pantalla para el acceso rápido',
  'Double-tap the lower-left of the screen for quick access':
    'Toca dos veces la esquina inferior izquierda de la pantalla para el acceso rápido',
  'Quick access is off': 'El acceso rápido está desactivado',
  "You haven't pinned any quick access shortcuts yet": 'Aún no has fijado ningún atajo en el acceso rápido',
  'What do the icons mean?': '¿Qué significan los iconos?',
  'Quick access symbol legend': 'Leyenda de los símbolos del acceso rápido',
  'What each icon on the Quick Access widget means. Tapping a pinned shortcut cycles through these states in order.':
    'Qué significa cada icono del acceso rápido. Al tocar un atajo fijado, pasa por estos estados en este orden.',
  'Letters (A B C)': 'Letras (A B C)',
  'Solfège (Do Re Mi)': 'Solfeo (Do Re Mi)',
  'Sharps (♯)': 'Sostenidos (♯)',
  'Flats (♭)': 'Bemoles (♭)',
  // Tuner — the Learn-tab tile that opens a live chromatic tuner
  'Tuner': 'Afinador',
  'Tune your strings using the microphone.': 'Afina tus cuerdas con el micrófono.',
  'Start listening': 'Empezar a escuchar',
  'Requesting microphone permission…': 'Pidiendo permiso para el micrófono…',
  'Microphone access was denied. Allow it in your browser settings, then try again.':
    'Se denegó el acceso al micrófono. Permítelo en los ajustes del navegador e inténtalo de nuevo.',
  'Try again': 'Intentar de nuevo',
  "Couldn't start the microphone.": 'No se pudo iniciar el micrófono.',
  'Listening… play a note.': 'Escuchando… toca una nota.',
  "Tap a note on the wheel to lock it as the string you're tuning. Tap it again to switch back to auto-detect.":
    'Toca una nota de la rueda para fijarla como la cuerda que estás afinando. Tócala otra vez para volver a la detección automática.',
  'Tuning': 'Afinando',
  'Detected': 'Detectada',
  'String {n}': 'Cuerda {n}',
  'or': 'o',
  'Unpin': 'Soltar',
  "Tap to lock this note at 12 o'clock": 'Toca para fijar esta nota arriba, en las 12',
  'Tap to unpin': 'Toca para soltarla',
  'In tune': 'Afinada',
  'Tighten (raise pitch)': 'Tensa (sube el tono)',
  'Loosen (lower pitch)': 'Afloja (baja el tono)',
  '~{pct}% of the audible threshold': '~{pct}% del umbral audible',
};
