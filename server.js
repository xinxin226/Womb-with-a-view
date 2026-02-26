const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Clean URLs (no .html) — work on any device (Wi‑Fi, cellular, etc.)
app.get('/host', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'host.html'));
});
app.get('/host.html', (req, res) => res.redirect(301, '/host'));
app.get('/index.html', (req, res) => res.redirect(301, '/'));
app.use(express.static(path.join(__dirname, 'public')));

// Part 3 "What in the womb" images (slide 4-15 from PPT)
const PART3_IMAGES = [
  'image18.png', 'image5.png', 'image16.png', 'image10.png', 'image6.png',
  'image7.png', 'image19.png', 'image14.png', 'image17.png', 'image12.png', 'image11.png',
  'image20.png'
];

// Overlay box position/size as % of image (from PowerPoint slide coords) — 100% opaque to cover yellow text
const PART3_OVERLAYS = [
  { left: 3.6, top: 11.15, width: 15, height: 11.8 },
  { left: 3.35, top: 10.18, width: 15.08, height: 11.79 },
  { left: 5.76, top: 8.69, width: 14.89, height: 11.92 },
  { left: 7.65, top: 11.37, width: 13.44, height: 12.23 },
  { left: 4.01, top: 11.29, width: 13.44, height: 12.14 },
  { left: 4.01, top: 11.54, width: 33.79, height: 11.84 },
  { left: 4.01, top: 11.67, width: 24.34, height: 11.31 },
  { left: 0.74, top: 11.59, width: 24.34, height: 11.11 },
  { left: 2.32, top: 11.88, width: 24.34, height: 11.27 },
  { left: 2.32, top: 10.49, width: 24.34, height: 11.31 },
  { left: 1.53, top: 9.37, width: 24.34, height: 11.58 },
  { left: 30.7, top: 32.9, width: 24.1, height: 10.0 }
];

const NOSE_OPTIONS = [
  { id: 'A', label: 'Pointy' },
  { id: 'B', label: 'Whoville' },
  { id: 'C', label: 'Rounded' },
  { id: 'D', label: 'Tiny boop' }
];

const QUESTION_SECONDS = 30;

// Single active game (no code needed for players)
let currentGame = null;
// Participants who joined before the host created a game (wait in lobby until then)
const waitingPlayers = new Map(); // socketId -> { name }

function createGame(hostSocketId) {
  const code = 'GAME';
  currentGame = {
    code,
    hostSocketId,
    players: new Map(),
    phase: 'lobby',
    part1: { answers: [], closed: false, startedAt: null },
    part2: { answers: [], closed: false, startedAt: null },
    part3: {
      imageIndex: 0,
      answers: [],
      revealed: false,
      correctPlayerIds: new Set(),
      startedAt: null
    }
  };
  return currentGame;
}

function isQuestionClosed(game, partKey) {
  const part = game[partKey];
  if (!part) return true;
  if (!part.startedAt) return !!part.closed;
  const elapsed = (Date.now() - part.startedAt) / 1000;
  const playerCount = game.players.size;
  const answerCount = partKey === 'part1' ? part.answers.length : partKey === 'part2' ? part.answers.length : (part.answers[game.part3.imageIndex] || []).length;
  const everyoneGuessed = playerCount > 0 && answerCount >= playerCount;
  return !!part.closed || elapsed >= QUESTION_SECONDS || everyoneGuessed;
}

function timeRemaining(game, partKey) {
  const part = game[partKey];
  if (!part?.startedAt) return QUESTION_SECONDS;
  const elapsed = (Date.now() - part.startedAt) / 1000;
  return Math.max(0, Math.ceil(QUESTION_SECONDS - elapsed));
}

io.on('connection', (socket) => {
  console.log('[server] Client connected:', socket.id);

  socket.on('host:create', () => {
    const game = createGame(socket.id);
    socket.join(game.code);
    socket.gameCode = game.code;
    socket.emit('game:code', { code: game.code });
    // Move all waiting players into the new game
    waitingPlayers.forEach((data, playerSocketId) => {
      const playerSocket = io.sockets.sockets.get(playerSocketId);
      if (!playerSocket) return;
      const player = { name: data.name, id: playerSocketId, points: 0 };
      game.players.set(playerSocketId, player);
      playerSocket.join(game.code);
      playerSocket.gameCode = game.code;
      playerSocket.playerId = playerSocketId;
      playerSocket.emit('joined', { playerId: playerSocketId, name: player.name });
      playerSocket.emit('game:state', serializeGameForPlayer(game, playerSocketId));
    });
    waitingPlayers.clear();
    socket.emit('game:state', serializeGameForHost(game));
    io.to(game.code).emit('game:state', serializeGameForHost(game));
    console.log('[server] Game created by host', socket.id, '- players in game:', game.players.size);
  });

  socket.on('host:join', () => {
    if (!currentGame) {
      socket.emit('error', { message: 'No game. Create one first from the host page.' });
      return;
    }
    const game = currentGame;
    if (game.hostSocketId !== socket.id) {
      socket.emit('error', { message: 'Only the host can open the host page.' });
      return;
    }
    socket.join(game.code);
    socket.gameCode = game.code;
    socket.emit('game:state', serializeGameForHost(game));
  });

  socket.on('player:join', (data) => {
    const name = String((data && data.name) || 'Player').slice(0, 30);
    console.log('[server] player:join from', socket.id, 'name=', name, 'currentGame exists=', !!currentGame);
    if (currentGame) {
      const game = currentGame;
      const playerId = socket.id;
      const player = { name, id: playerId, points: 0 };
      game.players.set(playerId, player);
      socket.join(game.code);
      socket.gameCode = game.code;
      socket.playerId = playerId;
      socket.emit('joined', { playerId, name: player.name });
      socket.emit('game:state', serializeGameForPlayer(game, playerId));
      io.to(game.code).emit('game:state', serializeGameForHost(game));
      console.log('[server] Player joined:', player.name, '- total players:', game.players.size);
    } else {
      waitingPlayers.set(socket.id, { name });
      socket.gameCode = 'WAITING';
      socket.playerId = socket.id;
      socket.emit('joined', { playerId: socket.id, name });
      socket.emit('game:state', serializeWaitingLobby(name));
      console.log('[server] Player waiting in lobby:', name, '- total waiting:', waitingPlayers.size);
    }
  });

  socket.on('host:resetToLobby', () => {
    if (!currentGame || currentGame.hostSocketId !== socket.id) return;
    const game = currentGame;
    game.phase = 'lobby';
    game.part1.closed = false;
    game.part1.answers = [];
    game.part1.startedAt = null;
    game.part2.closed = false;
    game.part2.answers = [];
    game.part2.startedAt = null;
    game.part3.imageIndex = 0;
    game.part3.answers = [];
    game.part3.revealed = false;
    game.part3.correctPlayerIds = new Set();
    game.part3.startedAt = null;
    game.players.forEach(p => { p.points = 0; });
    io.to(game.code).emit('game:state', serializeGameForHost(game));
    broadcastPlayerStates(game);
  });

  socket.on('host:startPart1', () => {
    if (!currentGame || currentGame.hostSocketId !== socket.id) return;
    const game = currentGame;
    game.phase = 'part1';
    game.part1.closed = false;
    game.part1.answers = [];
    game.part1.startedAt = Date.now();
    io.to(game.code).emit('game:state', serializeGameForHost(game));
    broadcastPlayerStates(game);
  });

  socket.on('host:closePart1', () => {
    if (!currentGame || currentGame.hostSocketId !== socket.id) return;
    const game = currentGame;
    game.part1.closed = true;
    game.phase = 'part1_results';
    io.to(game.code).emit('game:state', serializeGameForHost(game));
    broadcastPlayerStates(game);
  });

  socket.on('host:startPart2', () => {
    if (!currentGame || currentGame.hostSocketId !== socket.id) return;
    const game = currentGame;
    game.phase = 'part2';
    game.part2.closed = false;
    game.part2.answers = [];
    game.part2.startedAt = Date.now();
    io.to(game.code).emit('game:state', serializeGameForHost(game));
    broadcastPlayerStates(game);
  });

  socket.on('host:closePart2', () => {
    if (!currentGame || currentGame.hostSocketId !== socket.id) return;
    const game = currentGame;
    game.part2.closed = true;
    game.phase = 'part2_results';
    io.to(game.code).emit('game:state', serializeGameForHost(game));
    broadcastPlayerStates(game);
  });

  socket.on('host:startPart3', () => {
    if (!currentGame || currentGame.hostSocketId !== socket.id) return;
    const game = currentGame;
    game.phase = 'part3';
    game.part3.imageIndex = 0;
    game.part3.answers = [];
    game.part3.revealed = false;
    game.part3.correctPlayerIds = new Set();
    game.part3.startedAt = Date.now();
    io.to(game.code).emit('game:state', serializeGameForHost(game));
    broadcastPlayerStates(game);
  });

  socket.on('host:nextPart3Image', () => {
    if (!currentGame || currentGame.hostSocketId !== socket.id) return;
    const game = currentGame;
    const idx = game.part3.imageIndex;
    if (idx >= PART3_IMAGES.length - 1) {
      game.phase = 'part3_results';
      game.part3.revealed = true;
    } else {
      game.part3.imageIndex = idx + 1;
      game.part3.revealed = false;
      game.part3.correctPlayerIds = new Set();
      game.part3.startedAt = Date.now();
    }
    io.to(game.code).emit('game:state', serializeGameForHost(game));
    broadcastPlayerStates(game);
  });

  socket.on('host:closePart3Question', () => {
    if (!currentGame || currentGame.hostSocketId !== socket.id) return;
    const game = currentGame;
    game.part3.revealed = true;
    game.phase = 'part3_review';
    io.to(game.code).emit('game:state', serializeGameForHost(game));
    broadcastPlayerStates(game);
  });

  socket.on('host:setPart3Correct', ({ playerIds }) => {
    if (!currentGame || currentGame.hostSocketId !== socket.id) return;
    const game = currentGame;
    (playerIds || []).forEach(id => {
      if (!game.part3.correctPlayerIds.has(id)) {
        game.part3.correctPlayerIds.add(id);
        const p = game.players.get(id);
        if (p) p.points = (p.points || 0) + 1;
      }
    });
    // After awarding, automatically advance to next image (or part3_results if last)
    const idx = game.part3.imageIndex;
    if (idx >= PART3_IMAGES.length - 1) {
      game.phase = 'part3_results';
      game.part3.revealed = true;
    } else {
      game.part3.imageIndex = idx + 1;
      game.part3.revealed = false;
      game.part3.correctPlayerIds = new Set();
      game.part3.startedAt = Date.now();
      game.phase = 'part3';
    }
    io.to(game.code).emit('game:state', serializeGameForHost(game));
    broadcastPlayerStates(game);
  });

  socket.on('host:revealPart3', () => {
    if (!currentGame || currentGame.hostSocketId !== socket.id) return;
    const game = currentGame;
    game.part3.revealed = true;
    io.to(game.code).emit('game:state', serializeGameForHost(game));
    broadcastPlayerStates(game);
  });

  socket.on('player:part1', ({ text }) => {
    if (!currentGame || currentGame.phase !== 'part1') return;
    if (isQuestionClosed(currentGame, 'part1')) return;
    const player = currentGame.players.get(socket.playerId);
    if (!player) return;
    const existing = currentGame.part1.answers.find(a => a.playerId === socket.playerId);
    if (existing) existing.text = (text || '').slice(0, 120);
    else currentGame.part1.answers.push({ playerId: socket.playerId, name: player.name, text: (text || '').slice(0, 120) });
    io.to(currentGame.code).emit('game:state', serializeGameForHost(currentGame));
    broadcastPlayerStates(currentGame);
  });

  socket.on('player:part2', ({ optionId }) => {
    if (!currentGame || currentGame.phase !== 'part2') return;
    if (isQuestionClosed(currentGame, 'part2')) return;
    const player = currentGame.players.get(socket.playerId);
    if (!player) return;
    const valid = ['A', 'B', 'C', 'D'].includes(optionId);
    const existing = currentGame.part2.answers.find(a => a.playerId === socket.playerId);
    if (existing) existing.optionId = valid ? optionId : 'A';
    else currentGame.part2.answers.push({ playerId: socket.playerId, name: player.name, optionId: valid ? optionId : 'A' });
    io.to(currentGame.code).emit('game:state', serializeGameForHost(currentGame));
    broadcastPlayerStates(currentGame);
  });

  socket.on('player:part3', ({ text }) => {
    if (!currentGame || currentGame.phase !== 'part3' || currentGame.part3.revealed) return;
    const part3Closed = isQuestionClosed(currentGame, 'part3');
    if (part3Closed) return;
    const player = currentGame.players.get(socket.playerId);
    if (!player) return;
    const idx = currentGame.part3.imageIndex;
    if (!currentGame.part3.answers[idx]) currentGame.part3.answers[idx] = [];
    const arr = currentGame.part3.answers[idx];
    const existing = arr.find(a => a.playerId === socket.playerId);
    if (existing) existing.text = (text || '').slice(0, 200);
    else arr.push({ playerId: socket.playerId, name: player.name, text: (text || '').slice(0, 200) });
    io.to(currentGame.code).emit('game:state', serializeGameForHost(currentGame));
    broadcastPlayerStates(currentGame);
  });

  socket.on('disconnect', () => {
    waitingPlayers.delete(socket.id);
    if (!currentGame) return;
    const game = currentGame;
    if (game.hostSocketId === socket.id) {
      currentGame = null;
      io.to(game.code).emit('game:ended', { message: 'Host left the game.' });
      return;
    }
    game.players.delete(socket.playerId);
    io.to(game.code).emit('game:state', serializeGameForHost(game));
    broadcastPlayerStates(game);
  });
});

function serializeWaitingLobby(playerName) {
  return {
    code: 'WAITING',
    isHost: false,
    phase: 'lobby',
    myPoints: 0,
    waitingForHost: true,
    playerName
  };
}

function serializeGameForHost(game) {
  const part3Answers = game.part3.answers;
  const currentPart3List = Array.isArray(part3Answers[game.part3.imageIndex])
    ? part3Answers[game.part3.imageIndex] : (part3Answers[game.part3.imageIndex] ? [part3Answers[game.part3.imageIndex]] : []);
  const part1Closed = isQuestionClosed(game, 'part1');
  const part2Closed = isQuestionClosed(game, 'part2');
  return {
    code: game.code,
    isHost: true,
    phase: game.phase,
    players: Array.from(game.players.values()),
    part1: { answers: game.part1.answers, closed: part1Closed, timeRemaining: timeRemaining(game, 'part1'), startedAt: game.part1.startedAt },
    part2: { answers: game.part2.answers, closed: part2Closed, timeRemaining: timeRemaining(game, 'part2'), startedAt: game.part2.startedAt },
    part3: {
      imageIndex: game.part3.imageIndex,
      image: PART3_IMAGES[game.part3.imageIndex],
      imageCount: PART3_IMAGES.length,
      overlay: PART3_OVERLAYS[game.part3.imageIndex],
      answers: currentPart3List,
      revealed: game.part3.revealed,
      correctPlayerIds: Array.from(game.part3.correctPlayerIds || []),
      timeRemaining: timeRemaining(game, 'part3'),
      startedAt: game.part3.startedAt
    },
    part3Images: PART3_IMAGES,
    noseOptions: NOSE_OPTIONS
  };
}

function serializeGameForPlayer(game, playerId) {
  const part3Answers = game.part3.answers;
  const currentPart3List = Array.isArray(part3Answers[game.part3.imageIndex])
    ? part3Answers[game.part3.imageIndex] : [];
  const me = game.players.get(playerId);
  const part1Closed = isQuestionClosed(game, 'part1');
  const part2Closed = isQuestionClosed(game, 'part2');
  const part3Closed = game.phase === 'part3' && (game.part3.revealed || isQuestionClosed(game, 'part3'));
  const myPart1 = game.part1.answers.find(a => a.playerId === playerId);
  const myPart2 = game.part2.answers.find(a => a.playerId === playerId);
  const myPart3Arr = currentPart3List.find(a => a.playerId === playerId);
  return {
    code: game.code,
    isHost: false,
    phase: game.phase,
    myPoints: me ? me.points : 0,
    part1: {
      closed: part1Closed,
      timeRemaining: timeRemaining(game, 'part1'),
      startedAt: game.part1.startedAt,
      hasSubmitted: !!myPart1,
      myText: myPart1 ? myPart1.text : ''
    },
    part2: {
      closed: part2Closed,
      timeRemaining: timeRemaining(game, 'part2'),
      startedAt: game.part2.startedAt,
      hasSubmitted: !!myPart2,
      selectedOptionId: myPart2 ? myPart2.optionId : null
    },
    part3: {
      imageIndex: game.part3.imageIndex,
      image: PART3_IMAGES[game.part3.imageIndex],
      imageCount: PART3_IMAGES.length,
      overlay: PART3_OVERLAYS[game.part3.imageIndex],
      revealed: game.part3.revealed,
      timeRemaining: timeRemaining(game, 'part3'),
      startedAt: game.part3.startedAt,
      hasSubmitted: !!myPart3Arr,
      myText: myPart3Arr ? myPart3Arr.text : '',
      allAnswers: game.phase === 'part3_review' ? currentPart3List : null
    },
    part1Results: game.phase === 'part1_results' ? game.part1.answers : null,
    part2Results: game.phase === 'part2_results' ? { answers: game.part2.answers, options: NOSE_OPTIONS } : null,
    part3Results: game.phase === 'part3_results' ? {
      myPoints: me ? me.points : 0,
      leaderboard: Array.from(game.players.values()).sort((a, b) => (b.points || 0) - (a.points || 0))
    } : null,
    noseOptions: NOSE_OPTIONS
  };
}

function broadcastPlayerStates(game) {
  game.players.forEach((player, playerId) => {
    io.to(playerId).emit('game:state', serializeGameForPlayer(game, playerId));
  });
}

function broadcastGameState(game) {
  io.to(game.hostSocketId).emit('game:state', serializeGameForHost(game));
  broadcastPlayerStates(game);
}

// Auto-advance when time is up (30s) or everyone has submitted — no host action required
setInterval(() => {
  if (!currentGame) return;
  const game = currentGame;
  if (game.phase === 'part1' && isQuestionClosed(game, 'part1')) {
    game.phase = 'part1_results';
    broadcastGameState(game);
    return;
  }
  if (game.phase === 'part2' && isQuestionClosed(game, 'part2')) {
    game.phase = 'part2_results';
    broadcastGameState(game);
    return;
  }
  if (game.phase === 'part3' && !game.part3.revealed && isQuestionClosed(game, 'part3')) {
    game.part3.revealed = true;
    game.phase = 'part3_review';
    broadcastGameState(game);
  }
}, 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Womb with a View running at http://localhost:${PORT}`);
  console.log('Host: /host  —  Participants: / (root URL)');
});
