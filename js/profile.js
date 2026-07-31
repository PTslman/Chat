// ============================================================
// 👤 PROFILE MODULE - نيزك v3.5.0
// ============================================================

window.userAvatarBase64 = '';
window.tempAvatarBase64 = '';

// ============================================================
// DOM REFS
// ============================================================
var profileModal = document.getElementById('profileModal');
var closeProfileModal = document.getElementById('closeProfileModal');
var profileAvatarPreview = document.getElementById('profileAvatarPreview');
var profileAvatarPlaceholder = document.getElementById('profileAvatarPlaceholder');
var profileAvatarBtn = document.getElementById('profileAvatarBtn');
var profileAvatarInput = document.getElementById('profileAvatarInput');
var profileNameInput = document.getElementById('profileNameInput');
var profileSaveBtn = document.getElementById('profileSaveBtn');
var profileUploadStatus = document.getElementById('profileUploadStatus');

// ============================================================
// OPEN PROFILE
// ============================================================
window.openProfileModal = function() {
    if (!window.isLoggedIn) return;
    if (profileNameInput) profileNameInput.value = window.currentUser || '';
    if (profileModal) profileModal.classList.add('active');
    window.updateAvatarUI(profileAvatarPreview, profileAvatarPlaceholder, window.userAvatarBase64, window.currentUser || '');
    if (profileUploadStatus) {
        profileUploadStatus.className = 'upload-status';
        profileUploadStatus.textContent = '';
    }
};

// ============================================================
// SAVE PROFILE
// ============================================================
window.saveProfile = async function() {
    var newName = profileNameInput.value.trim();
    if (!newName || newName.length < 2) {
        alert('⚠️ الاسم يجب أن يكون حرفين على الأقل');
        return;
    }

    window.showLoading(true);

    try {
        var newAvatarBase64 = window.userAvatarBase64;

        if (window.tempAvatarBase64) {
            newAvatarBase64 = window.tempAvatarBase64;
            window.tempAvatarBase64 = '';
        }

        var oldName = window.currentUser;

        await window.db.collection('users').doc(oldName).update({
            username: newName,
            avatar: newAvatarBase64,
            color: window.userColor || '#2b6ef0'
        });

        window.currentUser = newName;
        window.userAvatarBase64 = newAvatarBase64;
        window.updateAllAvatars(newAvatarBase64, newName);

        if (oldName !== newName) {
            var messagesSnap = await window.db.collection('messages')
                .where('sender', '==', oldName)
                .get();
            var batch = window.db.batch();
            messagesSnap.forEach(function(doc) {
                batch.update(doc.ref, { sender: newName, avatar: newAvatarBase64 });
            });
            await batch.commit();
        }

        if (typeof window.addSystemMessage === 'function') {
            window.addSystemMessage('✅ تم تحديث الملف الشخصي لـ ' + newName, 'success');
        }
        if (profileModal) profileModal.classList.remove('active');

    } catch (error) {
        console.error('❌ خطأ في حفظ الملف الشخصي:', error);
        alert('⚠️ حدث خطأ أثناء حفظ الملف الشخصي');
    }

    window.showLoading(false);
};

// ============================================================
// PROFILE EVENTS
// ============================================================
if (profileAvatarBtn) {
    profileAvatarBtn.addEventListener('click', function() {
        if (profileAvatarInput) profileAvatarInput.click();
    });
}

if (profileAvatarPreview) {
    profileAvatarPreview.addEventListener('click', function() {
        if (profileAvatarInput) profileAvatarInput.click();
    });
}

if (profileAvatarInput) {
    profileAvatarInput.addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
            var file = this.files[0];
            if (file.size > 5 * 1024 * 1024) {
                alert('⚠️ حجم الصورة كبير جداً (الحد الأقصى 5MB)');
                this.value = '';
                return;
            }

            window.compressImageToBase64(file, 300, 300, 0.6, profileUploadStatus)
                .then(function(base64) {
                    if (profileAvatarPreview) {
                        profileAvatarPreview.innerHTML = '<img src="' + base64 + '" alt="صورة شخصية">';
                    }
                    if (profileAvatarPlaceholder) profileAvatarPlaceholder.textContent = '';
                    window.tempAvatarBase64 = base64;
                    if (profileUploadStatus) {
                        profileUploadStatus.textContent = '📸 تم اختيار الصورة، اضغط حفظ للتحديث';
                        profileUploadStatus.className = 'upload-status show success';
                    }
                })
                .catch(function(err) {
                    console.error('❌ فشل ضغط الصورة:', err);
                    alert('⚠️ فشل معالجة الصورة: ' + err.message);
                });
        }
    });
}

if (closeProfileModal) {
    closeProfileModal.addEventListener('click', function() {
        if (profileModal) profileModal.classList.remove('active');
        window.tempAvatarBase64 = '';
        if (profileUploadStatus) {
            profileUploadStatus.className = 'upload-status';
            profileUploadStatus.textContent = '';
        }
    });
}

if (profileModal) {
    profileModal.addEventListener('click', function(e) {
        if (e.target === profileModal) {
            profileModal.classList.remove('active');
            window.tempAvatarBase64 = '';
            if (profileUploadStatus) {
                profileUploadStatus.className = 'upload-status';
                profileUploadStatus.textContent = '';
            }
        }
    });
}

if (profileSaveBtn) {
    profileSaveBtn.addEventListener('click', window.saveProfile);
}

if (profileNameInput) {
    profileNameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') window.saveProfile();
    });
}

console.log('✅ تم تحميل profile.js');
