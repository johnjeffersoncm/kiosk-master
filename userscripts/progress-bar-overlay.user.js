// ==UserScript==
// @name         Kiosk UI Overlay
// @namespace    http://violentmonkey.net/
// @version      2.6
// @description  Viewport-locked UI (vh/vw) immune to page zoom. Clickable bars, countdown timer, safe React injection & Kamikaze kill.
// @author       John Jefferson
// @match        http://*/*
// @match        https://*/*
// @updateURL    https://github.com/johnjeffersoncm/kiosk-master/raw/refs/heads/main/userscripts/progress-bar-overlay.user.js
// @downloadURL  https://github.com/johnjeffersoncm/kiosk-master/raw/refs/heads/main/userscripts/progress-bar-overlay.user.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 1. IMMEDIATE CAPTURE
    const urlInicial = window.location.href;
    let match = urlInicial.match(/kiosk_idx=(\d+)&kiosk_tot=(\d+)&kiosk_time=(\d+)/);

    if (!match) return; // Exit if it's not a Kiosk managed tab

    let currentIndex = parseInt(match[1]);
    let totalRotas = parseInt(match[2]);
    let tempoSegundos = parseInt(match[3]);
    let internalTimer = tempoSegundos;
    let isPausedLocally = false;
    let lastSyncTime = Date.now(); // Track when the tab was created

    // Clean URL to avoid polluting navigation history
    try {
        let cleanUrl = window.location.href.replace(match[0], '').replace(/#$/, '').replace(/&$/, '');
        history.replaceState(null, null, cleanUrl);
    } catch(e) {}

    // ==============================================================
    // F12 HIJACKING (Log Capture to Master)
    // ==============================================================
    let bc_slave = null;
    try { if ('BroadcastChannel' in window) bc_slave = new BroadcastChannel('kiosk_channel'); } catch(e){}

    function enviarLogProMestre(msg, level) {
        const payload = { type: 'kiosk_f12_capture', msg: msg, level: level };
        try { if (window.opener) window.opener.postMessage(payload, '*'); } catch(e){}
        if (bc_slave) { try { bc_slave.postMessage(payload); } catch(e){} }
    }

    // Intercept standard console functions
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.log = function() { enviarLogProMestre(Array.from(arguments).join(' '), 'info'); originalConsoleLog.apply(console, arguments); };
    console.error = function() { enviarLogProMestre(Array.from(arguments).join(' '), 'error'); originalConsoleError.apply(console, arguments); };
    console.warn = function() { enviarLogProMestre(Array.from(arguments).join(' '), 'warn'); originalConsoleWarn.apply(console, arguments); };

    // Catch fatal JS errors
    window.onerror = function(message, source, lineno) {
        enviarLogProMestre(`Fatal JS Error: ${message} (Line ${lineno})`, 'error');
        return false;
    };

    // Catch Unhandled Promises
    window.addEventListener('unhandledrejection', function(event) {
        enviarLogProMestre(`Unhandled Promise Rejection: ${event.reason}`, 'error');
    });

    // Catch Resource loading errors (Images/Scripts returning 404, etc)
    // Note: CSP blocks and Browser core interventions are hidden from JS by design and won't trigger this.
    window.addEventListener('error', function(event) {
        if (event.target && (event.target.src || event.target.href)) {
            enviarLogProMestre(`Resource Load Error: Failed to load ${event.target.src || event.target.href}`, 'warn');
        }
    }, true);

    enviarLogProMestre(`Tab initialized via Master. Designated time: ${tempoSegundos}s`, 'info');

    // ==============================================================
    // UI INJECTION AND TIMING (Viewport Units vw/vh)
    // ==============================================================
    let now = new Date();
    let initialTime = now.toLocaleTimeString('pt-BR');
    let initialDate = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

    let topContainer = null;
    let bottomWidget = null;
    let activeFillElement = null;
    let timerTextElement = null;
    let btnPauseElement = null;

    function construirUI() {
        if (topContainer) return;

        topContainer = document.createElement('div');
        topContainer.id = 'kiosk-top-container';

        // STRICT CSS ISOLATION & VIEWPORT SCALING
        // Converted all px and rem units to vh (Viewport Height) and vw (Viewport Width)
        const style = document.createElement('style');
        style.innerHTML = `
            #kiosk-top-container { all: initial; position: fixed; top: 0; left: 0; width: 100vw; z-index: 2147483647; pointer-events: none; display: flex; flex-direction: column; align-items: center; font-family: system-ui, -apple-system, sans-serif !important; }
            #kiosk-bars-wrapper { all: unset; width: 100vw; display: flex; gap: 0.4vw; padding: 0.8vh 0.5vw 2.5vh 0.5vw; box-sizing: border-box; background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%); pointer-events: auto; }
            .kiosk-bar-bg { flex: 1; height: 2vh; background: rgba(255,255,255,0.2); border-radius: 0.4vh; overflow: hidden; position: relative; cursor: pointer; transition: background 0.2s; box-sizing: border-box; }
            .kiosk-bar-bg:hover { transform: scale(1.05); background: rgba(255,255,255,0.4); }
            .kiosk-bar-fill { position: absolute; left: 0; top: 0; bottom: 0; background: #00E676; width: 0%; box-shadow: 0 0 0.8vh rgba(0,255,0,0.6); z-index: 1; pointer-events: none; }
            .kiosk-bar-text { position: absolute; left: 0; top: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; z-index: 2; font-size: 2vh !important; font-weight: bold; font-family: monospace !important; color: #ffffff; text-shadow: 0 0.1vh 0.3vh rgba(0,0,0,0.9); pointer-events: none; line-height: 1 !important; }
            #kiosk-pause-widget:hover { transform: scale(1.6);} #kiosk-pause-widget { margin-top: -1.4vh; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(0.4vh); border-radius: 2vh; padding: 0.4vh 1.5vw; display: flex; align-items: center; justify-content: center; pointer-events: auto; box-shadow: 0 0.2vh 1vh rgba(0,0,0,0.3); border: 0.1vh solid rgba(255,255,255,0.1); }
            #kw-btn-pause { all: unset; background: transparent; border: none; color: #fff; cursor: pointer; font-size: 1.6vh !important; padding: 0; transition: transform 0.2s; text-shadow: 0 0.1vh 0.3vh rgba(0,0,0,0.5); line-height: 1 !important; display: block; }
            #kw-btn-pause:hover { transform: scale(1.4); color: #00D1FF; }
            #kw-btn-pause.is-paused { color: #FF9800; }
            #kiosk-bottom-widget { all: initial; position: fixed; width: 20vh; height: 7vh; bottom: 0vh; right: 0vw; z-index: 2147483647; background: rgba(0, 15, 40, 0.85); backdrop-filter: blur(0.6vh); color: #00D1FF; padding: 1vh 1vw; border-radius: 1vh; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: 'Segoe UI', Tahoma, sans-serif !important; box-shadow: 0 0 2vh rgba(0, 100, 255, 0.4); border: 0.1vh solid rgba(0, 200, 255, 0.4); pointer-events: none; box-sizing: border-box; }
            .kw-time { font-size: 4vh !important; font-weight: 800 !important; letter-spacing: 0.1vw !important; line-height: 1 !important; font-variant-numeric: tabular-nums; text-shadow: 0 0 1vh rgba(0, 209, 255, 0.7); display: block; }
            .kw-date { font-size: 2.2vh !important; color: #80E5FF; margin-top: 0.4vh; font-weight: 600 !important; opacity: 0.9; display: block; line-height: 1 !important; }
        `;
        topContainer.appendChild(style);

        let barWrapper = document.createElement('div');
        barWrapper.id = 'kiosk-bars-wrapper';

        for (let i = 0; i < totalRotas; i++) {
            let bg = document.createElement('div'); bg.className = 'kiosk-bar-bg';

            // FEATURE: Make bar clickable to jump to specific site index
            bg.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                enviarLogProMestre(`User clicked bar index ${i}. Requesting jump.`, 'info');
                const p = { type: 'kiosk_action', action: 'jump_to', targetIndex: i };
                try { if (window.opener) window.opener.postMessage(p, '*'); } catch(err) {}
                if (bc_slave) { try { bc_slave.postMessage(p); } catch(err){} }
            });

            let fill = document.createElement('div'); fill.className = 'kiosk-bar-fill';
            let timerText = document.createElement('div'); timerText.className = 'kiosk-bar-text';

            if (i < currentIndex) {
                fill.style.width = '100%';
            } else if (i === currentIndex) {
                // Compensate elapsed load time
                let elapsedSinceStart = (Date.now() - lastSyncTime) / 1000;
                let remainingEffective = Math.max(0, tempoSegundos - elapsedSinceStart);

                fill.style.transition = `width ${remainingEffective}s linear`;
                activeFillElement = fill;
                timerText.id = 'kw-countdown';
                timerText.innerText = internalTimer + 's';
                timerTextElement = timerText;

                setTimeout(() => { fill.style.width = '100%'; }, 50);
            }
            bg.appendChild(fill);
            bg.appendChild(timerText);
            barWrapper.appendChild(bg);
        }

        let pauseWidget = document.createElement('div');
        pauseWidget.id = 'kiosk-pause-widget';
        pauseWidget.innerHTML = `<button id="kw-btn-pause">⏸</button>`;
        btnPauseElement = pauseWidget.querySelector('#kw-btn-pause');

        topContainer.appendChild(barWrapper);
        topContainer.appendChild(pauseWidget);

        bottomWidget = document.createElement('div');
        bottomWidget.id = 'kiosk-bottom-widget';
        bottomWidget.innerHTML = `<span class="kw-time" id="kw-time">${initialTime}</span><span class="kw-date" id="kw-date">${initialDate}</span>`;

        configurarEventos();
    }

    function atualizarPausaVisual() {
        if (isPausedLocally) {
            btnPauseElement.innerText = '▶';
            btnPauseElement.classList.add('is-paused');
            if (activeFillElement) {
                let currentWidth = window.getComputedStyle(activeFillElement).width;
                activeFillElement.style.transition = 'none';
                activeFillElement.style.width = currentWidth;
            }
        } else {
            btnPauseElement.innerText = '⏸';
            btnPauseElement.classList.remove('is-paused');
            if (activeFillElement) {
                activeFillElement.style.transition = `width ${internalTimer}s linear`;
                activeFillElement.style.width = '100%';
            }
        }
    }

    function configurarEventos() {
        setInterval(() => {
            let now = new Date();
            let elTime = document.getElementById('kw-time');
            let elDate = document.getElementById('kw-date');
            if(elTime) elTime.innerText = now.toLocaleTimeString('pt-BR');
            if(elDate) elDate.innerText = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        }, 1000);

        btnPauseElement.addEventListener('click', (e) => {
            isPausedLocally = !isPausedLocally;
            atualizarPausaVisual();
            const p = { type: 'kiosk_action', action: 'toggle_pause' };
            try { if (window.opener) window.opener.postMessage(p, '*'); } catch(err) {}
            if (bc_slave) { try { bc_slave.postMessage(p); } catch(e){} }
        });

        window.addEventListener('message', (e) => {
            if (e.data && e.data.type === 'kiosk_sync') {
                lastSyncTime = Date.now(); // Reset watchdog
                internalTimer = e.data.time;
                if (timerTextElement) timerTextElement.innerText = internalTimer + 's';
                if (e.data.paused !== isPausedLocally) {
                    isPausedLocally = e.data.paused;
                    atualizarPausaVisual();
                }
            }
        });

        if (bc_slave) {
            bc_slave.onmessage = function(e) {
                if (e.data && e.data.type === 'kiosk_sync') {
                    lastSyncTime = Date.now(); internalTimer = e.data.time;
                    if (timerTextElement) timerTextElement.innerText = internalTimer + 's';
                    if (e.data.paused !== isPausedLocally) { isPausedLocally = e.data.paused; atualizarPausaVisual(); }
                }
            }
        }
    }

    // TIMING LOGIC (Fast takeover if Master disconnects)
    setInterval(() => {
        let isOrphan = (Date.now() - lastSyncTime) > 800;

        if (isOrphan && !isPausedLocally && internalTimer > 0) {
            internalTimer--;
            if (timerTextElement) timerTextElement.innerText = internalTimer + 's';
        }
    }, 1000);

    // Kamikaze Trigger
    let kamikazeTrigger = setInterval(() => {
        let isOrphan = (Date.now() - lastSyncTime) > 800;
        if (isOrphan && internalTimer <= 0) {
            enviarLogProMestre("Zero limit reached + Orphan state. Auto-closing tab.", "warn");
            clearInterval(kamikazeTrigger);
            try { window.close(); } catch(err) {}
        }
    }, 200);

    // Watchdog to ensure UI injection with SPA delayed rendering safety
    const isOutlook = window.location.hostname.includes('outlook.office.com');
    const injectionDelay = isOutlook ? 2500 : 0; // Delay UI by 2.5s only on Outlook to prevent React conflicts

    setTimeout(() => {
        setInterval(() => {
            if (!document.body) return;
            if (!topContainer) {
                try {
                    construirUI();
                    document.body.appendChild(topContainer);
                    document.body.appendChild(bottomWidget);
                } catch(e) { enviarLogProMestre(`UI Render Error: ${e.message}`, "error"); }
            }
            else if (!document.getElementById('kiosk-top-container')) {
                try { document.body.appendChild(topContainer); } catch(e){}
            }
        }, 500);
    }, injectionDelay);

})();
