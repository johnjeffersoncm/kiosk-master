// ==UserScript==
// @name         Outlook Calendar Kiosk Totem
// @namespace    http://violentmonkey.net/
// @version      0.1
// @description  Isolamento da região das agendas para exibição em Totem/Kiosk com scroll horizontal e horas fixas.
// @author       John Jefferson
// @match        https://outlook.office.com/calendar/*
// @updateURL    https://github.com/johnjeffersoncm/kiosk-master/raw/refs/heads/main/userscripts/outlook-calendar-totem.user.js
// @downloadURL  https://github.com/johnjeffersoncm/kiosk-master/raw/refs/heads/main/userscripts/outlook-calendar-totem.user.js
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==


(function() {
    'use strict';

    const css = `
        /* 1. BLOQUEIO DEFINITIVO (Regra de Ouro) */
        #o365header, 
        #RibbonRoot, 
        .___1d1gxkh, 
        .left-pane-base-container,
        div[data-app-section="CalendarSurfaceNavigationToolbar"],
        .iiYY1,
        .tFY7h.a7Ps_ { 
            display: none !important;
        }

        /* 2. ISOLAMENTO E SCROLL HORIZONTAL */
        .ZlutZ.qaYlF {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 9999 !important;
            background: white !important;
            overflow-x: auto !important; /* HABILITA SCROLL HORIZONTAL */
            overflow-y: hidden !important;
        }

        /* 3. EXPANSÃO DO CONTEÚDO */
        /* Permite que o container interno seja maior que a largura da tela */
        .iaCtK, .ONUhz, .BbwdT, .SWJxF {
            width: max-content !important;
            min-width: 100vw !important;
            height: 100% !important;
            display: block !important;
        }

        /* 4. RÉGUA DE HORAS "STICKY" */
        /* Ela fica fixa na esquerda enquanto você rola para as salas da direita */
        .RyYB7 {
            position: sticky !important;
            left: 0 !important;
            z-index: 1000 !important;
            background: white !important;
            border-right: 1px solid #ddd !important;
            box-shadow: 2px 0 5px rgba(0,0,0,0.05);
        }

        /* 5. SCROLL VERTICAL CONTROLADO */
        .inDayScrollContainer {
            overflow-y: auto !important;
            height: calc(100vh - 60px) !important; 
        }

        /* 6. LARGURA DAS SALAS */
        /* Ajuste este valor (450px) para definir o quão larga cada sala deve ser */
        .allDayHeaderContent, .inDayContentChild {
            min-width: 450px !important; 
        }
    `;

    GM_addStyle(css);

    // Foco nas 08:00
    window.addEventListener('load', () => {
        setTimeout(() => {
            const scroller = document.querySelector('.inDayScrollContainer');
            if (scroller) scroller.scrollTop = 330; 
        }, 3000);
    });

})();
