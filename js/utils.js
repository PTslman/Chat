// ============================================================
// 🛠️ UTILITIES - نيزك v3.5.0
// ============================================================

// ============================================================
// 📸 AVATAR FUNCTIONS
// ============================================================
function getInitials(name) {
    if (!name) return '👤';
    var parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getAvatarColor(name) {
    var colors = ['#2b6ef0', '#ed4245', '#faa81a', '#23a55a', '#a78bfa', '#f472b6', '#60a5fa', '#34d399'];
    var hash = 0;
    for (var i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function updateAvatarUI(element, placeholder, avatarBase64, name) {
    if (!element) return;
    if (avatarBase64 && avatarBase64.indexOf('data:image') === 0) {
        element.innerHTML = '<img src="' + avatarBase64 + '" alt="صورة شخصية" loading="lazy">';
        if (placeholder) placeholder.textContent = '';
    } else {
        var initials = getInitials(name);
        var color = getAvatarColor(name);
        var fontSize = element.id === 'profileAvatarPreview' ? '32px' : '16px';
        element.innerHTML =
            '<span class="avatar-placeholder" style="background:' + color + ';display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:50%;font-size:' +
            fontSize + ';font-weight:700;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,0.2);">' + initials +
            '</span>';
        if (placeholder) placeholder.textContent = '';
    }
}

function updateAllAvatars(avatarBase64, name) {
    var headerAvatar = document.getElementById('headerAvatar');
    var headerAvatarPlaceholder = document.getElementById('headerAvatarPlaceholder');
    var profileAvatarPreview = document.getElementById('profileAvatarPreview');
    var profileAvatarPlaceholder = document.getElementById('profileAvatarPlaceholder');
    var headerUsername = document.getElementById('headerUsername');
    
    updateAvatarUI(headerAvatar, headerAvatarPlaceholder, avatarBase64, name);
    updateAvatarUI(profileAvatarPreview, profileAvatarPlaceholder, avatarBase64, name);
    if (headerUsername) headerUsername.textContent = name;
}

// ============================================================
// 🖼️ COMPRESS IMAGE TO BASE64
// ============================================================
function compressImageToBase64(file, maxWidth, maxHeight, quality, statusElement) {
    return new Promise(function(resolve, reject) {
        try {
            if (statusElement) {
                statusElement.textContent = '⏳ جاري ضغط الصورة...';
                statusElement.className = 'upload-status show loading';
            }

            var reader = new FileReader();
            reader.onload = function(e) {
                try {
                    var img = new Image();
                    img.onload = function() {
                        try {
                            var canvas = document.createElement('canvas');
                            var ctx = canvas.getContext('2d');

                            var width = img.width;
                            var height = img.height;

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

                            var base64 = canvas.toDataURL('image/jpeg', quality);

                            if (statusElement) {
                                statusElement.textContent = '✅ تم ضغط الصورة بنجاح';
                                statusElement.className = 'upload-status show success';
                                setTimeout(function() {
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
// 🔒 GENERATE HASHED IP
// ============================================================
function getHashedIP() {
    var h = Date.now().toString(36) + Math.random().toString(36).substr(2, 8) + navigator.userAgent.substring(0, 20)
        .replace(/[^a-zA-Z0-9]/g, '');
    try { return btoa(h).substring(0, 20); } catch (e) { return h.substring(0, 20); }
}

// ============================================================
// 🛠️ UTILITY
// ============================================================
function sanitizeInput(t) { return t.replace(/[<>]/g, '').trim(); }

function isEmojiOnly(t) {
    return /^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2700}-\u{27BF}\s]+$/u
        .test(t.trim());
}

function showLoading(s) {
    var overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    if (s) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

// ============================================================
// 🔍 BAD WORD DETECTION
// ============================================================
function containsBadWord(t, badWords) {
    var l = t.toLowerCase();
    for (var i = 0; i < badWords.length; i++) {
        if (l.indexOf(badWords[i].toLowerCase()) !== -1) return badWords[i];
    }
    return null;
}

// ============================================================
// 💾 SESSION
// ============================================================
function saveSession(username, color, avatar) {
    try {
        var session = {
            username: username,
            color: color,
            ip: getHashedIP(),
            avatar: avatar || '',
            timestamp: Date.now()
        };
        localStorage.setItem('chat_session', JSON.stringify(session));
        console.log('✅ تم حفظ الجلسة');
    } catch (e) {
        console.log('⚠️ لا يمكن حفظ الجلسة');
    }
}

function checkSession() {
    try {
        var sessionData = localStorage.getItem('chat_session');
        if (!sessionData) return null;
        var session = JSON.parse(sessionData);
        var maxAge = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - session.timestamp > maxAge) {
            localStorage.removeItem('chat_session');
            return null;
        }
        return session;
    } catch (e) {
        return null;
    }
  }
