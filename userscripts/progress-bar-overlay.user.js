// ==UserScript==
// @name         Kiosk UI Overlay
// @namespace    http://violentmonkey.net/
// @version      2.2
// @description  Clickable progress bars (jump to specific site), countdown timer, clock, robust F12 interception including resource errors.
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
    // UI INJECTION AND TIMING
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

        const style = document.createElement('style');
        style.innerHTML = `
            #kiosk-top-container { position: fixed; top: 0; left: 0; width: 100%; z-index: 2147483647; pointer-events: none; display: flex; flex-direction: column; align-items: center; }
            #kiosk-bars-wrapper { width: 100%; display: flex; gap: 6px; padding: 8px 8px 25px 8px; box-sizing: border-box; background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%); pointer-events: auto; }
            .kiosk-bar-bg { flex: 1; height: 10px; background: rgba(255,255,255,0.2); border-radius: 4px; overflow: hidden; position: relative; cursor: pointer; transition: background 0.2s; }
            .kiosk-bar-bg:hover { background: rgba(255,255,255,0.4); }
            .kiosk-bar-fill { position: absolute; left: 0; top: 0; bottom: 0; background: #00E676; width: 0%; box-shadow: 0 0 8px rgba(0,255,0,0.6); z-index: 1; pointer-events: none; }
            .kiosk-bar-text { position: absolute; left: 0; top: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; z-index: 2; font-size: 0.85rem; font-weight: bold; font-family: monospace; color: #ffffff; text-shadow: 0px 1px 3px rgba(0,0,0,0.9); pointer-events: none; }
            #kiosk-pause-widget { margin-top: -15px; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); border-radius: 20px; padding: 4px 20px; display: flex; align-items: center; justify-content: center; pointer-events: auto; box-shadow: 0 2px 10px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); }
            #kw-btn-pause { background: transparent; border: none; color: #fff; cursor: pointer; font-size: 1.1rem; padding: 0; transition: transform 0.2s; text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
            #kw-btn-pause:hover { transform: scale(1.2); color: #00D1FF; }
            #kw-btn-pause.is-paused { color: #FF9800; }
            #kiosk-bottom-widget { position: fixed; bottom: 10px; right: 10px; z-index: 2147483647; background: rgba(0, 15, 40, 0.85); backdrop-filter: blur(6px); color: #00D1FF; padding: 10px 18px; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: 'Segoe UI', Tahoma, sans-serif; box-shadow: 0 0 20px rgba(0, 100, 255, 0.4); border: 1px solid rgba(0, 200, 255, 0.4); pointer-events: none; }
            .kw-time { font-size: 1.4rem; font-weight: 800; letter-spacing: 1px; line-height: 1; font-variant-numeric: tabular-nums; text-shadow: 0 0 10px rgba(0, 209, 255, 0.7); }
            .kw-date { font-size: 0.8rem; color: #80E5FF; margin-top: 4px; font-weight: 600; opacity: 0.9; }
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
        bottomWidget.innerHTML = `<div class="kw-time" id="kw-time">${initialTime}</div><div class="kw-date" id="kw-date">${initialDate}</div>`;

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

    // Watchdog to ensure UI injection
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

})();
