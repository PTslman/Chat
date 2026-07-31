// ============================================================
// 🚀 APP MAIN - نيزك v3.5.0
// ============================================================

console.log('🚀 نيزك ' + window.VERSION + ' - أقدم فوق، أحدث تحت');
console.log('👑 المسؤول: ' + window.ADMIN_NAME);

// ============================================================
// DOM REFS
// ============================================================
var rulesBtn = document.getElementById('rulesBtn');
var rulesModal = document.getElementById('rulesModal');
var closeRulesModal = document.getElementById('closeRulesModal');
var themeToggle = document.getElementById('themeToggle');
var themeOptions = document.getElementById('themeOptions');
var scrollBottomBtn = document.getElementById('scrollBottomBtn');
var emojiToggle = document.getElementById('emojiToggle');
var emojiRail = document.getElementById('emojiRail');
var messagesDiv = document.getElementById('messages');

// التأكد من أن db و auth موجودين
if (typeof window.db === 'undefined') {
    console.error('❌ Firebase غير مهيأ! تأكد من تحميل firebase-init.js');
}

// ============================================================
// ⏰ CLOCK
// ============================================================
function updateClock() {
    var n = new Date();
    var statusTime = document.getElementById('statusTime');
    if (statusTime) {
        statusTime.textContent = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
    }
}
updateClock();
setInterval(updateClock, 30000);

// ============================================================
// 🎨 COLOR PICKER
// ============================================================
document.querySelectorAll('.color-circle').forEach(function(el) {
    el.addEventListener('click', function() {
        document.querySelectorAll('.color-circle').forEach(function(c) { c.classList.remove('selected'); });
        this.classList.add('selected');
        window.userColor = this.dataset.color;
    });
});

// ============================================================
// 😊 EMOJI
// ============================================================
if (emojiToggle) {
    emojiToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        if (emojiRail) {
            emojiRail.classList.toggle('active');
            emojiToggle.classList.toggle('active');
        }
    });
}

document.addEventListener('click', function(e) {
    if (emojiRail && emojiToggle) {
        if (!emojiRail.contains(e.target) && e.target !== emojiToggle && !emojiToggle.contains(e.target)) {
            emojiRail.classList.remove('active');
            emojiToggle.classList.remove('active');
        }
    }
});

document.querySelectorAll('.emoji-item').forEach(function(el) {
    el.addEventListener('click', function() {
        var msgInput = document.getElementById('msgInput');
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

document.querySelectorAll('.theme-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        if (!window.isAdmin || !window.isAdminVerified) return;
        window.applyTheme(this.dataset.theme);
    });
});

// ============================================================
// 📋 RULES MODAL
// ============================================================
if (rulesBtn) {
    rulesBtn.addEventListener('click', function() { 
        if (rulesModal) rulesModal.classList.toggle('active'); 
    });
}

if (closeRulesModal) {
    closeRulesModal.addEventListener('click', function() { 
        if (rulesModal) rulesModal.classList.remove('active'); 
    });
}

if (rulesModal) {
    rulesModal.addEventListener('click', function(e) { 
        if (e.target === rulesModal) rulesModal.classList.remove('active'); 
    });
}

// ============================================================
// 👑 ADMIN LOGIN DETECTION
// ============================================================
var usernameInput = document.getElementById('usernameInput');
var loginAdminPasswordBox = document.getElementById('loginAdminPasswordBox');
var loginAdminPasswordInput = document.getElementById('loginAdminPasswordInput');
var loginAdminPasswordError = document.getElementById('loginAdminPasswordError');

if (usernameInput) {
    usernameInput.addEventListener('input', function() {
        var val = this.value.trim();
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
        var atBottom = messagesDiv.scrollTop + messagesDiv.clientHeight >= messagesDiv.scrollHeight - 50;
        if (scrollBottomBtn) scrollBottomBtn.classList.toggle('show', !atBottom);
    });
}

if (scrollBottomBtn) {
    scrollBottomBtn.addEventListener('click', function() {
        if (messagesDiv) messagesDiv.scrollTo({ top: messagesDiv.scrollHeight, behavior: 'smooth' });
    });
}

// ============================================================
// 🎯 EVENTS - LOGIN
// ============================================================
var loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
    loginBtn.addEventListener('click', window.login);
}

if (usernameInput) {
    usernameInput.addEventListener('keypress', function(e) {
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
    loginAdminPasswordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            window.login();
        }
    });
}

// ============================================================
// 🎯 EVENTS - SEND
// ============================================================
var sendBtn = document.getElementById('sendBtn');
var msgInput = document.getElementById('msgInput');

if (sendBtn) {
    sendBtn.addEventListener('click', window.sendMessage);
}

if (msgInput) {
    msgInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') window.sendMessage();
    });

    msgInput.addEventListener('keydown', function(e) {
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
var logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', window.logout);
}

// ============================================================
// 🔐 AUTH STATE
// ============================================================
if (window.auth) {
    window.auth.onAuthStateChanged(function(user) {
        if (!user && !window.isLoggedIn) {
            var loginOverlay = document.getElementById('loginOverlay');
            var chatContainer = document.getElementById('chatContainer');
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
    var infoMsg = document.getElementById('infoMsg');
    if (infoMsg) {
        infoMsg.textContent = '👋 أدخل اسمك ثم اضغط دخول';
        infoMsg.classList.add('show');
        setTimeout(function() { infoMsg.classList.remove('show'); }, 3000);
    }
}

// ============================================================
// 🚀 START
// ============================================================
window.userIP = window.getHashedIP();
autoLogin();

console.log('✅ تم تحميل app.js');
console.log('✅ جميع الملفات جاهزة!');
