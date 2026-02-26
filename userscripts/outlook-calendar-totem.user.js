// ==UserScript==
// @name         Outlook Calendar Kiosk Totem
// @namespace    http://violentmonkey.net/
// @version      1.7
// @description  Auto-Zoom Inteligente (Foco 07h-17h30), Destaque de Hoje e Alinhamento Flex. (UI visual removida, integrada no Kiosk Overlay)
// @author       John Jefferson
// @match        https://outlook.office.com/calendar/*
// @updateURL    https://github.com/johnjeffersoncm/kiosk-master/raw/refs/heads/main/userscripts/outlook-calendar-totem.user.js
// @downloadURL  https://github.com/johnjeffersoncm/kiosk-master/raw/refs/heads/main/userscripts/outlook-calendar-totem.user.js
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Target configuration for commercial visibility (7h to 17h30 = ~10.5 hours)
    const ALTURA_MINIMA_NECESSARIA = 1040;

    const css = `
        /* 1. HIDE EXTERNAL ELEMENTS */
        #o365header, #RibbonRoot, .___1d1gxkh, .left-pane-base-container,
        div[data-app-section="CalendarSurfaceNavigationToolbar"],
        .iiYY1, .tFY7h.a7Ps_, .HIngt button, .GcGlS, .zk3dz, .I7f2S {
            display: none !important;
        }

        /* 2. ISOLATION AND STRUCTURE WITH ZOOM SUPPORT */
        .ZlutZ.qaYlF {
            position: fixed !important; top: 0 !important; left: 0 !important;
            width: 100vw !important; height: 100vh !important; z-index: 9999 !important;
            background: white !important; overflow-x: auto !important; overflow-y: hidden !important;
            transform-origin: top left;
        }

        /* VISUAL CUT OFF FOR LATE NIGHT 00h-07h */
        .AaBRJ.aMn9f, ._ljzD {
            transform: translateY(-560px) !important;
            will-change: transform;
        }

        /* 3. TIME RULER (Font 30px) */
        .RyYB7 {
            position: sticky !important; left: 0 !important; z-index: 1000 !important;
            background: white !important; border-right: 1px solid #ddd !important;
            width: 48px !important; overflow: hidden !important;
        }
        .fS_Qr { font-size: 30px !important; font-weight: bold !important; color: #333 !important; width: 100% !important; text-align: center !important; padding-right: 5px !important; }

        /* 4. HEADERS: ROOMS (Font 45px) */
        .fOHLX { font-size: 45px !important; text-align: center !important; width: 100% !important; line-height: 1.5 !important; display: block !important; padding: 15px 0 !important; }
        .HIngt { height: auto !important; min-height: 90px !important; justify-content: center !important; }

        /* 5. DATES AND DAYS (Absolute Centering) */
        .DxDL9 { display: flex !important; height: auto !important; margin-top: 15px !important; padding-bottom: 20px !important; text-align: center !important; overflow: visible !important; }
        .k65Bx { display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; width: 100% !important; }
        .Hx8ak, .bIymH, .pa8go { font-size: 30px !important; text-align: center !important; display: flex !important; justify-content: center !important; width: 100% !important; height: 40px !important; line-height: 40px !important; font-weight: bold !important; }
        .NPc97, .FmK3a { font-size: 25px !important; text-align: center !important; display: block !important; justify-content: center !important; width: 100% !important; margin-top: 5px !important; font-weight: normal !important; }

        /* 6. ALIGNMENT FIX (Flex Fix) */
        .iaCtK, .ONUhz, .BbwdT, .SWJxF { width: max-content !important; min-width: 100vw !important; display: flex !important; flex-direction: column !important; }
        .inDayScrollContainer { overflow: hidden !important; height: 100vh !important; }
        .allDayHeaderContent, .inDayContentChild { min-width: 500px !important; }

        /* 7. HIGHLIGHT TODAY */
        .dXXJd { background-color: rgba(0, 120, 212, 0.08) !important; border-left: 2px solid #0078d4 !important; border-right: 2px solid #0078d4 !important; }
        .B5Pd6:has(.czFpU) { background-color: rgba(0, 120, 212, 0.12) !important; }

        /* 8. EVENTS: FONT ADJUSTMENT AND TIME (17px) */
        .Cns89, .N2eTx, .ErL8v, .sD0e7 { display: none !important; }
        .MHFGp { display: flex !important; flex-direction: column !important; justify-content: center !important; height: 100% !important; padding: 5px !important; overflow: hidden !important; }
        .X2DO9 { font-size: 20px !important; line-height: 1.1 !important; white-space: normal !important; word-wrap: break-word !important; display: block !important; max-height: 60% !important; overflow: hidden !important; }
        .kiosk-time-info { font-size: 17px !important; font-weight: 400 !important; color: #444 !important; display: block !important; margin-top: 8px !important; padding-top: 4px; border-top: 1px dashed rgba(0,0,0,0.1); }
    `;

    function aplicarAutoZoom() {
        const container = document.querySelector('.ZlutZ.qaYlF');
        if (container) {
            const viewportHeight = window.innerHeight;
            // If screen is too small to show until 17:30
            if (viewportHeight < ALTURA_MINIMA_NECESSARIA) {
                const zoomCalculado = viewportHeight / ALTURA_MINIMA_NECESSARIA;
                container.style.zoom = zoomCalculado;
                // Adjust width to compensate zoom to avoid white space
                container.style.width = (100 / zoomCalculado) + "vw";
            }
        }
    }

    function injectEventTimes() {
        const events = document.querySelectorAll('.O05RF');
        events.forEach(event => {
            const btn = event.querySelector('div[role="button"]');
            const target = event.querySelector('.MHFGp');
            if (btn && target && !target.querySelector('.kiosk-time-info')) {
                const title = btn.getAttribute('title') || '';
                const timeMatch = title.match(/(\d{1,2}:\d{2})\s+(?:para|às)\s+(\d{1,2}:\d{2})/);
                if (timeMatch) {
                    const start = timeMatch[1], end = timeMatch[2];
                    const s = start.split(':'), e = end.split(':');
                    const diffMin = (parseInt(e[0]) * 60 + parseInt(e[1])) - (parseInt(s[0]) * 60 + parseInt(s[1]));
                    const duracao = diffMin >= 60 ? Math.floor(diffMin/60) + 'h' : diffMin + 'm';
                    const timeSpan = document.createElement('span');
                    timeSpan.className = 'kiosk-time-info';
                    timeSpan.innerText = `${start} às ${end} (${duracao})`;
                    target.appendChild(timeSpan);
                }
            }
        });
    }

    function iniciarKioskOutlook() {
        // Execute UI modifications immediately on load
        GM_addStyle(css);
        aplicarAutoZoom();

        const observer = new MutationObserver(() => {
            injectEventTimes();
            const scroller = document.querySelector('.inDayScrollContainer');
            if (scroller && scroller.scrollTop !== 0) scroller.scrollTop = 0;
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // Handle resize events for the zoom
        window.addEventListener('resize', aplicarAutoZoom);
    }

    // Launch modifications
    iniciarKioskOutlook();

})();
