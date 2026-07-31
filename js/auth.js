// ============================================================
// 🔐 AUTH MODULE - نيزك v3.5.0
// ============================================================

let currentUser = '';
let userColor = '#2b6ef0';
let isLoggedIn = false;
let isAdmin = false;
let isAdminVerified = false;
let userIP = '';
let isMuted = false;
let muteTimeout = null;
let muteCount = 0;
let blockedUsers = [];
let isAdminLoginAttempt = false;
let unsubscribe = null;

// ============================================================
// DOM REFS
// ============================================================
const loginOverlay = document.getElementById('loginOverlay');
const chatContainer = document.getElementById('chatContainer');
const usernameInput = document.getElementById('usernameInput');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const connectionError = document.getElementById('connectionError');
const infoMsg = document.getElementById('infoMsg');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const logoutBtn = document.getElementById('logoutBtn');
const adminBtn = document.getElementById('adminBtn');
const adminBadge = document.getElementById('adminBadge');
const loginAdminPasswordBox = document.getElementById('loginAdminPasswordBox');
const loginAdminPasswordInput = document.getElementById('loginAdminPasswordInput');
const loginAdminPasswordError = document.getElementById('loginAdminPasswordError');
const headerUsername = document.getElementById('headerUsername');

// ============================================================
// CHECK USER IN DB
// ============================================================
function checkUserInDB(username) {
    return db.collection('users').doc(username).get()
        .then(function(d) {
            if (d.exists) {
                var dt = d.data();
                if (username === ADMIN_NAME) {
                    return { exists: true, sameIP: true, isAdmin: true };
                }
                return { exists: true, sameIP: true, isAdmin: false };
            }
            return { exists: false, sameIP: false, isAdmin: false };
        });
}

// ============================================================
// SET USER STATUS
// ============================================================
function setUserOnline(name) {
    db.collection('users').doc(name).set({
        username: name,
        color: userColor,
        ip: userIP,
        online: true,
        forceLogout: false,
        avatar: userAvatarBase64 || '',
        firstSeen: firebase.firestore.FieldValue.serverTimestamp(),
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(err) {
        console.warn('⚠️ فشل تحديث حالة المستخدم:', err);
    });
}

function setUserOffline(name) {
    if (!name) return;
    db.collection('users').doc(name).update({
        online: false,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(err) {
        console.warn('⚠️ فشل تحديث حالة الخروج:', err);
    });
}

// ============================================================
// LOAD BLOCKED USERS
// ============================================================
function loadBlockedUsers() {
    return db.collection('blocked').doc('list').get()
        .then(function(d) {
            blockedUsers = (d.exists && d.data().users) ? d.data().users : [];
            return blockedUsers;
        })
        .catch(function() {
            blockedUsers = [];
            return blockedUsers;
        });
}

// ============================================================
// APPLY MUTE
// ============================================================
function applyMute(sec) {
    isMuted = true;
    if (msgInput) msgInput.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
    var mutedNotice = document.getElementById('mutedNotice');
    if (mutedNotice) {
        mutedNotice.classList.add('active');
        mutedNotice.textContent = '⛔ ممنوع من الكتابة لمدة ' + Math.ceil(sec / 60) + ' دقيقة';
    }
    if (muteTimeout) clearTimeout(muteTimeout);
    muteTimeout = setTimeout(function() {
        isMuted = false;
        if (msgInput) msgInput.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        if (mutedNotice) mutedNotice.classList.remove('active');
        if (msgInput) msgInput.focus();
    }, sec * 1000);
}

// ============================================================
// PERFORM LOGOUT
// ============================================================
function performLogout() {
    if (currentUser) {
        setUserOffline(currentUser);
        if (typeof addSystemMessage === 'function') {
            addSystemMessage('👋 ' + currentUser + ' غادر الدردشة');
        }
    }

    isLoggedIn = false;
    currentUser = '';
    isAdmin = false;
    isAdminVerified = false;

    if (unsubscribe) {
        try { unsubscribe(); } catch(e) {}
        unsubscribe = null;
    }

    if (chatContainer) chatContainer.style.display = 'none';
    if (loginOverlay) loginOverlay.classList.remove('hidden');

    var messagesDiv = document.getElementById('messages');
    if (messagesDiv) {
        messagesDiv.innerHTML =
            '<div class="empty-state" id="emptyState"><div class="empty-icon"><span class="material-symbols-outlined">chat</span></div><div class="empty-title">لا توجد رسائل</div><div class="empty-sub">كن أول من يكتب ✨</div></div>';
    }

    if (msgInput) msgInput.disabled = true;
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
        sendBtn.style.background = '';
    }

    if (typeof clearReply === 'function') clearReply();

    if (typeof editingMessage !== 'undefined') {
        editingMessage = null;
    }

    if (infoMsg) {
        infoMsg.textContent = '👋 تم تسجيل الخروج';
        infoMsg.classList.add('show');
        setTimeout(function() { infoMsg.classList.remove('show'); }, 2000);
    }

    if (usernameInput) {
        usernameInput.value = '';
    }
    if (loginAdminPasswordBox) loginAdminPasswordBox.style.display = 'none';
    isAdminLoginAttempt = false;

    userAvatarBase64 = '';
    tempAvatarBase64 = '';
    
    if (typeof messageIds !== 'undefined' && messageIds) {
        messageIds.clear();
    }
}

// ============================================================
// LOGOUT
// ============================================================
function logout() {
    if (!confirm('🚪 تسجيل الخروج؟\nسيتم حذف جلسة الدخول من هذا الجهاز.')) return;
    localStorage.removeItem('chat_session');
    performLogout();
}

// ============================================================
// LOGIN
// ============================================================
async function login() {
    var raw = usernameInput.value.trim();
    if (!raw || raw.length < 2) {
        if (loginError) loginError.style.display = 'block';
        return;
    }

    if (raw === ADMIN_NAME) {
        var pass = loginAdminPasswordInput ? loginAdminPasswordInput.value.trim() : '';
        if (pass !== ADMIN_PASSWORD) {
            if (loginAdminPasswordError) loginAdminPasswordError.classList.add('show');
            if (loginAdminPasswordInput) {
                loginAdminPasswordInput.value = '';
                loginAdminPasswordInput.focus();
            }
            return;
        }
        if (loginAdminPasswordError) loginAdminPasswordError.classList.remove('show');
    }

    var name = sanitizeInput(raw);
    if (!name) {
        if (loginError) {
            loginError.textContent = '⚠️ اسم غير صالح';
            loginError.style.display = 'block';
        }
        return;
    }

    if (loginError) loginError.style.display = 'none';
    if (connectionError) connectionError.style.display = 'none';

    showLoading(true);
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span class="material-symbols-outlined">progress_activity</span> جاري...';
    }

    try {
        userIP = getHashedIP();

        var check = await checkUserInDB(name);

        var avatarBase64 = '';

        if (check.exists) {
            var userDoc = await db.collection('users').doc(name).get();
            if (userDoc.exists && userDoc.data().avatar) {
                avatarBase64 = userDoc.data().avatar;
            }
        }

        await auth.signInAnonymously();

        currentUser = name;
        userAvatarBase64 = avatarBase64;
        isLoggedIn = true;
        isAdmin = (name === ADMIN_NAME);
        isMuted = false;
        muteCount = 0;

        if (muteTimeout) clearTimeout(muteTimeout);
        var mutedNotice = document.getElementById('mutedNotice');
        if (mutedNotice) mutedNotice.classList.remove('active');

        if (isAdmin) {
            if (adminBtn) adminBtn.classList.remove('hidden');
            if (adminBadge) adminBadge.classList.add('show');
        } else {
            if (adminBtn) adminBtn.classList.add('hidden');
            if (adminBadge) adminBadge.classList.remove('show');
        }

        await loadBlockedUsers();

        if (loginOverlay) loginOverlay.classList.add('hidden');
        if (chatContainer) chatContainer.style.display = 'flex';

        if (msgInput) {
            msgInput.disabled = false;
            msgInput.focus();
        }
        if (sendBtn) sendBtn.disabled = false;

        updateAllAvatars(avatarBase64, name);

        if (isAdmin) {
            db.collection('users').doc(name).update({ forceLogout: false }).catch(function() {});
        }

        setUserOnline(name);
        saveSession(name, userColor, avatarBase64);

        if (isAdmin) {
            db.collection('settings').doc('theme').get()
                .then(function(doc) {
                    if (doc.exists && doc.data().theme) {
                        applyTheme(doc.data().theme);
                    }
                })
                .catch(function() {});
        }

        if (!check.exists) {
            if (typeof addSystemMessage === 'function') {
                addSystemMessage('👋 مرحباً ' + name + '! هذه أول مرة لك في الغروب');
            }
        } else if (isAdmin) {
            if (typeof addSystemMessage === 'function') {
                addSystemMessage('👑 المسؤول ' + name + ' انضم إلى الدردشة');
            }
        } else {
            if (typeof addSystemMessage === 'function') {
                addSystemMessage('👋 ' + name + ' انضم إلى الدردشة');
            }
        }

        if (typeof loadMessages === 'function') loadMessages();
        if (typeof listenMessages === 'function') listenMessages();
        if (typeof loadBadWords === 'function') loadBadWords();

        window.addEventListener('beforeunload', function() {
            setUserOffline(name);
        });

    } catch (e) {
        console.error('❌ خطأ في تسجيل الدخول:', e);
        if (connectionError) {
            connectionError.textContent = '❌ ' + e.message;
            connectionError.style.display = 'block';
        }
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<span class="material-symbols-outlined">login</span> دخول';
        }
    }

    showLoading(false);
    if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span class="material-symbols-outlined">login</span> دخول';
    }
}

// ============================================================
// CHECK FORCE LOGOUT
// ============================================================
function checkForceLogout() {
    if (currentUser) {
        db.collection('users').doc(currentUser).get()
            .then(function(d) {
                if (d.exists && d.data().forceLogout === true) {
                    db.collection('users').doc(currentUser).update({ forceLogout: false });
                    if (typeof addSystemMessage === 'function') {
                        addSystemMessage('🔒 تم تسجيل خروجك قسراً بواسطة المسؤول');
                    }
                    setTimeout(function() { performLogout(); }, 1000);
                }
            })
            .catch(function() {});
    }
      }
// ============================================================
// جعل الدوال والمتغيرات عامة
// ============================================================
window.currentUser = currentUser;
window.userColor = userColor;
window.isLoggedIn = isLoggedIn;
window.isAdmin = isAdmin;
window.isAdminVerified = isAdminVerified;
window.userIP = userIP;
window.isMuted = isMuted;
window.muteTimeout = muteTimeout;
window.muteCount = muteCount;
window.blockedUsers = blockedUsers;
window.isAdminLoginAttempt = isAdminLoginAttempt;
window.unsubscribe = unsubscribe;

window.checkUserInDB = checkUserInDB;
window.setUserOnline = setUserOnline;
window.setUserOffline = setUserOffline;
window.loadBlockedUsers = loadBlockedUsers;
window.applyMute = applyMute;
window.performLogout = performLogout;
window.logout = logout;
window.login = login;
window.checkForceLogout = checkForceLogout;
