// ============================================================
// 👑 ADMIN MODULE - نيزك v3.5.0
// ============================================================

// ============================================================
// DOM REFS
// ============================================================
const adminModal = document.getElementById('adminModal');
const adminPanel = document.getElementById('adminPanel');
const adminPasswordBox = document.getElementById('adminPasswordBox');
const adminPasswordInput = document.getElementById('adminPasswordInput');
const adminPasswordBtn = document.getElementById('adminPasswordBtn');
const adminPasswordError = document.getElementById('adminPasswordError');
const adminUsersList = document.getElementById('adminUsersList');
const closeAdminModal = document.getElementById('closeAdminModal');
const forceLogoutBtn = document.getElementById('forceLogoutBtn');
const clearChatBtn = document.getElementById('clearChatBtn');
const badwordInput = document.getElementById('badwordInput');
const addBadwordBtn = document.getElementById('addBadwordBtn');
const badwordsList = document.getElementById('badwordsList');
const adminBtn = document.getElementById('adminBtn');

// ============================================================
// LOAD BAD WORDS
// ============================================================
function loadBadWords() {
    db.collection('settings').doc('badwords').get().then(function(d) {
        badWords = (d.exists && d.data().words) ? d.data().words : DEFAULT_BAD_WORDS;
        if (!d.exists) saveBadWords();
        renderBadWords();
    }).catch(function() { badWords = DEFAULT_BAD_WORDS;
        renderBadWords(); });
}

function saveBadWords() { db.collection('settings').doc('badwords').set({ words: badWords }); }

function renderBadWords() {
    if (!badwordsList) return;
    if (!badWords.length) { badwordsList.innerHTML =
            '<span style="color:var(--text-muted);font-size:11px;">لا توجد كلمات محظورة</span>'; return; }
    var h = '';
    badWords.forEach(function(w) {
        h +=
            '<span class="badword-tag">' + w + '<button class="remove-badword" data-word="' + w +
            '"><span class="material-symbols-outlined" style="font-size:12px;">close</span></button></span>';
    });
    badwordsList.innerHTML = h;
    document.querySelectorAll('.remove-badword').forEach(function(b) {
        b.addEventListener('click', function() { removeBadWord(this.dataset.word); });
    });
}

function addBadWord() {
    var w = badwordInput.value.trim();
    if (!w) return;
    if (badWords.includes(w)) { alert('⚠️ هذه الكلمة موجودة بالفعل'); return; }
    badWords.push(w);
    saveBadWords();
    renderBadWords();
    badwordInput.value = '';
    badwordInput.focus();
}

function removeBadWord(w) {
    var i = badWords.indexOf(w);
    if (i > -1) { badWords.splice(i, 1);
        saveBadWords();
        renderBadWords(); }
}

// ============================================================
// LOAD ADMIN USERS
// ============================================================
function loadAdminUsers() {
    if (!isAdmin || !isAdminVerified) return;
    if (!adminUsersList) return;
    adminUsersList.innerHTML = '<div style="color:var(--text-muted);font-size:12px;">جاري التحميل...</div>';

    db.collection('users').get()
        .then(function(s) {
            if (s.empty) {
                adminUsersList.innerHTML =
                    '<div style="color:var(--text-muted);font-size:12px;">لا يوجد مستخدمون مسجلون</div>';
                return;
            }

            db.collection('users').where('online', '==', true).get()
                .then(function(os) {
                    var onlineSet = new Set();
                    os.forEach(function(d) { onlineSet.add(d.id); });

                    db.collection('violations').get()
                        .then(function(vs) {
                            var vc = {};
                            vs.forEach(function(d) {
                                var dt = d.data();
                                if (dt.user) vc[dt.user] = (vc[dt.user] || 0) + 1;
                            });

                            var h = '';
                            s.forEach(function(d) {
                                var dt = d.data();
                                var blocked = blockedUsers.indexOf(dt.username) !== -1;
                                var online = onlineSet.has(dt.username);
                                var color = dt.color || '#2b6ef0';
                                var vcount = vc[dt.username] || 0;
                                var avatarHtml = '';

                                if (dt.avatar && dt.avatar.indexOf('data:image') === 0) {
                                    avatarHtml = '<img src="' + dt.avatar + '" alt="' + dt
                                    .username + '">';
                                } else {
                                    avatarHtml = getInitials(dt.username);
                                }

                                h +=
                                    '<div class="user-item"><div class="user-info"><div class="user-avatar-small" style="display:flex;align-items:center;justify-content:center;background:' +
                                    getAvatarColor(dt.username) +
                                    ';color:#fff;font-weight:600;">' + avatarHtml +
                                    '</div><span>' + dt.username + (dt.username === ADMIN_NAME ?
                                        ' 👑' : '') + (blocked ? ' 🚫' : '') + (online ? ' 🟢' :
                                        ' ⚪') +
                                    '</span>' + (vcount > 0 ?
                                        '<span class="muted-badge">⚠️ ' + vcount + '</span>' :
                                        '') +
                                    '</div><div class="user-actions">' + (dt.username !==
                                        ADMIN_NAME ? (blocked ?
                                            '<button class="unblock-user" onclick="unblockUser(\'' +
                                            dt.username +
                                            '\')" title="فك الحظر"><span class="material-symbols-outlined">check_circle</span></button>' :
                                            '<button class="block-user" onclick="blockUser(\'' +
                                            dt.username +
                                            '\')" title="حظر"><span class="material-symbols-outlined">block</span></button>'
                                            ) +
                                            '<button class="delete-user" onclick="deleteUserAccount(\'' +
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
}

// ============================================================
// UNBLOCK USER
// ============================================================
function unblockUser(username) {
    if (!isAdmin) return;
    if (!confirm('🔓 هل أنت متأكد من فك الحظر عن @' + username + '؟')) return;
    var i = blockedUsers.indexOf(username);
    if (i > -1) {
        blockedUsers.splice(i, 1);
        db.collection('blocked').doc('list').set({ users: blockedUsers })
            .then(function() {
                if (typeof addSystemMessage === 'function') {
                    addSystemMessage('✅ @' + username + ' تم فك الحظر عنه بواسطة المسؤول', 'success');
                }
                loadAdminUsers();
                if (typeof loadMessages === 'function') loadMessages();
            });
    }
}

// ============================================================
// DELETE USER ACCOUNT
// ============================================================
function deleteUserAccount(username) {
    if (!isAdmin || username === ADMIN_NAME) return;
    if (!confirm('⚠️ هل أنت متأكد من حذف حساب @' + username + ' بالكامل؟\nسيتم حذف جميع رسائله وبياناته نهائياً.'))
        return;
    showLoading(true);
    db.collection('users').doc(username).delete()
        .then(function() {
            return db.collection('messages').where('sender', '==', username).get()
                .then(function(s) {
                    var b = db.batch();
                    s.forEach(function(d) { b.delete(d.ref); });
                    return b.commit();
                });
        })
        .then(function() {
            var i = blockedUsers.indexOf(username);
            if (i > -1) {
                blockedUsers.splice(i, 1);
                return db.collection('blocked').doc('list').set({ users: blockedUsers });
            }
        })
        .then(function() {
            if (typeof addSystemMessage === 'function') {
                addSystemMessage('🗑️ تم حذف حساب @' + username + ' بالكامل نهائياً بواسطة المسؤول',
                    'success');
            }
            document.querySelectorAll('[data-sender="' + username + '"]').forEach(function(el) {
                el.remove();
            });
            loadAdminUsers();
            showLoading(false);
            updateMessageCount();
        })
        .catch(function() {
            alert('⚠️ حدث خطأ');
            showLoading(false);
        });
}

// ============================================================
// CLEAR CHAT
// ============================================================
function clearChat() {
    if (!isAdmin || !isAdminVerified) return;
    if (!confirm('⚠️ هل أنت متأكد من حذف جميع الرسائل نهائياً؟\nلا يمكن استعادتها بعد الحذف.')) return;
    showLoading(true);
    db.collection('messages').get()
        .then(function(snap) {
            var batch = db.batch();
            snap.forEach(function(doc) { batch.delete(doc.ref); });
            return batch.commit();
        })
        .then(function() {
            if (typeof addSystemMessage === 'function') {
                addSystemMessage('🗑️ تم حذف جميع الرسائل نهائياً بواسطة المسؤول', 'success');
            }
            document.querySelectorAll('.msg-group, .system-msg, .msg-count').forEach(function(el) {
                el.remove();
            });
            if (emptyState) emptyState.style.display = 'flex';
            messageIds.clear();
            updateMessageCount();
            showLoading(false);
        })
        .catch(function(err) {
            console.error('❌ خطأ في حذف الدردشة:', err);
            alert('⚠️ فشل حذف الدردشة');
            showLoading(false);
        });
}

// ============================================================
// ADMIN EVENTS
// ============================================================
if (adminBtn) {
    adminBtn.addEventListener('click', function() {
        isAdminVerified = false;
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
        if (adminPasswordInput.value.trim() === ADMIN_PASSWORD) {
            isAdminVerified = true;
            if (adminPasswordBox) adminPasswordBox.style.display = 'none';
            if (adminPanel) adminPanel.style.display = 'block';
            loadAdminUsers();
            loadBadWords();
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
        isAdminVerified = false;
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
            isAdminVerified = false;
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
    addBadwordBtn.addEventListener('click', addBadWord);
}

if (badwordInput) {
    badwordInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') addBadWord(); });
}

// ============================================================
// FORCE LOGOUT
// ============================================================
if (forceLogoutBtn) {
    forceLogoutBtn.addEventListener('click', function() {
        if (!isAdmin || !isAdminVerified) return;
        if (!confirm('⚠️ هل أنت متأكد من تسجيل خروج جميع المستخدمين؟')) return;
        showLoading(true);

        db.collection('users').where('online', '==', true).get()
            .then(function(s) {
                var b = db.batch();
                s.forEach(function(d) { b.update(d.ref, { online: false, forceLogout: true }); });
                return b.commit();
            })
            .then(function() {
                if (typeof addSystemMessage === 'function') {
                    addSystemMessage('👑 المسؤول قام بتسجيل خروج جميع المستخدمين');
                }
                loadAdminUsers();
                showLoading(false);
            })
            .catch(function() {
                alert('⚠️ حدث خطأ');
                showLoading(false);
            });
    });
}

// ============================================================
// CLEAR CHAT
// ============================================================
if (clearChatBtn) {
    clearChatBtn.addEventListener('click', clearChat);
}
