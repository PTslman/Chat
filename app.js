// ============================================================
// 🔥 إعدادات Firebase
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyDKF6Jb-CLB8xM7TvNfoRnxWgiwD54SOXo",
    authDomain: "chat-app-ba3c8.firebaseapp.com",
    projectId: "chat-app-ba3c8",
    storageBucket: "chat-app-ba3c8.firebasestorage.app",
    messagingSenderId: "181727674867",
    appId: "1:181727674867:web:ae9824d9051bab9f73d286",
    measurementId: "G-VEL3PGTKY1"
};

// ============================================================
// 🚀 تهيئة Firebase
// ============================================================
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// تمكين التخزين المؤقت
db.enablePersistence({ synchronizeTabs: true })
    .then(() => console.log('✅ التخزين المؤقت مفعل'))
    .catch((err) => console.warn('⚠️ تعذر تفعيل التخزين المؤقت:', err));

// ============================================================
// 👑 إعدادات المسؤول
// ============================================================
const ADMIN_NAME = "slx23m";
const ADMIN_PASSWORD = "1442";
const VERSION = "v5.0";

// ============================================================
// 🚫 الكلمات المحظورة الافتراضية
// ============================================================
const DEFAULT_BAD_WORDS = [
    'كس', 'قحب', 'عاهر', 'زاني', 'زنا', 'خنا', 'لوط',
    'منيوك', 'شرموط', 'قحبة', 'عاهرة', 'زانية', 'خنيث',
    'مخنث', 'لاطي', 'لوطي', 'شاذ', 'منيوكة', 'شرموطة',
    'مومس', 'داعر', 'داعرة', 'فاجر', 'فاجرة'
];

// ============================================================
// 📦 حالة التطبيق
// ============================================================
const state = {
    currentUser: '',
    userColor: '#2b6ef0',
    isLoggedIn: false,
    isAdmin: false,
    isAdminVerified: false,
    replyTo: null,
    editingMessage: null,
    unsubscribe: null,
    blockedUsers: [],
    badWords: [],
    userIP: '',
    lastSender: '',
    isMuted: false,
    muteTimeout: null,
    muteCount: 0,
    currentTheme: 'dark',
    userAvatarBase64: '',
    tempAvatarBase64: '',
    isAdminLoginAttempt: false,
    messageIds: new Set(),
    unreadCount: 0,
    onlineUsers: new Set(),
    activeMessageId: null,
    hideTimeout: null
};

// ============================================================
// 📄 عناصر DOM
// ============================================================
const $ = id => document.getElementById(id);

const el = {};

function initElements() {
    const ids = [
        'loginOverlay', 'chatContainer', 'usernameInput', 'loginBtn',
        'loginError', 'connectionError', 'infoMsg', 'messages',
        'msgInput', 'sendBtn', 'emptyState', 'logoutBtn',
        'adminBtn', 'adminBadge', 'adminModal', 'adminPanel',
        'adminPasswordBox', 'adminPasswordInput', 'adminPasswordBtn',
        'adminPasswordError', 'adminUsersList', 'closeAdminModal',
        'forceLogoutBtn', 'clearChatBtn', 'rulesBtn', 'rulesModal',
        'closeRulesModal', 'emojiToggle', 'emojiRail', 'typingIndicator',
        'typingText', 'loadingOverlay', 'mutedNotice', 'badwordInput',
        'addBadwordBtn', 'badwordsList', 'themeToggle', 'themeIcon',
        'themeOptions', 'scrollBottomBtn', 'newMsgBadge', 'onlineCount',
        'headerAvatar', 'headerAvatarPlaceholder', 'headerUsername',
        'profileModal', 'closeProfileModal', 'profileAvatarPreview',
        'profileAvatarPlaceholder', 'profileAvatarBtn', 'profileAvatarInput',
        'profileNameInput', 'profileSaveBtn', 'profileUploadStatus',
        'loginAdminPasswordBox', 'loginAdminPasswordInput', 'loginAdminPasswordError',
        'replyBar', 'replyBarSender', 'replyBarText', 'replyBarClose',
        'reactionPicker', 'searchBtn', 'searchBar', 'searchInput',
        'searchResults', 'searchClose', 'msgActionsOverlay',
        'statusTime', 'appFooter', 'colorPicker'
    ];
    
    ids.forEach(id => {
        el[id] = $(id);
        if (!el[id] && !id.includes('Overlay')) {
            console.warn(`⚠️ عنصر مفقود: ${id}`);
        }
    });
}

initElements();

// ============================================================
// 🎯 خلفية الخيارات
// ============================================================
let actionsOverlay = el.msgActionsOverlay;
if (!actionsOverlay) {
    actionsOverlay = document.createElement('div');
    actionsOverlay.className = 'msg-actions-overlay';
    actionsOverlay.id = 'msgActionsOverlay';
    document.body.appendChild(actionsOverlay);
    el.msgActionsOverlay = actionsOverlay;
}

// ============================================================
// 📸 دوال الصورة الشخصية
// ============================================================
function getInitials(name) {
    if (!name) return '👤';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getAvatarColor(name) {
    const colors = ['#2b6ef0', '#ed4245', '#faa81a', '#23a55a', '#a78bfa', '#f472b6', '#60a5fa', '#34d399'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function updateAvatarUI(element, placeholder, avatarBase64, name) {
    if (!element) return;
    if (avatarBase64 && avatarBase64.startsWith('data:image')) {
        element.innerHTML = `<img src="${avatarBase64}" alt="صورة شخصية" loading="lazy">`;
        if (placeholder) placeholder.textContent = '';
    } else {
        const initials = getInitials(name);
        const color = getAvatarColor(name);
        const fontSize = element === el.profileAvatarPreview ? '34px' : '16px';
        element.innerHTML = `
            <span style="background:${color};display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:50%;font-size:${fontSize};font-weight:700;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,0.2);">
                ${initials}
            </span>
        `;
        if (placeholder) placeholder.textContent = '';
    }
}

function updateAllAvatars(avatarBase64, name) {
    updateAvatarUI(el.headerAvatar, el.headerAvatarPlaceholder, avatarBase64, name);
    updateAvatarUI(el.profileAvatarPreview, el.profileAvatarPlaceholder, avatarBase64, name);
    if (el.headerUsername) el.headerUsername.textContent = name;
}

// ============================================================
// 🖼️ ضغط الصورة
// ============================================================
function compressImageToBase64(file, maxWidth, maxHeight, quality, statusElement) {
    return new Promise((resolve, reject) => {
        try {
            if (statusElement) {
                statusElement.textContent = '⏳ جاري ضغط الصورة...';
                statusElement.className = 'upload-status show loading';
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const img = new Image();
                    img.onload = function() {
                        try {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');

                            let width = img.width;
                            let height = img.height;

                            if (width > maxWidth) {
                                height = (height * maxWidth) / width;
                                width = maxWidth;
                            }
                            if (height > maxHeight) {
                                width = (width * maxHeight) / height;
                                height = maxHeight;
                            }

                            canvas.width = width;
                            canvas.height = height;
                            ctx.drawImage(img, 0, 0, width, height);

                            const base64 = canvas.toDataURL('image/jpeg', quality);

                            if (statusElement) {
                                statusElement.textContent = '✅ تم ضغط الصورة بنجاح';
                                statusElement.className = 'upload-status show success';
                                setTimeout(() => {
                                    statusElement.className = 'upload-status';
                                }, 1500);
                            }

                            resolve(base64);
                        } catch (err) {
                            console.warn('⚠️ خطأ في معالجة الصورة:', err);
                            if (statusElement) {
                                statusElement.textContent = '❌ فشل معالجة الصورة';
                                statusElement.className = 'upload-status show error';
                            }
                            reject(err);
                        }
                    };
                    img.onerror = function() {
                        console.warn('⚠️ فشل تحميل الصورة');
                        if (statusElement) {
                            statusElement.textContent = '❌ فشل تحميل الصورة';
                            statusElement.className = 'upload-status show error';
                        }
                        reject(new Error('فشل تحميل الصورة'));
                    };
                    img.src = e.target.result;
                } catch (err) {
                    console.warn('⚠️ خطأ في قراءة الصورة:', err);
                    if (statusElement) {
                        statusElement.textContent = '❌ فشل قراءة الصورة';
                        statusElement.className = 'upload-status show error';
                    }
                    reject(err);
                }
            };
            reader.onerror = function() {
                console.warn('⚠️ فشل قراءة الملف');
                if (statusElement) {
                    statusElement.textContent = '❌ فشل قراءة الملف';
                    statusElement.className = 'upload-status show error';
                }
                reject(new Error('فشل قراءة الملف'));
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.warn('⚠️ خطأ في الضغط:', err);
            if (statusElement) {
                statusElement.textContent = '❌ فشل الضغط: ' + err.message;
                statusElement.className = 'upload-status show error';
            }
            reject(err);
        }
    });
}

// ============================================================
// 👤 الملف الشخصي
// ============================================================
function openProfileModal() {
    if (!state.isLoggedIn) return;
    if (el.profileNameInput) el.profileNameInput.value = state.currentUser;
    if (el.profileModal) el.profileModal.classList.add('active');
    updateAvatarUI(el.profileAvatarPreview, el.profileAvatarPlaceholder, state.userAvatarBase64, state.currentUser);
    if (el.profileUploadStatus) {
        el.profileUploadStatus.className = 'upload-status';
        el.profileUploadStatus.textContent = '';
    }
}

async function saveProfile() {
    const newName = el.profileNameInput ? el.profileNameInput.value.trim() : '';
    if (!newName || newName.length < 2) {
        alert('⚠️ الاسم يجب أن يكون حرفين على الأقل');
        return;
    }

    showLoading(true);

    try {
        let newAvatarBase64 = state.userAvatarBase64;

        if (state.tempAvatarBase64) {
            newAvatarBase64 = state.tempAvatarBase64;
            state.tempAvatarBase64 = '';
        }

        const oldName = state.currentUser;

        await db.collection('users').doc(oldName).update({
            username: newName,
            avatar: newAvatarBase64,
            color: state.userColor
        });

        state.currentUser = newName;
        state.userAvatarBase64 = newAvatarBase64;
        updateAllAvatars(newAvatarBase64, newName);

        if (oldName !== newName) {
            const messagesSnap = await db.collection('messages')
                .where('sender', '==', oldName)
                .get();
            const batch = db.batch();
            messagesSnap.forEach(doc => {
                batch.update(doc.ref, { sender: newName, avatar: newAvatarBase64 });
            });
            await batch.commit();
        }

        addSystemMessage(`✅ تم تحديث الملف الشخصي لـ ${newName}`, 'success');
        if (el.profileModal) el.profileModal.classList.remove('active');

    } catch (error) {
        console.error('❌ خطأ في حفظ الملف الشخصي:', error);
        alert('⚠️ حدث خطأ أثناء حفظ الملف الشخصي');
    }

    showLoading(false);
}

// ============================================================
// 🌓 نظام الثيمات
// ============================================================
function applyTheme(theme) {
    state.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);

    if (el.themeIcon) {
        el.themeIcon.textContent = theme === 'light' ? 'light_mode' : 'dark_mode';
    }

    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });

    try {
        localStorage.setItem('chat_theme', theme);
    } catch (e) {}

    if (state.isAdmin && state.isAdminVerified) {
        db.collection('settings').doc('theme').set({ theme }).catch(() => {});
    }
}

function toggleTheme() {
    const themes = ['dark', 'light', 'admin-dark', 'admin-forest', 'admin-rose', 'admin-ocean'];
    const currentIndex = themes.indexOf(state.currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    applyTheme(themes[nextIndex]);
}

function loadSavedTheme() {
    try {
        const saved = localStorage.getItem('chat_theme');
        if (saved) {
            applyTheme(saved);
            return;
        }
    } catch (e) {}

    db.collection('settings').doc('theme').get()
        .then(doc => {
            if (doc.exists && doc.data().theme) {
                applyTheme(doc.data().theme);
            } else {
                applyTheme('dark');
            }
        })
        .catch(() => {
            applyTheme('dark');
        });
}

// ============================================================
// 🔒 تشفير IP
// ============================================================
function getHashedIP() {
    const h = Date.now().toString(36) + Math.random().toString(36).substr(2, 8) + navigator.userAgent.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '');
    try { return btoa(h).substring(0, 20); } catch (e) { return h.substring(0, 20); }
}

// ============================================================
// 🛠️ أدوات مساعدة
// ============================================================
function sanitizeInput(text) {
    return text.replace(/[<>]/g, '').trim();
}

function isEmojiOnly(text) {
    return /^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2700}-\u{27BF}\s]+$/u.test(text.trim());
}

function showLoading(show) {
    if (el.loadingOverlay) {
        if (show) {
            el.loadingOverlay.classList.add('active');
        } else {
            el.loadingOverlay.classList.remove('active');
        }
    }
}

function updateClock() {
    const now = new Date();
    if (el.statusTime) {
        el.statusTime.textContent = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    }
}
updateClock();
setInterval(updateClock, 30000);

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

// ============================================================
// 🎨 منتقي الألوان
// ============================================================
document.querySelectorAll('.color-circle').forEach(el => {
    el.addEventListener('click', function() {
        document.querySelectorAll('.color-circle').forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
        state.userColor = this.dataset.color;
    });
});

// ============================================================
// 😊 الإيموجي
// ============================================================
if (el.emojiToggle) {
    el.emojiToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        if (el.emojiRail) {
            el.emojiRail.classList.toggle('active');
        }
        this.classList.toggle('active');
    });
}

document.addEventListener('click', function(e) {
    if (el.emojiRail && !el.emojiRail.contains(e.target) && e.target !== el.emojiToggle && !el.emojiToggle?.contains(e.target)) {
        el.emojiRail.classList.remove('active');
        el.emojiToggle?.classList.remove('active');
    }
    if (el.reactionPicker && !el.reactionPicker.contains(e.target)) {
        el.reactionPicker.classList.remove('active');
    }
});

document.querySelectorAll('.emoji-item').forEach(el => {
    el.addEventListener('click', function() {
        if (el.msgInput) {
            el.msgInput.value += this.textContent;
            el.msgInput.focus();
        }
        if (el.emojiRail) el.emojiRail.classList.remove('active');
        if (el.emojiToggle) el.emojiToggle.classList.remove('active');
    });
});

// ============================================================
// 🌓 أحداث الثيم
// ============================================================
if (el.themeToggle) {
    el.themeToggle.addEventListener('click', toggleTheme);
}

document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        if (!state.isAdmin || !state.isAdminVerified) return;
        applyTheme(this.dataset.theme);
    });
});

// ============================================================
// 👑 كشف المسؤول
// ============================================================
if (el.usernameInput) {
    el.usernameInput.addEventListener('input', function() {
        const val = this.value.trim();
        
        if (val === ADMIN_NAME) {
            if (el.loginAdminPasswordBox) {
                el.loginAdminPasswordBox.style.display = 'block';
            }
            if (el.loginAdminPasswordInput) {
                el.loginAdminPasswordInput.value = '';
            }
            if (el.loginAdminPasswordError) {
                el.loginAdminPasswordError.classList.remove('show');
            }
            state.isAdminLoginAttempt = true;
        } else {
            if (el.loginAdminPasswordBox) {
                el.loginAdminPasswordBox.style.display = 'none';
            }
            state.isAdminLoginAttempt = false;
        }
    });
}

// ============================================================
// 📸 أحداث الصورة الشخصية
// ============================================================
if (el.profileAvatarBtn) {
    el.profileAvatarBtn.addEventListener('click', () => {
        if (el.profileAvatarInput) el.profileAvatarInput.click();
    });
}
if (el.profileAvatarPreview) {
    el.profileAvatarPreview.addEventListener('click', () => {
        if (el.profileAvatarInput) el.profileAvatarInput.click();
    });
}

if (el.profileAvatarInput) {
    el.profileAvatarInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            if (file.size > 5 * 1024 * 1024) {
                alert('⚠️ حجم الصورة كبير جداً (الحد الأقصى 5MB)');
                this.value = '';
                return;
            }

            compressImageToBase64(file, 300, 300, 0.6, el.profileUploadStatus)
                .then(base64 => {
                    if (el.profileAvatarPreview) {
                        el.profileAvatarPreview.innerHTML = `<img src="${base64}" alt="صورة شخصية">`;
                    }
                    if (el.profileAvatarPlaceholder) {
                        el.profileAvatarPlaceholder.textContent = '';
                    }
                    state.tempAvatarBase64 = base64;
                    if (el.profileUploadStatus) {
                        el.profileUploadStatus.textContent = '📸 تم اختيار الصورة، اضغط حفظ للتحديث';
                        el.profileUploadStatus.className = 'upload-status show success';
                    }
                })
                .catch(err => {
                    console.error('❌ فشل ضغط الصورة:', err);
                    alert('⚠️ فشل معالجة الصورة: ' + err.message);
                });
        }
    });
}

// ============================================================
// 👤 أحداث الملف الشخصي
// ============================================================
if (el.headerAvatar) {
    el.headerAvatar.addEventListener('click', () => state.isLoggedIn && openProfileModal());
}

if (el.closeProfileModal) {
    el.closeProfileModal.addEventListener('click', () => {
        if (el.profileModal) el.profileModal.classList.remove('active');
        state.tempAvatarBase64 = '';
        if (el.profileUploadStatus) {
            el.profileUploadStatus.className = 'upload-status';
            el.profileUploadStatus.textContent = '';
        }
    });
}

if (el.profileModal) {
    el.profileModal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
            state.tempAvatarBase64 = '';
            if (el.profileUploadStatus) {
                el.profileUploadStatus.className = 'upload-status';
                el.profileUploadStatus.textContent = '';
            }
        }
    });
}

if (el.profileSaveBtn) {
    el.profileSaveBtn.addEventListener('click', saveProfile);
}

if (el.profileNameInput) {
    el.profileNameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') saveProfile();
    });
}

// ============================================================
// 📋 النوافذ المنبثقة
// ============================================================
if (el.rulesBtn) {
    el.rulesBtn.addEventListener('click', () => {
        if (el.rulesModal) el.rulesModal.classList.toggle('active');
    });
}
if (el.closeRulesModal) {
    el.closeRulesModal.addEventListener('click', () => {
        if (el.rulesModal) el.rulesModal.classList.remove('active');
    });
}
if (el.rulesModal) {
    el.rulesModal.addEventListener('click', function(e) {
        if (e.target === this) this.classList.remove('active');
    });
}

if (el.adminBtn) {
    el.adminBtn.addEventListener('click', function() {
        state.isAdminVerified = false;
        if (el.adminPanel) el.adminPanel.style.display = 'none';
        if (el.adminPasswordBox) el.adminPasswordBox.style.display = 'block';
        if (el.adminPasswordInput) {
            el.adminPasswordInput.value = '';
        }
        if (el.adminPasswordError) {
            el.adminPasswordError.classList.remove('show');
        }
        if (el.adminModal) el.adminModal.classList.toggle('active');
        if (el.adminModal?.classList.contains('active') && el.adminPasswordInput) {
            el.adminPasswordInput.focus();
        }
    });
}

if (el.adminPasswordBtn) {
    el.adminPasswordBtn.addEventListener('click', function() {
        const pass = el.adminPasswordInput ? el.adminPasswordInput.value.trim() : '';
        if (pass === ADMIN_PASSWORD) {
            state.isAdminVerified = true;
            if (el.adminPasswordBox) el.adminPasswordBox.style.display = 'none';
            if (el.adminPanel) el.adminPanel.style.display = 'block';
            loadAdminUsers();
            loadBadWords();
        } else {
            if (el.adminPasswordError) el.adminPasswordError.classList.add('show');
            if (el.adminPasswordInput) {
                el.adminPasswordInput.value = '';
                el.adminPasswordInput.focus();
            }
        }
    });
}

if (el.adminPasswordInput) {
    el.adminPasswordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && el.adminPasswordBtn) {
            el.adminPasswordBtn.click();
        }
    });
}

if (el.closeAdminModal) {
    el.closeAdminModal.addEventListener('click', function() {
        if (el.adminModal) el.adminModal.classList.remove('active');
        state.isAdminVerified = false;
    });
}

if (el.adminModal) {
    el.adminModal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
            state.isAdminVerified = false;
        }
    });
}

// ============================================================
// 🚫 الكلمات المحظورة
// ============================================================
function loadBadWords() {
    db.collection('settings').doc('badwords').get()
        .then(doc => {
            state.badWords = (doc.exists && doc.data().words) ? doc.data().words : DEFAULT_BAD_WORDS;
            if (!doc.exists) saveBadWords();
            renderBadWords();
        })
        .catch(() => { state.badWords = DEFAULT_BAD_WORDS;
            renderBadWords(); });
}

function saveBadWords() {
    db.collection('settings').doc('badwords').set({ words: state.badWords });
}

function renderBadWords() {
    if (!el.badwordsList) return;
    if (!state.badWords.length) {
        el.badwordsList.innerHTML = '<span style="color:var(--whatsapp-text-muted);font-size:11px;">لا توجد كلمات محظورة</span>';
        return;
    }
    let html = '';
    state.badWords.forEach(word => {
        html += `
            <span class="badword-tag">
                ${word}
                <button class="remove-badword" data-word="${word}">
                    <span class="material-symbols-outlined" style="font-size:12px;">close</span>
                </button>
            </span>
        `;
    });
    el.badwordsList.innerHTML = html;
    document.querySelectorAll('.remove-badword').forEach(btn => {
        btn.addEventListener('click', function() {
            removeBadWord(this.dataset.word);
        });
    });
}

function addBadWord() {
    const word = el.badwordInput ? el.badwordInput.value.trim() : '';
    if (!word) return;
    if (state.badWords.includes(word)) {
        alert('⚠️ هذه الكلمة موجودة بالفعل');
        return;
    }
    state.badWords.push(word);
    saveBadWords();
    renderBadWords();
    if (el.badwordInput) {
        el.badwordInput.value = '';
        el.badwordInput.focus();
    }
}

function removeBadWord(word) {
    const index = state.badWords.indexOf(word);
    if (index > -1) {
        state.badWords.splice(index, 1);
        saveBadWords();
        renderBadWords();
    }
}

if (el.addBadwordBtn) {
    el.addBadwordBtn.addEventListener('click', addBadWord);
}
if (el.badwordInput) {
    el.badwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addBadWord();
    });
}

// ============================================================
// 🔍 كشف الكلمات المحظورة
// ============================================================
function containsBadWord(text) {
    const lower = text.toLowerCase();
    for (let i = 0; i < state.badWords.length; i++) {
        if (lower.includes(state.badWords[i].toLowerCase())) return state.badWords[i];
    }
    return null;
}

function applyMute(seconds) {
    state.isMuted = true;
    if (el.msgInput) el.msgInput.disabled = true;
    if (el.sendBtn) el.sendBtn.disabled = true;
    if (el.mutedNotice) {
        el.mutedNotice.classList.add('active');
        el.mutedNotice.textContent = `⛔ ممنوع من الكتابة لمدة ${Math.ceil(seconds / 60)} دقيقة`;
    }
    if (state.muteTimeout) clearTimeout(state.muteTimeout);
    state.muteTimeout = setTimeout(() => {
        state.isMuted = false;
        if (el.msgInput) el.msgInput.disabled = false;
        if (el.sendBtn) el.sendBtn.disabled = false;
        if (el.mutedNotice) el.mutedNotice.classList.remove('active');
        if (el.msgInput) el.msgInput.focus();
    }, seconds * 1000);
}

function handleBadWord(text, sender) {
    const found = containsBadWord(text);
    if (found) {
        state.muteCount++;
        const duration = state.muteCount * 60;
        addSystemMessage(`⚠️ تنبيه: @${sender} استخدم كلمة ممنوعة "${found}" (المخالفة رقم ${state.muteCount})`, 'warning');
        applyMute(duration);
        db.collection('violations').add({
            user: sender,
            word: found,
            text: text,
            count: state.muteCount,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    }
    return false;
}

// ============================================================
// 🔍 البحث في الرسائل
// ============================================================
if (el.searchBtn) {
    el.searchBtn.addEventListener('click', function() {
        if (el.searchBar) {
            el.searchBar.style.display = el.searchBar.style.display === 'none' ? 'block' : 'none';
        }
        if (el.searchBar?.style.display === 'block') {
            if (el.searchInput) {
                el.searchInput.focus();
            }
            if (el.searchResults) {
                el.searchResults.innerHTML = '';
                el.searchResults.classList.remove('active');
            }
        }
    });
}

if (el.searchClose) {
    el.searchClose.addEventListener('click', function() {
        if (el.searchBar) el.searchBar.style.display = 'none';
        if (el.searchResults) {
            el.searchResults.innerHTML = '';
            el.searchResults.classList.remove('active');
        }
        if (el.searchInput) el.searchInput.value = '';
    });
}

if (el.searchInput) {
    el.searchInput.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        if (query.length < 2) {
            if (el.searchResults) {
                el.searchResults.innerHTML = '';
                el.searchResults.classList.remove('active');
            }
            return;
        }

        const results = [];
        if (el.messages) {
            const messages = el.messages.querySelectorAll('.msg-group');
            messages.forEach(msg => {
                const textEl = msg.querySelector('.msg-text');
                if (textEl && !textEl.querySelector('.deleted-badge')) {
                    const text = textEl.textContent.toLowerCase();
                    if (text.includes(query)) {
                        const sender = msg.dataset.sender || 'مستخدم';
                        const time = msg.querySelector('.msg-time')?.textContent || '';
                        results.push({
                            element: msg,
                            text: textEl.textContent,
                            sender: sender,
                            time: time
                        });
                    }
                }
            });
        }

        if (!el.searchResults) return;
        
        if (results.length === 0) {
            el.searchResults.innerHTML = '<div style="padding:8px;color:var(--whatsapp-text-muted);font-size:13px;text-align:center;">🔍 لا توجد نتائج</div>';
            el.searchResults.classList.add('active');
            return;
        }

        let html = '';
        results.forEach((result, index) => {
            html += `
                <div class="search-result-item" data-index="${index}">
                    <div class="result-sender">${result.sender}</div>
                    <div class="result-text">${result.text.substring(0, 80)}${result.text.length > 80 ? '...' : ''}</div>
                    <div class="result-time">${result.time}</div>
                </div>
            `;
        });
        el.searchResults.innerHTML = html;
        el.searchResults.classList.add('active');

        document.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                const result = results[index];
                if (result && result.element) {
                    result.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    result.element.style.background = 'var(--whatsapp-teal)';
                    result.element.style.opacity = '0.5';
                    setTimeout(() => {
                        result.element.style.background = '';
                        result.element.style.opacity = '';
                    }, 2000);
                    if (el.searchBar) el.searchBar.style.display = 'none';
                    if (el.searchResults) {
                        el.searchResults.classList.remove('active');
                        el.searchResults.innerHTML = '';
                    }
                    if (el.searchInput) el.searchInput.value = '';
                }
            });
        });
    });
}

// ============================================================
// 💬 إنشاء الرسائل
// ============================================================
let lastSender = '';

function createMessage(id, data, self) {
    if (state.blockedUsers.includes(data.sender) && !self) return null;

    const group = document.createElement('div');
    const grouped = (data.sender === lastSender && lastSender !== '');
    group.className = `msg-group ${self ? 'self' : 'other'}${grouped ? ' grouped' : ''}`;
    group.dataset.id = id;
    group.dataset.sender = data.sender;
    lastSender = data.sender;

    // الصورة الرمزية
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    const avatarData = data.avatar || '';

    if (avatarData && avatarData.startsWith('data:image')) {
        avatar.innerHTML = `<img src="${avatarData}" alt="${data.sender}" loading="lazy">`;
    } else {
        const initials = getInitials(data.sender);
        const color = getAvatarColor(data.sender);
        avatar.style.background = color;
        avatar.textContent = initials;
        avatar.style.display = 'flex';
        avatar.style.alignItems = 'center';
        avatar.style.justifyContent = 'center';
        avatar.style.fontSize = '12px';
        avatar.style.fontWeight = '600';
        avatar.style.color = '#fff';
    }

    // محتوى الرسالة
    const content = document.createElement('div');
    content.className = 'msg-content';

    // اسم المرسل
    const sender = document.createElement('div');
    sender.className = 'msg-sender';
    sender.textContent = data.sender;
    if (data.sender === ADMIN_NAME) {
        const tag = document.createElement('span');
        tag.className = 'admin-tag';
        tag.textContent = '👑 مسؤول';
        sender.appendChild(tag);
    }

    // الفقاعة
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    // الرد
    if (data.replyTo) {
        const reply = document.createElement('div');
        reply.className = 'reply-box';
        reply.innerHTML = `<span class="r-sender">@${data.replyTo.sender}</span> ${data.replyTo.text.substring(0, 60)}${data.replyTo.text.length > 60 ? '...' : ''}`;
        bubble.appendChild(reply);
    }

    // النص
    const text = document.createElement('div');
    text.className = 'msg-text';
    if (data.deleted) {
        text.innerHTML = '<span class="deleted-badge">🗑️ تم حذف هذه الرسالة نهائياً</span>';
    } else {
        if (isEmojiOnly(data.text)) text.classList.add('emoji-big');
        text.textContent = data.text;
        if (data.edited) {
            const ed = document.createElement('span');
            ed.className = 'edited-badge';
            ed.textContent = '(معدّل)';
            text.appendChild(ed);
        }
        bubble.appendChild(text);
    }

    // الوقت
    const time = document.createElement('div');
    time.className = 'msg-time';
    if (data.timestamp) {
        const date = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
        time.textContent = date.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
        if (self && !data.deleted) {
            time.innerHTML += ' <span class="read-status"><span class="material-symbols-outlined" style="font-size:10px;">done_all</span></span>';
        }
    }

    // التفاعلات
    const reactions = document.createElement('div');
    reactions.className = 'msg-reactions';
    if (data.reactions && Object.keys(data.reactions).length > 0) {
        Object.keys(data.reactions).forEach(emoji => {
            const users = data.reactions[emoji] || [];
            const count = users.length;
            const reacted = users.includes(state.currentUser);
            const reactionEl = document.createElement('button');
            reactionEl.className = `msg-reaction${reacted ? ' reacted' : ''}`;
            reactionEl.innerHTML = `${emoji} <span class="reaction-count">${count}</span>`;
            reactionEl.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleReaction(id, emoji);
            });
            reactions.appendChild(reactionEl);
        });
    }

    // قائمة الإجراءات
    const actions = document.createElement('div');
    actions.className = 'msg-actions';
    actions.id = `actions-${id}`;
    
    let actionsHTML = `
        <button class="reply" data-action="reply" title="رد">
            <span class="material-symbols-outlined">reply</span>
            <span class="action-label">رد</span>
        </button>
        <button class="react" data-action="react" title="تفاعل">
            <span class="material-symbols-outlined">emoji_emotions</span>
            <span class="action-label">تفاعل</span>
        </button>
        <button class="copy" data-action="copy" title="نسخ">
            <span class="material-symbols-outlined">content_copy</span>
            <span class="action-label">نسخ</span>
        </button>
    `;
    
    if (data.sender === state.currentUser && !data.deleted) {
        actionsHTML += `
            <button class="edit" data-action="edit" title="تعديل">
                <span class="material-symbols-outlined">edit</span>
                <span class="action-label">تعديل</span>
            </button>
        `;
    }
    
    actionsHTML += `
        <button class="report" data-action="report" title="إبلاغ">
            <span class="material-symbols-outlined">flag</span>
            <span class="action-label">إبلاغ</span>
        </button>
    `;
    
    if (state.isAdmin && !data.deleted) {
        actionsHTML += `
            <button class="delete" data-action="delete" title="حذف">
                <span class="material-symbols-outlined">delete_forever</span>
                <span class="action-label">حذف</span>
            </button>
        `;
    }
    
    if (state.isAdmin && data.sender !== ADMIN_NAME) {
        actionsHTML += `
            <button class="block" data-action="block" title="حظر">
                <span class="material-symbols-outlined">block</span>
                <span class="action-label">حظر</span>
            </button>
        `;
    }
    
    actions.innerHTML = actionsHTML;

    // ربط أحداث الأزرار
    actions.querySelector('.reply')?.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        hideAllMessageActions(200);
        setTimeout(() => {
            setReply(id, data.sender, data.text);
        }, 250);
    });
    
    actions.querySelector('.react')?.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        hideAllMessageActions(200);
        setTimeout(() => {
            showReactionPicker(id);
        }, 250);
    });
    
    actions.querySelector('.copy')?.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        const textToCopy = data.text;
        navigator.clipboard.writeText(textToCopy).then(() => {
            addSystemMessage('📋 تم نسخ النص', 'info');
        }).catch(() => {});
        hideAllMessageActions(200);
    });
    
    actions.querySelector('.edit')?.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        if (data.text) {
            hideAllMessageActions(300);
            setTimeout(() => {
                startEdit(id, data.text);
            }, 350);
        }
    });
    
    actions.querySelector('.report')?.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        hideAllMessageActions(200);
        setTimeout(() => {
            reportMsg(id, data.sender);
        }, 250);
    });
    
    actions.querySelector('.delete')?.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        hideAllMessageActions(0);
        setTimeout(() => {
            deleteMsg(id);
        }, 200);
    });
    
    actions.querySelector('.block')?.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        hideAllMessageActions(200);
        setTimeout(() => {
            blockUser(data.sender);
        }, 250);
    });

    // إضافة العناصر
    content.appendChild(sender);
    content.appendChild(bubble);
    if (reactions.children.length > 0) {
        content.appendChild(reactions);
    }
    content.appendChild(time);
    content.appendChild(actions);

    if (self) {
        group.appendChild(content);
        group.appendChild(avatar);
    } else {
        group.appendChild(avatar);
        group.appendChild(content);
    }

    // الضغط المطول
    let longPressTimer = null;
    let isLongPress = false;

    const startPress = function(e) {
        isLongPress = false;
        longPressTimer = setTimeout(() => {
            isLongPress = true;
            showMessageActions(actions, group);
        }, 500);
    };

    const endPress = function(e) {
        clearTimeout(longPressTimer);
    };

    group.addEventListener('mousedown', startPress);
    group.addEventListener('mouseup', endPress);
    group.addEventListener('mouseleave', endPress);
    group.addEventListener('touchstart', startPress, { passive: true });
    group.addEventListener('touchend', endPress, { passive: true });
    group.addEventListener('touchmove', function(e) {
        clearTimeout(longPressTimer);
    }, { passive: true });

    return group;
}

// ============================================================
// 🎯 إظهار وإخفاء الخيارات
// ============================================================
function showMessageActions(actionsElement, messageElement) {
    document.querySelectorAll('.msg-actions.active').forEach(el => {
        el.classList.remove('active');
    });
    
    actionsElement.classList.add('active');
    
    if (actionsOverlay) {
        actionsOverlay.classList.add('active');
    }
    
    actionsElement.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    if (messageElement) {
        state.activeMessageId = messageElement.dataset.id;
    }
}

function hideAllMessageActions(delay = 0) {
    if (state.hideTimeout) {
        clearTimeout(state.hideTimeout);
        state.hideTimeout = null;
    }
    
    if (delay > 0) {
        state.hideTimeout = setTimeout(() => {
            document.querySelectorAll('.msg-actions.active').forEach(el => {
                el.classList.remove('active');
            });
            if (actionsOverlay) {
                actionsOverlay.classList.remove('active');
            }
            state.activeMessageId = null;
            state.hideTimeout = null;
        }, delay);
    } else {
        document.querySelectorAll('.msg-actions.active').forEach(el => {
            el.classList.remove('active');
        });
        if (actionsOverlay) {
            actionsOverlay.classList.remove('active');
        }
        state.activeMessageId = null;
    }
}

if (actionsOverlay) {
    actionsOverlay.addEventListener('click', function() {
        hideAllMessageActions(100);
    });
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        hideAllMessageActions(100);
    }
});

document.addEventListener('mousedown', function(e) {
    if (e.target.closest('.msg-actions')) {
        e.stopPropagation();
    }
});

document.addEventListener('touchstart', function(e) {
    if (e.target.closest('.msg-actions')) {
        e.stopPropagation();
    }
}, { passive: true });

if (el.messages) {
    el.messages.addEventListener('scroll', function() {
        hideAllMessageActions(100);
    }, { passive: true });
}

// ============================================================
// 😊 لوحة التفاعلات
// ============================================================
let currentReactionMessageId = null;

function showReactionPicker(messageId) {
    currentReactionMessageId = messageId;
    if (el.reactionPicker) {
        el.reactionPicker.classList.toggle('active');
    }
    const msgEl = document.querySelector(`[data-id="${messageId}"]`);
    if (msgEl && el.reactionPicker) {
        const rect = msgEl.getBoundingClientRect();
        const containerRect = document.querySelector('.chat-container')?.getBoundingClientRect();
        if (containerRect) {
            const top = rect.top - containerRect.top - 60;
            el.reactionPicker.style.top = Math.max(10, top) + 'px';
        }
    }
}

document.querySelectorAll('.reaction-option').forEach(btn => {
    btn.addEventListener('click', function() {
        if (currentReactionMessageId) {
            toggleReaction(currentReactionMessageId, this.dataset.reaction);
            if (el.reactionPicker) el.reactionPicker.classList.remove('active');
            currentReactionMessageId = null;
        }
    });
});

function toggleReaction(messageId, emoji) {
    const msgRef = db.collection('messages').doc(messageId);
    db.runTransaction(async (transaction) => {
        const doc = await transaction.get(msgRef);
        if (!doc.exists) return;
        const data = doc.data();
        const reactions = data.reactions || {};
        if (!reactions[emoji]) {
            reactions[emoji] = [];
        }
        const index = reactions[emoji].indexOf(state.currentUser);
        if (index > -1) {
            reactions[emoji].splice(index, 1);
            if (reactions[emoji].length === 0) {
                delete reactions[emoji];
            }
        } else {
            reactions[emoji].push(state.currentUser);
        }
        transaction.update(msgRef, { reactions });
    }).catch(err => console.error('❌ خطأ في التفاعل:', err));
}

// ============================================================
// 📨 إضافة رسالة
// ============================================================
function addMessage(id, data, self) {
    if (state.messageIds.has(id)) return;
    state.messageIds.add(id);

    if (el.emptyState) el.emptyState.style.display = 'none';
    const elMsg = createMessage(id, data, self);
    if (elMsg && el.messages) {
        el.messages.appendChild(elMsg);
        if (!isScrolledToBottom()) {
            state.unreadCount++;
            updateNewMsgBadge();
        }
        setTimeout(() => {
            if (el.messages) {
                el.messages.scrollTop = el.messages.scrollHeight;
            }
        }, 100);
        updateMessageCount();
    }
}

function isScrolledToBottom() {
    if (!el.messages) return true;
    return el.messages.scrollTop + el.messages.clientHeight >= el.messages.scrollHeight - 50;
}

function updateNewMsgBadge() {
    if (el.newMsgBadge) {
        if (state.unreadCount > 0) {
            el.newMsgBadge.textContent = state.unreadCount;
            el.newMsgBadge.classList.add('show');
        } else {
            el.newMsgBadge.classList.remove('show');
        }
    }
}

function addSystemMessage(text, type) {
    type = type || '';
    if (el.emptyState) el.emptyState.style.display = 'none';
    const div = document.createElement('div');
    div.className = `system-msg${type ? ' ' + type : ''}`;
    div.textContent = text;
    if (el.messages) {
        el.messages.appendChild(div);
        el.messages.scrollTop = el.messages.scrollHeight;
    }
    updateMessageCount();
}

function showRules() {
    const rulesHTML = `
        <div class="rule-title">📜 قوانين الغروب</div>
        <div class="rule-item">1. احترام جميع الأعضاء</div>
        <div class="rule-item">2. لا للسب أو الشتم</div>
        <div class="rule-item">3. لا للمضايقات أو التحرش</div>
        <div class="rule-item">4. لا للمحتوى غير اللائق</div>
        <div class="rule-item">5. الالتزام بالموضوعية</div>
        <div class="rule-item">6. لا للإعلانات دون إذن</div>
        <div class="rule-item">7. احترام قرارات المسؤول</div>
    `;
    const div = document.createElement('div');
    div.className = 'system-msg rules';
    div.innerHTML = rulesHTML;
    if (el.messages) {
        el.messages.appendChild(div);
        el.messages.scrollTop = el.messages.scrollHeight;
    }
    updateMessageCount();
}

// ============================================================
// 📊 عدد الرسائل والمستخدمين
// ============================================================
function updateMessageCount() {
    if (!el.messages) return;
    const count = el.messages.querySelectorAll('.msg-group, .system-msg').length;
    const existing = el.messages.querySelector('.msg-count');
    if (existing) existing.remove();

    if (count > 0) {
        const div = document.createElement('div');
        div.className = 'msg-count';
        div.innerHTML = `📬 <span>${count}</span> رسالة`;
        el.messages.insertBefore(div, el.messages.firstChild);
    }
}

function updateOnlineCount() {
    if (el.onlineCount) {
        el.onlineCount.textContent = `🟢 ${state.onlineUsers.size}`;
    }
}

// ============================================================
// 📥 تحميل الرسائل
// ============================================================
function loadMessages() {
    if (el.emptyState) el.emptyState.style.display = 'flex';
    lastSender = '';
    state.messageIds.clear();

    db.collection('messages')
        .orderBy('timestamp', 'asc')
        .get()
        .then(snapshot => {
            if (el.emptyState) el.emptyState.style.display = 'none';

            const promises = [];
            const tempMessages = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                if (state.blockedUsers.includes(data.sender)) return;

                if (!data.avatar) {
                    const promise = db.collection('users').doc(data.sender).get()
                        .then(userDoc => {
                            if (userDoc.exists) {
                                data.avatar = userDoc.data().avatar || '';
                            }
                            tempMessages.push({ id: doc.id, data });
                        })
                        .catch(() => {
                            tempMessages.push({ id: doc.id, data });
                        });
                    promises.push(promise);
                } else {
                    tempMessages.push({ id: doc.id, data });
                }
            });

            Promise.all(promises).then(() => {
                tempMessages.forEach(({ id, data }) => {
                    addMessage(id, data, data.sender === state.currentUser);
                });

                if (snapshot.empty && el.emptyState) el.emptyState.style.display = 'flex';
                showRules();
                updateMessageCount();

                setTimeout(() => {
                    if (el.messages) {
                        el.messages.scrollTop = el.messages.scrollHeight;
                    }
                }, 100);
            });
        })
        .catch(err => {
            console.error('❌ خطأ في تحميل الرسائل:', err);
        });
}

function listenMessages() {
    if (state.unsubscribe) state.unsubscribe();
    lastSender = '';

    state.unsubscribe = db.collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                const data = change.doc.data();
                if (state.blockedUsers.includes(data.sender)) return;

                if (change.type === 'added') {
                    if (!state.messageIds.has(change.doc.id)) {
                        if (!data.avatar) {
                            db.collection('users').doc(data.sender).get()
                                .then(userDoc => {
                                    if (userDoc.exists) {
                                        data.avatar = userDoc.data().avatar || '';
                                    }
                                    addMessage(change.doc.id, data, data.sender === state.currentUser);
                                })
                                .catch(() => {
                                    addMessage(change.doc.id, data, data.sender === state.currentUser);
                                });
                        } else {
                            addMessage(change.doc.id, data, data.sender === state.currentUser);
                        }
                    }
                }

                if (change.type === 'modified') {
                    const existing = el.messages?.querySelector(`[data-id="${change.doc.id}"]`);
                    if (existing) {
                        const text = existing.querySelector('.msg-text');
                        if (text) {
                            if (data.deleted) {
                                text.innerHTML = '<span class="deleted-badge">🗑️ تم حذف هذه الرسالة نهائياً</span>';
                            } else {
                                text.innerHTML = data.text + (data.edited ? ' <span class="edited-badge">(معدّل)</span>' : '');
                                if (isEmojiOnly(data.text)) text.classList.add('emoji-big');
                                else text.classList.remove('emoji-big');
                            }
                        }
                        const reactionsContainer = existing.querySelector('.msg-reactions');
                        if (reactionsContainer) {
                            reactionsContainer.innerHTML = '';
                            if (data.reactions && Object.keys(data.reactions).length > 0) {
                                Object.keys(data.reactions).forEach(emoji => {
                                    const users = data.reactions[emoji] || [];
                                    const count = users.length;
                                    const reacted = users.includes(state.currentUser);
                                    const reactionEl = document.createElement('button');
                                    reactionEl.className = `msg-reaction${reacted ? ' reacted' : ''}`;
                                    reactionEl.innerHTML = `${emoji} <span class="reaction-count">${count}</span>`;
                                    reactionEl.addEventListener('click', function(e) {
                                        e.stopPropagation();
                                        toggleReaction(change.doc.id, emoji);
                                    });
                                    reactionsContainer.appendChild(reactionEl);
                                });
                            }
                        }
                    }
                }

                if (change.type === 'removed') {
                    const existing = el.messages?.querySelector(`[data-id="${change.doc.id}"]`);
                    if (existing) existing.remove();
                    state.messageIds.delete(change.doc.id);
                    updateMessageCount();
                }
            });

            if (snapshot.empty) {
                if (el.emptyState) el.emptyState.style.display = 'flex';
            } else {
                if (el.emptyState) el.emptyState.style.display = 'none';
            }
        }, error => {
            console.error('❌ خطأ في الاستماع للرسائل:', error);
        });
}

// ============================================================
// 📤 إرسال الرسالة
// ============================================================
function sendMessage() {
    const raw = el.msgInput ? el.msgInput.value.trim() : '';
    if (!raw || !state.isLoggedIn) {
        return;
    }
    if (state.isMuted) {
        alert('⛔ أنت ممنوع من الكتابة حالياً');
        return;
    }
    
    const text = sanitizeInput(raw);
    if (!text) return;
    if (handleBadWord(text, state.currentUser)) {
        if (el.msgInput) el.msgInput.value = '';
        return;
    }
    if (state.editingMessage) {
        updateMsg(state.editingMessage.id, text);
        return;
    }

    if (el.sendBtn) el.sendBtn.disabled = true;
    if (el.msgInput) el.msgInput.disabled = true;

    const data = {
        text: text,
        sender: state.currentUser,
        color: state.userColor,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        ip: state.userIP,
        avatar: state.userAvatarBase64,
        reactions: {}
    };

    if (state.replyTo) {
        data.replyTo = {
            id: state.replyTo.id,
            sender: state.replyTo.sender,
            text: state.replyTo.text.substring(0, 60) + (state.replyTo.text.length > 60 ? '...' : '')
        };
    }

    db.collection('messages').add(data)
        .then(() => {
            if (el.msgInput) el.msgInput.value = '';
            if (el.msgInput) el.msgInput.focus();
            clearReply();
            state.unreadCount = 0;
            updateNewMsgBadge();
        })
        .catch((error) => {
            console.error('❌ فشل الإرسال:', error);
            alert('⚠️ فشل الإرسال: ' + error.message);
        })
        .finally(() => {
            if (el.sendBtn) el.sendBtn.disabled = false;
            if (el.msgInput) el.msgInput.disabled = false;
        });
}

// ============================================================
// ✏️ تعديل الرسالة
// ============================================================
function startEdit(id, text) {
    state.editingMessage = { id, text };
    if (el.msgInput) el.msgInput.value = text;
    if (el.msgInput) el.msgInput.focus();
    if (el.sendBtn) {
        el.sendBtn.innerHTML = '<span class="material-symbols-outlined">check</span>';
        el.sendBtn.style.background = 'var(--orange)';
    }
}

function updateMsg(id, newText) {
    if (!state.editingMessage) return;
    
    db.collection('messages').doc(id).update({ text: newText, edited: true })
        .then(() => {
            state.editingMessage = null;
            if (el.sendBtn) {
                el.sendBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
                el.sendBtn.style.background = '';
            }
            if (el.msgInput) el.msgInput.value = '';
        })
        .catch(err => console.error('❌ خطأ في التعديل:', err));
}

// ============================================================
// 🗑️ حذف الرسالة
// ============================================================
function deleteMsg(id) {
    if (!state.isAdmin) return;
    if (!confirm('🗑️ هل أنت متأكد من حذف هذه الرسالة نهائياً؟\nلا يمكن استعادتها بعد الحذف.')) return;
    
    db.collection('messages').doc(id).delete()
        .then(() => {
            addSystemMessage('🗑️ تم حذف رسالة نهائياً بواسطة المسؤول', 'success');
            state.messageIds.delete(id);
            updateMessageCount();
        })
        .catch(err => {
            console.error('❌ خطأ في الحذف:', err);
            alert('⚠️ فشل حذف الرسالة');
        });
}

// ============================================================
// 🗑️ حذف الدردشة
// ============================================================
function clearChat() {
    if (!state.isAdmin || !state.isAdminVerified) return;
    if (!confirm('⚠️ هل أنت متأكد من حذف جميع الرسائل نهائياً؟\nلا يمكن استعادتها بعد الحذف.')) return;

    showLoading(true);
    db.collection('messages').get()
        .then(snapshot => {
            const batch = db.batch();
            snapshot.forEach(doc => batch.delete(doc.ref));
            return batch.commit();
        })
        .then(() => {
            addSystemMessage('🗑️ تم حذف جميع الرسائل نهائياً بواسطة المسؤول', 'success');
            if (el.messages) {
                el.messages.querySelectorAll('.msg-group, .system-msg, .msg-count').forEach(el => el.remove());
            }
            if (el.emptyState) el.emptyState.style.display = 'flex';
            state.messageIds.clear();
            updateMessageCount();
            showLoading(false);
        })
        .catch(err => {
            console.error('❌ خطأ في حذف الدردشة:', err);
            alert('⚠️ فشل حذف الدردشة');
            showLoading(false);
        });
}

if (el.clearChatBtn) {
    el.clearChatBtn.addEventListener('click', clearChat);
}

// ============================================================
// 🚫 الحظر
// ============================================================
function blockUser(username) {
    if (!state.isAdmin || username === ADMIN_NAME) return;
    if (!confirm(`🚫 حظر @${username} نهائياً؟`)) return;
    
    if (!state.blockedUsers.includes(username)) {
        state.blockedUsers.push(username);
        db.collection('blocked').doc('list').set({ users: state.blockedUsers })
            .then(() => {
                addSystemMessage(`🚫 @${username} تم حظره بواسطة المسؤول`, 'warning');
                if (el.messages) {
                    el.messages.querySelectorAll(`[data-sender="${username}"]`).forEach(el => el.remove());
                }
                loadAdminUsers();
                updateMessageCount();
            });
    }
}

function unblockUser(username) {
    if (!state.isAdmin) return;
    if (!confirm(`🔓 هل أنت متأكد من فك الحظر عن @${username}؟`)) return;
    
    const index = state.blockedUsers.indexOf(username);
    if (index > -1) {
        state.blockedUsers.splice(index, 1);
        db.collection('blocked').doc('list').set({ users: state.blockedUsers })
            .then(() => {
                addSystemMessage(`✅ @${username} تم فك الحظر عنه بواسطة المسؤول`, 'success');
                loadAdminUsers();
                loadMessages();
            });
    }
}

// ============================================================
// 🗑️ حذف الحساب
// ============================================================
function deleteUserAccount(username) {
    if (!state.isAdmin || username === ADMIN_NAME) return;
    if (!confirm(`⚠️ هل أنت متأكد من حذف حساب @${username} بالكامل؟\nسيتم حذف جميع رسائله وبياناته نهائياً.`))
        return;

    showLoading(true);
    db.collection('users').doc(username).delete()
        .then(() => {
            return db.collection('messages').where('sender', '==', username).get()
                .then(snapshot => {
                    const batch = db.batch();
                    snapshot.forEach(doc => batch.delete(doc.ref));
                    return batch.commit();
                });
        })
        .then(() => {
            const index = state.blockedUsers.indexOf(username);
            if (index > -1) {
                state.blockedUsers.splice(index, 1);
                return db.collection('blocked').doc('list').set({ users: state.blockedUsers });
            }
        })
        .then(() => {
            addSystemMessage(`🗑️ تم حذف حساب @${username} بالكامل نهائياً بواسطة المسؤول`, 'success');
            if (el.messages) {
                el.messages.querySelectorAll(`[data-sender="${username}"]`).forEach(el => el.remove());
            }
            loadAdminUsers();
            showLoading(false);
            updateMessageCount();
        })
        .catch(() => {
            alert('⚠️ حدث خطأ');
            showLoading(false);
        });
}

// ============================================================
// 📋 تحميل المحظورين
// ============================================================
function loadBlockedUsers() {
    return db.collection('blocked').doc('list').get()
        .then(doc => {
            state.blockedUsers = (doc.exists && doc.data().users) ? doc.data().users : [];
            return state.blockedUsers;
        })
        .catch(() => {
            state.blockedUsers = [];
            return state.blockedUsers;
        });
}

// ============================================================
// 📋 الإبلاغ
// ============================================================
function reportMsg(id, sender) {
    if (confirm(`📋 الإبلاغ عن @${sender}؟`)) {
        db.collection('reports').add({
            messageId: id,
            sender: sender,
            reportedBy: state.currentUser,
            reportedIP: state.userIP,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            addSystemMessage(`📋 تم الإبلاغ عن @${sender}`);
        });
    }
}

// ============================================================
// 📌 شريط الرجعة
// ============================================================
function setReply(id, sender, text) {
    state.replyTo = { id, sender, text };
    
    if (el.replyBarSender) {
        el.replyBarSender.textContent = `@${sender}`;
    }
    if (el.replyBarText) {
        el.replyBarText.textContent = text.substring(0, 80) + (text.length > 80 ? '...' : '');
    }
    if (el.replyBar) {
        el.replyBar.style.display = 'flex';
        el.replyBar.style.animation = 'slideDown 0.2s ease';
    }
    
    if (el.msgInput) {
        el.msgInput.placeholder = 'اكتب ردك...';
        el.msgInput.focus();
    }
}

function clearReply() {
    state.replyTo = null;
    if (el.replyBar) {
        el.replyBar.style.display = 'none';
    }
    if (el.msgInput) {
        el.msgInput.placeholder = 'اكتب رسالة...';
    }
}

if (el.replyBarClose) {
    el.replyBarClose.addEventListener('click', clearReply);
}

// ============================================================
// 👥 قائمة المستخدمين للمسؤول
// ============================================================
function loadAdminUsers() {
    if (!state.isAdmin || !state.isAdminVerified) return;
    if (!el.adminUsersList) return;
    
    el.adminUsersList.innerHTML = '<div style="color:var(--whatsapp-text-muted);font-size:12px;">جاري التحميل...</div>';

    db.collection('users').get()
        .then(snapshot => {
            if (snapshot.empty) {
                el.adminUsersList.innerHTML = '<div style="color:var(--whatsapp-text-muted);font-size:12px;">لا يوجد مستخدمون مسجلون</div>';
                return;
            }

            db.collection('users').where('online', '==', true).get()
                .then(onlineSnapshot => {
                    const onlineSet = new Set();
                    onlineSnapshot.forEach(doc => onlineSet.add(doc.id));
                    state.onlineUsers = onlineSet;
                    updateOnlineCount();

                    db.collection('violations').get()
                        .then(violationsSnapshot => {
                            const violationCount = {};
                            violationsSnapshot.forEach(doc => {
                                const data = doc.data();
                                if (data.user) violationCount[data.user] = (violationCount[data.user] || 0) + 1;
                            });

                            let html = '';
                            snapshot.forEach(doc => {
                                const data = doc.data();
                                const blocked = state.blockedUsers.includes(data.username);
                                const online = onlineSet.has(data.username);
                                const vcount = violationCount[data.username] || 0;
                                let avatarHtml = '';

                                if (data.avatar && data.avatar.startsWith('data:image')) {
                                    avatarHtml = `<img src="${data.avatar}" alt="${data.username}">`;
                                } else {
                                    avatarHtml = getInitials(data.username);
                                }

                                html += `
                                    <div class="user-item">
                                        <div class="user-info">
                                            <div class="user-avatar-small" style="display:flex;align-items:center;justify-content:center;background:${getAvatarColor(data.username)};color:#fff;font-weight:600;">
                                                ${avatarHtml}
                                            </div>
                                            <span>${data.username}${data.username === ADMIN_NAME ? ' 👑' : ''}${blocked ? ' 🚫' : ''}${online ? ' 🟢' : ' ⚪'}</span>
                                            ${vcount > 0 ? `<span style="font-size:9px;color:var(--orange);background:rgba(251,191,36,0.1);padding:0 5px;border-radius:4px;">⚠️ ${vcount}</span>` : ''}
                                        </div>
                                        <div class="user-actions">
                                            ${data.username !== ADMIN_NAME ? `
                                                ${blocked ? 
                                                    `<button class="unblock-user" onclick="unblockUser('${data.username}')" title="فك الحظر"><span class="material-symbols-outlined">check_circle</span></button>` :
                                                    `<button class="block-user" onclick="blockUser('${data.username}')" title="حظر"><span class="material-symbols-outlined">block</span></button>`
                                                }
                                                <button class="delete-user" onclick="deleteUserAccount('${data.username}')" title="حذف الحساب نهائياً"><span class="material-symbols-outlined">delete_forever</span></button>
                                            ` : ''}
                                        </div>
                                    </div>
                                `;
                            });
                            el.adminUsersList.innerHTML = html;
                        });
                });
        })
        .catch(() => {
            el.adminUsersList.innerHTML = '<div style="color:var(--red);font-size:12px;">❌ خطأ في التحميل</div>';
        });
}

// ============================================================
// 🚪 تسجيل الخروج القسري
// ============================================================
if (el.forceLogoutBtn) {
    el.forceLogoutBtn.addEventListener('click', function() {
        if (!state.isAdmin || !state.isAdminVerified) return;
        if (!confirm('⚠️ هل أنت متأكد من تسجيل خروج جميع المستخدمين؟')) return;

        showLoading(true);
        db.collection('users').where('online', '==', true).get()
            .then(snapshot => {
                const batch = db.batch();
                snapshot.forEach(doc => batch.update(doc.ref, { online: false, forceLogout: true }));
                return batch.commit();
            })
            .then(() => {
                addSystemMessage('👑 المسؤول قام بتسجيل خروج جميع المستخدمين');
                loadAdminUsers();
                showLoading(false);
            })
            .catch(() => {
                alert('⚠️ حدث خطأ');
                showLoading(false);
            });
    });
}

// ============================================================
// 🚪 تسجيل الخروج
// ============================================================
function logout() {
    if (!confirm('🚪 تسجيل الخروج؟\nسيتم حذف جلسة الدخول من هذا الجهاز.')) return;
    localStorage.removeItem('chat_session');
    performLogout();
}

function performLogout() {
    if (state.currentUser) {
        db.collection('users').doc(state.currentUser).update({
            online: false,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
        addSystemMessage(`👋 ${state.currentUser} غادر الدردشة`);
    }

    state.isLoggedIn = false;
    state.currentUser = '';
    state.isAdmin = false;
    state.isAdminVerified = false;

    if (state.unsubscribe) state.unsubscribe();

    if (el.chatContainer) el.chatContainer.style.display = 'none';
    if (el.loginOverlay) el.loginOverlay.classList.remove('hidden');

    if (el.messages) {
        el.messages.innerHTML = `
            <div class="empty-state" id="emptyState">
                <div class="empty-icon"><span class="material-symbols-outlined">chat</span></div>
                <div class="empty-title">لا توجد رسائل</div>
                <div class="empty-sub">كن أول من يكتب ✨</div>
            </div>
        `;
    }

    if (el.msgInput) el.msgInput.disabled = true;
    if (el.sendBtn) {
        el.sendBtn.disabled = true;
        el.sendBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
        el.sendBtn.style.background = '';
    }
    clearReply();
    state.editingMessage = null;

    if (el.infoMsg) {
        el.infoMsg.textContent = '👋 تم تسجيل الخروج';
        el.infoMsg.classList.add('show');
        setTimeout(() => {
            if (el.infoMsg) el.infoMsg.classList.remove('show');
        }, 2000);
    }

    if (el.usernameInput) el.usernameInput.value = '';
    if (el.loginAdminPasswordBox) el.loginAdminPasswordBox.style.display = 'none';
    state.isAdminLoginAttempt = false;

    state.userAvatarBase64 = '';
    state.tempAvatarBase64 = '';
    state.messageIds.clear();
    state.unreadCount = 0;
    updateNewMsgBadge();
    state.onlineUsers.clear();
    updateOnlineCount();
}

if (el.logoutBtn) {
    el.logoutBtn.addEventListener('click', logout);
}

// ============================================================
// 🔍 التحقق من الخروج القسري
// ============================================================
function checkForceLogout() {
    if (state.currentUser) {
        db.collection('users').doc(state.currentUser).get()
            .then(doc => {
                if (doc.exists && doc.data().forceLogout === true) {
                    db.collection('users').doc(state.currentUser).update({ forceLogout: false });
                    addSystemMessage('🔒 تم تسجيل خروجك قسراً بواسطة المسؤول');
                    setTimeout(() => performLogout(), 1000);
                }
            })
            .catch(() => {});
    }
}
setInterval(checkForceLogout, 5000);

// ============================================================
// 👤 حالة المستخدم
// ============================================================
function setUserOnline(name) {
    db.collection('users').doc(name).set({
        username: name,
        color: state.userColor,
        ip: state.userIP,
        online: true,
        forceLogout: false,
        avatar: state.userAvatarBase64 || '',
        firstSeen: firebase.firestore.FieldValue.serverTimestamp(),
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// ============================================================
// 💾 حفظ الجلسة
// ============================================================
function saveSession(username, color, avatar) {
    try {
        const session = {
            username: username,
            color: color,
            ip: state.userIP,
            avatar: avatar || '',
            timestamp: Date.now()
        };
        localStorage.setItem('chat_session', JSON.stringify(session));
        console.log('✅ تم حفظ الجلسة');
    } catch (e) {
        console.log('⚠️ لا يمكن حفظ الجلسة');
    }
}

// ============================================================
// 🔍 التحقق من الجلسة
// ============================================================
function checkSession() {
    try {
        const sessionData = localStorage.getItem('chat_session');
        if (!sessionData) return null;
        const session = JSON.parse(sessionData);
        const maxAge = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - session.timestamp > maxAge) {
            localStorage.removeItem('chat_session');
            return null;
        }
        return session;
    } catch (e) {
        return null;
    }
}

// ============================================================
// 🚪 تسجيل الدخول
// ============================================================
async function login() {
    console.log('🟢 محاولة تسجيل الدخول...');
    
    const raw = el.usernameInput ? el.usernameInput.value.trim() : '';
    
    if (!raw || raw.length < 2) {
        if (el.loginError) {
            el.loginError.style.display = 'block';
            el.loginError.textContent = '⚠️ الاسم يجب أن يكون حرفين على الأقل';
        }
        return;
    }

    if (raw === ADMIN_NAME) {
        const pass = el.loginAdminPasswordInput ? el.loginAdminPasswordInput.value.trim() : '';
        
        if (pass !== ADMIN_PASSWORD) {
            if (el.loginAdminPasswordError) {
                el.loginAdminPasswordError.classList.add('show');
            }
            if (el.loginAdminPasswordInput) {
                el.loginAdminPasswordInput.value = '';
                el.loginAdminPasswordInput.focus();
            }
            return;
        }
        if (el.loginAdminPasswordError) {
            el.loginAdminPasswordError.classList.remove('show');
        }
    }

    const name = sanitizeInput(raw);
    if (!name) {
        if (el.loginError) {
            el.loginError.textContent = '⚠️ اسم غير صالح';
            el.loginError.style.display = 'block';
        }
        return;
    }

    if (el.loginError) el.loginError.style.display = 'none';
    if (el.connectionError) el.connectionError.style.display = 'none';

    showLoading(true);
    if (el.loginBtn) {
        el.loginBtn.disabled = true;
        el.loginBtn.innerHTML = '⏳ جاري...';
    }

    try {
        state.userIP = getHashedIP();

        const userDoc = await db.collection('users').doc(name).get();
        let avatarBase64 = '';
        if (userDoc.exists && userDoc.data().avatar) {
            avatarBase64 = userDoc.data().avatar;
        }

        await auth.signInAnonymously();

        state.currentUser = name;
        state.userAvatarBase64 = avatarBase64;
        state.isLoggedIn = true;
        state.isAdmin = (name === ADMIN_NAME);
        state.isMuted = false;
        state.muteCount = 0;

        if (state.muteTimeout) clearTimeout(state.muteTimeout);
        if (el.mutedNotice) el.mutedNotice.classList.remove('active');

        if (state.isAdmin) {
            if (el.adminBtn) el.adminBtn.classList.remove('hidden');
            if (el.adminBadge) el.adminBadge.classList.add('show');
        } else {
            if (el.adminBtn) el.adminBtn.classList.add('hidden');
            if (el.adminBadge) el.adminBadge.classList.remove('show');
        }

        await loadBlockedUsers();

        if (el.loginOverlay) el.loginOverlay.classList.add('hidden');
        if (el.chatContainer) el.chatContainer.style.display = 'flex';

        if (el.msgInput) el.msgInput.disabled = false;
        if (el.sendBtn) el.sendBtn.disabled = false;
        if (el.msgInput) el.msgInput.focus();

        updateAllAvatars(avatarBase64, name);

        if (state.isAdmin) {
            db.collection('users').doc(name).update({ forceLogout: false }).catch(() => {});
        }

        setUserOnline(name);
        saveSession(name, state.userColor, avatarBase64);

        if (state.isAdmin) {
            db.collection('settings').doc('theme').get()
                .then(doc => {
                    if (doc.exists && doc.data().theme) {
                        applyTheme(doc.data().theme);
                    }
                })
                .catch(() => {});
        }

        if (!userDoc.exists) {
            addSystemMessage(`👋 مرحباً ${name}! هذه أول مرة لك في الغروب`);
        } else if (state.isAdmin) {
            addSystemMessage(`👑 المسؤول ${name} انضم إلى الدردشة`);
        } else {
            addSystemMessage(`👋 ${name} انضم إلى الدردشة`);
        }

        loadMessages();
        listenMessages();
        loadBadWords();

        db.collection('users').where('online', '==', true).onSnapshot(snapshot => {
            state.onlineUsers.clear();
            snapshot.forEach(doc => state.onlineUsers.add(doc.id));
            updateOnlineCount();
        });

        window.addEventListener('beforeunload', function() {
            if (state.currentUser) {
                db.collection('users').doc(state.currentUser).update({ online: false });
            }
        });

    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        if (el.connectionError) {
            el.connectionError.textContent = `❌ ${error.message}`;
            el.connectionError.style.display = 'block';
        }
        if (el.loginBtn) {
            el.loginBtn.disabled = false;
            el.loginBtn.innerHTML = 'دخول';
        }
        showLoading(false);
        return;
    }

    showLoading(false);
    if (el.loginBtn) {
        el.loginBtn.disabled = false;
        el.loginBtn.innerHTML = 'دخول';
    }
}

// ============================================================
// 🔄 أحداث الدخول
// ============================================================
if (el.loginBtn) {
    el.loginBtn.addEventListener('click', function(e) {
        e.preventDefault();
        login();
    });
}

if (el.usernameInput) {
    el.usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (state.isAdminLoginAttempt) {
                if (el.loginAdminPasswordInput) {
                    el.loginAdminPasswordInput.focus();
                }
            } else {
                login();
            }
        }
    });
}

if (el.loginAdminPasswordInput) {
    el.loginAdminPasswordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            login();
        }
    });
}

// ============================================================
// ⌨️ أحداث الإدخال
// ============================================================
if (el.msgInput) {
    el.msgInput.addEventListener('keydown', function(e) {
        // Shift + Enter = سطر جديد
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            const value = this.value;
            this.value = value.substring(0, start) + '\n' + value.substring(end);
            this.selectionStart = this.selectionEnd = start + 1;
            return;
        }
        
        // Enter فقط = إرسال
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (el.sendBtn && !el.sendBtn.disabled) {
                el.sendBtn.click();
            }
            return;
        }
        
        // Escape = إلغاء
        if (e.key === 'Escape') {
            if (state.editingMessage) {
                state.editingMessage = null;
                if (el.sendBtn) {
                    el.sendBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
                    el.sendBtn.style.background = '';
                }
                if (el.msgInput) el.msgInput.value = '';
            }
            clearReply();
            hideAllMessageActions(100);
        }
    });
}

// ============================================================
// 🔄 بدء التشغيل
// ============================================================
function init() {
    console.log('🚀 بدء تشغيل التطبيق...');
    
    loadSavedTheme();
    
    if (el.infoMsg) {
        el.infoMsg.textContent = '👋 أدخل اسمك ثم اضغط دخول';
        el.infoMsg.classList.add('show');
        setTimeout(() => {
            if (el.infoMsg) el.infoMsg.classList.remove('show');
        }, 3000);
    }

    const session = checkSession();
    if (session) {
        if (el.usernameInput) el.usernameInput.value = session.username || '';
        state.userColor = session.color || '#2b6ef0';
        state.userAvatarBase64 = session.avatar || '';
        document.querySelectorAll('.color-circle').forEach(el => {
            el.classList.toggle('selected', el.dataset.color === state.userColor);
        });
        setTimeout(() => login(), 500);
    }
}

// ============================================================
// 🖱️ زر التمرير للأسفل
// ============================================================
if (el.messages) {
    el.messages.addEventListener('scroll', function() {
        const atBottom = this.scrollTop + this.clientHeight >= this.scrollHeight - 50;
        if (el.scrollBottomBtn) {
            el.scrollBottomBtn.classList.toggle('show', !atBottom);
        }
        if (atBottom && state.unreadCount > 0) {
            state.unreadCount = 0;
            updateNewMsgBadge();
        }
    });
}

if (el.scrollBottomBtn) {
    el.scrollBottomBtn.addEventListener('click', function() {
        if (el.messages) {
            el.messages.scrollTo({ top: el.messages.scrollHeight, behavior: 'smooth' });
        }
        if (state.unreadCount > 0) {
            state.unreadCount = 0;
            updateNewMsgBadge();
        }
    });
}

// ============================================================
// 📤 أحداث الإرسال
// ============================================================
if (el.sendBtn) {
    el.sendBtn.addEventListener('click', sendMessage);
}

// ============================================================
// 🚀 بدء التطبيق
// ============================================================
state.userIP = getHashedIP();

console.log(`🚀 نيزك ${VERSION} - دردشة متطورة`);
console.log(`👑 المسؤول: ${ADMIN_NAME}`);
console.log(`🔒 كلمة المرور: ${ADMIN_PASSWORD}`);
console.log(`⌨️ Shift+Enter = سطر جديد, Enter = إرسال`);
console.log(`🖱️ ضغط مطول = قائمة الخيارات`);

// بدء التطبيق بعد تحميل الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 تم تحميل الصفحة');
        init();
    });
} else {
    console.log('📄 الصفحة جاهزة');
    init();
}

console.log('✅ تم تحميل التطبيق بالكامل');
