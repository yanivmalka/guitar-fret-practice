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
  'Solfège (Do Re Mi)': 'Solfejo (Dó Ré Mi)',
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

  // ── Stage 2a: badges, guest merge, voice calibration, feedback board,
  // quick access and the tuner ──────────────────────────────────────────
  // Badges / Achievements wall — tiers
  'Bronze': 'Bronze',
  'Silver': 'Prata',
  'Gold': 'Ouro',
  'Platinum': 'Platina',
  'Diamond': 'Diamante',
  'Master': 'Mestre',
  'Legendary I': 'Lendário I',
  'Legendary II': 'Lendário II',
  'Legendary III': 'Lendário III',
  'Legendary IV': 'Lendário IV',
  // Wall chrome
  'unlocked': 'desbloqueadas',
  'Max': 'Máx.',
  'Earned': 'Conquistada',
  // Admin test controls
  'Grant': 'Conceder',
  'Reset': 'Redefinir',
  'Admin tools: Grant or Reset each badge to test it. History-based badges re-appear on reopen unless you also clear history.':
    'Ferramentas de administrador: conceda ou redefina cada medalha para testá-la. Medalhas baseadas no histórico reaparecem ao reabrir, a menos que você também apague o histórico.',
  // Family names
  'Perfect Session': 'Sessão perfeita',
  'Speed Demon': 'Demônio da velocidade',
  'Flawless Sprint': 'Sprint impecável',
  'On Fire': 'Pegando fogo',
  'Comeback': 'Virada',
  'Every String': 'Todas as cordas',
  'String Master': 'Mestre da corda',
  'String Master · {s}': 'Mestre · {s}',
  'Full String Master': 'Mestre de todas as cordas',
  'Neck Runner': 'Corredor do braço',
  'Both Ends': 'As duas pontas',
  'Low End': 'Região grave',
  'Week Warrior': 'Guerreiro da semana',
  'Dedicated': 'Dedicado',
  'Total Reps': 'Repetições totais',
  'Sharpshooter': 'Atirador de elite',
  'Quick Read': 'Leitura rápida',
  'Most Improved': 'Quem mais evoluiu',
  'Doubling Up': 'Em dobro',
  'Multi-Instrumentalist': 'Multi-instrumentista',
  'Admin': 'Administrador',
  // Earning conditions — Perfect Session
  'Answer 10+ questions in a round with no mistakes at all.':
    'Responda 10+ perguntas em uma rodada sem nenhum erro.',
  '25+ questions in a round, still zero mistakes.': '25+ perguntas em uma rodada, ainda sem nenhum erro.',
  '50+ questions in a round, still zero mistakes — a full clean run.':
    '50+ perguntas em uma rodada, ainda sem nenhum erro — uma rodada totalmente limpa.',
  // Speed Demon
  'Get 10+ correct answers in a round, at least 8 of them under 1.5s.':
    'Acerte 10+ respostas em uma rodada, pelo menos 8 delas em menos de 1,5 s.',
  '20+ correct answers, at least 16 of them under 1.5s.':
    '20+ respostas certas, pelo menos 16 delas em menos de 1,5 s.',
  '40+ correct answers, at least 32 of them under 1.2s.':
    '40+ respostas certas, pelo menos 32 delas em menos de 1,2 s.',
  // Flawless Sprint
  'Finish a whole round at 90% accuracy or better.':
    'Termine uma rodada inteira com 90% de precisão ou mais.',
  'Finish a whole round at 95% accuracy or better.':
    'Termine uma rodada inteira com 95% de precisão ou mais.',
  'Finish a whole round at 100% accuracy.': 'Termine uma rodada inteira com 100% de precisão.',
  // On Fire
  'Reach a streak of 15 in a single round.': 'Chegue a uma sequência de 15 em uma única rodada.',
  'Reach a streak of 20 in a single round.': 'Chegue a uma sequência de 20 em uma única rodada.',
  'Reach a streak of 30 in a single round.': 'Chegue a uma sequência de 30 em uma única rodada.',
  // Comeback
  'Miss 3+ of your first 20 questions, then answer the next 8 in a row correctly.':
    'Erre 3+ das suas primeiras 20 perguntas e depois acerte as 8 seguintes em sequência.',
  'Miss 5+ of your first 20 questions, then answer the next 12 in a row correctly.':
    'Erre 5+ das suas primeiras 20 perguntas e depois acerte as 12 seguintes em sequência.',
  'Miss 8+ of your first 20 questions, then answer the next 18 in a row correctly.':
    'Erre 8+ das suas primeiras 20 perguntas e depois acerte as 18 seguintes em sequência.',
  // Every String
  'Finish a round that visited every string: 2x that many questions, 90% accuracy.':
    'Termine uma rodada que passe por todas as cordas: o dobro de perguntas em relação ao número de cordas, 90% de precisão.',
  'Visited every string: 4x that many questions, 90% accuracy.':
    'Passando por todas as cordas: 4 vezes mais perguntas que cordas, 90% de precisão.',
  'Visited every string: 6x that many questions, 95% accuracy.':
    'Passando por todas as cordas: 6 vezes mais perguntas que cordas, 95% de precisão.',
  // Per-string String Master — {s} is the translated string label
  'Answer 40+ questions on {s} at 90% accuracy or better.':
    'Responda 40+ perguntas na {s} com 90% de precisão ou mais.',
  '100+ questions on {s} at 92% accuracy or better.': '100+ perguntas na {s} com 92% de precisão ou mais.',
  '200+ questions on {s} at 95% accuracy or better.': '200+ perguntas na {s} com 95% de precisão ou mais.',
  '400+ questions on {s} at 96% accuracy or better, over 14+ practice days.':
    '400+ perguntas na {s} com 96% de precisão ou mais, ao longo de 14+ dias de prática.',
  '800+ questions on {s} at 97% accuracy or better, over 30+ practice days.':
    '800+ perguntas na {s} com 97% de precisão ou mais, ao longo de 30+ dias de prática.',
  // Full String Master
  'Earn String Master — Bronze on every string of this instrument.':
    'Conquiste Mestre da corda — Bronze em todas as cordas deste instrumento.',
  'Earn String Master — Silver on every string.': 'Conquiste Mestre da corda — Prata em todas as cordas.',
  'Earn String Master — Gold on every string.': 'Conquiste Mestre da corda — Ouro em todas as cordas.',
  'Earn String Master — Platinum on every string.': 'Conquiste Mestre da corda — Platina em todas as cordas.',
  'Earn String Master — Diamond on every string.': 'Conquiste Mestre da corda — Diamante em todas as cordas.',
  // Neck Runner
  'Answer at least one question on every fret of the neck.':
    'Responda pelo menos uma pergunta em cada traste do braço.',
  'Answer at least 3 questions on every fret of the neck.':
    'Responda pelo menos 3 perguntas em cada traste do braço.',
  'Answer at least 5 questions on every fret of the neck.':
    'Responda pelo menos 5 perguntas em cada traste do braço.',
  'Answer at least 10 questions on every fret, spread across 14+ practice days.':
    'Responda pelo menos 10 perguntas em cada traste, distribuídas em 14+ dias de prática.',
  'Answer at least 20 questions on every fret, spread across 30+ practice days.':
    'Responda pelo menos 20 perguntas em cada traste, distribuídas em 30+ dias de prática.',
  // Both Ends
  'Answer 40+ questions above the 12th fret at 85% accuracy or better.':
    'Responda 40+ perguntas acima do traste 12 com 85% de precisão ou mais.',
  '100+ questions above the 12th fret at 88% accuracy or better.':
    '100+ perguntas acima do traste 12 com 88% de precisão ou mais.',
  '200+ questions above the 12th fret at 92% accuracy or better.':
    '200+ perguntas acima do traste 12 com 92% de precisão ou mais.',
  '400+ questions above the 12th fret at 93% accuracy or better, over 14+ practice days.':
    '400+ perguntas acima do traste 12 com 93% de precisão ou mais, ao longo de 14+ dias de prática.',
  '800+ questions above the 12th fret at 94% accuracy or better, over 30+ practice days.':
    '800+ perguntas acima do traste 12 com 94% de precisão ou mais, ao longo de 30+ dias de prática.',
  // Low End
  'Answer 40+ questions on the bass low-E string at 90% accuracy or better.':
    'Responda 40+ perguntas na corda Mi (E) grave do baixo com 90% de precisão ou mais.',
  '100+ questions on the low-E string at 93% accuracy or better.':
    '100+ perguntas na corda Mi (E) grave com 93% de precisão ou mais.',
  '200+ questions on the low-E string at 96% accuracy or better.':
    '200+ perguntas na corda Mi (E) grave com 96% de precisão ou mais.',
  '400+ questions on the low-E string at 97% accuracy or better, over 14+ practice days.':
    '400+ perguntas na corda Mi (E) grave com 97% de precisão ou mais, ao longo de 14+ dias de prática.',
  '800+ questions on the low-E string at 98% accuracy or better, over 30+ practice days.':
    '800+ perguntas na corda Mi (E) grave com 98% de precisão ou mais, ao longo de 30+ dias de prática.',
  // Week Warrior
  'Practise on 5 separate days within a single 7-day window.':
    'Pratique em 5 dias diferentes dentro de um mesmo período de 7 dias.',
  '6 separate days within a single 7-day window.': '6 dias diferentes dentro de um mesmo período de 7 dias.',
  'All 7 days within a single 7-day window — a perfect week.':
    'Todos os 7 dias de um mesmo período de 7 dias — uma semana perfeita.',
  // Dedicated
  'Build a run of 7 consecutive practice days.': 'Faça uma sequência de 7 dias de prática consecutivos.',
  '14 consecutive practice days.': '14 dias de prática consecutivos.',
  '30 consecutive practice days.': '30 dias de prática consecutivos.',
  '60 consecutive practice days.': '60 dias de prática consecutivos.',
  '90 consecutive practice days.': '90 dias de prática consecutivos.',
  '120 consecutive practice days.': '120 dias de prática consecutivos.',
  '180 consecutive practice days.': '180 dias de prática consecutivos.',
  '250 consecutive practice days.': '250 dias de prática consecutivos.',
  '300 consecutive practice days.': '300 dias de prática consecutivos.',
  '365 consecutive practice days — a full year, every day.':
    '365 dias de prática consecutivos — um ano inteiro, todos os dias.',
  // Total Reps
  'Answer 100 questions all-time, across every instrument.':
    'Responda 100 perguntas no total, somando todos os instrumentos.',
  '250 questions all-time.': '250 perguntas no total.',
  '500 questions all-time.': '500 perguntas no total.',
  '1,000 questions all-time.': '1.000 perguntas no total.',
  '2,500 questions all-time, spread across 20+ practice days.':
    '2.500 perguntas no total, distribuídas em 20+ dias de prática.',
  '5,000 questions all-time, spread across 40+ practice days.':
    '5.000 perguntas no total, distribuídas em 40+ dias de prática.',
  '10,000 questions all-time, spread across 70+ practice days.':
    '10.000 perguntas no total, distribuídas em 70+ dias de prática.',
  '20,000 questions all-time, spread across 110+ practice days.':
    '20.000 perguntas no total, distribuídas em 110+ dias de prática.',
  '35,000 questions all-time, spread across 160+ practice days.':
    '35.000 perguntas no total, distribuídas em 160+ dias de prática.',
  '50,000 questions all-time, spread across 220+ practice days.':
    '50.000 perguntas no total, distribuídas em 220+ dias de prática.',
  // Sharpshooter
  'Hold 85% accuracy over at least 200 questions, across every instrument.':
    'Mantenha 85% de precisão em pelo menos 200 perguntas, somando todos os instrumentos.',
  '88% accuracy over at least 500 questions.': '88% de precisão em pelo menos 500 perguntas.',
  '92% accuracy over at least 1,000 questions.': '92% de precisão em pelo menos 1.000 perguntas.',
  '93% accuracy over at least 2,500 questions, spread across 30+ practice days.':
    '93% de precisão em pelo menos 2.500 perguntas, distribuídas em 30+ dias de prática.',
  '94% accuracy over at least 5,000 questions, spread across 60+ practice days.':
    '94% de precisão em pelo menos 5.000 perguntas, distribuídas em 60+ dias de prática.',
  // Quick Read
  'Hold an average answer time under 2.0s over 200+ questions.':
    'Mantenha um tempo médio de resposta abaixo de 2,0 s em 200+ perguntas.',
  'Under 1.6s over 500+ questions.': 'Abaixo de 1,6 s em 500+ perguntas.',
  'Under 1.3s over 1,000+ questions.': 'Abaixo de 1,3 s em 1.000+ perguntas.',
  'Under 1.15s over 2,500+ questions, spread across 30+ practice days.':
    'Abaixo de 1,15 s em 2.500+ perguntas, distribuídas em 30+ dias de prática.',
  'Under 1.05s over 5,000+ questions, spread across 60+ practice days.':
    'Abaixo de 1,05 s em 5.000+ perguntas, distribuídas em 60+ dias de prática.',
  // Most Improved
  'Over 10+ practice days, lift your accuracy by 20 points from your first days to your latest.':
    'Ao longo de 10+ dias de prática, aumente sua precisão em 20 pontos dos primeiros dias até os mais recentes.',
  'Over 15+ practice days, lift your accuracy by 30 points.':
    'Ao longo de 15+ dias de prática, aumente sua precisão em 30 pontos.',
  'Over 20+ practice days, lift your accuracy by 40 points.':
    'Ao longo de 20+ dias de prática, aumente sua precisão em 40 pontos.',
  // Doubling Up
  'Earn String Master on every string of both guitar and bass.':
    'Conquiste Mestre da corda em todas as cordas, tanto no violão quanto no baixo.',
  'Earn Full String Master — Silver on both guitar and bass.':
    'Conquiste Mestre de todas as cordas — Prata, tanto no violão quanto no baixo.',
  'Earn Full String Master — Gold and Neck Runner — Gold on both guitar and bass.':
    'Conquiste Mestre de todas as cordas — Ouro e Corredor do braço — Ouro, tanto no violão quanto no baixo.',
  'Earn Full String Master — Platinum and Neck Runner — Platinum on both guitar and bass.':
    'Conquiste Mestre de todas as cordas — Platina e Corredor do braço — Platina, tanto no violão quanto no baixo.',
  'Earn Full String Master — Diamond and Neck Runner — Diamond on both guitar and bass.':
    'Conquiste Mestre de todas as cordas — Diamante e Corredor do braço — Diamante, tanto no violão quanto no baixo.',
  // Multi-Instrumentalist
  'Earn Full String Master — Silver on 2 different instruments.':
    'Conquiste Mestre de todas as cordas — Prata em 2 instrumentos diferentes.',
  'Earn Full String Master — Silver on 3 different instruments.':
    'Conquiste Mestre de todas as cordas — Prata em 3 instrumentos diferentes.',
  'Earn Full String Master — Gold on 4 different instruments.':
    'Conquiste Mestre de todas as cordas — Ouro em 4 instrumentos diferentes.',
  'Earn Full String Master — Gold on all 5 instruments.':
    'Conquiste Mestre de todas as cordas — Ouro nos 5 instrumentos.',
  'Earn Full String Master — Platinum on all 5 instruments.':
    'Conquiste Mestre de todas as cordas — Platina nos 5 instrumentos.',
  // Admin (role)
  'Granted to app administrators — read every Feedback board post, not just your own.':
    'Concedida aos administradores do app — permite ler todas as publicações do mural de sugestões, não só as suas.',
  // Guest-merge prompt — first sign-in on a device with local guest history
  'Add this device’s progress to your account?': 'Adicionar o progresso deste aparelho à sua conta?',
  'You’ve practiced on this device without an account. Add that progress to your account, or keep only what’s already on your account?':
    'Você praticou neste aparelho sem uma conta. Quer adicionar esse progresso à sua conta ou manter só o que já está nela?',
  'Merge my progress': 'Juntar meu progresso',
  'Use account only': 'Usar só a conta',
  'Leave this practice off your account?': 'Deixar esta prática fora da sua conta?',
  'You have {n} rounds of practice saved on this device. If you continue, they stay on this device but are not added to your account.':
    'Você tem {n} rodadas de prática salvas neste aparelho. Se continuar, elas ficam neste aparelho, mas não são adicionadas à sua conta.',
  // VoiceCalibration
  'Voice calibration': 'Calibração de voz',
  'Personal voice calibration': 'Calibração de voz pessoal',
  'Profile name': 'Nome do perfil',
  'Say just this word, on its own': 'Diga só esta palavra, sozinha',
  'Say just the note name, on its own': 'Diga só o nome da nota, sozinho',
  'Speak clearly and pause briefly between words — later, when answering, say the letter, pause, then “sharp” / “flat” as two separate words.':
    'Fale com clareza e faça uma breve pausa entre as palavras — depois, ao responder, diga a letra, faça uma pausa e então “sharp” / “flat” como duas palavras separadas.',
  'Could not use the microphone — try again': 'Não foi possível usar o microfone — tente de novo',
  'No sound captured — try again, closer to the mic':
    'Nenhum som captado — tente de novo, mais perto do microfone',
  'Recording too short — try again': 'Gravação curta demais — tente de novo',
  "That didn't sound like a note — try again": 'Isso não pareceu uma nota — tente de novo',
  'Saving the recording failed': 'Não foi possível salvar a gravação',
  'Recorded': 'Gravadas',
  'notes': 'notas',
  'accidentals': 'acidentes',
  'Say:': 'Diga:',
  'Play last recording': 'Tocar a última gravação',
  'Export recordings to a folder (dev)': 'Exportar gravações para uma pasta (dev)',
  'Stop exporting recordings': 'Parar de exportar gravações',
  'Every accepted take is also saved as a WAV, named for scripts/eval-voice.mts.':
    'Cada take aceito também é salvo como WAV, com o nome que scripts/eval-voice.mts espera.',
  'Could not write to the export folder — pick it again':
    'Não foi possível gravar na pasta de exportação — escolha-a de novo',
  'Speak the word on screen — calibration advances on its own':
    'Diga a palavra que aparece na tela — a calibração avança sozinha',
  'Take': 'Take',
  'Previous': 'Anterior',
  'Next': 'Próximo',
  'Delete profile': 'Apagar perfil',
  'Reset automatic learning of the general mode': 'Redefinir o aprendizado automático do modo geral',
  'Checking recordings…': 'Verificando gravações…',
  'Self-test recordings': 'Autoteste das gravações',
  'All words are distinct enough — looks good.': 'Todas as palavras são distintas o bastante — tudo certo.',
  'Finish & enable': 'Concluir e ativar',
  '“{a}” and “{b}” sound very similar — re-record one of them.':
    '“{a}” e “{b}” soam parecidos demais — grave um deles de novo.',
  'Recording extra takes to tell “{a}” and “{b}” apart':
    'Gravando takes extras para distinguir “{a}” de “{b}”',
  'No recordings for “{prompt}” yet': 'Ainda não há gravações de “{prompt}”',
  'Delete take {n} of {prompt}': 'Apagar o take {n} de {prompt}',
  'Record {n} more takes for “{a}” and “{b}”': 'Gravar mais {n} takes de “{a}” e “{b}”',
  'to go': 'restantes',
  // VoiceLevelMeter
  'Microphone level good': 'Nível do microfone bom',
  'Microphone level low, speak louder': 'Nível do microfone baixo, fale mais alto',
  'Good level': 'Nível bom',
  'Too quiet — speak up': 'Baixo demais — fale mais alto',
  // DebugLogPanel
  'Debug log': 'Registro de depuração',
  'Open debug log': 'Abrir registro de depuração',
  'Errors + voice · auto-clears daily': 'Erros + voz · limpa sozinho todo dia',
  'Errors · auto-clears daily': 'Erros · limpa sozinho todo dia',
  'Voice: on': 'Voz: ligada',
  'Voice: off': 'Voz: desligada',
  'Copied': 'Copiado',
  'Copy': 'Copiar',
  'Clear': 'Limpar',
  'Close': 'Fechar',
  '(no errors)': '(sem erros)',
  // FeedbackBoard
  'Couldn’t load the board. Check your connection and try again.':
    'Não foi possível carregar o mural. Verifique sua conexão e tente de novo.',
  'Couldn’t send that. Check your connection and try again.':
    'Não foi possível enviar. Verifique sua conexão e tente de novo.',
  'Sign in with Google to leave a comment, idea, or suggestion. Only admins can read the full board.':
    'Entre com o Google para deixar um comentário, uma ideia ou uma sugestão. Só os administradores podem ler o mural inteiro.',
  'Microphone access is off — turn it on to dictate.':
    'O acesso ao microfone está desligado — ative-o para ditar.',
  'Voice typing isn’t available on this device.': 'A digitação por voz não está disponível neste aparelho.',
  'Couldn’t hear that — try again.': 'Não deu para ouvir — tente de novo.',
  'What’s on your mind?': 'O que você quer nos contar?',
  'Stop voice typing': 'Parar a digitação por voz',
  'Start voice typing': 'Iniciar a digitação por voz',
  'Sending…': 'Enviando…',
  'Send': 'Enviar',
  'Listening… say one sentence — it stops on its own.': 'Ouvindo… diga uma frase — para sozinho.',
  'Thanks — your message was sent.': 'Obrigado — sua mensagem foi enviada.',
  'Unknown': 'Desconhecido',
  'You': 'Você',
  'Handled': 'Resolvido',
  'Mark unhandled': 'Marcar como pendente',
  'Mark handled': 'Marcar como resolvido',
  'Delete': 'Apagar',
  'You haven’t sent anything yet.': 'Você ainda não enviou nada.',
  'Share a comment, idea, or suggestion. Admins read every post; below you can see the ones you’ve sent.':
    'Compartilhe um comentário, uma ideia ou uma sugestão. Os administradores leem todas as publicações; abaixo você vê as que enviou.',
  'Write': 'Escrever',
  'Inbox': 'Caixa de entrada',
  'Post a comment, idea, or suggestion of your own.': 'Publique seu próprio comentário, ideia ou sugestão.',
  'Every post from every user': 'Todas as publicações de todos os usuários',
  'still to handle': 'pendentes',
  'Mark one handled once you’ve dealt with it, or delete it.':
    'Marque uma como resolvida depois de tratá-la, ou apague-a.',
  'No posts yet.': 'Ainda não há publicações.',
  'Nothing open — all caught up.': 'Nada pendente — tudo em dia.',
  'Delete post': 'Apagar publicação',
  'Delete this post?': 'Apagar esta publicação?',
  'This permanently removes it for everyone, including': 'Isso a remove de vez para todos, inclusive',
  'the author': 'o autor',
  'It can’t be undone.': 'Não é possível desfazer.',
  'Delete for everyone': 'Apagar para todos',
  // Quick Access — the floating home-screen control, its Settings row and pushpins
  'Quick access': 'Acesso rápido',
  'A floating button on the home screen for the settings you flip most. Pin up to 5 with the pushpins below, then double-tap the lower-right of the screen outside a drill to open it.':
    'Um botão flutuante na tela inicial para as configurações que você mais troca. Fixe até 5 com os alfinetes abaixo e depois toque duas vezes no canto inferior direito da tela, fora de um exercício, para abri-lo.',
  'Pin to quick access?': 'Fixar no acesso rápido?',
  'Remove from quick access?': 'Remover do acesso rápido?',
  'You can pin up to {n} settings. Remove one first.':
    'Você pode fixar até {n} configurações. Remova uma primeiro.',
  'Quick access is full': 'O acesso rápido está cheio',
  'You already have {n} shortcuts. Remove one to make room?':
    'Você já tem {n} atalhos. Remover um para abrir espaço?',
  'Remove one': 'Remover um',
  'Leave as is': 'Deixar como está',
  'Remove a quick access shortcut': 'Remover um atalho do acesso rápido',
  'Quick access holds five shortcuts. Remove one to make room.':
    'O acesso rápido comporta cinco atalhos. Remova um para abrir espaço.',
  'Remove {name} from quick access': 'Remover {name} do acesso rápido',
  'Yes': 'Sim',
  'No': 'Não',
  'Double-tap the lower-right of the screen for quick access':
    'Toque duas vezes no canto inferior direito da tela para o acesso rápido',
  'Double-tap the lower-left of the screen for quick access':
    'Toque duas vezes no canto inferior esquerdo da tela para o acesso rápido',
  'Quick access is off': 'O acesso rápido está desligado',
  "You haven't pinned any quick access shortcuts yet": 'Você ainda não fixou nenhum atalho no acesso rápido',
  'What do the icons mean?': 'O que os ícones significam?',
  'Quick access symbol legend': 'Legenda dos símbolos do acesso rápido',
  'What each icon on the Quick Access widget means. Tapping a pinned shortcut cycles through these states in order.':
    'O que cada ícone do acesso rápido significa. Tocar em um atalho fixado alterna entre estes estados, nesta ordem.',
  'Letters (A B C)': 'Letras (A B C)',
  'Sharps (♯)': 'Sustenidos (♯)',
  'Flats (♭)': 'Bemóis (♭)',
  // Tuner — the Learn-tab tile that opens a live chromatic tuner
  'Tuner': 'Afinador',
  'Tune your strings using the microphone.': 'Afine suas cordas usando o microfone.',
  'Start listening': 'Começar a ouvir',
  'Requesting microphone permission…': 'Pedindo permissão para o microfone…',
  'Microphone access was denied. Allow it in your browser settings, then try again.':
    'O acesso ao microfone foi negado. Permita-o nas configurações do navegador e tente de novo.',
  'Try again': 'Tentar de novo',
  "Couldn't start the microphone.": 'Não foi possível ligar o microfone.',
  'Listening… play a note.': 'Ouvindo… toque uma nota.',
  "Tap a note on the wheel to lock it as the string you're tuning. Tap it again to switch back to auto-detect.":
    'Toque em uma nota da roda para fixá-la como a corda que você está afinando. Toque de novo para voltar à detecção automática.',
  'Tuning': 'Afinando',
  'Detected': 'Detectada',
  'String {n}': 'Corda {n}',
  'or': 'ou',
  'Unpin': 'Soltar',
  "Tap to lock this note at 12 o'clock": 'Toque para fixar esta nota no alto, às 12 horas',
  'Tap to unpin': 'Toque para soltar',
  'In tune': 'Afinada',
  'Tighten (raise pitch)': 'Aperte (suba a afinação)',
  'Loosen (lower pitch)': 'Afrouxe (desça a afinação)',
  '~{pct}% of the audible threshold': '~{pct}% do limiar audível',
};
