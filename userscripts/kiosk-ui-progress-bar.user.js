// ==UserScript==
// @name         Kiosk UI Overlay (Barras Estilo Instagram)
// @namespace    http://violentmonkey.net/
// @version      1.0
// @description  Desenha a barra de progresso lendo instruções via URL (Hash)
// @author       John
// @match        http://*/*
// @match        https://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // 1. LÊ AS INSTRUÇÕES SECRETAS NA URL
    let hash = window.location.hash;

    // Expressão regular para encontrar os parâmetros do Kiosk na URL
    let match = hash.match(/kiosk_idx=(\d+)&kiosk_tot=(\d+)&kiosk_time=(\d+)/);

    // Se não for o popup do Kiosk, o script não faz absolutamente nada.
    if (!match) return;

    let currentIndex = parseInt(match[1]);
    let totalRotas = parseInt(match[2]);
    let tempoSegundos = parseInt(match[3]);

    // Opcional: Limpa a URL visualmente para não ficar feio (Remove o #kiosk...)
    try {
        let cleanUrl = window.location.href.replace(match[0], '').replace(/#$/, '').replace(/&$/, '');
        history.replaceState(null, null, cleanUrl);
    } catch(e) {}

    // 2. DESENHA A BARRA QUANDO A PÁGINA CARREGAR
    function renderizarBarras() {
        if (document.getElementById('kiosk-instagram-bars')) return;

        let container = document.createElement('div');
        container.id = 'kiosk-instagram-bars';
        container.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 6px;
            z-index: 2147483647; display: flex; gap: 4px; padding: 4px 4px 0 4px;
            box-sizing: border-box; pointer-events: none; background: rgba(0,0,0,0.25);
        `;

        for (let i = 0; i < totalRotas; i++) {
            let bg = document.createElement('div');
            bg.style.cssText = "flex: 1; height: 100%; background: rgba(255,255,255,0.3); border-radius: 4px; overflow: hidden;";

            let fill = document.createElement('div');
            fill.style.cssText = "height: 100%; background: #00E676; width: 0%; box-shadow: 0 0 5px rgba(0,255,0,0.5);";

            if (i < currentIndex) {
                // Rotas passadas ficam 100% cheias
                fill.style.width = '100%';
            } else if (i === currentIndex) {
                // Rota atual anima de 0 a 100
                // O tempo da transição é o tempo total da página configurado no Master
                fill.style.transition = `width ${tempoSegundos}s linear`;

                // Pequeno delay para o navegador registrar o '0%' antes de iniciar a transição para '100%'
                setTimeout(() => { fill.style.width = '100%'; }, 50);
            }

            bg.appendChild(fill);
            container.appendChild(bg);
        }

        // Tenta injetar na página
        if (document.documentElement) {
            document.documentElement.appendChild(container);
        } else if (document.body) {
            document.body.appendChild(container);
        }
    }

    // Tenta renderizar o mais rápido possível e garante na carga total
    renderizarBarras();
    window.addEventListener('DOMContentLoaded', renderizarBarras);
    window.addEventListener('load', renderizarBarras);

})();
