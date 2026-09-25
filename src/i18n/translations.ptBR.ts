// Brazilian Portuguese (pt-BR) dictionary, keyed by the English source string
// like `he` in translations.ts. Addresses the player as "você". "Guitar" is
// rendered "Violão" (the word Brazilian learners use; "guitarra" reads as the
// electric guitar only). Landing in stages, mirroring Spanish stage 1: the app
// shell, settings, the drawer, the in-game screen, the Selector, Onboarding,
// Stats, the Leaderboard and the plan card. Everything not listed here falls
// back to English until a later stage adds it (see product-wishlist.md).

export const ptBR: Record<string, string> = {
  // Instrument / title
  'Guitar': 'Violão',
  'Bass': 'Baixo',
  'Fret Practice': 'Treino de trastes',

  // Instrument picker — roadmap instruments (admin-only "coming soon" tiles)
  'Coming soon': 'Em breve',
  'Ukulele': 'Ukulele',
  'Mandolin': 'Bandolim',
  'Banjo': 'Banjo',

  // Settings — section titles / labels / help
  'Instrument': 'Instrumento',
  'Playing': 'Prática',
  'Instruments': 'Instrumentos',
  'Strings': 'Cordas',
  'Frets': 'Trastes',
  'Type': 'Tipo',
  'Acoustic': 'Acústico',
  'Electric': 'Elétrico',
  'Soprano': 'Soprano',
  'Concert': 'Concerto',
  'Tenor': 'Tenor',
  'Baritone': 'Barítono',
  '5-String Standard': '5 cordas · padrão',
  '5-String Parlor': '5 cordas · parlor',
  '5-String Long Neck': '5 cordas · braço longo',
  '4-String Tenor (Irish, short scale)': '4 cordas · tenor (irlandês, escala curta)',
  '4-String Tenor': '4 cordas · tenor',
  '4-String Plectrum': '4 cordas · plectro',
  '6-String (Guitar-Banjo)': '6 cordas · banjo-violão',
  'Notes': 'Notas',
  'Switches tuning, string count and fret range, then reloads the note samples.':
    'Troca a afinação, o número de cordas e a extensão de trastes, e depois recarrega os sons das notas.',
  'Note names': 'Nomes das notas',
  'Written as': 'Escritas como',
  "Display only — the drill itself doesn't change.":
    'Só muda a exibição — o exercício continua igual.',
  'Letters (A, B, C…) or solfège syllables (Do, Re, Mi…).':
    'Letras (A, B, C…) ou sílabas de solfejo (Dó, Ré, Mi…).',
  'A sharp (♯) is a half-step higher; a flat (♭) is a half-step lower. The same pitch can be written either way — C♯ and D♭ are one note. Pick which sign you see.':
    'Um sustenido (♯) é meio tom acima; um bemol (♭) é meio tom abaixo. A mesma altura pode ser escrita dos dois jeitos — C♯ e D♭ são a mesma nota. Escolha qual sinal você quer ver.',
  'A dièse (♯) is a half-step higher; a bémol (♭) is a half-step lower. The same pitch can be written either way — Do♯ and Re♭ are one note. Pick which sign you see.':
    'Um sustenido (♯) é meio tom acima; um bemol (♭) é meio tom abaixo. A mesma altura pode ser escrita dos dois jeitos — Dó♯ e Ré♭ são a mesma nota. Escolha qual sinal você quer ver.',
  'Sharps or flats': 'Sustenidos ou bemóis',
  'Sharp (♯)': 'Sustenido (♯)',
  'Flat (♭)': 'Bemol (♭)',
  'Dièse (♯)': 'Sustenido (♯)',
  'Bémol (♭)': 'Bemol (♭)',
  'Score': 'Pontuação',
  'Score & celebrations': 'Pontuação e comemorações',
  'Live score, streak multiplier and celebrations are shown.':
    'A pontuação ao vivo, o multiplicador de sequência e as comemorações são exibidos.',
  'Every answer is still recorded to your stats and personal bests either way.':
    'De qualquer forma, cada resposta continua sendo salva nas suas estatísticas e recordes pessoais.',
  'On': 'Ligado',
  'Off': 'Desligado',
  'Silent mode': 'Modo silencioso',
  'Sound & vibration': 'Som e vibração',
  'Sound': 'Som',
  'Vibrate': 'Vibrar',
  'Silent': 'Silencioso',
  'How the drill answers back, on one ladder from quietest to loudest. Silent: no sound and no per-button buzz, just a buzz on right / wrong answers plus the on-screen celebrations. Vibrate: no sound — a buzz on every button press and on right / wrong answers instead. Sound 1–5: note playback, chimes and tap sounds, louder each step; the limiter keeps even the loudest from distorting. Silent and Vibrate are great for practising with headphones off or a guitar in hand.':
    'Como o exercício responde a você, numa escala do mais silencioso ao mais alto. Silencioso: sem som e sem vibração nos botões, só uma vibração nas respostas certas / erradas e as comemorações na tela. Vibrar: sem som — em vez disso, uma vibração a cada toque em botão e nas respostas certas / erradas. Som 1–5: a nota, os avisos e os sons de toque, mais altos a cada nível; o limitador evita distorção até no mais alto. Silencioso e Vibrar são ótimos para praticar sem fone ou com o violão na mão.',
  'Theme': 'Tema',
  'Dark': 'Escuro',
  'Night': 'Noite',
  'Day': 'Dia',
  'Night is a warmer, dimmer palette for a dark room. Day is a light palette.':
    'Noite é uma paleta mais quente e suave para um ambiente escuro. Dia é uma paleta clara.',
  'Appearance': 'Aparência',
  'Theme sets how light or dark the app is: Night is a warmer, dimmer palette for a dark room, Day is a light one. Season sets the colours layered over it — Winter is the original look. Auto follows your clock (Day from 07:00 to 19:00, Night after) and the real season where you are; picking a season by hand holds until that season ends.':
    'O tema define o quanto o app é claro ou escuro: Noite é uma paleta mais quente e suave para um ambiente escuro, e Dia é uma paleta clara. A estação define as cores aplicadas por cima — Inverno é o visual original. Automático segue o seu relógio (Dia das 07:00 às 19:00, Noite depois) e a estação real onde você está; se você escolher uma estação manualmente, ela vale até essa estação acabar.',
  'Season': 'Estação',
  'Winter': 'Inverno',
  'Spring': 'Primavera',
  'Summer': 'Verão',
  'Autumn': 'Outono',
  'A seasonal colour palette layered over the theme. Winter is the original look.':
    'Uma paleta de cores da estação aplicada sobre o tema. Inverno é o visual original.',
  'Mastery on the fretboard': 'Domínio no braço',
  'The per-note / per-fret accuracy bars drawn over the circle and grid while stopped or paused.':
    'As barras de precisão por nota / por traste desenhadas sobre o círculo e a grade quando o jogo está parado ou pausado.',
  'Mastery keeps being tracked and shows on the Stats screen either way.':
    'O domínio continua sendo registrado e aparece na tela de estatísticas de qualquer forma.',
  'Questions counted': 'Perguntas contadas',
  'How many of your most recent questions the mastery bars are computed from. Free accounts use the last 250.':
    'De quantas das suas perguntas mais recentes as barras de domínio são calculadas. Contas gratuitas usam as últimas 250.',
  'Choose how many recent questions the mastery bars are counted from':
    'Escolha de quantas perguntas recentes as barras de domínio são calculadas',
  'Mastery time window': 'Período do domínio',
  'Point the mastery bars at a recent-question count, a single day, or a date range':
    'Calcule as barras de domínio a partir de um número de perguntas recentes, de um único dia ou de um intervalo de datas',
  'What slice of your history the mastery bars are computed from. Free accounts use the last 250 questions. Older history saved without a date is not counted for a specific day or range.':
    'Qual parte do seu histórico é usada para calcular as barras de domínio. Contas gratuitas usam as últimas 250 perguntas. Histórico antigo salvo sem data não conta para um dia ou intervalo específico.',
  'Recent': 'Recentes',
  'A day': 'Um dia',
  'A range': 'Um intervalo',
  'From': 'De',
  'To': 'Até',
  'showing': 'mostrando',
  'showing last': 'mostrando as últimas',
  'showing all questions': 'mostrando todas as perguntas',
  'All': 'Tudo',
  'Stats & progress': 'Estatísticas e progresso',
  'Answer mode': 'Modo de resposta',
  'How you answer': 'Como você responde',
  'Voice mode asks for microphone permission the first time.':
    'O modo voz pede permissão para usar o microfone na primeira vez.',
  'Speak clearly and pause briefly between words — for sharp/flat notes, say the letter, pause, then “sharp” / “flat” as two separate words.':
    'Fale com clareza e faça uma pausa curta entre as palavras — para notas com sustenido/bemol, diga a letra, faça uma pausa e depois “sharp” / “flat” como duas palavras separadas.',
  'Tap': 'Toque',
  'Voice': 'Voz',
  'Admin-only experiment: play the target note on your guitar instead of tapping. Only works for “by fret” questions — a played note can’t say which string it came from, so “by note” questions stay on tap.':
    'Experimento só para administradores: toque a nota no seu violão em vez de tocar na tela. Só funciona nas perguntas “por traste” — uma nota tocada não diz de qual corda veio, então as perguntas “por nota” continuam no toque.',
  '🎸 Microphone blocked — enable it or switch to tap': '🎸 Microfone bloqueado — ative-o ou mude para toque',
  '🎸 Pitch detection isn’t available on this device — use tap': '🎸 A detecção de altura não está disponível neste aparelho — use o toque',
  '🎸 Didn’t catch that': '🎸 Não entendi',
  '🎸 Play the note on your guitar': '🎸 Toque a nota no seu violão',
  'Voice engine': 'Mecanismo de voz',
  'Auto picks the best available. Personal uses your calibrated profile; General uses the built-in model.':
    'Automático escolhe o melhor disponível. Pessoal usa o seu perfil calibrado; Geral usa o modelo embutido.',
  'Auto': 'Automático',
  'Personal': 'Pessoal',
  'General': 'Geral',
  'Your voice profile': 'Seu perfil de voz',
  'Calibrating your own voice improves recognition when answering by voice.':
    'Calibrar a sua própria voz melhora o reconhecimento ao responder por voz.',
  'recordings': 'gravações',
  'enabled': 'ativado',
  'Add / review recordings': 'Adicionar / revisar gravações',
  'Calibrate my voice': 'Calibrar minha voz',
  'Feedback board': 'Mural de sugestões',
  'Leaderboard': 'Ranking',
  'Account': 'Conta',
  'Signed in': 'Conectado',
  'Keeps your preferences and data in sync across devices.':
    'Mantém suas preferências e dados sincronizados entre aparelhos.',
  'Sign out': 'Sair',
  'Sign in with Google to keep your preferences and data across devices.':
    'Entre com o Google para manter suas preferências e dados em todos os seus aparelhos.',
  'Sign in with Google': 'Entrar com o Google',

  // Account → About tile + live community counts
  'About': 'Sobre',
  'Guitar Fret Practice is a small labor of love — built to turn learning the fretboard into a game instead of a chore. Made by an independent developer, with patient help from family and friends.':
    'Guitar Fret Practice é um pequeno projeto feito com carinho — criado para transformar o aprendizado do braço num jogo, e não numa obrigação. Feito por um desenvolvedor independente, com a ajuda paciente de família e amigos.',
  'Registered users': 'Usuários cadastrados',
  'Active now': 'Ativos agora',
  'Guests online': 'Visitantes online',
  'See the full list and what earns each one': 'Veja a lista completa e como ganhar cada uma',
  'Badges': 'Medalhas',
  'Language': 'Idioma',
  'Left-handed': 'Canhoto',
  'Button depth': 'Relevo dos botões',
  'Gives the buttons a raised, 3D look: a light rim on top, a solid edge underneath, and they sink a little when pressed. Off keeps them flat.':
    'Dá aos botões um visual em relevo, 3D: uma borda clara em cima, uma borda sólida embaixo, e eles afundam um pouco ao serem pressionados. Desligado os mantém planos.',
  'Mirrors the app for a left-handed player: the fretboard flips (nut on the right), and the menu, Quick Access and back buttons move to the left. Independent of language — it stays mirrored in Hebrew too.':
    'Espelha o app para quem toca canhoto: o braço se inverte (pestana à direita) e o menu, o Acesso rápido e os botões de voltar vão para a esquerda. Independe do idioma — continua espelhado também em hebraico.',
  'Colour-blind heatmap markers': 'Marcas do mapa de calor para daltônicos',
  'Adds a ✓ / • mark on the Stats-screen fretboard heatmap cells, on top of colour, so known vs. needs-work reads without relying on hue.':
    'Adiciona uma marca ✓ / • nas células do mapa de calor do braço em Estatísticas, além da cor, para distinguir o que você domina do que precisa de treino sem depender da tonalidade.',

  // Hamburger drawer / dialogs
  'Settings': 'Configurações',
  'Close settings': 'Fechar configurações',
  'Open settings': 'Abrir configurações',
  'Game settings': 'Configurações do jogo',
  'Back': 'Voltar',
  'Microphone access': 'Acesso ao microfone',
  'Answer out loud': 'Responda em voz alta',
  'Voice mode listens for the note or fret you say instead of a tap.':
    'O modo voz escuta a nota ou o traste que você fala, em vez de um toque.',
  'Your browser will ask to use the microphone next — audio stays on your device and is never recorded or uploaded.':
    'Em seguida o seu navegador vai pedir para usar o microfone — o áudio fica no seu aparelho e nunca é gravado nem enviado.',
  'Allow microphone': 'Permitir microfone',
  'Not now': 'Agora não',
  'Microphone is blocked': 'O microfone está bloqueado',
  "Your browser is refusing microphone access for this site, so voice answers can't work yet. Tap the 🔒 / 🎤 icon beside the address bar, set the microphone to":
    'O seu navegador está bloqueando o microfone para este site, então as respostas por voz ainda não funcionam. Toque no ícone 🔒 / 🎤 ao lado da barra de endereço e defina o microfone como',
  ', then reload the page.': ', e depois recarregue a página.',
  'Allow': 'Permitir',
  'Got it': 'Entendi',
  'Use tap instead': 'Usar toque',
  'Sign in': 'Entrar',
  'Save your progress': 'Salve seu progresso',
  'Sign in to keep your history, badges and personal bests across devices. You can keep playing as a guest — everything still works, it just stays on this device.':
    'Entre para manter seu histórico, suas medalhas e seus recordes pessoais em todos os seus aparelhos. Você pode continuar jogando como visitante — tudo funciona igual, só fica salvo neste aparelho.',
  'Maybe later': 'Talvez depois',
  'Press back again to exit': 'Pressione voltar de novo para sair',

  // In-game
  'STAGE COMPLETE': 'FASE CONCLUÍDA',
  'Retry': 'Tentar de novo',
  '🎤 Microphone blocked — enable it or switch to tap': '🎤 Microfone bloqueado — ative-o ou mude para toque',
  '🎤 Voice needs a connection': '🎤 A voz precisa de conexão',
  '🎤 Voice isn’t working in this browser — try Chrome, or use tap':
    '🎤 A voz não funciona neste navegador — tente o Chrome ou use o toque',
  '🎤 Didn’t catch that': '🎤 Não entendi',
  'Round Complete!': 'Rodada concluída!',
  'pts': 'pts',
  'OK': 'OK',
  'Start': 'Começar',
  'Resume': 'Continuar',
  'Pause': 'Pausar',
  'Stop': 'Parar',
  'Refresh': 'Atualizar',
  'Privacy policy': 'Política de privacidade',

  'QUESTIONS': 'PERGUNTAS',
  'streak': 'sequência',
  'New badge': 'Nova medalha',
  'Badge upgraded': 'Medalha melhorada',
  'Continue': 'Continuar',
  'Listening…': 'Ouvindo…',
  'Member since': 'Membro desde',
  'badges earned': 'medalhas conquistadas',

  // Pinned badge shelf (Account section)
  'Choose badges to feature': 'Escolha medalhas para destacar',
  'Edit featured badges': 'Editar medalhas em destaque',
  'Your badges': 'Suas medalhas',
  'Feature up to 5 badges': 'Destaque até 5 medalhas',
  'Remove a badge to feature another.': 'Remova uma medalha para destacar outra.',
  'See all badges': 'Ver todas as medalhas',

  // LeaderboardPanel — standings sub-page
  'player': 'jogador',
  'players': 'jogadores',
  'ranked by XP': 'ordenado por XP',
  'free for everyone': 'grátis para todos',
  'All-time': 'Geral',
  'This week': 'Esta semana',
  'Loading…': 'Carregando…',
  'Couldn’t load the leaderboard. Check your connection and try again.':
    'Não foi possível carregar o ranking. Verifique sua conexão e tente de novo.',
  'Couldn’t update that. Check your connection and try again.':
    'Não foi possível atualizar. Verifique sua conexão e tente de novo.',
  'Your standing': 'Sua posição',
  'RANK': 'POSIÇÃO',
  'acc': 'prec.',
  '(you)': '(você)',
  'Hidden from the leaderboard': 'Oculto no ranking',
  'Visible on the leaderboard': 'Visível no ranking',
  'Join the board': 'Entre no ranking',
  'You can see every player’s standing right now. Sign in with Google to take your own place — every correct answer you’ve ever played counts. Free, no subscription.':
    'Você já pode ver a posição de cada jogador. Entre com o Google para ocupar o seu lugar — conta cada resposta certa que você já deu. Grátis, sem assinatura.',
  'No one’s on the board yet': 'Ainda não há ninguém no ranking',
  'Finish a practice run while signed in and your name lands here first.':
    'Termine uma sessão de prática conectado e o seu nome aparece aqui primeiro.',
  'How is XP counted?': 'Como o XP é contado?',

  // SelectorPanel — mode/difficulty/fret-range picker
  'all': 'todas as',
  'strings': 'cordas',
  'frets': 'trastes',
  'only the dot-marker frets': 'só os trastes com marcação',
  'natural notes only (no sharps or flats)': 'só notas naturais (sem sustenidos nem bemóis)',
  'every note, sharps and flats included': 'todas as notas, com sustenidos e bemóis',
  'alphabetical order': 'ordem alfabética',
  'circle-of-fifths order': 'ordem do ciclo de quintas',
  'A fret lights up and you pick its note from the wheel':
    'Um traste acende e você escolhe a nota dele na roda',
  ', rotated to the string': ', girada conforme a corda',
  'A note name is shown and you tap every fret on the neck where it lands.':
    'Aparece o nome de uma nota e você toca em cada traste do braço onde ela está.',
  'Note-by-Fret': 'Nota pelo traste',
  'Fret-by-Note': 'Traste pela nota',
  'Auto-advances through the difficulty stages.': 'Avança automaticamente pelos níveis de dificuldade.',
  'How this works': 'Como funciona',
  'neck': 'braço',
  'neck fret range selector': 'seletor da extensão de trastes do braço',
  'Precise fret range': 'Extensão de trastes precisa',
  'Pick an exact fret N–M window to drill': 'Escolha uma extensão exata de trastes N–M para treinar',
  'Fret range': 'Extensão de trastes',
  'Full only while a precise fret window is on': 'Só Completo enquanto houver uma extensão de trastes precisa',
  'Drill only part of the neck. Drag the handles to set the exact fret window — the shaded area is muted out, both here and on the home-screen neck.':
    'Treine só uma parte do braço. Arraste as alças para definir a extensão exata de trastes — a área sombreada fica de fora, tanto aqui quanto no braço da tela inicial.',
  'Lowest fret': 'Traste mais baixo',
  'Highest fret': 'Traste mais alto',
  'Multi': 'Várias',
  'Note by Fret': 'Nota pelo traste',
  'Alpha': 'Alfabética',
  'Fifths': 'Quintas',
  'By String': 'Por corda',
  'Fret by Note': 'Traste pela nota',
  "Read the note wheel like a clock: your open string sits at 12 o'clock, and the dots under each note show its fret. Answer before the timing bar empties.":
    'Leia a roda de notas como um relógio: a sua corda solta fica nas 12 horas, e os pontos sob cada nota mostram o traste dela. Responda antes que a barra de tempo se esvazie.',
  'Answer before the timing bar empties.': 'Responda antes que a barra de tempo se esvazie.',
  'Dots': 'Marcações',
  'Naturals': 'Naturais',
  'Full': 'Completo',
  'Auto Advance to next difficulty': 'Avanço automático para a próxima dificuldade',

  // Onboarding
  'Guitar Fret Practice': 'Guitar Fret Practice',
  'Master the fretboard with the clock method — one string at a time.':
    'Domine o braço com o método do relógio — uma corda de cada vez.',
  'What do you play?': 'O que você toca?',
  'Skip setup →': 'Pular configuração →',
  'How well do you know the fretboard?': 'Quanto você conhece o braço?',
  "I'm just starting": 'Estou começando',
  'Start with dot frets on String 6': 'Comece pelos trastes com marcação na corda 6',
  'I play but want to improve': 'Eu toco, mas quero melhorar',
  'Quick 3-question test': 'Teste rápido de 3 perguntas',
  'I know the full neck': 'Conheço o braço inteiro',
  'Jump right in': 'Começar já',
  'Skip →': 'Pular →',
  'String': 'Corda',
  'what note is fret': 'que nota é o traste',
  'Skip test →': 'Pular teste →',
  'Keep going!': 'Continue assim!',
  'Good start!': 'Bom começo!',
  'Nice work!': 'Muito bem!',
  'Impressive!': 'Impressionante!',
  'Dot Frets': 'Trastes com marcação',
  'Natural notes': 'Notas naturais',
  'the full chromatic neck': 'o braço cromático inteiro',
  "correct — we've set you up on": 'certas — configuramos você em',
  'Change it anytime in the selector panel.': 'Você pode mudar quando quiser no painel de seleção.',
  "Let's go →": 'Vamos lá →',

  // ProgressPanel — stats & progress screen
  'by note': 'por nota',
  'by fret': 'por traste',
  'fret': 'traste',
  'not played': 'não tocada',
  'known': 'dominada',
  'needs work': 'precisa treinar',
  'unplayed': 'não tocada',
  'Not enough data yet.': 'Ainda não há dados suficientes.',
  'Not practiced yet': 'Ainda não praticado',
  'Older sessions have no date stamp, so the timeline is empty. New sessions fill it in.':
    'As sessões antigas não têm data, então a linha do tempo está vazia. As sessões novas vão preenchê-la.',
  'Play a few rounds and your all-time progress shows up here.':
    'Jogue algumas rodadas e o seu progresso geral aparece aqui.',
  'accuracy': 'precisão',
  'day streak': 'dias seguidos',
  'answered': 'respondidas',
  'Weakest notes': 'Notas mais fracas',
  'Nothing below 70% — nice.': 'Nada abaixo de 70% — muito bem.',
  'By note': 'Por nota',
  'By string': 'Por corda',
  'By fret': 'Por traste',
  'Fretboard heatmap': 'Mapa de calor do braço',
  'Daily timeline': 'Linha do tempo diária',
  'Accuracy %': '% de precisão',
  'Avg response time': 'Tempo médio de resposta',
  'Personal bests': 'Recordes pessoais',
  'No personal bests recorded yet.': 'Ainda não há recordes pessoais.',
  'No practice in the last 7 days.': 'Nenhuma prática nos últimos 7 dias.',
  'All time': 'Geral',
  'Last 7 days': 'Últimos 7 dias',
  'across every': 'em cada',
  'settings combination': 'combinação de ajustes',
  'Clear all history': 'Apagar todo o histórico',
  'Clear all stats?': 'Apagar todas as estatísticas?',
  'This permanently erases your entire practice history and resets the all-time mastery for every note, string and settings combination. Your personal bests are kept.':
    'Isso apaga para sempre todo o seu histórico de prática e zera o domínio geral de cada nota, corda e combinação de ajustes. Seus recordes pessoais são mantidos.',
  "This can't be undone.": 'Não é possível desfazer.',
  'Delete anyway': 'Apagar mesmo assim',
  'Cancel': 'Cancelar',

  // Instrument string labels (guitar + bass, "String N · note")
  'String 1 · high E': 'Corda 1 · Mi agudo',
  'String 2 · B': 'Corda 2 · Si',
  'String 3 · G': 'Corda 3 · Sol',
  'String 4 · D': 'Corda 4 · Ré',
  'String 5 · A': 'Corda 5 · Lá',
  'String 6 · low E': 'Corda 6 · Mi grave',
  'String 1 · G': 'Corda 1 · Sol',
  'String 2 · D': 'Corda 2 · Ré',
  'String 3 · A': 'Corda 3 · Lá',
  'String 4 · low E': 'Corda 4 · Mi grave',

  // Free / Pro / Premium tiering — ProGate lock states + the Upgrade card
  'Premium': 'Premium',
  // Free-tier ad strip
  'Advertisement': 'Publicidade',
  'Ad': 'Anúncio',
  'Close ad': 'Fechar anúncio',
  'Your ad could be here. Go Pro to remove ads.': 'O seu anúncio poderia estar aqui. Assine o Pro para remover os anúncios.',
  'Unlock with Pro': 'Desbloquear com Pro',
  'Unlock with Premium': 'Desbloquear com Premium',
  'You have Pro': 'Você tem Pro',
  "You're on Free": 'Você está no plano gratuito',
  'Your plan': 'Seu plano',
  'Included with Pro': 'Incluído no Pro',
  'Everything in Free, plus:': 'Tudo do plano gratuito, e mais:',
  'Everything you need to practice daily, at no cost.':
    'Tudo o que você precisa para praticar todo dia, sem custo.',
  'The full fretboard drill — by note and by fret, on every string':
    'O exercício completo do braço — por nota e por traste, em todas as cordas',
  'Badges and achievements, with your pinned medal shelf':
    'Medalhas e conquistas, com a sua estante de medalhas em destaque',
  'The leaderboard — XP, questions answered and accuracy':
    'O ranking — XP, perguntas respondidas e precisão',
  'Cloud sync and full restore of your practice on every device':
    'Sincronização na nuvem e restauração completa da sua prática em todos os aparelhos',
  'Your last 7 days of stats, plus the personal best for what you’re drilling':
    'As suas estatísticas dos últimos 7 dias, mais o recorde pessoal do que você está treinando',
  'Free, forever': 'Grátis, para sempre',
  'Pro is for training seriously and tracking progress over time.':
    'O Pro é para treinar a sério e acompanhar o seu progresso ao longo do tempo.',
  'Your full practice history — all-time stats and trends, not just the last 7 days':
    'O seu histórico de prática completo — estatísticas e tendências gerais, não só dos últimos 7 dias',
  'Mastery maps — per-note and per-fret accuracy overlays on the circle and grid':
    'Mapas de domínio — precisão por nota e por traste sobre o círculo e a grade',
  'Browse your personal bests across every settings combination':
    'Consulte os seus recordes pessoais em cada combinação de ajustes',
  'A personal voice profile built from your own calibration recordings':
    'Um perfil de voz pessoal criado a partir das suas próprias gravações de calibração',
  'Your Pro access is complimentary.': 'O seu acesso Pro é uma cortesia.',
  'Your Pro access came from a promotion.': 'O seu acesso Pro veio de uma promoção.',
  'Your Pro access was granted manually.': 'O seu acesso Pro foi concedido manualmente.',
  'Your Pro access is from your subscription.': 'O seu acesso Pro vem da sua assinatura.',
  'Your Pro access is active.': 'O seu acesso Pro está ativo.',
  'It does not expire.': 'Não expira.',
  'Access runs until': 'O acesso vale até',
  'Pro isn’t on sale yet — everything above stays free to try in the meantime.':
    'O Pro ainda não está à venda — enquanto isso, você pode experimentar tudo acima de graça.',
  'Free': 'Grátis',

  // Adaptive difficulty suggestion banner (wishlist §3)
  'You’re cruising through this — ready for a harder level?':
    'Isso está fácil para você — pronto para um nível mais difícil?',
  'This setup is fighting back. Want to ease off a level?':
    'Esta configuração está difícil. Quer descer um nível?',
  'Switch the difficulty to': 'Mudar a dificuldade para',
  'Drop the difficulty to': 'Baixar a dificuldade para',
  'Apply': 'Aplicar',
  'Dismiss': 'Dispensar',

  // Learning-type navigation — the drawer's "Learn" group and its full pages
  'Learn': 'Aprender',
  'Choose what to practise.': 'Escolha o que praticar.',
  'Current': 'Atual',
  'Daily practice': 'Prática diária',
  'Intervals': 'Intervalos',
  'Scales': 'Escalas',
  'Chords': 'Acordes',
  'Staff reading': 'Leitura de partitura',
  'Game': 'Jogo',
  'Your daily plan is loading…': 'Carregando o seu plano diário…',
  'Let the Teacher plan your practice': 'Deixe o Professor planejar a sua prática',
  'Practise hearing and finding intervals': 'Pratique ouvir e encontrar intervalos',

  // Fret range conflict dialog
  'Fret range too small': 'Extensão de trastes pequena demais',
  'The current fret range': 'A extensão de trastes atual',
  ' allows fewer than ': ' permite menos de ',
  ' unique notes': ' notas diferentes',
  ' with the selected strings. Please expand the range.': ' com as cordas escolhidas. Amplie a extensão.',
  'Expand to minimum': 'Ampliar ao mínimo',
  'I will expand': 'Eu vou ampliar',
  'Custom range': 'Extensão personalizada',
  'Keep as is': 'Deixar assim',
  'Set fret range': 'Definir extensão de trastes',
};
