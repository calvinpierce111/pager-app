let appInitialized = false;
let unsubscribeMessages = null;

function initApp() {
    if (appInitialized) return;
    appInitialized = true;

    auth.onAuthStateChanged(async (fbUser) => {
        try {
            if (fbUser) {
                S.firebaseUser = fbUser;
                let profile = await getProfile(fbUser.uid);
                if (!profile || !profile.name || !profile.username) {
                    profile = {
                        id: fbUser.uid,
                        username: fbUser.email ? fbUser.email.split('@')[0].slice(0, 30) : 'user_' + fbUser.uid.slice(0, 6),
                        name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0].slice(0, 50) : 'User'),
                        email: fbUser.email || '',
                        avatar: fbUser.photoURL || null,
                        cover: null,
                        verified: false, bio: '', darkMode: false, sounds: true,
                        chatWallpapers: {}, lastSeen: Date.now(),
                        isAdmin: false, private: false, language: 'en'
                    };
                    await saveProfile(profile);
                }
                S.currentUser = profile;
                S.darkMode = profile.darkMode || false;
                S.sounds = profile.sounds !== false;
                S.chatWallpapers = profile.chatWallpapers || {};
                S.savedPosts = []; S.blockedUsers = []; S.trending = []; S.pendingFollows = [];
                S.language = profile.language || 'en';
                if (profile.email) S.currentUser.isAdmin = await isAdmin(profile.email);
                
                await loadAllUsers();
                await loadPosts();
                await loadMessages();
                await loadFollows();
                await loadSavedPosts();
                await loadBlocks();

                S.activeView = 'feed';
                renderApp();

                if (unsubscribeMessages) unsubscribeMessages();
                unsubscribeMessages = onMessagesChange(() => {
                    if (S.activeView === 'chat' || S.activeView === 'messages') renderApp();
                });

                if (fbUser.emailVerified === false) {
                    setTimeout(() => showToast('Please verify your email'), 3000);
                }
            } else {
                S.currentUser = null; S.firebaseUser = null;
                if (unsubscribeMessages) { unsubscribeMessages(); unsubscribeMessages = null; }
                renderAuth();
            }
        } catch (e) {
            console.error('App init error:', e);
            renderAuth();
        }
    });

    let messaging = null;
    try {
        messaging = firebase.messaging();
        messaging.onMessage((payload) => { if (payload?.notification?.body) showToast(payload.notification.body); });
    } catch(e) {}

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(()=>{});
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    setTimeout(initApp, 50);
}