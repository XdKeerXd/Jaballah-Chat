// -----------------------
// Imports (CDN ES modules)
// -----------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  writeBatch,
  Timestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// -----------------------
// Firebase configuration
// Load config from local helper. Replace values in `firebase-config.js` with your project settings.
import { firebaseConfig, ensureFirebaseConfigSet } from "./firebase-config.js";
ensureFirebaseConfigSet();

// -----------------------
// Init Firebase
// -----------------------
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

// Initialize auth state from localStorage
let isAdmin = localStorage.getItem('isAdmin') === 'true';

// Cache for user ranks
const userRanks = new Map();

// Get user rank
async function getUserRank(uid) {
  if (userRanks.has(uid)) {
    return userRanks.get(uid);
  }
  
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const rank = userDoc.data().rank || 'guest';
      userRanks.set(uid, rank);
      return rank;
    }
  } catch (error) {
    console.error('Error getting user rank:', error);
  }
  return 'guest';
}

// Send friend request
async function sendFriendRequest(targetUid) {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const targetUserRef = doc(db, 'users', targetUid);
    const targetUserDoc = await getDoc(targetUserRef);

    if (!targetUserDoc.exists()) {
      alert('User not found');
      return;
    }

    const targetUserData = targetUserDoc.data();
    if (targetUserData.friendRequests?.includes(currentUser.uid)) {
      alert('Friend request already sent');
      return;
    }

    if (targetUserData.friends?.includes(currentUser.uid)) {
      alert('Already friends with this user');
      return;
    }

    // Add friend request
    await setDoc(targetUserRef, {
      friendRequests: [...(targetUserData.friendRequests || []), currentUser.uid]
    }, { merge: true });

    alert('Friend request sent!');
  } catch (error) {
    console.error('Error sending friend request:', error);
    alert('Error sending friend request');
  }
}

// UI refs for auth & users
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfoDiv = document.getElementById("userInfo");
const usersListDiv = document.getElementById("usersList");

// Handle friend request response
async function handleFriendRequest(targetUid, accept) {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const currentUserRef = doc(db, 'users', currentUser.uid);
    const targetUserRef = doc(db, 'users', targetUid);

    const currentUserDoc = await getDoc(currentUserRef);
    const targetUserDoc = await getDoc(targetUserRef);

    if (!currentUserDoc.exists() || !targetUserDoc.exists()) {
      alert('User not found');
      return;
    }

    const currentUserData = currentUserDoc.data();
    const targetUserData = targetUserDoc.data();

    // Remove friend request
    const updatedRequests = (currentUserData.friendRequests || []).filter(id => id !== targetUid);

    if (accept) {
      // Add to friends lists
      const currentUserFriends = [...(currentUserData.friends || []), targetUid];
      const targetUserFriends = [...(targetUserData.friends || []), currentUser.uid];

      await setDoc(currentUserRef, {
        friendRequests: updatedRequests,
        friends: currentUserFriends
      }, { merge: true });

      await setDoc(targetUserRef, {
        friends: targetUserFriends
      }, { merge: true });

      alert('Friend request accepted!');
    } else {
      // Just remove the request
      await setDoc(currentUserRef, {
        friendRequests: updatedRequests
      }, { merge: true });

      alert('Friend request declined');
    }

    updateFriendsList();
  } catch (error) {
    console.error('Error handling friend request:', error);
    alert('Error handling friend request');
  }
}

// Update friends list UI
async function updateFriendsList() {
  const friendRequestsSection = document.getElementById('friendRequestsSection');
  const friendsSection = document.getElementById('friendsSection');
  const friendRequestsList = document.getElementById('friendRequests');
  const friendsList = document.getElementById('friendsList');

  if (!auth.currentUser) {
    friendRequestsSection.style.display = 'none';
    friendsSection.style.display = 'none';
    return;
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (!userDoc.exists()) return;

    const userData = userDoc.data();
    const requests = userData.friendRequests || [];
    const friends = userData.friends || [];

    // Update friend requests
    if (requests.length > 0) {
      friendRequestsSection.style.display = 'block';
      friendRequestsList.innerHTML = '';

      for (const requesterId of requests) {
        const requesterDoc = await getDoc(doc(db, 'users', requesterId));
        if (requesterDoc.exists()) {
          const requesterData = requesterDoc.data();
          const div = document.createElement('div');
          div.className = 'friend-item';
          div.innerHTML = `
            <div class="user-info">
              <span class="material-symbols-rounded">person</span>
              ${requesterData.displayName || 'Anonymous'}
              <span class="rank-badge">${requesterData.rank || 'guest'}</span>
            </div>
            <div class="actions">
              <button onclick="handleFriendRequest('${requesterId}', true)">Accept</button>
              <button class="secondary" onclick="handleFriendRequest('${requesterId}', false)">Decline</button>
            </div>
          `;
          friendRequestsList.appendChild(div);
        }
      }
    } else {
      friendRequestsSection.style.display = 'none';
    }

    // Update friends list
    if (friends.length > 0) {
      friendsSection.style.display = 'block';
      friendsList.innerHTML = '';

      for (const friendId of friends) {
        const friendDoc = await getDoc(doc(db, 'users', friendId));
        if (friendDoc.exists()) {
          const friendData = friendDoc.data();
          const div = document.createElement('div');
          div.className = 'friend-item';
          div.innerHTML = `
            <div class="user-info">
              <span class="material-symbols-rounded">person</span>
              ${friendData.displayName || 'Anonymous'}
              <span class="rank-badge">${friendData.rank || 'guest'}</span>
            </div>
          `;
          friendsList.appendChild(div);
        }
      }
    } else {
      friendsSection.style.display = 'none';
    }
  } catch (error) {
    console.error('Error updating friends list:', error);
  }
}

// Create or update a user document in 'users' collection
async function createUserDoc(user) {
  if (!user) return;
  try {
    const userData = {
      uid: user.uid,
      email: user.email || null,
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      isOnline: true,
      rank: user.email ? 'member' : 'guest',
      friends: [],
      friendRequests: []
    };

    // Get existing user data if any
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const existingData = userDoc.data();
      if (existingData.displayName) {
        userData.displayName = existingData.displayName;
        displayNameInput.value = existingData.displayName;
      }
    }

    await setDoc(doc(db, "users", user.uid), userData, { merge: true });

    // Load user settings
    const settingsDoc = await getDoc(doc(db, "userSettings", user.uid));
    if (settingsDoc.exists()) {
      const settings = settingsDoc.data();
      if (settings.lastActiveTab) {
        const targetTab = document.querySelector(`[data-tab="${settings.lastActiveTab}"]`);
        if (targetTab) targetTab.click();
      }
    }

    // Set user offline when they disconnect
    onDisconnect(ref(rtdb, `status/${user.uid}`)).set("offline");
    
    // Set user online in RTDB for real-time status
    await set(ref(rtdb, `status/${user.uid}`), "online");

  } catch (e) {
    console.error("createUserDoc error:", e);
  }
}

// Admin functionality
let chatEnabled = true;

async function showAdminStatus(message, type = 'success') {
  const adminStatus = document.getElementById('adminStatus');
  adminStatus.textContent = message;
  adminStatus.className = type;
  setTimeout(() => {
    adminStatus.className = '';
    adminStatus.textContent = '';
  }, 3000);
}

function initializeAdminFeatures() {
  const clearChatBtn = document.getElementById('clearChatBtn');
  const toggleChatBtn = document.getElementById('toggleChatBtn');
  const enableChatBtn = document.getElementById('enableChatBtn');
  const timeoutUserInput = document.getElementById('timeoutUser');
  const timeoutBtn = document.getElementById('timeoutBtn');

  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', async () => {
      try {
        const batch = writeBatch(db);
        const messagesRef = collection(db, 'messages');
        const snapshot = await getDocs(messagesRef);
        
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        document.getElementById('chat').innerHTML = '';
        showAdminStatus('Chat cleared successfully!', 'success');
      } catch (error) {
        console.error('Error clearing chat:', error);
        showAdminStatus('Error clearing chat', 'error');
      }
    });
  }

  if (toggleChatBtn && enableChatBtn) {
    toggleChatBtn.addEventListener('click', () => {
      chatEnabled = false;
      toggleChatBtn.style.display = 'none';
      enableChatBtn.style.display = 'block';
      showAdminStatus('Chat has been disabled');
    });

    enableChatBtn.addEventListener('click', () => {
      chatEnabled = true;
      toggleChatBtn.style.display = 'block';
      enableChatBtn.style.display = 'none';
      showAdminStatus('Chat has been enabled', 'success');
    });
  }

  if (timeoutBtn && timeoutUserInput) {
    timeoutBtn.addEventListener('click', async () => {
      const uid = timeoutUserInput.value.trim();
      if (!uid) {
        showAdminStatus('Please enter a user ID', 'error');
        return;
      }

      try {
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          showAdminStatus('User not found', 'error');
          return;
        }

        await setDoc(userRef, {
          timeoutUntil: Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000)) // 5 minutes timeout
        }, { merge: true });

        showAdminStatus(`User ${userDoc.data().displayName || uid} timed out for 5 minutes`, 'success');
        timeoutUserInput.value = '';
      } catch (error) {
        console.error('Error timing out user:', error);
        showAdminStatus('Error timing out user', 'error');
      }
    });
  }
}

// Check admin status and initialize features if admin
if (localStorage.getItem('isAdmin') === 'true') {
  initializeAdminFeatures();
}

// Show loading state in button
function setAuthButtonLoading(button, isLoading, originalText) {
  if (isLoading) {
    button.disabled = true;
    button.innerHTML = `
      <span class="material-symbols-rounded loading">sync</span>
      Loading...
    `;
  } else {
    button.disabled = false;
    button.innerHTML = originalText;
  }
}

// Show error message
function showAuthError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'auth-error';
  errorDiv.textContent = message;
  userInfoDiv.innerHTML = '';
  userInfoDiv.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 5000);
}

// Register
registerBtn.addEventListener("click", async () => {
  const email = emailInput.value?.trim();
  const password = passwordInput.value;
  const displayName = displayNameInput.value?.trim() || email?.split('@')[0];
  
  if (!email || !password) {
    showAuthError("Please provide both email and password");
    return;
  }

  const originalBtnHtml = registerBtn.innerHTML;
  setAuthButtonLoading(registerBtn, true);
  if (!displayName) return alert("Please set a display name");
  
  try {
    // Create user account
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user profile with display name
    await createUserDoc({
      ...cred.user,
      displayName
    });
    
    // Create initial user settings
    await setDoc(doc(db, "userSettings", cred.user.uid), {
      theme: "light",
      notifications: true,
      lastActiveTab: "chat",
      createdAt: serverTimestamp()
    });
    
    // Start listening for friend updates
    listenToFriendUpdates();
    
    // Clear inputs and show success
    emailInput.value = "";
    passwordInput.value = "";
    alert("Account created successfully! You're now signed in.");
    
    // Switch to chat tab
    document.querySelector('[data-tab="chat"]').click();
    
  } catch (err) {
    console.error("Register error:", err);
    alert(err.message);
  }
});

// Login
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value?.trim();
  const password = passwordInput.value;
  
  if (!email || !password) return alert("Please provide both email and password");
  
  try {
    // Sign in
    const cred = await signInWithEmailAndPassword(auth, email, password);
    
    // Update user document with online status
    await createUserDoc(cred.user);
    
    // Load user settings and restore state
    const settingsDoc = await getDoc(doc(db, "userSettings", cred.user.uid));
    const userDoc = await getDoc(doc(db, "users", cred.user.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.displayName) {
        displayNameInput.value = userData.displayName;
      }
    }
    
    // Start listening for friend updates
    listenToFriendUpdates();
    
    // Clear inputs
    emailInput.value = "";
    passwordInput.value = "";
    
    // Switch to last active tab or chat
    if (settingsDoc.exists()) {
      const settings = settingsDoc.data();
      const targetTab = document.querySelector(`[data-tab="${settings.lastActiveTab || 'chat'}"]`);
      if (targetTab) targetTab.click();
    }
    
    alert("Welcome back! You're now signed in.");
    
  } catch (err) {
    console.error("Login error:", err);
    alert(err.message);
  }
});

// Logout
logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    // fallback to anonymous
    await signInAnonymously(auth);
  } catch (err) {
    console.error("logout error:", err);
  }
});

// Observe auth state
onAuthStateChanged(auth, (user) => {
  if (user) {
    userInfoDiv.textContent = `Signed in: ${user.email || user.uid}`;
    createUserDoc(user);
  } else {
    userInfoDiv.textContent = "Not signed in";
  }
});

// Load users list and render add-friend buttons
// Render users list with online status and friend status
async function renderUsers(snapshot) {
  if (!auth.currentUser) return;
  
  usersListDiv.innerHTML = "";
  const myFriends = new Set();
  
  // Get current user's friends
  const friendsSnapshot = await getDocs(query(
    collection(db, "friendships"),
    where("from", "==", auth.currentUser.uid)
  ));
  
  friendsSnapshot.forEach(doc => myFriends.add(doc.data().to));
  
  // Get real-time status
  const statusSnapshot = await get(ref(rtdb, 'status'));
  const onlineStatus = statusSnapshot.val() || {};
  
  snapshot.forEach(docSnap => {
    const u = docSnap.data();
    if (u.uid === auth.currentUser.uid) return; // Skip self
    
    const el = document.createElement("div");
    el.className = "user-item";
    
    const isOnline = onlineStatus[u.uid] === "online";
    const isFriend = myFriends.has(u.uid);
    
    el.innerHTML = `
      <div class="user-info">
        <span class="status-indicator ${isOnline ? '' : 'offline'}"></span>
        <strong>${u.displayName || u.email || 'Anonymous'}</strong>
        ${isFriend ? '<span class="friend-badge">Friend</span>' : ''}
      </div>
      <div class="user-actions">
        ${!isFriend ? `
          <button class="add-friend" data-uid="${u.uid}">
            <span class="material-symbols-rounded">person_add</span>
            Add Friend
          </button>
        ` : `
          <button class="message-friend" data-uid="${u.uid}">
            <span class="material-symbols-rounded">chat</span>
            Message
          </button>
          <button class="remove-friend secondary" data-uid="${u.uid}">
            <span class="material-symbols-rounded">person_remove</span>
          </button>
        `}
      </div>
    `;
    
    // Add event listeners
    const addBtn = el.querySelector('.add-friend');
    if (addBtn) {
      addBtn.addEventListener('click', () => addFriend(u.uid));
    }
    
    const removeBtn = el.querySelector('.remove-friend');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => removeFriend(u.uid));
    }
    
    const msgBtn = el.querySelector('.message-friend');
    if (msgBtn) {
      msgBtn.addEventListener('click', () => {
        // Switch to chat tab and focus input
        document.querySelector('[data-tab="chat"]').click();
        msgBox.focus();
      });
    }
    
    usersListDiv.appendChild(el);
  });
}

// listen for users collection
onSnapshot(collection(db, "users"), (snap) => renderUsers(snap));

// Friend management functions
async function addFriend(targetUid) {
  const me = auth.currentUser;
  if (!me) return alert("Please sign in first");
  if (targetUid === me.uid) return alert("You can't add yourself as a friend");
  
  try {
    // Check if already friends
    const existingDoc = await getDocs(query(
      collection(db, "friendships"),
      where("from", "==", me.uid),
      where("to", "==", targetUid)
    ));
    
    if (!existingDoc.empty) {
      return alert("Already in your friends list");
    }
    
    // Create friendship document
    const friendshipRef = doc(collection(db, "friendships"));
    await setDoc(friendshipRef, {
      from: me.uid,
      to: targetUid,
      createdAt: serverTimestamp(),
      status: "active"
    });
    
    // Create reverse friendship for two-way relationship
    const reverseFriendshipRef = doc(collection(db, "friendships"));
    await setDoc(reverseFriendshipRef, {
      from: targetUid,
      to: me.uid,
      createdAt: serverTimestamp(),
      status: "active"
    });
    
    // Update UI
    const targetUser = await getDoc(doc(db, "users", targetUid));
    const userData = targetUser.data();
    alert(`Added ${userData.displayName || userData.email || 'User'} to friends`);
    
  } catch (e) {
    console.error("addFriend error:", e);
    alert("Error adding friend. Please try again.");
  }
}

async function removeFriend(targetUid) {
  const me = auth.currentUser;
  if (!me) return alert("Please sign in first");
  
  try {
    // Delete both directions of friendship
    const friendships = await getDocs(query(
      collection(db, "friendships"),
      where("from", "in", [me.uid, targetUid]),
      where("to", "in", [me.uid, targetUid])
    ));
    
    const batch = writeBatch(db);
    friendships.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    // Update UI
    const targetUser = await getDoc(doc(db, "users", targetUid));
    const userData = targetUser.data();
    alert(`Removed ${userData.displayName || userData.email || 'User'} from friends`);
    
  } catch (e) {
    console.error("removeFriend error:", e);
    alert("Error removing friend. Please try again.");
  }
}

// Listen for real-time friend status updates
function listenToFriendUpdates() {
  if (!auth.currentUser) return;
  
  const friendsQuery = query(
    collection(db, "friendships"),
    where("from", "==", auth.currentUser.uid)
  );
  
  return onSnapshot(friendsQuery, async (snapshot) => {
    const friendIds = snapshot.docs.map(doc => doc.data().to);
    
    // Update friends tab counter if we have friends
    const friendsTab = document.querySelector('[data-tab="friends"]');
    if (friendsTab) {
      const counter = friendIds.length > 0 ? ` (${friendIds.length})` : '';
      friendsTab.innerHTML = `
        <span class="material-symbols-rounded">group</span>
        Friends${counter}
      `;
    }
  });
}

// -----------------------
// DOM refs
// -----------------------
const chatBox = document.getElementById("chat");
const msgBox = document.getElementById("msgBox");
const sendBtn = document.getElementById("sendBtn");
const startCallBtn = document.getElementById("startCallBtn");
const answerCallBtn = document.getElementById("answerCallBtn");
const remoteAudio = document.getElementById("remoteAudio");
const callInfo = document.getElementById("callInfo");
const displayNameInput = document.getElementById("displayName");
const saveNameBtn = document.getElementById("saveNameBtn");

// Tab management
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
  tab.addEventListener('click', function() {
    const targetTab = this.getAttribute('data-tab');
    
    // Remove active class from all tabs and contents
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Add active class to clicked tab and corresponding content
    this.classList.add('active');
    document.getElementById(`${targetTab}-tab`).classList.add('active');
    
    // Save last active tab
    if (auth.currentUser) {
      setDoc(doc(db, "userSettings", auth.currentUser.uid), {
        lastActiveTab: targetTab,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  });
});

// -----------------------
// TEXT CHAT: send + listen
// -----------------------
// Get or update display name
async function updateDisplayName(newName) {
  if (!auth.currentUser) return;
  try {
    await setDoc(doc(db, "users", auth.currentUser.uid), {
      displayName: newName,
      updatedAt: serverTimestamp()
    }, { merge: true });
    localStorage.setItem('displayName', newName);
    return newName;
  } catch (err) {
    console.error("updateDisplayName error:", err);
    return null;
  }
}

// Load display name from storage or Firestore
async function loadDisplayName() {
  const stored = localStorage.getItem('displayName');
  if (stored) {
    displayNameInput.value = stored;
    return;
  }
  
  if (!auth.currentUser) return;
  try {
    const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
    if (userDoc.exists() && userDoc.data().displayName) {
      const name = userDoc.data().displayName;
      displayNameInput.value = name;
      localStorage.setItem('displayName', name);
    }
  } catch (err) {
    console.error("loadDisplayName error:", err);
  }
}

// Save name button handler
saveNameBtn.addEventListener("click", async () => {
  const newName = displayNameInput.value?.trim();
  if (!newName) return;
  const updated = await updateDisplayName(newName);
  if (updated) {
    alert("Display name updated!");
  }
});

async function sendMessage(text) {
  if (!text || !text.trim()) return;
  try {
    const displayName = displayNameInput.value?.trim() || auth.currentUser?.email || "Anonymous";
    await addDoc(collection(db, "messages"), {
      text: text.trim(),
      createdAt: serverTimestamp(),
      uid: auth.currentUser?.uid || "anon",
      displayName
    });
    msgBox.value = "";
  } catch (err) {
    console.error("sendMessage error:", err);
  }
}
window.sendMessage = sendMessage;
window.sendFriendRequest = sendFriendRequest;
window.handleFriendRequest = handleFriendRequest;
sendBtn.addEventListener("click", () => sendMessage(msgBox.value));
msgBox.addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(msgBox.value); });

// Listen for messages (ordered)
const messagesQuery = query(collection(db, "messages"), orderBy("createdAt"));
onSnapshot(messagesQuery, (snapshot) => {
  chatBox.innerHTML = "";
  snapshot.forEach(docSnap => {
    const m = docSnap.data();
    const who = (m.uid === auth.currentUser?.uid) ? "me" : "other";
    const div = document.createElement("div");
    div.className = `message ${who}`;
    
    const time = m.createdAt?.toDate();
    const timeStr = time ? new Intl.DateTimeFormat('en', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(time) : '';
    
    div.innerHTML = `
      <div class="sender">${escapeHtml(m.displayName || (who === "me" ? "You" : "User"))}</div>
      <div class="content">${escapeHtml(m.text || "")}</div>
      <div class="time">${timeStr}</div>
    `;
    chatBox.appendChild(div);
  });
  chatBox.scrollTop = chatBox.scrollHeight;
});

// small HTML escape to avoid injection
function escapeHtml(s) {
  if (!s) return "";
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

// -----------------------
// VOICE CALL (WebRTC + Firestore signaling)
// -----------------------
const servers = { iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }] };
let pc = null;
let localStream = null;

async function createPeerConnection(callDocRef, offerCandidatesRef, answerCandidatesRef) {
  pc = new RTCPeerConnection(servers);

  pc.ontrack = (event) => {
    remoteAudio.srcObject = event.streams[0];
  };

  pc.oniceconnectionstatechange = () => {
    console.log("ICE connection state:", pc?.iceConnectionState);
  };

  // when ICE candidate is found, add to Firestore
  pc.onicecandidate = (event) => {
    if (!event.candidate) return;
    const cand = event.candidate.toJSON();
    // which collection to add depends on context; caller adds to offerCandidatesRef, answerer to answerCandidatesRef
    if (offerCandidatesRef && answerCandidatesRef) {
      // We'll let calling code handle addDoc to the appropriate collection
    }
  };

  return pc;
}

// START CALL (caller)
async function startCall() {
  try {
    // require localhost/HTTPS for mic
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // create RTCPeerConnection
    pc = new RTCPeerConnection(servers);
    pc.ontrack = (e) => remoteAudio.srcObject = e.streams[0];

    // add local stream tracks
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    // create Firestore call document
    const callDocRef = doc(collection(db, "calls"));
    const offerCandidatesRef = collection(callDocRef, "offerCandidates");
    const answerCandidatesRef = collection(callDocRef, "answerCandidates");

    // ICE candidates -> store in offerCandidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(offerCandidatesRef, event.candidate.toJSON()).catch(e => console.error(e));
      }
    };

    // create offer
    const offerDesc = await pc.createOffer();
    await pc.setLocalDescription(offerDesc);

    const offer = { sdp: offerDesc.sdp, type: offerDesc.type };
    await setDoc(callDocRef, { offer, createdAt: serverTimestamp() });

    // listen for remote answer
    onSnapshot(callDocRef, (snap) => {
      const data = snap.data();
      if (!pc.currentRemoteDescription && data?.answer) {
        pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(e => console.error(e));
      }
    });

    // listen for answer ICE candidates
    onSnapshot(answerCandidatesRef, (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type === "added") {
          const c = change.doc.data();
          pc.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.error(e));
        }
      });
    });

    callInfo.textContent = `Call ID: ${callDocRef.id} — share this with the person who will answer`;
    console.log("Call created with ID:", callDocRef.id);
    alert(`Share this Call ID with the other user: ${callDocRef.id}`);
  } catch (err) {
    console.error("startCall error:", err);
    alert("Error starting call. Make sure you opened the page on localhost or https and allowed microphone access.");
  }
}
window.startCall = startCall;
startCallBtn.addEventListener("click", startCall);

// ANSWER CALL (answerer)
async function answerCall() {
  try {
    const callId = prompt("Enter Call ID to answer:");
    if (!callId) return alert("No Call ID entered.");

    const callDocRef = doc(db, "calls", callId);
    const offerCandidatesRef = collection(callDocRef, "offerCandidates");
    const answerCandidatesRef = collection(callDocRef, "answerCandidates");

    // get call data
    const callSnapshot = await getDoc(callDocRef);
    if (!callSnapshot.exists()) {
      return alert("Call ID not found.");
    }
    const callData = callSnapshot.data();

    // get local mic
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // make RTCPeerConnection
    pc = new RTCPeerConnection(servers);
    pc.ontrack = (e) => remoteAudio.srcObject = e.streams[0];

    // add local tracks
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    // add ICE -> answerCandidates collection
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(answerCandidatesRef, event.candidate.toJSON()).catch(e => console.error(e));
      }
    };

    // set remote (offer)
    const offer = callData.offer;
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    // create answer
    const answerDesc = await pc.createAnswer();
    await pc.setLocalDescription(answerDesc);

    const answer = { sdp: answerDesc.sdp, type: answerDesc.type };
    await setDoc(callDocRef, { answer }, { merge: true });

    // listen for offer candidates added by caller
    onSnapshot(offerCandidatesRef, (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type === "added") {
          const c = change.doc.data();
          pc.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.error(e));
        }
      });
    });

    // listen for caller's answerCandidates (already handled for caller)
    onSnapshot(answerCandidatesRef, (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type === "added") {
          const c = change.doc.data();
          pc.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.error(e));
        }
      });
    });

    callInfo.textContent = `Connected to call: ${callId}`;
    console.log("Answered call:", callId);
  } catch (err) {
    console.error("answerCall error:", err);
    alert("Error answering call. Make sure you opened the page on localhost or https and allowed microphone access.");
  }
}
window.answerCall = answerCall;
answerCallBtn.addEventListener("click", answerCall);
