// ============================================================
// 👤 PROFILE MODULE - نيزك v3.5.0
// ============================================================

window.userAvatarBase64 = '';
window.tempAvatarBase64 = '';

// ============================================================
// DOM REFS
// ============================================================
const profileModal = document.getElementById('profileModal');
const closeProfileModal = document.getElementById('closeProfileModal');
const profileAvatarPreview = document.getElementById('profileAvatarPreview');
const profileAvatarPlaceholder = document.getElementById('profileAvatarPlaceholder');
const profileAvatarBtn = document.getElementById('profileAvatarBtn');
const profileAvatarInput = document.getElementById('profileAvatarInput');
const profileNameInput = document.getElementById('profileNameInput');
const profileSaveBtn = document.getElementById('profileSaveBtn');
const profileUploadStatus = document.getElementById('profileUploadStatus');

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
    const newName = profileNameInput.value.trim();
    if (!newName || newName.length < 2) {
        alert('⚠️ الاسم يجب أن يكون حرفين على الأقل');
        return;
    }

    window.showLoading(true);

    try {
        let newAvatarBase64 = window.userAvatarBase64;

        if (window.tempAvatarBase64) {
            newAvatarBase64 = window.tempAvatarBase64;
            window.tempAvatarBase64 = '';
        }

        const oldName = window.currentUser;

        // تحديث بيانات المستخدم
        await window.db.collection('users').doc(oldName).set({
            username: newName,
            avatar: newAvatarBase64,
            color: window.userColor || '#2b6ef0',
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        window.currentUser = newName;
        window.userAvatarBase64 = newAvatarBase64;
        window.updateAllAvatars(newAvatarBase64, newName);

        // تحديث اسم المرسل في جميع الرسائل
        if (oldName !== newName) {
            const messagesSnap = await window.db.collection('messages')
                .where('sender', '==', oldName)
                .get();
            
            const batch = window.db.batch();
            messagesSnap.forEach((doc) => {
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
        alert('⚠️ حدث خطأ أثناء حفظ الملف الشخصي: ' + error.message);
    }

    window.showLoading(false);
};

// ============================================================
// PROFILE EVENTS
// ============================================================
if (profileAvatarBtn) {
    profileAvatarBtn.addEventListener('click', () => {
        if (profileAvatarInput) profileAvatarInput.click();
    });
}

if (profileAvatarPreview) {
    profileAvatarPreview.addEventListener('click', () => {
        if (profileAvatarInput) profileAvatarInput.click();
    });
}

if (profileAvatarInput) {
    profileAvatarInput.addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            if (file.size > 5 * 1024 * 1024) {
                alert('⚠️ حجم الصورة كبير جداً (الحد الأقصى 5MB)');
                this.value = '';
                return;
            }

            window.compressImageToBase64(file, 300, 300, 0.6, profileUploadStatus)
                .then((base64) => {
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
                .catch((err) => {
                    console.error('❌ فشل ضغط الصورة:', err);
                    alert('⚠️ فشل معالجة الصورة: ' + err.message);
                });
        }
    });
}

if (closeProfileModal) {
    closeProfileModal.addEventListener('click', () => {
        if (profileModal) profileModal.classList.remove('active');
        window.tempAvatarBase64 = '';
        if (profileUploadStatus) {
            profileUploadStatus.className = 'upload-status';
            profileUploadStatus.textContent = '';
        }
    });
}

if (profileModal) {
    profileModal.addEventListener('click', (e) => {
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
    profileNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') window.saveProfile();
    });
}

console.log('✅ تم تحميل profile.js');
