// ============================================================
// 🚀 APP MAIN - نيزك v3.5.0
// ============================================================

console.log('🚀 نيزك ' + VERSION + ' - أقدم فوق، أحدث تحت (مثل الدردشة الطبيعية)');
console.log('👑 المسؤول: ' + ADMIN_NAME);
console.log('🔒 كلمة المرور: ' + ADMIN_PASSWORD);
console.log('🚫 عدد الكلمات المحظورة: ' + DEFAULT_BAD_WORDS.length);

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
        userColor = this.dataset.color;
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
    themeToggle.addEventListener('click', toggleTheme);
}

document.querySelectorAll('.theme-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        if (!isAdmin || !isAdminVerified) return;
        applyTheme(this.dataset.theme);
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
if (usernameInput) {
    usernameInput.addEventListener('input', function() {
        var val = this.value.trim();
        if (val === ADMIN_NAME) {
            if (loginAdminPasswordBox) loginAdminPasswordBox.style.display = 'block';
            if (loginAdminPasswordInput) loginAdminPasswordInput.value = '';
            if (loginAdminPasswordError) loginAdminPasswordError.classList.remove('show');
            isAdminLoginAttempt = true;
        } else {
            if (loginAdminPasswordBox) loginAdminPasswordBox.style.display = 'none';
            isAdminLoginAttempt = false;
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
if (loginBtn) {
    loginBtn.addEventListener('click', login);
}

if (usernameInput) {
    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            if (isAdminLoginAttempt && loginAdminPasswordInput) {
                loginAdminPasswordInput.focus();
            } else {
                login();
            }
        }
    });
}

if (loginAdminPasswordInput) {
    loginAdminPasswordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            login();
        }
    });
}

// ============================================================
// 🎯 EVENTS - SEND
// ============================================================
if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
}

if (msgInput) {
    msgInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
    });

    msgInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (editingMessage) {
                editingMessage = null;
                if (sendBtn) {
                    sendBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
                    sendBtn.style.background = '';
                }
                if (msgInput) msgInput.value = '';
            }
            clearReply();
        }
    });
}

// ============================================================
// 🎯 EVENTS - LOGOUT
// ============================================================
if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
}

// ============================================================
// 🔐 AUTH STATE
// ============================================================
if (auth) {
    auth.onAuthStateChanged(function(user) {
        if (!user && !isLoggedIn) {
            if (loginOverlay) loginOverlay.classList.remove('hidden');
            if (chatContainer) chatContainer.style.display = 'none';
            showLoading(false);
        }
    });
}

// ============================================================
// 🔍 CHECK FORCE LOGOUT
// ============================================================
setInterval(checkForceLogout, 5000);

// ============================================================
// 🚀 AUTO LOGIN
// ============================================================
function autoLogin() {
    loadSavedTheme();
    if (infoMsg) {
        infoMsg.textContent = '👋 أدخل اسمك ثم اضغط دخول';
        infoMsg.classList.add('show');
        setTimeout(function() { infoMsg.classList.remove('show'); }, 3000);
    }
}

// ============================================================
// 🚀 START
// ============================================================
userIP = getHashedIP();
autoLogin();
