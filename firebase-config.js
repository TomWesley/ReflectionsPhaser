// Firebase Configuration for Reflection Game
// Replace with your actual Firebase project configuration

// Your Firebase configuration object
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
  };
  
  // Initialize Firebase (only if config is properly set)
  let db = null;
  let auth = null;
  
  try {
    if (firebaseConfig.apiKey !== "your-api-key") {
      // Only initialize if real config is provided
      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      auth = firebase.auth();
      console.log('Firebase initialized successfully');
    } else {
      console.log('Firebase not configured - using local mode');
    }
  } catch (error) {
    console.error('Firebase initialization failed:', error);
  }
  
  // Leaderboard functions
  async function saveScore(playerName, score) {
    if (!db) {
      console.log('Firebase not available - score not saved');
      return false;
    }
    
    try {
      await db.collection('leaderboard').add({
        name: playerName,
        score: score,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('Score saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving score:', error);
      return false;
    }
  }
  
  async function getTopScores(limit = 10) {
    if (!db) {
      // Return mock data when Firebase is not available
      return [
        { name: 'Alex Chen', score: 12.543, timestamp: new Date() },
        { name: 'Sarah Kim', score: 15.234, timestamp: new Date() },
        { name: 'Mike Johnson', score: 18.765, timestamp: new Date() },
        { name: 'Emma Davis', score: 22.123, timestamp: new Date() },
        { name: 'David Wilson', score: 25.678, timestamp: new Date() },
        { name: 'Lisa Park', score: 28.456, timestamp: new Date() },
        { name: 'Ryan Taylor', score: 31.234, timestamp: new Date() },
        { name: 'Anna Martinez', score: 34.567, timestamp: new Date() },
        { name: 'Tom Anderson', score: 37.890, timestamp: new Date() },
        { name: 'Maya Patel', score: 41.123, timestamp: new Date() }
      ];
    }
    
    try {
      const snapshot = await db.collection('leaderboard')
        .orderBy('score', 'asc')
        .limit(limit)
        .get();
      
      const scores = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        scores.push({
          id: doc.id,
          name: data.name,
          score: data.score,
          timestamp: data.timestamp?.toDate() || new Date()
        });
      });
      
      return scores;
    } catch (error) {
      console.error('Error fetching scores:', error);
      throw error;
    }
  }
  
  // User authentication functions (optional)
  async function signInAnonymously() {
    if (!auth) {
      console.log('Firebase auth not available');
      return null;
    }
    
    try {
      const result = await auth.signInAnonymously();
      console.log('Signed in anonymously');
      return result.user;
    } catch (error) {
      console.error('Anonymous sign-in failed:', error);
      return null;
    }
  }
  
  // Analytics functions (if using Firebase Analytics)
  function trackGameStart() {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'game_start', {
        event_category: 'engagement',
        event_label: 'reflection_game'
      });
    }
    
    if (firebase.analytics) {
      firebase.analytics().logEvent('game_start');
    }
  }
  
  function trackGameComplete(score, reflections) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'game_complete', {
        event_category: 'engagement',
        event_label: 'reflection_game',
        value: Math.round(score * 100) // Convert to integer for analytics
      });
    }
    
    if (firebase.analytics) {
      firebase.analytics().logEvent('level_end', {
        level_name: 'reflection_puzzle',
        success: true,
        score: score,
        reflections: reflections
      });
    }
  }
  
  function trackGameTimeout() {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'game_timeout', {
        event_category: 'engagement',
        event_label: 'reflection_game'
      });
    }
    
    if (firebase.analytics) {
      firebase.analytics().logEvent('level_end', {
        level_name: 'reflection_puzzle',
        success: false
      });
    }
  }
  
  // Performance monitoring (if using Firebase Performance)
  function initPerformanceMonitoring() {
    if (firebase.performance) {
      const perf = firebase.performance();
      
      // Custom traces
      const gameLoadTrace = perf.trace('game_load');
      gameLoadTrace.start();
      
      window.addEventListener('load', () => {
        gameLoadTrace.stop();
      });
      
      // Monitor game performance
      const gameplayTrace = perf.trace('gameplay_session');
      
      document.addEventListener('gamestart', () => {
        gameplayTrace.start();
      });
      
      document.addEventListener('gamestop', () => {
        gameplayTrace.stop();
      });
    }
  }
  
  // Initialize performance monitoring
  if (typeof firebase !== 'undefined' && firebase.performance) {
    initPerformanceMonitoring();
  }
  
  // Export functions for use in other files
  window.firebaseUtils = {
    saveScore,
    getTopScores,
    signInAnonymously,
    trackGameStart,
    trackGameComplete,
    trackGameTimeout,
    isAvailable: !!db
  };
  
  // Auto sign-in anonymously for analytics (optional)
  if (auth) {
    auth.onAuthStateChanged((user) => {
      if (!user) {
        signInAnonymously();
      }
    });
  }