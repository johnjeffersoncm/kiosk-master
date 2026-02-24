// ==UserScript==
// @name         Kiosk UI Overlay (Widget Discreto & Barras)
// @namespace    http://violentmonkey.net/
// @version      1.4
// @description  Barras Instagram com timer interno, Pause centralizado e Relógio com segundos.
// @author       John Jefferson
// @match        http://*/*
// @match        https://*/*
// @updateURL    https://raw.githubusercontent.com/johnjeffersoncm/kiosk-master/main/userscripts/progress-bar-overlay.user.js
// @downloadURL  https://raw.githubusercontent.com/johnjeffersoncm/kiosk-master/main/userscripts/progress-bar-overlay.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // 1. LÊ INSTRUÇÕES DA URL
    let hash = window.location.hash;
    let match = hash.match(/kiosk_idx=(\d+)&kiosk_tot=(\d+)&kiosk_time=(\d+)/);

    if (!match) return;

    let currentIndex = parseInt(match[1]);
    let totalRotas = parseInt(match[2]);
    let tempoSegundos = parseInt(match[3]);
    let internalTimer = tempoSegundos;
    let isPausedLocally = false;

    try {
        let cleanUrl = window.location.href.replace(match[0], '').replace(/#$/, '').replace(/&$/, '');
        history.replaceState(null, null, cleanUrl);
    } catch(e) {}

    // Pega a hora exata local com segundos para não piscar na transição
    let now = new Date();
    // pt-BR sem parâmetros extras já retorna HH:MM:SS nativamente
    let initialTime = now.toLocaleTimeString('pt-BR');
    let initialDate = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

    // 2. INJETA ESTILOS CSS
    const style = document.createElement('style');
    style.innerHTML = `
        /* === BARRAS DO TOPO === */
        #kiosk-top-container {
            position: fixed; top: 0; left: 0; width: 100%;
            z-index: 2147483647; pointer-events: none;
            display: flex; flex-direction: column; align-items: center;
        }

        #kiosk-bars-wrapper {
            width: 100%;
            display: flex; gap: 6px; padding: 8px 8px 25px 8px; /* Espaço pro gradiente fluir */
            box-sizing: border-box;
            background: linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 100%);
        }

        .kiosk-bar-bg {
            flex: 1; height: 10px; /* Altura ideal para caber o texto dentro */
            background: rgba(255,255,255,0.25);
            border-radius: 4px; overflow: hidden; position: relative;
        }

        .kiosk-bar-fill {
            position: absolute; left: 0; top: 0; bottom: 0;
            background: #00E676; width: 0%;
            box-shadow: 0 0 5px rgba(0,255,0,0.5); z-index: 1;
        }

        .kiosk-bar-text {
            position: absolute; left: 0; top: 0; right: 0; bottom: 0;
            display: flex; align-items: center; justify-content: center;
            z-index: 2; font-size: 0.85rem; font-weight: bold; font-family: monospace;
            color: #ffffff; text-shadow: 0px 1px 3px rgba(0,0,0,0.9);
        }

        /* === BOTÃO DE PAUSE CENTRALIZADO === */
        #kiosk-pause-widget {
            margin-top: -15px; /* Puxa o botão para perto da barra */
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(4px);
            border-radius: 20px;
            padding: 4px 20px;
            display: flex; align-items: center; justify-content: center;
            pointer-events: auto;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }

        #kw-btn-pause {
            background: transparent; border: none; color: #fff;
            cursor: pointer; font-size: 1rem; padding: 0;
            transition: transform 0.2s, color 0.2s; text-shadow: 0 1px 3px rgba(0,0,0,0.5);
        }
        #kw-btn-pause:hover { transform: scale(1.15); color: #FF9800; }
        #kw-btn-pause.is-paused { color: #FF9800; }

        /* === WIDGET RELÓGIO (CANTO INFERIOR DIREITO) === */
        #kiosk-bottom-widget {
            position: fixed; bottom: 8px; right: 8px;
            z-index: 2147483647;
            background: rgba(0, 0, 0, 0.35);
            backdrop-filter: blur(3px);
            color: rgba(255, 255, 255, 0.85);
            padding: 6px 12px;
            border-radius: 8px;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            font-family: 'Segoe UI', Arial, sans-serif;
            transition: background 0.3s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            pointer-events: none;
        }

        .kw-time {
            font-size: 1.1rem; font-weight: bold; letter-spacing: 0.5px; line-height: 1;
            font-variant-numeric: tabular-nums; /* Evita que a hora trema quando passa os segundos */
        }
        .kw-date { font-size: 0.7rem; color: #ccc; margin-top: 3px; line-height: 1; }
    `;
    document.head.appendChild(style);

    // 3. RENDERIZA OS ELEMENTOS
    function renderizarUI() {
        if (document.getElementById('kiosk-top-container')) return;

        // --- TOPO (BARRAS + PAUSE) ---
        let topContainer = document.createElement('div');
        topContainer.id = 'kiosk-top-container';

        let barWrapper = document.createElement('div');
        barWrapper.id = 'kiosk-bars-wrapper';

        let activeFillElement = null;

        for (let i = 0; i < totalRotas; i++) {
            let bg = document.createElement('div');
            bg.className = 'kiosk-bar-bg';

            let fill = document.createElement('div');
            fill.className = 'kiosk-bar-fill';

            let timerText = document.createElement('div');
            timerText.className = 'kiosk-bar-text';

            if (i < currentIndex) {
                fill.style.width = '100%';
            } else if (i === currentIndex) {
                fill.style.transition = `width ${tempoSegundos}s linear`;
                activeFillElement = fill;

                timerText.id = 'kw-countdown';
                timerText.innerText = tempoSegundos + 's';

                setTimeout(() => { fill.style.width = '100%'; }, 50);
            }

            bg.appendChild(fill);
            bg.appendChild(timerText);
            barWrapper.appendChild(bg);
        }

        let pauseWidget = document.createElement('div');
        pauseWidget.id = 'kiosk-pause-widget';
        pauseWidget.innerHTML = `<button id="kw-btn-pause" title="Pausar/Retomar">⏸</button>`;

        topContainer.appendChild(barWrapper);
        topContainer.appendChild(pauseWidget);

        // --- RODAPÉ (WIDGET RELÓGIO) ---
        let bottomWidget = document.createElement('div');
        bottomWidget.id = 'kiosk-bottom-widget';
        bottomWidget.innerHTML = `
            <div class="kw-time" id="kw-time">${initialTime}</div>
            <div class="kw-date" id="kw-date">${initialDate}</div>
        `;

        document.body.appendChild(topContainer);
        document.body.appendChild(bottomWidget);

        iniciarLogica(activeFillElement);
    }

    // 4. LÓGICA DE SINCRONIZAÇÃO E BOTÕES
    function iniciarLogica(activeFill) {
        const elTime = document.getElementById('kw-time');
        const elDate = document.getElementById('kw-date');
        const elCount = document.getElementById('kw-countdown');
        const btnPause = document.getElementById('kw-btn-pause');

        // Relógio (Agora com segundos nativamente)
        setInterval(() => {
            let now = new Date();
            elTime.innerText = now.toLocaleTimeString('pt-BR');
            elDate.innerText = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        }, 1000);

        // Ouve mensagens do Mestre (Sincronização)
        window.addEventListener('message', (e) => {
            if (e.data && e.data.type === 'kiosk_sync') {
                internalTimer = e.data.time;

                if (elCount) elCount.innerText = internalTimer + 's';

                if (e.data.paused !== isPausedLocally) {
                    isPausedLocally = e.data.paused;

                    if (isPausedLocally) {
                        btnPause.innerText = '▶';
                        btnPause.classList.add('is-paused');
                        if (activeFill) {
                            let currentWidth = window.getComputedStyle(activeFill).width;
                            activeFill.style.transition = 'none';
                            activeFill.style.width = currentWidth;
                        }
                    } else {
                        btnPause.innerText = '⏸';
                        btnPause.classList.remove('is-paused');
                        if (activeFill) {
                            activeFill.style.transition = `width ${internalTimer}s linear`;
                            activeFill.style.width = '100%';
                        }
                    }
                }
            }
        });

        btnPause.onclick = () => {
            if (window.opener) {
                window.opener.postMessage({ type: 'kiosk_action', action: 'toggle_pause' }, '*');
            }
        };
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', renderizarUI);
    } else {
        renderizarUI();
    }

})();
