// ============================================================
// 🔥 إعدادات Firebase
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyDKF6Jb-CLB8xM7TvNfoRnxWgiwD54SOXo",
    authDomain: "chat-app-ba3c8.firebaseapp.com",
    projectId: "chat-app-ba3c8",
    storageBucket: "chat-app-ba3c8.firebasestorage.app",
    messagingSenderId: "181727674867",
    appId: "1:181727674867:web:ae9824d9051bab9f73d286"
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
    lastSender: '',
    messageIds: new Set(),
    unreadCount: 0,
    onlineUsers: new Set(),
    isMuted: false,
    muteTimeout: null,
    muteCount: 0,
    userIP: '',
    userAvatarBase64: '',
    tempAvatarBase64: ''
};

// ============================================================
// 📄 عناصر DOM
// ============================================================
const $ = id => document.getElementById(id);

const el = {
    loginOverlay: $('loginOverlay'),
    chatContainer: $('chatContainer'),
    usernameInput: $('usernameInput'),
    loginBtn: $('loginBtn'),
    loginError: $('loginError'),
    connectionError: $('connectionError'),
    infoMsg: $('infoMsg'),
    messages: $('messages'),
    msgInput: $('msgInput'),
    sendBtn: $('sendBtn'),
    emptyState: $('emptyState'),
    logoutBtn: $('logoutBtn'),
    adminBtn: $('adminBtn'),
    adminBadge: $('adminBadge'),
    adminModal: $('adminModal'),
    adminPanel: $('adminPanel'),
    adminPasswordBox: $('adminPasswordBox'),
    adminPasswordInput: $('adminPasswordInput'),
    adminPasswordBtn: $('adminPasswordBtn'),
    adminPasswordError: $('adminPasswordError'),
    adminUsersList: $('adminUsersList'),
    closeAdminModal: $('closeAdminModal'),
    forceLogoutBtn: $('forceLogoutBtn'),
    clearChatBtn: $('clearChatBtn'),
    rulesBtn: $('rulesBtn'),
    rulesModal: $('rulesModal'),
    closeRulesModal: $('closeRulesModal'),
    emojiToggle: $('emojiToggle'),
    emojiRail: $('emojiRail'),
    typingIndicator: $('typingIndicator'),
    loadingOverlay: $('loadingOverlay'),
    mutedNotice: $('mutedNotice'),
    themeToggle: $('themeToggle'),
    themeIcon: $('themeIcon'),
    scrollBottomBtn: $('scrollBottomBtn'),
    newMsgBadge: $('newMsgBadge'),
    onlineCount: $('onlineCount'),
    headerAvatar: $('headerAvatar'),
    headerAvatarPlaceholder: $('headerAvatarPlaceholder'),
    headerUsername: $('headerUsername'),
    loginAdminPasswordBox: $('loginAdminPasswordBox'),
    loginAdminPasswordInput: $('loginAdminPasswordInput'),
    loginAdminPasswordError: $('loginAdminPasswordError'),
    replyBar: $('replyBar'),
    replyBarSender: $('replyBarSender'),
    replyBarText: $('replyBarText'),
    replyBarClose: $('replyBarClose'),
    msgActionsOverlay: $('msgActionsOverlay'),
    statusTime: $('statusTime')
};

// ============================================================
// 📸 دوال الصورة الشخصية
// ============================================================
function getInitials(name) {
    if (!name) return '👤';
    return name.charAt(0).toUpperCase();
}

function getAvatarColor(name) {
    const colors = ['#2b6ef0', '#ed4245', '#faa81a', '#23a55a', '#a78bfa', '#f472b6'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function updateAvatarUI(element, placeholder, avatarBase64, name) {
    if (!element) return;
    if (avatarBase64 && avatarBase64.startsWith('data:image')) {
        element.innerHTML = `<img src="${avatarBase64}" alt="صورة شخصية">`;
        if (placeholder) placeholder.textContent = '';
    } else {
        const initials = getInitials(name);
        const color = getAvatarColor(name);
        element.innerHTML = `
            <span style="background:${color};display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:50%;font-size:16px;font-weight:700;color:#fff;">
                ${initials}
            </span>
        `;
        if (placeholder) placeholder.textContent = '';
    }
}

function updateAllAvatars(avatarBase64, name) {
    updateAvatarUI(el.headerAvatar, el.headerAvatarPlaceholder, avatarBase64, name);
    if (el.headerUsername) el.headerUsername.textContent = name;
}

// ============================================================
// 🛠️ أدوات مساعدة
// ============================================================
function sanitizeInput(text) {
    return text.replace(/[<>]/g, '').trim();
}

function showLoading(show) {
    if (el.loadingOverlay) {
        el.loadingOverlay.classList.toggle('active', show);
    }
}

function updateClock() {
    if (el.statusTime) {
        const now = new Date();
        el.statusTime.textContent = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    }
}
updateClock();
setInterval(updateClock, 30000);

function addSystemMessage(text, type = '') {
    if (el.emptyState) el.emptyState.style.display = 'none';
    const div = document.createElement('div');
    div.className = `system-msg${type ? ' ' + type : ''}`;
    div.textContent = text;
    el.messages.appendChild(div);
    el.messages.scrollTop = el.messages.scrollHeight;
}

function isScrolledToBottom() {
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

function getHashedIP() {
    const h = Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
    try { return btoa(h).substring(0, 20); } catch (e) { return h.substring(0, 20); }
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
        if (el.emojiRail) el.emojiRail.classList.toggle('active');
        this.classList.toggle('active');
    });
}

document.addEventListener('click', function(e) {
    if (el.emojiRail && !el.emojiRail.contains(e.target) && e.target !== el.emojiToggle) {
        el.emojiRail.classList.remove('active');
        if (el.emojiToggle) el.emojiToggle.classList.remove('active');
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
// 🌓 نظام الثيمات
// ============================================================
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (el.themeIcon) {
        el.themeIcon.textContent = theme === 'light' ? 'light_mode' : 'dark_mode';
    }
    try {
        localStorage.setItem('chat_theme', theme);
    } catch (e) {}
}

function toggleTheme() {
    const themes = ['dark', 'light', 'admin-dark', 'admin-forest'];
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const index = themes.indexOf(current);
    const next = (index + 1) % themes.length;
    applyTheme(themes[next]);
}

if (el.themeToggle) {
    el.themeToggle.addEventListener('click', toggleTheme);
}

// تحميل الثيم المحفوظ
try {
    const saved = localStorage.getItem('chat_theme');
    if (saved) applyTheme(saved);
} catch (e) {}

// ============================================================
// 👑 كشف المسؤول
// ============================================================
if (el.usernameInput) {
    el.usernameInput.addEventListener('input', function() {
        const val = this.value.trim();
        if (val === ADMIN_NAME) {
            if (el.loginAdminPasswordBox) el.loginAdminPasswordBox.style.display = 'block';
            if (el.loginAdminPasswordInput) el.loginAdminPasswordInput.value = '';
            if (el.loginAdminPasswordError) el.loginAdminPasswordError.classList.remove('show');
        } else {
            if (el.loginAdminPasswordBox) el.loginAdminPasswordBox.style.display = 'none';
        }
    });
}

// ============================================================
// 💬 إنشاء الرسائل
// ============================================================
let lastSender = '';

function createMessage(id, data, self) {
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
        avatar.innerHTML = `<img src="${avatarData}" alt="${data.sender}">`;
    } else {
        const initials = getInitials(data.sender);
        const color = getAvatarColor(data.sender);
        avatar.style.background = color;
        avatar.textContent = initials;
    }

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
        text.innerHTML = '<span class="deleted-badge">🗑️ تم حذف هذه الرسالة</span>';
    } else {
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
            time.innerHTML += ' <span class="read-status">✓✓</span>';
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
        <button class="reply" data-action="reply"><span class="material-symbols-outlined">reply</span><span class="action-label">رد</span></button>
        <button class="react" data-action="react"><span class="material-symbols-outlined">emoji_emotions</span><span class="action-label">تفاعل</span></button>
        <button class="copy" data-action="copy"><span class="material-symbols-outlined">content_copy</span><span class="action-label">نسخ</span></button>
    `;
    
    if (data.sender === state.currentUser && !data.deleted) {
        actionsHTML += `<button class="edit" data-action="edit"><span class="material-symbols-outlined">edit</span><span class="action-label">تعديل</span></button>`;
    }
    
    actionsHTML += `<button class="report" data-action="report"><span class="material-symbols-outlined">flag</span><span class="action-label">إبلاغ</span></button>`;
    
    if (state.isAdmin && !data.deleted) {
        actionsHTML += `<button class="delete" data-action="delete"><span class="material-symbols-outlined">delete_forever</span><span class="action-label">حذف</span></button>`;
    }
    
    if (state.isAdmin && data.sender !== ADMIN_NAME) {
        actionsHTML += `<button class="block" data-action="block"><span class="material-symbols-outlined">block</span><span class="action-label">حظر</span></button>`;
    }
    
    actions.innerHTML = actionsHTML;

    // ربط الأحداث
    actions.querySelector('.reply')?.addEventListener('click', function(e) {
        e.stopPropagation();
        hideAllMessageActions(200);
        setTimeout(() => setReply(id, data.sender, data.text), 250);
    });
    
    actions.querySelector('.react')?.addEventListener('click', function(e) {
        e.stopPropagation();
        hideAllMessageActions(200);
        setTimeout(() => showReactionPicker(id), 250);
    });
    
    actions.querySelector('.copy')?.addEventListener('click', function(e) {
        e.stopPropagation();
        navigator.clipboard.writeText(data.text).then(() => {
            addSystemMessage('📋 تم نسخ النص', 'info');
        }).catch(() => {});
        hideAllMessageActions(200);
    });
    
    actions.querySelector('.edit')?.addEventListener('click', function(e) {
        e.stopPropagation();
        hideAllMessageActions(300);
        setTimeout(() => startEdit(id, data.text), 350);
    });
    
    actions.querySelector('.report')?.addEventListener('click', function(e) {
        e.stopPropagation();
        hideAllMessageActions(200);
        setTimeout(() => reportMsg(id, data.sender), 250);
    });
    
    actions.querySelector('.delete')?.addEventListener('click', function(e) {
        e.stopPropagation();
        hideAllMessageActions(0);
        setTimeout(() => deleteMsg(id), 200);
    });
    
    actions.querySelector('.block')?.addEventListener('click', function(e) {
        e.stopPropagation();
        hideAllMessageActions(200);
        setTimeout(() => blockUser(data.sender), 250);
    });

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
    let timer = null;
    let pressed = false;
    
    group.addEventListener('mousedown', function() {
        pressed = true;
        timer = setTimeout(() => {
            if (pressed) {
                hideAllMessageActions(0);
                actions.classList.add('active');
                if (el.msgActionsOverlay) el.msgActionsOverlay.classList.add('active');
            }
        }, 500);
    });
    
    group.addEventListener('mouseup', function() {
        pressed = false;
        clearTimeout(timer);
    });
    
    group.addEventListener('mouseleave', function() {
        pressed = false;
        clearTimeout(timer);
    });
    
    group.addEventListener('touchstart', function() {
        pressed = true;
        timer = setTimeout(() => {
            if (pressed) {
                hideAllMessageActions(0);
                actions.classList.add('active');
                if (el.msgActionsOverlay) el.msgActionsOverlay.classList.add('active');
            }
        }, 500);
    }, { passive: true });
    
    group.addEventListener('touchend', function() {
        pressed = false;
        clearTimeout(timer);
    });
    
    group.addEventListener('touchmove', function() {
        pressed = false;
        clearTimeout(timer);
    });

    return group;
}

// ============================================================
// 🎯 إخفاء الخيارات
// ============================================================
let hideTimeout = null;

function hideAllMessageActions(delay = 0) {
    if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
    }
    
    if (delay > 0) {
        hideTimeout = setTimeout(() => {
            document.querySelectorAll('.msg-actions.active').forEach(el => el.classList.remove('active'));
            if (el.msgActionsOverlay) el.msgActionsOverlay.classList.remove('active');
            hideTimeout = null;
        }, delay);
    } else {
        document.querySelectorAll('.msg-actions.active').forEach(el => el.classList.remove('active'));
        if (el.msgActionsOverlay) el.msgActionsOverlay.classList.remove('active');
    }
}

if (el.msgActionsOverlay) {
    el.msgActionsOverlay.addEventListener('click', function() {
        hideAllMessageActions(100);
    });
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') hideAllMessageActions(100);
});

document.addEventListener('click', function(e) {
    if (!e.target.closest('.msg-actions') && !e.target.closest('.msg-group')) {
        hideAllMessageActions(100);
    }
});

// ============================================================
// 📨 إضافة رسالة
// ============================================================
function addMessage(id, data, self) {
    if (state.messageIds.has(id)) return;
    state.messageIds.add(id);

    if (el.emptyState) el.emptyState.style.display = 'none';
    const elMsg = createMessage(id, data, self);
    if (elMsg) {
        el.messages.appendChild(elMsg);
        if (!isScrolledToBottom()) {
            state.unreadCount++;
            updateNewMsgBadge();
        }
        setTimeout(() => {
            el.messages.scrollTop = el.messages.scrollHeight;
        }, 100);
    }
}

// ============================================================
// 😊 لوحة التفاعلات
// ============================================================
let currentReactionMessageId = null;

function showReactionPicker(messageId) {
    currentReactionMessageId = messageId;
    const picker = document.querySelector('.reaction-picker');
    if (picker) {
        picker.classList.toggle('active');
        const msgEl = document.querySelector(`[data-id="${messageId}"]`);
        if (msgEl) {
            const rect = msgEl.getBoundingClientRect();
            const containerRect = document.querySelector('.chat-container')?.getBoundingClientRect();
            if (containerRect) {
                picker.style.top = Math.max(10, rect.top - containerRect.top - 60) + 'px';
            }
        }
    }
}

document.querySelectorAll('.reaction-option').forEach(btn => {
    btn.addEventListener('click', function() {
        if (currentReactionMessageId) {
            toggleReaction(currentReactionMessageId, this.dataset.reaction);
            const picker = document.querySelector('.reaction-picker');
            if (picker) picker.classList.remove('active');
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
        if (!reactions[emoji]) reactions[emoji] = [];
        const index = reactions[emoji].indexOf(state.currentUser);
        if (index > -1) {
            reactions[emoji].splice(index, 1);
            if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
            reactions[emoji].push(state.currentUser);
        }
        transaction.update(msgRef, { reactions });
    }).catch(err => console.error('❌ خطأ في التفاعل:', err));
}

// ============================================================
// 📌 شريط الرجعة
// ============================================================
function setReply(id, sender, text) {
    state.replyTo = { id, sender, text };
    if (el.replyBarSender) el.replyBarSender.textContent = `@${sender}`;
    if (el.replyBarText) el.replyBarText.textContent = text.substring(0, 80) + (text.length > 80 ? '...' : '');
    if (el.replyBar) el.replyBar.style.display = 'flex';
    if (el.msgInput) {
        el.msgInput.placeholder = 'اكتب ردك...';
        el.msgInput.focus();
    }
}

function clearReply() {
    state.replyTo = null;
    if (el.replyBar) el.replyBar.style.display = 'none';
    if (el.msgInput) el.msgInput.placeholder = 'اكتب رسالة...';
}

if (el.replyBarClose) {
    el.replyBarClose.addEventListener('click', clearReply);
}

// ============================================================
// 📤 إرسال الرسالة
// ============================================================
function sendMessage() {
    const raw = el.msgInput ? el.msgInput.value.trim() : '';
    if (!raw || !state.isLoggedIn) return;
    if (state.isMuted) {
        alert('⛔ أنت ممنوع من الكتابة حالياً');
        return;
    }
    
    const text = sanitizeInput(raw);
    if (!text) return;
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
        el.sendBtn.style.background = '#FBBF24';
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
    if (!confirm('🗑️ هل أنت متأكد من حذف هذه الرسالة؟')) return;
    db.collection('messages').doc(id).delete()
        .then(() => {
            addSystemMessage('🗑️ تم حذف رسالة', 'success');
            state.messageIds.delete(id);
        })
        .catch(err => {
            console.error('❌ خطأ في الحذف:', err);
            alert('⚠️ فشل حذف الرسالة');
        });
}

// ============================================================
// 🚫 الحظر
// ============================================================
function blockUser(username) {
    if (!state.isAdmin || username === ADMIN_NAME) return;
    if (!confirm(`🚫 حظر @${username}؟`)) return;
    if (!state.blockedUsers.includes(username)) {
        state.blockedUsers.push(username);
        db.collection('blocked').doc('list').set({ users: state.blockedUsers })
            .then(() => {
                addSystemMessage(`🚫 @${username} تم حظره`, 'warning');
                document.querySelectorAll(`[data-sender="${username}"]`).forEach(el => el.remove());
                loadAdminUsers();
            });
    }
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
        .then(() => addSystemMessage(`📋 تم الإبلاغ عن @${sender}`));
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
                            if (userDoc.exists) data.avatar = userDoc.data().avatar || '';
                            tempMessages.push({ id: doc.id, data });
                        })
                        .catch(() => tempMessages.push({ id: doc.id, data }));
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
                setTimeout(() => { el.messages.scrollTop = el.messages.scrollHeight; }, 100);
            });
        })
        .catch(err => console.error('❌ خطأ في تحميل الرسائل:', err));
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
                                    if (userDoc.exists) data.avatar = userDoc.data().avatar || '';
                                    addMessage(change.doc.id, data, data.sender === state.currentUser);
                                })
                                .catch(() => addMessage(change.doc.id, data, data.sender === state.currentUser));
                        } else {
                            addMessage(change.doc.id, data, data.sender === state.currentUser);
                        }
                    }
                }

                if (change.type === 'modified') {
                    const existing = document.querySelector(`[data-id="${change.doc.id}"]`);
                    if (existing) {
                        const text = existing.querySelector('.msg-text');
                        if (text) {
                            if (data.deleted) {
                                text.innerHTML = '<span class="deleted-badge">🗑️ تم حذف هذه الرسالة</span>';
                            } else {
                                text.innerHTML = data.text + (data.edited ? ' <span class="edited-badge">(معدّل)</span>' : '');
                            }
                        }
                    }
                }

                if (change.type === 'removed') {
                    const existing = document.querySelector(`[data-id="${change.doc.id}"]`);
                    if (existing) existing.remove();
                    state.messageIds.delete(change.doc.id);
                }
            });
        }, error => console.error('❌ خطأ في الاستماع:', error));
}

// ============================================================
// 👥 قائمة المستخدمين للمسؤول
// ============================================================
function loadAdminUsers() {
    if (!state.isAdmin || !state.isAdminVerified) return;
    if (!el.adminUsersList) return;
    
    el.adminUsersList.innerHTML = 'جاري التحميل...';

    db.collection('users').get()
        .then(snapshot => {
            if (snapshot.empty) {
                el.adminUsersList.innerHTML = 'لا يوجد مستخدمون';
                return;
            }

            db.collection('users').where('online', '==', true).get()
                .then(onlineSnapshot => {
                    const onlineSet = new Set();
                    onlineSnapshot.forEach(doc => onlineSet.add(doc.id));
                    state.onlineUsers = onlineSet;
                    if (el.onlineCount) el.onlineCount.textContent = `🟢 ${state.onlineUsers.size}`;

                    let html = '';
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        const blocked = state.blockedUsers.includes(data.username);
                        const online = onlineSet.has(data.username);
                        let avatarHtml = '';
                        if (data.avatar && data.avatar.startsWith('data:image')) {
                            avatarHtml = `<img src="${data.avatar}" alt="${data.username}">`;
                        } else {
                            avatarHtml = getInitials(data.username);
                        }

                        html += `
                            <div class="user-item">
                                <div class="user-info">
                                    <div class="user-avatar-small" style="background:${getAvatarColor(data.username)};color:#fff;font-weight:600;">${avatarHtml}</div>
                                    <span>${data.username}${data.username === ADMIN_NAME ? ' 👑' : ''}${blocked ? ' 🚫' : ''}${online ? ' 🟢' : ' ⚪'}</span>
                                </div>
                                <div class="user-actions">
                                    ${data.username !== ADMIN_NAME ? `
                                        ${blocked ? 
                                            `<button onclick="unblockUser('${data.username}')"><span class="material-symbols-outlined">check_circle</span></button>` :
                                            `<button onclick="blockUser('${data.username}')"><span class="material-symbols-outlined">block</span></button>`
                                        }
                                        <button onclick="deleteUserAccount('${data.username}')" class="delete-user"><span class="material-symbols-outlined">delete_forever</span></button>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                    });
                    el.adminUsersList.innerHTML = html;
                });
        })
        .catch(() => {
            el.adminUsersList.innerHTML = '❌ خطأ في التحميل';
        });
}

// ============================================================
// 🚪 تسجيل الدخول
// ============================================================
async function login() {
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
            if (el.loginAdminPasswordError) el.loginAdminPasswordError.classList.add('show');
            if (el.loginAdminPasswordInput) {
                el.loginAdminPasswordInput.value = '';
                el.loginAdminPasswordInput.focus();
            }
            return;
        }
        if (el.loginAdminPasswordError) el.loginAdminPasswordError.classList.remove('show');
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
        el.loginBtn.textContent = '⏳ جاري...';
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

        setUserOnline(name);
        saveSession(name, state.userColor, avatarBase64);

        if (!userDoc.exists) {
            addSystemMessage(`👋 مرحباً ${name}! هذه أول مرة لك`);
        } else if (state.isAdmin) {
            addSystemMessage(`👑 المسؤول ${name} انضم`);
        } else {
            addSystemMessage(`👋 ${name} انضم`);
        }

        loadMessages();
        listenMessages();

        db.collection('users').where('online', '==', true).onSnapshot(snapshot => {
            state.onlineUsers.clear();
            snapshot.forEach(doc => state.onlineUsers.add(doc.id));
            if (el.onlineCount) el.onlineCount.textContent = `🟢 ${state.onlineUsers.size}`;
        });

    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        if (el.connectionError) {
            el.connectionError.textContent = `❌ ${error.message}`;
            el.connectionError.style.display = 'block';
        }
        if (el.loginBtn) {
            el.loginBtn.disabled = false;
            el.loginBtn.textContent = 'دخول';
        }
        showLoading(false);
        return;
    }

    showLoading(false);
    if (el.loginBtn) {
        el.loginBtn.disabled = false;
        el.loginBtn.textContent = 'دخول';
    }
}

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
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// ============================================================
// 💾 حفظ الجلسة
// ============================================================
function saveSession(username, color, avatar) {
    try {
        localStorage.setItem('chat_session', JSON.stringify({
            username, color, ip: state.userIP, avatar: avatar || '', timestamp: Date.now()
        }));
    } catch (e) {}
}

function checkSession() {
    try {
        const data = localStorage.getItem('chat_session');
        if (!data) return null;
        const session = JSON.parse(data);
        if (Date.now() - session.timestamp > 7 * 24 * 60 * 60 * 1000) {
            localStorage.removeItem('chat_session');
            return null;
        }
        return session;
    } catch (e) { return null; }
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
        .catch(() => { state.blockedUsers = []; return state.blockedUsers; });
}

// ============================================================
// 🚪 تسجيل الخروج
// ============================================================
function logout() {
    if (!confirm('🚪 تسجيل الخروج؟')) return;
    localStorage.removeItem('chat_session');
    performLogout();
}

function performLogout() {
    if (state.currentUser) {
        db.collection('users').doc(state.currentUser).update({ online: false });
        addSystemMessage(`👋 ${state.currentUser} غادر`);
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
            <div class="empty-state">
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
    state.messageIds.clear();
    state.unreadCount = 0;
    updateNewMsgBadge();
    state.onlineUsers.clear();
    if (el.onlineCount) el.onlineCount.textContent = '🟢 0';
    
    if (el.usernameInput) el.usernameInput.value = '';
    if (el.loginAdminPasswordBox) el.loginAdminPasswordBox.style.display = 'none';
    
    if (el.infoMsg) {
        el.infoMsg.textContent = '👋 تم تسجيل الخروج';
        el.infoMsg.classList.add('show');
        setTimeout(() => { if (el.infoMsg) el.infoMsg.classList.remove('show'); }, 2000);
    }
}

if (el.logoutBtn) {
    el.logoutBtn.addEventListener('click', logout);
}

// ============================================================
// 🚪 تسجيل الخروج القسري
// ============================================================
if (el.forceLogoutBtn) {
    el.forceLogoutBtn.addEventListener('click', function() {
        if (!state.isAdmin || !state.isAdminVerified) return;
        if (!confirm('⚠️ تسجيل خروج جميع المستخدمين؟')) return;

        showLoading(true);
        db.collection('users').where('online', '==', true).get()
            .then(snapshot => {
                const batch = db.batch();
                snapshot.forEach(doc => batch.update(doc.ref, { online: false, forceLogout: true }));
                return batch.commit();
            })
            .then(() => {
                addSystemMessage('👑 تم تسجيل خروج جميع المستخدمين');
                loadAdminUsers();
                showLoading(false);
            })
            .catch(() => { alert('⚠️ حدث خطأ'); showLoading(false); });
    });
}

// ============================================================
// 🗑️ حذف الدردشة
// ============================================================
if (el.clearChatBtn) {
    el.clearChatBtn.addEventListener('click', function() {
        if (!state.isAdmin || !state.isAdminVerified) return;
        if (!confirm('⚠️ حذف جميع الرسائل؟')) return;

        showLoading(true);
        db.collection('messages').get()
            .then(snapshot => {
                const batch = db.batch();
                snapshot.forEach(doc => batch.delete(doc.ref));
                return batch.commit();
            })
            .then(() => {
                addSystemMessage('🗑️ تم حذف جميع الرسائل', 'success');
                if (el.messages) {
                    el.messages.querySelectorAll('.msg-group, .system-msg').forEach(el => el.remove());
                }
                if (el.emptyState) el.emptyState.style.display = 'flex';
                state.messageIds.clear();
                showLoading(false);
            })
            .catch(() => { alert('⚠️ فشل الحذف'); showLoading(false); });
    });
}

// ============================================================
// 🗑️ حذف الحساب
// ============================================================
function deleteUserAccount(username) {
    if (!state.isAdmin || username === ADMIN_NAME) return;
    if (!confirm(`⚠️ حذف حساب @${username} بالكامل؟`)) return;

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
            addSystemMessage(`🗑️ تم حذف حساب @${username}`, 'success');
            document.querySelectorAll(`[data-sender="${username}"]`).forEach(el => el.remove());
            loadAdminUsers();
            showLoading(false);
        })
        .catch(() => { alert('⚠️ حدث خطأ'); showLoading(false); });
}

function unblockUser(username) {
    if (!state.isAdmin) return;
    if (!confirm(`🔓 فك الحظر عن @${username}؟`)) return;
    const index = state.blockedUsers.indexOf(username);
    if (index > -1) {
        state.blockedUsers.splice(index, 1);
        db.collection('blocked').doc('list').set({ users: state.blockedUsers })
            .then(() => {
                addSystemMessage(`✅ @${username} تم فك الحظر`);
                loadAdminUsers();
                loadMessages();
            });
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
            if (el.loginAdminPasswordBox?.style.display === 'block') {
                if (el.loginAdminPasswordInput) el.loginAdminPasswordInput.focus();
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
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = this.value.substring(0, start) + '\n' + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 1;
            return;
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (el.sendBtn && !el.sendBtn.disabled) {
                el.sendBtn.click();
            }
            return;
        }
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
// 🖱️ زر التمرير
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
        state.unreadCount = 0;
        updateNewMsgBadge();
    });
}

// ============================================================
// 📤 أحداث الإرسال
// ============================================================
if (el.sendBtn) {
    el.sendBtn.addEventListener('click', sendMessage);
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
        if (el.adminPasswordInput) el.adminPasswordInput.value = '';
        if (el.adminPasswordError) el.adminPasswordError.classList.remove('show');
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
// 🔄 بدء التشغيل
// ============================================================
function init() {
    if (el.infoMsg) {
        el.infoMsg.textContent = '👋 أدخل اسمك ثم اضغط دخول';
        el.infoMsg.classList.add('show');
        setTimeout(() => { if (el.infoMsg) el.infoMsg.classList.remove('show'); }, 3000);
    }

    const session = checkSession();
    if (session) {
        if (el.usernameInput) el.usernameInput.value = session.username || '';
        state.userColor = session.color || '#2b6ef0';
        state.userAvatarBase64 = session.avatar || '';
        document.querySelectorAll('.color-circle').forEach(el => {
            el.classList.toggle('selected', el.dataset.color === state.userColor);
        });
        setTimeout(login, 500);
    }
}

// ============================================================
// 🚀 بدء التطبيق
// ============================================================
state.userIP = getHashedIP();

console.log('🚀 نيزك v5.0 - دردشة متطورة');
console.log('👑 المسؤول: slx23m');
console.log('🔒 كلمة المرور: 1442');

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
