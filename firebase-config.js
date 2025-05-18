const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  };
  
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  
  // Get a reference to the Firestore database service
  const db = firebase.firestore();
  
  // Helper function to submit a score to the leaderboard
  function submitScoreToLeaderboard(playerName, score) {
    return db.collection("leaderboard").add({
      name: playerName || "Anonymous",
      score: score,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
  
  // Helper function to get top scores from the leaderboard
  function getTopScores(limit = 10) {
    return db.collection("leaderboard")
      .orderBy("score", "asc") // Lower time is better
      .limit(limit)
      .get()
      .then(snapshot => {
        const scores = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          scores.push({
            id: doc.id,
            name: data.name,
            score: data.score,
            timestamp: data.timestamp
          });
        });
        return scores;
      });
  }
  
  // Anonymous sign in helper
  function signInAnonymously() {
    return firebase.auth().signInAnonymously();
  }