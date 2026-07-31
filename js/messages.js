// ============================================================
// 💬 MESSAGES MODULE - نيزك v3.5.0
// ============================================================

window.replyTo = null;
window.editingMessage = null;
window.lastSender = '';
window.messageIds = new Set();
window.badWords = [];

// ============================================================
// DOM REFS
// ============================================================
var messagesDiv = document.getElementById('messages');
var msgInput = document.getElementById('msgInput');
var sendBtn = document.getElementById('sendBtn');
var emptyState = document.getElementById('emptyState');
var emojiToggle = document.getElementById('emojiToggle');
var emojiRail = document.getElementById('emojiRail');
var typingIndicator = document.getElementById('typingIndicator');
var scrollBottomBtn = document.getElementById('scrollBottomBtn');

// ============================================================
// CREATE MESSAGE ELEMENT
// ============================================================
window.createMessage = function(id, d, self) {
    if (window.blockedUsers.indexOf(d.sender) !== -1 && !self) return null;

    var g = document.createElement('div');
    var grouped = (d.sender === window.lastSender && window.lastSender !== '');
    g.className = 'msg-group ' + (self ? 'self' : 'other') + (grouped ? ' grouped' : '');
    g.dataset.id = id;
    g.dataset.sender = d.sender;
    window.lastSender = d.sender;

    var avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    var avatarData = d.avatar || '';

    if (avatarData && avatarData.indexOf('data:image') === 0) {
        avatar.innerHTML = '<img src="' + avatarData + '" alt="' + d.sender + '" loading="lazy">';
    } else {
        var initials = window.getInitials(d.sender);
        var color = window.getAvatarColor(d.sender);
        avatar.style.background = color;
        avatar.textContent = initials;
        avatar.style.display = 'flex';
        avatar.style.alignItems = 'center';
        avatar.style.justifyContent = 'center';
        avatar.style.fontSize = '11px';
        avatar.style.fontWeight = '600';
        avatar.style.color = '#fff';
    }

    var content = document.createElement('div');
    content.className = 'msg-content';

    var sender = document.createElement('div');
    sender.className = 'msg-sender';
    sender.textContent = d.sender;
    if (d.sender === window.ADMIN_NAME) {
        var tag = document.createElement('span');
        tag.className = 'admin-tag';
        tag.textContent = '👑 مسؤول';
        sender.appendChild(tag);
    }

    var b = document.createElement('div');
    b.className = 'msg-bubble';

    if (d.replyTo) {
        var r = document.createElement('div');
        r.className = 'reply-box';
        r.innerHTML = '<span class="r-sender">@' + d.replyTo.sender + '</span> ' + d.replyTo.text.substring(0, 50) + (
            d.replyTo.text.length > 50 ? '...' : '');
        b.appendChild(r);
    }

    var tx = document.createElement('div');
    tx.className = 'msg-text';
    if (d.deleted) {
        tx.innerHTML = '<span class="deleted-badge">🗑️ تم حذف هذه الرسالة نهائياً</span>';
    } else {
        if (window.isEmojiOnly(d.text)) tx.classList.add('emoji-big');
        tx.textContent = d.text;
        if (d.edited) {
            var ed = document.createElement('span');
            ed.className = 'edited-badge';
            ed.textContent = '(معدّل)';
            tx.appendChild(ed);
        }
        if (d.warning) {
            var wb = document.createElement('span');
            wb.className = 'warning-badge';
            wb.textContent = '⚠️ كلمة ممنوعة';
            tx.appendChild(wb);
        }
    }
    b.appendChild(tx);

    var tm = document.createElement('div');
    tm.className = 'msg-time';
    if (d.timestamp) {
        var dt = d.timestamp.toDate ? d.timestamp.toDate() : new Date(d.timestamp);
        tm.textContent = dt.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
        if (self && !d.deleted) tm.innerHTML +=
            ' <span class="read-status"><span class="material-symbols-outlined" style="font-size:10px;">done_all</span></span>';
    }

    var a = document.createElement('div');
    a.className = 'msg-actions';
    var ah =
        '<button class="reply" title="رد"><span class="material-symbols-outlined">reply</span></button><button class="report" title="إبلاغ"><span class="material-symbols-outlined">flag</span></button>';
    if (window.isAdmin && !d.deleted) ah +=
        '<button class="delete" title="حذف نهائي"><span class="material-symbols-outlined">delete_forever</span></button>';
    if (window.isAdmin && d.sender !== window.ADMIN_NAME) ah +=
        '<button class="block" title="حظر"><span class="material-symbols-outlined">block</span></button>';
    a.innerHTML = ah;

    a.querySelector('.reply').addEventListener('click', function(e) { e.stopPropagation();
        window.setReply(id, d.sender, d.text);
        window.hideAllActions(); });
    a.querySelector('.report').addEventListener('click', function(e) { e.stopPropagation();
        window.reportMsg(id, d.sender);
        window.hideAllActions(); });
    var del = a.querySelector('.delete');
    if (del) del.addEventListener('click', function(e) { e.stopPropagation();
        window.deleteMsg(id);
        window.hideAllActions(); });
    var blk = a.querySelector('.block');
    if (blk) blk.addEventListener('click', function(e) { e.stopPropagation();
        window.blockUser(d.sender);
        window.hideAllActions(); });

    content.appendChild(sender);
    content.appendChild(b);
    content.appendChild(tm);
    content.appendChild(a);

    if (self) {
        g.appendChild(content);
        g.appendChild(avatar);
    } else {
        g.appendChild(avatar);
        g.appendChild(content);
    }

    var timer = null,
        pressed = false;
    g.addEventListener('mousedown', function() { pressed = true;
        timer = setTimeout(function() { if (pressed) { window.hideAllActions();
                a.classList.add('active'); } }, 500); });
    g.addEventListener('mouseup', function() { pressed = false;
        clearTimeout(timer); });
    g.addEventListener('mouseleave', function() { pressed = false;
        clearTimeout(timer); });
    g.addEventListener('touchstart', function() { pressed = true;
        timer = setTimeout(function() { if (pressed) { window.hideAllActions();
                a.classList.add('active'); } }, 500); }, { passive: true });
    g.addEventListener('touchend', function() { pressed = false;
        clearTimeout(timer); });
    g.addEventListener('touchmove', function() { pressed = false;
        clearTimeout(timer); });

    return g;
};

// ============================================================
// HIDE ACTIONS
// ============================================================
window.hideAllActions = function() {
    document.querySelectorAll('.msg-actions.active').forEach(function(e) { e.classList.remove('active'); });
};

// ============================================================
// ADD MESSAGE
// ============================================================
window.addMessage = function(id, d, self) {
    if (window.messageIds.has(id)) return;
    window.messageIds.add(id);

    if (emptyState) emptyState.style.display = 'none';
    var el = window.createMessage(id, d, self);
    if (el) {
        messagesDiv.appendChild(el);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        window.updateMessageCount();
    }
};

// ============================================================
// ADD SYSTEM MESSAGE
// ============================================================
window.addSystemMessage = function(t, type) {
    type = type || '';
    if (emptyState) emptyState.style.display = 'none';
    var d = document.createElement('div');
    d.className = 'system-msg' + (type ? ' ' + type : '');
    d.innerHTML = t;
    messagesDiv.appendChild(d);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    window.updateMessageCount();
};

// ============================================================
// SHOW RULES
// ============================================================
window.showRules = function() {
    var rulesText =
        '<div class="rule-title">📜 قوانين الغروب</div><div class="rule-item">1. احترام جميع الأعضاء</div><div class="rule-item">2. لا للسب أو الشتم</div><div class="rule-item">3. لا للمضايقات أو التحرش</div><div class="rule-item">4. لا للمحتوى غير اللائق</div><div class="rule-item">5. الالتزام بالموضوعية</div><div class="rule-item">6. لا للإعلانات دون إذن</div><div class="rule-item">7. احترام قرارات المسؤول</div>';
    var div = document.createElement('div');
    div.className = 'system-msg rules';
    div.innerHTML = rulesText;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    window.updateMessageCount();
};

// ============================================================
// UPDATE MESSAGE COUNT
// ============================================================
window.updateMessageCount = function() {
    var count = messagesDiv.querySelectorAll('.msg-group, .system-msg').length;
    var existing = messagesDiv.querySelector('.msg-count');
    if (existing) existing.remove();

    if (count > 0) {
        var div = document.createElement('div');
        div.className = 'msg-count';
        div.innerHTML = '📬 <span>' + count + '</span> رسالة';
        messagesDiv.insertBefore(div, messagesDiv.firstChild);
    }
};

// ============================================================
// LOAD MESSAGES
// ============================================================
window.loadMessages = function() {
    if (emptyState) emptyState.style.display = 'flex';
    window.lastSender = '';
    window.messageIds.clear();

    window.db.collection('messages')
        .orderBy('timestamp', 'asc')
        .get()
        .then(function(s) {
            if (emptyState) emptyState.style.display = 'none';

            var promises = [];
            var tempMessages = [];

            s.forEach(function(d) {
                var dt = d.data();
                if (window.blockedUsers.indexOf(dt.sender) !== -1) return;

                if (!dt.avatar) {
                    var promise = window.db.collection('users').doc(dt.sender).get()
                        .then(function(userDoc) {
                            if (userDoc.exists) {
                                dt.avatar = userDoc.data().avatar || '';
                            }
                            tempMessages.push({ id: d.id, data: dt });
                        })
                        .catch(function() {
                            tempMessages.push({ id: d.id, data: dt });
                        });
                    promises.push(promise);
                } else {
                    tempMessages.push({ id: d.id, data: dt });
                }
            });

            Promise.all(promises).then(function() {
                tempMessages.forEach(function(item) {
                    window.addMessage(item.id, item.data, item.data.sender === window.currentUser);
                });

                if (s.empty && emptyState) emptyState.style.display = 'flex';
                window.showRules();
                window.updateMessageCount();

                setTimeout(function() {
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }, 100);
            });

        })
        .catch(function(err) {
            console.error('❌ خطأ في تحميل الرسائل:', err);
            if (emptyState) {
                emptyState.innerHTML =
                    '<div class="empty-icon"><span class="material-symbols-outlined">cloud_off</span></div>' +
                    '<div class="empty-title">⚠️ غير متصل</div>' +
                    '<div class="empty-sub">لا يمكن الاتصال بقاعدة البيانات</div>';
                emptyState.style.display = 'flex';
            }
        });
};

// ============================================================
// LISTEN MESSAGES
// ============================================================
window.listenMessages = function() {
    if (window.unsubscribe) {
        try { window.unsubscribe(); } catch(e) {}
    }
    window.lastSender = '';

    window.unsubscribe = window.db.collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(function(s) {
            s.docChanges().forEach(function(c) {
                var d = c.doc.data();
                if (window.blockedUsers.indexOf(d.sender) !== -1) return;

                if (c.type === 'added') {
                    if (!window.messageIds.has(c.doc.id)) {
                        if (!d.avatar) {
                            window.db.collection('users').doc(d.sender).get()
                                .then(function(userDoc) {
                                    if (userDoc.exists) {
                                        d.avatar = userDoc.data().avatar || '';
                                    }
                                    window.addMessage(c.doc.id, d, d.sender === window.currentUser);
                                })
                                .catch(function() {
                                    window.addMessage(c.doc.id, d, d.sender === window.currentUser);
                                });
                        } else {
                            window.addMessage(c.doc.id, d, d.sender === window.currentUser);
                        }
                    }
                }

                if (c.type === 'modified') {
                    var ex = messagesDiv.querySelector('[data-id="' + c.doc.id + '"]');
                    if (ex) {
                        var txt = ex.querySelector('.msg-text');
                        if (txt) {
                            if (d.deleted) {
                                txt.innerHTML =
                                    '<span class="deleted-badge">🗑️ تم حذف هذه الرسالة نهائياً</span>';
                            } else {
                                txt.innerHTML = d.text + (d.edited ?
                                    ' <span class="edited-badge">(معدّل)</span>' : '');
                                if (window.isEmojiOnly(d.text)) txt.classList.add('emoji-big');
                                else txt.classList.remove('emoji-big');
                            }
                        }
                    }
                }

                if (c.type === 'removed') {
                    var ex = messagesDiv.querySelector('[data-id="' + c.doc.id + '"]');
                    if (ex) ex.remove();
                    window.messageIds.delete(c.doc.id);
                    window.updateMessageCount();
                }
            });

            if (s.empty) {
                if (emptyState) emptyState.style.display = 'flex';
            } else {
                if (emptyState) emptyState.style.display = 'none';
            }

        }, function(error) {
            console.error('❌ خطأ في الاستماع للرسائل:', error);
        });
};

// ============================================================
// SEND MESSAGE
// ============================================================
window.sendMessage = function() {
    var raw = msgInput.value.trim();
    if (!raw || !window.isLoggedIn) return;
    if (window.isMuted) { alert('⛔ أنت ممنوع من الكتابة حالياً'); return; }
    var text = window.sanitizeInput(raw);
    if (!text) return;
    
    var found = window.containsBadWord(text, window.badWords);
    if (found) {
        window.muteCount++;
        var d = window.muteCount * 60;
        if (typeof window.addSystemMessage === 'function') {
            window.addSystemMessage('⚠️ تنبيه: @' + window.currentUser + ' استخدم كلمة ممنوعة "' + found + '" (المخالفة رقم ' + window.muteCount + ')',
                'warning');
        }
        window.applyMute(d);
        window.db.collection('violations').add({ 
            user: window.currentUser, 
            word: found, 
            text: text, 
            count: window.muteCount, 
            timestamp: firebase.firestore.FieldValue.serverTimestamp() 
        });
        msgInput.value = '';
        return;
    }
    
    if (window.editingMessage) { window.updateMsg(window.editingMessage.id, text); return; }

    sendBtn.disabled = true;
    msgInput.disabled = true;

    var data = {
        text: text,
        sender: window.currentUser,
        color: window.userColor,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        ip: window.userIP,
        avatar: window.userAvatarBase64
    };

    if (window.replyTo) {
        data.replyTo = {
            id: window.replyTo.id,
            sender: window.replyTo.sender,
            text: window.replyTo.text.substring(0, 60) + (window.replyTo.text.length > 60 ? '...' : '')
        };
    }

    window.db.collection('messages').add(data)
        .then(function() {
            msgInput.value = '';
            msgInput.focus();
            window.clearReply();
        })
        .catch(function() {
            alert('⚠️ فشل الإرسال');
        })
        .finally(function() {
            sendBtn.disabled = false;
            msgInput.disabled = false;
        });
};

// ============================================================
// EDIT MESSAGE
// ============================================================
window.startEdit = function(id, text) {
    window.editingMessage = { id: id, text: text };
    msgInput.value = text;
    msgInput.focus();
    sendBtn.innerHTML = '<span class="material-symbols-outlined">check</span>';
    sendBtn.style.background = '#faa81a';
};

window.updateMsg = function(id, newText) {
    if (!window.editingMessage) return;
    window.db.collection('messages').doc(id).update({ text: newText, edited: true })
        .then(function() {
            window.editingMessage = null;
            sendBtn.innerHTML = '<span class="material-symbols-outlined">send</span>';
            sendBtn.style.background = '';
            msgInput.value = '';
        });
};

// ============================================================
// DELETE MESSAGE
// ============================================================
window.deleteMsg = function(id) {
    if (!window.isAdmin) return;
    if (!confirm('🗑️ هل أنت متأكد من حذف هذه الرسالة نهائياً؟\nلا يمكن استعادتها بعد الحذف.')) return;
    window.db.collection('messages').doc(id).delete()
        .then(function() {
            if (typeof window.addSystemMessage === 'function') {
                window.addSystemMessage('🗑️ تم حذف رسالة نهائياً بواسطة المسؤول', 'success');
            }
            window.messageIds.delete(id);
            window.updateMessageCount();
        })
        .catch(function(err) {
            console.error('❌ خطأ في الحذف:', err);
            alert('⚠️ فشل حذف الرسالة');
        });
};

// ============================================================
// REPORT MESSAGE
// ============================================================
window.reportMsg = function(id, sender) {
    if (confirm('📋 الإبلاغ عن @' + sender + '؟')) {
        window.db.collection('reports').add({
                messageId: id,
                sender: sender,
                reportedBy: window.currentUser,
                reportedIP: window.userIP,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(function() {
                if (typeof window.addSystemMessage === 'function') {
                    window.addSystemMessage('📋 تم الإبلاغ عن @' + sender);
                }
            });
    }
};

// ============================================================
// REPLY
// ============================================================
window.setReply = function(id, sender, text) {
    window.replyTo = { id: id, sender: sender, text: text };
    msgInput.placeholder = 'رد على @' + sender + '...';
    msgInput.focus();
};

window.clearReply = function() {
    window.replyTo = null;
    msgInput.placeholder = 'اكتب رسالة...';
};

// ============================================================
// BLOCK USER
// ============================================================
window.blockUser = function(username) {
    if (!window.isAdmin || username === window.ADMIN_NAME) return;
    if (!confirm('🚫 حظر @' + username + ' نهائياً؟')) return;
    if (window.blockedUsers.indexOf(username) === -1) {
        window.blockedUsers.push(username);
        window.db.collection('blocked').doc('list').set({ users: window.blockedUsers })
            .then(function() {
                if (typeof window.addSystemMessage === 'function') {
                    window.addSystemMessage('🚫 @' + username + ' تم حظره بواسطة المسؤول', 'warning');
                }
                document.querySelectorAll('[data-sender="' + username + '"]').forEach(function(el) {
                    el.remove();
                });
                if (typeof window.loadAdminUsers === 'function') window.loadAdminUsers();
                window.updateMessageCount();
            });
    }
};

console.log('✅ تم تحميل messages.js');
