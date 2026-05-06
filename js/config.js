const firebaseConfig = {
    apiKey: "AIzaSyB0qNZCffdOOcDp9d46AF8nbvL5gRv-2Oc",
    authDomain: "pager-messenger-5a4d9.firebaseapp.com",
    projectId: "pager-messenger-5a4d9",
    storageBucket: "pager-messenger-5a4d9.firebasestorage.app",
    messagingSenderId: "371845385996",
    appId: "1:371845385996:web:0cde9634dfd68f3f3e8329"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

const TELEGRAM_BOT_TOKEN = '8750014716:AAHwZ5lK-T97BpIhBW_7KGVf-jC6n-K6xkE';
const TELEGRAM_CHANNEL_ID = '-1003890417554';

async function uploadToTelegram(file) {
    const fd = new FormData();
    fd.append('chat_id', TELEGRAM_CHANNEL_ID);
    fd.append('photo', file);
    const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: 'POST', body: fd });
    if (!r.ok) throw new Error((await r.json()).description || 'Upload failed');
    const d = await r.json();
    const p = d.result.photo[d.result.photo.length - 1];
    const fp = await (await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${p.file_id}`)).json();
    return { url: `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fp.result.file_path}`, messageId: d.result.message_id };
}

async function uploadFileToTelegram(file) {
    const fd = new FormData();
    fd.append('chat_id', TELEGRAM_CHANNEL_ID);
    fd.append('document', file);
    const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, { method: 'POST', body: fd });
    if (!r.ok) throw new Error((await r.json()).description || 'Upload failed');
    const d = await r.json();
    const doc = d.result.document;
    const fp = await (await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${doc.file_id}`)).json();
    return { url: `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fp.result.file_path}`, name: doc.file_name || 'file', size: doc.file_size || 0, messageId: d.result.message_id };
}

async function uploadVoiceToTelegram(blob) {
    const fd = new FormData();
    fd.append('chat_id', TELEGRAM_CHANNEL_ID);
    fd.append('voice', blob, 'voice.ogg');
    const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVoice`, { method: 'POST', body: fd });
    if (!r.ok) throw new Error((await r.json()).description || 'Upload failed');
    const d = await r.json();
    const fileId = d.result.voice.file_id;
    const fp = await (await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`)).json();
    return { url: `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fp.result.file_path}`, messageId: d.result.message_id };
}

async function deleteTelegramMessage(messageId) {
    if (!messageId) return;
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteMessage?chat_id=${TELEGRAM_CHANNEL_ID}&message_id=${messageId}`).catch(()=>{});
}

const GIPHY_API_KEY = 'zCwV1qkRoZyLHAqmmL9kPS4zZlui7Rhe';
async function searchGifs(query) {
    const r = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`);
    const d = await r.json();
    return (d.data || []).map(item => ({ url: item.images.original.url, preview: item.images.fixed_width_small.url }));
}
async function getTrendingGifs() {
    const r = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`);
    const d = await r.json();
    return (d.data || []).map(item => ({ url: item.images.original.url, preview: item.images.fixed_width_small.url }));
}

const LANG = {
    ru: {
        feed: 'Лента', discover: 'Поиск', messages: 'Сообщения', profile: 'Профиль',
        settings: 'Настройки', darkMode: 'Тёмная тема', sounds: 'Звуки', pinCode: 'ПИН-код',
        logOut: 'Выйти', close: 'Закрыть', cancel: 'Отмена', save: 'Сохранить', delete: 'Удалить',
        post: 'Опубликовать', comment: 'Комментарий', like: 'Нравится', follow: 'Подписаться',
        unfollow: 'Отписаться', block: 'Заблокировать', unblock: 'Разблокировать', report: 'Пожаловаться',
        deletePost: 'Удалить пост', deleteChat: 'Удалить чат', deleteForMe: 'Удалить у себя',
        deleteForBoth: 'Удалить у обоих', signIn: 'Войти', createAccount: 'Создать аккаунт',
        email: 'Email', password: 'Пароль', username: 'Имя пользователя', name: 'Имя', bio: 'О себе',
        noPosts: 'Нет постов', noConversations: 'Нет диалогов', posted: 'Опубликовано!',
        addPhoto: 'Добавьте хотя бы одно фото', editBio: 'Расскажите о себе (до 150)',
        editName: 'Ваше имя (до 50)', editUsername: 'Новый username (3-30)',
        usernameTaken: 'Username занят!', private: 'Приватный', public: 'Публичный',
        enterPIN: 'Введите ПИН-код', wrongPIN: 'Неверный ПИН-код',
        switchPrivate: 'Переключить на приватный?', switchPublic: 'Переключить на публичный?',
        deleteAccountWarning: 'Аккаунт и все данные будут удалены без возможности восстановления.'
    },
    en: {
        feed: 'Feed', discover: 'Discover', messages: 'Messages', profile: 'Profile',
        settings: 'Settings', darkMode: 'Dark Mode', sounds: 'Sounds', pinCode: 'PIN Code',
        logOut: 'Log Out', close: 'Close', cancel: 'Cancel', save: 'Save', delete: 'Delete',
        post: 'Post', comment: 'Comment', like: 'Like', follow: 'Follow',
        unfollow: 'Unfollow', block: 'Block', unblock: 'Unblock', report: 'Report',
        deletePost: 'Delete Post', deleteChat: 'Delete Chat', deleteForMe: 'Delete for me',
        deleteForBoth: 'Delete for both', signIn: 'Sign In', createAccount: 'Create Account',
        email: 'Email', password: 'Password', username: 'Username', name: 'Name', bio: 'Bio',
        noPosts: 'No posts', noConversations: 'No conversations', posted: 'Posted!',
        addPhoto: 'Add at least one photo', editBio: 'Tell about yourself (max 150)',
        editName: 'Your name (max 50)', editUsername: 'New username (3-30)',
        usernameTaken: 'Username taken!', private: 'Private', public: 'Public',
        enterPIN: 'Enter PIN', wrongPIN: 'Wrong PIN',
        switchPrivate: 'Switch to Private?', switchPublic: 'Switch to Public?',
        deleteAccountWarning: 'Account and all data will be permanently deleted.'
    }
};
function t(key) { const lang = S.language || 'en'; return (LANG[lang] && LANG[lang][key]) || LANG.en[key] || key; }
function sanitize(str) { if (!str) return ''; return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }