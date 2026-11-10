# Conferência do histórico

Eventos extraídos: 136. Sem inconsistências detectadas: 119. Exigem revisão: 17. Gastos de outubro/2026: 4.

O arquivo extracted.json é uma proposta de importação, não uma fonte de dados do Angular. Os originais em original/ permanecem intactos. Nenhum registro foi gravado por este script.

O importador bloqueia o lote inteiro se qualquer item estiver sem aprovação. Para importar somente os consistentes, gere uma cópia com os demais itens removidos; eles continuam preservados no original e no relatório. Para corrigir um item, preencha os valores, mantenha a origem e registre reviewNote e approved=true. Nenhuma correção de valores é inferida.

## Itens para revisão

- **mensalistas:16 — Mensalistas Fevereiro 2026**: Recebido declarado 20000.00 difere da lista 2000.00.
- **mensalistas:22 — Mensalistas Agosto 2026**: Nome repetido dentro do mesmo evento.
- **diaristas:2 — Diaristas Pelada 14/11/2024**: Previsto declarado 200.00 difere da lista 180.00. Recebido declarado 200.00 difere da lista 180.00.
- **diaristas:3 — Diaristas Pelada 21/11/2024**: Previsto declarado 230.00 difere da lista 240.00. Recebido declarado 230.00 difere da lista 240.00.
- **diaristas:6 — Diaristas Pelada 19/12/2024**: Recebido declarado 240.00 difere da lista 270.00.
- **diaristas:10 — Diaristas Pelada 23/01/2025**: Recebido declarado 220.00 difere da lista 200.00.
- **diaristas:13 — Diaristas Pelada 13/02/2025**: Outro card tem a mesma data e título (diaristas:13, diaristas:14): revisar se é o mesmo evento ou diferenciar os títulos.
- **diaristas:14 — Diaristas Pelada 13/02/2025**: Outro card tem a mesma data e título (diaristas:13, diaristas:14): revisar se é o mesmo evento ou diferenciar os títulos.
- **diaristas:22 — Diaristas Pelada 24/04/2025**: Nome repetido dentro do mesmo evento.
- **diaristas:61 — Diaristas Pelada 05/03/2026**: Previsto declarado 180.00 difere da lista 210.00. Recebido declarado 180.00 difere da lista 210.00.
- **diaristas:66 — Diaristas Pelada 10/04/2026**: Previsto declarado 300.00 difere da lista 270.00. Recebido declarado 300.00 difere da lista 270.00.
- **diaristas:67 — Diaristas Pelada 16/04/2026**: Previsto declarado 210.00 difere da lista 180.00. Recebido declarado 210.00 difere da lista 180.00.
- **churrasco:1 — Churrasco Pelada 19/12/2024**: Nome repetido dentro do mesmo evento.
- **churrasco:2 — Churrasco Pelada 13/02/2025**: Valor individual ausente ou preços diferentes por categoria: definir valores individuais.
- **churrasco:5 — Churrasco Pelada 10/07/2025**: Previsto declarado 90.00 difere da lista 100.00. Recebido declarado 90.00 difere da lista 100.00.
- **churrasco:9 — Churrasco Pelada 05/02/2026**: Previsto declarado 630.00 difere da lista 630.02. Recebido declarado 630.00 difere da lista 630.02.
- **churrasco:11 — Churrasco Pelada 26/03/2026**: Previsto declarado 240.00 difere da lista 210.00. Recebido declarado 240.00 difere da lista 210.00.

## Identidades

A normalização evita diferenças apenas de maiúsculas, acentos e espaços. Apelidos diferentes continuam separados. Homônimos no mesmo evento precisam de um identificador no nome (por exemplo, João — Silva e João — Souza). Participações em dias diferentes são preservadas.

## Saldo

Saldo inicial em 01/10/2026: R$ 1.985,48. Saldo final esperado de outubro: R$ 1.765,65. As receitas são importadas das listas, sem criar entradas adicionais a partir do resumo. Os quatro gastos são importados do resumo com data exata desconhecida (NULL).
