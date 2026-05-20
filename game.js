const ROWS = 2;
const COLS = 4;
const INITIAL_SEEDS = 6;
const PLAYER_1 = 0;
const PLAYER_2 = 1;

const villageNames = [
  ["Village A1", "Village A2", "Village A3", "Village A4"],
  ["Village B1", "Village B2", "Village B3", "Village B4"],
];

const distributionCycle = [
  { row: PLAYER_1, col: 3 },
  { row: PLAYER_2, col: 3 },
  { row: PLAYER_2, col: 2 },
  { row: PLAYER_2, col: 1 },
  { row: PLAYER_2, col: 0 },
  { row: PLAYER_1, col: 0 },
  { row: PLAYER_1, col: 1 },
  { row: PLAYER_1, col: 2 },
];

let board;
let currentPlayer;
let scores;
let lastVillage;
let capturedVillages;
let openingPlayed;
let gameOver;
let gameResult;
let finalTotals;
let lastFlashVillage;
let lastFlashTimer;
let sowingVillage;
let isAnimating;
let audioContext;
let animationRunId;
let timerStartedAt;
let timerInterval;
let elapsedSeconds;
let gameRecorded;
let matchHistory;

const boardEl = document.querySelector("#board");
const turnTextEl = document.querySelector("#turn-text");
const timerTextEl = document.querySelector("#timer-text");
const score1El = document.querySelector("#score-1");
const score2El = document.querySelector("#score-2");
const total1El = document.querySelector("#total-1");
const total2El = document.querySelector("#total-2");
const totalEls = document.querySelectorAll(".player-total");
const resultTextEl = document.querySelector("#result-text");
const player1Card = document.querySelector("#player-1-card");
const player2Card = document.querySelector("#player-2-card");
const logList = document.querySelector("#log-list");
const resetButton = document.querySelector("#reset-button");
const drawButton = document.querySelector("#draw-button");
const rulesButton = document.querySelector("#rules-button");
const rulesPanel = document.querySelector("#rules-panel");
const clearHistoryButton = document.querySelector("#clear-history-button");
const wins1El = document.querySelector("#wins-1");
const wins2El = document.querySelector("#wins-2");
const drawsCountEl = document.querySelector("#draws-count");
const matchListEl = document.querySelector("#match-list");
const navLinks = document.querySelectorAll("[data-page-link]");
const pages = document.querySelectorAll(".page");

matchHistory = loadMatchHistory();

function newGame() {
  stopTimer();
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(INITIAL_SEEDS));
  currentPlayer = PLAYER_1;
  scores = [0, 0];
  lastVillage = null;
  capturedVillages = [];
  lastFlashVillage = null;
  clearLastFlashTimer();
  openingPlayed = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  gameOver = false;
  gameResult = "";
  finalTotals = null;
  sowingVillage = null;
  isAnimating = false;
  animationRunId = (animationRunId || 0) + 1;
  elapsedSeconds = 0;
  gameRecorded = false;
  logList.innerHTML = "";
  addLog("La partie commence. Chaque village contient 6 pions.");
  startTimer();
  render();
  renderMatchHistory();
}

function getOpponent(player) {
  return player === PLAYER_1 ? PLAYER_2 : PLAYER_1;
}

function getPlayerName(player) {
  return player === PLAYER_1 ? "Joueur 1" : "Joueur 2";
}

function getRowTotal(player) {
  return board[player].reduce((total, seeds) => total + seeds, 0);
}

function getPlayerTotal(player) {
  if (finalTotals) {
    return finalTotals[player];
  }

  return scores[player] + getRowTotal(player);
}

function canPlayerAct(player) {
  return getPlayableCols(player).length > 0;
}

function getPlayableCols(player) {
  return board[player]
    .map((seeds, col) => ({ seeds, col }))
    .filter(({ seeds, col }) => seeds >= 2 && isAllowedByOpening(player, col))
    .map(({ col }) => col);
}

function isOpeningPhase() {
  return openingPlayed.some((row) => row.some((played) => !played));
}

function isAllowedByOpening(player, col) {
  if (!isOpeningPhase()) {
    return true;
  }

  return !openingPlayed[player][col];
}

function getNextVillage(row, col) {
  const currentIndex = distributionCycle.findIndex((village) => village.row === row && village.col === col);
  const nextIndex = (currentIndex + 1) % distributionCycle.length;

  return distributionCycle[nextIndex];
}

async function playVillage(row, col) {
  if (isAnimating || gameOver || row !== currentPlayer || board[row][col] < 2 || !isAllowedByOpening(row, col)) {
    return;
  }

  isAnimating = true;
  const runId = animationRunId;
  capturedVillages = [];
  lastVillage = null;

  let seeds = board[row][col];
  board[row][col] = 0;
  const wasOpeningPhase = isOpeningPhase();
  openingPlayed[row][col] = true;
  let position = { row, col };
  const sowingPath = [];

  while (seeds > 0) {
    position = getNextVillage(position.row, position.col);
    board[position.row][position.col] += 1;
    sowingPath.push({ ...position });
    sowingVillage = { ...position };
    playSowSound();
    render();
    await sleep(230);
    if (runId !== animationRunId) {
      return;
    }
    seeds -= 1;
  }

  sowingVillage = null;
  lastVillage = position;
  flashLastVillage(position);
  const captured = wasOpeningPhase ? { total: 0, villages: [] } : captureFrom(position, currentPlayer);
  scores[currentPlayer] += captured.total;

  const fromName = villageNames[row][col];
  const lastName = villageNames[position.row][position.col];
  const captureText = captured.total > 0
    ? `${getPlayerName(currentPlayer)} mange ${captured.total} pion(s).`
    : "Aucune capture.";

  addLog(`${getPlayerName(currentPlayer)} joue ${fromName}. Semaille: ${formatSowingPath(sowingPath)}. Dernier pion dans ${lastName}. ${captureText}`);

  currentPlayer = getOpponent(currentPlayer);
  handleWaitingPlayers();
  checkEndOfGame();
  isAnimating = false;
  render();
}

function captureFrom(position, player) {
  const opponent = getOpponent(player);
  if (position.row !== opponent || !isCapturable(position.row, position.col)) {
    return { total: 0, villages: [] };
  }

  const villages = [position];
  collectCaptures(position, -1, villages);
  collectCaptures(position, 1, villages);

  let total = 0;
  for (const village of villages) {
    total += board[village.row][village.col];
    board[village.row][village.col] = 0;
  }

  capturedVillages = villages;
  return { total, villages };
}

function collectCaptures(origin, direction, villages) {
  let col = origin.col + direction;

  while (col >= 0 && col < COLS) {
    if (!isCapturable(origin.row, col)) {
      break;
    }

    villages.push({ row: origin.row, col });
    col += direction;
  }
}

function isCapturable(row, col) {
  return board[row][col] === 2 || board[row][col] === 4;
}

function handleWaitingPlayers() {
  let skipped = 0;

  while (!gameOver && !canPlayerAct(currentPlayer) && skipped < 2) {
    addLog(`${getPlayerName(currentPlayer)} attend: aucun de ses villages ne contient au moins 2 pions jouables.`);
    currentPlayer = getOpponent(currentPlayer);
    skipped += 1;
  }

  if (skipped === 2) {
    finishBlockedGame("Plus aucun joueur ne peut jouer.");
  }
}

function checkEndOfGame() {
  if (gameOver) {
    return;
  }

  if (hasReserveDraw()) {
    finishGame("Match nul", `Les deux reserves ont atteint au moins 14 pions: ${getPlayerName(PLAYER_1)} ${scores[PLAYER_1]}, ${getPlayerName(PLAYER_2)} ${scores[PLAYER_2]}.`);
    return;
  }

  if (!canPlayerAct(PLAYER_1) && !canPlayerAct(PLAYER_2)) {
    finishBlockedGame("Il n'y a plus de village jouable.");
  }
}

function hasReserveDraw() {
  return !isOpeningPhase() && scores[PLAYER_1] >= 14 && scores[PLAYER_2] >= 14;
}

function canDeclareDraw() {
  return !isAnimating && !gameOver && hasReserveDraw();
}

function declareDraw() {
  if (!canDeclareDraw()) {
    addLog(`Match nul impossible pour le moment: ${getPlayerName(PLAYER_1)} a ${scores[PLAYER_1]} pion(s) en reserve, ${getPlayerName(PLAYER_2)} en a ${scores[PLAYER_2]}.`);
    return;
  }

  finishGame("Match nul", `Annulation acceptee: ${getPlayerName(PLAYER_1)} a ${scores[PLAYER_1]} pion(s) en reserve, ${getPlayerName(PLAYER_2)} en a ${scores[PLAYER_2]}.`);
}

function finishBlockedGame(reason) {
  const total1 = getPlayerTotal(PLAYER_1);
  const total2 = getPlayerTotal(PLAYER_2);
  finalTotals = [total1, total2];
  placeFinalTotalsInVillages();

  if (total1 >= 14 && total2 >= 14) {
    finishGame("Match nul", `${reason} Bilan replace dans les villages: ${getPlayerName(PLAYER_1)} ${total1}, ${getPlayerName(PLAYER_2)} ${total2}. Les deux joueurs ont au moins 14 pions.`);
    return;
  }

  const winner = total1 === total2 ? null : (total1 > total2 ? PLAYER_1 : PLAYER_2);

  if (winner === null) {
    finishGame("Match nul", `${reason} Bilan replace dans les villages: les deux joueurs totalisent chacun ${total1} pion(s).`);
  } else {
    finishGame(`${getPlayerName(winner)} a Gagne`, `${reason} Bilan replace dans les villages: ${getPlayerName(PLAYER_1)} ${total1}, ${getPlayerName(PLAYER_2)} ${total2}.`);
  }
}

function finishGame(result, reason) {
  gameOver = true;
  gameResult = `Game Over - ${result}`;
  stopTimer();
  if (result !== "Match nul") {
    playVictorySound();
  }
  recordMatch(result, reason);
  addLog(`${gameResult}. ${reason}`);
}

function placeFinalTotalsInVillages() {
  for (let player = 0; player < ROWS; player += 1) {
    let remaining = finalTotals[player];
    const replacementCols = getFinalReplacementCols(player);
    scores[player] = 0;

    for (let index = 0; index < replacementCols.length; index += 1) {
      const col = replacementCols[index];
      const isLastVillage = index === replacementCols.length - 1;
      const villageSeeds = isLastVillage ? remaining : Math.min(remaining, 6);
      board[player][col] = villageSeeds;
      remaining -= villageSeeds;
    }
  }
}

function getFinalReplacementCols(player) {
  if (player === PLAYER_2) {
    return [3, 2, 1, 0];
  }

  return [0, 1, 2, 3];
}

function render() {
  boardEl.innerHTML = "";
  boardEl.append(createReserve(PLAYER_2));
  appendPositionTags(PLAYER_2);

  for (let row = PLAYER_2; row >= PLAYER_1; row -= 1) {
    for (let col = 0; col < COLS; col += 1) {
      const button = document.createElement("button");
      const seeds = board[row][col];
      button.type = "button";
      button.className = "village";
      button.dataset.row = String(row);
      button.dataset.col = String(col);
      button.disabled = isAnimating || gameOver || row !== currentPlayer || seeds < 2 || !isAllowedByOpening(row, col);
      button.setAttribute("aria-label", `${villageNames[row][col]}, ${seeds} pions`);

      if (!button.disabled) {
        button.classList.add("playable");
      }

      if (lastVillage && lastVillage.row === row && lastVillage.col === col) {
        button.classList.add("last");
      }

      if (lastFlashVillage && lastFlashVillage.row === row && lastFlashVillage.col === col) {
        button.classList.add("flash-last");
      }

      if (sowingVillage && sowingVillage.row === row && sowingVillage.col === col) {
        button.classList.add("sowing");
      }

      if (capturedVillages.some((village) => village.row === row && village.col === col)) {
        button.classList.add("captured");
      }

      button.innerHTML = `
        <span class="village-label">${getPlayerName(row)}</span>
        <span class="seed-count">${seeds}</span>
        <span class="seeds" aria-hidden="true">${renderSeeds(seeds)}</span>
      `;
      button.addEventListener("click", () => playVillage(row, col));
      boardEl.append(button);
    }
  }

  appendPositionTags(PLAYER_1);
  boardEl.append(createReserve(PLAYER_1));

  score1El.textContent = scores[PLAYER_1];
  score2El.textContent = scores[PLAYER_2];
  total1El.textContent = getPlayerTotal(PLAYER_1);
  total2El.textContent = getPlayerTotal(PLAYER_2);
  timerTextEl.textContent = formatDuration(elapsedSeconds);
  turnTextEl.textContent = getTurnText();
  resultTextEl.textContent = gameResult;
  resultTextEl.classList.toggle("hidden", !gameResult);
  totalEls.forEach((totalEl) => totalEl.classList.toggle("hidden", !gameOver));
  drawButton.disabled = !canDeclareDraw();

  player1Card.classList.toggle("active", !gameOver && currentPlayer === PLAYER_1);
  player2Card.classList.toggle("active", !gameOver && currentPlayer === PLAYER_2);
}

function appendPositionTags(player) {
  for (let col = 0; col < COLS; col += 1) {
    const tag = document.createElement("span");
    tag.className = "position-tag";
    tag.dataset.row = String(player);
    tag.dataset.col = String(col);
    tag.textContent = `Position ${getPosition(player, col)}`;
    boardEl.append(tag);
  }
}

function getPosition(row, col) {
  if (row === PLAYER_1) {
    return COLS - col;
  }

  return col + 1;
}

function flashLastVillage(position) {
  lastFlashVillage = { ...position };
  clearLastFlashTimer();
  lastFlashTimer = window.setTimeout(() => {
    lastFlashVillage = null;
    render();
  }, 1450);
}

function clearLastFlashTimer() {
  if (lastFlashTimer) {
    window.clearTimeout(lastFlashTimer);
    lastFlashTimer = null;
  }
}

function getTurnText() {
  if (gameOver) {
    return "Partie terminee";
  }

  if (isOpeningPhase()) {
    return `Ouverture: au tour du ${getPlayerName(currentPlayer)}`;
  }

  return `Au tour du ${getPlayerName(currentPlayer)}`;
}

function formatSowingPath(path) {
  return path.map((village) => {
    const rowNumber = village.row === PLAYER_1 ? 1 : 2;
    return `R${rowNumber} P${getPosition(village.row, village.col)}`;
  }).join(" -> ");
}

function createReserve(player) {
  const reserve = document.createElement("div");
  const captured = scores[player];
  const reserveSide = player === PLAYER_1 ? "bottom" : "top";
  reserve.className = `reserve reserve-${reserveSide}`;
  reserve.setAttribute("aria-label", `Reserve du ${getPlayerName(player)}, ${captured} pions captures`);
  reserve.innerHTML = `
    <span class="reserve-label">Reserve ${player + 1}</span>
    <span class="reserve-count">${captured}</span>
    <span class="reserve-seeds" aria-hidden="true">${renderSeeds(captured)}</span>
  `;

  return reserve;
}

function renderSeeds(count) {
  const visibleSeeds = Math.min(count, 24);
  let html = "";

  for (let index = 0; index < visibleSeeds; index += 1) {
    html += '<span class="seed"></span>';
  }

  return html;
}

function addLog(message) {
  const item = document.createElement("li");
  item.textContent = message;
  logList.prepend(item);
}

function startTimer() {
  timerStartedAt = Date.now();
  timerInterval = window.setInterval(() => {
    elapsedSeconds = Math.floor((Date.now() - timerStartedAt) / 1000);
    timerTextEl.textContent = formatDuration(elapsedSeconds);
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    window.clearInterval(timerInterval);
    timerInterval = null;
  }
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function loadMatchHistory() {
  try {
    const stored = window.localStorage.getItem("kpo-match-history");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveMatchHistory() {
  window.localStorage.setItem("kpo-match-history", JSON.stringify(matchHistory));
}

function recordMatch(result, reason) {
  if (gameRecorded) {
    return;
  }

  gameRecorded = true;
  const winner = result.includes("Joueur 1")
    ? PLAYER_1
    : (result.includes("Joueur 2") ? PLAYER_2 : null);

  matchHistory.unshift({
    winner,
    result,
    reason,
    duration: elapsedSeconds,
    score1: scores[PLAYER_1],
    score2: scores[PLAYER_2],
    total1: getPlayerTotal(PLAYER_1),
    total2: getPlayerTotal(PLAYER_2),
    date: new Date().toLocaleString("fr-FR"),
  });

  matchHistory = matchHistory.slice(0, 12);
  saveMatchHistory();
  renderMatchHistory();
}

function renderMatchHistory() {
  const wins1 = matchHistory.filter((match) => match.winner === PLAYER_1).length;
  const wins2 = matchHistory.filter((match) => match.winner === PLAYER_2).length;
  const draws = matchHistory.filter((match) => match.winner === null).length;

  wins1El.textContent = wins1;
  wins2El.textContent = wins2;
  drawsCountEl.textContent = draws;
  matchListEl.innerHTML = "";

  if (matchHistory.length === 0) {
    const item = document.createElement("li");
    item.textContent = "Aucune partie terminee pour le moment.";
    matchListEl.append(item);
    return;
  }

  for (const match of matchHistory) {
    const item = document.createElement("li");
    item.textContent = `${match.result} - ${formatDuration(match.duration)} - ${match.date}`;
    matchListEl.append(item);
  }
}

function clearMatchHistory() {
  matchHistory = [];
  saveMatchHistory();
  renderMatchHistory();
}

function showPage(pageName) {
  pages.forEach((page) => {
    page.classList.toggle("active", page.id === `${pageName}-page`);
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.pageLink === pageName);
  });
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function playTone(frequency, duration, volume = 0.12, type = "sine", delay = 0) {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startAt = context.currentTime + delay;
  const endAt = startAt + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(endAt + 0.02);
}

function playSowSound() {
  playTone(330, 0.07, 0.08, "triangle");
}

function playVictorySound() {
  playTone(392, 0.16, 0.12, "triangle", 0);
  playTone(523, 0.18, 0.13, "triangle", 0.14);
  playTone(659, 0.24, 0.14, "triangle", 0.3);
  playTone(784, 0.34, 0.12, "sine", 0.52);
}

resetButton.addEventListener("click", newGame);
drawButton.addEventListener("click", declareDraw);
clearHistoryButton.addEventListener("click", clearMatchHistory);
rulesButton.addEventListener("click", () => {
  const isHidden = rulesPanel.classList.toggle("hidden");
  rulesButton.setAttribute("aria-expanded", String(!isHidden));
});
navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    showPage(link.dataset.pageLink);
  });
});

newGame();
