# Relatório de entrega — 09/11/2026

## Resultado implementado

O projeto foi convertido de consultas com HTML e dados fixos para Angular 21 + API PHP + MariaDB, com navegação pública e quatro módulos administrativos integrados. A arquitetura, o mapeamento dos dados e as decisões estão em [DIAGNOSTICO.md](DIAGNOSTICO.md). A estrutura de pastas, as tabelas/relacionamentos, os endpoints, as variáveis de ambiente e os comandos estão no [README](../README.md).

Disponível publicamente: saldo, mensalistas, diaristas, churrascos, participantes, pagamentos realizados/pendentes e filtros obrigatórios de mês/ano. As consultas não dependem de login e não carregam todo o histórico no Angular.

Restrito a contas ativas autorizadas: criar/editar/excluir eventos e gastos, adicionar/remover pessoas nas listas, alterar pagamentos e consultar pessoas cadastradas. Pessoas novas são salvas na mesma transação do evento. Salvar confirma e atualiza a consulta; cancelar não faz escrita. Há confirmação de descarte ao sair de formulários alterados e checagem de versões contra sobrescrita.

O banco local `pelada_local` foi criado e recebeu **119 eventos históricos e quatro gastos**, com saldo inicial em outubro/2026. As credenciais de banco foram geradas localmente e estão em `api/.env`, ignorado pelo Git. A atribuição da importação usa uma identidade inativa, sem login e sem papel administrativo. **O primeiro administrador ainda deve ser criado pelo responsável**, com senha própria usando `scripts/create-admin.ps1`; isso é uma etapa de configuração intencional, sem senha padrão.

## Integridade financeira

Receitas são derivadas das participações efetivamente pagas, separadas por mensalidade/diária/churrasco. Despesas são derivadas dos lançamentos por referência. Aritmética usa centavos inteiros e colunas DECIMAL, sem duplicar receitas em uma tabela de saldos. A leitura financeira usa uma transação com isolamento REPEATABLE READ.

O acompanhamento acumulado começa em **01/10/2026 com R$ 1.985,48**. Outubro possui R$ 3.230,00 recebidos, R$ 30,00 pendentes e R$ 3.449,83 de gastos: resultado de **-R$ 219,83** e acumulado de **R$ 1.765,65**, igual ao histórico confirmado. Registros anteriores a outubro não são somados novamente ao saldo inicial.

As três páginas históricas continham 136 cards. **17 eventos aguardam revisão**, incluindo valores divergentes, preços diferentes sem distribuição individual, nomes repetidos na mesma lista e dois cards com a mesma data/título. Todos permanecem em `legacy/original/`, `legacy/extracted.json` e [legacy/REVIEW.md](../legacy/REVIEW.md). A importação consistente não tenta adivinhar as correções. Participações da mesma pessoa em dias diferentes foram preservadas normalmente.

Datas exatas antigas não disponíveis são mantidas nulas. A importação valida origem, é transacional, admite simulação sem persistência e registra chaves para impedir duplicidades em reexecuções. Exclusões novas são lógicas e auditadas. Nenhuma migração destrutiva de dados reais foi executada.

## Segurança e dependências

Implementados: hash de senha com `password_hash`, verificação com `password_verify`, prepared statements PDO, validação no PHP, saída Angular escapada, sessão HttpOnly/SameSite Strict, token CSRF, verificação de origem nas escritas, renovação da sessão, expiração, limite de tentativas por IP/conta e autorização em cada operação administrativa. O estado ativo/papel é consultado no banco. A checagem de sessão do guard é renovada nas navegações, compartilhando apenas requisições simultâneas.

A auditoria inicial apontou dependências vulneráveis do Angular 18 e do scaffolding Node. A atualização resultou em Angular 21.2.26, CLI/build 21.2.29, TypeScript 5.9 e Zone 0.16; o build passou para `@angular/build`, e o Express/SSR deixou de fazer parte da aplicação. Overrides de `glob` e `minimatch` aplicam versões corrigidas aos ramos afetados das ferramentas. A auditoria completa final do npm apontou **zero vulnerabilidades**. Isso registra o resultado da ferramenta nessa execução; não é garantia absoluta de ausência de falhas.

## Verificações executadas

| Verificação | Resultado |
| --- | --- |
| PHP `-l` | Arquivos PHP válidos |
| Unitários PHP | 19 verificações passaram |
| HTTP/API em MariaDB isolado | 68 verificações passaram |
| Primeiro administrador por stdin | Criação funciona; segundo bootstrap é recusado |
| Histórico | Simulação sem escrita, rollback de lote ambíguo e reexecução sem duplicação passaram |
| Conferência de outubro | Saldo acumulado R$ 1.765,65 confirmado |
| TypeScript `npm run typecheck` | Passou |
| Angular `npm run build` | Build de produção passou, dentro dos budgets |
| Angular/Karma/Chrome | 13 testes de componentes, filtros, cancelamento e sessão passaram |
| Navegador com build de produção | 44 verificações passaram |
| Responsividade no Chrome | Viewports 1440×1000, 768×1024, 390×844 e 320×740; sem rolagem horizontal nas páginas verificadas |
| npm audit completo | Zero vulnerabilidades apontadas |

Os testes HTTP cobrem consulta pública sem login, bloqueio de escritas anônimas, CSRF, origem indevida, login válido/inválido, logout, expiração, limitação de tentativas, criação/edição/exclusão, pagamentos nos dois sentidos, valores individuais, UUID contra reenvio, conflito de versões, filtros, uma pessoa em duas diárias e rollback de gravações parciais.

Os testes do navegador cobrem as cinco telas públicas/login nos quatro viewports, os quatro formulários administrativos em cada resolução, bloqueio da rota administrativa, login, cadastro de diária com pessoa nova, marcação de pagamento, salvamento, aparição na consulta pública, cancelamento de gasto sem alterar o saldo e logout. Foram inspecionadas capturas desktop e celular; os PNGs estão em `test-results/` e são ignorados pelo Git.

Todos os testes de integração usam bancos aleatórios `pelada_test_*`, removidos no final. Os registros do banco local persistente não foram usados como dados descartáveis.

## Configuração e limites restantes

1. Criar a primeira conta administrativa com senha própria pelo prompt oculto. Não há bloqueio de consultas públicas enquanto isso.
2. Conferir os 17 eventos históricos pendentes e importar os itens revisados. Os originais continuam preservados.
3. Os arquivos de Docker, Nginx e PHP-FPM foram preparados, mas **Docker não foi executado** porque não está disponível na máquina. Não houve publicação nem mudança de infraestrutura externa.
4. A responsividade foi verificada em Chrome com emulação de viewport. Não foram executados testes em Safari ou aparelhos Android/iPhone físicos.
5. Backup/restauração está documentado; não foi realizada restauração sobre produção. Não existem credenciais ou acesso de produção neste trabalho.

Para iniciar o ambiente local: `scripts/start-local.ps1`. Para criar a conta: `scripts/create-admin.ps1 -Name "Seu nome" -Email "seu@email.com"`. O acesso inicial recomendado é `http://localhost:4200/?year=2026&month=10`.
