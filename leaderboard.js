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
      existingScores.sort((a, b) => b.score - a.score);
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
      console.log(`Retrieved ${data.length} ${type} leaderboard entries from local storage (fallback)`);
      return data.slice(0, limitCount);
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
      data.push(docData);
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
      console.log(`Retrieved ${scores.length} scores from local storage (fallback)`);
      return scores.slice(0, limitCount);
    } catch (error) {
      console.error('Error fetching scores from local storage:', error);
      return [];
    }
  }

  try {
    const { collection, getDocs, query, where, orderBy, limit } = await import('https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js');
    const q = query(
      collection(db, 'specializedLeaderboards'),
      where('type', '==', mode),
      orderBy('score', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    const scores = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      scores.push({
        score: data.score,
        name: data.name,
        walletAddress: data.walletAddress,
        timestamp: data.timestamp
      });
    });
    return scores;
  } catch (error) {
    console.error('Error fetching scores from Firebase:', error);
    return [];
  }
}
