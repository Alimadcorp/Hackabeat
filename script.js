let cfg = { username: '', authToken: '', targetHours: 2.0 };
let startTimestamp = null, actualTotalSeconds = 0, lastHeartbeatTime = null;

const locks = { actual: false, streak: false, heartbeat: false, potential: false, lb: false };
let lastHr = new Date().getHours();
let alertEnabled = false;
let timeModeLost = false;
let audio = new Audio();

let alarming_situation = false;

const getCoding = ["Get coding vro -_-", "BROOOO GET CODING", "Stop procrastinating", "Be like Sabio Tang, your code shall exist more than you do", "Nah bro dont give up already :<", "That's what she said", "RRRRRRRAAAAAAHHHHHHHH GET U SELF CODING OR ELSE :rick-astley-gun:", "Uhhhh get coding :P", "If u code for 30 more minutes I'll ask you to code for another 30"];

const el = (id) => document.getElementById(id);
const selectors = [
    'setupModal', 'saveconfigBtn',
    'alertSettingsModal', 'alertSettingsBtn', 'closeAlertSettingsBtn', 'alertToggleBtn',
    'userProfile', 'userDisplayName', 'streakDisplay', 'logoutBtn', 'localClock',
    'themeToggle', 'flashContainer', 'alertBanner', 'reminderMinutes', 'audioUrlInput',
    'timeAgoDisplay', 'actualTimeDisplay', 'potentialTimeDisplay', 'progressBar', 'progressText', 'sessionStartDisplay', 'infoModal', 'closeInfoBtn', 'infoOpenBtn', 'potential', 'potentialH', 'hacking', 'global_rank', 'local_rank', 'userPfp',
    'dismiss', 'alertText', "live"
];
const d = {};
selectors.forEach(s => d[s] = el(s));

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    handleOauth();
    loadCfg();
    initAlert();
    lucide.createIcons();
    localStorage.setItem("dismissed", false);
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
    let key = "";
    if (!accessToken) {
        const apiKeyRes = await fetch('https://hackatime.hackclub.com/api/v1/authenticated/api_keys', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!apiKeyRes.ok) throw new Error('Failed to retrieve operational api key');
        key = (await apiKeyRes.json()).token;
    }
    const usnm = params.get('username');
    const uid = params.get('uid');

    if (!accessToken || !usnm || !key) { cfg = { username: '', authToken: '', targetHours: 2.0 }; localStorage.setItem("h_cfg", JSON.stringify(cfg)); return; }

    try {
        cfg = {
            username: usnm,
            authToken: accessToken,
            uid,
            oauthToken: key,
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

    d.dismiss.addEventListener("click", () => {
        localStorage.setItem("dismissed", true);
        d.alertBanner.classList.add('hidden');
        audio.pause();
    })

    d.closeInfoBtn.addEventListener('click', () => d.infoModal.classList.add('hidden'));

    d.potential.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        timeModeLost = !timeModeLost;
        localStorage.setItem("time_mode", timeModeLost);
    });
    if (localStorage.getItem("alert_on") !== "true") return;
    const alertEl = el("interaction-alert");
    alertEl.classList.remove("hidden");
    alertEl.classList.add("flex");

    const dismiss = () => {
        alertEl.style.opacity = "0";
        setTimeout(() => alertEl.remove(), 300);
        window.removeEventListener("click", dismiss, true);
        window.removeEventListener("keydown", dismiss, true);
        window.removeEventListener("touchstart", dismiss, true);
    };
    window.addEventListener("click", dismiss, true);
    window.addEventListener("keydown", dismiss, true);
    window.addEventListener("touchstart", dismiss, true);

    el("enable-sound")?.addEventListener("click", (e) => {
        e.stopPropagation();
        dismiss();
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

function syncHackers() {
    fetch("https://hackatime.hackclub.com/api/v1/currently_hacking").then(r => r.json()).then(data => { d.hacking.textContent = data.count });
}

function syncLive() {
    fetch("https://live.alimad.co/ping?app=beat.alimad.co").then(r => r.text()).then(n => d.live.textContent = n);
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
            sync(['actual', 'streak', 'heartbeat', 'potential', 'lb']);
            syncLive();
            syncHackers();
            setTimeout(() => sync(['lb']), 2 * 60 * 1000);
            setTimeout(syncHackers, 30 * 1000);
            setTimeout(syncLive, 15 * 1000);
        }
    } else {
        d.setupModal.classList.remove('hidden');
    }
}

d.saveconfigBtn.addEventListener('click', () => {
    if (cfg.authToken && cfg.username) {
        d.setupModal.classList.add('hidden');
        return;
    }
    const CLIENT_ID = 'XeZSxRcmM3D5SR_437caoQUvmPFc2xkg18ce6Wk9Y7E';
    const REDIRECT_URI = encodeURIComponent('https://api.alimad.co/auth/hackatime/callback');
    localStorage.setItem('h_cfg', JSON.stringify({ username: '', authToken: '', targetHours: 2.0 }));
    window.location.href = `https://hackatime.hackclub.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=profile+read`;
});

d.logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('h_cfg');
    window.location.reload();
});

function updateClock() {
    const now = new Date();
    d.localClock.textContent = now.toLocaleTimeString([], { hour12: false });
    const curHr = now.getHours();
    if (curHr === 0 && lastHr !== 0) {
        startTimestamp = null;
        sync(['actual', 'streak', 'heartbeat', 'potential', 'lb']);
    }
    lastHr = curHr;
}

async function sync(types) {
    if (!cfg.authToken || !cfg.username) return;
    const standardHeaders = { 'Authorization': `Bearer ${cfg.authToken}` };
    const operationalHeaders = cfg.oauthToken ? { 'Authorization': `Bearer ${cfg.oauthToken}` } : standardHeaders;

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
                        localStorage.setItem("dismissed", false);
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
                    d.sessionStartDisplay.textContent = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                }
            }
        },
        lb: {
            url: "https://api.alimad.co/beat/leaderboard?uid=" + cfg.uid,
            el: d.global_rank,
            headers: {},
            fn: (dats) => {
                d.local_rank.classList.add('opacity-30');
                d.local_rank.classList.remove('opacity-100');

                d.global_rank.textContent = "#" + dats.global_rank;
                d.local_rank.textContent = "#" + dats.local_rank;
                cfg.meta = {
                    name: dats.name,
                    pfp: dats.pfp,
                    url: dats.link
                };
                d.userDisplayName.textContent = cfg.meta?.name || cfg.username;
                d.userDisplayName.href = cfg.meta?.url || "#";
                if (dats.pfp && dats.pfp.startsWith("https://")) {
                    d.userPfp.src = dats.pfp;
                    d.userPfp.classList.toggle("hidden", false);
                }
                function styleRank(element, rank, isGlobal) {
                    const r = parseInt(rank);
                    element.className = isGlobal ? "text-2xl sm:text-3xl font-bold mt-1" : "text-zinc-900 dark:text-zinc-100";
                    element.style.cssText = "";
                    if (r === 1) { element.style.cssText = "color: #facc15;" }
                    else if (r <= 10) { element.style.cssText = "color: #22d3ee;" }
                    else if (r <= 50) { element.style.cssText = "color: #34d399;" }
                    else { element.classList.add(isGlobal ? 'text-zinc-800' : 'text-zinc-900', 'dark:text-zinc-200') }
                }
                styleRank(d.global_rank, dats.global_rank, true);
                styleRank(d.local_rank, dats.local_rank, false);
                d.local_rank.classList.add('opacity-100');
                d.local_rank.classList.remove('opacity-30');
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
            setTimeout(() => locks[t] = false, 2000);
        }
    });
}

function calc() {
    const now = Date.now() / 1000;

    if (lastHeartbeatTime) {
        const diff = Math.max(0, now - lastHeartbeatTime);
        d.timeAgoDisplay.textContent = fmtAgo(diff);

        const limit = (parseInt(d.reminderMinutes.value) || 3) * 60;
        if (alertEnabled && diff > limit && localStorage.getItem("dismissed") !== "true") {
            if (!alarming_situation) {
                d.alertText.textContent = getCoding[Math.floor(Math.random() * getCoding.length)];
                alarming_situation = true;
            }
            d.alertBanner.classList.remove('hidden');
            d.flashContainer.classList.toggle('bg-red-500/50', Math.floor(Date.now() / 500) % 2 === 0);
            audio.play().catch(() => { });
        } else {
            alarming_situation = false;
            d.alertBanner.classList.add('hidden');
            d.flashContainer.classList.remove('bg-red-500/50');
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
    const pct = target > 0 ? Math.min(99999999, (actualTotalSeconds / target) * 100) : 0;
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