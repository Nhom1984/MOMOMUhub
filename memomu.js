/* MEMOMU FULL GAME: Menu, Music Memory, Memory Classic, MEMOMU Memory, MONLUCK, BATTLE
   Copyright 2025 Nhom1984
   All assets should be in /assets/ folder.
   Canvas ID must be "gameCanvas", size 800x700.
*/

// Import online leaderboard functions
import { saveScore, getHighScores } from './leaderboard.js';

// Set canvas size to fixed 800x700
window.addEventListener('DOMContentLoaded', function () {
  const canvas = document.getElementById('gameCanvas');
  canvas.width = 800;
  canvas.height = 700;
  if (typeof draw === "function") draw();
});
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

let assets = { images: {}, sounds: {} };

// --- ASSET LOADING ---
function loadImage(name, src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload = () => { assets.images[name] = img; resolve(); };
    img.onerror = () => { 
      console.warn(`Failed to load image: ${src}`);
      resolve(); // Continue even if image fails to load
    };
  });
}
function loadSound(name, src) {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.src = src;
    assets.sounds[name] = audio;
    resolve(); // Don't wait for sound to fully load
  });
}

// --- FILES TO LOAD ---
const imageFiles = [
  { name: "memomu", src: "assets/MEMOMU1.png" },
  { name: "monad", src: "assets/monad.png" },
  { name: "sound", src: "assets/sound.png" },
];

for (let i = 1; i <= 18; i++) imageFiles.push({ name: `img${i}`, src: `assets/image${i}.png` });
for (let i = 1; i <= 6; i++) imageFiles.push({ name: `memimg${i}`, src: `assets/image${i}.png` });
// Add all images for upgraded Classic Memory (image1-37 + monad + avatars A-N)
for (let i = 1; i <= 37; i++) imageFiles.push({ name: `classicimg${i}`, src: `assets/image${i}.png` });
imageFiles.push({ name: `classicmonad`, src: `assets/monad.png` });
// Don't preload fixed mmimg assets, we'll use the available image pool directly
// Load  battle avatars: A-P, R
const avatarLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
// Add avatar images A-N for MEMOMU Memory expanded pool
for (let i = 0; i < avatarLetters.length; i++) {
  imageFiles.push({ name: `classicavatar${avatarLetters[i]}`, src: `assets/${avatarLetters[i]}.png` });
}
for (let i = 0; i < avatarLetters.length; i++) {
  imageFiles.push({ name: `avatar${i + 1}`, src: `assets/${avatarLetters[i]}.png` });
}
for (let i = 14; i <= 33; i++) imageFiles.push({ name: `battle${i}`, src: `assets/image${i}.png` }); // battle grid images
const soundFiles = [
  { name: "yupi", src: "assets/yupi.mp3" },
  { name: "kuku", src: "assets/kuku.mp3" },
  { name: "buuuu", src: "assets/buuuu.mp3" },
  { name: "tick", src: "assets/tick.mp3" },
  { name: "music", src: "assets/MEMOMU.mp3" }
];

// Add note sound files for Music Memory mode
for (let i = 1; i <= 8; i++) {
  soundFiles.push({ name: `note${i}`, src: `assets/note${i}.mp3` });
}

async function loadAssets() {
  let promises = [];
  for (let file of imageFiles) promises.push(loadImage(file.name, file.src));
  for (let file of soundFiles) promises.push(loadSound(file.name, file.src));
  
  try {
    // Add a timeout to prevent hanging
    await Promise.race([
      Promise.all(promises),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Loading timeout')), 5000))
    ]);
  } catch (error) {
    console.warn('Asset loading completed with some errors:', error);
    // Continue anyway
  }
}

// --- BUTTONS ---
class Button {
  constructor(label, x, y, w = 280, h = 56, img = null) {
    this.label = label;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.img = img; // new: optional image name
  }
  draw() {
    ctx.save();
    if (!this.img) {
      ctx.strokeStyle = "#ff69b4";
      ctx.lineWidth = 3;
      ctx.fillStyle = "#ffb6c1";
      ctx.fillRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
      ctx.strokeRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
      ctx.fillStyle = "#222";
      ctx.font = "32px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.label, this.x, this.y);
    } else {
      // Draw the image
      if (assets.images[this.img]) {
        ctx.drawImage(assets.images[this.img], this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
      }
      
      // Add ON/OFF overlay for sound button
      if (this.img === "sound") {
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = soundOn ? "#00ff00" : "#ff0000";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        const overlayText = soundOn ? "ON" : "OFF";
        // Draw text with black outline for better visibility
        ctx.strokeText(overlayText, this.x, this.y + this.h / 2 - 8);
        ctx.fillText(overlayText, this.x, this.y + this.h / 2 - 8);
      }
    }
    ctx.restore();
  }
  isInside(mx, my) {
    return mx >= this.x - this.w / 2 && mx <= this.x + this.w / 2 &&
      my >= this.y - this.h / 2 && my <= this.y + this.h / 2;
  }
}

// --- GAME STATE ---
const GAME_VERSION = "ver 1.0";
let gameState = "loading"; // loading, menu, mode, musicmem_rules, musicmem, memory_menu, memory_classic_rules, memory_classic, memory_memomu_rules, memory_memomu, monluck, battle, leaderboard, musicmem_post_score, memory_memomu_post_score, monomnibus
let playMode = "free"; // "free" or "monad" - determines if blockchain features are active
let menuButtons = [], modeButtons = [], musicMemRulesButtons = [], musicMemButtons = [], memoryMenuButtons = [], memoryClassicRulesButtons = [], memoryClassicButtons = [], memoryMemomuRulesButtons = [], memoryMemomuButtons = [], monluckButtons = [], battleButtons = [], leaderboardButtons = [];
let soundOn = true;

// --- WALLET CONNECTION STATE ---
// Manages wallet connection for blockchain integration (MetaMask + WalletConnect)
let walletConnection = {
  isConnected: false,
  address: null,
  provider: null,
  providerType: null // 'metamask' or 'walletconnect'
};

// Make walletConnection globally accessible
window.walletConnection = walletConnection;

// Wallet balance cache for display
let walletBalance = "0";

// Function to update wallet balance display
async function updateWalletBalance() {
  if (walletConnection.isConnected && typeof getWalletBalance !== 'undefined') {
    try {
      const balance = await getWalletBalance();
      walletBalance = balance;
    } catch (error) {
      console.error("Failed to update wallet balance:", error);
      walletBalance = "0";
    }
  } else {
    walletBalance = "0";
  }
}

// --- LEADERBOARD STATE ---
let leaderboard = {
  currentTab: "musicMemory", // musicMemory, memoryClassic, memoryMemomu, monluck, battle
  tabs: [
    { key: "musicMemory", label: "MUSIC" },
    { key: "memoryClassic", label: "CLASSIC" },
    { key: "memoryMemomu", label: "MEMOMU" },
    { key: "monluck", label: "MONLUCK" },
    { key: "battle", label: "BATTLE" }
  ]
};

// --- NAME INPUT STATE ---
let nameInput = {
  active: false,
  mode: "",
  score: 0,
  currentName: "",
  maxLength: 12,
  buttons: [] // For mobile Enter/Cancel buttons
};

// --- GAME OVER OVERLAY ---
let gameOverOverlay = {
  active: false,
  mode: "", // which game mode triggered the overlay
  finalScore: 0,
  buttons: []
};

// --- HIGH SCORE SYSTEM ---
let highScores = {
  musicMemory: [],
  memoryClassic: [],
  memoryMemomu: [],
  monluck: [],
  battle: []
};

// --- SPECIALIZED LEADERBOARD SYSTEMS ---
let monluckLeaderboard = [];  // Array of {name, address, fiveMonadCount, fourMonadCount, bestStreak, lastPlayed}
let battleLeaderboard = [];   // Array of {name, address, winCount, lastPlayed}

// --- ONLINE SCORES STORAGE ---
let onlineScores = {
  musicMemory: [],
  memoryClassic: [],
  memoryMemomu: [],
  monluck: [],
  battle: []
};

// --- MUSIC MEMORY MODE DATA ---
let musicMem = {
  grid: [],
  sequence: [],
  userSequence: [],
  currentRound: 1,
  maxRounds: 10,
  playingMelody: false,
  allowInput: false,
  score: 0,
  feedback: "",
  tiles: [],
  // showRoundSplash: true,     // REMOVED - no more splash screens
  // splashTimer: 0,            // REMOVED - no more splash screens
  // splashMsg: "",             // REMOVED - no more splash screens

  // New 3-phase structure
  phase: "memory", // memory, deception, guessing
  imageAssignments: {}, // maps image indices (1-18) to note numbers (1-8)
  assignedImages: [], // the 8 images selected for this game
  decoyImages: [], // unused images for decoy tiles
  memorySequence: [], // correct sequence from memory phase
  deceptionSequence: [], // wrong sequence for deception phase
  phaseTimer: 0,
  phaseStartTime: 0,
  timeLimit: 0,
  showPhaseMessage: false,
  phaseMessage: "",
  phaseMessageTimer: 0,
  gameStarted: false
};

// --- CLASSIC MEMORY MODE DATA ---
let memoryGame = {
  grid: [],
  revealed: [],
  matched: [],
  firstIdx: null,
  secondIdx: null,
  lock: false,
  roundActive: true, // Global round lock to prevent multiple round-end calls
  pairsFound: 0,
  attempts: 0,
  feedback: "",
  // showSplash: true,           // REMOVED - no more splash screens
  // splashTimer: 40,            // REMOVED - no more splash screens
  // splashMsg: "Classic Memory", // REMOVED - no more splash screens
  score: 0,

  // New upgraded Classic Memory features
  currentRound: 1,
  maxRounds: 10,
  roundScores: [], // Store score for each round
  timer: 0,
  roundStartTime: 0,
  timeRemaining: 30,
  showRules: true,
  showClassicStartButton: false, // Show START button after "GOT IT"
  gameCompleted: false,
  allImages: [], // All available images for pairs
  roundPairCount: 0,
  gameStarted: false // Track if game has actually started (timer and cards enabled)
};

// --- MEMOMU MEMORY MODE DATA ---
let memomuGame = {
  grid: [],
  flashSeq: [],
  found: [],
  clicksUsed: 0,
  allowedClicks: 0,
  wrongClicks: 0, // Track wrong clicks for early termination
  // showSplash: true,           // REMOVED - no more splash screens
  // splashTimer: 45,            // REMOVED - no more splash screens
  // splashMsg: "MEMOMU Memory", // REMOVED - no more splash screens
  round: 1,
  score: 0,
  timer: 0,
  timeLimit: 0,
  timeStarted: 0,
  phase: "show", // show, guess, done
  feedback: "",
  maxRounds: 20,
  roundScores: [], // Track score for each round
  gameCompleted: false,
  showScoreTable: false,
  showGo: false, // For GO button after rules
  imagePool: [], // Pool of all available images (1-37 + avatars A-N = 51 total)
  gridImages: [], // Current image assignments for grid tiles
  usedImages: [] // Track used images to ensure variety
};

// --- MONLUCK MODE DATA ---
let monluckGame = {
  grid: [],
  gridImages: [], // Array of image names for each tile
  monadIndices: [],
  found: [],
  clicks: 0,
  // showSplash: true,      // REMOVED - no more splash screens
  // splashTimer: 40,       // REMOVED - no more splash screens
  // splashMsg: "MONLUCK",  // REMOVED - no more splash screens
  finished: false,
  result: "",
  score: 0,
  wager: 10,
  currentStreak: 0,  // Track current streak for this session
  bestSessionStreak: 0  // Best streak in current session
};

// --- BATTLE MODE DATA ---
const battleNames = [
  "Benja", "Berzan", "BillMonday", "Claw", "Dreiki", "John W Rich", "Fin",
  "Gleader", "Saddamovic", "Keone", "Mondalf", "LeysBobr", "MikeWeb", "Tunez"];
let battleGame = {
  state: "rules", // rules, choose, vs, end
  phase: "ready", // ready, flash, click, result, countdown
  round: 0,
  player: null,
  opponent: null,
  grid: [],
  gridAI: [],
  targets: [],
  aiTargets: [],
  clicks: [],
  aiClicks: [],
  playerTime: null,
  aiTime: null,
  pscore: 0,
  oscore: 0,
  avatarsThisRound: 0,
  pscoreRounds: [],
  oscoreRounds: [],
  anim: 0,
  flashing: false,
  lastResult: "",
  resultText: "",
  finished: false,
  chooseRects: [],
  aiResult: null,
};

// --- GRID/TILE HELPERS ---
function createGrid(rows, cols, tileSize = 105, gap = 12, startY = 180) {
  let tiles = [];
  let startX = WIDTH / 2 - ((cols * tileSize + (cols - 1) * gap) / 2);
  let idx = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles.push({
        x: startX + c * (tileSize + gap),
        y: startY + r * (tileSize + gap),
        size: tileSize,
        idx: idx,
        selected: false,
        highlight: false,
        revealed: false,
        feedback: null
      });
      idx++;
    }
  }
  return tiles;
}

// --- FISHER-YATES SHUFFLE FUNCTION ---
function fisherYatesShuffle(array) {
  const shuffled = [...array]; // Create a copy to avoid mutating original
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// --- HIGH SCORE MANAGEMENT ---
function loadHighScores() {
  try {
    const saved = localStorage.getItem('memomu_highscores');
    if (saved) {
      highScores = JSON.parse(saved);
    }
  } catch (e) {
    console.log('Could not load high scores:', e);
  }
  // Ensure all categories exist
  if (!highScores.musicMemory) highScores.musicMemory = [];
  if (!highScores.memoryClassic) highScores.memoryClassic = [];
  if (!highScores.memoryMemomu) highScores.memoryMemomu = [];
  if (!highScores.monluck) highScores.monluck = [];
  if (!highScores.battle) highScores.battle = [];

  // Load specialized leaderboards
  try {
    const savedMonluck = localStorage.getItem('memomu_monluck_leaderboard');
    if (savedMonluck) {
      monluckLeaderboard = JSON.parse(savedMonluck);
    }
  } catch (e) {
    console.log('Could not load monluck leaderboard:', e);
  }

  try {
    const savedBattle = localStorage.getItem('memomu_battle_leaderboard');
    if (savedBattle) {
      battleLeaderboard = JSON.parse(savedBattle);
    }
  } catch (e) {
    console.log('Could not load battle leaderboard:', e);
  }
}

function saveHighScores() {
  try {
    localStorage.setItem('memomu_highscores', JSON.stringify(highScores));
  } catch (e) {
    console.log('Could not save high scores:', e);
  }
}

function saveSpecializedLeaderboards() {
  try {
    localStorage.setItem('memomu_monluck_leaderboard', JSON.stringify(monluckLeaderboard));
    localStorage.setItem('memomu_battle_leaderboard', JSON.stringify(battleLeaderboard));
  } catch (e) {
    console.log('Could not save specialized leaderboards:', e);
  }
}

/**
 * Updates the Monluck leaderboard with player performance
 * @param {string} playerName - Player's name or "Anonymous"
 * @param {string} walletAddress - Player's wallet address (optional)
 * @param {number} monadsFound - Number of monads found (4 or 5)
 * @param {number} streak - Current streak value
 */
async function updateMonluckLeaderboard(playerName, walletAddress, monadsFound, streak) {
  if (monadsFound < 4) return; // Only track 4+ monad games
  
  const playerKey = walletAddress || playerName;
  let existingPlayer = monluckLeaderboard.find(p => 
    (p.address && p.address === walletAddress) || 
    (!p.address && p.name === playerName)
  );
  
  if (!existingPlayer) {
    existingPlayer = {
      name: playerName,
      address: walletAddress,
      fiveMonadCount: 0,
      fourMonadCount: 0,
      bestStreak: streak,
      lastPlayed: new Date().toISOString()
    };
    monluckLeaderboard.push(existingPlayer);
  }
  
  // Update counts
  if (monadsFound === 5) {
    existingPlayer.fiveMonadCount++;
  } else if (monadsFound === 4) {
    existingPlayer.fourMonadCount++;
  }
  
  // Update best streak
  existingPlayer.bestStreak = Math.max(existingPlayer.bestStreak, streak);
  existingPlayer.lastPlayed = new Date().toISOString();
  
  // Sort leaderboard: 5-monad players first, then by counts, then by streak
  monluckLeaderboard.sort((a, b) => {
    // Players with 5+ monads always rank above those with only 4
    if (a.fiveMonadCount > 0 && b.fiveMonadCount === 0) return -1;
    if (b.fiveMonadCount > 0 && a.fiveMonadCount === 0) return 1;
    
    // Among 5-monad players, sort by 5-monad count, then 4-monad count
    if (a.fiveMonadCount > 0 && b.fiveMonadCount > 0) {
      if (a.fiveMonadCount !== b.fiveMonadCount) return b.fiveMonadCount - a.fiveMonadCount;
      if (a.fourMonadCount !== b.fourMonadCount) return b.fourMonadCount - a.fourMonadCount;
      return b.bestStreak - a.bestStreak;
    }
    
    // Among 4-only players, sort by 4-monad count, then streak
    if (a.fourMonadCount !== b.fourMonadCount) return b.fourMonadCount - a.fourMonadCount;
    return b.bestStreak - a.bestStreak;
  });
  
  saveSpecializedLeaderboards();
  
  // Save to online leaderboard
  try {
    const { saveSpecializedLeaderboard } = await import('./leaderboard.js');
    await saveSpecializedLeaderboard('monluck', existingPlayer);
  } catch (error) {
    console.warn('Could not save to online monluck leaderboard:', error);
  }
}

/**
 * Updates the Battle leaderboard with player wins
 * @param {string} playerName - Player's name or "Anonymous"
 * @param {string} walletAddress - Player's wallet address (optional)
 */
async function updateBattleLeaderboard(playerName, walletAddress) {
  const playerKey = walletAddress || playerName;
  let existingPlayer = battleLeaderboard.find(p => 
    (p.address && p.address === walletAddress) || 
    (!p.address && p.name === playerName)
  );
  
  if (!existingPlayer) {
    existingPlayer = {
      name: playerName,
      address: walletAddress,
      winCount: 0,
      lastPlayed: new Date().toISOString()
    };
    battleLeaderboard.push(existingPlayer);
  }
  
  existingPlayer.winCount++;
  existingPlayer.lastPlayed = new Date().toISOString();
  
  // Sort by win count (descending) and keep top 10
  battleLeaderboard.sort((a, b) => b.winCount - a.winCount);
  battleLeaderboard = battleLeaderboard.slice(0, 10);
  
  saveSpecializedLeaderboards();
  
  // Save to online leaderboard
  try {
    const { saveSpecializedLeaderboard } = await import('./leaderboard.js');
    await saveSpecializedLeaderboard('battle', existingPlayer);
  } catch (error) {
    console.warn('Could not save to online battle leaderboard:', error);
  }
}

/**
 * Adds a high score entry with optional wallet address
 * @param {string} mode - Game mode (musicMemory, memoryClassic, memoryMemomu)
 * @param {number} score - Player's score
 * @param {string} name - Player's name (optional)
 */
async function addHighScore(mode, score, name = null) {
  const timestamp = new Date().toISOString();
  // Include wallet address if connected for blockchain integration
  const walletAddress = walletConnection.isConnected ? walletConnection.address : null;
  const entry = { score, timestamp, name, walletAddress };

  if (!highScores[mode]) highScores[mode] = [];
  highScores[mode].push(entry);

  // Sort by score (descending) and keep top 10
  highScores[mode].sort((a, b) => b.score - a.score);
  highScores[mode] = highScores[mode].slice(0, 10);

  saveHighScores();

  // Save to online leaderboard if name is present
  if (name) {
    try {
      const success = await saveScore(mode, score, name, walletAddress);
      if (success) {
        console.log('Score saved to online leaderboard successfully');
        // Show success feedback to user
        showUserFeedback('Score saved to online leaderboard!', 'success');
      } else {
        console.warn('Failed to save score to online leaderboard');
        showUserFeedback('Failed to save to online leaderboard', 'warning');
      }
    } catch (error) {
      console.error('Error saving to online leaderboard:', error);
      showUserFeedback('Error saving to online leaderboard', 'error');
    }
  }
}

function isTopTenScore(mode, score) {
  // Always prompt if leaderboard is empty or doesn't exist
  if (!highScores[mode] || highScores[mode].length === 0) return true;
  // Always prompt if leaderboard has less than 10 entries
  if (highScores[mode].length < 10) return true;
  // Prompt if score is better than 10th place
  return score > highScores[mode][9].score;
}

function getTopScore(mode) {
  if (!highScores[mode] || highScores[mode].length === 0) return 0;
  return highScores[mode][0].score;
}

// --- USER FEEDBACK SYSTEM ---
let userFeedback = {
  active: false,
  message: '',
  type: 'info', // 'success', 'warning', 'error', 'info'
  timer: 0,
  duration: 3000 // 3 seconds
};

/**
 * Show user feedback message
 * @param {string} message - Message to display
 * @param {string} type - Type of message (success, warning, error, info)
 */
function showUserFeedback(message, type = 'info') {
  userFeedback.active = true;
  userFeedback.message = message;
  userFeedback.type = type;
  userFeedback.timer = userFeedback.duration;
}

/**
 * Update and draw user feedback
 */
function updateUserFeedback() {
  if (userFeedback.active) {
    userFeedback.timer -= 16; // Assuming 60fps
    if (userFeedback.timer <= 0) {
      userFeedback.active = false;
    }
  }
}

function drawUserFeedback() {
  if (!userFeedback.active) return;

  const y = 50;
  const alpha = Math.min(1, userFeedback.timer / 1000); // Fade out in last second

  ctx.save();
  ctx.globalAlpha = alpha;

  // Background
  let bgColor = '#333';
  let textColor = '#fff';
  switch (userFeedback.type) {
    case 'success': bgColor = '#4CAF50'; break;
    case 'warning': bgColor = '#FF9800'; break;
    case 'error': bgColor = '#F44336'; break;
    case 'info': bgColor = '#2196F3'; break;
  }

  ctx.fillStyle = bgColor;
  ctx.fillRect(WIDTH / 2 - 200, y - 15, 400, 30);

  ctx.fillStyle = textColor;
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(userFeedback.message, WIDTH / 2, y + 5);

  ctx.restore();
}

// --- ONLINE LEADERBOARD FUNCTIONS ---
/**
 * Fetch online scores for a specific mode
 * @param {string} mode - Game mode to fetch scores for
 */
async function fetchOnlineScores(mode) {
  try {
    showUserFeedback('Loading online scores...', 'info');
    const scores = await getHighScores(mode, 10);
    onlineScores[mode] = scores;
    console.log(`Fetched ${scores.length} online scores for ${mode}`);
    return true;
  } catch (error) {
    console.error(`Error fetching online scores for ${mode}:`, error);
    showUserFeedback('Failed to load online scores', 'warning');
    return false;
  }
}

/**
 * Get combined scores (online + local) for display
 * @param {string} mode - Game mode
 * @returns {Array} Combined and sorted scores
 */
function getCombinedScores(mode) {
  const online = onlineScores[mode] || [];
  const local = highScores[mode] || [];
  
  // If online scores are available, use them primarily
  if (online.length > 0) {
    return online;
  }
  
  // Fallback to local scores
  return local;
}

// --- BLOCKCHAIN GAME STATE ---
let currentGameModeForBuyIn = null; // Stores which game mode user is buying into
let currentWagerAmount = 0.5; // Current MONLUCK wager amount

// --- BUY-IN MODAL FUNCTIONS ---
/**
 * Shows buy-in selection modal for weekly tournaments
 */
function showBuyInModal(gameMode) {
  if (!walletConnection.isConnected) {
    alert("Please connect your wallet first");
    return;
  }
  
  currentGameModeForBuyIn = gameMode;
  document.getElementById('buyInModal').style.display = 'flex';
}

/**
 * Closes buy-in modal
 */
function closeBuyInModal() {
  currentGameModeForBuyIn = null;
  document.getElementById('buyInModal').style.display = 'none';
}

/**
 * Handle buy-in selection
 */
async function selectBuyIn(amount) {
  closeBuyInModal();
  
  if (currentGameModeForBuyIn && typeof handleWeeklyGameBuyIn !== 'undefined') {
    const success = await handleWeeklyGameBuyIn(currentGameModeForBuyIn, amount);
    if (success) {
      // Proceed to game rules/start
      switch(currentGameModeForBuyIn) {
        case 'musicMemory':
          gameState = "musicmem_rules";
          break;
        case 'memoryClassic':
          gameState = "memory_classic_rules";
          startMemoryGameClassic();
          break;
        case 'memoryMemomu':
          gameState = "memory_memomu_rules";
          break;
      }
    }
  }
  currentGameModeForBuyIn = null;
}

// --- WAGER MODAL FUNCTIONS ---
/**
 * Shows MONLUCK wager selection modal
 */
function showWagerModal() {
  if (!walletConnection.isConnected) {
    alert("Please connect your wallet first");
    return;
  }
  
  document.getElementById('wagerModal').style.display = 'flex';
  updateWagerDisplay();
}

/**
 * Closes wager modal
 */
function closeWagerModal() {
  document.getElementById('wagerModal').style.display = 'none';
}

/**
 * Update wager display based on slider
 */
function updateWagerDisplay() {
  const slider = document.getElementById('wagerSlider');
  const display = document.getElementById('wagerDisplay');
  if (slider && display) {
    currentWagerAmount = parseFloat(slider.value);
    display.textContent = `${currentWagerAmount} MON`;
  }
}

/**
 * Confirm wager and start MONLUCK
 */
async function confirmWager() {
  closeWagerModal();
  
  // Set the wager amount in monluck game
  monluckGame.wager = currentWagerAmount * 100; // Convert to internal units
  
  // For MONAD mode, this will be handled when the game ends
  gameState = "monluck";
  resetMonluckGame();
}

// Make functions globally available
window.showBuyInModal = showBuyInModal;
window.closeBuyInModal = closeBuyInModal;
window.selectBuyIn = selectBuyIn;
window.showWagerModal = showWagerModal;
window.closeWagerModal = closeWagerModal;
window.confirmWager = confirmWager;

// Update wager display when slider changes
document.addEventListener('DOMContentLoaded', function() {
  const wagerSlider = document.getElementById('wagerSlider');
  if (wagerSlider) {
    wagerSlider.addEventListener('input', updateWagerDisplay);
  }
});

// --- WALLET CONNECTION FUNCTIONS ---
/**
 * Shows wallet selection modal
 */
function connectWallet() {
  const modal = document.getElementById('walletModal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

/**
 * Closes wallet selection modal
 */
function closeWalletModal() {
  const modal = document.getElementById('walletModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Make functions available globally for HTML onclick handlers
window.connectMetaMask = connectMetaMask;
window.connectWalletConnect = connectWalletConnect;
window.closeWalletModal = closeWalletModal;
window.disconnectWallet = disconnectWallet;

/**
 * Disconnects the current wallet
 */
function disconnectWallet() {
  if (walletConnection.isConnected) {
    // Remove event listeners if they exist
    if (walletConnection.provider && walletConnection.providerType === 'metamask') {
      try {
        walletConnection.provider.removeListener('accountsChanged', handleAccountsChanged);
        walletConnection.provider.removeListener('disconnect', handleWalletDisconnect);
      } catch (error) {
        console.warn('Error removing MetaMask listeners:', error);
      }
    }
    
    // Clear wallet connection state
    handleWalletDisconnect();
    
    // Close modal and show confirmation
    closeWalletModal();
    alert('Wallet disconnected successfully!');
  } else {
    closeWalletModal();
    alert('No wallet is currently connected.');
  }
}

/**
 * Connects to MetaMask wallet
 * @returns {boolean} True if connection successful, false otherwise
 */
async function connectMetaMask() {
  try {
    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask is not installed. Please install MetaMask to connect your wallet.');
      return false;
    }

    // Request account access - this triggers MetaMask popup
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    if (accounts.length > 0) {
      walletConnection.isConnected = true;
      walletConnection.address = accounts[0];
      walletConnection.provider = window.ethereum;
      walletConnection.providerType = 'metamask';
      
      // Listen for account changes (user switches accounts)
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('disconnect', handleWalletDisconnect);
      
      closeWalletModal();
      
      // Initialize blockchain if in MONAD mode
      if (playMode === "monad" && typeof initializeBlockchain !== 'undefined') {
        await initializeBlockchain();
      }
      
      // Update wallet balance display
      await updateWalletBalance();
      
      // Refresh buttons to show withdraw button if on leaderboard
      if (gameState === "leaderboard") {
        setupButtons();
      }
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error connecting to MetaMask:', error);
    if (error.code === 4001) {
      // User rejected the request
      alert('Wallet connection was rejected. You can still play without connecting.');
    } else {
      alert('Error connecting to wallet. You can still play without connecting.');
    }
    return false;
  }
}

/**
 * Connects to WalletConnect
 * @returns {boolean} True if connection successful, false otherwise
 */
async function connectWalletConnect() {
  // For demonstration purposes, show that WalletConnect would be connected here
  // In a real implementation, this would use the WalletConnect library
  alert('WalletConnect integration is ready! In a real deployment, this would connect to WalletConnect-compatible wallets like Trust Wallet, Rainbow, etc.');
  
  // For demo, simulate a connection
  try {
    // This would be replaced with actual WalletConnect logic
    const demoAddress = '0x' + Math.random().toString(16).substr(2, 40);
    
    walletConnection.isConnected = true;
    walletConnection.address = demoAddress;
    walletConnection.provider = { isWalletConnect: true }; // Demo provider
    walletConnection.providerType = 'walletconnect';
    
    // Update wallet balance display
    await updateWalletBalance();
    
    closeWalletModal();
    return true;
  } catch (error) {
    console.error('Error with WalletConnect demo:', error);
    alert('Error connecting to WalletConnect. You can still play without connecting.');
    return false;
  }
}

/**
 * Handles wallet account changes
 * @param {string[]} accounts - Array of account addresses
 */
function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    // User disconnected
    walletConnection.isConnected = false;
    walletConnection.address = null;
    walletConnection.provider = null;
    walletConnection.providerType = null;
  } else {
    // User switched accounts
    walletConnection.address = accounts[0];
  }
}

/**
 * Handles wallet disconnect
 */
function handleWalletDisconnect() {
  walletConnection.isConnected = false;
  walletConnection.address = null;
  walletConnection.provider = null;
  walletConnection.providerType = null;
}

/**
 * Formats wallet address for display (shows first 6 and last 4 characters)
 * @param {string} address - Full wallet address
 * @returns {string} Shortened address format
 */
function getShortAddress(address) {
  if (!address) return '';
  return address.slice(0, 6) + '...' + address.slice(-4);
}

// --- TEST FUNCTION FOR WALLET INTEGRATION ---
function testWalletIntegration() {
  // Simulate wallet connection for testing
  walletConnection.isConnected = true;
  walletConnection.address = '0x1234567890123456789012345678901234567890';
  
  // Add some test high scores with and without wallet addresses
  addHighScore('musicMemory', 150, 'TestPlayer1');
  
  walletConnection.address = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  addHighScore('musicMemory', 200, 'TestPlayer2');
  
  walletConnection.isConnected = false;
  walletConnection.address = null;
  addHighScore('musicMemory', 100, 'TestPlayer3');
  
  console.log('Test data added to leaderboard with mixed wallet connections');
}

// --- GAME OVER OVERLAY FUNCTIONS ---
function showGameOverOverlay(mode, finalScore) {
  // Check if this is a leaderboard mode and if score qualifies for top 10
  const leaderboardModes = ["musicMemory", "memoryClassic", "memoryMemomu"];
  
  // For Battle Mode: Keep existing behavior (no wallet requirement)
  if (mode === "battle" && isTopTenScore(mode, finalScore)) {
    showNameInput(mode, finalScore);
    return;
  }
  
  // For other leaderboard modes: Only show name input if wallet is connected
  if (leaderboardModes.includes(mode) && isTopTenScore(mode, finalScore) && walletConnection.isConnected) {
    // Show name input for wallet-connected users with qualifying scores
    showNameInput(mode, finalScore);
    return;
  }

  // For Music Memory, MEMOMU, Classic Memory, and Monluck games without wallet:
  // Don't show overlay with buttons, instead show score table and transition to post-score state
  if (mode === "musicMemory" || mode === "memoryMemomu" || mode === "memoryClassic" || mode === "monluck") {
    // Add to high scores without name (wallet policy: no leaderboard access without wallet)
    addHighScore(mode, finalScore);

    // Show score table without buttons for a moment, then transition to post-score state
    setTimeout(() => {
      if (mode === "musicMemory") {
        gameState = "musicmem_post_score";
      } else if (mode === "memoryMemomu") {
        gameState = "memory_memomu_post_score";
      }
    }, 3000); // Show score for 3 seconds before showing post-score state
    return;
  }

  gameOverOverlay.active = true;
  gameOverOverlay.mode = mode;
  gameOverOverlay.finalScore = finalScore;

  // Add to high scores without name for non-leaderboard modes
  addHighScore(mode, finalScore);

  // Setup overlay buttons
  gameOverOverlay.buttons = [
    new Button("PLAY AGAIN", WIDTH / 2 - 120, HEIGHT / 2 + 80, 200, 50),
    new Button("MENU", WIDTH / 2 + 120, HEIGHT / 2 + 80, 200, 50)
  ];
}

function hideGameOverOverlay() {
  gameOverOverlay.active = false;
  gameOverOverlay.mode = "";
  gameOverOverlay.finalScore = 0;
  gameOverOverlay.buttons = [];
}

// --- NAME INPUT FUNCTIONS ---
function showNameInput(mode, score) {
  nameInput.active = true;
  nameInput.mode = mode;
  nameInput.score = score;
  nameInput.currentName = "";
  
  // Create Enter and Cancel buttons for mobile
  nameInput.buttons = [
    new Button("ENTER", WIDTH / 2 - 80, HEIGHT / 2 + 100, 140, 40),
    new Button("CANCEL", WIDTH / 2 + 80, HEIGHT / 2 + 100, 140, 40)
  ];
  
  // Enhanced mobile detection for iOS/Android
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                   ('ontouchstart' in window) ||
                   (navigator.maxTouchPoints > 0) ||
                   (navigator.msMaxTouchPoints > 0);
  
  if (isMobile) {
    // Improved mobile keyboard trigger with better reliability for iOS/Android
    setTimeout(() => {
      // Create a temporary input element to trigger mobile keyboard
      const tempInput = document.createElement('input');
      tempInput.type = 'text';
      tempInput.setAttribute('inputmode', 'text'); // Text keyboard for letters
      tempInput.setAttribute('pattern', '[A-Za-z]*'); // Letter-only pattern for keyboard hint
      tempInput.setAttribute('autocomplete', 'name');
      tempInput.setAttribute('autocorrect', 'off');
      tempInput.setAttribute('autocapitalize', 'words');
      tempInput.setAttribute('spellcheck', 'false');
      tempInput.style.position = 'fixed';
      tempInput.style.top = '50%';
      tempInput.style.left = '50%';
      tempInput.style.transform = 'translate(-50%, -50%)';
      tempInput.style.opacity = '0.01'; // Nearly invisible but not completely hidden
      tempInput.style.pointerEvents = 'none';
      tempInput.style.zIndex = '999999'; // High z-index to ensure visibility
      tempInput.style.width = '1px';
      tempInput.style.height = '1px';
      tempInput.style.border = 'none';
      tempInput.style.background = 'transparent';
      tempInput.style.fontSize = '16px'; // Prevent zoom on iOS
      
      document.body.appendChild(tempInput);
      
      // Multiple attempts to focus for better mobile support
      tempInput.focus();
      
      // Additional mobile-specific triggers for iOS/Android
      setTimeout(() => {
        if (document.body.contains(tempInput)) {
          tempInput.focus();
          tempInput.click();
          
          // Trigger input event to ensure keyboard appears
          const inputEvent = new Event('input', { bubbles: true });
          tempInput.dispatchEvent(inputEvent);
          
          // Additional trigger for stubborn mobile keyboards
          const touchEvent = new TouchEvent('touchstart', { bubbles: true });
          tempInput.dispatchEvent(touchEvent);
        }
      }, 10);
      
      // Keep it around longer for better mobile keyboard persistence
      setTimeout(() => {
        if (document.body.contains(tempInput)) {
          document.body.removeChild(tempInput);
        }
      }, 1500); // Increased timeout for better persistence on mobile
    }, 100); // Slightly longer initial delay
  }
}

function hideNameInput() {
  nameInput.active = false;
  nameInput.mode = "";
  nameInput.score = 0;
  nameInput.currentName = "";
  nameInput.buttons = [];
}

function submitNameInput() {
  const name = nameInput.currentName.trim() || "Anonymous";
  addHighScore(nameInput.mode, nameInput.score, name);
  const mode = nameInput.mode;
  hideNameInput();

  // For Music Memory and MEMOMU games, transition to post-score state instead of showing overlay
  if (mode === "musicMemory") {
    gameState = "musicmem_post_score";
  } else if (mode === "memoryMemomu") {
    gameState = "memory_memomu_post_score";
  } else {
    // Show game over overlay after name submission for other modes
    gameOverOverlay.active = true;
    gameOverOverlay.mode = mode;
    gameOverOverlay.finalScore = nameInput.score;
    gameOverOverlay.buttons = [
      new Button("PLAY AGAIN", WIDTH / 2 - 120, HEIGHT / 2 + 80, 200, 50),
      new Button("MENU", WIDTH / 2 + 120, HEIGHT / 2 + 80, 200, 50)
    ];
  }
}

function drawGameOverOverlay() {
  if (!gameOverOverlay.active) return;


  // Main container
  ctx.fillStyle = "#ffb6c1";
  ctx.strokeStyle = "#ff1493";
  ctx.lineWidth = 4;
  ctx.fillRect(WIDTH / 2 - 250, HEIGHT / 2 - 150, 500, 300);
  ctx.strokeRect(WIDTH / 2 - 250, HEIGHT / 2 - 150, 500, 300);

  // Game Over text
  ctx.font = "48px Arial";
  ctx.fillStyle = "#8b0000";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER!", WIDTH / 2, HEIGHT / 2 - 80);

  // Final score
  ctx.font = "32px Arial";
  ctx.fillStyle = "#000";
  ctx.fillText("Final Score: " + gameOverOverlay.finalScore, WIDTH / 2, HEIGHT / 2 - 30);

  // High score info
  const topScore = getTopScore(gameOverOverlay.mode);
  if (gameOverOverlay.finalScore === topScore && topScore > 0) {
    ctx.font = "24px Arial";
    ctx.fillStyle = "#ffd700";
    ctx.fillText("🏆 NEW HIGH SCORE! 🏆", WIDTH / 2, HEIGHT / 2 + 10);
  } else if (topScore > 0) {
    ctx.font = "20px Arial";
    ctx.fillStyle = "#4b0082";
    ctx.fillText("Best: " + topScore, WIDTH / 2, HEIGHT / 2 + 10);
  }

  // Draw buttons
  gameOverOverlay.buttons.forEach(b => b.draw());

  ctx.restore();
}

function handleGameOverOverlayClick(mx, my) {
  if (!gameOverOverlay.active) return false;

  for (let button of gameOverOverlay.buttons) {
    if (button.isInside(mx, my)) {
      if (button.label === "PLAY AGAIN") {
        hideGameOverOverlay();
        if (gameOverOverlay.mode === "musicMemory") {
          gameState = "musicmem";
          startMusicMemoryGame(false); // No splash for PLAY AGAIN
          startMemoryPhase(); // Start immediately like pressing START
          drawMusicMemory(); // Redraw the new board
        } else if (gameOverOverlay.mode === "memoryMemomu") {
          gameState = "memory_memomu";
          memomuGame.showGo = false;
          startMemoryGameMemomu(false); // No splash for PLAY AGAIN
          // Start immediately like pressing GO - trigger the flash sequence after a short delay
          setTimeout(runMemoryMemomuFlashSequence, 900);
          drawMemoryGameMemomu(); // Redraw the new board
        } else {
          restartCurrentGame();
        }
      } else if (button.label === "MENU") {
        hideGameOverOverlay();
        // For music memory, classic, and memomu modes, go to mode menu instead of main menu
        if (gameOverOverlay.mode === "musicMemory" || 
            gameOverOverlay.mode === "memoryClassic" || 
            gameOverOverlay.mode === "memoryMemomu") {
          gameState = "mode";
        } else {
          gameState = "menu";
        }
        // Restore background music when returning to menu
        let music = assets.sounds["music"];
        if (soundOn && music) {
          music.play();
        }
      }
      return true;
    }
  }
  return true; // Block all other clicks when overlay is active
}

// --- NAME INPUT DRAWING ---
function drawNameInput() {
  if (!nameInput.active) return;

  // Semi-transparent overlay
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Main container
  ctx.fillStyle = "#ffb6c1";
  ctx.strokeStyle = "#ff1493";
  ctx.lineWidth = 4;
  ctx.fillRect(WIDTH / 2 - 250, HEIGHT / 2 - 150, 500, 300);
  ctx.strokeRect(WIDTH / 2 - 250, HEIGHT / 2 - 150, 500, 300);

  // Title text
  ctx.font = "36px Arial";
  ctx.fillStyle = "#8b0000";
  ctx.textAlign = "center";
  ctx.fillText("🏆 TOP 10 SCORE! 🏆", WIDTH / 2, HEIGHT / 2 - 80);

  // Score text
  ctx.font = "24px Arial";
  ctx.fillStyle = "#000";
  ctx.fillText(`Score: ${nameInput.score}`, WIDTH / 2, HEIGHT / 2 - 40);

  // Prompt text
  ctx.font = "20px Arial";
  ctx.fillText("Enter your name:", WIDTH / 2, HEIGHT / 2 - 10);

  // Name input box
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#ff1493";
  ctx.lineWidth = 2;
  ctx.fillRect(WIDTH / 2 - 120, HEIGHT / 2 + 10, 240, 40);
  ctx.strokeRect(WIDTH / 2 - 120, HEIGHT / 2 + 10, 240, 40);

  // Current name text
  ctx.font = "18px Arial";
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.fillText(nameInput.currentName || "_", WIDTH / 2, HEIGHT / 2 + 35);

  // Instructions
  ctx.font = "16px Arial";
  ctx.fillStyle = "#444";
  ctx.fillText("Press ENTER to submit or ESC to skip", WIDTH / 2, HEIGHT / 2 + 70);

  // Draw mobile buttons
  nameInput.buttons.forEach(button => button.draw());
}

/**
 * Get leaderboard data for display based on current tab
 * @param {string} mode - Current leaderboard tab
 * @returns {Array} Leaderboard data for display
 */
function getLeaderboardData(mode) {
  if (mode === 'monluck') {
    // For monluck, prefer online scores if available, fallback to local
    const online = onlineScores[mode] || [];
    const local = monluckLeaderboard.slice(0, 10);
    return online.length > 0 ? online : local;
  } else if (mode === 'battle') {
    // For battle, prefer online scores if available, fallback to local
    const online = onlineScores[mode] || [];
    const local = battleLeaderboard.slice(0, 10);
    return online.length > 0 ? online : local;
  } else {
    return getCombinedScores(mode); // Traditional score-based leaderboards
  }
}

// --- LEADERBOARD DRAWING ---
function drawLeaderboard() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Background
  ctx.fillStyle = "#ffb6c1";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Title
  ctx.font = "42px Arial";
  ctx.fillStyle = "#836EF9";
  ctx.textAlign = "center";
  ctx.fillText("LEADERBOARD", WIDTH / 2, 80);

  // Draw tabs
  const tabWidth = 150;
  const tabHeight = 50;
  const tabY = 120;
  const totalTabsWidth = leaderboard.tabs.length * tabWidth;
  const startX = WIDTH / 2 - totalTabsWidth / 2;

  for (let i = 0; i < leaderboard.tabs.length; i++) {
    const tab = leaderboard.tabs[i];
    const x = startX + i * tabWidth;
    const isActive = tab.key === leaderboard.currentTab;

    // Tab background
    ctx.fillStyle = isActive ? "#ff69b4" : "#ffc0cb";
    ctx.strokeStyle = "#ff1493";
    ctx.lineWidth = 2;
    ctx.fillRect(x, tabY, tabWidth, tabHeight);
    ctx.strokeRect(x, tabY, tabWidth, tabHeight);

    // Tab text
    ctx.font = "18px Arial";
    ctx.fillStyle = isActive ? "#fff" : "#333";
    ctx.textAlign = "center";
    ctx.fillText(tab.label, x + tabWidth / 2, tabY + tabHeight / 2 + 6);
  }

  // Draw leaderboard content based on current tab
  const data = getLeaderboardData(leaderboard.currentTab);
  ctx.font = "24px Arial";
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";

  if (data.length === 0) {
    ctx.fillText("No scores yet!", WIDTH / 2, HEIGHT / 2);
  } else {
    // Draw different headers and content based on leaderboard type
    if (leaderboard.currentTab === 'monluck') {
      drawMonluckLeaderboard(data);
    } else if (leaderboard.currentTab === 'battle') {
      drawBattleLeaderboard(data);
    } else {
      drawTraditionalLeaderboard(data);
    }
  }

  // Draw back button
  leaderboardButtons[0].draw();
  
  // Draw withdraw button if available
  if (leaderboardButtons.length > 1) {
    leaderboardButtons[1].draw();
    
    // Show pending withdrawal amount
    if (typeof getPendingWithdrawal !== 'undefined') {
      getPendingWithdrawal().then(amount => {
        if (parseFloat(amount) > 0) {
          ctx.font = "16px Arial";
          ctx.fillStyle = "#00ff00";
          ctx.textAlign = "center";
          ctx.fillText(`Available: ${formatMON(amount)}`, WIDTH / 2 + 80, HEIGHT - 80);
        }
      }).catch(err => console.log("Could not fetch withdrawal amount"));
    }
  }
  
  // Show current play mode
  ctx.font = "16px Arial";
  ctx.fillStyle = playMode === "monad" ? "#00ff00" : "#999";
  ctx.textAlign = "left";
  ctx.fillText(`Mode: ${playMode.toUpperCase()}`, 20, HEIGHT - 20);
}

function drawMonluckLeaderboard(data) {
  // Header for Monluck leaderboard
  ctx.font = "18px Arial";
  ctx.fillStyle = "#666";
  ctx.fillText("Rank    Name    5-Monads    4-Monads    Best Streak    Wallet", WIDTH / 2, 220);

  // Monluck players list
  ctx.font = "16px Arial";
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const player = data[i];
    const y = 250 + i * 30;
    const rank = i + 1;
    const name = player.name || "Anonymous";
    // Handle both online data (walletAddress) and local data (address) formats
    const walletText = (player.walletAddress || player.address) ? getShortAddress(player.walletAddress || player.address) : "";

    // Highlight top 3
    if (rank <= 3) {
      ctx.fillStyle = rank === 1 ? "#000" : rank === 2 ? "#000" : "#000";
    } else {
      ctx.fillStyle = "#333";
    }
    if (rank <= 3) {
      ctx.fillText("🏆", WIDTH / 2 - 280, y);
    }

    ctx.fillText(`${rank}.    ${name}    ${player.fiveMonadCount || 0}    ${player.fourMonadCount || 0}    ${player.bestStreak || 0}    ${walletText}`, WIDTH / 2, y);
  }
}

function drawBattleLeaderboard(data) {
  // Header for Battle leaderboard  
  ctx.font = "20px Arial";
  ctx.fillStyle = "#666";
  ctx.fillText("Rank    Name    Wins    Wallet", WIDTH / 2, 220);

  // Battle players list
  ctx.font = "18px Arial";
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const player = data[i];
    const y = 250 + i * 30;
    const rank = i + 1;
    const name = player.name || "Anonymous";
    // Handle both online data (walletAddress) and local data (address) formats
    const walletText = (player.walletAddress || player.address) ? getShortAddress(player.walletAddress || player.address) : "";
    // Handle both online data (score or winCount) and local data (winCount) formats
    const wins = player.winCount ?? player.score ?? 0;

    // Highlight top 3
    if (rank <= 3) {
      ctx.fillStyle = rank === 1 ? "#000" : rank === 2 ? "#000" : "#000";
    } else {
      ctx.fillStyle = "#333";
    }
    if (rank <= 3) {
      ctx.fillText("🏆", WIDTH / 2 - 200, y);
    }

    ctx.fillText(`${rank}.    ${name}    ${wins}    ${walletText}`, WIDTH / 2, y);
  }
}

function drawTraditionalLeaderboard(scores) {
  // Header - includes wallet address column for blockchain integration
  ctx.font = "20px Arial";
  ctx.fillStyle = "#666";
  ctx.fillText("Rank    Name    Score    Wallet", WIDTH / 2, 220);

  // Scores list - displays wallet addresses when available
  ctx.font = "18px Arial";
  for (let i = 0; i < Math.min(scores.length, 10); i++) {
    const score = scores[i];
    const y = 250 + i * 30;
    const rank = i + 1;
    const name = score.name || "Anonymous";
    const scoreText = score.score;
    // Show shortened wallet address if player had connected wallet
    const walletText = score.walletAddress ? getShortAddress(score.walletAddress) : "";

    // Highlight top 3
    if (rank <= 3) {
      ctx.fillStyle = rank === 1 ? "#000" : rank === 2 ? "#000" : "#000";
    } else {
      ctx.fillStyle = "#333";
    }
    if (rank <= 3) {
      ctx.fillText("🏆", WIDTH / 2 - 200, y);
    }

    ctx.fillText(`${rank}.    ${name}    ${scoreText}    ${walletText}`, WIDTH / 2, y);
  }
}

function restartCurrentGame() {
  switch (gameOverOverlay.mode) {
    case "musicMemory":
      gameState = "musicmem";
      startMusicMemoryGame(false);   // No splash for restart
      startMemoryPhase();            // Start immediately like pressing START
      drawMusicMemory();             // Redraw the new board
      break;
    case "memoryClassic":
      initializeClassicMemoryUpgraded();
      startClassicRound();
      break;
    case "memoryMemomu":
      gameState = "memory_memomu";
      memomuGame.showGo = false;     // Hide the Go screen
      startMemoryGameMemomu(false);  // No splash for restart
      // Start immediately like pressing GO - trigger the flash sequence after a short delay
      setTimeout(runMemoryMemomuFlashSequence, 900);
      drawMemoryGameMemomu();        // Redraw the new board
      break;
    case "monluck":
      gameState = "monluck";
      startMonluckGame();
      break;
    case "battle":
      gameState = "battle";
      resetBattleGame();
      break;
  }
}

// --- GAME OVER FUNCTIONS FOR EACH MODE ---
function endMusicMemRound() {
  musicMem.allowInput = false;
  musicMem.feedback = "Game Over!";
  showGameOverOverlay("musicMemory", musicMem.score);
}

function endMusicMemoryGame() {
  musicMem.gameOver = true;
  showGameOverOverlay("musicMemory", musicMem.score);
}

function endMemoryClassicGame() {
  showGameOverOverlay("memoryClassic", memoryGame.score);
}

function endMemoryMemomuGame() {
  // Use the same overlay system as Music Memory
  showGameOverOverlay("memoryMemomu", memomuGame.score);
}

function endMonluckGame() {
  showGameOverOverlay("monluck", monluckGame.score);
}

function endBattleGame() {
  showGameOverOverlay("battle", battleGame.pscore);
}

// --- BUTTONS SETUP ---
function setupButtons() {
  // Main menu buttons - New homepage design
  menuButtons = [
    new Button("Play on MONAD", WIDTH / 2, 350, 280, 60),
    new Button("Play FREE", WIDTH / 2, 430, 280, 60),
    new Button("LEADERBOARD", WIDTH / 2, 510, 240, 50),
    new Button("WALLET", WIDTH - 100, 90, 180, 44),  // MetaMask integration
    new Button("", WIDTH - 100, 40, 55, 44, "sound"),
  ];
  // Mode selection buttons - Wallet added above sound button
  let modeY = 295 + 85;
  let modeGap = 60;
  modeButtons = [
    new Button("MUSIC MEMORY", WIDTH / 2, modeY, 280, 50),
    new Button("MEMORY", WIDTH / 2, modeY + modeGap, 200, 50),
    new Button("MONLUCK", WIDTH / 2, modeY + modeGap * 2, 200, 50),
    new Button("BATTLE", WIDTH / 2, modeY + modeGap * 3, 200, 50),
    new Button("MONOMNIBUS", WIDTH / 2, modeY + modeGap * 4, 200, 50),
    new Button("WALLET", WIDTH - 100, 90, 180, 44),  // MetaMask integration
    new Button("", WIDTH - 100, 40, 55, 44, "sound"),
    new Button("BACK", WIDTH / 2, modeY + modeGap * 5, 150, 50)
  ];
  musicMemRulesButtons = [
    new Button("Got it!", WIDTH / 2 - 100, HEIGHT - 80, 180, 50),
    new Button("MENU", WIDTH / 2 + 100, HEIGHT - 80, 180, 50)
  ];
  musicMemButtons = [
    new Button("START", WIDTH / 2, HEIGHT - 110, 180, 48),
    new Button("MENU", WIDTH / 2, HEIGHT - 50, 180, 48)
  ];
  let memY = 300;
  memoryMenuButtons = [
    new Button("CLASSIC", WIDTH / 2, memY, 320, 56),
    new Button("MEMOMU", WIDTH / 2, memY + 80, 320, 56),
    new Button("BACK", WIDTH / 2, memY + 160, 320, 56)
  ];
  memoryClassicRulesButtons = [
    new Button("GOT IT", WIDTH / 2, HEIGHT - 100, 200, 60)
  ];
  memoryClassicButtons = [
    new Button("MENU", WIDTH / 2, HEIGHT - 60, 150, 48)
  ];
  memoryMemomuRulesButtons = [
    new Button("GOT IT", WIDTH / 2, HEIGHT - 100, 200, 60)
  ];
  memoryMemomuButtons = [
    new Button("GO!", WIDTH / 2, HEIGHT - 300, 120, 60),
    new Button("MENU", WIDTH / 2, HEIGHT - 45, 120, 48)
  ];
  monluckButtons = [
    new Button("AGAIN", WIDTH / 2 - 190, HEIGHT - 60, 160, 48),
    new Button("MENU", WIDTH / 2, HEIGHT - 60, 160, 48),
    new Button("QUIT", WIDTH / 2 + 190, HEIGHT - 10, 160, 48)
  ];
  battleButtons = [
    new Button("GOT IT", WIDTH / 2, 600, 170, 60),
    new Button("GO!", WIDTH / 2, 610, 170, 60),
    new Button("BACK", WIDTH / 2, 400, 170, 60),
    new Button("QUIT", WIDTH / 2, 650, 170, 45),
    new Button("MENU", WIDTH / 2, HEIGHT - 60, 180, 48)
  ];

  // Leaderboard buttons
  leaderboardButtons = [
    new Button("BACK", WIDTH / 2 - 80, HEIGHT - 50, 150, 50),
  ];
  
  // Add withdraw button for MONAD mode when wallet is connected
  if (playMode === "monad" && walletConnection.isConnected) {
    leaderboardButtons.push(new Button("WITHDRAW", WIDTH / 2 + 80, HEIGHT - 50, 150, 50));
  }
}

// --- MUSIC MEMORY LOGIC ---
function startMusicMemoryGame(showSplash = false) { // CHANGED: Default to no splash
  musicMem.currentRound = 1;
  musicMem.score = 0;
  // musicMem.showRoundSplash = showSplash;     // REMOVED - no more splash screens
  // musicMem.splashTimer = showSplash ? 30 : 0; // REMOVED - no more splash screens
  // musicMem.splashMsg = "Round 1";            // REMOVED - no more splash screens
  musicMem.gameStarted = false;
  musicMem.phase = "memory";

  // Create random image-to-note assignments (8 images from 1-18)
  setupImageAssignments();
  setupMusicMemRound();
}

function setupImageAssignments() {
  // Select 8 random images from 1-18
  let allImages = [];
  for (let i = 1; i <= 18; i++) {
    allImages.push(i);
  }

  // Shuffle and pick 8 using Fisher-Yates algorithm
  allImages = fisherYatesShuffle(allImages);
  musicMem.assignedImages = allImages.slice(0, 8);

  // Create assignments mapping each selected image to a note (1-8)
  musicMem.imageAssignments = {};
  for (let i = 0; i < 8; i++) {
    musicMem.imageAssignments[musicMem.assignedImages[i]] = i + 1;
  }

  // Store remaining images for decoys
  musicMem.decoyImages = allImages.slice(8);
}

function setupMusicMemRound() {
  musicMem.grid = createGrid(3, 4, 115, 28, 140);

  // Determine how many images for this round
  let imageCount = getRoundImageCount(musicMem.currentRound);
  let repetitions = getRoundRepetitions(musicMem.currentRound);

  // Create memory sequence (using assigned images)
  musicMem.memorySequence = [];
  for (let i = 0; i < imageCount; i++) {
    let imgIdx = musicMem.assignedImages[i % musicMem.assignedImages.length];
    musicMem.memorySequence.push(imgIdx);
  }

  // Create deception sequence (different order of same images) using Fisher-Yates
  musicMem.deceptionSequence = fisherYatesShuffle([...musicMem.memorySequence]);

  // Fill grid: place assigned images + fill remaining with decoys
  fillGridForRound();

  musicMem.userSequence = [];
  musicMem.playingMelody = false;
  musicMem.allowInput = false;
  musicMem.feedback = "";
  musicMem.phaseTimer = 0;
  musicMem.timeLimit = getRoundTimeLimit(musicMem.currentRound);
}

function getRoundImageCount(round) {
  if (round === 1) return 3;
  if (round >= 2 && round <= 3) return 4;
  if (round >= 4 && round <= 7) return 5;
  if (round === 8) return 6;
  if (round === 9) return 7;
  if (round === 10) return 8;
  return 3;
}

function getRoundRepetitions(round) {
  if (round >= 1 && round <= 3) return 1; // EASY
  if (round >= 4 && round <= 7) return 2; // MEDIUM
  if (round >= 8 && round <= 10) return 3; // PRO
  return 1;
}

function getRoundTimeLimit(round) {
  if (round >= 1 && round <= 3) return 10; // 10s for rounds 1-3
  if (round >= 4 && round <= 7) return 15; // 15s for rounds 4-7
  if (round >= 8 && round <= 10) return 20; // 20s for rounds 8-10
  return 10;
}

function fillGridForRound() {
  let imageCount = getRoundImageCount(musicMem.currentRound);
  let usedImages = musicMem.memorySequence.slice(0, imageCount);

  // Clear grid image assignments
  musicMem.grid.forEach(tile => {
    tile.imageIdx = null;
    tile.isDecoy = true;
    tile.revealed = false;
    tile.selected = false;
    tile.highlight = false;
  });

  // Create a pool of unique images for the entire grid
  // Start with the required images
  let allGridImages = [...usedImages];
  
  // Add unique decoy images to fill the remaining slots
  let availableDecoys = [...musicMem.decoyImages];
  let remainingSlots = 12 - usedImages.length;
  
  // Shuffle decoys and take only what we need for remaining slots
  availableDecoys = fisherYatesShuffle(availableDecoys);
  allGridImages = allGridImages.concat(availableDecoys.slice(0, remainingSlots));
  
  // Shuffle all images for random placement
  allGridImages = fisherYatesShuffle(allGridImages);

  // Place images in grid positions
  for (let i = 0; i < 12; i++) {
    musicMem.grid[i].imageIdx = allGridImages[i];
    musicMem.grid[i].isDecoy = !usedImages.includes(allGridImages[i]);
  }
}

function startMemoryPhase() {
  musicMem.gameStarted = true;
  musicMem.phase = "memory";
  musicMem.showPhaseMessage = true;
  musicMem.phaseMessage = "Listen carefully and remember";
  musicMem.phaseMessageTimer = 30; // 1 seconds
  musicMem.phaseTimer = 0;

  setTimeout(() => {
    playMemorySequence();
  }, 1000);
}

function playMemorySequence() {
  musicMem.playingMelody = true;
  musicMem.allowInput = false;

  let repetitions = getRoundRepetitions(musicMem.currentRound);
  let sequence = [];

  // Repeat the memory sequence based on difficulty
  for (let r = 0; r < repetitions; r++) {
    sequence = sequence.concat(musicMem.memorySequence);
  }

  let i = 0;
  function playStep() {
    if (i < sequence.length) {
      let imgIdx = sequence[i];

      // Find and highlight the tile with this image
      for (let tile of musicMem.grid) {
        if (tile.imageIdx === imgIdx && !tile.isDecoy) {
          tile.highlight = true;
          tile.revealed = true;
          break;
        }
      }

      drawMusicMemory();

      // Play the note sound for this image
      let noteNum = musicMem.imageAssignments[imgIdx];
      let sfx = assets.sounds[`note${noteNum}`];
      if (sfx) {
        try { sfx.currentTime = 0; sfx.play(); } catch (e) { }
      }

      setTimeout(() => {
        // Turn off highlight
        for (let tile of musicMem.grid) {
          tile.highlight = false;
          tile.revealed = false;
        }
        drawMusicMemory();
        i++;
        setTimeout(playStep, 300);
      }, 300);
    } else {
      musicMem.playingMelody = false;
      setTimeout(() => startDeceptionPhase(), 500);
    }
  }
  playStep();
}

function startDeceptionPhase() {
  musicMem.phase = "deception";
  musicMem.showPhaseMessage = true;
  musicMem.phaseMessage = "Don't get yourself fooled";
  musicMem.phaseMessageTimer = 60; // 2 seconds

  setTimeout(() => {
    playDeceptionSequence();
  }, 1000);
}

function playDeceptionSequence() {
  let repetitions = getRoundRepetitions(musicMem.currentRound);
  let sequence = [];

  // Repeat the deception sequence based on difficulty
  for (let r = 0; r < repetitions; r++) {
    sequence = sequence.concat(musicMem.deceptionSequence);
  }

  let i = 0;
  function playStep() {
    if (i < sequence.length) {
      let imgIdx = sequence[i];

      // Find and highlight the tile with this image (might be in different position)
      for (let tile of musicMem.grid) {
        if (tile.imageIdx === imgIdx && !tile.isDecoy) {
          tile.highlight = true;
          tile.revealed = true;
          break;
        }
      }

      drawMusicMemory();

      // Play a different note or same note for deception
      let noteNum = musicMem.imageAssignments[imgIdx];
      let sfx = assets.sounds[`note${noteNum}`];
      if (sfx) {
        try { sfx.currentTime = 0; sfx.play(); } catch (e) { }
      }

      setTimeout(() => {
        // Turn off highlight
        for (let tile of musicMem.grid) {
          tile.highlight = false;
          tile.revealed = false;
        }
        drawMusicMemory();
        i++;
        setTimeout(playStep, 300);
      }, 300);
    } else {
      setTimeout(() => startGuessingPhase(), 1000);
    }
  }
  playStep();
}

function startGuessingPhase() {
  musicMem.phase = "guessing";
  musicMem.showPhaseMessage = true;
  musicMem.phaseMessage = "Now play!";
  musicMem.phaseMessageTimer = 60; // 2 seconds
  musicMem.allowInput = true;
  musicMem.userSequence = [];
  musicMem.phaseStartTime = performance.now() / 1000;

  // Reveal all tiles
  musicMem.grid.forEach(tile => {
    tile.revealed = true;
    tile.selected = false;
  });
  musicMem.grid.forEach((tile, idx) => {
    if (!tile.imageIdx) {
      console.warn(`Tile ${idx + 1} is missing imageIdx in guessing phase.`);
    }
  });

  drawMusicMemory();
}

function handleMusicMemTileClick(tileIdx) {
  if (!musicMem.allowInput || musicMem.phase !== "guessing") return;

  let tile = musicMem.grid[tileIdx - 1];
  if (!tile || tile.selected) return;

  tile.selected = true;

  // Check if this is a decoy tile
  if (tile.isDecoy) {
    // Wrong click - end round immediately
    let sfx = assets.sounds["buuuu"];
    if (sfx) {
      try { sfx.currentTime = 0; sfx.play(); } catch (e) { }
    }

    musicMem.feedback = "Wrong! Round ended.";
    musicMem.allowInput = false;

    setTimeout(() => endMusicMemRound(), 1500);
    drawMusicMemory();
    return;
  }
  if (tile.revealed && tile.imageIdx) {
    let img = assets.images["img" + tile.imageIdx];
    if (!img) {
      console.warn(`Missing image for img${tile.imageIdx}`);
    }
  }

  musicMem.userSequence.push(tile.imageIdx);

  // Check if this click is in the right order
  let expectedImg = musicMem.memorySequence[musicMem.userSequence.length - 1];
  if (tile.imageIdx !== expectedImg) {
    // Wrong order - end round immediately
    let sfx = assets.sounds["buuuu"];
    if (sfx) {
      try { sfx.currentTime = 0; sfx.play(); } catch (e) { }
    }

    musicMem.feedback = "Wrong order! Round ended.";
    musicMem.allowInput = false;

    setTimeout(() => endMusicMemRound(), 1500);
    drawMusicMemory();
    return;
  }

  // Correct click
  let noteNum = musicMem.imageAssignments[tile.imageIdx];
  let sfx = assets.sounds[`note${noteNum}`];
  if (sfx) {
    try { sfx.currentTime = 0; sfx.play(); } catch (e) { }
  }

  musicMem.score += 1; // +1 point per correct hit

  // Check if round is complete
  if (musicMem.userSequence.length === musicMem.memorySequence.length) {
    // Perfect round!
    let bonusPoints = musicMem.memorySequence.length;
    musicMem.score += bonusPoints;

    let sfx = assets.sounds["yupi"];
    if (sfx) {
      try { sfx.currentTime = 0; sfx.play(); } catch (e) { }
    }

    musicMem.feedback = `Perfect! +${bonusPoints} bonus points`;
    musicMem.allowInput = false;

    setTimeout(() => nextMusicMemRound(), 1500);
  }

  drawMusicMemory();
}

// --- CLASSIC MEMORY MODE LOGIC ---
// Helper functions for upgraded Classic Memory
function getClassicRoundGrid(round) {
  switch (round) {
    case 1: return { rows: 3, cols: 4, pairs: 6 };
    case 2: return { rows: 4, cols: 4, pairs: 8 };
    case 3: return { rows: 4, cols: 5, pairs: 10 };
    case 4: return { rows: 5, cols: 5, pairs: 12 }; // 25 tiles, 12 pairs + 1 extra
    case 5: return { rows: 5, cols: 6, pairs: 15 };
    default: return { rows: 3, cols: 4, pairs: 6 };
  }
}

function initializeClassicMemoryUpgraded() {
  memoryGame.currentRound = 1;
  memoryGame.maxRounds = 5; // Reduced from 10 to 5 for better gameplay
  memoryGame.roundScores = [];
  memoryGame.score = 0;
  memoryGame.showRules = true;
  memoryGame.showClassicStartButton = false; // Reset start button flag
  memoryGame.gameCompleted = false;
  memoryGame.roundActive = true; // Initialize round as active

  // Prepare all available images (1-33 + monad = 34 total)
  memoryGame.allImages = [];
  for (let i = 1; i <= 33; i++) {
    memoryGame.allImages.push(i);
  }
  memoryGame.allImages.push('monad');
}

function setupClassicRound(round) {
  let gridConfig = getClassicRoundGrid(round);
  memoryGame.grid = createGrid(gridConfig.rows, gridConfig.cols, 80, 8, 160);

  let totalTiles = gridConfig.rows * gridConfig.cols;
  memoryGame.roundPairCount = gridConfig.pairs;

  // Select random images for pairs using Fisher-Yates shuffle
  let shuffledImages = fisherYatesShuffle(memoryGame.allImages);
  let selectedImages = shuffledImages.slice(0, gridConfig.pairs);

  // Create pairs array
  let pairIds = [];
  selectedImages.forEach(img => {
    pairIds.push(img);
    pairIds.push(img);
  });

  // For odd number of tiles (round 4), add one extra image
  if (totalTiles % 2 === 1) {
    let extraImage = shuffledImages[gridConfig.pairs];
    pairIds.push(extraImage);
  }

  // Shuffle the pairs using Fisher-Yates algorithm
  pairIds = fisherYatesShuffle(pairIds);

  memoryGame.pairIds = pairIds;
  memoryGame.revealed = Array(totalTiles).fill(false);
  memoryGame.matched = Array(totalTiles).fill(false);
  memoryGame.firstIdx = null;
  memoryGame.secondIdx = null;
  memoryGame.lock = false;
  memoryGame.pairsFound = 0;
  memoryGame.attempts = 0;
  memoryGame.feedback = "";
  // memoryGame.showSplash = true;           // REMOVED - no more splash screens
  // memoryGame.splashTimer = 40;            // REMOVED - no more splash screens
  // memoryGame.splashMsg = `Round ${round}`; // REMOVED - no more splash screens
  memoryGame.roundStartTime = performance.now();
  memoryGame.timeRemaining = 30;
  memoryGame.gameStarted = false; // Cards start disabled
}


function startMemoryGameClassic() {
  initializeClassicMemoryUpgraded();
  gameState = "memory_classic_rules";
}

function startClassicRound() {
  setupClassicRound(memoryGame.currentRound);
  memoryGame.gameStarted = true; // For subsequent rounds, start immediately
  memoryGame.roundActive = true; // Enable round activity
  gameState = "memory_classic";
}

function nextClassicRound() {
  memoryGame.currentRound++;
  
  // Safeguard to prevent infinite rounds
  if (memoryGame.currentRound > memoryGame.maxRounds) {
    console.warn(`Round count exceeded maximum (${memoryGame.maxRounds}), ending game`);
    endMemoryClassicGame();
    return;
  }
  
  if (memoryGame.currentRound <= memoryGame.maxRounds) {
    startClassicRound();
  } else {
    // Should not reach here as endClassicRound handles game completion
    endMemoryClassicGame();
  }
}

function calculateRoundScore(timeUsed, allPairsFound) {
  let baseScore = memoryGame.pairsFound; // 1 point per pair
  
  // Time bonus is ONLY awarded when all pairs are found in the round
  let timeBonus = 0;
  if (allPairsFound) {
    timeBonus = Math.max(0, 30 - timeUsed); // seconds under 30
  }
  
  let multiplier = memoryGame.currentRound; // round number as multiplier
  return baseScore + (timeBonus * multiplier);
}

function endClassicRound(isSuccess = false) {
  // Prevent multiple calls to round-end logic
  if (!memoryGame.roundActive) return;
  memoryGame.roundActive = false;
  
  let timeUsed = (performance.now() - memoryGame.roundStartTime) / 1000;
  
  // Determine if all pairs were found for this round
  let allPairsFound = memoryGame.pairsFound >= memoryGame.roundPairCount;
  
  // Calculate round score - time bonus only awarded if all pairs found
  let roundScore = calculateRoundScore(timeUsed, allPairsFound);
  memoryGame.roundScores.push(roundScore);
  memoryGame.score += roundScore;

  // Safeguard: Prevent accidental double-counting or runaway rounds
  if (memoryGame.currentRound > memoryGame.maxRounds) {
    console.warn(`endClassicRound called with round ${memoryGame.currentRound} > max ${memoryGame.maxRounds}, ending game`);
    endMemoryClassicGame();
    return;
  }

  if (isSuccess && allPairsFound && memoryGame.currentRound < memoryGame.maxRounds) {
    // Round completed successfully - advance to next round
    memoryGame.feedback = `Round ${memoryGame.currentRound} Complete! +${roundScore} points`;
    setTimeout(() => {
      nextClassicRound();
    }, 2000);
  } else if (isSuccess && allPairsFound && memoryGame.currentRound >= memoryGame.maxRounds) {
    // Game completed successfully after all rounds
    memoryGame.feedback = `Game Complete! Final Score: ${memoryGame.score}`;
    setTimeout(() => {
      endMemoryClassicGame();
    }, 2000);
  } else {
    // Failure case: time ran out or player failed to complete round
    // Award ONLY the pairs found for this round (no time bonus), then end game
    // Rounds do not advance and no further points are given after failure
    memoryGame.feedback = `Time's up! Game Over. Final Score: ${memoryGame.score}`;
    setTimeout(() => {
      endMemoryClassicGame();
    }, 2000);
  }
}

// --- MEMOMU MEMORY MODE LOGIC ---
function startMemoryGameMemomu(showSplash = false) { // CHANGED: Default to no splash
  memomuGame.failed = false;
  memomuGame.phase = "show";
  memomuGame.feedback = "";
  memomuGame.round = 1;
  memomuGame.score = 0;
  memomuGame.roundScores = [];
  memomuGame.gameCompleted = false;
  memomuGame.showScoreTable = false;
  // memomuGame.showSplash = showSplash;           // REMOVED - no more splash screens
  // memomuGame.splashTimer = showSplash ? 60 : 0; // REMOVED - no more splash screens
  // memomuGame.splashMsg = "Round 1";             // REMOVED - no more splash screens

  // Initialize image pool with all available images (1-37 + avatars A-N = 51 total)
  memomuGame.imagePool = [];
  // Add regular images 1-37
  for (let i = 1; i <= 37; i++) {
    memomuGame.imagePool.push(i);
  }
  // Add avatar images A-N
  for (let letter of avatarLetters) {
    memomuGame.imagePool.push(`avatar${letter}`);
  }
  memomuGame.usedImages = [];

  setupMemoryMemomuRound();
}
function setupMemoryMemomuRound() {
  let n = memomuGame.round;

  // Determine grid size based on round
  let gridSize, gridTiles;
  if (n <= 10) {
    // Rounds 1-10: 6 columns × 5 rows (30 tiles)
    memomuGame.grid = createGrid(5, 6, 85, 10, 125);
    gridTiles = 30;
  } else {
    // Rounds 11-20: 7 columns × 7 rows (49 tiles) - smaller tiles to fit
    memomuGame.grid = createGrid(7, 7, 70, 8, 100);
    gridTiles = 49;
  }

  memomuGame.flashSeq = [];
  let allIdx = Array.from({ length: gridTiles }, (_, i) => i);
  let chosen = [];
  while (chosen.length < n) {
    let idx = allIdx[Math.floor(Math.random() * allIdx.length)];
    if (!chosen.includes(idx)) chosen.push(idx);
  }
  memomuGame.flashSeq = chosen;
  memomuGame.found = [];
  memomuGame.clicksUsed = 0;
  memomuGame.wrongClicks = 0; // Reset wrong clicks counter
  memomuGame.allowedClicks = n + 1; // N+1 clicks allowed

  // Assign random images to grid tiles, ensuring variety
  memomuGame.gridImages = [];
  let availableImages = [...memomuGame.imagePool];

  // For rounds 11-20, we need 49 unique images from our pool of 51
  if (n > 10) {
    // Randomly select 49 images from the 51 available
    let shuffledPool = [...memomuGame.imagePool];
    for (let i = shuffledPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]];
    }
    availableImages = shuffledPool.slice(0, 49);
  } else {
    // For rounds 1-10, use the existing logic with variety tracking
    if (memomuGame.usedImages.length > availableImages.length / 2) {
      memomuGame.usedImages = [];
    }
    availableImages = availableImages.filter(img => !memomuGame.usedImages.includes(img));
  }

  for (let i = 0; i < gridTiles; i++) {
    if (n > 10) {
      // For rounds 11-20, use the pre-selected 49 images
      memomuGame.gridImages.push(availableImages[i]);
    } else {
      // For rounds 1-10, use existing variety logic
      if (availableImages.length === 0) {
        availableImages = [...memomuGame.imagePool];
        memomuGame.usedImages = [];
      }

      let randomIndex = Math.floor(Math.random() * availableImages.length);
      let selectedImage = availableImages[randomIndex];

      memomuGame.gridImages.push(selectedImage);
      memomuGame.usedImages.push(selectedImage);

      // Remove this image from available pool for this round to avoid immediate repeats
      availableImages.splice(randomIndex, 1);
    }
  }

  // Calculate time limit: Scale appropriately for rounds 11-20
  if (n === 1) {
    memomuGame.timeLimit = 3;
  } else if (n <= 10) {
    memomuGame.timeLimit = n + 2 * (n - 1);
  } else {
    // For rounds 11-20: +2 seconds base, plus +1 second for each higher round
    // e.g., round 12 = +3s, round 13 = +4s, etc.
    let baseTime = n + 2 * (n - 1);
    let bonusTime = 2 + (n - 11); // +2 base + 1 per round above 11
    memomuGame.timeLimit = baseTime + bonusTime;
  }

  memomuGame.timer = 0;
  memomuGame.timeStarted = 0;
  memomuGame.phase = "show";
  memomuGame.feedback = "";
}

// --- MONLUCK LOGIC ---
function startMonluckGame() {
  monluckGame.grid = createGrid(5, 6, 85, 10, 125);

  // Initialize all tiles as not revealed
  monluckGame.grid.forEach(tile => {
    tile.revealed = false;
  });

  // Create an array of 30 images: 5 monad.png and 25 random images from image1-image33
  monluckGame.gridImages = [];

  // Choose 5 random positions for the monads
  let allPositions = Array.from({ length: 30 }, (_, i) => i);
  let shuffledPositions = fisherYatesShuffle(allPositions);
  monluckGame.monadIndices = shuffledPositions.slice(0, 5);

  // Fill the grid with images
  for (let i = 0; i < 30; i++) {
    if (monluckGame.monadIndices.includes(i)) {
      monluckGame.gridImages[i] = "monad"; // This will be the monad image
    } else {
      // Use random images from image1-image33
      let randomImageIndex = Math.floor(Math.random() * 33) + 1;
      monluckGame.gridImages[i] = "classicimg" + randomImageIndex;
    }
  }

  monluckGame.found = [];
  monluckGame.clicks = 0;
  monluckGame.finished = false;
  monluckGame.result = "";
  monluckGame.score = 0;
  // monluckGame.showSplash = true;     // REMOVED - no more splash screens
  // monluckGame.splashTimer = 40;      // REMOVED - no more splash screens
  // monluckGame.splashMsg = "MONLUCK"; // REMOVED - no more splash screens
}

// --- BATTLE LOGIC ---
function resetBattleGame() {
  battleGame.state = "rules";
  battleGame.phase = "ready";
  battleGame.round = 0;
  battleGame.pscore = 0;
  battleGame.oscore = 0;
  battleGame.pscoreRounds = [];
  battleGame.oscoreRounds = [];
  battleGame.player = null;
  battleGame.opponent = null;
  battleGame.grid = [];
  battleGame.gridAI = [];
  battleGame.targets = [];
  battleGame.aiTargets = [];
  battleGame.clicks = [];
  battleGame.aiClicks = [];
  battleGame.playerTime = null;
  battleGame.aiTime = null;
  battleGame.avatarsThisRound = 0;
  battleGame.anim = 0;
  battleGame.flashing = false;
  battleGame.lastResult = "";
  battleGame.resultText = "";
  battleGame.finished = false;
  battleGame.chooseRects = [];
  battleGame.aiResult = null;
}
function prepareBattleRound() {
  const avatars = Math.floor(Math.random() * 5) + 1;
  battleGame.avatarsThisRound = avatars;
  [battleGame.grid, battleGame.targets] = makeBattleGrid(battleGame.player, avatars, battleGame.round);
  [battleGame.gridAI, battleGame.aiTargets] = makeBattleGrid(battleGame.opponent, avatars, battleGame.round);
  battleGame.clicks = [];
  battleGame.aiClicks = [];
  battleGame.playerTime = null;
  battleGame.aiTime = null;
  battleGame.phase = "flash";
  battleGame.flashing = true;
  battleGame.anim = performance.now() / 1000;
  battleGame.resultText = "";
  battleGame.aiResult = null;
}
function makeBattleGrid(avatarIdx, avatars, roundIdx) {
  let grid = Array(16).fill(null);
  let avatar_pos = [];
  while (avatar_pos.length < avatars) {
    let idx = Math.floor(Math.random() * 16);
    if (!avatar_pos.includes(idx)) avatar_pos.push(idx);
  }
  for (const i of avatar_pos) grid[i] = assets.images[`avatar${avatarIdx + 1}`];
  if (roundIdx < 2) {
    for (let i = 0; i < 16; i++) if (grid[i] == null) grid[i] = null;
    return [grid, avatar_pos];
  } else {
    let pool = [];
    for (let i = 14; i <= 33; i++) pool.push(i);
    let imgs_needed = 16 - avatars;
    let imgs = [];
    while (imgs.length < imgs_needed) {
      pool = fisherYatesShuffle(pool);
      imgs = imgs.concat(pool.slice(0, Math.min(imgs_needed - imgs.length, pool.length)));
    }
    let img_ptr = 0;
    for (let i = 0; i < 16; i++) {
      if (grid[i] == null) {
        if (img_ptr >= imgs.length) img_ptr = 0;
        grid[i] = assets.images[`battle${imgs[img_ptr]}`];
        img_ptr++;
      }
    }
    return [grid, avatar_pos];
  }
}
function aiPlay() {
  let ai_delay_per_tile = Math.random() * 0.6 + 0.5;
  let total_time = ai_delay_per_tile * battleGame.avatarsThisRound + Math.random();
  return [battleGame.aiTargets.slice(), total_time];
}
function sorted(arr) { return arr.slice().sort((a, b) => a - b).join(","); }
function makeBattleResultText(mistake) {
  const player_hits = battleGame.clicks.filter(i => battleGame.targets.includes(i)).length;
  const ai_hits = battleGame.aiTargets.length;
  const player_all = sorted(battleGame.clicks) == sorted(battleGame.targets);
  const ai_time_val = battleGame.aiTime || 999;
  const player_faster = player_all && battleGame.playerTime < ai_time_val;
  let msg = "";
  if (mistake) {
    msg = `YOU LOSE ROUND! You got ${player_hits} pts, Opponent ${ai_hits} pts`;
    battleGame.pscore += player_hits;
    battleGame.oscore += ai_hits + 1;
  } else if (player_all && player_faster) {
    msg = `YOU WIN ROUND! ${battleGame.avatarsThisRound} pts +1 speed +1 win`;
    battleGame.pscore += battleGame.avatarsThisRound + 2;
    battleGame.oscore += ai_hits;
  } else if (player_all) {
    msg = `YOU FINISHED! ${battleGame.avatarsThisRound} pts`;
    battleGame.pscore += battleGame.avatarsThisRound;
    battleGame.oscore += ai_hits + 1;
  }
  return msg;
}
function processBattleResult() {
  if (!battleGame.resultText) {
    battleGame.resultText = makeBattleResultText(sorted(battleGame.clicks) != sorted(battleGame.targets));
  }
  battleGame.phase = "result";
  battleGame.anim = performance.now() / 700;
  battleGame.aiResult = null;
}
function nextBattleRoundOrEnd() {
  battleGame.round++;
  if (battleGame.round >= 5) {
    battleGame.state = "end";
    battleGame.phase = "end";
    
    // Track battle result in leaderboard and handle blockchain payout
    if (battleGame.pscore > battleGame.oscore) {
      // Player won the battle
      const playerName = walletConnection.isConnected ? getShortAddress(walletConnection.address) : "Anonymous";
      const walletAddress = walletConnection.isConnected ? walletConnection.address : null;
      updateBattleLeaderboard(playerName, walletAddress);
      
      // Handle blockchain payout for MONAD mode (1.5 MON to winner)
      if (playMode === "monad" && typeof blockchain !== 'undefined' && blockchain.contract) {
        // The contract will automatically handle the payout when completeBattle is called
        // This would be called by the game server/owner, not directly by the player
        console.log("Battle won - blockchain payout will be processed");
      }
    }
  } else {
    // Subsequent rounds should go to ready state to show countdown
    battleGame.phase = "ready";
    prepareBattleRound();
    battleGame.resultText = "";
    battleGame.playerTime = null;
  }
}

// --- DRAW FUNCTIONS ---
function drawMenu() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  let img = assets.images["memomu"];
  if (img) ctx.drawImage(img, WIDTH / 2 - 275, 50, 550, 275);
  ctx.fillStyle = "#ff69b4";
  ctx.font = "48px Arial";
  ctx.textAlign = "center";
  menuButtons.forEach(b => b.draw());
  
  // Draw wallet connection status
  ctx.font = "16px Arial";
  ctx.fillStyle = walletConnection.isConnected ? "#00ff00" : "#999";
  ctx.textAlign = "right";
  if (walletConnection.isConnected) {
    const providerIcon = walletConnection.providerType === 'metamask' ? '🦊' : '🔗';
    const balanceFormatted = parseFloat(walletBalance) > 0 ? ` (${parseFloat(walletBalance).toFixed(3)} MON)` : '';
    ctx.fillText(`${providerIcon} ${getShortAddress(walletConnection.address)}${balanceFormatted}`, WIDTH - 35, HEIGHT - 45);
  } else {
    ctx.fillText("Wallet: Not Connected", WIDTH - 35, HEIGHT - 45);
  }
  
  ctx.fillStyle = "#fff";
  ctx.fillText("© 2025 Nhom1984", WIDTH - 35, HEIGHT - 22);
  
  // Version number (bottom left corner)
  drawVersionNumber();
}
function drawModeMenu() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  let img = assets.images["memomu"];
  if (img) ctx.drawImage(img, WIDTH / 2 - 275, 50, 550, 275);
  ctx.fillStyle = "#ff69b4";
  ctx.font = "44px Arial";
  ctx.textAlign = "center";
  modeButtons.forEach(b => b.draw());
  
  // Draw wallet connection status
  ctx.font = "16px Arial";
  ctx.fillStyle = walletConnection.isConnected ? "#00ff00" : "#999";
  ctx.textAlign = "right";
  if (walletConnection.isConnected) {
    const providerIcon = walletConnection.providerType === 'metamask' ? '🦊' : '🔗';
    const balanceFormatted = parseFloat(walletBalance) > 0 ? ` (${parseFloat(walletBalance).toFixed(3)} MON)` : '';
    ctx.fillText(`${providerIcon} ${getShortAddress(walletConnection.address)}${balanceFormatted}`, WIDTH - 35, HEIGHT - 45);
  } else {
    ctx.fillText("Wallet: Not Connected", WIDTH - 35, HEIGHT - 45);
  }
  
  ctx.fillStyle = "#fff";
  ctx.fillText("© 2025 Nhom1984", WIDTH - 35, HEIGHT - 22);
  
  // Show current play mode
  ctx.font = "18px Arial";
  ctx.fillStyle = playMode === "monad" ? "#00ff00" : "#ff69b4";
  ctx.textAlign = "left";
  ctx.fillText(`Mode: ${playMode.toUpperCase()}`, 20, HEIGHT - 20);
  if (playMode === "monad") {
    ctx.font = "14px Arial";
    ctx.fillStyle = "#999";
    ctx.fillText("Blockchain features active", 20, HEIGHT - 45);
  }
  
  // Version number (bottom left corner)
  drawVersionNumber();
}
function drawMemoryMenu() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#836EF9";
  ctx.font = "44px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Choose Memory Mode", WIDTH / 2, 140);
  memoryMenuButtons.forEach(b => b.draw());
  ctx.font = "16px Arial";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "right";
  ctx.fillText("© 2025 Nhom1984", WIDTH - 35, HEIGHT - 22);
}
function drawMusicMemoryRules() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Background
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Title
  ctx.fillStyle = "#836EF9";
  ctx.font = "44px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Music Memory Rules", WIDTH / 2, 60);

  // Large light pink table
  const tableX = 50;
  const tableY = 100;
  const tableW = WIDTH - 100;
  const tableH = HEIGHT - 200;

  // Table background
  ctx.fillStyle = "#ffb6c1";
  ctx.strokeStyle = "#ff69b4";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(tableX, tableY, tableW, tableH, 12);
  ctx.fill();
  ctx.stroke();

  // Rules text
  ctx.fillStyle = "#000";
  ctx.font = "20px Arial";
  ctx.textAlign = "left";

  const rules = [
    "Game has 10 rounds. Each round has 3 phases:",
    "• Memory phase: Remember the right order and faces of images.",
    "• Deceptive phase: Game will show deceiving order and images to fool you.",
    "• Guessing phase: Click right images in right order.",
    "",
    "• Every right hit image gives you 1 point.",
    "• If round is perfect, get additional X points, where X is the number of images",
    "  shown in that round.",
    "• If player hits a wrong image or clicks in the wrong order, the round ends",
    "  immediately.",
    "",
    "Difficulty Levels:",
    "• Rounds 1-3 (EASY): Images appear only once in each phase.",
    "• Rounds 4-7 (MEDIUM): Images appear twice in each phase.",
    "• Rounds 8-10 (PRO): Images appear thrice in each phase.",
    "",
    "Time Limits: 10s (rounds 1-3), 15s (rounds 4-7), 20s (rounds 8-10)"
  ];

  let y = tableY + 40;
  for (let rule of rules) {
    ctx.fillText(rule, tableX + 20, y);
    y += 28;
  }

  // Draw buttons
  musicMemRulesButtons.forEach(b => b.draw());

  // Copyright
  ctx.font = "16px Arial";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "right";
  ctx.fillText("© 2025 Nhom1984", WIDTH - 35, HEIGHT - 22);
}

function drawMusicMemory() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#ff69b4";
  ctx.font = "40px Arial";
  ctx.textAlign = "center";

  // Round and phase info
  ctx.font = "22px Arial";
  ctx.fillStyle = "#fff";
  ctx.fillText("Round " + musicMem.currentRound + " / " + musicMem.maxRounds, WIDTH / 10, 70);

  // Phase indicator with instructions
  let phaseText = "";
  let phaseInstruction = "";
  if (musicMem.phase === "memory") {
    phaseText = "MEMORY PHASE";
    phaseInstruction = "Watch and listen to the sequence";
  } else if (musicMem.phase === "deception") {
    phaseText = "DECEPTION PHASE";
    phaseInstruction = "This sequence might be different!";
  } else if (musicMem.phase === "guessing") {
    phaseText = "GUESSING PHASE";
    phaseInstruction = "Click the tiles in the correct order";
  }

  ctx.font = "24px Arial";
  ctx.fillStyle = "#ffb6c1";
  ctx.fillText(phaseText, WIDTH - 200, 70);

  // Phase instruction
  if (phaseInstruction) {
    ctx.font = "18px Arial";
    ctx.fillStyle = "#fff";
    ctx.fillText(phaseInstruction, WIDTH / 2, 100);
  }

  // Timer for guessing phase
  if (musicMem.phase === "guessing" && musicMem.allowInput) {
    let elapsed = performance.now() / 1000 - musicMem.phaseStartTime;
    let remaining = Math.max(0, musicMem.timeLimit - elapsed);
    ctx.font = "28px Arial";
    ctx.fillStyle = remaining < 3 ? "#ff0000" : "#ffb6c1";
    ctx.fillText("Time: " + Math.ceil(remaining), WIDTH / 2, 120);

    // End round if time runs out
    if (remaining <= 0 && musicMem.allowInput) {
      musicMem.allowInput = false;
      musicMem.feedback = "Time's up!";
      setTimeout(() => endMusicMemRound(), 1500);
    }
  }

  // Draw grid
  musicMem.grid.forEach(tile => {
    ctx.save();

    // Only show images when revealed
    if (tile.revealed && tile.imageIdx) {
      let img = assets.images["img" + tile.imageIdx];
      if (img) ctx.drawImage(img, tile.x, tile.y, tile.size, tile.size);
      else {
        ctx.fillStyle = "#333";
        ctx.fillRect(tile.x, tile.y, tile.size, tile.size);
      }
    } else {
      ctx.fillStyle = "#333";
      ctx.fillRect(tile.x, tile.y, tile.size, tile.size);
    }

    // Border styling
    if (tile.highlight) {
      ctx.strokeStyle = "#ff69b4";
      ctx.lineWidth = 6;
    }
    else if (tile.selected) {
      ctx.strokeStyle = "#00f2ff";
      ctx.lineWidth = 4;
    }
    else {
      ctx.strokeStyle = "#262626";
      ctx.lineWidth = 2;
    }
    ctx.strokeRect(tile.x, tile.y, tile.size, tile.size);
    ctx.restore();
  });

  // Draw buttons based on game state
  if (!musicMem.gameStarted) { // CHANGED: Removed showRoundSplash condition
    musicMemButtons.forEach(b => b.draw());
  } else if (musicMem.gameStarted && musicMem.phase === "guessing") {
    // Only show MENU button during gameplay, but not during score table or name input
    if (gameState !== "musicmem_post_score" && !nameInput.active) {
      musicMemButtons[1].draw();
    }
  }

  // Feedback text
  ctx.font = "28px Arial";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText(musicMem.feedback, WIDTH / 2, HEIGHT - 120);

  // Score
  ctx.font = "21px Arial";
  ctx.fillStyle = "#ffb6c1";
  ctx.fillText("Score: " + musicMem.score, WIDTH / 11, HEIGHT - 600);

  // Show current best score
  let bestScore = getTopScore("musicMemory");
  if (bestScore > 0) {
    ctx.fillStyle = musicMem.score > bestScore ? "#ffd700" : "#ffb6c1"; // Gold if beating, pink otherwise
    ctx.fillText("Best: " + Math.max(bestScore, musicMem.score), WIDTH / 11, HEIGHT - 575);
  }

  // Phase messages are now displayed above the grid (lines 1514-1522) instead of as overlays

  // Copyright
  ctx.font = "16px Arial";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "right";
  ctx.fillText("© 2025 Nhom1984", WIDTH - 35, HEIGHT - 22);

  // Draw game over overlay if active
  drawGameOverOverlay();
}

// --- UPGRADED CLASSIC MEMORY DRAWING FUNCTIONS ---
function drawMemoryClassicRules() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Light pink background
  ctx.fillStyle = "#ffb6c1";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Rules table
  ctx.fillStyle = "#836EF9";
  ctx.font = "36px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Classic Memory Rules", WIDTH / 2, 100);

  ctx.fillStyle = "#333";
  ctx.font = "24px Arial";
  ctx.fillText("FIND PAIRS", WIDTH / 2, 180);

  ctx.font = "20px Arial";
  ctx.fillText("You have 10 rounds with progressive grid,", WIDTH / 2, 250);
  ctx.fillText("Your best score goes for leaderboard,", WIDTH / 2, 280);
  ctx.fillText("Top 5 shares memomu treasure at the end of the week.", WIDTH / 2, 310);

  ctx.font = "24px Arial";
  ctx.fillText("Scoring:", WIDTH / 2, 400);
  ctx.font = "20px Arial";
  ctx.fillText("1 point per pair + (seconds under 30) × round number", WIDTH / 2, 430);
  ctx.fillText("Each round: 30 seconds maximum", WIDTH / 2, 460);

  // Show different buttons based on state
  if (memoryGame.showClassicStartButton) {
    // Show START button
    let startButton = new Button("START", WIDTH / 2, HEIGHT - 100, 200, 60);
    startButton.draw();
  } else {
    // Show GOT IT button
    memoryClassicRulesButtons.forEach(b => b.draw());
  }

  // Copyright
  ctx.font = "16px Arial";
  ctx.fillStyle = "#666";
  ctx.textAlign = "right";
  ctx.fillText("© 2025 Nhom1984", WIDTH - 20, HEIGHT - 15);
}

// --- MEMOMU MEMORY RULES DRAWING FUNCTION ---
function drawMemomuMemoryRules() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Light pink background
  ctx.fillStyle = "#ffb6c1";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Rules table
  ctx.fillStyle = "#ff69b4";
  ctx.font = "36px Arial";
  ctx.textAlign = "center";
  ctx.fillText("MEMOMU Memory Rules", WIDTH / 2, 90);

  ctx.fillStyle = "#333";
  ctx.font = "22px Arial";
  ctx.fillText("Find all images that appears on the grid", WIDTH / 2, 140);

  ctx.font = "18px Arial";
  ctx.textAlign = "left";
  let startX = 80;
  let startY = 180;
  let lineHeight = 28;

  const rules = [
    "• Game has 20 rounds with progressive difficulty",
    "• Rounds 1-10: 6×5 grid (30 tiles)",
    "• Rounds 11-20: 7×7 grid (49 tiles) with expanded image pool",
    "• Every round progressive number of images will appear on the screen",
    "• You have to find them all to progress to the next round",
    "• Each round you have number of images shown + one, clicks",
    "• Order doesnt matter",
    "",
    "Scoring:",
    "  - Perfect round (all found, no extra clicks): Round number + time bonus",
    "  - Non-perfect (all found, but extra clicks): Advance, no bonus",
    "",
    "Game ends if time runs out or you fail to find all images within allowed clicks"
  ];

  for (let i = 0; i < rules.length; i++) {
    ctx.fillText(rules[i], startX, startY + i * lineHeight);
  }

  memoryMemomuRulesButtons.forEach(b => b.draw());

  ctx.font = "16px Arial";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "right";
  ctx.fillText("© 2025 Nhom1984", WIDTH - 35, HEIGHT - 22);
}

function drawMemoryGameClassic() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Update timer only if game has started
  if (!memoryGame.lock && memoryGame.gameStarted) {
    let elapsed = (performance.now() - memoryGame.roundStartTime) / 1000;
    memoryGame.timeRemaining = Math.max(0, 30 - elapsed);

    // Check if time's up - failure case: no round advancement, game ends
    if (memoryGame.timeRemaining <= 0 && memoryGame.pairsFound < memoryGame.roundPairCount) {
      endClassicRound(false); // false = failure, no time bonus, game ends
    }
  }

  // Round and score display at top left (like Music Memory)
  ctx.fillStyle = "#ff69b4";
  ctx.font = "24px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Round: ${memoryGame.currentRound}/${memoryGame.maxRounds}`, 20, 40);
  ctx.fillText(`Score: ${memoryGame.score}`, 20, 70);

  // Show current best score
  let bestScore = getTopScore("memoryClassic");
  if (bestScore > 0) {
    ctx.fillStyle = memoryGame.score > bestScore ? "#ffd700" : "#ff69b4"; // Gold if beating, pink otherwise
    ctx.fillText(`Best: ${Math.max(bestScore, memoryGame.score)}`, 20, 130);
  }

  // Timer with color coding (red when < 5 seconds) - only show if game started
  if (memoryGame.gameStarted) {
    ctx.fillStyle = memoryGame.timeRemaining < 5 ? "#ff0000" : "#ff69b4";
    ctx.fillText(`Time: ${Math.ceil(memoryGame.timeRemaining)}s`, 20, 100);
  }

  // Reset color for title
  ctx.fillStyle = "#836EF9";
  ctx.font = "36px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Classic Memory", WIDTH / 2, 50);

  // Pairs progress
  ctx.font = "20px Arial";
  ctx.fillStyle = "#fff";
  ctx.fillText(`Pairs: ${memoryGame.pairsFound} / ${memoryGame.roundPairCount}`, WIDTH / 2, 120);

  // Draw tiles
  memoryGame.grid.forEach((tile, i) => {
    ctx.save();
    let isRevealed = memoryGame.revealed[i] || memoryGame.matched[i];

    // Get the correct image
    let pairId = memoryGame.pairIds[i];
    let imgName = pairId === 'monad' ? 'classicmonad' : `classicimg${pairId}`;
    let img = assets.images[imgName];

    if (isRevealed && img) {
      // Show the image directly (no question marks in upgraded mode)
      ctx.drawImage(img, tile.x, tile.y, tile.size, tile.size);
    } else {
      // Show blank tile (no question marks)
      ctx.fillStyle = "#333";
      ctx.fillRect(tile.x, tile.y, tile.size, tile.size);
    }

    // Tile borders
    if (memoryGame.matched[i]) {
      ctx.strokeStyle = "#00f2ff";
      ctx.lineWidth = 4;
    } else if (isRevealed) {
      ctx.strokeStyle = "#ff69b4";
      ctx.lineWidth = 3;
    } else {
      ctx.strokeStyle = "#262626";
      ctx.lineWidth = 2;
    }
    ctx.strokeRect(tile.x, tile.y, tile.size, tile.size);
    ctx.restore();
  });

  // Buttons (only MENU)
  memoryClassicButtons.forEach(b => b.draw());

  // Feedback
  ctx.font = "24px Arial";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText(memoryGame.feedback, WIDTH / 2, HEIGHT - 120);

  // Show START button if game hasn't started yet
  if (memoryGame.showClassicStartButton && !memoryGame.gameStarted) {
    let startButton = new Button("START", WIDTH / 2, HEIGHT - 160, 200, 60);
    startButton.draw();
  }

  // REMOVED: Round splash screen logic - no more splash screens

  // Copyright
  ctx.font = "16px Arial";
  ctx.fillStyle = "#666";
  ctx.textAlign = "right";
  ctx.fillText("© 2025 Nhom1984", WIDTH - 20, HEIGHT - 15);

  // Draw game over overlay if active
  drawGameOverOverlay();
}
// Draw score table for Memomu game
function drawMemoryGameMemomu() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Title
  ctx.fillStyle = "#836EF9";
  ctx.font = "40px Arial";
  ctx.textAlign = "center";
  ctx.fillText("MEMOMU Memory", WIDTH / 2, 90);

  // Show GO button if needed
  if (memomuGame.showGo) {
    ctx.font = "32px Arial";
    ctx.fillStyle = "#333";
    ctx.fillText("Click GO to start the game!", WIDTH / 2, HEIGHT / 2);
    memoryMemomuButtons.forEach(b => b.draw());
    return;
  }

  // Game UI - Top left area for round, score, timer
  ctx.font = "20px Arial";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.fillText("Round: " + memomuGame.round + " / " + memomuGame.maxRounds, 20, 50);
  ctx.fillText("Score: " + memomuGame.score, 20, 75);

  // Show current best score
  let bestScore = getTopScore("memoryMemomu");
  if (bestScore > 0) {
    ctx.fillStyle = memomuGame.score > bestScore ? "#ffd700" : "#ffb6c1"; // Gold if beating, pink otherwise
    ctx.fillText("Best: " + Math.max(bestScore, memomuGame.score), 20, 100);
  }

  // Timer
  if (memomuGame.phase === "guess") {
    memomuGame.timer = (performance.now() / 1000) - memomuGame.timeStarted;
    let timeLeft = Math.max(0, memomuGame.timeLimit - memomuGame.timer);

    // Check if time is up
    if (timeLeft <= 0 && memomuGame.phase === "guess") {
      // Time's up - end the round as failed
      memomuGame.phase = "done";
      let pts = memomuGame.found.length;
      memomuGame.score += pts;
      memomuGame.roundScores.push({
        round: memomuGame.round,
        score: pts,
        perfect: false,
        completed: false
      });
      memomuGame.feedback = `Time's up! Found ${memomuGame.found.length}/${memomuGame.flashSeq.length}. Game Over!`;

      setTimeout(() => {
        memomuGame.gameCompleted = true;
        memomuGame.showScoreTable = true;
        endMemoryMemomuGame();
      }, 2000);
    }

    ctx.fillStyle = timeLeft <= 3 ? "#ff0000" : "#fff";
    ctx.fillText("Time: " + Math.ceil(timeLeft) + "s", 20, 100);
  }

  // Grid
  memomuGame.grid.forEach((tile, i) => {
    ctx.save();
    let imageId = memomuGame.gridImages[i];
    let img;

    // Handle both regular images and avatar images
    if (typeof imageId === 'string' && imageId.startsWith('avatar')) {
      img = assets.images[`classic${imageId}`]; // e.g., classicavatarA
    } else {
      img = assets.images["classicimg" + imageId]; // e.g., classicimg1
    }

    if (tile.revealed && img) {
      ctx.drawImage(img, tile.x, tile.y, tile.size, tile.size);
    } else {
      ctx.fillStyle = "#333";
      ctx.fillRect(tile.x, tile.y, tile.size, tile.size);
    }
    ctx.strokeStyle = tile.feedback ? tile.feedback : "#262626";
    ctx.lineWidth = tile.feedback ? 5 : 2;
    ctx.strokeRect(tile.x, tile.y, tile.size, tile.size);
    ctx.restore();
  });

  // Phase indicator and feedback
  ctx.font = "22px Arial";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  if (memomuGame.phase === "show") {
  } else if (memomuGame.phase === "guess") {
    ctx.fillText(`Find ${memomuGame.flashSeq.length} images! (${memomuGame.clicksUsed}/${memomuGame.allowedClicks} clicks)`, WIDTH / 2, HEIGHT - 80);
  }

  // Show score table when game is completed
  if (memomuGame.gameCompleted) {
    // Draw score table area instead of regular feedback
    ctx.font = "24px Arial";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText("Final Score: " + memomuGame.score, WIDTH / 2, HEIGHT - 150);

    // Show final feedback message above score
    ctx.font = "18px Arial";
    ctx.fillStyle = "#ffb6c1";
    ctx.fillText(memomuGame.feedback, WIDTH / 2, HEIGHT - 180);
  } else {
    // Feedback (only during gameplay)
    ctx.font = "20px Arial";
    ctx.fillStyle = "#ffb6c1";
    ctx.fillText(memomuGame.feedback, WIDTH / 2, HEIGHT - 80);
  }

  // MENU button always at bottom (only show if not in post-score state or name input)
  if (gameState !== "memory_memomu_post_score" && !nameInput.active) {
    memoryMemomuButtons[1].draw();
  }

  // REMOVED: Splash screen logic - no more splash screens

  // Copyright
  ctx.font = "16px Arial";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "right";
  ctx.fillText("© 2025 Nhom1984", WIDTH - 35, HEIGHT - 22);

  // NOTE: Removed drawGameOverOverlay() call for MEMOMU mode - using custom score table instead
}
function drawMonluckGame() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#836EF9";
  ctx.font = "40px Arial";
  ctx.textAlign = "center";
  ctx.fillText("MONLUCK", WIDTH / 2, 90);

  // Don't show score counter during gameplay - only in game over overlay

  monluckGame.grid.forEach((tile, i) => {
    ctx.save();
    let imgName = monluckGame.gridImages[i];
    let img = assets.images[imgName];

    // Calculate row and column for MON LUCK text display
    const cols = 6;
    const row = Math.floor(i / cols);
    const col = i % cols;

    // Display "MON LUCK" text on specific tiles
    let displayText = "";
    if (row === 1) { // Row 2 (0-indexed)
      if (col === 1) displayText = "M"; // 2nd tile
      else if (col === 2) displayText = "O"; // 3rd tile
      else if (col === 3) displayText = "N"; // 4th tile
    } else if (row === 2) { // Row 3 (0-indexed)
      if (col === 2) displayText = "L"; // 3rd tile
      else if (col === 3) displayText = "U"; // 4th tile
      else if (col === 4) displayText = "C"; // 5th tile
      else if (col === 5) displayText = "K"; // 6th tile
    }

    // Only show the image if the tile has been revealed (clicked)
    if (tile.revealed && img) {
      ctx.drawImage(img, tile.x, tile.y, tile.size, tile.size);
    } else if (!tile.revealed) {
      // Show blank tile when not revealed
      ctx.fillStyle = "#333";
      ctx.fillRect(tile.x, tile.y, tile.size, tile.size);
    }

    // Apply highlight if tile was clicked
    if (tile.revealed) {
      if (monluckGame.monadIndices.includes(i)) {
        ctx.strokeStyle = "#00ff00"; // Green highlight for monad
        ctx.lineWidth = 5;
      } else {
        ctx.strokeStyle = "#ff0000"; // Red highlight for non-monad
        ctx.lineWidth = 5;
      }
    } else {
      ctx.strokeStyle = "#262626";
      ctx.lineWidth = 2;
    }

    // Draw MON LUCK text over the tile if this tile should display it AND the tile hasn't been revealed
    if (displayText && !tile.revealed) {
      // Fill entire tile background for letters
      ctx.fillStyle = "#333";
      ctx.fillRect(tile.x, tile.y, tile.size, tile.size);

      // Make letters large and fill the tile using color #836EF9
      ctx.font = "48px Arial";
      ctx.fillStyle = "#836EF9";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Draw stroke for better visibility
      ctx.strokeText(displayText, tile.x + tile.size / 2, tile.y + tile.size / 2);
      // Draw filled text
      ctx.fillText(displayText, tile.x + tile.size / 2, tile.y + tile.size / 2);
    }

    ctx.strokeRect(tile.x, tile.y, tile.size, tile.size);
    ctx.restore();
  });

  // Show progress during gameplay
  if (!monluckGame.finished) { // CHANGED: Removed showSplash condition
    ctx.font = "24px Arial";
    ctx.fillStyle = "#836EF9";
    ctx.textAlign = "center";
    ctx.fillText(`Found: ${monluckGame.found.length}/5 monads | Tries: ${monluckGame.clicks}/5`, WIDTH / 2, HEIGHT - 80);
  }

  // Only show QUIT button during gameplay, positioned centrally at bottom
  if (!monluckGame.finished) { // CHANGED: Removed showSplash condition
    let quitButton = new Button("QUIT", WIDTH / 2, HEIGHT - 48, 160, 48);
    quitButton.draw();
  }

  // Show AGAIN and MENU buttons only when finished (on score table)
  if (monluckGame.finished) { // CHANGED: Removed showSplash condition
    let againButton = new Button("AGAIN", WIDTH / 2 - 100, HEIGHT - 60, 160, 48);
    let menuButton = new Button("MENU", WIDTH / 2 + 100, HEIGHT - 60, 160, 48);
    againButton.draw();
    menuButton.draw();
  }

  // Only show score in the result text when game is finished
  if (monluckGame.finished) {
    ctx.font = "28px Arial";
    ctx.fillStyle = "#fff";
    ctx.fillText(monluckGame.result, WIDTH / 2, HEIGHT - 120);
  }

  // REMOVED: Splash screen logic - no more splash screens

  ctx.font = "16px Arial";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "right";
  ctx.fillText("© 2025 Nhom1984", WIDTH - 35, HEIGHT - 22);

  // Draw game over overlay if active
  drawGameOverOverlay();
}
function drawBattleGame() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  if (battleGame.state === "rules") {
    ctx.fillStyle = "#222";
    ctx.fillRect(WIDTH / 2 - 340, HEIGHT / 2 - 220, 680, 380);
    ctx.fillStyle = "#ffb6c1";
    ctx.strokeStyle = "#ff69b4";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(WIDTH / 2 - 340, HEIGHT / 2 - 220, 680, 380, 24);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.font = "38px Arial";
    ctx.fillStyle = "#836EF9";
    ctx.fillText("BATTLE MODE RULES:", WIDTH / 2, HEIGHT / 2 - 180);
    ctx.font = "24px Arial";
    ctx.fillStyle = "#222";
    const rules = [
      "- Each round both players see their avatars flash on grids",
      "- Find them all before another player - click right tiles",
      "- One mistake ends your round!",
      "",
      "Scoring:",
      "- Each avatar found you get +1pt",
      "- If you find all avatars and are faster you get +1pt bonus.",
      "- Win round (more avatars found, or all + speed): +1pt bonus",
      "- Total score after 5 rounds wins!",
    ];
    for (let i = 0; i < rules.length; i++) {
      ctx.fillText(rules[i], WIDTH / 2, HEIGHT / 2 - 130 + i * 35);
    }
    battleButtons[0].draw();
  } else if (battleGame.state === "choose") {
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.font = "42px Arial";
    ctx.fillStyle = "#836EF9";
    ctx.textAlign = "center";
    ctx.fillText("Choose your fighter!", WIDTH / 2, 60);
    let img_w = 100, img_h = 100, col1_x = WIDTH / 2 - 300, col2_x = WIDTH / 2 + 20, y_start = 80, y_gap = 34 + img_h / 2;
    battleGame.chooseRects = [];
    // First column: avatar1 to avatar7, battleNames[0] to [6]
    for (let i = 0; i < 7; i++) {
      let img = assets.images[`avatar${i + 1}`];
      let rect = { x: col1_x, y: y_start + i * y_gap, w: img_w, h: img_h };
      if (img) ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = "#222"; ctx.lineWidth = 2;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.font = "24px Arial"; ctx.fillStyle = "#ff69b4";
      ctx.fillText(battleNames[i], col1_x + img_w + 60, rect.y + img_h / 2 + 8);
      battleGame.chooseRects.push({ ...rect, idx: i });
    }

    // Second column: avatar8 to avatar14, battleNames[7] to [13]
    for (let i = 0; i < 7; i++) {
      let img = assets.images[`avatar${i + 8}`]; // avatar8 to avatar14
      let rect = { x: col2_x, y: y_start + i * y_gap, w: img_w, h: img_h };
      if (img) ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = "#222"; ctx.lineWidth = 2;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.font = "24px Arial"; ctx.fillStyle = "#ff69b4";
      ctx.fillText(battleNames[i + 7], col2_x + img_w + 60, rect.y + img_h / 2 + 8);
      battleGame.chooseRects.push({ ...rect, idx: i + 7 });
    }
  } else if (battleGame.state === "vs" || battleGame.state === "fight") {
    drawBattleGrids();
  } else if (battleGame.state === "end") {
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Avatars are 300% bigger (130px -> 390px) 
    let img_sz = 390;
    let avatar_y = 30; //
    let pimg = assets.images[`avatar${battleGame.player + 1}`];
    let oimg = assets.images[`avatar${battleGame.opponent + 1}`];
    if (pimg) ctx.drawImage(pimg, -20, avatar_y, img_sz, img_sz);
    if (oimg) ctx.drawImage(oimg, WIDTH - -20 - img_sz, avatar_y, img_sz, img_sz);

    // Draw avatar names under their images - same size and position under avatars
    ctx.font = "28px Arial";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    if (battleGame.player !== null) {
      ctx.fillText(battleNames[battleGame.player], -40 + img_sz / 2, avatar_y + img_sz + 30);
    }
    if (battleGame.opponent !== null) {
      ctx.fillText(battleNames[battleGame.opponent], WIDTH - 0 - img_sz + img_sz / 2, avatar_y + img_sz + 30);
    }

    // 'vs' text moved 2cm lower (~76px)
    ctx.font = "52px Arial";
    ctx.fillStyle = "#ff69b4";
    ctx.fillText("VS", WIDTH / 2, 120 + 76);

    // Score numbers moved 2cm lower (~76px) 
    ctx.font = "52px Arial";
    ctx.fillText(`${battleGame.pscore} : ${battleGame.oscore}`, WIDTH / 2, 200 + 76);

    let msg = battleGame.pscore > battleGame.oscore ? "YOU WIN!" : battleGame.pscore < battleGame.oscore ? "YOU LOSE!" : "DRAW!";
    let color = battleGame.pscore > battleGame.oscore ? "#00ff00" : battleGame.pscore < battleGame.oscore ? "#ff0000" : "#ffb6c1";
    ctx.font = "52px Arial"; ctx.fillStyle = color;
    ctx.fillText(msg, WIDTH / 2, 300 + 76);

    // Back button moved 5cm lower (~190px)
    let backButton = new Button("BACK", WIDTH / 2, 400 + 190, 170, 60);
    backButton.draw();
  }
  ctx.font = "16px Arial";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "right";
  ctx.fillText("© 2025 Nhom1984", WIDTH - 35, HEIGHT - 22);

  // Draw game over overlay if active
  drawGameOverOverlay();
}
function drawBattleGrids() {
  ctx.fillStyle = "#222";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  let img_sz = 100, grid_img_sz = 58;
  let pimg = assets.images[`avatar${battleGame.player + 1}`], oimg = assets.images[`avatar${battleGame.opponent + 1}`];
  if (pimg) ctx.drawImage(pimg, 100, 60, img_sz, img_sz);
  if (oimg) ctx.drawImage(oimg, WIDTH - 200, 60, img_sz, img_sz);
  ctx.font = "36px Arial"; ctx.fillStyle = "#ffb6c1";
  ctx.fillText("VS", WIDTH / 2, 120);
  ctx.font = "24px Arial"; ctx.fillStyle = "#ffb6c1";
  ctx.fillText(battleNames[battleGame.player], 100 + img_sz / 2 - 30, 180);
  ctx.fillText(battleNames[battleGame.opponent], WIDTH - 200 + img_sz / 2 - 30, 180);
  ctx.font = "40px Arial";
  ctx.fillText(battleGame.pscore, WIDTH / 2 - 70, 180);
  ctx.fillText(battleGame.oscore, WIDTH / 2 + 70, 180);

  let gx = 40, gy = 260, cell_sz = 67;
  for (let i = 0; i < 16; i++) {
    let x = gx + (i % 4) * cell_sz * 1.2;
    let y = gy + Math.floor(i / 4) * cell_sz * 1.2;
    ctx.save();
    ctx.fillStyle = "#ffb6c1";
    ctx.strokeStyle = "#222"; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, cell_sz, cell_sz, 8);
    ctx.fill();
    ctx.stroke();
    let v = battleGame.grid[i];
    // Show image when flashing OR when clicked
    if ((battleGame.flashing && v !== null) || battleGame.clicks.includes(i)) {
      let img = v;
      if (img) ctx.drawImage(img, x + 4, y + 4, grid_img_sz, grid_img_sz);
    }
    // Show colored border for clicked tiles
    if (battleGame.phase === "click" && battleGame.clicks.includes(i)) {
      // Green for correct tiles, red for incorrect tiles
      ctx.strokeStyle = battleGame.targets.includes(i) ? "#00ff00" : "#ff0000";
      ctx.lineWidth = 4;
      ctx.strokeRect(x + 2, y + 2, cell_sz - 4, cell_sz - 4);
    }
    ctx.restore();
  }
  let gx2 = WIDTH - 340, gy2 = 260;
  for (let i = 0; i < 16; i++) {
    let x = gx2 + (i % 4) * cell_sz * 1.2;
    let y = gy2 + Math.floor(i / 4) * cell_sz * 1.2;
    ctx.save();
    ctx.fillStyle = "#ffb6c1";
    ctx.strokeStyle = "#222"; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, cell_sz, cell_sz, 8);
    ctx.fill();
    ctx.stroke();
    let v = battleGame.gridAI[i];
    if (battleGame.flashing && v !== null) {
      let img = v;
      if (img) ctx.drawImage(img, x + 4, y + 4, grid_img_sz, grid_img_sz);
    }
    ctx.restore();
  }
  battleButtons[3].draw();
  if (battleGame.phase === "result") {
    ctx.font = "22px Arial";
    let color = battleGame.resultText.startsWith("YOU WIN") ? "#00ff00" :
      battleGame.resultText.startsWith("YOU LOSE") ? "#ff0000" : "#ffb6c1";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(battleGame.resultText, WIDTH / 2, 580); // Position between grids and QUIT button
  }
  if (battleGame.phase === "click") {
    let left = Math.max(0, 15 - (performance.now() / 1000 - battleGame.anim));
    ctx.font = "24px Arial"; ctx.fillStyle = "#ff69b4";
    ctx.textAlign = "center";
    ctx.fillText(`Time: ${Math.floor(left)}s`, WIDTH / 2, 580); // Position between grids and QUIT button
  }
  if (battleGame.phase === "countdown") {
    let c = Math.max(0, 3 - Math.floor(performance.now() / 1000 - battleGame.anim));
    if (c > 0) {
      ctx.font = "54px Arial"; ctx.fillStyle = "#ff69b4";
      ctx.fillText(`${c}`, WIDTH / 2, 580); // Position between grids and QUIT button
    }
  }
}

// --- CLICK HANDLING ---
canvas.addEventListener("click", function (e) {
  let rect = canvas.getBoundingClientRect();
  
  // Improved coordinate calculation for responsive display
  // Calculate the actual scaling ratio between canvas and its display size
  let scaleX = canvas.width / rect.width;
  let scaleY = canvas.height / rect.height;
  
  // Get the click position relative to the canvas element
  let clickX = e.clientX - rect.left;
  let clickY = e.clientY - rect.top;
  
  // Scale to match canvas coordinates, accounting for potential device pixel ratio
  let mx = Math.round(clickX * scaleX);
  let my = Math.round(clickY * scaleY);
  
  // Additional safety bounds checking
  mx = Math.max(0, Math.min(canvas.width - 1, mx));
  my = Math.max(0, Math.min(canvas.height - 1, my));

  // Check game over overlay first - blocks all other interactions
  if (handleGameOverOverlayClick(mx, my)) {
    return;
  }

  // Check name input overlay - blocks other interactions when active
  if (nameInput.active) {
    for (let button of nameInput.buttons) {
      if (button.isInside(mx, my)) {
        if (button.label === "ENTER") {
          submitNameInput();
        } else if (button.label === "CANCEL") {
          // Skip name input - submit as Anonymous
          submitNameInput();
        }
        return;
      }
    }
    return; // Block other clicks when name input is active
  }

  if (gameState === "menu") {
    if (menuButtons[0].isInside(mx, my)) { 
      // "Play on MONAD" button
      playMode = "monad";
      if (!walletConnection.isConnected) {
        alert("Please connect your wallet first to play on MONAD");
        connectWallet();
      } else {
        gameState = "mode";
        // Initialize blockchain when entering MONAD mode
        if (typeof initializeBlockchain !== 'undefined') {
          initializeBlockchain();
        }
      }
    }
    else if (menuButtons[1].isInside(mx, my)) { 
      // "Play FREE" button
      playMode = "free";
      gameState = "mode"; 
    }
    else if (menuButtons[2].isInside(mx, my)) { 
      gameState = "leaderboard"; 
      // Fetch online scores for current tab when leaderboard is opened
      fetchOnlineScores(leaderboard.currentTab);
    }
    else if (menuButtons[3].isInside(mx, my)) {
      // Connect Wallet button - always open modal for wallet management
      connectWallet();
    }
    else if (menuButtons[4].isInside(mx, my)) {
      soundOn = !soundOn;
      menuButtons[4].label = soundOn ? "SOUND ON" : "SOUND OFF";
      let music = assets.sounds["music"];
      if (soundOn && music) music.play();
      else if (music) music.pause();
    }
  } else if (gameState === "mode") {
    if (modeButtons[0].isInside(mx, my)) {
      // MUSIC MEMORY
      let music = assets.sounds["music"];
      if (music) {
        music.pause();
        music.currentTime = 0;
      }
      
      if (playMode === "monad") {
        showBuyInModal('musicMemory');
      } else {
        gameState = "musicmem_rules";
      }
    }
    else if (modeButtons[1].isInside(mx, my)) {
      // MEMORY
      let music = assets.sounds["music"];
      if (music) {
        music.pause();
        music.currentTime = 0;
      }
      gameState = "memory_menu";
    }
    else if (modeButtons[2].isInside(mx, my)) {
      // MONLUCK
      let music = assets.sounds["music"];
      if (music) {
        music.pause();
        music.currentTime = 0;
      }
      
      if (playMode === "monad") {
        showWagerModal();
      } else {
        gameState = "monluck"; 
        startMonluckGame();
      }
    }
    else if (modeButtons[3].isInside(mx, my)) {
      // BATTLE
      let music = assets.sounds["music"];
      if (music) {
        music.pause();
        music.currentTime = 0;
      }
      
      if (playMode === "monad") {
        // For battle mode, handle buy-in directly
        if (typeof handleBattleEntry !== 'undefined') {
          handleBattleEntry().then(success => {
            if (success) {
              gameState = "battle"; 
              resetBattleGame();
            }
          });
        } else {
          alert("Blockchain not ready. Please try again.");
        }
      } else {
        gameState = "battle"; 
        resetBattleGame();
      }
    }
    else if (modeButtons[4].isInside(mx, my)) {
      gameState = "monomnibus";
    }
    else if (modeButtons[5].isInside(mx, my)) {
      // Connect Wallet button - always open modal for wallet management
      connectWallet();
    }
    else if (modeButtons[6].isInside(mx, my)) {
      soundOn = !soundOn;
      modeButtons[6].label = soundOn ? "SOUND ON" : "SOUND OFF";
      let music = assets.sounds["music"];
      if (soundOn && music) music.play();
      else if (music) music.pause();
    }
    else if (modeButtons[7].isInside(mx, my)) { gameState = "menu"; }
  } else if (gameState === "musicmem_rules") {
    if (musicMemRulesButtons[0].isInside(mx, my)) {
      gameState = "musicmem";
      startMusicMemoryGame();
    }
    else if (musicMemRulesButtons[1].isInside(mx, my)) {
      gameState = "mode";
      // Restore background music when returning to mode menu
      let music = assets.sounds["music"];
      if (soundOn && music) {
        music.play();
      }
    }
  } else if (gameState === "musicmem") {
    if (musicMemButtons[0].isInside(mx, my)) {
      if (!musicMem.gameStarted) { // CHANGED: Removed showRoundSplash condition
        startMemoryPhase();
      }
    }
    else if (musicMemButtons[1].isInside(mx, my)) { 
      gameState = "mode";
      // Restore background music when returning to mode menu
      let music = assets.sounds["music"];
      if (soundOn && music) {
        music.play();
      }
    }

    // Handle tile clicks during guessing phase
    if (musicMem.phase === "guessing" && musicMem.allowInput) { // CHANGED: Removed showRoundSplash condition
      for (let tile of musicMem.grid) {
        if (
          mx >= tile.x &&
          mx <= tile.x + tile.size &&
          my >= tile.y &&
          my <= tile.y + tile.size
        ) {
          handleMusicMemTileClick(tile.idx);
          break;
        }
      }
    }
  } else if (gameState === "memory_menu") {
    if (memoryMenuButtons[0].isInside(mx, my)) { 
      // CLASSIC MEMORY
      if (playMode === "monad") {
        showBuyInModal('memoryClassic');
      } else {
        gameState = "memory_classic_rules"; 
        startMemoryGameClassic();
      }
    }
    else if (memoryMenuButtons[1].isInside(mx, my)) { 
      // MEMOMU MEMORY
      if (playMode === "monad") {
        showBuyInModal('memoryMemomu');
      } else {
        gameState = "memory_memomu_rules";
      }
    }
    else if (memoryMenuButtons[2].isInside(mx, my)) { 
      gameState = "mode";
      // Restore background music when returning to mode menu
      let music = assets.sounds["music"];
      if (soundOn && music) {
        music.play();
      }
    }
  } else if (gameState === "memory_classic_rules") {
    if (!memoryGame.showClassicStartButton && memoryClassicRulesButtons[0].isInside(mx, my)) {
      // "GOT IT" button clicked - transition to grid page with START button
      setupClassicRound(memoryGame.currentRound);
      gameState = "memory_classic";
      memoryGame.showClassicStartButton = true;
    } else if (memoryGame.showClassicStartButton) {
      // Check if START button was clicked (should not reach here as we transition to memory_classic)
      let startButton = new Button("START", WIDTH / 2, HEIGHT - 160, 200, 60);
      if (startButton.isInside(mx, my)) {
        startClassicRound();
      }
    }
  } else if (gameState === "memory_memomu_rules") {
    if (memoryMemomuRulesButtons[0].isInside(mx, my)) {
      gameState = "memory_memomu";
      memomuGame.showGo = true;
    }
  } else if (gameState === "memory_classic") {
    if (memoryClassicButtons[0].isInside(mx, my)) { 
      gameState = "menu";
      // Restore background music when returning to main menu
      let music = assets.sounds["music"];
      if (soundOn && music) {
        music.play();
      }
    }

    // Handle START button click if game hasn't started yet
    if (memoryGame.showClassicStartButton && !memoryGame.gameStarted) {
      let startButton = new Button("START", WIDTH / 2, HEIGHT - 160, 200, 60);
      if (startButton.isInside(mx, my)) {
        memoryGame.gameStarted = true;
        memoryGame.showClassicStartButton = false;
        memoryGame.roundStartTime = performance.now(); // Start the timer now
      }
    }

    // Only allow tile clicks if game has started
    if (!memoryGame.lock && memoryGame.timeRemaining > 0 && memoryGame.gameStarted) {
      for (let i = 0; i < memoryGame.grid.length; i++) {
        let tile = memoryGame.grid[i];
        if (
          mx >= tile.x &&
          mx <= tile.x + tile.size &&
          my >= tile.y &&
          my <= tile.y + tile.size
        ) {
          handleMemoryTileClickClassic(i);
          drawMemoryGameClassic();
          break;
        }
      }
    }
  } else if (gameState === "memory_memomu") {
    if (memoryMemomuButtons[1].isInside(mx, my)) { gameState = "memory_menu"; }
    else if (memoryMemomuButtons[0].isInside(mx, my) && memomuGame.showGo) {
      memomuGame.showGo = false;
      startMemoryGameMemomu();
      // Start the flash sequence immediately
      setTimeout(runMemoryMemomuFlashSequence, 900);
    }
    if (!memomuGame.showGo && memomuGame.phase === "guess" && memomuGame.clicksUsed < memomuGame.allowedClicks) { // CHANGED: Removed showSplash condition
      for (let i = 0; i < memomuGame.grid.length; i++) {
        let tile = memomuGame.grid[i];
        if (
          mx >= tile.x &&
          mx <= tile.x + tile.size &&
          my >= tile.y &&
          my <= tile.y + tile.size
        ) {
          handleMemoryTileClickMemomu(i);
          drawMemoryGameMemomu();
          break;
        }
      }
    }
  } else if (gameState === "monluck") {
    // Handle AGAIN and MENU buttons when game is finished
    if (monluckGame.finished) { // CHANGED: Removed showSplash condition
      let againButton = new Button("AGAIN", WIDTH / 2 - 100, HEIGHT - 60, 160, 48);
      let menuButton = new Button("MENU", WIDTH / 2 + 100, HEIGHT - 60, 160, 48);
      if (againButton.isInside(mx, my)) {
        startMonluckGame();
        drawMonluckGame();
      } else if (menuButton.isInside(mx, my)) {
        // Leaving MONLUCK mode - restore background music if sound is on
        let music = assets.sounds["music"];
        if (soundOn && music) {
          music.play();
        }
        gameState = "mode";
      }
    }

    // Handle QUIT button during gameplay
    if (!monluckGame.finished) { // CHANGED: Removed showSplash condition
      let quitButton = new Button("QUIT", WIDTH / 2, HEIGHT - 60, 160, 48);
      if (quitButton.isInside(mx, my)) {
        // Leaving MONLUCK mode - restore background music if sound is on
        let music = assets.sounds["music"];
        if (soundOn && music) {
          music.play();
        }
        gameState = "mode";
      }
    }

    // Handle tile clicks for gameplay
    if (!monluckGame.finished) { // CHANGED: Removed showSplash condition
      for (let i = 0; i < monluckGame.grid.length; i++) {
        let tile = monluckGame.grid[i];
        if (
          mx >= tile.x &&
          mx <= tile.x + tile.size &&
          my >= tile.y &&
          my <= tile.y + tile.size
        ) {
          handleMonluckTileClick(i);
          drawMonluckGame();
          break;
        }
      }
    }
  } else if (gameState === "battle") {
    handleBattleClick(mx, my);
  } else if (gameState === "leaderboard") {
    // Handle tab clicks
    const tabWidth = 150;
    const tabHeight = 50;
    const tabY = 120;
    const totalTabsWidth = leaderboard.tabs.length * tabWidth;
    const startX = WIDTH / 2 - totalTabsWidth / 2;

    for (let i = 0; i < leaderboard.tabs.length; i++) {
      const x = startX + i * tabWidth;
      if (mx >= x && mx <= x + tabWidth && my >= tabY && my <= tabY + tabHeight) {
        const newTab = leaderboard.tabs[i].key;
        if (newTab !== leaderboard.currentTab) {
          leaderboard.currentTab = newTab;
          // Fetch online scores for the new tab
          fetchOnlineScores(newTab);
        }
        break;
      }
    }

    // Handle back button
    if (leaderboardButtons[0].isInside(mx, my)) {
      gameState = "menu";
      // Restore background music when returning to main menu
      let music = assets.sounds["music"];
      if (soundOn && music) {
        music.play();
      }
    }
    
    // Handle withdraw button (if available in MONAD mode)
    if (leaderboardButtons.length > 1 && leaderboardButtons[1].isInside(mx, my)) {
      if (typeof withdrawWinnings !== 'undefined') {
        withdrawWinnings();
      } else {
        alert("Blockchain withdrawal not available");
      }
    }
  } else if (gameState === "musicmem_post_score") {
    // Handle MENU and PLAY AGAIN buttons in post-score state
    let menuButton = new Button("MENU", WIDTH / 2 - 120, HEIGHT / 2 + 80, 200, 50);
    let playAgainButton = new Button("PLAY AGAIN", WIDTH / 2 + 120, HEIGHT / 2 + 80, 200, 50);

    if (menuButton.isInside(mx, my)) {
      gameState = "mode";  // Go to mode menu instead of main menu
      // Restore background music when returning to mode menu
      let music = assets.sounds["music"];
      if (soundOn && music) {
        music.play();
      }
    } else if (playAgainButton.isInside(mx, my)) {
      // Start new Music Memory game immediately
      gameState = "musicmem";
      startMusicMemoryGame(false); // No splash for PLAY AGAIN
      startMemoryPhase(); // Start immediately like pressing START
      drawMusicMemory(); // Redraw the new board
    }
  } else if (gameState === "memory_memomu_post_score") {
    // Handle MENU and PLAY AGAIN buttons in post-score state
    let menuButton = new Button("MENU", WIDTH / 2 - 120, HEIGHT / 2 + 80, 200, 50);
    let playAgainButton = new Button("PLAY AGAIN", WIDTH / 2 + 120, HEIGHT / 2 + 80, 200, 50);

    if (menuButton.isInside(mx, my)) {
      gameState = "mode";  // Go to mode menu instead of main menu
      // Restore background music when returning to mode menu
      let music = assets.sounds["music"];
      if (soundOn && music) {
        music.play();
      }
    } else if (playAgainButton.isInside(mx, my)) {
      // Start new MEMOMU game immediately
      gameState = "memory_memomu";
      memomuGame.showGo = false;
      startMemoryGameMemomu(false); // No splash for PLAY AGAIN
      // Start immediately like pressing GO - trigger the flash sequence after a short delay
      setTimeout(runMemoryMemomuFlashSequence, 900);
      drawMemoryGameMemomu(); // Redraw the new board
    }
  } else if (gameState === "monomnibus") {
    // Handle back button in Monomnibus mode
    let backButton = new Button("BACK", WIDTH / 2, HEIGHT / 2 + 100, 200, 60);
    if (backButton.isInside(mx, my)) {
      gameState = "mode";
      // Restore background music when returning to mode menu
      let music = assets.sounds["music"];
      if (soundOn && music) {
        music.play();
      }
    }
  }
});

// --- KEYBOARD EVENT HANDLER ---
document.addEventListener("keydown", function (e) {
  if (nameInput.active) {
    if (e.key === "Enter") {
      submitNameInput();
    } else if (e.key === "Escape") {
      // Skip name input - submit as Anonymous
      submitNameInput();
    } else if (e.key === "Backspace") {
      nameInput.currentName = nameInput.currentName.slice(0, -1);
    } else if (e.key.length === 1 && nameInput.currentName.length < nameInput.maxLength) {
      // Add character if it's printable and under max length
      if (e.key.match(/[a-zA-Z0-9 ]/)) {
        nameInput.currentName += e.key;
      }
    }
    e.preventDefault();
  }
});

// --- MEMORY CLASSIC CLICK LOGIC ---
function handleMemoryTileClickClassic(idx) {
  if (!memoryGame.roundActive || memoryGame.lock || memoryGame.revealed[idx] || memoryGame.matched[idx]) return;
  if (memoryGame.timeRemaining <= 0) return; // Time's up

  memoryGame.revealed[idx] = true;
  if (memoryGame.firstIdx === null) {
    memoryGame.firstIdx = idx;
    // No sound for first tile selection to allow rapid clicks
  } else if (memoryGame.secondIdx === null && idx !== memoryGame.firstIdx) {
    memoryGame.secondIdx = idx;
    memoryGame.attempts++;
    
    // Instantly process the match check for fast gameplay
    let a = memoryGame.pairIds[memoryGame.firstIdx];
    let b = memoryGame.pairIds[memoryGame.secondIdx];

    if (a === b) {
      // Match found! - instant feedback
      memoryGame.matched[memoryGame.firstIdx] = true;
      memoryGame.matched[memoryGame.secondIdx] = true;
      memoryGame.pairsFound++;
      memoryGame.feedback = "Match!";
      
      // Only play tick.mp3 for found pairs as requested
      let sfx = assets.sounds["tick"];
      if (sfx) { try { sfx.currentTime = 0; sfx.play(); } catch (e) { } }

      // Check if round is complete - success case: all pairs found
      if (memoryGame.pairsFound >= memoryGame.roundPairCount) {
        endClassicRound(true); // true = success, time bonus awarded, advance round
      }
    } else {
      // No match - hide both cards briefly, then reset them with minimal delay
      
      // Show both cards briefly, then hide them with minimal delay
      setTimeout(() => {
        memoryGame.revealed[memoryGame.firstIdx] = false;
        memoryGame.revealed[memoryGame.secondIdx] = false;
        
        // Reset for next pair immediately for rapid play
        memoryGame.firstIdx = null;
        memoryGame.secondIdx = null;
        memoryGame.lock = false;
        
        // Redraw to show hidden cards
        drawMemoryGameClassic();
      }, 250); // Changed from 200ms to 250ms for proper mismatch reveal timing
      
      // Lock briefly to prevent rapid clicking during card flip
      memoryGame.lock = true;
      
      // Redraw immediately to show both revealed cards and instant feedback
      drawMemoryGameClassic();
      return; // Exit early to avoid immediate reset below
    }

    // Reset for next pair immediately (only for matches)
    memoryGame.firstIdx = null;
    memoryGame.secondIdx = null;
    memoryGame.lock = false;
    
    // Redraw immediately to show instant splash messages
    drawMemoryGameClassic();
  }
}

// --- MEMOMU MEMORY CLICK LOGIC ---
function handleMemoryTileClickMemomu(idx) {
  let tile = memomuGame.grid[idx];
  if (tile.revealed) return;

  memomuGame.clicksUsed++;
  tile.revealed = true;

  if (memomuGame.flashSeq.includes(idx) && !memomuGame.found.includes(idx)) {
    // Correct image found
    memomuGame.found.push(idx);
    let sfx = assets.sounds["yupi"];
    if (sfx) { try { sfx.currentTime = 0; sfx.play(); } catch (e) { } }
    tile.feedback = "#00ff00";
  } else {
    // Wrong image clicked
    memomuGame.wrongClicks++;
    let sfx = assets.sounds["kuku"];
    if (sfx) { try { sfx.currentTime = 0; sfx.play(); } catch (e) { } }
    tile.feedback = "#ff0000";
  }

  // Check if round is complete
  let allFound = memomuGame.found.length === memomuGame.flashSeq.length;
  let isPerfect = allFound && memomuGame.clicksUsed === memomuGame.flashSeq.length;
  let maxClicksReached = memomuGame.clicksUsed >= memomuGame.allowedClicks;
  let wrongClickLimit = memomuGame.round > 10 ? 3 : 2; // One more bad click for rounds 11-20
  let tooManyWrongClicks = memomuGame.wrongClicks >= wrongClickLimit;
  let isComplete = allFound || maxClicksReached || tooManyWrongClicks;

  if (isComplete) {
    memomuGame.phase = "done";

    let pts = 0;
    if (allFound) {
      if (isPerfect) {
        // Perfect round: round number + time bonus
        let timeLeft = Math.max(0, memomuGame.timeLimit - memomuGame.timer);
        let timeBonus = Math.floor(timeLeft);
        pts = memomuGame.round + timeBonus;
        memomuGame.feedback = `Perfect! Round ${memomuGame.round} + ${timeBonus} time bonus = ${pts} pts`;
      } else {
        // Non-perfect round: just advance, no points
        pts = 0;
        memomuGame.feedback = `Complete! Extra clicks used, no bonus. Advancing...`;
      }
    } else {
      // Failed round: 1 point per image found, game ends
      pts = memomuGame.found.length;
      if (tooManyWrongClicks) {
        memomuGame.feedback = `Too many wrong clicks! Found ${memomuGame.found.length}/${memomuGame.flashSeq.length}. Game Over!`;
      } else {
        memomuGame.feedback = `Failed! Found ${memomuGame.found.length}/${memomuGame.flashSeq.length}. Game Over!`;
      }
    }

    memomuGame.score += pts;
    memomuGame.roundScores.push({
      round: memomuGame.round,
      score: pts,
      perfect: isPerfect,
      completed: allFound
    });

    setTimeout(() => {
      if (!allFound) {
        // Game over - failed round
        memomuGame.gameCompleted = true;
        memomuGame.showScoreTable = true;
        endMemoryMemomuGame();
      } else if (memomuGame.round >= memomuGame.maxRounds) {
        // Game completed - all rounds done
        memomuGame.gameCompleted = true;
        memomuGame.showScoreTable = true;
        endMemoryMemomuGame();
      } else {
        // Next round
        memomuGame.round++;
        // memomuGame.showSplash = true;               // REMOVED - no more splash screens
        // memomuGame.splashTimer = 35;                // REMOVED - no more splash screens
        // memomuGame.splashMsg = "Round " + memomuGame.round; // REMOVED - no more splash screens
        setupMemoryMemomuRound();
        // Start the new round immediately
        setTimeout(runMemoryMemomuFlashSequence, 900);
        drawMemoryGameMemomu();
      }
    }, 2000);
  }
}
function runMemoryMemomuFlashSequence() {
  let flashTiles = memomuGame.flashSeq.slice();

  // Reveal ALL flash tiles at once
  memomuGame.grid.forEach((t, j) => t.revealed = flashTiles.includes(j));
  drawMemoryGameMemomu();

  // Keep them revealed for the desired duration
  // For rounds 11-20, display 25% longer (1200ms -> 1500ms)
  let flashDuration = memomuGame.round > 10 ? 1500 : 1200;
  setTimeout(() => {
    // Hide all flashed images
    memomuGame.grid.forEach((t) => t.revealed = false);

    // Start guess phase
    memomuGame.phase = "guess";
    memomuGame.clicksUsed = 0;
    memomuGame.found = [];
    memomuGame.timer = 0;
    memomuGame.timeStarted = performance.now() / 1000;
    memomuGame.grid.forEach((t) => { t.feedback = null; });
    drawMemoryGameMemomu();
  }, flashDuration);
}

// --- MONLUCK CLICK LOGIC ---
function handleMonluckTileClick(idx) {
  let tile = monluckGame.grid[idx];
  if (tile.revealed || monluckGame.finished) return;

  tile.revealed = true;
  monluckGame.clicks++; // Increment click counter

  let isMonad = monluckGame.monadIndices.includes(idx);

  if (isMonad) {
    // Found a monad - success!
    monluckGame.found.push(idx);
    let sfx = assets.sounds["yupi"];
    // MONLUCK sound effects always play regardless of mute setting
    if (sfx) { try { sfx.currentTime = 0; sfx.play(); } catch (e) { } }
    tile.feedback = "#00ff00"; // Green highlight

    // Award 1 point for each monad found
    monluckGame.score = monluckGame.found.length;
    monluckGame.result = `Found ${monluckGame.found.length}/5 monads! (${monluckGame.clicks}/5 tries)`;
  } else {
    // Wrong tile - highlight red
    let sfx = assets.sounds["kuku"];
    // MONLUCK sound effects always play regardless of mute setting
    if (sfx) { try { sfx.currentTime = 0; sfx.play(); } catch (e) { } }
    tile.feedback = "#ff0000"; // Red highlight
    monluckGame.result = `Found ${monluckGame.found.length}/5 monads! (${monluckGame.clicks}/5 tries)`;
  }

  // Check if game should end (either all 5 monads found OR 5 tries used)
  if (monluckGame.found.length >= 5) {
    monluckGame.result = `YUPI! You found all ${monluckGame.found.length} monads in ${monluckGame.clicks} tries!`;
    monluckGame.finished = true;
    monluckGame.currentStreak++;
    monluckGame.bestSessionStreak = Math.max(monluckGame.bestSessionStreak, monluckGame.currentStreak);

    // Handle blockchain payout for MONAD mode
    if (playMode === "monad" && typeof handleMonluckWager !== 'undefined') {
      const wagerAmount = (monluckGame.wager / 100).toFixed(1); // Convert back to ETH
      handleMonluckWager(wagerAmount, 5);
    }

    // Track 5-monad achievement in leaderboard
    const playerName = walletConnection.isConnected ? getShortAddress(walletConnection.address) : "Anonymous";
    const walletAddress = walletConnection.isConnected ? walletConnection.address : null;
    updateMonluckLeaderboard(playerName, walletAddress, 5, monluckGame.bestSessionStreak);

    // REMOVED: Success splash screen - game ends immediately
  } else if (monluckGame.clicks >= 5) {
    // Game over - 5 tries used up
    monluckGame.result = `Game Over! Found ${monluckGame.found.length}/5 monads in 5 tries. Score: ${monluckGame.score}`;
    monluckGame.finished = true;
    
    // Handle blockchain payout for MONAD mode if 2+ monads found
    if (playMode === "monad" && monluckGame.found.length >= 2 && typeof handleMonluckWager !== 'undefined') {
      const wagerAmount = (monluckGame.wager / 100).toFixed(1); // Convert back to ETH
      handleMonluckWager(wagerAmount, monluckGame.found.length);
    }
    
    // Track 4-monad achievement in leaderboard if applicable
    if (monluckGame.found.length >= 4) {
      monluckGame.currentStreak++;
      monluckGame.bestSessionStreak = Math.max(monluckGame.bestSessionStreak, monluckGame.currentStreak);
      
      const playerName = walletConnection.isConnected ? getShortAddress(walletConnection.address) : "Anonymous";
      const walletAddress = walletConnection.isConnected ? walletConnection.address : null;
      updateMonluckLeaderboard(playerName, walletAddress, 4, monluckGame.bestSessionStreak);
    } else {
      // Reset streak for less than 4 monads
      monluckGame.currentStreak = 0;
    }

    // REMOVED: Game over splash screen - game ends immediately
  }
}

// --- BATTLE CLICK HANDLING ---
function handleBattleClick(mx, my) {
  console.log("BattleClick", battleGame.state, battleGame.phase);
  if (battleGame.state === "rules") {
    if (battleButtons[0].isInside(mx, my)) {
      battleGame.state = "choose";
    }
    return;
  }

  if (battleGame.state === "choose") {
    for (const rect of battleGame.chooseRects) {
      if (mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h) {
        battleGame.player = rect.idx;
        let pool = Array.from({ length: 14 }, (_, i) => i).filter(i => i !== rect.idx);
        battleGame.opponent = pool[Math.floor(Math.random() * pool.length)];
        battleGame.round = 0;
        battleGame.pscore = 0;
        battleGame.oscore = 0;
        battleGame.state = "vs";
        battleGame.phase = "countdown"; // <-- Start with countdown
        battleGame.anim = performance.now() / 1000; // <-- Set timer
        // DO NOT call prepareBattleRound() yet!
        return;
      }
    }
    return;
  }
  function handleBattleGridClick(mx, my) {
    let gx = 40, gy = 260, cell_sz = 67, spacing = cell_sz * 1.2;
    for (let i = 0; i < 16; i++) {
      let x = gx + (i % 4) * spacing;
      let y = gy + Math.floor(i / 4) * spacing;
      if (
        mx >= x && mx <= x + cell_sz &&
        my >= y && my <= y + cell_sz
      ) {
        // Only allow if not already clicked and only during the click phase
        if (!battleGame.clicks.includes(i) && battleGame.phase === "click") {
          battleGame.clicks.push(i);
          // Your additional game logic can go here (e.g., check win/loss, etc)
          drawBattleGame(); // Redraw to show the click
        }
        break;
      }
    }
  }

  if (battleGame.state === "vs") {
    if (battleGame.phase === "click") {
      handleBattleGridClick(mx, my);
    }
    if (battleButtons[3].isInside(mx, my)) {
      battleGame.pscore = 0;
      battleGame.oscore = 99;
      battleGame.state = "end";
      battleGame.phase = "end";
    }
    if (battleGame.phase === "result") {
      if (battleButtons[3].isInside(mx, my)) {
        battleGame.pscore = 0;
        battleGame.oscore = 99;
        battleGame.state = "end";
        battleGame.phase = "end";
      }
    }
    return;
  }

  if (battleGame.state === "end") {
    // Check if the moved BACK button was clicked
    let backButton = new Button("BACK", WIDTH / 2, 400 + 190, 170, 60);
    if (backButton.isInside(mx, my)) {
      resetBattleGame();
      gameState = "mode";
    }
    return;
  }
}
function nextMusicMemRound() {
  if (musicMem.currentRound < musicMem.maxRounds) {
    musicMem.currentRound++;
    // musicMem.showRoundSplash = true;              // REMOVED - no more splash screens
    // musicMem.splashTimer = 60;                    // REMOVED - no more splash screens
    // musicMem.splashMsg = "Round " + musicMem.currentRound; // REMOVED - no more splash screens
    musicMem.gameStarted = false;
    musicMem.phase = "memory";
    setupMusicMemRound();
  } else {
    // Game completed - show game over overlay with Play Again option
    endMusicMemoryGame();
  }
  drawMusicMemory();
}

// --- SPLASH TIMER --- (REMOVED - no more splash screens)
function tickSplash() {
  // REMOVED: All splash screen logic
  // This function is kept to avoid breaking references but does nothing now

  if (gameState === "battle") {
    if (battleGame.state === "vs") {
      if (battleGame.phase === "flash" && performance.now() / 1000 - battleGame.anim > 0.9) {
        battleGame.flashing = false;
        battleGame.anim = performance.now() / 1000;
        battleGame.phase = "click";
        battleGame.clicks = [];
        battleGame.aiClicks = [];
      }
      if (battleGame.phase === "click" && battleGame.playerTime == null) {
        if (!battleGame.aiResult) {
          battleGame.aiResult = aiPlay();
          battleGame.aiClicks = battleGame.aiResult[0];
          battleGame.aiTime = battleGame.aiResult[1];
        }
        const ai_time_val = battleGame.aiTime || 999;
        if (performance.now() / 1000 - battleGame.anim >= ai_time_val) {
          processBattleResult();
        }
      }
      if (battleGame.phase === "result" && performance.now() / 700 - battleGame.anim > 1.6) {
        nextBattleRoundOrEnd();
      }
      if (battleGame.phase === "countdown" && battleGame.round === 0 && performance.now() / 1000 - battleGame.anim > 3) {
        prepareBattleRound(); // sets up grid, targets, and sets phase to "flash"
        battleGame.flashing = true;
        battleGame.anim = performance.now() / 1000;
        battleGame.clicks = [];
        battleGame.aiClicks = [];
      }
    }
  }
}

// --- POST-SCORE DRAWING FUNCTIONS ---
function drawMusicMemoryPostScore() {
  // Draw the game board in its final state
  drawMusicMemory();

  // Draw overlay for post-score buttons
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Draw MENU and PLAY AGAIN buttons
  let menuButton = new Button("MENU", WIDTH / 2 - 120, HEIGHT / 2 + 80, 200, 50);
  let playAgainButton = new Button("PLAY AGAIN", WIDTH / 2 + 120, HEIGHT / 2 + 80, 200, 50);

  menuButton.draw();
  playAgainButton.draw();
}

function drawMemoryMemomuPostScore() {
  // Draw the game board in its final state
  drawMemoryGameMemomu();

  // Draw overlay for post-score buttons
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Draw MENU and PLAY AGAIN buttons
  let menuButton = new Button("MENU", WIDTH / 2 - 120, HEIGHT / 2 + 80, 200, 50);
  let playAgainButton = new Button("PLAY AGAIN", WIDTH / 2 + 120, HEIGHT / 2 + 80, 200, 50);

  menuButton.draw();
  playAgainButton.draw();
}

// --- MONOMNIBUS MODE ---
function drawMonomnibus() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  
  // Background
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  
  // Title
  ctx.font = "60px Arial";
  ctx.fillStyle = "#ffb6c1";
  ctx.textAlign = "center";
  ctx.fillText("MONOMNIBUS", WIDTH / 2, HEIGHT / 2 - 100);
  
  // In Works message
  ctx.font = "36px Arial";
  ctx.fillStyle = "#fff";
  ctx.fillText("in works", WIDTH / 2, HEIGHT / 2);
  
  // Back button
  let backButton = new Button("BACK", WIDTH / 2, HEIGHT / 2 + 100, 200, 60);
  backButton.draw();
  
  // Version number (bottom left corner)
  drawVersionNumber();
}

// --- VERSION NUMBER HELPER ---
function drawVersionNumber() {
  ctx.font = "16px Arial";
  ctx.fillStyle = "#888";
  ctx.textAlign = "left";
  ctx.fillText(GAME_VERSION, 20, HEIGHT - 20);
}

// --- MAIN DRAW LOOP ---
function draw() {
  if (gameState === "loading") {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.font = "45px Arial";
    ctx.fillStyle = "#ffb6c1";
    ctx.textAlign = "center";
    ctx.fillText("Loading MEMOMU...", WIDTH / 2, HEIGHT / 2);
  } else if (gameState === "menu") drawMenu();
  else if (gameState === "mode") drawModeMenu();
  else if (gameState === "musicmem_rules") drawMusicMemoryRules();
  else if (gameState === "musicmem") drawMusicMemory();
  else if (gameState === "musicmem_post_score") drawMusicMemoryPostScore();
  else if (gameState === "memory_menu") drawMemoryMenu();
  else if (gameState === "memory_classic_rules") drawMemoryClassicRules();
  else if (gameState === "memory_classic") drawMemoryGameClassic();
  else if (gameState === "memory_memomu_rules") drawMemomuMemoryRules();
  else if (gameState === "memory_memomu") drawMemoryGameMemomu();
  else if (gameState === "memory_memomu_post_score") drawMemoryMemomuPostScore();
  else if (gameState === "monluck") drawMonluckGame();
  else if (gameState === "battle") drawBattleGame();
  else if (gameState === "leaderboard") drawLeaderboard();
  else if (gameState === "monomnibus") drawMonomnibus();

  // Draw name input overlay on top of everything
  drawNameInput();
  
  // Update and draw user feedback
  updateUserFeedback();
  drawUserFeedback();
}
// --- GAME LOOP ---
function gameLoop() {
  draw();
  tickSplash();
  requestAnimationFrame(gameLoop);
}

// --- LOAD EVERYTHING & START ---
loadAssets().then(() => {
  console.log('Assets loaded, starting game...');
  gameState = "menu";
  setupButtons();
  resetBattleGame();
  loadHighScores(); // Load high scores from localStorage
  
  let music = assets.sounds["music"];
  if (music) { music.loop = true; music.volume = 0.55; if (soundOn) music.play(); }
}).catch(error => {
  console.warn('Asset loading failed, starting anyway:', error);
  gameState = "menu";
  setupButtons();
  resetBattleGame();
  loadHighScores();
});

gameLoop();
