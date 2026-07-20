let cfg = { username: '', apiKey: '', targetHours: 2 };
let startTimestamp = null, actualTotalSeconds = 0, lastHeartbeatTime = null;

const locks = { actual: false, streak: false, heartbeat: false, potential: false };
let lastHr = new Date().getHours();
let alertEnabled = false;
let audio = new Audio();

const el = (id) => document.getElementById(id);
const selectors = [
    'setupModal', 'usernameInput', 'apiKeyInput', 'targetInput', 'saveconfigBtn',
    'alertSettingsModal', 'alertSettingsBtn', 'closeAlertSettingsBtn', 'alertToggleBtn',
    'userProfile', 'userDisplayName', 'streakDisplay', 'logoutBtn', 'localClock',
    'themeToggle', 'flashContainer', 'alertBanner', 'reminderMinutes', 'audioUrlInput',
    'timeAgoDisplay', 'actualTimeDisplay', 'potentialTimeDisplay', 'progressBar', 'progressText', 'sessionStartDisplay'
];
const d = {};
selectors.forEach(s => d[s] = el(s));

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadCfg();
    initAlert();
    lucide.createIcons();

    setInterval(updateClock, 50);
    setInterval(calc, 50);
    setInterval(() => sync(['heartbeat', 'actual']), 60000);

    document.querySelectorAll('[data-refresh]').forEach(card => {
        card.addEventListener('click', () => sync([card.dataset.refresh]));
    });
});

function initTheme() {
    if (localStorage.getItem('theme') === 'light') document.documentElement.classList.remove('dark');
    d.themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}

function initAlert() {
    alertEnabled = localStorage.getItem('alert_on') === 'true';
    d.reminderMinutes.value = localStorage.getItem('alert_mins') || '3';
    d.audioUrlInput.value = localStorage.getItem('alert_audio') || 'https://myinstants.com/media/sounds/epic.mp3';

    preloadAudio(d.audioUrlInput.value);
    updateToggleUI();

    d.alertToggleBtn.addEventListener('click', () => {
        alertEnabled = !alertEnabled;
        updateToggleUI();
    });

    d.alertSettingsBtn.addEventListener('click', () => d.alertSettingsModal.classList.remove('hidden'));
    d.reminderMinutes.addEventListener('input', (e) => e.target.value = e.target.value.replace(/\D/g, ''));

    d.closeAlertSettingsBtn.addEventListener('click', () => {
        let mins = parseInt(d.reminderMinutes.value) || 3;
        mins = Math.max(1, Math.min(30, mins));
        d.reminderMinutes.value = mins;

        localStorage.setItem('alert_on', alertEnabled);
        localStorage.setItem('alert_mins', mins);
        localStorage.setItem('alert_audio', d.audioUrlInput.value);

        preloadAudio(d.audioUrlInput.value);
        d.alertSettingsModal.classList.add('hidden');
    });
}

function preloadAudio(url) {
    audio.pause();
    audio = new Audio(url);
    audio.preload = 'auto';
    audio.load();
}

function updateToggleUI() {
    d.alertToggleBtn.textContent = alertEnabled ? 'Enabled' : 'Disabled';
    d.alertToggleBtn.className = `font-mono text-xs px-4 py-2 rounded font-bold tracking-widest transition-colors ${alertEnabled ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-500'
        }`;
}

function loadCfg() {
    const saved = localStorage.getItem('h_cfg');
    if (saved) {
        cfg = JSON.parse(saved);
        d.userDisplayName.textContent = d.usernameInput.value = cfg.username;
        d.apiKeyInput.value = cfg.apiKey;
        d.targetInput.value = cfg.targetHours;
        d.userProfile.classList.remove('opacity-40');
        sync(['actual', 'streak', 'heartbeat', 'potential']);
    }
    if (localStorage.getItem("alert_on") == "true") d.setupModal.classList.remove('hidden');
}

d.saveconfigBtn.addEventListener('click', () => {
    const u = d.usernameInput.value.trim();
    const k = d.apiKeyInput.value.trim();
    const t = parseFloat(d.targetInput.value) || 2.0;
    if (!u || !k) return alert('Configuration payload empty.');

    cfg = { username: u, apiKey: k, targetHours: t };
    localStorage.setItem('h_cfg', JSON.stringify(cfg));
    d.setupModal.classList.add('hidden');
    d.userDisplayName.textContent = u;
    d.userProfile.classList.remove('opacity-40');
    sync(['actual', 'streak', 'heartbeat', 'potential']);
});

d.logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('h_cfg');
    window.location.reload();
});

function updateClock() {
    const now = new Date();
    d.localClock.textContent = now.toLocaleTimeString();
    const curHr = now.getHours();
    if (curHr === 0 && lastHr !== 0) {
        startTimestamp = null;
        sync(['actual', 'streak', 'heartbeat', 'potential']);
    }
    lastHr = curHr;
}

async function sync(types) {
    if (!cfg.apiKey || !cfg.username) return;
    const headers = { 'Authorization': `Bearer ${cfg.apiKey}` };

    const routes = {
        actual: {
            url: `https://hackatime.hackclub.com/api/hackatime/v1/users/${cfg.username}/statusbar/today`,
            el: d.actualTimeDisplay,
            fn: (json) => { actualTotalSeconds = json?.data?.grand_total?.total_seconds || 0; }
        },
        streak: {
            url: `https://hackatime.hackclub.com/api/v1/users/${cfg.username}/stats?features=languages`,
            el: d.streakDisplay,
            fn: (json) => {
                const s = json?.data?.streak || 0;
                d.streakDisplay.textContent = `${s} day${s === 1 ? '' : 's'}`;
            }
        },
        heartbeat: {
            url: 'https://hackatime.hackclub.com/api/v1/my/heartbeats/most_recent',
            el: d.timeAgoDisplay,
            fn: (json) => {
                if (json?.has_heartbeat && json.heartbeat) {
                    const incoming = json.heartbeat.time;
                    if (lastHeartbeatTime && incoming > lastHeartbeatTime) {
                        lastHeartbeatTime = incoming;
                        sync(['actual']);
                    } else {
                        lastHeartbeatTime = incoming;
                    }
                }
            }
        },
        potential: {
            url: 'https://hackatime.hackclub.com/api/v1/my/heartbeats',
            el: d.potentialTimeDisplay,
            fn: (json) => {
                if (json.heartbeats?.length > 0) {
                    startTimestamp = json.heartbeats[0].time;
                    const dateObj = new Date(startTimestamp * 1000);
                    d.sessionStartDisplay.textContent = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                }
            }
        }
    };

    types.forEach(async (t) => {
        const r = routes[t];
        if (!r || locks[t]) return;

        locks[t] = true;
        r.el.classList.add('opacity-30');
        r.el.classList.remove('opacity-100');

        try {
            const res = await fetch(r.url, { headers });
            if (res.ok) r.fn(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            r.el.classList.add('opacity-100');
            r.el.classList.remove('opacity-30');
            setTimeout(() => locks[t] = false, 1000);
        }
    });
}

function calc() {
    const now = Date.now() / 1000;

    if (lastHeartbeatTime) {
        const diff = Math.max(0, now - lastHeartbeatTime);
        d.timeAgoDisplay.textContent = fmtAgo(diff);

        const limit = (parseInt(d.reminderMinutes.value) || 3) * 60;
        if (alertEnabled && diff > limit) {
            d.alertBanner.classList.remove('hidden');
            d.flashContainer.classList.toggle('bg-red-500/5', Math.floor(Date.now() / 500) % 2 === 0);
            audio.play().catch(() => { });
        } else {
            d.alertBanner.classList.add('hidden');
            d.flashContainer.classList.remove('bg-red-500/5');
            audio.pause();
            audio.currentTime = 0;
        }
    } else {
        d.timeAgoDisplay.textContent = 'never';
    }

    d.actualTimeDisplay.textContent = fmtDur(actualTotalSeconds);
    d.potentialTimeDisplay.textContent = startTimestamp ? fmtDur(Math.max(0, now - startTimestamp)) : fmtDur(0);

    const target = cfg.targetHours * 3600;
    const pct = target > 0 ? Math.min(500, (actualTotalSeconds / target) * 100) : 0;
    d.progressBar.style.width = `${Math.min(100, pct)}%`;
    d.progressText.textContent = `${pct.toFixed(1)}% (${fmtDur(actualTotalSeconds)} / ${cfg.targetHours}h Target)`;
}

function fmtAgo(s) {
    if (s < 5) return '00:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function fmtDur(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}