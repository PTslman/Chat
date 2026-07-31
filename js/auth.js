// ============================================================
// 🔐 AUTH MODULE - نيزك v3.5.0
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
var loginOverlay = document.getElementById('loginOverlay');
var chatContainer = document.getElementById('chatContainer');
var usernameInput = document.getElementById('usernameInput');
var loginBtn = document.getElementById('loginBtn');
var loginError = document.getElementById('loginError');
var connectionError = document.getElementById('connectionError');
var infoMsg = document.getElementById('infoMsg');
var msgInput = document.getElementById('msgInput');
var sendBtn = document.getElementById('sendBtn');
var logoutBtn = document.getElementById('logoutBtn');
var adminBtn = document.getElementById('adminBtn');
var adminBadge = document.getElementById('adminBadge');
var loginAdminPasswordBox = document.getElementById('loginAdminPasswordBox');
var loginAdminPasswordInput = document.getElementById('loginAdminPasswordInput');
var loginAdminPasswordError = document.getElementById('loginAdminPasswordError');
var headerUsername = document.getElementById('headerUsername');

// ============================================================
// CHECK USER IN DB - مع إعادة المحاولة
// ============================================================
window.checkUserInDB = function(username, retryCount) {
    retryCount = retryCount || 0;
    return window.db.collection('users').doc(username).get()
        .then(function(d) {
            if (d.exists) {
                var dt = d.data();
                if (username === window.ADMIN_NAME) {
                    return { exists: true, sameIP: true, isAdmin: true };
                }
                return { exists: true, sameIP: true, isAdmin: false };
            }
            return { exists: false, sameIP: false, isAdmin: false };
        })
        .catch(function(err) {
            console.warn('⚠️ فشل التحقق من المستخدم (محاولة ' + (retryCount + 1) + '):', err);
            if (retryCount < 3) {
                console.log('🔄 إعادة المحاولة بعد 1 ثانية...');
                return new Promise(function(resolve) {
                    setTimeout(function() {
                        resolve(window.checkUserInDB(username, retryCount + 1));
                    }, 1000);
                });
            }
            throw err;
        });
};

// ============================================================
// SET USER STATUS - مع إعادة المحاولة
// ============================================================
window.setUserOnline = function(name, retryCount) {
    retryCount = retryCount || 0;
    window.db.collection('users').doc(name).set({
        username: name,
        color: window.userColor,
        ip: window.userIP,
        online: true,
        forceLogout: false,
        avatar: window.userAvatarBase64 || '',
        firstSeen: firebase.firestore.FieldValue.serverTimestamp(),
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(err) {
        console.warn('⚠️ فشل تحديث حالة المستخدم (محاولة ' + (retryCount + 1) + '):', err);
        if (retryCount < 3) {
            setTimeout(function() {
                window.setUserOnline(name, retryCount + 1);
            }, 2000);
        }
    });
};

window.setUserOffline = function(name, retryCount) {
    retryCount = retryCount || 0;
    if (!name) return;
    window.db.collection('users').doc(name).update({
        online: false,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(err) {
        console.warn('⚠️ فشل تحديث حالة الخروج (محاولة ' + (retryCount + 1) + '):', err);
        if (retryCount < 3) {
            setTimeout(function() {
                window.setUserOffline(name, retryCount + 1);
            }, 1000);
        }
    });
};

// ============================================================
// LOAD BLOCKED USERS - مع إعادة المحاولة
// ============================================================
window.loadBlockedUsers = function(retryCount) {
    retryCount = retryCount || 0;
    return window.db.collection('blocked').doc('list').get()
        .then(function(d) {
            window.blockedUsers = (d.exists && d.data().users) ? d.data().users : [];
            return window.blockedUsers;
        })
        .catch(function(err) {
            console.warn('⚠️ فشل تحميل المستخدمين المحظورين (محاولة ' + (retryCount + 1) + '):', err);
            if (retryCount < 3) {
                console.log('🔄 إعادة المحاولة بعد 1.5 ثانية...');
                return new Promise(function(resolve) {
                    setTimeout(function() {
                        resolve(window.loadBlockedUsers(retryCount + 1));
                    }, 1500);
                });
            }
            window.blockedUsers = [];
            return window.blockedUsers;
        });
};

// ============================================================
// PERFORM LOGOUT
// ============================================================
window.performLogout = function() {
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

    if (typeof window.clearReply === 'function') window.clearReply();

    if (window.editingMessage) {
        window.editingMessage = null;
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
    window.isAdminLoginAttempt = false;

    window.userAvatarBase64 = '';
    window.tempAvatarBase64 = '';
    
    if (window.messageIds) {
        window.messageIds.clear();
    }
};

// ============================================================
// LOGOUT
// ============================================================
window.logout = function() {
    if (!confirm('🚪 تسجيل الخروج؟\nسيتم حذف جلسة الدخول من هذا الجهاز.')) return;
    localStorage.removeItem('chat_session');
    window.performLogout();
};

// ============================================================
// LOGIN - مع معالجة الأخطاء
// ============================================================
window.login = async function() {
    console.log('🔄 محاولة تسجيل الدخول...');
    
    var raw = usernameInput.value.trim();
    if (!raw || raw.length < 2) {
        if (loginError) loginError.style.display = 'block';
        return;
    }

    if (raw === window.ADMIN_NAME) {
        var pass = loginAdminPasswordInput ? loginAdminPasswordInput.value.trim() : '';
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

    var name = window.sanitizeInput(raw);
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

        // التحقق من وجود الدالة checkConnection
        if (typeof window.checkConnection === 'function') {
            var isConnected = await window.checkConnection();
            console.log('📶 حالة الاتصال:', isConnected ? 'متصل' : 'غير متصل');
        } else {
            console.warn('⚠️ window.checkConnection غير معرفة، تخطي التحقق');
        }

        var check = await window.checkUserInDB(name);

        var avatarBase64 = '';

        if (check.exists) {
            try {
                var userDoc = await window.db.collection('users').doc(name).get();
                if (userDoc.exists && userDoc.data().avatar) {
                    avatarBase64 = userDoc.data().avatar;
                }
            } catch (e) {
                console.warn('⚠️ فشل تحميل بيانات المستخدم، استخدام البيانات المحلية:', e);
            }
        }

        // تسجيل الدخول المجهول
        try {
            await window.auth.signInAnonymously();
        } catch (e) {
            console.warn('⚠️ فشل تسجيل الدخول المجهول:', e);
            // نستمر حتى بدون auth
        }

        window.currentUser = name;
        window.userAvatarBase64 = avatarBase64;
        window.isLoggedIn = true;
        window.isAdmin = (name === window.ADMIN_NAME);
        window.isMuted = false;
        window.muteCount = 0;

        if (window.muteTimeout) clearTimeout(window.muteTimeout);
        var mutedNotice = document.getElementById('mutedNotice');
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
            window.db.collection('users').doc(name).update({ forceLogout: false }).catch(function() {});
        }

        window.setUserOnline(name);
        window.saveSession(name, window.userColor, avatarBase64);

        if (window.isAdmin) {
            window.db.collection('settings').doc('theme').get()
                .then(function(doc) {
                    if (doc.exists && doc.data().theme) {
                        window.applyTheme(doc.data().theme);
                    }
                })
                .catch(function() {});
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

        window.addEventListener('beforeunload', function() {
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
// CHECK FORCE LOGOUT - مع إعادة المحاولة
// ============================================================
window.checkForceLogout = function() {
    if (window.currentUser) {
        window.db.collection('users').doc(window.currentUser).get()
            .then(function(d) {
                if (d.exists && d.data().forceLogout === true) {
                    window.db.collection('users').doc(window.currentUser).update({ forceLogout: false });
                    if (typeof window.addSystemMessage === 'function') {
                        window.addSystemMessage('🔒 تم تسجيل خروجك قسراً بواسطة المسؤول');
                    }
                    setTimeout(function() { window.performLogout(); }, 1000);
                }
            })
            .catch(function(err) {
                console.warn('⚠️ فشل التحقق من force logout:', err);
            });
    }
};

console.log('✅ تم تحميل auth.js');
