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
        type: mode, // Use type instead of mode for consistency!
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
  type: mode, // <-- CHANGE 'mode' to 'type' for Firestore field!
  score,
  name,
  walletAddress,
  timestamp: new Date().toISOString(),
  ...extraData
};

await addDoc(collection(db, 'specializedLeaderboards'), scoreData); // <-- CHANGE collection name!
    return true;
  } catch (error) {
    console.error('Error saving score to Firebase:', error);
    return false;
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
    
    // Already sorted by score descending, just return
    return scores;
  } catch (error) {
    console.error('Error fetching scores from Firebase:', error);
    return [];
  }
}

// ... (your other functions like saveSpecializedLeaderboard, getSpecializedLeaderboard remain unchanged)
