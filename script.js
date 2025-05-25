// const originalClearInterval = window.clearInterval;
// window.clearInterval = function(idToClear) {
//   console.log(`[DEBUG_CLEAR_INTERVAL] Attempting to clear interval ID: ${idToClear}`);
//   if (typeof trailEffectInterval !== 'undefined' && idToClear === trailEffectInterval && trailEffectInterval !== null) {
//     console.warn(`[DEBUG_CLEAR_INTERVAL] !!!!! TARGET trailEffectInterval (ID: ${trailEffectInterval}) IS BEING CLEARED !!!!!`);
//     // debugger;
//   }
//   originalClearInterval.call(window, idToClear);
// };

const game = document.getElementById('game');
const player = document.getElementById('player');
const scoreDisplay = document.getElementById('score');
const startBtn = document.getElementById('start-btn');
const menu = document.getElementById('menu');
const gameWrapper = document.querySelector('.game-wrapper');
const levelDisplay = document.getElementById('level-up');
const powerupActivationPopup = document.getElementById('powerup-activation-popup');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreDisplay = document.getElementById('final-score-display');
const tryAgainBtn = document.getElementById('try-again-btn');
const highScoreDisplay = document.getElementById('high-score-display');
const menuHighScoreDisplay = document.getElementById('menu-high-score-display');
const liveHighScoreDisplay = document.getElementById('live-high-score-display');
const newHighScorePopup = document.getElementById('new-high-score-popup');
const levelTransitionOverlay = document.getElementById('level-transition-overlay');
const levelTransitionText = document.getElementById('level-transition-text');
const mainMenuBtn = document.getElementById('main-menu-btn');
const shopBtn = document.getElementById('shop-btn');
const shopScreen = document.getElementById('shop-screen');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const liveCoinBankDisplay = document.getElementById('live-coin-bank');
const shopCoinBankDisplaySpan = document.querySelector('#shop-current-coin-bank .shop-coin-value');
const shopMessagePopup = document.getElementById('shop-message-popup');
const shopPlayerPreviewElement = document.getElementById('shop-player-preview-element'); // For skin preview HUD
const SLOW_SPAWN_RATE = 2500; // Added constant for slow spawn rate
const gameWrapperEl = document.querySelector('.game-wrapper');
const gameDiv = document.getElementById('game');
const statsHighestLevelDisplay = document.getElementById('stats-highest-level');

function restoreGameScreen() {
  const gameWrapperEl = document.querySelector('.game-wrapper');
  const gameDiv = document.getElementById('game');

  if (gameWrapperEl) {
    gameWrapperEl.style.cssText = '';
    gameWrapperEl.removeAttribute("style");
  }

  if (gameDiv) {
    gameDiv.style.cssText = '';
    gameDiv.removeAttribute("style");
  }
}

let score = 0;
let playerX = 160;
let gameRunning = false;
let spawnInterval;
let levelUpInterval;
let spawnDelay = 1500;
let level = 1;

let isSlow = false;
let isMagnet = false;
let isDouble = false;

let health = 3;

let streakCount = 0;
let streakActive = false;

let isBossActive = false;
let currentBoss = null;

let highScore = 0;
let highScoreBeatenThisGame = false;

player.style.left = playerX + 'px';
let moveLeft = false;
let moveRight = false;

let lastHealthLoss = 0;
let heartCheckInterval = null;
let canSpawnHeart = false;

// Globally managed interval IDs
let globalSpawnInterval = null;
let globalLevelUpInterval = null;
let globalHeartSpawnCheckInterval = null;
let globalPowerUpSpawnInterval = null;
let droneFireInterval = null; // Added for managing drone's firing
let shopPreviewTrailInterval = null; // For managing shop trail previews

// Variables for Real-Time Stats Panel
let gameStartTime = 0;
let currentLongestStreak = 0;
let gameOverProcessed = false; // Flag to prevent multiple endGame calls per session
let comboRetentionUsedThisStreak = false; // Added for Combo Retention perk

// DOM elements for stats display
const statsAllTimeSurvivedDisplay = document.getElementById('stats-all-time-survived');
const statsCurrentBankDisplay = document.getElementById('stats-current-bank');
const statsAllTimeCoinsDisplay = document.getElementById('stats-all-time-coins');
const statsLongestStreakDisplay = document.getElementById('stats-longest-streak');

// --- Item Definitions (could be an array of objects for more complex shops) ---
const SHOP_ITEMS = {
  boardSkins: {
    neonBlueCore: { name: "Neon Blue Core", cost: 2000, type: "boardSkin" },
    plasmaGoldTrail: { name: "Plasma Gold Trail", cost: 3000, type: "boardSkin" },
    glitchShadowVariant: { name: "Glitch Shadow Variant", cost: 5000, type: "boardSkin" }
  },
  trailEffects: {
    fireSparks: { name: "Fire Sparks", cost: 1000, type: "trailEffect" },
    digitalLineTrail: { name: "Digital Line Trail", cost: 1500, type: "trailEffect" },
    electricStatic: { name: "Electric Static", cost: 1200, type: "trailEffect" }
  },
  comboCoinBonuses: {
    streakAccelerator: { name: "Streak Accelerator", description: "Only 4 coins needed to trigger streak (instead of 5).", cost: 1000, type: "comboCoinBonus" },
    comboRetention: { name: "Combo Retention", description: "Can miss 1 coin without breaking an active streak (once per streak).", cost: 1500, type: "comboCoinBonus" },
    streakBonusMultiplier: { name: "Streak Bonus Multiplier", description: "While in streak mode, each coin caught gives +1 extra coin (total 3 base coins per coin during streak).", cost: 2000, type: "comboCoinBonus" }
  },
  survivalUpgrades: { // NEW CATEGORY
    heart_upgrade_max4: { name: "❤️ Heart Expansion", description: "Max hearts permanently increased to 4.", cost: 5000, type: "survivalUpgrade" },
    fast_heart_regen: { name: "⏱️ Accelerated Heart Regen", description: "Heart drops every 8 seconds when you're below max HP.", cost: 5000, type: "survivalUpgrade" },
    auto_emergency_slow: { name: "🧊 Emergency Slow Trigger", description: "When at 1 heart, instantly activates SLOW for 3 seconds.", cost: 5000, type: "survivalUpgrade" }
  }
  // Add more items/categories here
};

const POWERUP_UPGRADE_TIERS = {
  slow: [
    { id: 'slow_boost_1', description: "Tier 1:<br>Duration 6 SEC", cost: 800 },
    { id: 'slow_boost_2', description: "Tier 2:<br>Duration 7 SEC", cost: 1200 },
    { id: 'slow_boost_3', description: "Tier 3:<br>Duration 8 SEC", cost: 1600 },
  ],
  magnet: [
    { id: 'magnet_boost_1', description: "Tier 1:<br>Duration 6 SEC", cost: 800 },
    { id: 'magnet_boost_2', description: "Tier 2:<br>Duration 7 SEC", cost: 1200 },
    { id: 'magnet_boost_3', description: "Tier 3:<br>Duration 8 SEC", cost: 1600 },
  ],
  double: [
    { id: 'double_boost_1', description: "Tier 1:<br>Duration 11 SEC", cost: 1000 },
    { id: 'double_boost_2', description: "Tier 2:<br>Duration 12 SEC", cost: 1500 },
    { id: 'double_boost_3', description: "Tier 3:<br>Duration 13 SEC", cost: 2000 },
  ],
};

let messageTimeout = null;
function showShopMessage(message, type = 'info') { // type can be 'info', 'success', 'error'
  if (!shopMessagePopup) return;
  shopMessagePopup.textContent = message;
  shopMessagePopup.className = 'shop-message-popup'; // Reset classes
  if (type === 'success') {
    shopMessagePopup.classList.add('success');
  } else if (type === 'error') {
    shopMessagePopup.classList.add('error');
  }
  shopMessagePopup.classList.add('show');

  if (messageTimeout) clearTimeout(messageTimeout);
  messageTimeout = setTimeout(() => {
    shopMessagePopup.classList.remove('show');
  }, 3000); // Message visible for 3 seconds
}

function updateStatsDisplay() {
  const highestLevelReached = parseInt(localStorage.getItem('fallingObjectsHighestLevel')) || 1;
if (statsHighestLevelDisplay) {
  statsHighestLevelDisplay.textContent = highestLevelReached;
}

  const storedAllTimeSurvived = parseFloat(localStorage.getItem('allTimeSurvivedSeconds')) || 0;
  const storedCurrentBank = parseInt(localStorage.getItem('currentCoinBank')) || 0;
  const storedAllTimeCoinsCaught = parseInt(localStorage.getItem('allTimeCoinsCaught')) || 0;
  const storedAllTimeLongestStreak = parseInt(localStorage.getItem('allTimeLongestStreak')) || 0;

  if (statsAllTimeSurvivedDisplay) {
    statsAllTimeSurvivedDisplay.textContent = storedAllTimeSurvived.toFixed(1) + 's';
  }
  if (statsCurrentBankDisplay) {
    statsCurrentBankDisplay.textContent = storedCurrentBank;
  }
  if (statsAllTimeCoinsDisplay) {
    statsAllTimeCoinsDisplay.textContent = storedAllTimeCoinsCaught;
  }
  if (statsLongestStreakDisplay) {
    statsLongestStreakDisplay.textContent = storedAllTimeLongestStreak;
  }
  if (liveCoinBankDisplay) {
    liveCoinBankDisplay.textContent = `💰 Bank: ${storedCurrentBank}`;
  }
  if (shopCoinBankDisplaySpan && shopScreen.style.display !== 'none') {
    shopCoinBankDisplaySpan.textContent = storedCurrentBank;
  }
}

function applyEquippedBoardSkin() {
  if (!player) return; // Make sure player element exists

  const equippedSkinId = localStorage.getItem('equipped_boardSkin');
  
  // Remove any existing skin classes first
  // This assumes skin class names are prefixed with 'skin-'
  player.className = ''; // Reset classes to just the base player id if needed, or manage more carefully
  // A safer way to remove only skin classes if player might have other utility classes:
  Object.values(SHOP_ITEMS.boardSkins).forEach(skin => {
    player.classList.remove('skin-' + skin.name.toLowerCase().replace(/\s+/g, '')); // Example: skin-neonbluecore
     // We need to be careful with how we generate the class name from the ID.
     // Let's use the itemId from dataset directly.
     player.classList.remove('skin-' + Object.keys(SHOP_ITEMS.boardSkins).find(key => SHOP_ITEMS.boardSkins[key] === skin));
  });
  // Re-add base player class if it was removed by player.className = ''
  // player.classList.add('player-base-class'); // If you have one

  // More robustly: iterate defined skins and remove their classes
  for (const skinId in SHOP_ITEMS.boardSkins) {
    player.classList.remove('skin-' + skinId);
  }

  if (equippedSkinId) {
    player.classList.add('skin-' + equippedSkinId);
    console.log("Applied skin: " + equippedSkinId);
  } else {
    // No skin equipped, ensure default appearance (which it should have if all skin classes are removed)
    console.log("No board skin equipped, using default.");
  }
}

function updateLiveCoinBank(currentBank) {
  if (liveCoinBankDisplay) {
    liveCoinBankDisplay.textContent = `💰 Bank: ${currentBank}`;
    liveCoinBankDisplay.classList.add('coin-updated');
    setTimeout(() => {
      liveCoinBankDisplay.classList.remove('coin-updated');
    }, 300);
  }
}

function shakeScreen() {
  const gameElement = document.getElementById('game');
  if (!gameElement) return;

  if (gameElement.classList.contains('shake')) {
    return;
  }

  gameElement.classList.add('shake');

  setTimeout(() => {
    if (gameElement) {
      gameElement.classList.remove('shake');
    }
  }, 300);
}

function updateHearts() {
  const heartIcons = document.querySelectorAll('#hearts .heart');
  const currentMaxHealth = getMaxHealth();
  heartIcons.forEach((heart, index) => {
    // Show heart if index < current health
    // Dim heart if index >= current health but < currentMaxHealth (for empty slots up to max)
    // Hide heart if index >= currentMaxHealth (for any extra heart images beyond max)
    if (index < health) {
      heart.style.opacity = '1';
      heart.style.display = 'inline-block'; // Ensure visible
    } else if (index < currentMaxHealth) {
      heart.style.opacity = '0.2';
      heart.style.display = 'inline-block'; // Ensure empty slots are visible but dimmed
    } else {
      heart.style.opacity = '0'; // Effectively hide hearts beyond current max
      heart.style.display = 'none';  // Actually hide hearts beyond current max
    }
    heart.classList.remove('pop', 'gained-animation'); 
  });
}

function animateHeartIcon(heartIndex, animationClass) {
  const heartIcons = document.querySelectorAll('#hearts .heart');
  if (heartIcons[heartIndex]) {
    heartIcons[heartIndex].classList.remove('pop', 'gained-animation');
    void heartIcons[heartIndex].offsetWidth; 
    heartIcons[heartIndex].classList.add(animationClass);
    setTimeout(() => {
      if (heartIcons[heartIndex]) {
        heartIcons[heartIndex].classList.remove(animationClass);
      }
    }, 500);
  }
}

function summonDrone() {
  const drone = document.getElementById('drone');
  drone.style.display = 'block';

  // Clear any existing drone fire interval before starting a new one
  if (droneFireInterval) {
    clearInterval(droneFireInterval);
    droneFireInterval = null;
  }

  droneFireInterval = setInterval(() => {
    if (!gameRunning || !document.getElementById('drone') || document.getElementById('drone').style.display === 'none') {
      // Added checks for drone existence and display
      if(droneFireInterval) clearInterval(droneFireInterval); // Stop if drone is gone or game stopped
      droneFireInterval = null;
      return;
    }
    createBullet();
  }, 600);

  setTimeout(() => {
    if (droneFireInterval) {
      clearInterval(droneFireInterval);
      droneFireInterval = null;
    }
    // Ensure drone div is hidden if this timeout completes normally
    const droneDiv = document.getElementById('drone');
    if (droneDiv) droneDiv.style.display = 'none';
  }, 5000); // Drone active for 5 seconds
}

function createBullet() {
  const bullet = document.createElement('div');
  bullet.classList.add('bullet');
  bullet.style.left = Math.floor(Math.random() * 470) + 'px';
  game.appendChild(bullet);

  let bulletY = 40;

  const fallBulletIntervalId = setInterval(() => {
    if (bullet.classList.contains('fading-out-object')) {
      clearInterval(fallBulletIntervalId);
      return;
    }
    bulletY += 5;
    bullet.style.top = bulletY + 'px';

    const playerLeft = playerX;
    const playerRight = playerX + 80;
    const bulletX = parseInt(bullet.style.left);

    if (bulletY >= 635 && bulletX >= playerLeft && bulletX <= playerRight) {
      shakeScreen();
      loseHealth();

      if (streakActive) {
        showLoseStreak();
        streakCount = 0;
        streakActive = false;
      }

      clearInterval(fallBulletIntervalId);
      bullet.remove();
    }

    if (bulletY > 700) {
      bullet.remove();
      clearInterval(fallBulletIntervalId);
    }
  }, 20);
  bullet.dataset.fallIntervalId = fallBulletIntervalId;
}

document.addEventListener('keydown', e => {
  if (!gameRunning) return;
  if (e.key === 'ArrowLeft') moveLeft = true;
  if (e.key === 'ArrowRight') moveRight = true;
});

document.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft') moveLeft = false;
  if (e.key === 'ArrowRight') moveRight = false;
});

setInterval(() => {
  if (!gameRunning) return;
  if (moveLeft) {
    playerX -= 5;
    if (playerX < 0) playerX = 0;
  }
  if (moveRight) {
    playerX += 5;
    if (playerX > 420) playerX = 420; 
  }
  player.style.left = playerX + 'px';
}, 10);

updateHearts();
displayMainMenuHighScore();
updateStatsDisplay(); // Initial call

// Global variable to store the interval ID for trail effects
let trailEffectInterval = null;

function applyEquippedTrailEffect() {
  console.log('[Trail] applyEquippedTrailEffect called.');

  if (trailEffectInterval) {
    clearInterval(trailEffectInterval);
    trailEffectInterval = null;
    console.log('[Trail] Cleared existing trailEffectInterval in applyEquippedTrailEffect.');
  }

  if (!gameRunning || !player) {
    console.log('[Trail] Not applying: gameRunning is', gameRunning, 'player is', player ? 'found' : 'not found');
    return;
  }

  const equippedTrailId = localStorage.getItem('equipped_trailEffect');
  console.log('[Trail] Equipped Trail ID from localStorage:', equippedTrailId);

  if (!equippedTrailId) {
    console.log('[Trail] No trail ID equipped. Interval will not start.');
    return;
  }

  console.log(`[Trail] Setting up interval for trail: ${equippedTrailId}`);
  
  trailEffectInterval = setInterval(() => {
    try {
      if (!gameRunning || !player) { 
        console.log(`[Trail] Interval: Clearing - gameRunning: ${gameRunning}, Player global var exists: ${!!player}`);
        if (trailEffectInterval) clearInterval(trailEffectInterval);
        trailEffectInterval = null;
        return;
      }
      // console.log(`[Trail] Interval TICK for ${equippedTrailId}`); // Optional: too noisy

      const particle = document.createElement('div');
      particle.classList.add('trail-particle');
      let particleTypeClass = '';

      // Set random values for CSS custom properties
      // For fire sparks, --random-xs for small horizontal jitter, --random-xl for wider spread at end
      particle.style.setProperty('--random-xs', (Math.random() * 2 - 1).toFixed(2)); // -1 to 1
      particle.style.setProperty('--random-xl', (Math.random() * 2 - 1).toFixed(2)); // -1 to 1
      
      // For electric static, --random-angle for initial rotation, --random-xs for jitter
      particle.style.setProperty('--random-angle', (Math.random() * 90 - 45).toFixed(0)); // -45 to 45 degrees

      if (equippedTrailId === 'fireSparks') {
        particleTypeClass = 'trail-fire-spark';
      } else if (equippedTrailId === 'digitalLineTrail') {
        particleTypeClass = 'trail-digital-line';
      } else if (equippedTrailId === 'electricStatic') {
        particleTypeClass = 'trail-electric-static';
      } else {
        console.error('[Trail] Interval: Unknown trail ID:', equippedTrailId, '- Clearing interval.');
        if (trailEffectInterval) clearInterval(trailEffectInterval);
        trailEffectInterval = null;
        return;
      }
      particle.classList.add(particleTypeClass);

      const playerRect = player.getBoundingClientRect();
      const gameRect = game.getBoundingClientRect();

      let particleInitialWidth = 6; 
      let particleInitialHeight = 6;
      if (equippedTrailId === 'digitalLineTrail') {
          particleInitialWidth = 15; particleInitialHeight = 3;
      } else if (equippedTrailId === 'electricStatic') {
          particleInitialWidth = 5; particleInitialHeight = 5;
      }

      let particleX = playerRect.left - gameRect.left + (playerRect.width / 2) - (particleInitialWidth / 2); 
      let particleY = playerRect.top - gameRect.top + (playerRect.height / 2) - (particleInitialHeight / 2); 

      if (equippedTrailId === 'fireSparks') {
        particleX += (Math.random() - 0.5) * playerRect.width * 0.7; 
        particleY += playerRect.height * 0.3; 
      } else if (equippedTrailId === 'digitalLineTrail') {
        particleY = playerRect.top - gameRect.top + playerRect.height - (particleInitialHeight / 2) + 5; 
        particleX = playerRect.left - gameRect.left + (playerRect.width / 2) - (particleInitialWidth / 2);
      } else if (equippedTrailId === 'electricStatic') {
        particleX += (Math.random() - 0.5) * playerRect.width * 0.9;
        particleY += (Math.random() - 0.5) * playerRect.height * 0.9;
      }

      particle.style.left = particleX + 'px';
      particle.style.top = particleY + 'px';

      game.appendChild(particle);

      let animationDuration = 500;
      if (equippedTrailId === 'digitalLineTrail') animationDuration = 400;
      if (equippedTrailId === 'electricStatic') animationDuration = 300;

      setTimeout(() => {
        particle.remove();
      }, animationDuration);
    } catch (e) {
      console.error('[Trail] Interval EXECUTION ERROR:', e);
      if (trailEffectInterval) clearInterval(trailEffectInterval);
      trailEffectInterval = null;
    }
  }, 70); 
  console.log('[Trail] trailEffectInterval started with ID:', trailEffectInterval);
  if (!trailEffectInterval) {
      console.error('[Trail] CRITICAL: setInterval did not return a valid ID!');
  }
}

function startGameLogic() {
  restoreGameScreen();
  if (menu) menu.style.display = 'none';
if (shopScreen) shopScreen.style.display = 'none';
  console.warn("[StartGameLogic] ===== GAME START/RESTART SEQUENCE INITIATED =====");

  document.body.classList.remove('game-is-over');
  document.documentElement.classList.remove('game-is-over-html-override');

  if (menu) menu.style.display = 'none';
  if (gameOverScreen) gameOverScreen.style.display = 'none'; 
  
  const gameWrapperEl = document.querySelector('.game-wrapper');
  if (gameWrapperEl) {
    console.log("[StartGameLogic] Setting gameWrapper display to block.");
    gameWrapperEl.style.display = 'block'; 
  } else {
    console.error("[StartGameLogic] CRITICAL: gameWrapperEl NOT FOUND!"); return; // Stop if no wrapper
  }
  
  const gameDiv = document.getElementById('game');
  if (gameDiv) {
    console.log("[StartGameLogic] Setting gameDiv display to block.");
    gameDiv.style.display = 'block'; 
    // Check visibility of star layers
    const starsFar = gameDiv.querySelector('.stars-far');
    if (starsFar) console.log(`[StartGameLogic] .stars-far computed display: ${window.getComputedStyle(starsFar).display}`);
    else console.log("[StartGameLogic] .stars-far not found");
  } else {
    console.error("[StartGameLogic] CRITICAL: gameDiv NOT FOUND!"); return; // Stop if no game div
  }

  // Reset game state variables
  console.log("[StartGameLogic] Resetting core game variables (score, level, health, playerX, etc.).");
  score = 0;
  level = 1;
  // health = getMaxHealth(); // This is already in your code, ensure it works
  // playerX = 160; // This is already in your code
  // ... many other resets ...
  gameOverProcessed = false;
  console.log(`[StartGameLogic] gameOverProcessed set to: ${gameOverProcessed}`);
  
  // Other resets like gameStartTime, currentLongestStreak should be here too if they are part of the game state reset
  gameStartTime = Date.now(); // Example: ensure this is reset before gameRunning is true
  currentLongestStreak = 0; // Example
  highScoreBeatenThisGame = false; // Example
  
  // Ensure critical player state is reset BEFORE gameRunning is true and trails/skins are applied
  health = getMaxHealth();
  playerX = 160;
  if (player) player.style.left = playerX + 'px';
  moveLeft = false;
  moveRight = false;
  spawnDelay = 1500; // Reset to default
  isSlow = false;
  isMagnet = false;
  isDouble = false;
  streakCount = 0;
  streakActive = false;
  isBossActive = false;
  currentBoss = null;
  canSpawnHeart = false;

  // Clear old visuals and intervals BEFORE setting gameRunning true for new setup
  console.log("[StartGameLogic] Attempting to clear all game intervals.");
  clearAllGameIntervals();
  console.log("[StartGameLogic] Attempting to remove all falling objects.");
  removeAllFallingObjects();
  console.log("[StartGameLogic] Attempting to remove active boss.");
  removeActiveBoss();

  const gameElement = document.getElementById('game');
  if (gameElement && gameElement.classList.contains('shake')) {
    gameElement.classList.remove('shake');
  }
  document.body.className = ''; // Reset body classes
  if(gameDiv) gameDiv.className = ''; // Reset game div classes (important if themes add classes here)

  const heartLossPopup = document.getElementById('heart-popup');
  if (heartLossPopup) {
    heartLossPopup.textContent = '';
    heartLossPopup.style.opacity = '0';
    heartLossPopup.style.animation = 'none';
  }

  // Update UI elements for the new game state
  if(levelDisplay) levelDisplay.textContent = `Level: ${level}`;
  if(scoreDisplay) scoreDisplay.textContent = `Score: ${score}`;
  updateHearts();

  let storedHighScore = localStorage.getItem('fallingObjectsHighScore');
  highScore = storedHighScore ? parseInt(storedHighScore, 10) : 0;
  if (liveHighScoreDisplay) liveHighScoreDisplay.textContent = `HS: ${highScore}`;
  const initialBank = parseInt(localStorage.getItem('currentCoinBank')) || 0;
  updateLiveCoinBank(initialBank);
  if(newHighScorePopup) newHighScorePopup.classList.remove('show'); 
  if(newHighScorePopup) newHighScorePopup.style.opacity = '0';

  console.log("[StartGameLogic] Setting gameRunning = true (MOVED EARLIER).");
  gameRunning = true; 
  console.log(`[StartGameLogic] gameRunning is now: ${gameRunning}`);

  if (player) {
    // Player positioning already done, this is a good place for skin/trail
    console.log("[StartGameLogic] Applying equipped board skin and trail effect (AFTER gameRunning=true).");
    applyEquippedBoardSkin(); 
    applyEquippedTrailEffect();
  } else {
    console.error("[StartGameLogic] CRITICAL: Player element not found before applying skin/trail!");
  }
  
  // Start new game intervals
  console.log(`[StartGameLogic] Initializing spawnInterval with delay: ${spawnDelay}`);
  globalSpawnInterval = setInterval(createFallingObject, spawnDelay);
  console.log(`[StartGameLogic] Spawn interval ID: ${globalSpawnInterval}`);
  
  console.log("[StartGameLogic] Initializing levelUpInterval.");
  globalLevelUpInterval = setInterval(levelUpLogic, 5000); 
  console.log(`[StartGameLogic] Level up interval ID: ${globalLevelUpInterval}`);
  
  console.log("[StartGameLogic] Initializing powerUpSpawnInterval.");
  globalPowerUpSpawnInterval = setInterval(() => {
    if (gameRunning) {
      // console.log("[Interval] PowerUpSpawn tick, gameRunning=true"); // Can be noisy
      createPowerUp();
    }
  }, 7000);
  console.log(`[StartGameLogic] PowerUp spawn interval ID: ${globalPowerUpSpawnInterval}`);
  
  console.log("[StartGameLogic] Ensuring heart spawn mechanism.");
  ensureHeartSpawnMechanism();

  console.warn("[StartGameLogic] ===== GAME START/RESTART SEQUENCE COMPLETE =====");
}

function clearAllGameIntervals() {
  console.log("[clearAllGameIntervals] Attempting to clear intervals...");
  if (globalSpawnInterval) { clearInterval(globalSpawnInterval); console.log(`Cleared globalSpawnInterval: ${globalSpawnInterval}`); globalSpawnInterval = null; }
  if (globalLevelUpInterval) { clearInterval(globalLevelUpInterval); console.log(`Cleared globalLevelUpInterval: ${globalLevelUpInterval}`); globalLevelUpInterval = null; }
  if (globalPowerUpSpawnInterval) { clearInterval(globalPowerUpSpawnInterval); console.log(`Cleared globalPowerUpSpawnInterval: ${globalPowerUpSpawnInterval}`); globalPowerUpSpawnInterval = null; }
  if (trailEffectInterval) { clearInterval(trailEffectInterval); console.log(`Cleared trailEffectInterval: ${trailEffectInterval}`); trailEffectInterval = null; } // Also clear trail here
  if (droneFireInterval) { clearInterval(droneFireInterval); console.log(`Cleared droneFireInterval: ${droneFireInterval}`); droneFireInterval = null; }
  if (heartCheckInterval) {
    clearInterval(heartCheckInterval);
    console.log(`Cleared heartCheckInterval: ${heartCheckInterval}`);
    heartCheckInterval = null;
  }
  console.log("[clearAllGameIntervals] Finished clearing intervals.");
}

function removeAllFallingObjects() {
  const fallingObjects = document.querySelectorAll('.falling, .bullet, .boss-bullet');
  fallingObjects.forEach(obj => {
    if (obj.dataset.fallIntervalId) {
      const intervalId = parseInt(obj.dataset.fallIntervalId);
      if (!isNaN(intervalId)) {
        clearInterval(intervalId);
      }
      delete obj.dataset.fallIntervalId; // Clean up the dataset attribute
    }
    obj.remove();
  });
}

function removeActiveBoss() {
  if (currentBoss) {
    currentBoss.remove();
    currentBoss = null;
  }
  const drone = document.getElementById('drone');
  if (drone && drone.style.display === 'block') {
      drone.style.display = 'none';
  }
  // Clear drone's firing interval
  if (droneFireInterval) {
    clearInterval(droneFireInterval);
    droneFireInterval = null;
  }
}

startBtn.addEventListener('click', startGameLogic);

tryAgainBtn.addEventListener('click', () => {
  if (gameOverScreen) gameOverScreen.style.display = 'none'; 
  document.documentElement.classList.remove('game-is-over-html-override'); // ADDED FOR HTML ELEMENT
  // The gameOverProcessed = false; is handled by startGameLogic
  console.warn("[TryAgainBtn] Clicked. Hiding GOS. Calling startGameLogic.");
  startGameLogic();
});

function createFallingObject() {
  const obj = document.createElement('div');
  let objType = 'coin';

  const fastBombChance = Math.min(0.02 + level * 0.001, 0.04);
  const bombChance = Math.min(0.16 + level * 0.008, 0.32);
  const totalAssigned = fastBombChance + bombChance;
  const coinChance = 1 - totalAssigned;

  const r = Math.random();

  if (r < fastBombChance) objType = 'fast-bomb';
  else if (r < fastBombChance + bombChance) objType = 'bomb';
  else objType = 'coin';

  obj.classList.add('falling');
  obj.classList.add(objType);
  obj.style.left = Math.floor(Math.random() * 470) + 'px';

  game.appendChild(obj);

  let pos = 0;

  const fallIntervalId = setInterval(() => {
    if (obj.classList.contains('fading-out-object')) {
      clearInterval(fallIntervalId);
      return;
    }
    const baseSpeed = 3 + level * 0.15;
    const fallSpeed =
      isSlow ? 1 :
      objType === 'fast-bomb' ? baseSpeed * 1.6 :
      baseSpeed;

    pos += fallSpeed;
    obj.style.top = pos + 'px';

    if (isMagnet && objType === 'coin') {
      obj.style.left = playerX + 25 + 'px';
    }

    const paddleLine = 650;
    const objectBottom = pos + obj.offsetHeight;

    if (objectBottom >= paddleLine && pos <= paddleLine) { // Object is in the paddle's Y-range
      const objX = parseInt(obj.style.left);
      const caught = objX > playerX - 30 && objX < playerX + 80;

      if (caught) {
        if (objType === 'bomb' || objType === 'fast-bomb') {
          shakeScreen();
          loseHealth();
          if (streakActive) showLoseStreak();
          streakCount = 0;
          streakActive = false;
        } else if (objType === 'coin') {
          streakCount++;
          const streakThreshold = localStorage.getItem('streakAccelerator') === 'true' ? 4 : 5;
          if (streakCount >= streakThreshold && !streakActive) activateStreak();
          currentLongestStreak = Math.max(currentLongestStreak, streakCount);
          let pointsPerCoin = 1;
          if (isDouble) pointsPerCoin *= 2;
          if (streakActive) {
            pointsPerCoin *= 2;
            if (localStorage.getItem('streakBonusMultiplier') === 'true') pointsPerCoin += 1;
          }
          score += pointsPerCoin;
          let currentBank = parseInt(localStorage.getItem('currentCoinBank')) || 0;
          currentBank += pointsPerCoin;
          localStorage.setItem('currentCoinBank', currentBank.toString());
          updateLiveCoinBank(currentBank);
          let currentAllTimeCoins = parseInt(localStorage.getItem('allTimeCoinsCaught')) || 0;
          currentAllTimeCoins += pointsPerCoin;
          localStorage.setItem('allTimeCoinsCaught', currentAllTimeCoins.toString());
          scoreDisplay.textContent = `Score: ${Math.floor(score)}`;
          scoreDisplay.classList.add('score-updated');
          setTimeout(() => scoreDisplay.classList.remove('score-updated'), 300);
          if (score > highScore && !highScoreBeatenThisGame) {
            highScoreBeatenThisGame = true;
            newHighScorePopup.classList.add('show');
            setTimeout(() => { if (newHighScorePopup) newHighScorePopup.classList.remove('show'); }, 1000);
            if (liveHighScoreDisplay) liveHighScoreDisplay.textContent = `HS: ${score}`;
          } else if (highScoreBeatenThisGame) {
            if (liveHighScoreDisplay) liveHighScoreDisplay.textContent = `HS: ${score}`;
          }
        }
        clearInterval(fallIntervalId);
        requestAnimationFrame(() => obj.remove());
        return; // Caught object, so exit interval callback for this object
      } else { // Object is at paddle line but NOT caught
        if (objType === 'coin') {
          // FIRST, check if this specific coin has already been processed for retention
          if (obj.dataset.retentionForgiven === 'true') {
            // This coin was already forgiven, do nothing more for streak logic here.
            // It will continue to fall and be handled by the pos >= 700 logic.
            // console.log(`[RetentionDebug] Missed coin (${obj.offsetLeft}px) already flagged as forgiven, allowing to fall.`);
          } else if (streakActive) {
            const perkOwned = localStorage.getItem('comboRetention') === 'true';
            // Using a slightly different log prefix for this version of the fix
            console.log(`[ComboRetentionV3] Missed coin (${obj.offsetLeft}px). Streak Active. Perk: ${perkOwned}. Global Retention Used: ${comboRetentionUsedThisStreak}.`);
            if (perkOwned && !comboRetentionUsedThisStreak) {
              comboRetentionUsedThisStreak = true;      // Mark global retention as used for this streak period
              obj.dataset.retentionForgiven = 'true'; // Flag THIS specific coin
              console.log("[ComboRetentionV3] Combo Retention Used! Streak SAVED for this specific coin.");
              // NO return here. The coin is now flagged. It will continue to fall.
              // The next time this setInterval runs for this coin, the `obj.dataset.retentionForgiven === 'true'` check above will catch it.
            } else {
              // Streak is lost if: no perk, or global retention already used (and this coin wasn't the one that used it, because it would have been caught by the `if` block that sets retentionForgiven).
              console.log(`[ComboRetentionV3] Streak LOST. Conditions: Perk Owned: ${perkOwned}, Global Retention Used: ${comboRetentionUsedThisStreak}.`);
              showLoseStreak();
              streakCount = 0;
              streakActive = false;
            }
          } else { // Streak was not active when this coin was missed at paddle line
            console.log(`[ComboRetentionV3] Missed coin (${obj.offsetLeft}px). Streak NOT Active.`);
            streakCount = 0; // Reset count, though streak wasn't active
          }
        }
        // If it was a bomb and not caught, it just continues falling. No special logic here for bombs.
      }
    } // End of (objectBottom >= paddleLine && pos <= paddleLine)

    if (pos >= 700) { // Object went off-screen
      if (obj.dataset.retentionForgiven === 'true') {
          // Log when a forgiven coin is finally removed.
          console.log(`[ComboRetentionV3] Forgiven coin (${obj.offsetLeft}px) removed from bottom of screen.`);
      }
      if (objType === 'bomb' || objType === 'fast-bomb') {
        const objX_bomb = parseInt(obj.style.left); 
        createExplosion(objX_bomb, 660);
        shakeScreen();
      }
      obj.remove();
      clearInterval(fallIntervalId);
    }
  }, 10);
}

function ensureHeartSpawnMechanism() {
  const currentMaxHealth = getMaxHealth();
  if (health < currentMaxHealth && !heartCheckInterval) { // Use dynamic max health
    canSpawnHeart = false; // Initialize
    
    const regenTime = localStorage.getItem('fast_heart_regen') === 'true' ? 8000 : 10000;
    // console.log(`[HeartRegen] Setting heart regen interval to: ${regenTime / 1000}s`); // Optional: for debugging

    heartCheckInterval = setInterval(() => {
      if (!gameRunning || health >= currentMaxHealth) { // Use dynamic max health
        clearInterval(heartCheckInterval);
        heartCheckInterval = null;
        return;
      }
      canSpawnHeart = true;
      createHeart();
      canSpawnHeart = false;
    }, regenTime); // Use the determined regenTime
  }
}

function createHeart() {
  const currentMaxHealth = getMaxHealth();
  if (health >= currentMaxHealth) { // Check against dynamic max health
    if (heartCheckInterval) {
      clearInterval(heartCheckInterval);
      heartCheckInterval = null;
    }
    return;
  }
  
  if (canSpawnHeart) {
    const heart = document.createElement('div');
    heart.classList.add('falling', 'powerup', 'heart');
    heart.style.left = Math.floor(Math.random() * 470) + 'px';
    game.appendChild(heart);

    let pos = 0;
    const fallHeartIntervalId = setInterval(() => {
      if (heart.classList.contains('fading-out-object')) {
        clearInterval(fallHeartIntervalId);
        return;
      }
      const fallSpeed = isSlow ? 1 : 3;
      pos += fallSpeed;
      heart.style.top = pos + 'px';

      const paddleLine = 650;
      const objectBottom = pos + heart.offsetHeight;

      if (objectBottom >= paddleLine && pos <= paddleLine) {
        const heartX = parseInt(heart.style.left);
        const caught = heartX > playerX - 30 && heartX < playerX + 80;

        if (caught && health < currentMaxHealth) { // Check against dynamic max health before incrementing
          const gainedHeartIndex = health;
          health++;
          updateHearts();
          animateHeartIcon(gainedHeartIndex, 'gained-animation');
          showHeartGained();
          if (health === currentMaxHealth && heartCheckInterval) { // Check against dynamic max health
            clearInterval(heartCheckInterval);
            heartCheckInterval = null;
          }
          clearInterval(fallHeartIntervalId);
          requestAnimationFrame(() => heart.remove());
          return;
        }
      }

      if (pos >= 700) {
        heart.remove();
        clearInterval(fallHeartIntervalId);
      }
    }, 10);
    heart.dataset.fallIntervalId = fallHeartIntervalId;
  }
}

function loseHealth() {
  const lostHeartIndex = health - 1;
  health--;
  lastHealthLoss = Date.now();
  updateHearts();
  if (lostHeartIndex >= 0 && lostHeartIndex < getMaxHealth()) {
    animateHeartIcon(lostHeartIndex, 'pop');
  }

  const popup = document.getElementById('heart-popup');
  popup.textContent = `💔 ${health} ${health === 1 ? 'heart' : 'hearts'} left`;
  popup.style.animation = 'none';
  void popup.offsetWidth;
  popup.style.animation = 'heart-popup 1s ease';

  // Emergency Slow Trigger perk activation
  if (health === 1 && localStorage.getItem('auto_emergency_slow') === 'true') {
    console.log('[EmergencySlow] Triggering automatic SLOW effect');
    activateSlow();
  }

  if (health <= 0 && gameRunning) { // ADDED && gameRunning check here
    endGame('💀 You ran out of health!');
  }
  ensureHeartSpawnMechanism();
}

function createPowerUp() {
  const types = ['slow', 'magnet', 'double'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  console.log('[PowerUpSpawn] Creating power-up of type:', type); // DIAGNOSTIC LOG
  
  const p = document.createElement('div');
  p.classList.add('powerup', type, 'falling');
  p.style.left = Math.floor(Math.random() * 470) + 'px';
  game.appendChild(p);

  let pos = 0;
  const fallPowerUpIntervalId = setInterval(() => {
    if (p.classList.contains('fading-out-object')) {
      clearInterval(fallPowerUpIntervalId);
      return;
    }
    const fallSpeed = isSlow ? 1 : 3;
    const paddleLine = 650;
    const powerTop = pos;

    if (powerTop + 10 >= paddleLine && powerTop <= paddleLine + 20) {
      const pX = parseInt(p.style.left);
      const caught = pX > playerX - 30 && pX < playerX + 80;

      if (caught) {
        if (type === 'slow') activateSlow();
        if (type === 'magnet') activateMagnet();
        if (type === 'double') activateDouble();
        clearInterval(fallPowerUpIntervalId);
        requestAnimationFrame(() => p.remove());
        return;
      }
    }
    if (pos >= 700) {
      p.remove();
      clearInterval(fallPowerUpIntervalId);
    }
    pos += fallSpeed;
    p.style.top = pos + 'px';
  }, 10);
  p.dataset.fallIntervalId = fallPowerUpIntervalId;
}

// Helper function to get the effective duration of a power-up considering purchased upgrades
function getPowerupDuration(powerupType) {
  let baseDuration = 0;

  if (powerupType === 'slow' || powerupType === 'magnet') {
    baseDuration = 5000; // Base 5 seconds before any tier upgrades
    const tiers = POWERUP_UPGRADE_TIERS[powerupType];
    if (localStorage.getItem(tiers[2].id) === 'true') return 8000; // Tier 3 -> 8s
    if (localStorage.getItem(tiers[1].id) === 'true') return 7000; // Tier 2 -> 7s
    if (localStorage.getItem(tiers[0].id) === 'true') return 6000; // Tier 1 -> 6s
    return baseDuration; // No tiers purchased, return base

  } else if (powerupType === 'double') {
    baseDuration = 10000; // 10 seconds base for double
    let percentageBoost = 0;
    const tiers = POWERUP_UPGRADE_TIERS[powerupType]; // double tiers
    if (localStorage.getItem(tiers[2].id) === 'true') { 
      percentageBoost = 0.30; // 30%
    } else if (localStorage.getItem(tiers[1].id) === 'true') { 
      percentageBoost = 0.20; // 20%
    } else if (localStorage.getItem(tiers[0].id) === 'true') { 
      percentageBoost = 0.10; // 10%
    }
    return baseDuration * (1 + percentageBoost);

  } else {
    return 0; // Unknown powerup type
  }
}

// New global structure to manage power-up effect timeouts and icon countdown intervals
let activePowerups = {
  slow: { effectTimeoutId: null, expiresAt: 0, iconCountdownIntervalId: null },
  magnet: { effectTimeoutId: null, expiresAt: 0, iconCountdownIntervalId: null },
  double: { effectTimeoutId: null, expiresAt: 0, iconCountdownIntervalId: null }
};

function showPowerupTimer(type, durationInSeconds) {
  // Clear any existing countdown interval for this powerup type's icon
  if (activePowerups[type] && activePowerups[type].iconCountdownIntervalId) {
    clearInterval(activePowerups[type].iconCountdownIntervalId);
    activePowerups[type].iconCountdownIntervalId = null;
  }

  // Remove existing icon DOM element if present, before creating a new one
  const existingIconEl = document.getElementById(`icon-${type}`);
  if (existingIconEl) {
    existingIconEl.remove();
  }

  const icon = document.createElement("div");
  icon.classList.add("powerup-icon", type);
  icon.id = `icon-${type}`;
  icon.innerHTML = `${type.toUpperCase()}<br><span class="timer">${Math.round(durationInSeconds)}s</span>`;
  powerupBar.appendChild(icon);

  let time = durationInSeconds;
  const countdownIntervalId = setInterval(() => {
    time--;
    // Ensure icon still exists before trying to update it
    const currentIcon = document.getElementById(`icon-${type}`); 
    if (!currentIcon) { // Icon might have been removed by a new powerup activation
        clearInterval(countdownIntervalId);
        if(activePowerups[type]) activePowerups[type].iconCountdownIntervalId = null;
        return;
    }
    currentIcon.querySelector(".timer").textContent = `${Math.round(Math.max(0, time))}s`;

    if (time <= 0) {
      clearInterval(countdownIntervalId);
      if(activePowerups[type]) activePowerups[type].iconCountdownIntervalId = null;
      if(currentIcon) currentIcon.remove();
    }
  }, 1000);
  
  return countdownIntervalId; // Return the ID of this new interval
}

function activateSlow() {
  const powerupType = 'slow';
  isSlow = true; // Apply effect immediately
  showPowerupActivationPopup(powerupType);

  // Clear existing effect timeout and icon countdown interval for this powerup type
  if (activePowerups[powerupType].effectTimeoutId) {
    clearTimeout(activePowerups[powerupType].effectTimeoutId);
  }
  // showPowerupTimer already handles clearing its own old interval and icon DOM

  // Check if this is an emergency slow trigger activation
  const isEmergencySlow = health === 1 && localStorage.getItem('auto_emergency_slow') === 'true';
  
  // Get the base duration (either emergency 3s or power-up duration)
  const baseDuration = isEmergencySlow ? 3000 : getPowerupDuration(powerupType);
  
  // Calculate remaining time from any existing slow effect
  let remainingDuration = 0;
  if (activePowerups[powerupType].expiresAt > Date.now()) {
    remainingDuration = activePowerups[powerupType].expiresAt - Date.now();
  }
  
  // Add the new duration to any remaining time
  const totalDuration = baseDuration + remainingDuration;
  
  activePowerups[powerupType].expiresAt = Date.now() + totalDuration;
  activePowerups[powerupType].iconCountdownIntervalId = showPowerupTimer(powerupType, totalDuration / 1000);

  // Specific effect for slow: adjust game's spawn interval
  if (globalSpawnInterval) clearInterval(globalSpawnInterval);
  globalSpawnInterval = setInterval(createFallingObject, SLOW_SPAWN_RATE); // Use constant

  activePowerups[powerupType].effectTimeoutId = setTimeout(() => {
    isSlow = false;
    // Restore normal spawn interval ONLY if no other slow effect has since been activated
    if (activePowerups[powerupType].expiresAt <= Date.now()) { 
        if (globalSpawnInterval) clearInterval(globalSpawnInterval);
        globalSpawnInterval = setInterval(createFallingObject, spawnDelay); // Restore original spawnDelay
    }
    activePowerups[powerupType].effectTimeoutId = null;
    activePowerups[powerupType].expiresAt = 0;
  }, totalDuration);
}

function activateMagnet() {
  const powerupType = 'magnet';
  isMagnet = true; // Apply effect
  showPowerupActivationPopup(powerupType);

  if (activePowerups[powerupType].effectTimeoutId) {
    clearTimeout(activePowerups[powerupType].effectTimeoutId);
  }

  const baseUpgradedDuration = getPowerupDuration(powerupType);
  let remainingDuration = 0;
  if (activePowerups[powerupType].expiresAt > Date.now()) {
    remainingDuration = activePowerups[powerupType].expiresAt - Date.now();
  }
  const newTotalDurationMs = baseUpgradedDuration + (remainingDuration > 0 ? remainingDuration : 0);

  activePowerups[powerupType].expiresAt = Date.now() + newTotalDurationMs;
  activePowerups[powerupType].iconCountdownIntervalId = showPowerupTimer(powerupType, newTotalDurationMs / 1000);

  activePowerups[powerupType].effectTimeoutId = setTimeout(() => {
    isMagnet = false;
    activePowerups[powerupType].effectTimeoutId = null;
    activePowerups[powerupType].expiresAt = 0;
  }, newTotalDurationMs);
}

function activateDouble() {
  const powerupType = 'double';
  isDouble = true; // Apply effect
  showPowerupActivationPopup(powerupType);

  if (activePowerups[powerupType].effectTimeoutId) {
    clearTimeout(activePowerups[powerupType].effectTimeoutId);
  }

  const baseUpgradedDuration = getPowerupDuration(powerupType);
  let remainingDuration = 0;
  if (activePowerups[powerupType].expiresAt > Date.now()) {
    remainingDuration = activePowerups[powerupType].expiresAt - Date.now();
  }
  const newTotalDurationMs = baseUpgradedDuration + (remainingDuration > 0 ? remainingDuration : 0);

  activePowerups[powerupType].expiresAt = Date.now() + newTotalDurationMs;
  activePowerups[powerupType].iconCountdownIntervalId = showPowerupTimer(powerupType, newTotalDurationMs / 1000);

  activePowerups[powerupType].effectTimeoutId = setTimeout(() => {
    isDouble = false;
    activePowerups[powerupType].effectTimeoutId = null;
    activePowerups[powerupType].expiresAt = 0;
  }, newTotalDurationMs);
}

function endGame(message) {
   if (gameOverProcessed) {
    console.warn("[EndGame] Already processed. Exiting.");
    return; 
   }
   console.warn("[EndGame] Starting endGame function.");
   gameOverProcessed = true;     
 
   console.warn("[EndGame] Setting gameRunning = false.");
   gameRunning = false;
   clearAllGameIntervals(); // Clears game-specific intervals

   const gameWrapperEl = document.querySelector('.game-wrapper');
   const gameDivEl = document.getElementById('game');

   if (gameWrapperEl) {
       console.warn("[EndGame] Aggressively hiding gameWrapper via JS.");
       gameWrapperEl.style.cssText = `
        display: none !important; 
        visibility: hidden !important; 
        opacity: 0 !important; 
        width: 0px !important; 
        height: 0px !important; 
        overflow: hidden !important;
        z-index: -10 !important;
       `;
   }
   if (gameDivEl) { // gameDiv is inside gameWrapper
       console.warn("[EndGame] Aggressively hiding gameDiv via JS.");
       gameDivEl.style.cssText = `
        display: none !important; 
        visibility: hidden !important; 
        opacity: 0 !important;
       `;
   }

   console.warn("[EndGame] Adding .game-is-over to body.");
   document.body.classList.add('game-is-over');
   document.documentElement.classList.add('game-is-over-html-override'); // ADDED FOR HTML ELEMENT

   const timeSurvivedThisGame = (Date.now() - gameStartTime) / 1000;
   let totalSurvived = parseFloat(localStorage.getItem('allTimeSurvivedSeconds')) || 0;
   totalSurvived += timeSurvivedThisGame;
   localStorage.setItem('allTimeSurvivedSeconds', totalSurvived.toString());
   let overallLongestStreak = parseInt(localStorage.getItem('allTimeLongestStreak')) || 0;
   if (currentLongestStreak > overallLongestStreak) {
     localStorage.setItem('allTimeLongestStreak', currentLongestStreak.toString());
   }
   updateStatsDisplay(); 
   if(finalScoreDisplay) finalScoreDisplay.textContent = `Your Score: ${score}`;
   let highScore = localStorage.getItem('fallingObjectsHighScore');
   let highestLevel = parseInt(localStorage.getItem('fallingObjectsHighestLevel')) || 1;
if (level > highestLevel) {
  localStorage.setItem('fallingObjectsHighestLevel', level.toString());
}
   if (highScore === null) {
     highScore = 0;
   }
   highScore = parseInt(highScore, 10);
   if (score > highScore) {
     highScore = score;
     localStorage.setItem('fallingObjectsHighScore', highScore);
     if(highScoreDisplay) {
        highScoreDisplay.textContent = `🎉 New Highest Score: ${highScore}!`;
        highScoreDisplay.style.color = '#FFD700';
     }
   } else {
     if(highScoreDisplay) {
        highScoreDisplay.textContent = `Highest Score: ${highScore}`;
        highScoreDisplay.style.color = 'white';
     }
   }
   
   requestAnimationFrame(() => {
    console.warn("[EndGame rAF] Verifying gameOverScreen state.");
    if (gameOverScreen) {
        // CSS class body.game-is-over should primarily handle styling.
        // JS ensures display is 'block' if it somehow was 'none'.
        if (window.getComputedStyle(gameOverScreen).display === 'none') {
            console.warn("[EndGame rAF] gameOverScreen computed display is none, forcing to block via JS.");
            gameOverScreen.style.display = 'block'; 
        }
        
        setTimeout(() => {
            if (document.body.classList.contains('game-is-over') && gameOverScreen) {
                const gosStyles = window.getComputedStyle(gameOverScreen);
                console.warn(`[EndGame rAF Check] gameOverScreen computed: display=${gosStyles.display}, zIndex=${gosStyles.zIndex}, opacity=${gosStyles.opacity}, position=${gosStyles.position}, visibility=${gosStyles.visibility}`);
                if (gosStyles.display !== 'block' || parseInt(gosStyles.zIndex) < 1000 || gosStyles.opacity !== '1' || gosStyles.visibility !== 'visible') {
                    console.error("[EndGame rAF Check] gameOverScreen NOT correctly displayed as per CSS expectations!");
                } else {
                    console.warn("[EndGame rAF Check] gameOverScreen appears correctly styled by computed values.");
                }
            }
            if (gameWrapperEl) {
                const gwStyles = window.getComputedStyle(gameWrapperEl);
                console.warn(`[EndGame rAF Check] gameWrapperEl computed: display=${gwStyles.display}`);
                if (gwStyles.display !== 'none') {
                    console.error("[EndGame rAF Check] gameWrapper still visible! Destroying its content as last resort.");
                    gameWrapperEl.innerHTML = ''; // Extreme measure
                }
            }
        }, 100); 
    } else {
      console.error("[EndGame rAF] gameOverScreen element is null.");
    }
   });
   console.warn("[EndGame] endGame function processing finished.");
}

function createExplosion(x, y) {
  const boom = document.createElement('div');
  boom.className = 'explosion';
  boom.style.left = x + 'px';
  boom.style.top = y + 'px';
  game.appendChild(boom);

  setTimeout(() => {
    boom.remove();
  }, 400);
}

function showLoseStreak() {
  const wrapper = document.getElementById('lose-streak');
  const text = document.getElementById('lose-streak-inner');

  wrapper.style.display = 'block';
  text.style.animation = 'none';
  void text.offsetWidth;
  text.style.animation = 'lose-pop 0.5s ease forwards';

  setTimeout(() => {
    wrapper.style.display = 'none';
  }, 1200);
}

function activateStreak() {
  streakActive = true;
  comboRetentionUsedThisStreak = false; // Reset here as well

  const popup = document.getElementById('streak-popup');
  const main = document.getElementById('streak-main');
  const sub = document.getElementById('streak-sub');

  popup.style.display = 'block';

  main.style.animation = 'none';
  sub.style.animation = 'none';
  void main.offsetWidth;
  void sub.offsetWidth;
  main.style.animation = 'streak-pop 0.6s ease forwards';
  sub.style.animation = 'streak-pop 0.6s ease forwards';

  setTimeout(() => {
    popup.style.display = 'none';
  }, 1500);
}

function showHeartGained() {
  const popup = document.createElement('div');
  popup.textContent = '❤️ +1 Heart!';
  popup.className = 'heart-gain-popup';
  game.appendChild(popup);

  setTimeout(() => {
    popup.remove();
  }, 1000);
}

const powerupBar = document.getElementById("powerup-icons");

function showBossWarning() {
  const warning = document.getElementById('boss-warning');
  const warningInner = document.getElementById('boss-warning-inner');
  
  warning.style.display = 'block';
  warningInner.style.animation = 'none';
  void warningInner.offsetWidth;
  warningInner.style.animation = 'boss-warning 2s ease forwards';
  
  setTimeout(() => {
    warning.style.display = 'none';
  }, 2000);
}

function spawnFirstBoss() {
  showBossWarning();
  setTimeout(() => {
    isBossActive = true;
    const boss = document.createElement('div');
    boss.classList.add('boss', 'boss-1');
    boss.style.left = '50%';
    boss.style.top = '50px';
    game.appendChild(boss);
    currentBoss = boss;
    
    let direction = 1;
    let pos = 250;
    let verticalPos = 50;
    let verticalDirection = 1;
    
    const moveInterval = setInterval(() => {
      pos += direction * 5;
      if (pos > 400) direction = -1;
      if (pos < 100) direction = 1;
      
      verticalPos += verticalDirection * 2;
      if (verticalPos > 150) verticalDirection = -1;
      if (verticalPos < 30) verticalDirection = 1;
      
      boss.style.left = pos + 'px';
      boss.style.top = verticalPos + 'px';
    }, 16);
    
    const attackInterval = setInterval(() => {
      if (!gameRunning) {
        clearInterval(attackInterval);
        return;
      }
      for (let i = -1; i <= 1; i++) {
        createBossBullet(pos + 25, verticalPos + 25, i * 15);
      }
    }, 400);
    
    setTimeout(() => {
      isBossActive = false;
      currentBoss = null;
      clearInterval(moveInterval);
      clearInterval(attackInterval);
      boss.remove();
    }, 10000);
  }, 2000);
}

function spawnSecondBoss() {
  showBossWarning();
  setTimeout(() => {
    isBossActive = true;
    const boss = document.createElement('div');
    boss.classList.add('boss', 'boss-2');
    boss.style.left = '50%';
    boss.style.top = '50px';
    game.appendChild(boss);
    currentBoss = boss;
    
    let angle = 0;
    let radius = 100;
    let verticalOffset = 0;
    let verticalDirection = 1;
    
    const moveInterval = setInterval(() => {
      angle += 0.08;
      radius = 100 + Math.sin(angle * 2) * 30;
      
      verticalOffset += verticalDirection * 2;
      if (verticalOffset > 50) verticalDirection = -1;
      if (verticalOffset < -50) verticalDirection = 1;
      
      const x = 190 + Math.cos(angle) * radius;
      const y = 100 + Math.sin(angle) * radius + verticalOffset;
      
      boss.style.left = x + 'px';
      boss.style.top = y + 'px';
    }, 16);
    
    const attackInterval = setInterval(() => {
      if (!gameRunning) {
        clearInterval(attackInterval);
        return;
      }
      const bulletAngle = angle * 3;
      createBossBullet(
        parseInt(boss.style.left) + 25,
        parseInt(boss.style.top) + 25,
        Math.cos(bulletAngle) * 30
      );
    }, 200);
    
    setTimeout(() => {
      isBossActive = false;
      currentBoss = null;
      clearInterval(moveInterval);
      clearInterval(attackInterval);
      boss.remove();
    }, 10000);
  }, 2000);
}

function createBossBullet(x, y, angle = 0) {
  const bullet = document.createElement('div');
  bullet.classList.add('boss-bullet');
  bullet.style.left = x + 'px';
  bullet.style.top = y + 'px';
  if (angle !== 0) {
    bullet.style.transform = `rotate(${angle}deg)`;
  }
  game.appendChild(bullet);
  
  let bulletY = y;
  let bulletX = x;
  const speed = 7;
  
  const fallBossBulletIntervalId = setInterval(() => {
    if (bullet.classList.contains('fading-out-object')) {
      clearInterval(fallBossBulletIntervalId);
      return;
    }
    bulletY += speed;
    if (angle !== 0) {
      bulletX += Math.sin(angle * Math.PI / 180) * 2;
      bullet.style.left = bulletX + 'px';
    }
    bullet.style.top = bulletY + 'px';
    
    const playerLeft = playerX;
    const playerRight = playerX + 80;
    const bulletXPos = parseInt(bullet.style.left);
    
    if (bulletY >= 635 && bulletXPos >= playerLeft && bulletXPos <= playerRight) {
      shakeScreen();
      loseHealth();
      clearInterval(fallBossBulletIntervalId);
      bullet.remove();
    }
    
    if (bulletY > 700) {
      bullet.remove();
      clearInterval(fallBossBulletIntervalId);
    }
  }, 16);
  bullet.dataset.fallIntervalId = fallBossBulletIntervalId;
}

function showPowerupActivationPopup(type) {
  powerupActivationPopup.textContent = `${type.toUpperCase()} ACTIVATED!`;
  powerupActivationPopup.className = 'show';
  powerupActivationPopup.classList.add(type);

  setTimeout(() => {
    powerupActivationPopup.className = '';
    powerupActivationPopup.textContent = '';
  }, 750);
}

function displayMainMenuHighScore() {
  let highScore = localStorage.getItem('fallingObjectsHighScore');
  if (highScore === null) {
    highScore = 0;
  }
  if (menuHighScoreDisplay) {
    menuHighScoreDisplay.textContent = `Highest Score: ${highScore}`;
  }
}

function resetHighScoreForTesting() {
  localStorage.removeItem('fallingObjectsHighScore');
  console.log('High score reset. Please refresh the page for changes to take effect in the UI.');
  highScore = 0;
  if (liveHighScoreDisplay) liveHighScoreDisplay.textContent = `HS: ${highScore}`;
  if (menuHighScoreDisplay) menuHighScoreDisplay.textContent = `Highest Score: ${highScore}`;
}

// The following is a placeholder to acknowledge the user's next action.
// No actual code change is intended by this block for script.js through the tool.
console.log("User to update script.js manually.");

function showLevelTransition(themeName, postTransitionCallback) {
  if (levelTransitionOverlay && levelTransitionText) {
    levelTransitionText.textContent = `Entering: ${themeName}`;
    levelTransitionOverlay.style.display = 'flex';
    
    gameRunning = false; 
    isBossActive = true; 
    
    if(globalSpawnInterval) clearInterval(globalSpawnInterval); globalSpawnInterval = null;
    if(globalLevelUpInterval) clearInterval(globalLevelUpInterval); globalLevelUpInterval = null;
    if(typeof globalHeartSpawnCheckInterval !== 'undefined' && globalHeartSpawnCheckInterval) {
        clearInterval(globalHeartSpawnCheckInterval); globalHeartSpawnCheckInterval = null;
    }
    if(globalPowerUpSpawnInterval) clearInterval(globalPowerUpSpawnInterval); globalPowerUpSpawnInterval = null;
    if(trailEffectInterval) { // Clear trail effect during transition
        clearInterval(trailEffectInterval);
        trailEffectInterval = null;
        console.log('[Transition] Cleared trailEffectInterval.');
    }
    
    document.querySelectorAll('.falling, .bullet, .boss-bullet').forEach(el => {
      if (el.dataset.fallIntervalId) {
        const intervalId = parseInt(el.dataset.fallIntervalId);
        if (!isNaN(intervalId)) {
          clearInterval(intervalId);
        }
        delete el.dataset.fallIntervalId; 
      }
      if (el.style.animationPlayState !== undefined) {
          el.style.animationPlayState = 'paused'; 
      }
      el.classList.add('fading-out-object'); 
    });
    if(player && player.style.animationPlayState !== undefined) {
        player.style.animationPlayState = 'paused';
    }

    setTimeout(() => { 
        levelTransitionOverlay.classList.add('show');
    }, 20); 

    const transitionDisplayDuration = 3000; 
    const overlayFadeOutDuration = 500;   
    const objectFadeOutDuration = 400;    
    
    setTimeout(() => {
      levelTransitionOverlay.classList.remove('show');
      setTimeout(() => { 
        levelTransitionOverlay.style.display = 'none';
        setTimeout(() => {
          document.querySelectorAll('.fading-out-object').forEach(el => el.remove());
          if (postTransitionCallback) postTransitionCallback(); 
          gameRunning = true;
          isBossActive = false; 
          if(player && player.style.animationPlayState !== undefined) {
            player.style.animationPlayState = 'running';
          }
          
          // Determine correct spawn rate after transition
          const currentSpawnRate = isSlow ? SLOW_SPAWN_RATE : spawnDelay;
          if (!globalSpawnInterval) globalSpawnInterval = setInterval(createFallingObject, currentSpawnRate);
          
          if (!globalLevelUpInterval) globalLevelUpInterval = setInterval(levelUpLogic, 5000);
          if (!globalPowerUpSpawnInterval) globalPowerUpSpawnInterval = setInterval(() => { if (gameRunning) createPowerUp(); }, 7000);
          ensureHeartSpawnMechanism();
          applyEquippedTrailEffect(); // Re-apply trail effect after transition
          console.log('[Transition] Re-applied trailEffectInterval.');
        }, objectFadeOutDuration);
      }, overlayFadeOutDuration); 
    }, transitionDisplayDuration);
  }
}

function levelUpLogic() {
  if (isBossActive && !gameRunning) { 
    // If isBossActive is true, but gameRunning is false, we are likely in a transition.
    // The transition will handle resuming the game and intervals.
    // However, the levelUpLogic interval itself will be restarted by the transition, so we just return here.
    return;
  }
  if (isBossActive) return; // Standard check if a boss is normally active

  level++;
  let themeChanged = false;
  let newThemeName = "";
  let postTransitionActions = null; // Function to run after transition and game resumption

  if (level === 11) {
    themeChanged = true;
    newThemeName = "The Neon Sector";
    postTransitionActions = () => {
      game.className = 'game-theme-neon-grid'; // Apply to #game
      // Clear old theme elements if any
      const oldSkyElements = document.getElementById('sky-element-wrapper');
      if (oldSkyElements) oldSkyElements.remove();

      spawnDelay = Math.max(300, spawnDelay - 100 - level * 5);
      levelDisplay.textContent = `Level: ${level}`;
      levelDisplay.classList.add('level-boost');
      setTimeout(() => levelDisplay.classList.remove('level-boost'), 500);
    };
  } else if (level === 21) {
    themeChanged = true;
    newThemeName = "The Sky Realm";
    postTransitionActions = () => {
      game.className = 'game-theme-sky-realm'; // Apply to #game
      // Clear old theme elements if any (e.g. from neon grid)
      // Add new sky elements for the sky realm
      const existingSkyWrapper = document.getElementById('sky-element-wrapper');
      if (existingSkyWrapper) existingSkyWrapper.remove(); // Remove if somehow already exists

      const skyElementWrapper = document.createElement('div');
      skyElementWrapper.id = 'sky-element-wrapper';
      skyElementWrapper.classList.add('sky-element-wrapper');

      const cloudFar1 = document.createElement('div');
      cloudFar1.classList.add('sky-element', 'cloud-far');
      cloudFar1.style.left = '10%'; // Stagger initial positions
      skyElementWrapper.appendChild(cloudFar1);

      const cloudFar2 = document.createElement('div');
      cloudFar2.classList.add('sky-element', 'cloud-far');
      cloudFar2.style.left = '60%';
      cloudFar2.style.animationDelay = '-90s'; // Offset animation
      skyElementWrapper.appendChild(cloudFar2);

      const cloudNear1 = document.createElement('div');
      cloudNear1.classList.add('sky-element', 'cloud-near');
      cloudNear1.style.left = '25%';
      skyElementWrapper.appendChild(cloudNear1);
      
      const cloudNear2 = document.createElement('div');
      cloudNear2.classList.add('sky-element', 'cloud-near');
      cloudNear2.style.left = '70%';
      cloudNear2.style.animationDelay = '-45s';
      skyElementWrapper.appendChild(cloudNear2);

      const city1 = document.createElement('div');
      city1.classList.add('sky-element', 'floating-city');
      city1.style.left = '15%';
      city1.style.bottom = '5%'; // Slightly different vertical positioning
      skyElementWrapper.appendChild(city1);

      const city2 = document.createElement('div');
      city2.classList.add('sky-element', 'floating-city');
      city2.style.left = '75%';
      city2.style.transform = 'scaleX(-1)'; // Flip one for variation
      city2.style.animationDelay = '-20s';
      skyElementWrapper.appendChild(city2);
      
      // Prepend to game div so it's behind other game elements if z-index is similar
      game.prepend(skyElementWrapper);

      spawnDelay = Math.max(300, spawnDelay - 100 - level * 5);
      levelDisplay.textContent = `Level: ${level}`;
      levelDisplay.classList.add('level-boost');
      setTimeout(() => levelDisplay.classList.remove('level-boost'), 500);
    };
  }

  if (themeChanged) {
    showLevelTransition(newThemeName, postTransitionActions);
    // The rest of levelUpLogic (boss spawning) will run AFTER showLevelTransition completes and resumes intervals,
    // because globalLevelUpInterval is cleared and restarted by showLevelTransition.
    // This call to levelUpLogic effectively terminates here for theme changes.
  } else {
    // Normal level up without theme change
    levelDisplay.textContent = `Level: ${level}`;
    levelDisplay.classList.add('level-boost');
    setTimeout(() => levelDisplay.classList.remove('level-boost'), 500);
    
    spawnDelay = Math.max(300, spawnDelay - 100 - level * 5);
    
    if (!isSlow) { // Only reset interval if slow is NOT active
      if(globalSpawnInterval) clearInterval(globalSpawnInterval);
      globalSpawnInterval = setInterval(createFallingObject, spawnDelay);
    } // If isSlow is true, spawnDelay is updated, but the interval continues at SLOW_SPAWN_RATE
      // until the slow power-up expires.

    // Boss spawning logic for non-theme-change levels
    if (level % 10 === 5) summonDrone();
    else if (level === 10) spawnFirstBoss();
    else if (level === 20) spawnSecondBoss();
  }
  // If it was a theme change, the boss spawning for the *new* level needs to be handled
  // when levelUpLogic runs *after* the transition. The issue is that levelUpLogic is an interval.
  // The current structure means boss spawning might be missed for levels 11 and 21 if they also align with boss spawns.
  // This needs a slight rethink on WHEN boss logic runs relative to theme change completion.

  // Let's adjust: Boss spawning should ALWAYS be checked after level increment, 
  // regardless of theme change or not. But if a theme change happened, it must happen
  // AFTER the game is resumed by showLevelTransition.
  // This implies showLevelTransition's callback needs to also trigger boss checks OR
  // levelUpLogic needs to be structured to run its latter half post-transition.

  // Simpler: For theme change levels, the boss spawning logic will run when levelUpLogic is next called
  // by the newly started globalLevelUpInterval AFTER the transition. This is acceptable.
}

// Event listener for the Main Menu button on Game Over screen (RESTORED)
if (mainMenuBtn) {
  mainMenuBtn.addEventListener('click', () => {
    if (gameOverScreen) gameOverScreen.style.display = 'none'; 
    if (menu) menu.style.display = 'block';
    if (gameWrapper) gameWrapper.style.display = 'none'; 
    updateStatsDisplay(); 
    displayMainMenuHighScore(); 
    gameOverProcessed = false; 
    console.warn("[MainMenuBtn GOS] Removing .game-is-over from body.");
    document.body.classList.remove('game-is-over'); 
    document.documentElement.classList.remove('game-is-over-html-override'); // ADDED FOR HTML ELEMENT
  });
}

// Shop Navigation
if (shopBtn) {
  shopBtn.addEventListener('click', () => {
    if(menu) menu.style.display = 'none';
    if(shopScreen) shopScreen.style.display = 'flex'; 
    updateStatsDisplay(); 
    refreshShopItemStates(); 
    updateShopPlayerPreview(null); 
    stopShopTrailPreview(); 
  });
}

if (backToMenuBtn) {
  backToMenuBtn.addEventListener('click', () => {
    shopScreen.style.display = 'none';
    menu.style.display = 'block';
    updateStatsDisplay(); 
    if (shopPlayerPreviewElement) updateShopPlayerPreview(null);
    stopShopTrailPreview(); // Stop trail previews when leaving shop
  });
}

function refreshShopItemStates() {
  if (!shopScreen || shopScreen.style.display === 'none') return;

  const equippedBoardSkin = localStorage.getItem('equipped_boardSkin');
  const equippedTrailEffect = localStorage.getItem('equipped_trailEffect');

  document.querySelectorAll('#shop-screen .shop-item').forEach(itemDiv => {
    const itemType = itemDiv.dataset.itemType;
    const actionButton = itemDiv.querySelector('.shop-action-btn');
    const descriptionDisplay = itemDiv.querySelector('.item-description'); 

    if (!actionButton) {
        return; 
    }

    actionButton.classList.remove('action-buy', 'action-equip', 'action-unequip');
    actionButton.disabled = false;

    if (itemType === 'boardSkin' || itemType === 'trailEffect') {
      const itemId = itemDiv.dataset.itemId; 
      const itemCost = parseInt(itemDiv.dataset.itemCost);
      
      if (!itemId || isNaN(itemCost)) { 
        actionButton.textContent = 'Error';
        actionButton.disabled = true;
        return;
      }

      const isOwned = localStorage.getItem(`owned_${itemType}_${itemId}`) === 'true';
      if (isOwned) {
        if (itemType === 'boardSkin') {
          if (equippedBoardSkin === itemId) {
            actionButton.textContent = 'Unequip';
            actionButton.classList.add('action-unequip');
          } else {
            actionButton.textContent = 'Equip';
            actionButton.classList.add('action-equip');
          }
        } else if (itemType === 'trailEffect') {
          if (equippedTrailEffect === itemId) {
            actionButton.textContent = 'Unequip';
            actionButton.classList.add('action-unequip');
          } else {
            actionButton.textContent = 'Equip';
            actionButton.classList.add('action-equip');
          }
        }
      } else {
        actionButton.textContent = `Buy (${itemCost}💰)`; // Text includes cost
        actionButton.classList.add('action-buy');
      }
    } else if (itemType === 'powerupUpgrade') {
      const powerupCategoryDiv = itemDiv.closest('.powerup-category');
      if (!powerupCategoryDiv) {
        return;
      }
      const powerupType = powerupCategoryDiv.dataset.powerupType;

      if (!powerupType || !POWERUP_UPGRADE_TIERS || !POWERUP_UPGRADE_TIERS[powerupType]) {
        if(descriptionDisplay) descriptionDisplay.innerHTML = 'Upgrade Error';
        actionButton.textContent = 'Error';
        actionButton.disabled = true;
        return;
      }

      const tiers = POWERUP_UPGRADE_TIERS[powerupType];
      let currentTierIndex = -1; 
      for (let i = tiers.length - 1; i >= 0; i--) {
        if (localStorage.getItem(tiers[i].id) === 'true') {
          currentTierIndex = i;
          break;
        }
      }

      const nextTierIndex = currentTierIndex + 1;

      if (nextTierIndex < tiers.length) {
        const nextTier = tiers[nextTierIndex];
        if (descriptionDisplay) descriptionDisplay.innerHTML = nextTier.description;
        actionButton.textContent = `Buy Upgrade (${nextTier.cost}💰)`;
        actionButton.classList.add('action-buy');
        actionButton.dataset.itemId = nextTier.id; 
        actionButton.dataset.itemCost = nextTier.cost;
        actionButton.dataset.powerupType = powerupType; 
        actionButton.disabled = false;
      } else {
        const lastTier = tiers[tiers.length - 1];
        const maxDurationSeconds = getPowerupDuration(powerupType) / 1000;
        const maxedText = `(MAX : ${maxDurationSeconds.toFixed(1)} SEC)`;

        if (descriptionDisplay) {
            const tierLabelPart = lastTier.description.substring(0, lastTier.description.indexOf('<br>') + 4);
            descriptionDisplay.innerHTML = `${tierLabelPart}${maxedText}`;
        }
        actionButton.textContent = 'MAX UPGRADED';
        actionButton.disabled = true;
        actionButton.classList.remove('action-buy');
        delete actionButton.dataset.itemId;
        delete actionButton.dataset.itemCost;
        delete actionButton.dataset.powerupType;
      }
    } else if (itemType === 'comboCoinBonus') {
      const itemId = itemDiv.dataset.itemId;
      const itemCost = parseInt(itemDiv.dataset.itemCost); 
      const itemData = SHOP_ITEMS.comboCoinBonuses[itemId];

      if (!itemId || isNaN(itemCost) || !itemData) {
        actionButton.textContent = 'Error';
        actionButton.disabled = true;
        return;
      }

      const isOwned = localStorage.getItem(itemId) === 'true';

      if (isOwned) {
        actionButton.textContent = 'PURCHASED';
        actionButton.disabled = true;
        actionButton.classList.remove('action-buy');
      } else {
        actionButton.textContent = `Buy (${itemCost}💰)`; // Set button text to include cost
        actionButton.classList.add('action-buy');
        actionButton.dataset.itemId = itemId;
        actionButton.dataset.itemCost = itemCost; 
      }
    } else if (itemType === 'survivalUpgrade') { // NEW ELSE IF BLOCK
      const itemId = itemDiv.dataset.itemId;
      const itemCost = parseInt(itemDiv.dataset.itemCost);
      const itemData = SHOP_ITEMS.survivalUpgrades[itemId]; // Ensure this points to the correct category

      if (!itemId || isNaN(itemCost) || !itemData) {
        actionButton.textContent = 'Error';
        actionButton.disabled = true;
        return;
      }
      const isOwned = localStorage.getItem(itemId) === 'true';
      if (isOwned) {
        actionButton.textContent = 'PURCHASED';
        actionButton.disabled = true;
        actionButton.classList.remove('action-buy');
      } else {
        actionButton.textContent = `Buy (${itemCost}💰)`;
        actionButton.classList.add('action-buy');
        actionButton.dataset.itemId = itemId; // Ensure these are set for the button if not already
        actionButton.dataset.itemCost = itemCost;
      }
    }
  });
}

// Event delegation for shop action AND preview buttons
document.getElementById('shop-screen').addEventListener('click', function(event) {
  const targetButton = event.target;

  // Handle Preview Button Clicks
  if (targetButton.classList.contains('shop-preview-btn')) {
    const previewItemId = targetButton.dataset.previewItemId;
    const previewItemType = targetButton.dataset.previewItemType;
    
    stopShopTrailPreview(); // Stop any current trail preview first

    if (previewItemType === 'boardSkin') {
      updateShopPlayerPreview(previewItemId);
      // No trail starts for skin preview unless explicitly designed
    } else if (previewItemType === 'trailEffect') {
      // When previewing a trail, we might want the preview paddle to be default or a specific preview skin
      // updateShopPlayerPreview(null); // Optional: set paddle to default when previewing a trail
      startShopTrailPreview(previewItemId);
    }
    return; 
  }

  // Handle Action Button Clicks (Buy, Equip, Unequip)
  if (targetButton.classList.contains('shop-action-btn')) {
    const itemDiv = targetButton.closest('.shop-item');
    if (!itemDiv) {
        console.error("[ShopFIX] Could not find parent .shop-item for action button:", targetButton);
        return;
    }
    const itemType = itemDiv.dataset.itemType;
    
    // Get itemId and itemCost from the button itself for powerupUpgrades, as they are dynamic
    // For other types, they can be from itemDiv, but using button's data consistently is fine.
    const itemId = targetButton.dataset.itemId || itemDiv.dataset.itemId; // Prefer button, fallback to itemDiv
    const itemCostString = targetButton.dataset.itemCost || itemDiv.dataset.itemCost;
    const itemCost = parseInt(itemCostString);
    // powerupType is also on the button for powerupUpgrade type
    const powerupTypeClicked = targetButton.dataset.powerupType; 

    let currentBank = parseInt(localStorage.getItem('currentCoinBank')) || 0;
    
    if (itemType === 'boardSkin' || itemType === 'trailEffect') {
      // This is existing logic for skins and trails
      const isOwned = localStorage.getItem(`owned_${itemType}_${itemId}`) === 'true';
      let currentEquippedBoardSkin = localStorage.getItem('equipped_boardSkin');
      let currentEquippedTrailEffect = localStorage.getItem('equipped_trailEffect');

      if (!isOwned) { // --- Buy Logic for Skins/Trails ---
        if (currentBank >= itemCost) {
          currentBank -= itemCost;
          localStorage.setItem('currentCoinBank', currentBank.toString());
          localStorage.setItem(`owned_${itemType}_${itemId}`, 'true');
          let itemName = itemId; 
          if (itemType === 'boardSkin' && SHOP_ITEMS.boardSkins[itemId]) itemName = SHOP_ITEMS.boardSkins[itemId].name;
          if (itemType === 'trailEffect' && SHOP_ITEMS.trailEffects[itemId]) itemName = SHOP_ITEMS.trailEffects[itemId].name;
          showShopMessage(`${itemName} purchased!`, 'success');
          if (itemType === 'boardSkin' && !currentEquippedBoardSkin) {
            localStorage.setItem('equipped_boardSkin', itemId);
          }
        } else {
          showShopMessage('Not enough coins!', 'error');
        }
      } else { // --- Equip/Unequip Logic for Skins/Trails ---
        if (itemType === 'boardSkin') {
          if (currentEquippedBoardSkin === itemId) { 
            localStorage.removeItem('equipped_boardSkin'); 
            showShopMessage(`${SHOP_ITEMS.boardSkins[itemId].name} unequipped.`, 'info');
          } else { 
            localStorage.setItem('equipped_boardSkin', itemId);
            showShopMessage(`${SHOP_ITEMS.boardSkins[itemId].name} equipped!`, 'success');
          }
        } else if (itemType === 'trailEffect') {
          if (currentEquippedTrailEffect === itemId) { 
            localStorage.removeItem('equipped_trailEffect');
            showShopMessage(`${SHOP_ITEMS.trailEffects[itemId].name} unequipped.`, 'info');
            if (trailEffectInterval) { clearInterval(trailEffectInterval); trailEffectInterval = null; }
          } else { 
            localStorage.setItem('equipped_trailEffect', itemId);
            showShopMessage(`${SHOP_ITEMS.trailEffects[itemId].name} equipped!`, 'success');
            if (trailEffectInterval) { clearInterval(trailEffectInterval); trailEffectInterval = null; }
            if(gameRunning) applyEquippedTrailEffect(); 
          }
        }
      }
    } else if (itemType === 'powerupUpgrade') {
      // itemId here is the specific tier ID like 'slow_boost_1'
      // itemCost is the cost for that tier
      // powerupTypeClicked is 'slow', 'magnet', or 'double'
      if (!itemId || isNaN(itemCost) || !powerupTypeClicked) {
        console.error("Powerup upgrade button missing data:", targetButton);
        return;
      }

      if (currentBank >= itemCost) {
        currentBank -= itemCost;
        localStorage.setItem('currentCoinBank', currentBank.toString());
        localStorage.setItem(itemId, 'true'); // Mark this specific tier as purchased
        
        let successMessage = "Upgrade purchased!"; // Default message
        const tiers = POWERUP_UPGRADE_TIERS[powerupTypeClicked];
        const purchasedTierInfo = tiers.find(t => t.id === itemId);

        if (purchasedTierInfo) {
            // Extract "Tier X" from "Tier X:<br>Duration Y SEC"
            const tierText = purchasedTierInfo.description.split(':')[0]; 
            // Capitalize the power-up type name (e.g., slow -> Slow)
            const powerupName = powerupTypeClicked.charAt(0).toUpperCase() + powerupTypeClicked.slice(1);
            successMessage = `${tierText} for ${powerupName} purchased!`;
        }
        
        showShopMessage(successMessage, 'success');
      } else {
        showShopMessage('Not enough coins!', 'error');
      }
    } else if (itemType === 'comboCoinBonus') {
      // itemId and itemCost are already correctly parsed from the button or itemDiv data attributes.
      const itemData = SHOP_ITEMS.comboCoinBonuses[itemId];

      if (!itemId || isNaN(itemCost) || !itemData) {
        console.error("Combo/Coin Bonus button missing data or item not in SHOP_ITEMS:", targetButton, itemId);
        showShopMessage('Error processing item!', 'error');
        return;
      }
      
      // Check if already owned (though refreshShopItemStates should prevent clicking)
      if (localStorage.getItem(itemId) === 'true') {
        showShopMessage('Item already owned!', 'info');
        return;
      }

      if (currentBank >= itemCost) {
        currentBank -= itemCost;
        localStorage.setItem('currentCoinBank', currentBank.toString());
        localStorage.setItem(itemId, 'true'); // Mark this bonus as purchased using its ID as the key
        
        showShopMessage(`${itemData.name} purchased and activated!`, 'success');
      } else {
        showShopMessage('Not enough coins!', 'error');
      }
    } else if (itemType === 'survivalUpgrade') { // NEW ELSE IF BLOCK for purchase
      const itemId = targetButton.dataset.itemId || itemDiv.dataset.itemId;
      const itemCostString = targetButton.dataset.itemCost || itemDiv.dataset.itemCost;
      const itemCost = parseInt(itemCostString);
      const itemData = SHOP_ITEMS.survivalUpgrades[itemId];

      if (!itemId || isNaN(itemCost) || !itemData) {
        console.error("Survival Upgrade button missing data or item not in SHOP_ITEMS:", targetButton, itemId);
        showShopMessage('Error processing item!', 'error');
        return;
      }
      if (localStorage.getItem(itemId) === 'true') {
        showShopMessage('Item already owned!', 'info');
        return;
      }
      if (currentBank >= itemCost) {
        currentBank -= itemCost;
        localStorage.setItem('currentCoinBank', currentBank.toString());
        localStorage.setItem(itemId, 'true');
        showShopMessage(`${itemData.name} purchased and activated!`, 'success');
      } else {
        showShopMessage('Not enough coins!', 'error');
      }
    }

    // Common actions after any shop button click
    refreshShopItemStates(); 
    updateStatsDisplay(); 
    if (itemDiv && itemDiv.dataset.itemType === 'trailEffect') { // Check if itemDiv exists
        stopShopTrailPreview();
    }
  }
});

// Function to update the shop player preview element in the HUD
function updateShopPlayerPreview(skinId) {
  if (!shopPlayerPreviewElement) {
    console.error("[PreviewFIX] Shop preview element not found!"); 
    return;
  }
  console.log("[PreviewFIX] Updating shop preview with skinId:", skinId); 

  // Remove any existing skin classes first
  for (const id in SHOP_ITEMS.boardSkins) {
    shopPlayerPreviewElement.classList.remove('skin-' + id);
  }

  if (skinId && SHOP_ITEMS.boardSkins[skinId]) {
    shopPlayerPreviewElement.classList.add('skin-' + skinId);
    console.log("[PreviewFIX] Applied skin class:", 'skin-' + skinId, "to", shopPlayerPreviewElement); 
  } else {
    console.log("[PreviewFIX] No valid skinId or skin not in SHOP_ITEMS.boardSkins, preview element should show default. Skin ID was:", skinId); 
  }
}

// --- SHOP TRAIL PREVIEW FUNCTIONS ---
function stopShopTrailPreview() {
  if (shopPreviewTrailInterval) {
    clearInterval(shopPreviewTrailInterval);
    shopPreviewTrailInterval = null;
  }
  // Remove any existing trail particles from the preview HUD
  const previewHud = document.getElementById('shop-item-preview-hud');
  if (previewHud) {
    const existingParticles = previewHud.querySelectorAll('.trail-particle-preview');
    existingParticles.forEach(p => p.remove());
  }
}

function startShopTrailPreview(trailId) {
  stopShopTrailPreview(); // Stop any existing trail preview first
  if (!trailId || !SHOP_ITEMS.trailEffects[trailId] || !shopPlayerPreviewElement) {
    return; // Invalid trail or preview element not found
  }

  const previewHud = document.getElementById('shop-item-preview-hud');
  if (!previewHud) return;

  shopPreviewTrailInterval = setInterval(() => {
    const particle = document.createElement('div');
    // Add a distinct class for preview particles to avoid conflict and for specific removal
    particle.classList.add('trail-particle', 'trail-particle-preview'); 
    let particleTypeClass = '';

    // Set random values for CSS custom properties
    particle.style.setProperty('--random-xs', (Math.random() * 2 - 1).toFixed(2));
    particle.style.setProperty('--random-xl', (Math.random() * 2 - 1).toFixed(2));
    particle.style.setProperty('--random-angle', (Math.random() * 90 - 45).toFixed(0));

    if (trailId === 'fireSparks') particleTypeClass = 'trail-fire-spark';
    else if (trailId === 'digitalLineTrail') particleTypeClass = 'trail-digital-line';
    else if (trailId === 'electricStatic') particleTypeClass = 'trail-electric-static';
    else {
      stopShopTrailPreview(); // Unknown trail, stop everything
      return;
    }
    particle.classList.add(particleTypeClass);

    const previewPaddleRect = shopPlayerPreviewElement.getBoundingClientRect();
    const hudRect = previewHud.getBoundingClientRect();

    // Calculate initial particle dimensions based on trail type for positioning
    // These should roughly match the particle's CSS dimensions or be an average
    let pWidth = 6, pHeight = 6;
    if (trailId === 'digitalLineTrail') { pWidth = 15; pHeight = 3; }
    else if (trailId === 'electricStatic') { pWidth = 2; pHeight = 8; } 

    // Position relative to the #shop-player-preview-element, but within the #shop-item-preview-hud
    let particleX = (shopPlayerPreviewElement.offsetLeft + shopPlayerPreviewElement.offsetWidth / 2) - (pWidth / 2);
    let particleY = (shopPlayerPreviewElement.offsetTop + shopPlayerPreviewElement.offsetHeight / 2) - (pHeight / 2);
    
    // Adjustments similar to actual game trail, but relative to the preview paddle
    if (trailId === 'fireSparks') {
        particleX += (Math.random() - 0.5) * shopPlayerPreviewElement.offsetWidth * 0.7;
        particleY += shopPlayerPreviewElement.offsetHeight * 0.3;
    } else if (trailId === 'digitalLineTrail') {
        particleY = shopPlayerPreviewElement.offsetTop + shopPlayerPreviewElement.offsetHeight - (pHeight / 2) + 5;
        // particleX remains centered for digital line for this preview
    } else if (trailId === 'electricStatic') {
        particleX += (Math.random() - 0.5) * shopPlayerPreviewElement.offsetWidth * 0.9;
        particleY += (Math.random() - 0.5) * shopPlayerPreviewElement.offsetHeight * 0.9;
    }

    particle.style.left = particleX + 'px';
    particle.style.top = particleY + 'px';

    previewHud.appendChild(particle); // Append to HUD to allow overflow if animations go outside paddle

    let animationDuration = 500; // Default
    if (trailId === 'digitalLineTrail') animationDuration = 400;
    if (trailId === 'electricStatic') animationDuration = 250;
    if (trailId === 'fireSparks') animationDuration = 600;

    setTimeout(() => {
      particle.remove();
    }, animationDuration);
  }, 90); // Interval for spawning preview particles, adjust for density
}

// Helper function to determine max health based on upgrade
function getMaxHealth() {
  if (localStorage.getItem('heart_upgrade_max4') === 'true') {
    return 4;
  }
  return 3;
}
