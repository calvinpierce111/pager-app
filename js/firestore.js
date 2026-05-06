// ==================== USERS ====================
async function getProfile(uid) {
    try {
        const doc = await db.collection('users').doc(uid).get();
        if (!doc.exists) return null;
        const data = doc.data();
        return { id: doc.id, username: data.username || 'unknown', name: data.name || 'Unknown', email: data.email || '', avatar: data.avatar || null, cover: data.cover || null, verified: data.verified || false, bio: data.bio || '', darkMode: data.darkMode || false, sounds: data.sounds !== false, chatWallpapers: data.chatWallpapers || {}, online: data.online || false, lastSeen: data.lastSeen || 0, isAdmin: data.isAdmin || false, private: data.private || false, language: data.language || 'en', fcmToken: data.fcmToken || null, cloudPassword: data.cloudPassword || null };
    } catch(e) { return null; }
}

async function saveProfile(profile) {
    if (!profile || !profile.id) return;
    const clean = {};
    Object.keys(profile).forEach(k => { if (profile[k] !== undefined) clean[k] = profile[k]; });
    await db.collection('users').doc(profile.id).set(clean, { merge: false }).catch(()=>{});
}

async function updateProfile(uid, data) {
    if (!uid) return;
    const clean = {};
    Object.keys(data).forEach(k => { if (data[k] !== undefined) clean[k] = data[k]; });
    await db.collection('users').doc(uid).update(clean).catch(()=>{});
    if (S.currentUser && S.currentUser.id === uid) Object.assign(S.currentUser, clean);
}

async function loadAllUsers() {
    const snap = await db.collection('users').get().catch(()=>null);
    if (!snap) return;
    S.users = snap.docs.map(d => ({ id: d.id, username: d.data().username || 'unknown', name: d.data().name || 'Unknown', email: d.data().email || '', avatar: d.data().avatar || null, verified: d.data().verified || false, bio: d.data().bio || '', private: d.data().private || false, online: d.data().online || false }));
}

function onUsersChange(cb) {
    return db.collection('users').onSnapshot(snap => {
        S.users = snap.docs.map(d => ({ id: d.id, username: d.data().username || 'unknown', name: d.data().name || 'Unknown', email: d.data().email || '', avatar: d.data().avatar || null, verified: d.data().verified || false, bio: d.data().bio || '', private: d.data().private || false, online: d.data().online || false }));
        if (cb) cb(S.users);
    }, err => console.error('Users listener error:', err));
}

async function isAdmin(email) {
    if (!email) return false;
    const doc = await db.collection('admins').doc(email).get().catch(()=>null);
    return doc?.exists || false;
}

async function loadPosts() {
    const snap = await db.collection('posts').orderBy('createdAt', 'desc').limit(50).get().catch(()=>null);
    if (!snap) return;
    S.posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function onPostsChange(cb) {
    return db.collection('posts').orderBy('createdAt', 'desc').limit(50).onSnapshot(snap => {
        const newPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (S.posts.length === 0) { S.posts = newPosts; if (cb) cb(S.posts); }
        else {
            const oldMap = new Map(S.posts.map(p => [p.id, p]));
            newPosts.forEach(np => { const old = oldMap.get(np.id); if (old) { old.likes = np.likes; old.comments = np.comments; } });
            const oldIds = new Set(S.posts.map(p => p.id));
            const addedPosts = newPosts.filter(p => !oldIds.has(p.id));
            if (addedPosts.length > 0) { S.posts = [...addedPosts, ...S.posts]; if (window.addNewPostsToFeed) window.addNewPostsToFeed(addedPosts); }
            if (window.updatePostCounters) window.updatePostCounters();
        }
    }, err => console.error('Posts listener error:', err));
}

async function savePost(post) { await db.collection('posts').doc(post.id).set(post, { merge: true }).catch(()=>{}); }
async function deletePost(pid) { await db.collection('posts').doc(pid).delete().catch(()=>{}); }

async function loadSavedPosts() {
    if (!S.currentUser) return;
    const snap = await db.collection('saved').where('userId', '==', S.currentUser.id).get().catch(()=>null);
    S.savedPosts = snap ? snap.docs.map(d => d.data().postId) : [];
}
async function toggleSavePost(postId) {
    if (!S.currentUser) return;
    const idx = S.savedPosts.indexOf(postId);
    if (idx === -1) { S.savedPosts.push(postId); db.collection('saved').add({ userId: S.currentUser.id, postId, time: Date.now() }).catch(()=>{}); }
    else {
        S.savedPosts.splice(idx, 1);
        const snap = await db.collection('saved').where('userId', '==', S.currentUser.id).where('postId', '==', postId).get().catch(()=>null);
        if (snap) { const batch = db.batch(); snap.docs.forEach(d => batch.delete(d.ref)); batch.commit().catch(()=>{}); }
    }
}

async function loadMessages() {
    const snap = await db.collection('messages').orderBy('time', 'desc').limit(100).get().catch(()=>null);
    if (!snap) return;
    S.messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function onMessagesChange(cb) {
    return db.collection('messages').orderBy('time', 'desc').limit(100).onSnapshot(snap => {
        S.messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (cb) cb(S.messages);
    }, err => console.error('Messages listener error:', err));
}

async function saveMessage(msg) { db.collection('messages').doc(msg.id).set(msg, { merge: true }).catch(()=>{}); }
async function deleteMessagesBetween(u1, u2) {
    const snap = await db.collection('messages').where('participants', 'array-contains', u1).get().catch(()=>null);
    if (!snap) return;
    const batch = db.batch();
    snap.docs.forEach(d => { if (d.data().participants?.includes(u2)) batch.delete(d.ref); });
    batch.commit().catch(()=>{});
    S.messages = S.messages.filter(m => !(m.participants?.includes(u1) && m.participants?.includes(u2)));
}
async function deleteMessagesForMe(uid, otherId) {
    const snap = await db.collection('messages').where('participants', 'array-contains', uid).get().catch(()=>null);
    if (!snap) return;
    const batch = db.batch();
    snap.docs.forEach(d => { if (d.data().participants?.includes(otherId)) batch.delete(d.ref); });
    batch.commit().catch(()=>{});
    S.messages = S.messages.filter(m => !(m.participants?.includes(uid) && m.participants?.includes(otherId)));
}
async function addReaction(msgId, emoji) {
    const ref = db.collection('messages').doc(msgId);
    ref.update({ [`reactions.${emoji}`]: firebase.firestore.FieldValue.arrayUnion(S.currentUser.id) }).catch(()=>{});
}

async function loadFollows() {
    if (!S.currentUser) return;
    const snap = await db.collection('follows').where('follower', '==', S.currentUser.id).get().catch(()=>null);
    S.follows = snap ? snap.docs.filter(d => d.data().status === 'approved').map(d => d.data().following) : [];
}
async function requestFollow(targetId) {
    if (!S.currentUser) return;
    const target = await getProfile(targetId);
    if (!target) return;
    if (target.private) {
        await db.collection('follows').add({ follower: S.currentUser.id, following: targetId, time: Date.now(), status: 'pending' }).catch(()=>{});
        showToast('Request sent!');
    } else {
        S.follows.push(targetId);
        db.collection('follows').add({ follower: S.currentUser.id, following: targetId, time: Date.now(), status: 'approved' }).catch(()=>{});
        showToast('Following!');
    }
}
async function unfollowUser(targetId) {
    if (!S.currentUser) return;
    S.follows = S.follows.filter(f => f !== targetId);
    const snap = await db.collection('follows').where('follower', '==', S.currentUser.id).where('following', '==', targetId).get().catch(()=>null);
    if (snap) { const batch = db.batch(); snap.docs.forEach(d => batch.delete(d.ref)); batch.commit().catch(()=>{}); }
}

async function loadBlocks() {
    if (!S.currentUser) return;
    const snap = await db.collection('blocks').where('blocker', '==', S.currentUser.id).get().catch(()=>null);
    S.blockedUsers = snap ? snap.docs.map(d => d.data().blocked) : [];
}
async function toggleBlock(targetId) {
    if (!S.currentUser) return;
    const idx = S.blockedUsers.indexOf(targetId);
    if (idx === -1) { S.blockedUsers.push(targetId); db.collection('blocks').add({ blocker: S.currentUser.id, blocked: targetId, time: Date.now() }).catch(()=>{}); }
    else {
        S.blockedUsers.splice(idx, 1);
        const snap = await db.collection('blocks').where('blocker', '==', S.currentUser.id).where('blocked', '==', targetId).get().catch(()=>null);
        if (snap) { const batch = db.batch(); snap.docs.forEach(d => batch.delete(d.ref)); batch.commit().catch(()=>{}); }
    }
}

async function reportPost(postId, reason, comment) {
    const post = S.posts.find(p => p.id === postId);
    await db.collection('reports').add({
        postId, reporterId: S.currentUser.id, reason, comment: comment || '',
        postData: post ? { text: post.text, image: post.image, images: post.images, userId: post.userId } : null,
        time: Date.now(), status: 'pending'
    }).catch(()=>{});
}

async function setPrivate(isPrivate) { if (S.currentUser) await updateProfile(S.currentUser.id, { private: isPrivate }); }