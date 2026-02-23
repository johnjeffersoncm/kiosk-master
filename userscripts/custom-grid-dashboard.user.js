// ==UserScript==
// @name         Custom Grid Dashboard Layout
// @namespace    http://violentmonkey.net/
// @version      1.0-FINAL
// @description  Layout Dashboard: 7 columns, Photo, Name, Dept and Fullscreen Button.
// @author       John
// @match        http://YOUR_DOMAIN_HERE/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('[VM] Dashboard Custom: Starting...');

    // === CONFIGURATIONS ===
    const CARDS_POR_LINHA = 7;
    const POLLING_INTERVAL = 1000;

    function aplicarDashboard() {
        if (typeof Ext === 'undefined' || !Ext.getCmp) return false;

        var grid = Ext.getCmp('gridAniversariantes');
        if (!grid || !grid.store) return false;
        if (grid.dashboardApplied) return true;

        console.log('[VM] Grid detected. Applying visual transformation...');

        try {
            // 1. DATA CLEANUP (Remove table grouping)
            grid.store.clearGrouping();
            grid.store.sort('empresa', 'ASC');

            // 2. CSS (Card style and Fullscreen)
            var larguraCard = (98 / CARDS_POR_LINHA) + '%';
            var styleId = 'custom-dashboard-css';

            if (!document.getElementById(styleId)) {
                var css = `
                    /* Transforms Table into Flexbox */
                    #gridAniversariantes .x-grid-view,
                    #gridAniversariantes .x-grid-table,
                    #gridAniversariantes .x-grid-table tbody {
                        display: flex !important; flex-wrap: wrap !important; justify-content: flex-start !important; width: 100% !important;
                    }
                    /* Hides extra columns */
                    #gridAniversariantes .x-grid-row .x-grid-cell:not(:first-child) { display: none !important; }
                    /* Individual Card Style */
                    #gridAniversariantes .x-grid-row {
                        display: flex !important; flex-direction: column !important; width: ${larguraCard} !important;
                        margin: 0.2% !important; height: auto !important; border: none !important; background: transparent !important; padding: 0 !important;
                    }
                    #gridAniversariantes .x-grid-row .x-grid-cell:first-child { display: block !important; width: 100% !important; }
                    #gridAniversariantes .x-grid-cell-inner { padding: 0 !important; margin: 0 !important; width: 100% !important; }

                    /* FOCUS MODE (Real Fullscreen) */
                    body.foco-ativo #gridAniversariantes {
                        position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important;
                        z-index: 999999 !important; background: #fdfdfd !important; padding: 10px !important; margin: 0 !important;
                        box-sizing: border-box !important;
                    }
                    body.foco-ativo #gridAniversariantes .x-panel-body,
                    body.foco-ativo #gridAniversariantes .x-grid-view { width: 100% !important; height: 100% !important; top: 0 !important; left: 0 !important; }
                    body.foco-ativo #gridAniversariantes .x-grid-view { overflow-y: auto !important; overflow-x: hidden !important; }
                    /* Hides native toolbars in focus mode */
                    body.foco-ativo #gridAniversariantes .x-docked-top,
                    body.foco-ativo #gridAniversariantes .x-docked-bottom { display: none !important; }
                `;
                var style = document.createElement('style');
                style.type = 'text/css';
                style.id = styleId;
                style.appendChild(document.createTextNode(css));
                document.head.appendChild(style);
            }

            // 3. RENDERER (Card HTML)
            var colunas = grid.headerCt ? grid.headerCt.items.items : grid.columns;
            var colunaNome = null;

            Ext.each(colunas, function(col) {
                if (col.dataIndex === 'nme_funcionario') {
                    colunaNome = col;
                    col.setVisible(true);
                }
            });

            if (colunaNome) {
                colunaNome.renderer = function(value, metaData, record) {
                    var codEmpresa = record.get('cod_empresa');
                    var codDrt = record.get('cod_drt');
                    var apelido = record.get('apelido_funcionario') || '';
                    var depto = record.get('nme_departamento') || '-';
                    var dataNiver = record.get('aniversario') || '';
                    var nomeEmpresa = record.get('empresa') || '';

                    // [MANUAL UPDATE REQUIRED] Add your specific photo path URL here
                    var urlFoto = 'http://YOUR_DOMAIN_HERE/path/to/photo.php?cod_empresa=' + codEmpresa + '&cod_drt=' + codDrt;

                    return `
                    <div style="border: 1px solid #e0e0e0; border-radius: 8px; background: linear-gradient(to bottom, #ffffff, #f7f7f7); padding: 6px 2px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-family: Arial, sans-serif; height: 100%; box-sizing: border-box; overflow: hidden;">
                        <div style="font-size: 7px; color: #999; text-transform: uppercase; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${nomeEmpresa}</div>

                        <img src="${urlFoto}" style="width: 65px; height: 65px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.15); margin-bottom: 2px;">

                        <div style="font-size: 10px; font-weight: 700; color: #333; line-height: 1; margin-bottom: 0; padding: 0 2px; height: 22px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${value}</div>

                        <div style="font-size: 9px; color: #555; margin-bottom: 2px; padding: 0; line-height: 1;">${apelido ? '(' + apelido + ')' : '&nbsp;'}</div>

                        <div style="font-size: 8px; color: #aaa; padding-top: 1px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${depto}</div>

                        <div style="font-size: 9px; font-weight: bold; color: #fff; background: #2196F3; display: inline-block; padding: 0px 5px; border-radius: 6px;">🎈 ${dataNiver}</div>
                    </div>`;
                };
            }

            // 4. MAXIMIZE BUTTON (Top right corner)
            if (!document.getElementById('btn-max-foco')) {
                var btn = document.createElement('button');
                btn.id = 'btn-max-foco';
                btn.innerHTML = '⤢';
                btn.title = "Maximize / Focus Mode";
                btn.style.cssText = 'position: fixed; top: 5px; right: 5px; z-index: 1000000; width: 30px; height: 30px; background: rgba(0,0,0,0.1); color: #555; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 18px; line-height: 25px; text-align: center; transition: all 0.2s;';

                btn.onmouseover = function() { this.style.background = '#2196F3'; this.style.color = '#fff'; };
                btn.onmouseout = function() {
                    if(!document.body.classList.contains('foco-ativo')) {
                        this.style.background = 'rgba(0,0,0,0.1)'; this.style.color = '#555';
                    } else {
                        this.style.background = '#F44336';
                    }
                };

                btn.onclick = function() {
                    document.body.classList.toggle('foco-ativo');
                    var estaAtivo = document.body.classList.contains('foco-ativo');
                    btn.innerHTML = estaAtivo ? '✕' : '⤢';
                    btn.style.background = estaAtivo ? '#F44336' : 'rgba(0,0,0,0.1)';
                    btn.style.color = estaAtivo ? '#fff' : '#555';
                    // Forces grid to recalculate layout size
                    grid.updateLayout();
                };
                document.body.appendChild(btn);
            }

            grid.getView().refresh();
            grid.dashboardApplied = true;
            return true;

        } catch (e) {
            console.error('[VM] Critical Error:', e);
            return false;
        }
    }

    // Continuous Monitoring (Polling)
    var checkTimer = setInterval(function() {
        var sucesso = aplicarDashboard();
        if (sucesso) {
            console.log('[VM] Dashboard successfully applied.');
            clearInterval(checkTimer);

            // Watches if grid "dies" (e.g. new filter applied) to recreate dashboard
            setInterval(function(){
                var g = Ext.getCmp('gridAniversariantes');
                if(g && !g.dashboardApplied) {
                    aplicarDashboard();
                }
            }, 2000);
        }
    }, POLLING_INTERVAL);

})();
