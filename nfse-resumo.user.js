// ==UserScript==
// @name         NFS-e | Resumo de Notas
// @namespace    https://www.nfse.gov.br/
// @version      1.0.0
// @description  Agrupa e soma notas emitidas por status, iterando todas as páginas em background
// @author       Gabriel
// @updateURL    https://raw.githubusercontent.com/gastk/nfse-nacional-resumo/main/nfse-resumo.user.js
// @downloadURL  https://raw.githubusercontent.com/gastk/nfse-nacional-resumo/main/nfse-resumo.user.js
// @match        https://www.nfse.gov.br/EmissorNacional/Notas/Emitidas*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // -------------------------------------------------------------------------
    // Configuração
    // -------------------------------------------------------------------------

    const BASE_URL = 'https://www.nfse.gov.br/EmissorNacional/Notas/Emitidas';

    const STATUS_LABELS = {
        'P100_GERADA':      'NFS-e Emitida',
        'P100_CANCELADA':   'Cancelada',
        'P100_SUBSTITUIDA': 'Substituída',
        'P100_SUBSTITUICAO':'Substituição',
    };

    function getLabelSituacao(situacao) {
        return STATUS_LABELS[situacao] ?? situacao;
    }

    // -------------------------------------------------------------------------
    // Utilitários de estilo (tudo inline para não conflitar com a página)
    // -------------------------------------------------------------------------

    const STYLES = `
        #nfse-btn-relatorio {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 99999;
            padding: 10px 18px;
            background: #2c6fad;
            color: #fff;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-family: Roboto, sans-serif;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            transition: background 0.2s;
        }
        #nfse-btn-relatorio:hover:not(:disabled) {
            background: #1e4f7e;
        }
        #nfse-btn-relatorio:disabled {
            background: #5a8fc4;
            cursor: not-allowed;
        }

        /* Spinner */
        .nfse-spinner {
            width: 14px;
            height: 14px;
            border: 2px solid rgba(255,255,255,0.35);
            border-top-color: #fff;
            border-radius: 50%;
            animation: nfse-spin 0.7s linear infinite;
            flex-shrink: 0;
        }
        @keyframes nfse-spin {
            to { transform: rotate(360deg); }
        }

        /* Overlay do modal */
        #nfse-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.55);
            z-index: 100000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Roboto, sans-serif;
        }

        /* Caixa do modal */
        #nfse-modal-box {
            background: #fff;
            border-radius: 8px;
            padding: 28px 32px;
            min-width: 380px;
            max-width: 560px;
            width: 90%;
            box-shadow: 0 8px 32px rgba(0,0,0,0.22);
        }
        #nfse-modal-box h3 {
            margin: 0 0 6px 0;
            font-size: 17px;
            color: #1e3a5f;
            font-weight: 500;
        }
        #nfse-modal-subtitle {
            font-size: 12px;
            color: #888;
            margin-bottom: 20px;
        }

        /* Tabela de resultados */
        #nfse-modal-box table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }
        #nfse-modal-box thead tr {
            background: #f0f4f9;
        }
        #nfse-modal-box th {
            padding: 8px 12px;
            text-align: left;
            color: #444;
            font-weight: 500;
            border-bottom: 2px solid #dde3ec;
        }
        #nfse-modal-box th:last-child,
        #nfse-modal-box td:last-child {
            text-align: right;
        }
        #nfse-modal-box td {
            padding: 8px 12px;
            border-bottom: 1px solid #eee;
            color: #333;
        }
        #nfse-modal-box tr.nfse-total td {
            font-weight: 600;
            border-top: 2px solid #dde3ec;
            border-bottom: none;
            color: #1e3a5f;
        }

        /* Botão fechar */
        #nfse-btn-fechar {
            margin-top: 20px;
            width: 100%;
            padding: 9px;
            background: #2c6fad;
            color: #fff;
            border: none;
            border-radius: 5px;
            font-size: 14px;
            cursor: pointer;
            font-family: Roboto, sans-serif;
            transition: background 0.2s;
        }
        #nfse-btn-fechar:hover {
            background: #1e4f7e;
        }

        /* Overlay de bloqueio durante carregamento */
        #nfse-loading-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.25);
            z-index: 99998;
            cursor: not-allowed;
        }

        /* Mensagem de erro no modal */
        .nfse-erro {
            color: #c0392b;
            font-size: 14px;
            margin-top: 8px;
        }
    `;

    // -------------------------------------------------------------------------
    // Injeção de estilos
    // -------------------------------------------------------------------------

    function injetarEstilos() {
        const style = document.createElement('style');
        style.textContent = STYLES;
        document.head.appendChild(style);
    }

    // -------------------------------------------------------------------------
    // Botão fixo
    // -------------------------------------------------------------------------

    function criarBotao() {
        const btn = document.createElement('button');
        btn.id = 'nfse-btn-relatorio';
        btn.innerHTML = '<span>Resumo de Notas</span>';
        btn.addEventListener('click', executarRelatorio);
        document.body.appendChild(btn);
        return btn;
    }

    function setLoadingBotao(btn, pagina) {
        if (!btn.disabled) {
            // Primeira chamada: monta a estrutura com spinner
            btn.disabled = true;
            btn.innerHTML = `<div class="nfse-spinner"></div><span id="nfse-btn-label">Carregando... (pág. ${pagina})</span>`;
        } else {
            // Chamadas seguintes: atualiza só o texto, sem tocar no spinner
            const label = btn.querySelector('#nfse-btn-label');
            if (label) label.textContent = `Carregando... (pág. ${pagina})`;
        }
    }

    function resetBotao(btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>Resumo de Notas</span>';
    }

    // -------------------------------------------------------------------------
    // Validação de página inicial
    // -------------------------------------------------------------------------

    function validarPaginaInicial() {
        const url = new URL(window.location.href);
        const pg = url.searchParams.get('pg');
        if (pg !== null && pg !== '1') {
            exibirModalErro('Por precaução, execute o relatório a partir da <strong>primeira página</strong> da listagem.');
            return false;
        }
        return true;
    }

    // -------------------------------------------------------------------------
    // Construção da URL de cada página
    // -------------------------------------------------------------------------

    function buildUrl(pagina) {
        const urlAtual = new URL(window.location.href);
        const params = new URLSearchParams();

        // Replica todos os parâmetros existentes exceto "pg"
        for (const [key, value] of urlAtual.searchParams.entries()) {
            if (key !== 'pg') params.set(key, value);
        }

        params.set('pg', pagina);
        return `${BASE_URL}?${params.toString()}`;
    }

    // -------------------------------------------------------------------------
    // Extração de dados de uma página já parseada
    // -------------------------------------------------------------------------

    function extrairLinhas(doc) {
        const linhas = doc.querySelectorAll('table.table-striped tbody tr');
        const dados = [];

        linhas.forEach(tr => {
            const situacao = tr.dataset.situacao;
            const valorStr = tr.dataset.valor;

            if (!situacao || !valorStr) return;

            const valor = parseFloat(valorStr.replace('.', '').replace(',', '.'));
            if (isNaN(valor)) return;

            dados.push({ situacao, valor });
        });

        return dados;
    }

    // -------------------------------------------------------------------------
    // Loop principal de coleta
    // -------------------------------------------------------------------------

    async function coletarTodasPaginas(btn) {
        const parser = new DOMParser();
        const agrupado = {}; // { situacao: { label, quantidade, total } }
        let pagina = 1;

        while (true) {
            setLoadingBotao(btn, pagina);

            const url = buildUrl(pagina);
            let response;

            try {
                response = await fetch(url, { credentials: 'include' });
            } catch (e) {
                throw new Error(`Falha na requisição da página ${pagina}: ${e.message}`);
            }

            if (!response.ok) {
                throw new Error(`Resposta HTTP ${response.status} na página ${pagina}.`);
            }

            const html = await response.text();
            const doc = parser.parseFromString(html, 'text/html');
            const linhas = extrairLinhas(doc);

            if (linhas.length === 0) break; // sem mais registros

            linhas.forEach(({ situacao, valor }) => {
                if (!agrupado[situacao]) {
                    agrupado[situacao] = {
                        label: getLabelSituacao(situacao),
                        quantidade: 0,
                        total: 0,
                    };
                }
                agrupado[situacao].quantidade++;
                agrupado[situacao].total += valor;
            });

            pagina++;
            await new Promise(resolve => setTimeout(resolve, 250));
        }

        return agrupado;
    }

    // -------------------------------------------------------------------------
    // Formatação de moeda
    // -------------------------------------------------------------------------

    function formatarMoeda(valor) {
        return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // -------------------------------------------------------------------------
    // Modal de resultado
    // -------------------------------------------------------------------------

    function exibirModalResultado(agrupado, dataInicio, dataFim) {
        const grupos = Object.values(agrupado);
        const totalQtd = grupos.reduce((acc, g) => acc + g.quantidade, 0);
        const totalValor = grupos.reduce((acc, g) => acc + g.total, 0);

        const linhasHTML = grupos.map(g => `
            <tr>
                <td>${g.label}</td>
                <td style="text-align:right;">${g.quantidade}</td>
                <td>R$ ${formatarMoeda(g.total)}</td>
            </tr>
        `).join('');

        const periodo = (dataInicio && dataFim)
            ? `Período: ${dataInicio} até ${dataFim}`
            : 'Período conforme filtro aplicado';

        const overlay = document.createElement('div');
        overlay.id = 'nfse-modal-overlay';
        overlay.innerHTML = `
            <div id="nfse-modal-box">
                <h3>Resumo de Notas</h3>
                <div id="nfse-modal-subtitle">${periodo}</div>
                <table>
                    <thead>
                        <tr>
                            <th>Situação</th>
                            <th style="text-align:right;">Qtd.</th>
                            <th style="text-align:right;">Total (R$)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${linhasHTML}
                        <tr class="nfse-total">
                            <td>Total geral</td>
                            <td style="text-align:right;">${totalQtd}</td>
                            <td>R$ ${formatarMoeda(totalValor)}</td>
                        </tr>
                    </tbody>
                </table>
                <button id="nfse-btn-fechar">Fechar</button>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById('nfse-btn-fechar').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    }

    function exibirModalErro(mensagem) {
        const overlay = document.createElement('div');
        overlay.id = 'nfse-modal-overlay';
        overlay.innerHTML = `
            <div id="nfse-modal-box">
                <h3>Resumo de Notas</h3>
                <p class="nfse-erro">${mensagem}</p>
                <button id="nfse-btn-fechar">Fechar</button>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('nfse-btn-fechar').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    }

    function exibirOverloadCarregamento() {
        const overlay = document.createElement('div');
        overlay.id = 'nfse-loading-overlay';
        document.body.appendChild(overlay);
    }

    function removerOverlayCarregamento() {
        const overlay = document.getElementById('nfse-loading-overlay');
        if (overlay) overlay.remove();
    }

    // -------------------------------------------------------------------------
    // Execução principal
    // -------------------------------------------------------------------------

    async function executarRelatorio() {
        if (!validarPaginaInicial()) return;

        const btn = document.getElementById('nfse-btn-relatorio');

        const urlAtual = new URL(window.location.href);
        const dataInicio = urlAtual.searchParams.get('datainicio') ?? '';
        const dataFim    = urlAtual.searchParams.get('datafim')   ?? '';

        try {
            exibirOverloadCarregamento();
            const agrupado = await coletarTodasPaginas(btn);

            if (Object.keys(agrupado).length === 0) {
                exibirModalErro('Nenhuma nota encontrada para o período informado.');
            } else {
                exibirModalResultado(agrupado, dataInicio, dataFim);
            }
        } catch (e) {
            exibirModalErro(`Erro durante a coleta: ${e.message}`);
        } finally {
            removerOverlayCarregamento();
            resetBotao(btn);
        }
    }

    // -------------------------------------------------------------------------
    // Inicialização
    // -------------------------------------------------------------------------

    injetarEstilos();
    criarBotao();

})();
