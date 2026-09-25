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
};
