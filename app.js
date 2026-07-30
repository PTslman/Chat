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
const storage = firebase.storage();

// تمكين التخزين المؤقت دون اتصال
db.enablePersistence({ synchronizeTabs: true })
    .then(() => console.log('✅ تم تمكين التخزين المؤقت'))
    .catch((err) => console.warn('⚠️ تعذر تمكين التخزين المؤقت:', err));

// ============================================================
// 👑 إعدادات المسؤول
// ============================================================
const ADMIN_NAME = "slx23m";
const ADMIN_PASSWORD = "1442";
const VERSION = "v5.0.0";

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
// 📦 حالة التطبيق (State)
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

const elements = {};

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
        'searchResults', 'searchClose', 'fileViewer', 'fileViewerTitle',
        'fileViewerBody', 'fileViewerImage', 'fileViewerFile',
        'fileViewerFileName', 'fileViewerDownload', 'fileViewerAudio',
        'fileViewerAudioPlayer', 'closeFileViewer', 'appFooter',
        'statusTime', 'colorPicker', 'msgActionsOverlay'
    ];
    
    ids.forEach(id => {
        elements[id] = $(id);
        if (!elements[id] && !id.includes('Overlay')) {
            console.warn(`⚠️ عنصر مفقود: ${id}`);
        }
    });
}

initElements();

// ============================================================
// 🎯 إنشاء overlay للخيارات
// ============================================================
let actionsOverlay = document.getElementById('msgActionsOverlay');
if (!actionsOverlay) {
    actionsOverlay = document.createElement('div');
    actionsOverlay.className = 'msg-actions-overlay';
    actionsOverlay.id = 'msgActionsOverlay';
    document.body.appendChild(actionsOverlay);
    elements.msgActionsOverlay = actionsOverlay;
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
        const fontSize = element === elements.profileAvatarPreview ? '34px' : '16px';
        element.innerHTML = `
            <span style="background:${color};display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:50%;font-size:${fontSize};font-weight:700;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,0.2);">
                ${initials}
            </span>
        `;
        if (placeholder) placeholder.textContent = '';
    }
}

function updateAllAvatars(avatarBase64, name) {
    updateAvatarUI(elements.headerAvatar, elements.headerAvatarPlaceholder, avatarBase64, name);
    updateAvatarUI(elements.profileAvatarPreview, elements.profileAvatarPlaceholder, avatarBase64, name);
    if (elements.headerUsername) elements.headerUsername.textContent = name;
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
    if (elements.profileNameInput) elements.profileNameInput.value = state.currentUser;
    if (elements.profileModal) elements.profileModal.classList.add('active');
    updateAvatarUI(elements.profileAvatarPreview, elements.profileAvatarPlaceholder, state.userAvatarBase64, state.currentUser);
    if (elements.profileUploadStatus) {
        elements.profileUploadStatus.className = 'upload-status';
        elements.profileUploadStatus.textContent = '';
    }
}

async function saveProfile() {
    const newName = elements.profileNameInput ? elements.profileNameInput.value.trim() : '';
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
        if (elements.profileModal) elements.profileModal.classList.remove('active');

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

    if (elements.themeIcon) {
        elements.themeIcon.textContent = theme === 'light' ? 'light_mode' : 'dark_mode';
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
    if (elements.loadingOverlay) {
        if (show) {
            elements.loadingOverlay.classList.add('active');
        } else {
            elements.loadingOverlay.classList.remove('active');
        }
    }
}

function updateClock() {
    const now = new Date();
    if (elements.statusTime) {
        elements.statusTime.textContent = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
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
if (elements.emojiToggle) {
    elements.emojiToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        if (elements.emojiRail) {
            elements.emojiRail.classList.toggle('active');
        }
        this.classList.toggle('active');
    });
}

document.addEventListener('click', function(e) {
    if (elements.emojiRail && !elements.emojiRail.contains(e.target) && e.target !== elements.emojiToggle && !elements.emojiToggle?.contains(e.target)) {
        elements.emojiRail.classList.remove('active');
        elements.emojiToggle?.classList.remove('active');
    }
    if (elements.reactionPicker && !elements.reactionPicker.contains(e.target)) {
        elements.reactionPicker.classList.remove('active');
    }
});

document.querySelectorAll('.emoji-item').forEach(el => {
    el.addEventListener('click', function() {
        if (elements.msgInput) {
            elements.msgInput.value += this.textContent;
            elements.msgInput.focus();
        }
        if (elements.emojiRail) elements.emojiRail.classList.remove('active');
        if (elements.emojiToggle) elements.emojiToggle.classList.remove('active');
    });
});

// ============================================================
// 🌓 أحداث الثيم
// ============================================================
if (elements.themeToggle) {
    elements.themeToggle.addEventListener('click', toggleTheme);
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
if (elements.usernameInput) {
    elements.usernameInput.addEventListener('input', function() {
        const val = this.value.trim();
        
        if (val === ADMIN_NAME) {
            if (elements.loginAdminPasswordBox) {
                elements.loginAdminPasswordBox.style.display = 'block';
            }
            if (elements.loginAdminPasswordInput) {
                elements.loginAdminPasswordInput.value = '';
            }
            if (elements.loginAdminPasswordError) {
                elements.loginAdminPasswordError.classList.remove('show');
            }
            state.isAdminLoginAttempt = true;
        } else {
            if (elements.loginAdminPasswordBox) {
                elements.loginAdminPasswordBox.style.display = 'none';
            }
            state.isAdminLoginAttempt = false;
        }
    });
}

// ============================================================
// 📸 أحداث الصورة الشخصية
// ============================================================
if (elements.profileAvatarBtn) {
    elements.profileAvatarBtn.addEventListener('click', () => {
        if (elements.profileAvatarInput) elements.profileAvatarInput.click();
    });
}
if (elements.profileAvatarPreview) {
    elements.profileAvatarPreview.addEventListener('click', () => {
        if (elements.profileAvatarInput) elements.profileAvatarInput.click();
    });
}

if (elements.profileAvatarInput) {
    elements.profileAvatarInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            if (file.size > 5 * 1024 * 1024) {
                alert('⚠️ حجم الصورة كبير جداً (الحد الأقصى 5MB)');
                this.value = '';
                return;
            }

            compressImageToBase64(file, 300, 300, 0.6, elements.profileUploadStatus)
                .then(base64 => {
                    if (elements.profileAvatarPreview) {
                        elements.profileAvatarPreview.innerHTML = `<img src="${base64}" alt="صورة شخصية">`;
                    }
                    if (elements.profileAvatarPlaceholder) {
                        elements.profileAvatarPlaceholder.textContent = '';
                    }
                    state.tempAvatarBase64 = base64;
                    if (elements.profileUploadStatus) {
                        elements.profileUploadStatus.textContent = '📸 تم اختيار الصورة، اضغط حفظ للتحديث';
                        elements.profileUploadStatus.className = 'upload-status show success';
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
if (elements.headerAvatar) {
    elements.headerAvatar.addEventListener('click', () => state.isLoggedIn && openProfileModal());
}

if (elements.closeProfileModal) {
    elements.closeProfileModal.addEventListener('click', () => {
        if (elements.profileModal) elements.profileModal.classList.remove('active');
        state.tempAvatarBase64 = '';
        if (elements.profileUploadStatus) {
            elements.profileUploadStatus.className = 'upload-status';
            elements.profileUploadStatus.textContent = '';
        }
    });
}

if (elements.profileModal) {
    elements.profileModal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
            state.tempAvatarBase64 = '';
            if (elements.profileUploadStatus) {
                elements.profileUploadStatus.className = 'upload-status';
                elements.profileUploadStatus.textContent = '';
            }
        }
    });
}

if (elements.profileSaveBtn) {
    elements.profileSaveBtn.addEventListener('click', saveProfile);
}

if (elements.profileNameInput) {
    elements.profileNameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') saveProfile();
    });
}

// ============================================================
// 📋 النوافذ المنبثقة
// ============================================================
if (elements.rulesBtn) {
    elements.rulesBtn.addEventListener('click', () => {
        if (elements.rulesModal) elements.rulesModal.classList.toggle('active');
    });
}
if (elements.closeRulesModal) {
    elements.closeRulesModal.addEventListener('click', () => {
        if (elements.rulesModal) elements.rulesModal.classList.remove('active');
    });
}
if (elements.rulesModal) {
    elements.rulesModal.addEventListener('click', function(e) {
        if (e.target === this) this.classList.remove('active');
    });
}

if (elements.adminBtn) {
    elements.adminBtn.addEventListener('click', function() {
        state.isAdminVerified = false;
        if (elements.adminPanel) elements.adminPanel.style.display = 'none';
        if (elements.adminPasswordBox) elements.adminPasswordBox.style.display = 'block';
        if (elements.adminPasswordInput) {
            elements.adminPasswordInput.value = '';
        }
        if (elements.adminPasswordError) {
            elements.adminPasswordError.classList.remove('show');
        }
        if (elements.adminModal) elements.adminModal.classList.toggle('active');
        if (elements.adminModal?.classList.contains('active') && elements.adminPasswordInput) {
            elements.adminPasswordInput.focus();
        }
    });
}

if (elements.adminPasswordBtn) {
    elements.adminPasswordBtn.addEventListener('click', function() {
        const pass = elements.adminPasswordInput ? elements.adminPasswordInput.value.trim() : '';
        if (pass === ADMIN_PASSWORD) {
            state.isAdminVerified = true;
            if (elements.adminPasswordBox) elements.adminPasswordBox.style.display = 'none';
            if (elements.adminPanel) elements.adminPanel.style.display = 'block';
            loadAdminUsers();
            loadBadWords();
        } else {
            if (elements.adminPasswordError) elements.adminPasswordError.classList.add('show');
            if (elements.adminPasswordInput) {
                elements.adminPasswordInput.value = '';
                elements.adminPasswordInput.focus();
            }
        }
    });
}

if (elements.adminPasswordInput) {
    elements.adminPasswordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && elements.adminPasswordBtn) {
            elements.adminPasswordBtn.click();
        }
    });
}

if (elements.closeAdminModal) {
    elements.closeAdminModal.addEventListener('click', function() {
        if (elements.adminModal) elements.adminModal.classList.remove('active');
        state.isAdminVerified = false;
    });
}

if (elements.adminModal) {
    elements.adminModal.addEventListener('click', function(e) {
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
    if (!elements.badwordsList) return;
    if (!state.badWords.length) {
        elements.badwordsList.innerHTML = '<span style="color:var(--text-muted);font-size:11px;">لا توجد كلمات محظورة</span>';
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
    elements.badwordsList.innerHTML = html;
    document.querySelectorAll('.remove-badword').forEach(btn => {
        btn.addEventListener('click', function() {
            removeBadWord(this.dataset.word);
        });
    });
}

function addBadWord() {
    const word = elements.badwordInput ? elements.badwordInput.value.trim() : '';
    if (!word) return;
    if (state.badWords.includes(word)) {
        alert('⚠️ هذه الكلمة موجودة بالفعل');
        return;
    }
    state.badWords.push(word);
    saveBadWords();
    renderBadWords();
    if (elements.badwordInput) {
        elements.badwordInput.value = '';
        elements.badwordInput.focus();
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

if (elements.addBadwordBtn) {
    elements.addBadwordBtn.addEventListener('click', addBadWord);
}
if (elements.badwordInput) {
    elements.badwordInput.addEventListener('keypress', function(e) {
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
    if (elements.msgInput) elements.msgInput.disabled = true;
    if (elements.sendBtn) elements.sendBtn.disabled = true;
    if (elements.mutedNotice) {
        elements.mutedNotice.classList.add('active');
        elements.mutedNotice.textContent = `⛔ ممنوع من الكتابة لمدة ${Math.ceil(seconds / 60)} دقيقة`;
    }
    if (state.muteTimeout) clearTimeout(state.muteTimeout);
    state.muteTimeout = setTimeout(() => {
        state.isMuted = false;
        if (elements.msgInput) elements.msgInput.disabled = false;
        if (elements.sendBtn) elements.sendBtn.disabled = false;
        if (elements.mutedNotice) elements.mutedNotice.classList.remove('active');
        if (elements.msgInput) elements.msgInput.focus();
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
if (elements.searchBtn) {
    elements.searchBtn.addEventListener('click', function() {
        if (elements.searchBar) {
            elements.searchBar.style.display = elements.searchBar.style.display === 'none' ? 'block' : 'none';
        }
        if (elements.searchBar?.style.display === 'block') {
            if (elements.searchInput) {
                elements.searchInput.focus();
            }
            if (elements.searchResults) {
                elements.searchResults.innerHTML = '';
                elements.searchResults.classList.remove('active');
            }
        }
    });
}

if (elements.searchClose) {
    elements.searchClose.addEventListener('click', function() {
        if (elements.searchBar) elements.searchBar.style.display = 'none';
        if (elements.searchResults) {
            elements.searchResults.innerHTML = '';
            elements.searchResults.classList.remove('active');
        }
        if (elements.searchInput) elements.searchInput.value = '';
    });
}

if (elements.searchInput) {
    elements.searchInput.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        if (query.length < 2) {
            if (elements.searchResults) {
                elements.searchResults.innerHTML = '';
                elements.searchResults.classList.remove('active');
            }
            return;
        }

        const results = [];
        if (elements.messages) {
            const messages = elements.messages.querySelectorAll('.msg-group');
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

        if (!elements.searchResults) return;
        
        if (results.length === 0) {
            elements.searchResults.innerHTML = '<div style="padding:8px;color:var(--text-muted);font-size:13px;text-align:center;">🔍 لا توجد نتائج</div>';
            elements.searchResults.classList.add('active');
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
        elements.searchResults.innerHTML = html;
        elements.searchResults.classList.add('active');

        document.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                const result = results[index];
                if (result && result.element) {
                    result.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    result.element.style.background = 'var(--accent-glow)';
                    setTimeout(() => {
                        result.element.style.background = '';
                    }, 2000);
                    if (elements.searchBar) elements.searchBar.style.display = 'none';
                    if (elements.searchResults) {
                        elements.searchResults.classList.remove('active');
                        elements.searchResults.innerHTML = '';
                    }
                    if (elements.searchInput) elements.searchInput.value = '';
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
        if (data.file) {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'msg-file';
            fileDiv.innerHTML = `
                <span class="file-icon material-symbols-outlined">${data.file.icon || 'attach_file'}</span>
                <div class="file-info">
                    <div class="file-name">${data.file.name}</div>
                    <div class="file-size">${formatFileSize(data.file.size)}</div>
                </div>
                <button class="file-download material-symbols-outlined">download</button>
            `;
            
            if (data.file.type === 'image') {
                const img = document.createElement('img');
                img.src = data.file.url;
                img.className = 'msg-image';
                img.loading = 'lazy';
                img.addEventListener('click', function(e) {
                    e.stopPropagation();
                    openFileViewer(data.file, data.sender);
                });
                bubble.appendChild(img);
            } else if (data.file.type === 'audio') {
                const audioDiv = document.createElement('div');
                audioDiv.className = 'msg-audio';
                audioDiv.innerHTML = `<audio controls><source src="${data.file.url}" type="${data.file.mimeType || 'audio/webm'}"></audio>`;
                bubble.appendChild(audioDiv);
            } else {
                bubble.appendChild(fileDiv);
                fileDiv.querySelector('.file-download').addEventListener('click', function(e) {
                    e.stopPropagation();
                    window.open(data.file.url, '_blank');
                });
                fileDiv.addEventListener('click', function(e) {
                    if (!e.target.closest('.file-download')) {
                        openFileViewer(data.file, data.sender);
                    }
                });
            }
        } else if (data.audio) {
            const audioDiv = document.createElement('div');
            audioDiv.className = 'msg-audio';
            const duration = data.audioDuration ? ` (${data.audioDuration}ث)` : '';
            audioDiv.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                    <span style="font-size:12px;color:var(--text-muted);">🎤 رسالة صوتية${duration}</span>
                </div>
                <audio controls><source src="${data.audio}" type="audio/webm"></audio>
            `;
            bubble.appendChild(audioDiv);
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

    // ============================================================
    // 🎯 قائمة الإجراءات
    // ============================================================
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
    
    if (data.sender === state.currentUser && !data.deleted && !data.file && !data.audio) {
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

    // ============================================================
    // 🔧 ربط أحداث الأزرار
    // ============================================================
    actions.querySelector('.reply')?.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        hideAllMessageActions(200);
        setTimeout(() => {
            setReply(id, data.sender, data.text || 'ملف');
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
        const textToCopy = data.text || data.file?.name || 'رسالة';
        navigator.clipboard.writeText(textToCopy).then(() => {
            addSystemMessage('📋 تم نسخ النص', 'info');
        }).catch(() => {});
        hideAllMessageActions(200);
    });
    
    actions.querySelector('.edit')?.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        if (data.text && !data.file && !data.audio) {
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

    // ============================================================
    // 🖱️ الضغط المطول
    // ============================================================
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

// منع الإغلاق عند النقر على الخيارات
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

// إغلاق الخيارات عند التمرير
if (elements.messages) {
    elements.messages.addEventListener('scroll', function() {
        hideAllMessageActions(100);
    }, { passive: true });
}

// ============================================================
// 😊 لوحة التفاعلات
// ============================================================
let currentReactionMessageId = null;

function showReactionPicker(messageId) {
    currentReactionMessageId = messageId;
    if (elements.reactionPicker) {
        elements.reactionPicker.classList.toggle('active');
    }
    const msgEl = document.querySelector(`[data-id="${messageId}"]`);
    if (msgEl && elements.reactionPicker) {
        const rect = msgEl.getBoundingClientRect();
        const containerRect = document.querySelector('.chat-container')?.getBoundingClientRect();
        if (containerRect) {
            const top = rect.top - containerRect.top - 60;
            elements.reactionPicker.style.top = Math.max(10, top) + 'px';
        }
    }
}

document.querySelectorAll('.reaction-option').forEach(btn => {
    btn.addEventListener('click', function() {
        if (currentReactionMessageId) {
            toggleReaction(currentReactionMessageId, this.dataset.reaction);
            if (elements.reactionPicker) elements.reactionPicker.classList.remove('active');
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

    if (elements.emptyState) elements.emptyState.style.display = 'none';
    const el = createMessage(id, data, self);
    if (el && elements.messages) {
        elements.messages.appendChild(el);
        if (!isScrolledToBottom()) {
            state.unreadCount++;
            updateNewMsgBadge();
        }
        setTimeout(() => {
            if (elements.messages) {
                elements.messages.scrollTop = elements.messages.scrollHeight;
            }
        }, 100);
        updateMessageCount();
    }
}

function isScrolledToBottom() {
    if (!elements.messages) return true;
    return elements.messages.scrollTop + elements.messages.clientHeight >= elements.messages.scrollHeight - 50;
}

function updateNewMsgBadge() {
    if (elements.newMsgBadge) {
        if (state.unreadCount > 0) {
            elements.newMsgBadge.textContent = state.unreadCount;
            elements.newMsgBadge.classList.add('show');
        } else {
            elements.newMsgBadge.classList.remove('show');
        }
    }
}

function addSystemMessage(text, type) {
    type = type || '';
    if (elements.emptyState) elements.emptyState.style.display = 'none';
    const div = document.createElement('div');
    div.className = `system-msg${type ? ' ' + type : ''}`;
    div.textContent = text;
    if (elements.messages) {
        elements.messages.appendChild(div);
        elements.messages.scrollTop = elements.messages.scrollHeight;
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
    if (elements.messages) {
        elements.messages.appendChild(div);
        elements.messages.scrollTop = elements.messages.scrollHeight;
    }
    updateMessageCount();
}

// ============================================================
// 📊 عدد الرسائل والمستخدمين
// ============================================================
function updateMessageCount() {
    if (!elements.messages) return;
    const count = elements.messages.querySelectorAll('.msg-group, .system-msg').length;
    const existing = elements.messages.querySelector('.msg-count');
    if (existing) existing.remove();

    if (count > 0) {
        const div = document.createElement('div');
        div.className = 'msg-count';
        div.innerHTML = `📬 <span>${count}</span> رسالة`;
        elements.messages.insertBefore(div, elements.messages.firstChild);
    }
}

function updateOnlineCount() {
    if (elements.onlineCount) {
        elements.onlineCount.textContent = `🟢 ${state.onlineUsers.size}`;
    }
}

// ============================================================
// 📥 تحميل الرسائل
// ============================================================
function loadMessages() {
    if (elements.emptyState) elements.emptyState.style.display = 'flex';
    lastSender = '';
    state.messageIds.clear();

    db.collection('messages')
        .orderBy('timestamp', 'asc')
        .get()
        .then(snapshot => {
            if (elements.emptyState) elements.emptyState.style.display = 'none';

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

                if (snapshot.empty && elements.emptyState) elements.emptyState.style.display = 'flex';
                showRules();
                updateMessageCount();

                setTimeout(() => {
                    if (elements.messages) {
                        elements.messages.scrollTop = elements.messages.scrollHeight;
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
                    const existing = elements.messages?.querySelector(`[data-id="${change.doc.id}"]`);
                    if (existing) {
                        const text = existing.querySelector('.msg-text');
                        if (text) {
                            if (data.deleted) {
                                text.innerHTML = '<span class="deleted-badge">🗑️ تم حذف هذه الرسالة نهائياً</span>';
                            } else if (data.file || data.audio) {
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
                    const existing = elements.messages?.querySelector(`[data-id="${change.doc.id}"]`);
                    if (existing) existing.remove();
                    state.messageIds.delete(change.doc.id);
                    updateMessageCount();
                }
            });

            if (snapshot.empty) {
                if (elements.emptyState) elements.emptyState.style.display = 'flex';
            } else {
                if (elements.emptyState) elements.emptyState.style.display = 'none';
            }
        }, error => {
            console.error('❌ خطأ في الاستماع للرسائل:', error);
        });
}

// ============================================================
// 📤 إرسال الرسالة
// ============================================================
function sendMessage() {
    const raw = elements.msgInput ? elements.msgInput.value.trim() : '';
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
        if (elements.msgInput) elements.msgInput.value = '';
        return;
    }
    if (state.editingMessage) {
        updateMsg(state.editingMessage.id, text);
        return;
    }

    if (elements.sendBtn) elements.sendBtn.disabled = true;
    if (elements.msgInput) elements.msgInput.disabled = true;

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
            if (elements.msgInput) elements.msgInput.value = '';
            if (elements.msgInput) elements.msgInput.focus();
            clearReply();
            state.unreadCount = 0;
            updateNewMsgBadge();
        })
        .catch((error) => {
            console.error('❌ فشل الإرسال:', error);
            alert('⚠️ فشل الإرسال: ' + error.message);
        })
        .finally(() => {
            if (elements.sendBtn) elements.sendBtn.disabled = false;
            if (elements.msgInput) elements.msgInput.disabled = false;
        });
}

// ============================================================
// ✏️ تعديل الرسالة
// ============================================================
function startEdit(id, text) {
    state.editingMessage = { id, text };
    if (elements.msgInput) elements.msgInput.value = text;
    if (elements.msgInput) elements.msgInput.focus();
    if (elements.sendBtn) {
        elements.sendBtn.innerHTML = '<span class="material-symbols-outlined">check</span>';
        elements.sendBtn.style.background = 'var(--orange)';
    }
}

function updateMsg(id, newText) {
    if (!state.editingMessage) return;
    
    db.collection('messages').doc(id).update({ text: newText, edited: true })
        .then(() => {
            state.editingMessage = null;
            if (elements.sendBtn) {
                elements.sendBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
                elements.sendBtn.style.background = '';
            }
            if (elements.msgInput) elements.msgInput.value = '';
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
            if (elements.messages) {
                elements.messages.querySelectorAll('.msg-group, .system-msg, .msg-count').forEach(el => el.remove());
            }
            if (elements.emptyState) elements.emptyState.style.display = 'flex';
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

if (elements.clearChatBtn) {
    elements.clearChatBtn.addEventListener('click', clearChat);
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
                if (elements.messages) {
                    elements.messages.querySelectorAll(`[data-sender="${username}"]`).forEach(el => el.remove());
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
            if (elements.messages) {
                elements.messages.querySelectorAll(`[data-sender="${username}"]`).forEach(el => el.remove());
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
    
    if (elements.replyBarSender) {
        elements.replyBarSender.textContent = `@${sender}`;
    }
    if (elements.replyBarText) {
        elements.replyBarText.textContent = text.substring(0, 80) + (text.length > 80 ? '...' : '');
    }
    if (elements.replyBar) {
        elements.replyBar.style.display = 'flex';
        elements.replyBar.style.animation = 'slideDown 0.2s ease';
    }
    
    if (elements.msgInput) {
        elements.msgInput.placeholder = 'اكتب ردك...';
        elements.msgInput.focus();
    }
}

function clearReply() {
    state.replyTo = null;
    if (elements.replyBar) {
        elements.replyBar.style.display = 'none';
    }
    if (elements.msgInput) {
        elements.msgInput.placeholder = 'اكتب رسالة...';
    }
}

if (elements.replyBarClose) {
    elements.replyBarClose.addEventListener('click', clearReply);
}

// ============================================================
// 👥 قائمة المستخدمين للمسؤول
// ============================================================
function loadAdminUsers() {
    if (!state.isAdmin || !state.isAdminVerified) return;
    if (!db) {
        if (elements.adminUsersList) {
            elements.adminUsersList.innerHTML = '<div style="color:var(--text-muted);font-size:12px;">جاري الاتصال...</div>';
        }
        setTimeout(loadAdminUsers, 2000);
        return;
    }
    
    if (elements.adminUsersList) {
        elements.adminUsersList.innerHTML = '<div style="color:var(--text-muted);font-size:12px;">جاري التحميل...</div>';
    }

    db.collection('users').get()
        .then(snapshot => {
            if (snapshot.empty) {
                if (elements.adminUsersList) {
                    elements.adminUsersList.innerHTML = '<div style="color:var(--text-muted);font-size:12px;">لا يوجد مستخدمون مسجلون</div>';
                }
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
                                            ${vcount > 0 ? `<span style="font-size:9px;color:var(--orange);background:rgba(250,168,26,0.08);padding:0 5px;border-radius:4px;">⚠️ ${vcount}</span>` : ''}
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
                            if (elements.adminUsersList) {
                                elements.adminUsersList.innerHTML = html;
                            }
                        });
                });
        })
        .catch(() => {
            if (elements.adminUsersList) {
                elements.adminUsersList.innerHTML = '<div style="color:var(--red);font-size:12px;">❌ خطأ في التحميل</div>';
            }
        });
}

// ============================================================
// 🚪 تسجيل الخروج القسري
// ============================================================
if (elements.forceLogoutBtn) {
    elements.forceLogoutBtn.addEventListener('click', function() {
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
    if (state.currentUser && db) {
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

    if (elements.chatContainer) elements.chatContainer.style.display = 'none';
    if (elements.loginOverlay) elements.loginOverlay.classList.remove('hidden');

    if (elements.messages) {
        elements.messages.innerHTML = `
            <div class="empty-state" id="emptyState">
                <div class="empty-icon"><span class="material-symbols-outlined">chat</span></div>
                <div class="empty-title">لا توجد رسائل</div>
                <div class="empty-sub">كن أول من يكتب ✨</div>
            </div>
        `;
    }

    if (elements.msgInput) elements.msgInput.disabled = true;
    if (elements.sendBtn) {
        elements.sendBtn.disabled = true;
        elements.sendBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
        elements.sendBtn.style.background = '';
    }
    clearReply();
    state.editingMessage = null;

    if (elements.infoMsg) {
        elements.infoMsg.textContent = '👋 تم تسجيل الخروج';
        elements.infoMsg.classList.add('show');
        setTimeout(() => {
            if (elements.infoMsg) elements.infoMsg.classList.remove('show');
        }, 2000);
    }

    if (elements.usernameInput) elements.usernameInput.value = '';
    if (elements.loginAdminPasswordBox) elements.loginAdminPasswordBox.style.display = 'none';
    state.isAdminLoginAttempt = false;

    state.userAvatarBase64 = '';
    state.tempAvatarBase64 = '';
    state.messageIds.clear();
    state.unreadCount = 0;
    updateNewMsgBadge();
    state.onlineUsers.clear();
    updateOnlineCount();
}

if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', logout);
}

// ============================================================
// 🔍 التحقق من الخروج القسري
// ============================================================
function checkForceLogout() {
    if (state.currentUser && db) {
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
    if (!db) return;
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
    
    if (!db || !auth) {
        console.error('❌ Firebase غير جاهز');
        if (elements.connectionError) {
            elements.connectionError.textContent = '⚠️ جاري تهيئة الاتصال... يرجى المحاولة مرة أخرى';
            elements.connectionError.style.display = 'block';
        }
        setTimeout(() => login(), 2000);
        return;
    }
    
    const raw = elements.usernameInput ? elements.usernameInput.value.trim() : '';
    
    if (!raw || raw.length < 2) {
        if (elements.loginError) {
            elements.loginError.style.display = 'block';
            elements.loginError.textContent = '⚠️ الاسم يجب أن يكون حرفين على الأقل';
        }
        return;
    }

    if (raw === ADMIN_NAME) {
        const pass = elements.loginAdminPasswordInput ? elements.loginAdminPasswordInput.value.trim() : '';
        
        if (pass !== ADMIN_PASSWORD) {
            if (elements.loginAdminPasswordError) {
                elements.loginAdminPasswordError.classList.add('show');
            }
            if (elements.loginAdminPasswordInput) {
                elements.loginAdminPasswordInput.value = '';
                elements.loginAdminPasswordInput.focus();
            }
            return;
        }
        if (elements.loginAdminPasswordError) {
            elements.loginAdminPasswordError.classList.remove('show');
        }
    }

    const name = sanitizeInput(raw);
    if (!name) {
        if (elements.loginError) {
            elements.loginError.textContent = '⚠️ اسم غير صالح';
            elements.loginError.style.display = 'block';
        }
        return;
    }

    if (elements.loginError) elements.loginError.style.display = 'none';
    if (elements.connectionError) elements.connectionError.style.display = 'none';

    showLoading(true);
    if (elements.loginBtn) {
        elements.loginBtn.disabled = true;
        elements.loginBtn.innerHTML = '<span class="material-symbols-outlined">progress_activity</span> جاري...';
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
        if (elements.mutedNotice) elements.mutedNotice.classList.remove('active');

        if (state.isAdmin) {
            if (elements.adminBtn) elements.adminBtn.classList.remove('hidden');
            if (elements.adminBadge) elements.adminBadge.classList.add('show');
        } else {
            if (elements.adminBtn) elements.adminBtn.classList.add('hidden');
            if (elements.adminBadge) elements.adminBadge.classList.remove('show');
        }

        await loadBlockedUsers();

        if (elements.loginOverlay) elements.loginOverlay.classList.add('hidden');
        if (elements.chatContainer) elements.chatContainer.style.display = 'flex';

        if (elements.msgInput) elements.msgInput.disabled = false;
        if (elements.sendBtn) elements.sendBtn.disabled = false;
        if (elements.msgInput) elements.msgInput.focus();

        updateAllAvatars(avatarBase64, name);

        if (state.isAdmin && db) {
            db.collection('users').doc(name).update({ forceLogout: false }).catch(() => {});
        }

        setUserOnline(name);
        saveSession(name, state.userColor, avatarBase64);

        if (state.isAdmin && db) {
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

        if (db) {
            db.collection('users').where('online', '==', true).onSnapshot(snapshot => {
                state.onlineUsers.clear();
                snapshot.forEach(doc => state.onlineUsers.add(doc.id));
                updateOnlineCount();
            });
        }

        window.addEventListener('beforeunload', function() {
            if (state.currentUser && db) {
                db.collection('users').doc(state.currentUser).update({ online: false });
            }
        });

    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        if (elements.connectionError) {
            elements.connectionError.textContent = `❌ ${error.message}`;
            elements.connectionError.style.display = 'block';
        }
        if (elements.loginBtn) {
            elements.loginBtn.disabled = false;
            elements.loginBtn.innerHTML = '<span class="material-symbols-outlined">login</span> دخول';
        }
        showLoading(false);
        return;
    }

    showLoading(false);
    if (elements.loginBtn) {
        elements.loginBtn.disabled = false;
        elements.loginBtn.innerHTML = '<span class="material-symbols-outlined">login</span> دخول';
    }
}

// ============================================================
// 🔄 أحداث الدخول
// ============================================================
if (elements.loginBtn) {
    elements.loginBtn.addEventListener('click', function(e) {
        e.preventDefault();
        login();
    });
}

if (elements.usernameInput) {
    elements.usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (state.isAdminLoginAttempt) {
                if (elements.loginAdminPasswordInput) {
                    elements.loginAdminPasswordInput.focus();
                }
            } else {
                login();
            }
        }
    });
}

if (elements.loginAdminPasswordInput) {
    elements.loginAdminPasswordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            login();
        }
    });
}

// ============================================================
// ⌨️ أحداث الإدخال
// ============================================================
if (elements.msgInput) {
    elements.msgInput.addEventListener('keydown', function(e) {
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
            if (elements.sendBtn && !elements.sendBtn.disabled) {
                elements.sendBtn.click();
            }
            return;
        }
        
        // Escape = إلغاء
        if (e.key === 'Escape') {
            if (state.editingMessage) {
                state.editingMessage = null;
                if (elements.sendBtn) {
                    elements.sendBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
                    elements.sendBtn.style.background = '';
                }
                if (elements.msgInput) elements.msgInput.value = '';
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
    
    if (elements.infoMsg) {
        elements.infoMsg.textContent = '👋 أدخل اسمك ثم اضغط دخول';
        elements.infoMsg.classList.add('show');
        setTimeout(() => {
            if (elements.infoMsg) elements.infoMsg.classList.remove('show');
        }, 3000);
    }

    const session = checkSession();
    if (session) {
        if (elements.usernameInput) elements.usernameInput.value = session.username || '';
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
if (elements.messages) {
    elements.messages.addEventListener('scroll', function() {
        const atBottom = this.scrollTop + this.clientHeight >= this.scrollHeight - 50;
        if (elements.scrollBottomBtn) {
            elements.scrollBottomBtn.classList.toggle('show', !atBottom);
        }
        if (atBottom && state.unreadCount > 0) {
            state.unreadCount = 0;
            updateNewMsgBadge();
        }
    });
}

if (elements.scrollBottomBtn) {
    elements.scrollBottomBtn.addEventListener('click', function() {
        if (elements.messages) {
            elements.messages.scrollTo({ top: elements.messages.scrollHeight, behavior: 'smooth' });
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
if (elements.sendBtn) {
    elements.sendBtn.addEventListener('click', sendMessage);
}

// ============================================================
// 🚀 بدء التطبيق
// ============================================================
state.userIP = getHashedIP();

console.log(`🚀 نيزك ${VERSION} - دردشة متطورة مع جميع الميزات`);
console.log(`👑 المسؤول: ${ADMIN_NAME}`);
console.log(`🔒 كلمة المرور: ${ADMIN_PASSWORD}`);
console.log(`📱 الميزات: سحب للرد • تفاعلات • تعديل • بحث • شريط الرجعة`);
console.log(`⌨️ Shift+Enter = سطر جديد, Enter = إرسال`);
console.log(`🖱️ ضغط مطول = قائمة الخيارات`);
console.log(`📌 شريط الرجعة = مثل واتساب`);

// بدء التطبيق بعد تحميل الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 تم تحميل الصفحة بالكامل');
        init();
    });
} else {
    console.log('📄 الصفحة جاهزة بالفعل');
    init();
}

console.log('✅ تم تحميل التطبيق بالكامل');
