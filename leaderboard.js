// Online leaderboard functions for MEMOMU game
// Fallback implementation for environments where Firebase is not available

let db = null;

// Try to initialize Firebase, fallback to mock if not available
try {
  const { db: firebaseDb } = await import('./firebase.js');
  db = firebaseDb;
} catch (error) {
  console.warn('Firebase not available, using local storage fallback for online scores');
}

/**
 * Save a score to the online leaderboard
 * @param {string} mode - Game mode (musicMemory, memoryClassic, memoryMemomu, monluck, battle)
 * @param {number} score - Player's score
 * @param {string} name - Player's name
 * @param {string} walletAddress - Player's wallet address (optional)
 * @param {Object} extraData - Additional data for specialized leaderboards (optional)
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function saveScore(mode, score, name, walletAddress = null, extraData = null) {
  if (!db) {
    // Fallback to localStorage for testing
    try {
      const onlineScoresKey = `onlineScores_${mode}`;
      const existingScores = JSON.parse(localStorage.getItem(onlineScoresKey) || '[]');

      const scoreData = {
        type: mode, // Use 'type' for consistency!
        score,
        name,
        walletAddress,
        timestamp: new Date().toISOString(),
        ...extraData
      };

      existingScores.push(scoreData);
      existingScores.sort((a, b) => (b.score ?? b.winCount ?? 0) - (a.score ?? a.winCount ?? 0));
      existingScores.splice(10); // Keep only top 10

      localStorage.setItem(onlineScoresKey, JSON.stringify(existingScores));
      console.log('Score saved to local storage (fallback)');
      return true;
    } catch (error) {
      console.error('Error saving score to local storage:', error);
      return false;
    }
  }

  try {
    const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js');
    const scoreData = {
      type: mode,
      score,
      name,
      walletAddress,
      timestamp: new Date().toISOString(),
      ...extraData
    };
    await addDoc(collection(db, 'specializedLeaderboards'), scoreData);
    return true;
  } catch (error) {
    console.error('Error saving score to Firebase:', error);
    return false;
  }
}

/**
 * Save specialized leaderboard data (Monluck or Battle)
 * @param {string} type - 'monluck' or 'battle'
 * @param {Object} playerData - Player data object
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function saveSpecializedLeaderboard(type, playerData) {
  if (!db) {
    // Fallback to localStorage for testing
    try {
      const key = `specialized_${type}_leaderboard`;
      const existingData = JSON.parse(localStorage.getItem(key) || '[]');

      // Find existing player or create new entry
      const playerKey = playerData.address || playerData.name;
      let existingPlayer = existingData.find(p =>
        (p.address && p.address === playerData.address) ||
        (!p.address && p.name === playerData.name)
      );

      if (existingPlayer) {
        Object.assign(existingPlayer, playerData);
      } else {
        existingData.push(playerData);
      }

      localStorage.setItem(key, JSON.stringify(existingData));
      console.log(`Specialized ${type} leaderboard saved to local storage (fallback)`);
      return true;
    } catch (error) {
      console.error(`Error saving ${type} leaderboard to local storage:`, error);
      return false;
    }
  }

  try {
    const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js');

    // Ensure fields for monluck and battle are always present
    if (type === 'monluck') {
      playerData.fiveMonadCount = playerData.fiveMonadCount ?? 0;
      playerData.fourMonadCount = playerData.fourMonadCount ?? 0;
    }
    if (type === 'battle') {
      playerData.winCount = playerData.winCount ?? 0;
      // Ensure score is always present for frontend rendering
      playerData.score = playerData.winCount;
    } else if (playerData.score === undefined) {
      // For other types, ensure score exists
      playerData.score = 0;
    }

    const leaderboardData = {
      type,
      ...playerData,
      timestamp: new Date().toISOString()
    };

    await addDoc(collection(db, 'specializedLeaderboards'), leaderboardData);
    return true;
  } catch (error) {
    console.error(`Error saving ${type} leaderboard to Firebase:`, error);
    return false;
  }
}

/**
 * Get specialized leaderboard data (Monluck or Battle)
 * @param {string} type - 'monluck' or 'battle'
 * @param {number} limitCount - Number of entries to retrieve (default: 10)
 * @returns {Promise<Array>} Array of leaderboard objects or empty array on error
 */
export async function getSpecializedLeaderboard(type, limitCount = 10) {
  if (!db) {
    // Fallback to localStorage for testing
    try {
      const key = `specialized_${type}_leaderboard`;
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      // Normalize: ensure score exists for battle mode
      const normalized = data.map(item => ({
        ...item,
        score: item.score ?? item.winCount ?? 0
      }));
      console.log(`Retrieved ${normalized.length} ${type} leaderboard entries from local storage (fallback)`);
      return normalized.slice(0, limitCount);
    } catch (error) {
      console.error(`Error fetching ${type} leaderboard from local storage:`, error);
      return [];
    }
  }

  try {
    const { collection, getDocs, query, where, orderBy, limit } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js');
    let q;
    if (type === 'battle') {
      q = query(
        collection(db, 'specializedLeaderboards'),
        where('type', '==', type),
        orderBy('winCount', 'desc'),
        limit(limitCount)
      );
    } else if (type === 'monluck') {
      q = query(
        collection(db, 'specializedLeaderboards'),
        where('type', '==', type),
        orderBy('fiveMonadCount', 'desc'),
        orderBy('fourMonadCount', 'desc'),
        limit(limitCount)
      );
    } else {
      q = query(
        collection(db, 'specializedLeaderboards'),
        where('type', '==', type),
        orderBy('score', 'desc'),
        limit(limitCount)
      );
    }

    const querySnapshot = await getDocs(q);
    const data = [];
    querySnapshot.forEach((doc) => {
      const docData = doc.data();
      // Always provide a "score" property for frontend
      data.push({
        ...docData,
        score: docData.score ?? docData.winCount ?? 0
      });
    });
    console.log(`Fetched ${data.length} entries for ${type}:`, data);
    return data;
  } catch (error) {
    console.error(`Error fetching ${type} leaderboard from Firebase:`, error);
    return [];
  }
}

/**
 * Get high scores for a specific mode from the online leaderboard
 * @param {string} mode - Game mode (musicMemory, memoryClassic, memoryMemomu, monluck, battle)
 * @param {number} limitCount - Number of scores to retrieve (default: 10)
 * @returns {Promise<Array>} Array of score objects or empty array on error
 */
export async function getHighScores(mode, limitCount = 10) {
  if (!db) {
    // Fallback to localStorage for testing
    try {
      const onlineScoresKey = `onlineScores_${mode}`;
      const scores = JSON.parse(localStorage.getItem(onlineScoresKey) || '[]');
      // Normalize: ensure score exists for battle mode
      const normalized = scores.map(item => ({
        ...item,
        score: item.score ?? item.winCount ?? 0
      }));
      console.log(`Retrieved ${normalized.length} scores from local storage (fallback)`);
      return normalized.slice(0, limitCount);
    } catch (error) {
      console.error('Error fetching scores from local storage:', error);
      return [];
    }
  }

  try {
    const { collection, getDocs, query, where, orderBy, limit } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js');
    let q;
    if (mode === 'battle') {
      q = query(
        collection(db, 'specializedLeaderboards'),
        where('type', '==', mode),
        orderBy('winCount', 'desc'),
        limit(limitCount)
      );
    } else if (mode === 'monluck') {
      q = query(
        collection(db, 'specializedLeaderboards'),
        where('type', '==', mode),
        orderBy('fiveMonadCount', 'desc'),
        orderBy('fourMonadCount', 'desc'),
        limit(limitCount)
      );
    } else {
      q = query(
        collection(db, 'specializedLeaderboards'),
        where('type', '==', mode),
        orderBy('score', 'desc'),
        limit(limitCount)
      );
    }
    const querySnapshot = await getDocs(q);
    const scores = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Always provide a "score" property for frontend
      scores.push({
        score: data.score ?? data.winCount ?? 0,
        winCount: data.winCount,
        fiveMonadCount: data.fiveMonadCount,
        fourMonadCount: data.fourMonadCount,
        name: data.name,
        walletAddress: data.walletAddress,
        timestamp: data.timestamp
      });
    });
    console.log(`Fetched ${scores.length} scores for ${mode}:`, scores);
    return scores;
  } catch (error) {
    console.error(`Error fetching online scores for ${mode}:`, error);
    return [];
  }
}

// ----------------- LEADERBOARD RENDERING SECTION -------------------

/**
 * Render the Battle leaderboard as a clean column-aligned table
 * Call this after DOMContentLoaded or when leaderboard panel is shown.
 */
export async function renderBattleLeaderboard() {
  // Get data (use getSpecializedLeaderboard)
  const data = await getSpecializedLeaderboard('battle', 10);

  // Container
  let table = document.createElement('div');
  table.id = "leaderboardTable";
  table.className = "leaderboard-grid";

  // Header row
  table.innerHTML = `
    <div class="lb-header-cell"></div>
    <div class="lb-header-cell">Rank</div>
    <div class="lb-header-cell">Name</div>
    <div class="lb-header-cell">Wins</div>
    <div class="lb-header-cell">Wallet</div>
  `;

  // Score rows
  data.forEach((item, i) => {
    const trophy = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "";
    const displayName = item.name && item.name !== "Anonymous" ? item.name : (item.walletAddress ? "Anonymous" : "Anonymous");
    const walletShort = item.walletAddress
      ? item.walletAddress.slice(0, 6) + '...' + item.walletAddress.slice(-4)
      : '';
    const wins = item.winCount ?? item.score ?? 0;

    table.innerHTML += `
      <div class="lb-cell trophy">${trophy}</div>
      <div class="lb-cell rank">${i + 1}.</div>
      <div class="lb-cell">${displayName}</div>
      <div class="lb-cell">${wins}</div>
      <div class="lb-cell wallet">${walletShort}</div>
    `;
  });

  // Replace leaderboardTable DOM
  const oldTable = document.getElementById('leaderboardTable');
  if (oldTable) {
    oldTable.replaceWith(table);
  } else {
    // If first load, append to container
    const wrap = document.querySelector('.leaderboard-table-wrap');
    if (wrap) wrap.appendChild(table);
  }
}

// Bind tab switching and initial rendering (extendable for other modes)
window.addEventListener('DOMContentLoaded', () => {
  // Only render if leaderboard screen exists
  const lbScreen = document.getElementById('leaderboardScreen');
  if (lbScreen) {
    renderBattleLeaderboard();

    // Tab click (for demo, just rerender battle)
    document.querySelectorAll('.lb-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.lb-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // TODO: support other modes: call render for other leaderboards
        // For now, just rerender battle mode
        renderBattleLeaderboard();
      });
    });
  }
});
