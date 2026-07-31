// ============================================================
// 🔐 AUTH MODULE - نيزك v3.5.0 (مع get())
// ============================================================

window.currentUser = '';
window.userColor = '#2b6ef0';
window.isLoggedIn = false;
window.isAdmin = false;
window.isAdminVerified = false;
window.userIP = '';
window.isMuted = false;
window.muteTimeout = null;
window.muteCount = 0;
window.blockedUsers = [];
window.isAdminLoginAttempt = false;
window.unsubscribe = null;

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
// CHECK USER IN DB - مع get()
// ============================================================
window.checkUserInDB = function(username) {
    console.log('🔍 التحقق من المستخدم:', username);
    return window.db.collection('users').doc(username).get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                if (username === window.ADMIN_NAME) {
                    return { exists: true, isAdmin: true, data: data };
                }
                return { exists: true, isAdmin: false, data: data };
            }
            return { exists: false, isAdmin: false };
        })
        .catch((err) => {
            console.warn('⚠️ فشل التحقق من المستخدم:', err.message);
            return { exists: false, isAdmin: false };
        });
};

// ============================================================
// SET USER STATUS - مع set()
// ============================================================
window.setUserOnline = function(name) {
    if (!window.db) return;
    console.log('🟢 تعيين المستخدم متصل:', name);
    window.db.collection('users').doc(name).set({
        username: name,
        color: window.userColor,
        ip: window.userIP,
        online: true,
        forceLogout: false,
        avatar: window.userAvatarBase64 || '',
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => console.log('✅ تم تحديث حالة المستخدم'))
    .catch((err) => console.warn('⚠️ فشل تحديث الحالة:', err.message));
};

window.setUserOffline = function(name) {
    if (!name || !window.db) return;
    console.log('🔴 تعيين المستخدم غير متصل:', name);
    window.db.collection('users').doc(name).update({
        online: false,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }).catch((err) => console.warn('⚠️ فشل تحديث الخروج:', err.message));
};

// ============================================================
// LOAD BLOCKED USERS - مع get()
// ============================================================
window.loadBlockedUsers = function() {
    console.log('🔍 تحميل المستخدمين المحظورين...');
    return window.db.collection('blocked').doc('list').get()
        .then((doc) => {
            window.blockedUsers = (doc.exists && doc.data().users) ? doc.data().users : [];
            console.log('✅ تم تحميل ' + window.blockedUsers.length + ' مستخدم محظور');
            return window.blockedUsers;
        })
        .catch((err) => {
            console.warn('⚠️ فشل تحميل المحظورين:', err.message);
            window.blockedUsers = [];
            return window.blockedUsers;
        });
};

// ============================================================
// PERFORM LOGOUT
// ============================================================
window.performLogout = function() {
    console.log('🚪 تسجيل الخروج...');
    
    if (window.currentUser) {
        window.setUserOffline(window.currentUser);
        if (typeof window.addSystemMessage === 'function') {
            window.addSystemMessage('👋 ' + window.currentUser + ' غادر الدردشة');
        }
    }

    window.isLoggedIn = false;
    window.currentUser = '';
    window.isAdmin = false;
    window.isAdminVerified = false;

    if (window.unsubscribe) {
        try { window.unsubscribe(); } catch(e) {}
        window.unsubscribe = null;
    }

    if (chatContainer) chatContainer.style.display = 'none';
    if (loginOverlay) loginOverlay.classList.remove('hidden');

    const messagesDiv = document.getElementById('messages');
    if (messagesDiv) {
        messagesDiv.innerHTML = `
            <div class="empty-state" id="emptyState">
                <div class="empty-icon"><span class="material-symbols-outlined">chat</span></div>
                <div class="empty-title">لا توجد رسائل</div>
                <div class="empty-sub">كن أول من يكتب ✨</div>
            </div>`;
    }

    if (msgInput) msgInput.disabled = true;
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
        sendBtn.style.background = '';
    }

    if (typeof window.clearReply === 'function') window.clearReply();
    window.editingMessage = null;

    if (infoMsg) {
        infoMsg.textContent = '👋 تم تسجيل الخروج';
        infoMsg.classList.add('show');
        setTimeout(() => infoMsg.classList.remove('show'), 2000);
    }

    if (usernameInput) usernameInput.value = '';
    if (loginAdminPasswordBox) loginAdminPasswordBox.style.display = 'none';
    window.isAdminLoginAttempt = false;

    window.userAvatarBase64 = '';
    window.tempAvatarBase64 = '';
    if (window.messageIds) window.messageIds.clear();
};

window.logout = function() {
    if (!confirm('🚪 تسجيل الخروج؟')) return;
    localStorage.removeItem('chat_session');
    window.performLogout();
};

// ============================================================
// LOGIN - مع get()
// ============================================================
window.login = async function() {
    console.log('🔄 محاولة تسجيل الدخول...');
    
    const raw = usernameInput.value.trim();
    if (!raw || raw.length < 2) {
        if (loginError) loginError.style.display = 'block';
        return;
    }

    if (raw === window.ADMIN_NAME) {
        const pass = loginAdminPasswordInput ? loginAdminPasswordInput.value.trim() : '';
        if (pass !== window.ADMIN_PASSWORD) {
            if (loginAdminPasswordError) loginAdminPasswordError.classList.add('show');
            if (loginAdminPasswordInput) {
                loginAdminPasswordInput.value = '';
                loginAdminPasswordInput.focus();
            }
            return;
        }
        if (loginAdminPasswordError) loginAdminPasswordError.classList.remove('show');
    }

    const name = window.sanitizeInput(raw);
    if (!name) {
        if (loginError) {
            loginError.textContent = '⚠️ اسم غير صالح';
            loginError.style.display = 'block';
        }
        return;
    }

    if (loginError) loginError.style.display = 'none';
    if (connectionError) connectionError.style.display = 'none';

    window.showLoading(true);
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span class="material-symbols-outlined">progress_activity</span> جاري...';
    }

    try {
        window.userIP = window.getHashedIP();

        // التحقق من المستخدم
        const check = await window.checkUserInDB(name);
        let avatarBase64 = '';
        if (check.exists && check.data && check.data.avatar) {
            avatarBase64 = check.data.avatar;
        }

        // تسجيل الدخول المجهول
        try {
            await window.auth.signInAnonymously();
            console.log('✅ تم تسجيل الدخول المجهول');
        } catch (e) {
            console.warn('⚠️ فشل تسجيل الدخول المجهول:', e.message);
        }

        window.currentUser = name;
        window.userAvatarBase64 = avatarBase64;
        window.isLoggedIn = true;
        window.isAdmin = (name === window.ADMIN_NAME);
        window.isMuted = false;
        window.muteCount = 0;

        if (window.muteTimeout) clearTimeout(window.muteTimeout);
        const mutedNotice = document.getElementById('mutedNotice');
        if (mutedNotice) mutedNotice.classList.remove('active');

        if (window.isAdmin) {
            if (adminBtn) adminBtn.classList.remove('hidden');
            if (adminBadge) adminBadge.classList.add('show');
        } else {
            if (adminBtn) adminBtn.classList.add('hidden');
            if (adminBadge) adminBadge.classList.remove('show');
        }

        await window.loadBlockedUsers();

        if (loginOverlay) loginOverlay.classList.add('hidden');
        if (chatContainer) chatContainer.style.display = 'flex';

        if (msgInput) {
            msgInput.disabled = false;
            msgInput.focus();
        }
        if (sendBtn) sendBtn.disabled = false;

        window.updateAllAvatars(avatarBase64, name);

        if (window.isAdmin) {
            window.db.collection('users').doc(name).update({ forceLogout: false }).catch(() => {});
        }

        window.setUserOnline(name);
        window.saveSession(name, window.userColor, avatarBase64);

        if (window.isAdmin) {
            window.db.collection('settings').doc('theme').get()
                .then((doc) => {
                    if (doc.exists && doc.data().theme) {
                        window.applyTheme(doc.data().theme);
                    }
                })
                .catch(() => {});
        }

        if (!check.exists) {
            if (typeof window.addSystemMessage === 'function') {
                window.addSystemMessage('👋 مرحباً ' + name + '! هذه أول مرة لك في الغروب');
            }
        } else if (window.isAdmin) {
            if (typeof window.addSystemMessage === 'function') {
                window.addSystemMessage('👑 المسؤول ' + name + ' انضم إلى الدردشة');
            }
        } else {
            if (typeof window.addSystemMessage === 'function') {
                window.addSystemMessage('👋 ' + name + ' انضم إلى الدردشة');
            }
        }

        if (typeof window.loadMessages === 'function') window.loadMessages();
        if (typeof window.listenMessages === 'function') window.listenMessages();
        if (typeof window.loadBadWords === 'function') window.loadBadWords();

        window.addEventListener('beforeunload', () => {
            window.setUserOffline(name);
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

    window.showLoading(false);
    if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span class="material-symbols-outlined">login</span> دخول';
    }
};

// ============================================================
// CHECK FORCE LOGOUT - مع get()
// ============================================================
window.checkForceLogout = function() {
    if (window.currentUser) {
        window.db.collection('users').doc(window.currentUser).get()
            .then((doc) => {
                if (doc.exists && doc.data().forceLogout === true) {
                    window.db.collection('users').doc(window.currentUser).update({ forceLogout: false });
                    if (typeof window.addSystemMessage === 'function') {
                        window.addSystemMessage('🔒 تم تسجيل خروجك قسراً بواسطة المسؤول');
                    }
                    setTimeout(() => window.performLogout(), 1000);
                }
            })
            .catch(() => {});
    }
};

console.log('✅ تم تحميل auth.js (مع get())');
