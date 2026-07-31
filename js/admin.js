// ============================================================
// 👑 ADMIN MODULE - نيزك v3.5.0
// ============================================================

// ============================================================
// DOM REFS
// ============================================================
var adminModal = document.getElementById('adminModal');
var adminPanel = document.getElementById('adminPanel');
var adminPasswordBox = document.getElementById('adminPasswordBox');
var adminPasswordInput = document.getElementById('adminPasswordInput');
var adminPasswordBtn = document.getElementById('adminPasswordBtn');
var adminPasswordError = document.getElementById('adminPasswordError');
var adminUsersList = document.getElementById('adminUsersList');
var closeAdminModal = document.getElementById('closeAdminModal');
var forceLogoutBtn = document.getElementById('forceLogoutBtn');
var clearChatBtn = document.getElementById('clearChatBtn');
var badwordInput = document.getElementById('badwordInput');
var addBadwordBtn = document.getElementById('addBadwordBtn');
var badwordsList = document.getElementById('badwordsList');
var adminBtn = document.getElementById('adminBtn');

// ============================================================
// LOAD BAD WORDS
// ============================================================
window.loadBadWords = function() {
    window.db.collection('settings').doc('badwords').get().then(function(d) {
        window.badWords = (d.exists && d.data().words) ? d.data().words : window.DEFAULT_BAD_WORDS;
        if (!d.exists) window.saveBadWords();
        window.renderBadWords();
    }).catch(function() { window.badWords = window.DEFAULT_BAD_WORDS;
        window.renderBadWords(); });
};

window.saveBadWords = function() { 
    window.db.collection('settings').doc('badwords').set({ words: window.badWords }); 
};

window.renderBadWords = function() {
    if (!badwordsList) return;
    if (!window.badWords.length) { badwordsList.innerHTML =
            '<span style="color:var(--text-muted);font-size:11px;">لا توجد كلمات محظورة</span>'; return; }
    var h = '';
    window.badWords.forEach(function(w) {
        h +=
            '<span class="badword-tag">' + w + '<button class="remove-badword" data-word="' + w +
            '"><span class="material-symbols-outlined" style="font-size:12px;">close</span></button></span>';
    });
    badwordsList.innerHTML = h;
    document.querySelectorAll('.remove-badword').forEach(function(b) {
        b.addEventListener('click', function() { window.removeBadWord(this.dataset.word); });
    });
};

window.addBadWord = function() {
    var w = badwordInput.value.trim();
    if (!w) return;
    if (window.badWords.includes(w)) { alert('⚠️ هذه الكلمة موجودة بالفعل'); return; }
    window.badWords.push(w);
    window.saveBadWords();
    window.renderBadWords();
    badwordInput.value = '';
    badwordInput.focus();
};

window.removeBadWord = function(w) {
    var i = window.badWords.indexOf(w);
    if (i > -1) { window.badWords.splice(i, 1);
        window.saveBadWords();
        window.renderBadWords(); }
};

// ============================================================
// LOAD ADMIN USERS
// ============================================================
window.loadAdminUsers = function() {
    if (!window.isAdmin || !window.isAdminVerified) return;
    if (!adminUsersList) return;
    adminUsersList.innerHTML = '<div style="color:var(--text-muted);font-size:12px;">جاري التحميل...</div>';

    window.db.collection('users').get()
        .then(function(s) {
            if (s.empty) {
                adminUsersList.innerHTML =
                    '<div style="color:var(--text-muted);font-size:12px;">لا يوجد مستخدمون مسجلون</div>';
                return;
            }

            window.db.collection('users').where('online', '==', true).get()
                .then(function(os) {
                    var onlineSet = new Set();
                    os.forEach(function(d) { onlineSet.add(d.id); });

                    window.db.collection('violations').get()
                        .then(function(vs) {
                            var vc = {};
                            vs.forEach(function(d) {
                                var dt = d.data();
                                if (dt.user) vc[dt.user] = (vc[dt.user] || 0) + 1;
                            });

                            var h = '';
                            s.forEach(function(d) {
                                var dt = d.data();
                                var blocked = window.blockedUsers.indexOf(dt.username) !== -1;
                                var online = onlineSet.has(dt.username);
                                var vcount = vc[dt.username] || 0;
                                var avatarHtml = '';

                                if (dt.avatar && dt.avatar.indexOf('data:image') === 0) {
                                    avatarHtml = '<img src="' + dt.avatar + '" alt="' + dt
                                    .username + '">';
                                } else {
                                    avatarHtml = window.getInitials(dt.username);
                                }

                                h +=
                                    '<div class="user-item"><div class="user-info"><div class="user-avatar-small" style="display:flex;align-items:center;justify-content:center;background:' +
                                    window.getAvatarColor(dt.username) +
                                    ';color:#fff;font-weight:600;">' + avatarHtml +
                                    '</div><span>' + dt.username + (dt.username === window.ADMIN_NAME ?
                                        ' 👑' : '') + (blocked ? ' 🚫' : '') + (online ? ' 🟢' :
                                        ' ⚪') +
                                    '</span>' + (vcount > 0 ?
                                        '<span class="muted-badge">⚠️ ' + vcount + '</span>' :
                                        '') +
                                    '</div><div class="user-actions">' + (dt.username !==
                                        window.ADMIN_NAME ? (blocked ?
                                            '<button class="unblock-user" onclick="window.unblockUser(\'' +
                                            dt.username +
                                            '\')" title="فك الحظر"><span class="material-symbols-outlined">check_circle</span></button>' :
                                            '<button class="block-user" onclick="window.blockUser(\'' +
                                            dt.username +
                                            '\')" title="حظر"><span class="material-symbols-outlined">block</span></button>'
                                            ) +
                                            '<button class="delete-user" onclick="window.deleteUserAccount(\'' +
                                            dt.username +
                                            '\')" title="حذف الحساب نهائياً"><span class="material-symbols-outlined">delete_forever</span></button>'
                                            : '') + '</div></div>';
                            });
                            adminUsersList.innerHTML = h;
                        });
                });
        })
        .catch(function() {
            adminUsersList.innerHTML =
                '<div style="color:var(--red);font-size:12px;">❌ خطأ في التحميل</div>';
        });
};

// ============================================================
// UNBLOCK USER
// ============================================================
window.unblockUser = function(username) {
    if (!window.isAdmin) return;
    if (!confirm('🔓 هل أنت متأكد من فك الحظر عن @' + username + '؟')) return;
    var i = window.blockedUsers.indexOf(username);
    if (i > -1) {
        window.blockedUsers.splice(i, 1);
        window.db.collection('blocked').doc('list').set({ users: window.blockedUsers })
            .then(function() {
                if (typeof window.addSystemMessage === 'function') {
                    window.addSystemMessage('✅ @' + username + ' تم فك الحظر عنه بواسطة المسؤول', 'success');
                }
                window.loadAdminUsers();
                if (typeof window.loadMessages === 'function') window.loadMessages();
            });
    }
};

// ============================================================
// DELETE USER ACCOUNT
// ============================================================
window.deleteUserAccount = function(username) {
    if (!window.isAdmin || username === window.ADMIN_NAME) return;
    if (!confirm('⚠️ هل أنت متأكد من حذف حساب @' + username + ' بالكامل؟\nسيتم حذف جميع رسائله وبياناته نهائياً.'))
        return;
    window.showLoading(true);
    window.db.collection('users').doc(username).delete()
        .then(function() {
            return window.db.collection('messages').where('sender', '==', username).get()
                .then(function(s) {
                    var b = window.db.batch();
                    s.forEach(function(d) { b.delete(d.ref); });
                    return b.commit();
                });
        })
        .then(function() {
            var i = window.blockedUsers.indexOf(username);
            if (i > -1) {
                window.blockedUsers.splice(i, 1);
                return window.db.collection('blocked').doc('list').set({ users: window.blockedUsers });
            }
        })
        .then(function() {
            if (typeof window.addSystemMessage === 'function') {
                window.addSystemMessage('🗑️ تم حذف حساب @' + username + ' بالكامل نهائياً بواسطة المسؤول',
                    'success');
            }
            document.querySelectorAll('[data-sender="' + username + '"]').forEach(function(el) {
                el.remove();
            });
            window.loadAdminUsers();
            window.showLoading(false);
            window.updateMessageCount();
        })
        .catch(function() {
            alert('⚠️ حدث خطأ');
            window.showLoading(false);
        });
};

// ============================================================
// CLEAR CHAT
// ============================================================
window.clearChat = function() {
    if (!window.isAdmin || !window.isAdminVerified) return;
    if (!confirm('⚠️ هل أنت متأكد من حذف جميع الرسائل نهائياً؟\nلا يمكن استعادتها بعد الحذف.')) return;
    window.showLoading(true);
    window.db.collection('messages').get()
        .then(function(snap) {
            var batch = window.db.batch();
            snap.forEach(function(doc) { batch.delete(doc.ref); });
            return batch.commit();
        })
        .then(function() {
            if (typeof window.addSystemMessage === 'function') {
                window.addSystemMessage('🗑️ تم حذف جميع الرسائل نهائياً بواسطة المسؤول', 'success');
            }
            document.querySelectorAll('.msg-group, .system-msg, .msg-count').forEach(function(el) {
                el.remove();
            });
            var emptyState = document.getElementById('emptyState');
            if (emptyState) emptyState.style.display = 'flex';
            window.messageIds.clear();
            window.updateMessageCount();
            window.showLoading(false);
        })
        .catch(function(err) {
            console.error('❌ خطأ في حذف الدردشة:', err);
            alert('⚠️ فشل حذف الدردشة');
            window.showLoading(false);
        });
};

// ============================================================
// ADMIN EVENTS
// ============================================================
if (adminBtn) {
    adminBtn.addEventListener('click', function() {
        window.isAdminVerified = false;
        if (adminPanel) adminPanel.style.display = 'none';
        if (adminPasswordBox) adminPasswordBox.style.display = 'block';
        if (adminPasswordInput) {
            adminPasswordInput.value = '';
            adminPasswordInput.focus();
        }
        if (adminPasswordError) adminPasswordError.classList.remove('show');
        if (adminModal) adminModal.classList.toggle('active');
    });
}

if (adminPasswordBtn) {
    adminPasswordBtn.addEventListener('click', function() {
        if (adminPasswordInput.value.trim() === window.ADMIN_PASSWORD) {
            window.isAdminVerified = true;
            if (adminPasswordBox) adminPasswordBox.style.display = 'none';
            if (adminPanel) adminPanel.style.display = 'block';
            window.loadAdminUsers();
            window.loadBadWords();
        } else {
            if (adminPasswordError) adminPasswordError.classList.add('show');
            if (adminPasswordInput) {
                adminPasswordInput.value = '';
                adminPasswordInput.focus();
            }
        }
    });
}

if (adminPasswordInput) {
    adminPasswordInput.addEventListener('keypress', function(e) { if (e.key === 'Enter' && adminPasswordBtn) adminPasswordBtn.click(); });
}

if (closeAdminModal) {
    closeAdminModal.addEventListener('click', function() {
        if (adminModal) adminModal.classList.remove('active');
        window.isAdminVerified = false;
        if (adminPanel) adminPanel.style.display = 'none';
        if (adminPasswordBox) adminPasswordBox.style.display = 'block';
        if (adminPasswordInput) adminPasswordInput.value = '';
        if (adminPasswordError) adminPasswordError.classList.remove('show');
    });
}

if (adminModal) {
    adminModal.addEventListener('click', function(e) {
        if (e.target === adminModal) {
            adminModal.classList.remove('active');
            window.isAdminVerified = false;
            if (adminPanel) adminPanel.style.display = 'none';
            if (adminPasswordBox) adminPasswordBox.style.display = 'block';
            if (adminPasswordInput) adminPasswordInput.value = '';
            if (adminPasswordError) adminPasswordError.classList.remove('show');
        }
    });
}

// ============================================================
// BAD WORDS EVENTS
// ============================================================
if (addBadwordBtn) {
    addBadwordBtn.addEventListener('click', window.addBadWord);
}

if (badwordInput) {
    badwordInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') window.addBadWord(); });
}

// ============================================================
// FORCE LOGOUT
// ============================================================
if (forceLogoutBtn) {
    forceLogoutBtn.addEventListener('click', function() {
        if (!window.isAdmin || !window.isAdminVerified) return;
        if (!confirm('⚠️ هل أنت متأكد من تسجيل خروج جميع المستخدمين؟')) return;
        window.showLoading(true);

        window.db.collection('users').where('online', '==', true).get()
            .then(function(s) {
                var b = window.db.batch();
                s.forEach(function(d) { b.update(d.ref, { online: false, forceLogout: true }); });
                return b.commit();
            })
            .then(function() {
                if (typeof window.addSystemMessage === 'function') {
                    window.addSystemMessage('👑 المسؤول قام بتسجيل خروج جميع المستخدمين');
                }
                window.loadAdminUsers();
                window.showLoading(false);
            })
            .catch(function() {
                alert('⚠️ حدث خطأ');
                window.showLoading(false);
            });
    });
}

// ============================================================
// CLEAR CHAT
// ============================================================
if (clearChatBtn) {
    clearChatBtn.addEventListener('click', window.clearChat);
}

console.log('✅ تم تحميل admin.js');
