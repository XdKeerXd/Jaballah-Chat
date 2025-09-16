Jaballah Chat — Firebase setup

This small app uses Firebase (Firestore + Auth) and WebRTC for voice calls.

Quick setup
1. Create a Firebase project at https://console.firebase.google.com and enable Firestore (in test mode) and Authentication (allow anonymous sign-in).
2. In the Firebase console, go to Project Settings → Your apps → Add a web app and copy the config object.
3. Open `firebase-config.js` and replace the placeholder values with your project config.

Install & run (optional)
- This is a static site. You can run it with any static server. Using Node's `http-server` is simple:

  npm install -g http-server
  http-server -c-1 .

- Or use Python:

  python -m http.server 3000

Notes
- For microphone access the page must be served over HTTPS or be on `localhost`.
- The repo already includes `firebase` in `package.json` but the app uses CDN Firebase SDK modules for the browser. No bundler is required.

Testing
- Open `http://localhost:3000` (or the server URL). Type a message and hit Send. It should appear in Firestore under `messages` and sync across multiple open pages.
- For calls, click Start Call on one page, copy the Call ID and paste it into Answer Call on a second page (both must be on localhost or HTTPS and have mic access).

If you want, I can help you configure security rules or switch the app to use the npm Firebase package + a bundler.
