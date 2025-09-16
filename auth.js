import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

// UI Elements
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const displayNameInput = document.getElementById("displayName");
const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userInfoDiv = document.getElementById("userInfo");

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

// Show success message
function showAuthSuccess(message) {
    userInfoDiv.innerHTML = `
        <div class="auth-success">
            ${message}
        </div>
    `;
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

    try {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);

        // Create user profile
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: displayName,
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
            rank: 'member',
            isOnline: true,
            friends: [],
            friendRequests: []
        });

        showAuthSuccess(`Registration successful! Welcome ${displayName}!`);

        // Clear inputs
        emailInput.value = '';
        passwordInput.value = '';
        displayNameInput.value = '';

    } catch (err) {
        console.error("Register error:", err);
        showAuthError(err.message || 'Error during registration');
    } finally {
        setAuthButtonLoading(registerBtn, false, originalBtnHtml);
    }
});

// Login
loginBtn.addEventListener("click", async () => {
    const email = emailInput.value?.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showAuthError("Please provide both email and password");
        return;
    }

    const originalBtnHtml = loginBtn.innerHTML;
    setAuthButtonLoading(loginBtn, true);

    try {
        const { user } = await signInWithEmailAndPassword(auth, email, password);

        // Update user's online status and last seen
        await setDoc(doc(db, 'users', user.uid), {
            lastSeen: serverTimestamp(),
            isOnline: true
        }, { merge: true });

        showAuthSuccess(`Welcome back ${user.email}!`);

        // Clear inputs
        emailInput.value = '';
        passwordInput.value = '';
        displayNameInput.value = '';

    } catch (err) {
        console.error("Login error:", err);
        showAuthError(err.message || 'Error during login');
    } finally {
        setAuthButtonLoading(loginBtn, false, originalBtnHtml);
    }
});

// Logout
logoutBtn.addEventListener("click", async () => {
    const originalBtnHtml = logoutBtn.innerHTML;
    setAuthButtonLoading(logoutBtn, true);

    try {
        const userId = auth.currentUser?.uid;
        if (userId) {
            // Update user's online status
            await setDoc(doc(db, 'users', userId), {
                lastSeen: serverTimestamp(),
                isOnline: false
            }, { merge: true });
        }

        await signOut(auth);
        showAuthSuccess('Logged out successfully');

    } catch (err) {
        console.error("Logout error:", err);
        showAuthError(err.message || 'Error during logout');
    } finally {
        setAuthButtonLoading(logoutBtn, false, originalBtnHtml);
    }
});

// Auth state changes
onAuthStateChanged(auth, async user => {
    const authUI = document.getElementById('authUI');
    const userInfo = document.getElementById('userInfo');
    const friendRequestsSection = document.getElementById('friendRequestsSection');
    const friendsSection = document.getElementById('friendsSection');

    if (user) {
        // Get user data
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : null;
        const displayName = userData?.displayName || user.email?.split('@')[0] || 'Anonymous';
        const rank = userData?.rank || 'member';

        // Update UI
        registerBtn.style.display = 'none';
        loginBtn.style.display = 'none';
        logoutBtn.style.display = '';
        emailInput.parentElement.style.display = 'none';
        passwordInput.parentElement.style.display = 'none';
        displayNameInput.parentElement.style.display = 'none';

        userInfo.innerHTML = `
            <div class="auth-success">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span class="material-symbols-rounded">account_circle</span>
                    ${displayName}
                    <span class="rank-badge">${rank}</span>
                </div>
                <div style="font-size:12px;opacity:0.8;margin-top:4px;">
                    ${user.email}
                </div>
            </div>
        `;

        // Show friend sections if user is logged in
        friendRequestsSection.style.display = 'block';
        friendsSection.style.display = 'block';

    } else {
        // Reset UI for logged out state
        registerBtn.style.display = '';
        loginBtn.style.display = '';
        logoutBtn.style.display = 'none';
        emailInput.parentElement.style.display = '';
        passwordInput.parentElement.style.display = '';
        displayNameInput.parentElement.style.display = '';
        userInfo.textContent = '';

        // Hide friend sections
        friendRequestsSection.style.display = 'none';
        friendsSection.style.display = 'none';
    }
});
