# Pelada — gestão do futebol

Aplicação Angular com consultas públicas e gerenciamento por API PHP e MariaDB. Os dados públicos vêm exclusivamente da API; o HTML antigo foi preservado em `legacy/original/`.

O ambiente local desta máquina foi inicializado com **119 eventos e quatro gastos**. Outros **17 eventos** continuam preservados e aguardam conferência em [legacy/REVIEW.md](legacy/REVIEW.md). Não existe administrador ou senha padrão: crie a primeira conta usando o prompt oculto abaixo.

## Executar nesta máquina (Windows)

Na raiz do repositório:

```powershell
.\scripts\start-local.ps1
.\scripts\create-admin.ps1 -Name "Seu nome" -Email "seu@email.com"
```

O segundo comando solicita a senha sem exibi-la. Abra **http://localhost:4200/?year=2026&month=10**. O script informa os IDs dos processos que iniciou; encerre somente esses processos com `Stop-Process -Id <ID>`. Os dados ficam persistidos em `.tools/db-data`; não apague esse diretório.

`start-local.ps1` serve o último build. Depois de alterar o Angular:

```powershell
cd pelada-front
npm ci
npm run build
```

Para desenvolvimento com recarga automática, inicie a API com o comando abaixo e execute `npm start` em `pelada-front`, sem iniciar o servidor de preview na mesma porta:

```powershell
.\scripts\php.ps1 -S 127.0.0.1:8000 api/router.php
```

O proxy Angular encaminha `/api` para `127.0.0.1:8000`. Use `http://localhost:4200` como origem, conforme `APP_ORIGIN`.

## Configurar outra máquina

Requisitos: Node.js 22.12+ ou 24, PHP 8.2+ de 64 bits com PDO MySQL e sessões, MariaDB 11.4, Chrome para os testes de navegador. O PHP local usado na validação foi 8.4. O back-end não depende de Composer. Compatibilidade do Angular: [documentação oficial](https://angular.dev/reference/versions). Os scripts Node de automação de navegador usam o WebSocket nativo: execute-os com Node 22.12+ ou 24.

1. Crie um banco MariaDB UTF-8 e um usuário exclusivo com permissões nesse banco. Use uma conta de migrations para DDL quando separar as permissões em produção.
2. Copie `api/.env.example` para `api/.env` e configure conexão, origem e cookies. Segredos reais ficam fora do Git; variáveis do processo prevalecem sobre o arquivo.
3. Inicialize as tabelas e crie o primeiro administrador:

```powershell
.\scripts\php.ps1 api/console.php migrate
.\scripts\create-admin.ps1 -Name "Seu nome" -Email "seu@email.com"
```

Em Linux, com `pdo_mysql` habilitado:

```bash
php api/console.php migrate
read -rsp 'Senha do administrador: ' ADMIN_SECRET; printf '\n'
printf '%s' "$ADMIN_SECRET" | php api/console.php create-admin --name='Seu nome' --email='seu@email.com'
unset ADMIN_SECRET
```

O comando aceita senha somente por stdin, exige 12 a 72 bytes e recusa a criação quando já existe um administrador. Não há cadastro público nem redefinição automática de uma conta existente.

4. Importe o histórico conforme a seção seguinte e configure o saldo inicial confirmado:

```powershell
.\scripts\php.ps1 api/console.php finance-init --date=2026-10-01 --balance=1985.48 --email=seu@email.com "--description=Saldo de setembro/2026 confirmado pelo responsável"
```

Este comando é executado uma única vez; nunca sobrescreve o saldo inicial existente. Na máquina atual ele **já foi aplicado** pela inicialização local.

5. Execute `npm ci` e `npm run build` em `pelada-front`; inicie PHP e Angular ou configure Nginx/Apache conforme `deploy/`.

## Histórico e importação

```powershell
node scripts/extract-legacy.mjs
node scripts/prepare-consistent-history.mjs
.\scripts\php.ps1 api/console.php import-legacy --file=legacy/consistent.json --email=seu@email.com
.\scripts\php.ps1 api/console.php import-legacy --file=legacy/consistent.json --email=seu@email.com --apply=yes
```

O primeiro `import-legacy` é uma simulação: realiza validações dentro de uma transação e faz rollback. O segundo persiste o lote inteiro. Reexecutar não duplica registros. As receitas são importadas das listas; não se criam novas receitas com os valores do resumo de saldo. Os quatro gastos vêm do resumo de outubro/2026, cujo período foi confirmado pelo responsável.

`legacy/extracted.json` contém todos os 136 eventos e os avisos. Para resolver os 17 pendentes, copie apenas os itens revisados para um manifesto próprio, complete valores individuais, distinga homônimos ou títulos quando necessário, registre `reviewNote` e marque `approved: true`. Preserve `sourceKey`, `sourceFile`, `sourceHash` e `sources`. Faça uma simulação antes de aplicar. Nunca altere os arquivos originais para ajustar totais.

Uma pessoa pode estar em várias diárias, mensalidades e churrascos. A restrição de duplicidade vale apenas para a mesma pessoa no mesmo evento. Nomes diferentes/apelidos não são fundidos automaticamente. Datas exatas de gastos e pagamentos antigos não eram registradas: são mantidas como `NULL`, sem inventar datas. Ao editar um gasto histórico sem data, o formulário exige que o administrador informe a data antes de salvar.

O bootstrap opcional `scripts/setup-local.php` cria **um novo** banco `pelada_local`, credenciais aleatórias locais, migrations, importação consistente e saldo inicial. Usa conexão de inicialização por `LOCAL_DB_HOST`, `LOCAL_DB_PORT`, `LOCAL_DB_USER`, `LOCAL_DB_PASSWORD`. Recusa bancos e `.env` existentes. A opção `--resume-empty` aceita apenas uma inicialização interrompida sem registros e sem usuários ativos. A identidade de atribuição da importação é inativa e não possui acesso administrativo.

## Regras financeiras

Todos os cálculos oficiais são feitos no PHP, com `DECIMAL` no MariaDB e centavos inteiros no código. O formulário mostra apenas uma prévia não persistida.

- Previsto: soma dos valores individuais das cobranças do período.
- Recebido: soma apenas de participantes marcados como pagos.
- Pendente: previsto menos recebido.
- Despesas: gastos no mês/ano de referência, mesmo quando sua data de ocorrência é diferente.
- Saldo do período: recebido menos despesas.
- Acumulado: **R$ 1.985,48 em 01/10/2026** mais os resultados desde outubro até o período selecionado. Registros anteriores não entram novamente nesse saldo inicial.

Mudar um pagamento para não pago retira sua receita. Alterar valores, remover participantes e excluir eventos/gastos recalcula os indicadores. Exclusões são lógicas e auditadas. Não existe tabela de totais financeiros mantida manualmente.

Conferência de outubro/2026:

| Indicador | Valor |
| --- | ---: |
| Mensalidades recebidas | R$ 2.300,00 |
| Diárias recebidas | R$ 750,00 |
| Churrascos recebidos | R$ 180,00 |
| Receita prevista | R$ 3.260,00 |
| Receita recebida | R$ 3.230,00 |
| Pendente | R$ 30,00 |
| Despesas | R$ 3.449,83 |
| Resultado do mês | -R$ 219,83 |
| Saldo acumulado | **R$ 1.765,65** |

Consultas anteriores a outubro mostram o movimento daquele período, mas não um saldo acumulado inferido. Meses sem lançamentos mantêm o acumulado anterior.

## API REST

Todas as respostas são JSON. Valores monetários são strings decimais com ponto. Consultas por período exigem `month` e `year` (2000–2100). `kind`: `monthly`, `daily`, `barbecue`.

| Método | Endpoint | Acesso / finalidade |
| --- | --- | --- |
| GET | `/api/session` | Público; usuário atual e token CSRF |
| POST | `/api/login` | Público com CSRF; autenticação e limitação de tentativas |
| POST | `/api/logout` | CSRF; encerra autenticação e rotaciona sessão |
| GET | `/api/events?kind=daily&month=10&year=2026` | Público; eventos, participantes e totais do período |
| GET | `/api/expenses?month=10&year=2026` | Público; despesas do período |
| GET | `/api/finance?month=10&year=2026` | Público; totais e acumulado |
| GET | `/api/people?search=João` | Administrador/gerente; busca limitada a 100 pessoas |
| POST | `/api/events` | Administrador/gerente; evento e participantes em transação |
| PUT | `/api/events/{id}` | Administrador/gerente; exige versão atual |
| DELETE | `/api/events/{id}` | Administrador/gerente; exclusão lógica com versão |
| POST | `/api/expenses` | Administrador/gerente; cria gasto |
| PUT | `/api/expenses/{id}` | Administrador/gerente; exige versão atual |
| DELETE | `/api/expenses/{id}` | Administrador/gerente; exclusão lógica com versão |

Escritas exigem cookie de sessão e cabeçalho `X-CSRF-Token` obtido por `/api/session`. Depois do login/logout, use o novo token retornado. Criações recebem `requestKey` UUID para evitar duplicação em reenvios. Edições/exclusões usam `version` para impedir sobrescrita por outra sessão. Erros possuem `error.message`; detalhes SQL e credenciais não são enviados ao navegador.

Exemplo de criação (sessão autorizada):

```json
{
  "kind": "daily",
  "date": "2026-11-12",
  "title": "Futebol de quinta",
  "amount": "30.00",
  "requestKey": "4cf00f33-cb3a-4ed1-b2d9-e1b004665a53",
  "participants": [
    {"personId": 1, "amount": "30.00", "paid": false},
    {"name": "Novo participante", "amount": "30.00", "paid": true, "paidAt": "2026-11-12"}
  ]
}
```

Pessoas novas são criadas dentro do salvamento do evento. Adicionar/remover participantes ou alternar pagamentos durante a edição não faz escrita. Cancelar descarta o rascunho e pede confirmação quando há alterações. Navegar para fora ou fechar a aba também protege o rascunho.

No formulário de mensalidades, **Importar lista do mês anterior** busca o mês imediatamente anterior à referência escolhida (inclusive dezembro ao cadastrar janeiro). A opção copia pessoas e valores individuais, mantém a identificação do mês que está sendo editado e inicia todos os pagamentos como **Não pago**, sem datas de pagamento antigas. Substituir uma lista já preenchida exige confirmação. A cópia permanece em edição até clicar em **Salvar**; **Cancelar** não altera o banco. Se não houver mensalidade no mês anterior, o formulário é mantido e uma mensagem explica a ausência.

## Estrutura e banco

```text
api/
  public/                  entrada HTTP; único diretório PHP público
  src/Core/                ambiente, PDO, HTTP, rotas, migrations
  src/Controllers/         controladores REST
  src/Services/            autenticação, lançamentos, financeiro, importação
  src/Repositories/        acesso aos dados e auditoria
  src/Domain/              validações e precisão monetária
  migrations/              SQL versionado, aditivo e com checksum
  tests/                   validações unitárias, preparação e histórico
  console.php              migrations, primeiro admin, saldo inicial, importação
pelada-front/src/app/
  core/                    modelos, serviços HTTP, autenticação e guards
  shared/                  filtro de período e consulta de eventos reutilizável
  pages/                   saldo, mensalistas, diaristas, churrasco, login, gerenciamento
legacy/                    originais, extração, proposta consistente e revisão
scripts/                   inicialização, administração, preview e testes
deploy/                    PHP-FPM, Nginx, Dockerfiles
```

Tabelas: `users`, `people`, `events`, `event_participants`, `expenses`, `financial_config`, `login_attempts`, `audit_logs`, `legacy_imports`, `schema_migrations`. `events.kind` distingue os três módulos sem duplicar estruturas. `event_participants` é a relação N:N entre pessoas e eventos e guarda valor/status/data individual. Eventos e gastos referenciam o usuário responsável; auditoria guarda os estados antes/depois. Há FKs com `RESTRICT`, índices por período, unicidade de mensalidade por mês, evento por tipo/data/título e participante por evento. Gastos podem repetir valor/data porque despesas distintas podem ser legítimas; reenvios da mesma operação são deduplicados por UUID.

## Docker e produção

Os arquivos Docker estão preparados; a execução Docker não foi validada neste ambiente (Docker não está instalado). Use:

```bash
cp .env.example .env
# Preencha DB_PASSWORD e DB_ROOT_PASSWORD com segredos distintos.
docker compose up --build -d
docker compose exec -T api php console.php migrate
# Crie o primeiro administrador por stdin e importe o histórico, como acima.
```

A aplicação usa a mesma origem para Angular e `/api`; o banco não publica porta para o host. O Compose é uma configuração local em `127.0.0.1:8080`. Em produção, configure HTTPS no proxy, `APP_ENV=production`, `SESSION_SECURE=true`, `APP_ORIGIN` com o domínio exato, volume persistente de sessões e segredos fora do repositório. O back-end recusa cookies inseguros em produção. O PHP limita requisições JSON e valida autorização em todas as escritas. O Nginx envia cabeçalhos CSP e impede exposição de arquivos ocultos.

O servidor SSR/Express de demonstração foi removido: o build do Angular é estático e o servidor da aplicação é PHP. Node não é necessário em produção após o build.

## Backup e restauração

Use `mariadb-dump --single-transaction --routines --triggers --default-character-set=utf8mb4 --result-file=backup.sql -u USUARIO -p BANCO` com a senha solicitada no prompt. O `--result-file` evita alteração de encoding pelo redirecionamento do PowerShell. Faça backup também de `legacy/original`, das configurações protegidas e da referência do commit implantado. Guarde cópias criptografadas fora do servidor, com retenção definida.

Teste a restauração em **outro banco vazio**: no cliente MariaDB, selecione o banco de destino e execute `SOURCE caminho/backup.sql`. Confira contagem de eventos/participações/gastos e os indicadores de outubro (R$ 1.765,65) antes de qualquer troca. Não restaure sobre produção sem backup e autorização. Migrations MariaDB DDL fazem commit implícito; os arquivos são aditivos e reexecutáveis, sem rollback destrutivo automático. Os procedimentos de backup/restauração estão documentados, mas não foi feita restauração de produção.

## Testes

```powershell
# Angular
cd pelada-front
npm run typecheck
npm run build
$env:CHROME_BIN = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run test:ci

# A partir da raiz; MariaDB de teste em 127.0.0.1:3307
$env:PHP_EXTENSION_DIR = Join-Path (Split-Path (Get-Command php).Source) 'ext'
node scripts/test-api.mjs
node scripts/test-browser.mjs
```

Os testes criam bancos `pelada_test_<hex aleatório>`, recusam nomes fora desse padrão e removem somente esses bancos. Não usam nem apagam `pelada_local`. Configure `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER`, `TEST_DB_PASSWORD`, `PHP_BIN`, `PHP_EXTENSION_DIR` e `CHROME_BIN` quando necessário. As imagens da verificação responsiva são salvas em `test-results/` (ignorado pelo Git).

Resultados e limites estão no [relatório de entrega](docs/ENTREGA.md). O teste de responsividade usa Chrome com quatro viewports; não substitui testes em aparelhos Android/iPhone ou Safari reais.
