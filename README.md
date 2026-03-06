# script-resumo-nfse-nacional

Userscript para o [Portal Emissor Nacional de NFS-e](https://www.nfse.gov.br/EmissorNacional/Notas/Emitidas) que adiciona um botão de **Resumo de Notas**, gerando uma contagem e soma de valores agrupados por status para o período filtrado — funcionalidade não disponível nativamente no portal.

---

## Pré-requisitos

- Navegador com suporte a extensões (Chrome, Firefox, Edge)
- Extensão [Tampermonkey](https://www.tampermonkey.net/) instalada

---

## Instalação

1. Com o Tampermonkey instalado, abra o arquivo [`nfse-resumo.user.js`](./nfse-resumo.user.js) no navegador
2. O Tampermonkey detectará automaticamente o userscript e exibirá a tela de instalação
3. Clique em **Instalar**

---

## Como usar

1. Acesse o portal em [nfse.gov.br](https://www.nfse.gov.br/EmissorNacional/Notas/Emitidas) e faça login normalmente
2. Aplique o filtro de datas desejado e clique em **Filtrar** — o portal precisa estar na **primeira página** dos resultados
3. Clique no botão **Resumo de Notas** fixo no canto inferior direito da tela
4. O script irá percorrer todas as páginas em background e exibir o resultado agrupado por status

> **Atenção:** o script deve ser executado sempre a partir da primeira página. Caso esteja em outra página, será exibido um aviso e a execução será cancelada.

---

## Exemplo de resultado

| Situação       | Qtd. | Total (R$)   |
|----------------|-----:|-------------:|
| NFS-e Emitida  |  370 | 312.450,00   |
| Cancelada      |    5 |   4.230,00   |
| **Total geral**| **375** | **316.680,00** |

---

## Observações

- O script realiza requisições same-origin (somente para `nfse.gov.br`), utilizando a sessão ativa do navegador. Nenhum dado é enviado para servidores externos
- Um delay de alguns milissegundos é aplicado entre cada página para evitar envio excessivo de requisições
- Caso apareça algum status com código bruto (ex: `P100_ALGUMA_COISA`) no resultado, o script ainda contabiliza normalmente. Apenas o rótulo de exibição não foi mapeado ainda

---

## Licença

[MIT](./LICENSE)
