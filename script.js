let cfg = { username: '', apiKey: '', targetHours: 2.0 };
let startTimestamp = null, actualTotalSeconds = 0, lastHeartbeatTime = null;

const locks = { actual: false, streak: false, heartbeat: false, potential: false };
let lastHr = new Date().getHours();
let alertEnabled = false;
let timeModeLost = false;
let audio = new Audio();

const el = (id) => document.getElementById(id);
const selectors = [
    'setupModal', 'saveconfigBtn',
    'alertSettingsModal', 'alertSettingsBtn', 'closeAlertSettingsBtn', 'alertToggleBtn',
    'userProfile', 'userDisplayName', 'streakDisplay', 'logoutBtn', 'localClock',
    'themeToggle', 'flashContainer', 'alertBanner', 'reminderMinutes', 'audioUrlInput',
    'timeAgoDisplay', 'actualTimeDisplay', 'potentialTimeDisplay', 'progressBar', 'progressText', 'sessionStartDisplay', 'infoModal', 'closeInfoBtn', 'infoOpenBtn', 'potential', 'potentialH', 'hacking', 'global_rank', 'local_rank', 'userPfp'
];
const d = {};
selectors.forEach(s => d[s] = el(s));

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    handleOauth();
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

async function handleOauth() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const key = params.get('key');
    const usnm = params.get('username');
    const uid = params.get('uid');

    if (!accessToken || !usnm) return;

    try {
        cfg = {
            username: usnm,
            apiKey: accessToken,
            uid,
            apiOpKey: key,
            targetHours: 2.0,
            meta: null
        };

        localStorage.setItem('h_cfg', JSON.stringify(cfg));
        d.setupModal.classList.add('hidden');

        history.replaceState(null, document.title, window.location.pathname);
        loadCfg();
    } catch (err) {
        console.error('Authentication configuration cycle error:', err);
    }
}

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
    timeModeLost = localStorage.getItem('time_mode') === 'true';

    preloadAudio(d.audioUrlInput.value);
    updateToggleUI();

    d.alertToggleBtn.addEventListener('click', () => {
        alertEnabled = !alertEnabled;
        updateToggleUI();
    });

    d.infoOpenBtn.addEventListener('click', () => d.infoModal.classList.remove('hidden'));
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

    d.closeInfoBtn.addEventListener('click', () => d.infoModal.classList.add('hidden'));

    d.potential.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        timeModeLost = !timeModeLost;
        localStorage.setItem("time_mode", timeModeLost);
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
    d.alertToggleBtn.className = `font-mono text-xs px-4 py-2 rounded font-bold tracking-widest transition-colors ${alertEnabled ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-500'}`;
}

function loadCfg() {
    const saved = localStorage.getItem('h_cfg');
    if (saved) {
        cfg = JSON.parse(saved);
        d.userDisplayName.textContent = cfg.meta?.name || cfg.username;
        d.userDisplayName.href = cfg.meta?.url || "#";
        d.userProfile.classList.remove('opacity-40');
        if (cfg.username.trim() !== "") {
            d.setupModal.classList.add('hidden');
            sync(['actual', 'streak', 'heartbeat', 'potential']);
            function syncHackers() {
                fetch("https://hackatime.hackclub.com/api/v1/currently_hacking").then(r => r.json()).then(data => { d.hacking.textContent = data.count });
            }
            function syncLeaderboard() {
                fetch("https://api.alimad.co/beat/leaderboard?uid=" + cfg.uid).then(r => r.json()).then(data => {
                    d.global_rank.textContent = "#" + data.global_rank;
                    d.local_rank.textContent = "#" + data.local_rank;
                    cfg.meta = {
                        name: data.name,
                        pfp: data.pfp,
                        url: data.link
                    }
                    d.userDisplayName.textContent = cfg.meta?.name || cfg.username;
                    d.userDisplayName.href = cfg.meta?.url || "#";
                    if (data.pfp && data.pfp.startsWith("https://")) {
                        d.userPfp.src = data.pfp;
                        d.userPfp.classList.toggle("hidden", false);
                    }
                });
            }
            syncHackers();
            syncLeaderboard();
            setTimeout(syncLeaderboard, 2 * 60 * 1000);
            setTimeout(syncHackers, 30 * 1000);
        }
    } else {
        d.setupModal.classList.remove('hidden');
    }
}

d.saveconfigBtn.addEventListener('click', () => {
    if (cfg.apiKey && cfg.username) {
        d.setupModal.classList.add('hidden');
        return;
    }
    const CLIENT_ID = 'XeZSxRcmM3D5SR_437caoQUvmPFc2xkg18ce6Wk9Y7E';
    const REDIRECT_URI = encodeURIComponent('https://api.alimad.co/auth/hackatime/callback');
    localStorage.setItem('h_cfg', JSON.stringify({ username: '', apiKey: '', targetHours: 2.0 }));
    window.location.href = `https://hackatime.hackclub.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=profile+read`;
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
    const standardHeaders = { 'Authorization': `Bearer ${cfg.apiKey}` };
    const operationalHeaders = cfg.apiOpKey ? { 'Authorization': `Bearer ${cfg.apiOpKey}` } : standardHeaders;

    const routes = {
        actual: {
            url: `https://hackatime.hackclub.com/api/hackatime/v1/users/current/statusbar/today`,
            el: d.actualTimeDisplay,
            headers: operationalHeaders,
            fn: (json) => {
                actualTotalSeconds = json?.data?.grand_total?.total_seconds || 0;

                const textStr = json?.data?.grand_total?.text || "";
                const match = textStr.match(/(\d+(?:\.\d+)?)\s*h\s+goal/i);
                if (match && match[1]) {
                    cfg.targetHours = parseFloat(match[1]);
                    localStorage.setItem('h_cfg', JSON.stringify(cfg));
                } else if (json?.data?.goal?.target_seconds) {
                    cfg.targetHours = json.data.goal.target_seconds / 3600;
                    localStorage.setItem('h_cfg', JSON.stringify(cfg));
                }
            }
        },
        streak: {
            url: `https://hackatime.hackclub.com/api/v1/authenticated/streak`,
            el: d.streakDisplay,
            headers: standardHeaders,
            fn: (json) => {
                const s = json?.streak_days || 0;
                d.streakDisplay.textContent = `${s}`;
                el("st-s").textContent = s === 1 ? '' : 's';
            }
        },
        heartbeat: {
            url: 'https://hackatime.hackclub.com/api/v1/authenticated/heartbeats/latest',
            el: d.timeAgoDisplay,
            headers: standardHeaders,
            fn: (json) => {
                if (json?.time) {
                    const incoming = json.time;
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
            headers: operationalHeaders,
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
            const res = await fetch(r.url, { headers: r.headers });
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

    if (startTimestamp) {
        const totalPossibleSeconds = Math.max(0, now - startTimestamp);
        if (timeModeLost) {
            const lostSeconds = Math.max(0, totalPossibleSeconds - actualTotalSeconds);
            d.potentialTimeDisplay.textContent = fmtDur(lostSeconds);
            d.potential.title = "amount of time spent not coding since you started coding today";
            d.potentialH.textContent = "Time Lost";
        } else {
            d.potentialTimeDisplay.textContent = fmtDur(totalPossibleSeconds);
            d.potential.title = "amount of time you could have tracked if you had been coding continuously since you started, today. right click to change mode";
            d.potentialH.textContent = "Since Started";
        }
    } else {
        d.potentialTimeDisplay.textContent = fmtDur(0);
    }

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