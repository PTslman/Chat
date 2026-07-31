// ============================================================
// 🚀 APP MAIN - نيزك v3.5.0
// ============================================================

console.log('🚀 نيزك ' + window.VERSION + ' - أقدم فوق، أحدث تحت');
console.log('👑 المسؤول: ' + window.ADMIN_NAME);

// ============================================================
// DOM REFS
// ============================================================
const rulesBtn = document.getElementById('rulesBtn');
const rulesModal = document.getElementById('rulesModal');
const closeRulesModal = document.getElementById('closeRulesModal');
const themeToggle = document.getElementById('themeToggle');
const themeOptions = document.getElementById('themeOptions');
const scrollBottomBtn = document.getElementById('scrollBottomBtn');
const emojiToggle = document.getElementById('emojiToggle');
const emojiRail = document.getElementById('emojiRail');
const messagesDiv = document.getElementById('messages');
const usernameInput = document.getElementById('usernameInput');
const loginAdminPasswordBox = document.getElementById('loginAdminPasswordBox');
const loginAdminPasswordInput = document.getElementById('loginAdminPasswordInput');
const loginAdminPasswordError = document.getElementById('loginAdminPasswordError');
const loginBtn = document.getElementById('loginBtn');
const sendBtn = document.getElementById('sendBtn');
const msgInput = document.getElementById('msgInput');
const logoutBtn = document.getElementById('logoutBtn');

// ============================================================
// ⏰ CLOCK
// ============================================================
function updateClock() {
    const n = new Date();
    const statusTime = document.getElementById('statusTime');
    if (statusTime) {
        statusTime.textContent = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
    }
}
updateClock();
setInterval(updateClock, 30000);

// ============================================================
// 📶 مراقبة الاتصال
// ============================================================
function monitorConnection() {
    if (!window.db) return;
    
    // استخدام onSnapshot لمراقبة الاتصال
    window.db.collection('users').limit(1).onSnapshot(
        () => {
            console.log('✅ الاتصال بقاعدة البيانات نشط');
            const connectionError = document.getElementById('connectionError');
            if (connectionError) {
                connectionError.style.display = 'none';
            }
        },
        (error) => {
            console.warn('⚠️ فقدان الاتصال بقاعدة البيانات:', error.message);
            const connectionError = document.getElementById('connectionError');
            if (connectionError) {
                connectionError.textContent = '⚠️ غير متصل بالإنترنت - جاري العمل بدون اتصال';
                connectionError.style.display = 'block';
            }
        }
    );
}

// بدء مراقبة الاتصال بعد 2 ثانية
setTimeout(monitorConnection, 2000);

// ============================================================
// 🎨 COLOR PICKER
// ============================================================
document.querySelectorAll('.color-circle').forEach((el) => {
    el.addEventListener('click', function() {
        document.querySelectorAll('.color-circle').forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
        window.userColor = this.dataset.color;
    });
});

// ============================================================
// 😊 EMOJI
// ============================================================
if (emojiToggle) {
    emojiToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (emojiRail) {
            emojiRail.classList.toggle('active');
            emojiToggle.classList.toggle('active');
        }
    });
}

document.addEventListener('click', (e) => {
    if (emojiRail && emojiToggle) {
        if (!emojiRail.contains(e.target) && e.target !== emojiToggle && !emojiToggle.contains(e.target)) {
            emojiRail.classList.remove('active');
            emojiToggle.classList.remove('active');
        }
    }
});

document.querySelectorAll('.emoji-item').forEach((el) => {
    el.addEventListener('click', function() {
        if (msgInput) {
            msgInput.value += this.textContent;
            msgInput.focus();
        }
        if (emojiRail) emojiRail.classList.remove('active');
        if (emojiToggle) emojiToggle.classList.remove('active');
    });
});

// ============================================================
// 🌓 THEME EVENTS
// ============================================================
if (themeToggle) {
    themeToggle.addEventListener('click', window.toggleTheme);
}

document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.addEventListener('click', function() {
        if (!window.isAdmin || !window.isAdminVerified) return;
        window.applyTheme(this.dataset.theme);
    });
});

// ============================================================
// 📋 RULES MODAL
// ============================================================
if (rulesBtn) {
    rulesBtn.addEventListener('click', () => {
        if (rulesModal) rulesModal.classList.toggle('active');
    });
}

if (closeRulesModal) {
    closeRulesModal.addEventListener('click', () => {
        if (rulesModal) rulesModal.classList.remove('active');
    });
}

if (rulesModal) {
    rulesModal.addEventListener('click', (e) => {
        if (e.target === rulesModal) rulesModal.classList.remove('active');
    });
}

// ============================================================
// 👑 ADMIN LOGIN DETECTION
// ============================================================
if (usernameInput) {
    usernameInput.addEventListener('input', function() {
        const val = this.value.trim();
        if (val === window.ADMIN_NAME) {
            if (loginAdminPasswordBox) loginAdminPasswordBox.style.display = 'block';
            if (loginAdminPasswordInput) loginAdminPasswordInput.value = '';
            if (loginAdminPasswordError) loginAdminPasswordError.classList.remove('show');
            window.isAdminLoginAttempt = true;
        } else {
            if (loginAdminPasswordBox) loginAdminPasswordBox.style.display = 'none';
            window.isAdminLoginAttempt = false;
        }
    });
}

// ============================================================
// 🖱️ SCROLL TO BOTTOM
// ============================================================
if (messagesDiv) {
    messagesDiv.addEventListener('scroll', function() {
        const atBottom = messagesDiv.scrollTop + messagesDiv.clientHeight >= messagesDiv.scrollHeight - 50;
        if (scrollBottomBtn) scrollBottomBtn.classList.toggle('show', !atBottom);
    });
}

if (scrollBottomBtn) {
    scrollBottomBtn.addEventListener('click', () => {
        if (messagesDiv) messagesDiv.scrollTo({ top: messagesDiv.scrollHeight, behavior: 'smooth' });
    });
}

// ============================================================
// 🎯 EVENTS - LOGIN
// ============================================================
if (loginBtn) {
    loginBtn.addEventListener('click', window.login);
}

if (usernameInput) {
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            if (window.isAdminLoginAttempt && loginAdminPasswordInput) {
                loginAdminPasswordInput.focus();
            } else {
                window.login();
            }
        }
    });
}

if (loginAdminPasswordInput) {
    loginAdminPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            window.login();
        }
    });
}

// ============================================================
// 🎯 EVENTS - SEND
// ============================================================
if (sendBtn) {
    sendBtn.addEventListener('click', window.sendMessage);
}

if (msgInput) {
    msgInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') window.sendMessage();
    });

    msgInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (window.editingMessage) {
                window.editingMessage = null;
                if (sendBtn) {
                    sendBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
                    sendBtn.style.background = '';
                }
                if (msgInput) msgInput.value = '';
            }
            window.clearReply();
        }
    });
}

// ============================================================
// 🎯 EVENTS - LOGOUT
// ============================================================
if (logoutBtn) {
    logoutBtn.addEventListener('click', window.logout);
}

// ============================================================
// 🔐 AUTH STATE
// ============================================================
if (window.auth) {
    window.auth.onAuthStateChanged((user) => {
        if (!user && !window.isLoggedIn) {
            const loginOverlay = document.getElementById('loginOverlay');
            const chatContainer = document.getElementById('chatContainer');
            if (loginOverlay) loginOverlay.classList.remove('hidden');
            if (chatContainer) chatContainer.style.display = 'none';
            window.showLoading(false);
        }
    });
}

// ============================================================
// 🔍 CHECK FORCE LOGOUT
// ============================================================
setInterval(window.checkForceLogout, 5000);

// ============================================================
// 🚀 AUTO LOGIN
// ============================================================
function autoLogin() {
    window.loadSavedTheme();
    const infoMsg = document.getElementById('infoMsg');
    if (infoMsg) {
        infoMsg.textContent = '👋 أدخل اسمك ثم اضغط دخول';
        infoMsg.classList.add('show');
        setTimeout(() => infoMsg.classList.remove('show'), 3000);
    }
}

// ============================================================
// 🚀 START
// ============================================================
window.userIP = window.getHashedIP();
autoLogin();

console.log('✅ تم تحميل app.js');
console.log('✅ جميع الملفات جاهزة!');
