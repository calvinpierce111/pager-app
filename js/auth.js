function renderAuth() {
    const isLogin = S.authMode === 'login';
    app.innerHTML = '';
    const container = document.createElement('div'); container.className = 'auth-container';
    container.innerHTML = '<div class="auth-title">Pager</div><div style="color:var(--text-secondary);">' + (isLogin ? t('signIn') : t('createAccount')) + '</div>' +
        (!isLogin ? '<input id="aun" placeholder="' + t('username') + ' (3-30)" class="auth-input" maxlength="30"><input id="anm" placeholder="' + t('name') + ' (1-50)" class="auth-input" maxlength="50">' : '') +
        '<input id="aem" type="email" placeholder="' + t('email') + '" class="auth-input"><input id="apw" type="password" placeholder="' + t('password') + '" class="auth-input" minlength="6">' +
        '<button id="asb" class="auth-btn primary">' + (isLogin ? t('signIn') : t('createAccount')) + '</button>' +
        '<div class="auth-divider"><div class="auth-divider-line"></div><span class="auth-divider-text">or</span><div class="auth-divider-line"></div></div>' +
        '<button id="googleBtn" class="auth-btn text" style="border:0.5px solid var(--separator);">Google</button>' +
        '<button id="sab" class="auth-btn text">' + (isLogin ? t('createAccount') : 'I have an account') + '</button>' +
        '<div id="ae" style="color:var(--red);font-size:13px;"></div>';
    app.appendChild(container);

    const showErr = m => { const el = document.getElementById('ae'); if (el) el.textContent = m; };

    document.getElementById('asb').addEventListener('click', async () => {
        const em = (document.getElementById('aem')?.value || '').trim();
        const pw = document.getElementById('apw')?.value || '';
        if (!em || !pw) { showErr('Fill all fields'); return; }
        if (pw.length < 6) { showErr('Password min 6 chars'); return; }
        try {
            if (isLogin) { await auth.signInWithEmailAndPassword(em, pw); }
            else {
                const un = (document.getElementById('aun')?.value || '').trim();
                const nm = (document.getElementById('anm')?.value || '').trim();
                if (!un || !nm) { showErr('All fields required'); return; }
                if (un.length < 3 || un.length > 30) { showErr('Username: 3-30 chars'); return; }
                if (nm.length > 50) { showErr('Name max 50 chars'); return; }
                const cred = await auth.createUserWithEmailAndPassword(em, pw);
                await saveProfile({ id: cred.user.uid, username: un, name: nm, email: em, avatar: null, cover: null, verified: false, bio: '', darkMode: false, sounds: true, chatWallpapers: {}, online: true, lastSeen: Date.now(), private: false, language: 'en' });
                await cred.user.sendEmailVerification().catch(()=>{});
                showToast('Check email to verify');
            }
        } catch(e) { showErr(e.message); }
    });

    document.getElementById('googleBtn').addEventListener('click', async () => {
        try { await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
        catch(e) { showErr(e.message); }
    });

    document.getElementById('sab').addEventListener('click', () => { S.authMode = isLogin ? 'register' : 'login'; renderAuth(); });
}