// ============================================================
// 👤 PROFILE MODULE - نيزك v3.5.0
// ============================================================

let userAvatarBase64 = '';
let tempAvatarBase64 = '';

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
function openProfileModal() {
    if (typeof isLoggedIn === 'undefined' || !isLoggedIn) return;
    if (profileNameInput) profileNameInput.value = currentUser || '';
    if (profileModal) profileModal.classList.add('active');
    updateAvatarUI(profileAvatarPreview, profileAvatarPlaceholder, userAvatarBase64, currentUser || '');
    if (profileUploadStatus) {
        profileUploadStatus.className = 'upload-status';
        profileUploadStatus.textContent = '';
    }
}

// ============================================================
// SAVE PROFILE
// ============================================================
async function saveProfile() {
    var newName = profileNameInput.value.trim();
    if (!newName || newName.length < 2) {
        alert('⚠️ الاسم يجب أن يكون حرفين على الأقل');
        return;
    }

    showLoading(true);

    try {
        var newAvatarBase64 = userAvatarBase64;

        if (tempAvatarBase64) {
            newAvatarBase64 = tempAvatarBase64;
            tempAvatarBase64 = '';
        }

        var oldName = currentUser;

        await db.collection('users').doc(oldName).update({
            username: newName,
            avatar: newAvatarBase64,
            color: userColor || '#2b6ef0'
        });

        currentUser = newName;
        userAvatarBase64 = newAvatarBase64;
        updateAllAvatars(newAvatarBase64, newName);

        if (oldName !== newName) {
            var messagesSnap = await db.collection('messages')
                .where('sender', '==', oldName)
                .get();
            var batch = db.batch();
            messagesSnap.forEach(function(doc) {
                batch.update(doc.ref, { sender: newName, avatar: newAvatarBase64 });
            });
            await batch.commit();
        }

        if (typeof addSystemMessage === 'function') {
            addSystemMessage('✅ تم تحديث الملف الشخصي لـ ' + newName, 'success');
        }
        if (profileModal) profileModal.classList.remove('active');

    } catch (error) {
        console.error('❌ خطأ في حفظ الملف الشخصي:', error);
        alert('⚠️ حدث خطأ أثناء حفظ الملف الشخصي');
    }

    showLoading(false);
}

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

            compressImageToBase64(file, 300, 300, 0.6, profileUploadStatus)
                .then(function(base64) {
                    if (profileAvatarPreview) {
                        profileAvatarPreview.innerHTML = '<img src="' + base64 + '" alt="صورة شخصية">';
                    }
                    if (profileAvatarPlaceholder) profileAvatarPlaceholder.textContent = '';
                    tempAvatarBase64 = base64;
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
        tempAvatarBase64 = '';
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
            tempAvatarBase64 = '';
            if (profileUploadStatus) {
                profileUploadStatus.className = 'upload-status';
                profileUploadStatus.textContent = '';
            }
        }
    });
}

if (profileSaveBtn) {
    profileSaveBtn.addEventListener('click', saveProfile);
}

if (profileNameInput) {
    profileNameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') saveProfile();
    });
    }
