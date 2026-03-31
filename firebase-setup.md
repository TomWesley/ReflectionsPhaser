# Firebase Setup Instructions

## 1. Enable Authentication
- Go to Firebase Console > Authentication > Sign-in method
- Enable **Anonymous** sign-in provider
- Enable **Google** sign-in provider
- Enable **Email/Password** sign-in provider

## 2. Create Firestore Database
- Go to Firebase Console > Firestore Database > Create database
- Start in **production mode**
- Choose a location (e.g., us-central1)

### Firestore Security Rules
Paste these in Firestore > Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scores/{scoreId} {
      // Anyone can read the leaderboard
      allow read: if true;

      // Only authenticated users can create their own scores
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid
        && scoreId.matches(request.auth.uid + '_.*')
        && request.resource.data.score >= 0
        && request.resource.data.score <= 300
        && request.resource.data.mode in ['main', 'daily'];

      // Update only if new score is higher (prevents downgrading)
      allow update: if request.auth != null
        && request.resource.data.uid == request.auth.uid
        && resource.data.uid == request.auth.uid
        && request.resource.data.score >= resource.data.score
        && request.resource.data.score <= 300;

      // No deletes from clients
      allow delete: if false;
    }
  }
}
```

### Firestore Indexes
Create these composite indexes in Firestore > Indexes:

1. Collection: `scores` | Fields: `mode ASC, score DESC`
2. Collection: `scores` | Fields: `mode ASC, dailyDate ASC, score DESC`
3. Collection: `scores` | Fields: `mode ASC, timestamp ASC, score DESC`

**Note:** Firestore will auto-prompt you to create indexes when queries fail. You can also click the error links in the browser console to auto-create them.

## 3. Enable Firebase Storage
- Go to Firebase Console > Storage > Get started

### Storage Security Rules
Paste these in Storage > Rules:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Replay videos - organized by user UID
    match /replays/{uid}/{filename} {
      // Anyone can view replay videos (for leaderboard)
      allow read: if true;

      // Only the owner can upload their own replays
      allow write: if request.auth != null
        && request.auth.uid == uid
        && request.resource.size < 50 * 1024 * 1024
        && request.resource.contentType.matches('video/.*');
    }
  }
}
```

## 4. Verify CORS (if needed for video access)
Videos are stored for admin review only, but if you need direct access:
Create a `cors.json` file:
```json
[
  {
    "origin": ["*"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]
```
Then run: `gsutil cors set cors.json gs://reflections-n6czi`

## Architecture Summary

### Score Document Structure (`scores` collection)
```
scores/{uid}_main         - Main game best score
scores/{uid}_{YYYY-MM-DD} - Daily challenge score per day

Fields:
  uid: string
  displayName: string
  mode: "main" | "daily"
  dailyDate: string | null
  score: number (seconds, 0-300)
  scoreFormatted: string ("M:SS.CC")
  timestamp: Timestamp
  videoPath: string | null (Firebase Storage path)
  mirrorCount: number
  spawnerCount: number
```

### Anti-Cheat Measures
- **Firestore rules**: Score 0-300, only increase, user can only write own docs
- **Video evidence**: Top 10 main game scores auto-upload gameplay video
- **One score per user**: Document ID scheme enforces uniqueness
- **Anonymous + Google auth**: Persistent browser identity, optional Google for cross-device
- **Storage bucket**: gs://reflections-n6czi (videos for admin review only, not displayed in app)
