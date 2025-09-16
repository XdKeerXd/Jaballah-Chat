// Notification handling
function showNotification(message, duration = 3000) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, duration);
}

// Request notification permission
async function requestNotificationPermission() {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            showNotification('Notifications enabled!');
        }
    }
}

// Show chat notification
function showChatNotification(sender, message) {
    if (document.hidden && Notification.permission === 'granted') {
        const notification = new Notification('New message from ' + sender, {
            body: message,
            icon: 'icon.svg'
        });
        
        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    }
}

// Admin event creation
async function createEvent() {
    const eventName = document.getElementById('eventName').value;
    const eventDate = document.getElementById('eventDate').value;
    
    if (!eventName || !eventDate) {
        showNotification('Please fill in all event details');
        return;
    }

    try {
        await db.collection('events').add({
            name: eventName,
            date: new Date(eventDate),
            createdBy: auth.currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showNotification('Event created successfully!');
        document.getElementById('eventName').value = '';
        document.getElementById('eventDate').value = '';
    } catch (error) {
        showNotification('Error creating event: ' + error.message);
    }
}

// Copy code functionality
function copyCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        showNotification('Code copied to clipboard!');
    }).catch(err => {
        showNotification('Failed to copy code');
    });
}

// Generate invitation code
async function generateNewCode() {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
        await db.collection('inviteCodes').add({
            code: code,
            createdBy: auth.currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            used: false
        });
        showNotification('New code generated!');
        updateCodeList();
    } catch (error) {
        showNotification('Error generating code: ' + error.message);
    }
}

// Update code list
async function updateCodeList() {
    const codeList = document.getElementById('codeList');
    const codesSnapshot = await db.collection('inviteCodes')
        .where('createdBy', '==', auth.currentUser.uid)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
    
    codeList.innerHTML = '';
    codesSnapshot.forEach(doc => {
        const codeData = doc.data();
        const codeElement = document.createElement('div');
        codeElement.className = 'code-item';
        codeElement.innerHTML = `
            <span>${codeData.code}</span>
            <button onclick="copyCode('${codeData.code}')">
                <span class="material-symbols-rounded">content_copy</span>
            </button>
        `;
        codeList.appendChild(codeElement);
    });
}

// Enhanced message handling
function enhanceMessage(message, isAdmin = false) {
    if (isAdmin) {
        return `<p class="me admin-message">${message}</p>`;
    }
    return `<p class="me">${message}</p>`;
}
