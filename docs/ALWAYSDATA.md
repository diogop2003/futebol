# Publicar a Pelada no alwaysdata Free

Este guia é para o **alwaysdata** (alwaysdata.com), no plano **Free**. Use o endereço `SUA_CONTA.alwaysdata.net` atribuído à conta. O plano é destinado a uso sem fins lucrativos e tem recursos limitados. Não é o Oracle Always Free nem o InfinityFree.

## 1. Criar a conta e o banco

1. Cadastre-se em https://www.alwaysdata.com/ e escolha Free.
2. Acesse https://admin.alwaysdata.com/.
3. Em **Environment > PHP**, selecione PHP **8.4**.
4. Em **Databases > MySQL**, crie um banco vazio (por exemplo `SUA_CONTA_pelada`) e um usuário com permissões de escrita nesse banco. Escolha MariaDB **11.4**, quando a seleção de versão estiver disponível.
5. Anote os valores reais apresentados no painel: servidor, nome do banco, usuário e senha. O servidor costuma ser `mysql-SUA_CONTA.alwaysdata.net`, porta `3306`; use os dados efetivos do painel.

## 2. Preparar os arquivos no seu computador

Com o MariaDB local em execução, na raiz do projeto:

```powershell
.\scripts\package-alwaysdata.ps1
```

O comando faz um build novo, exporta o **banco atual completo**, inclusive seu administrador e os lançamentos recentes, e monta um pacote em `.tools/alwaysdata/<data-hora>/`. O ZIP inclui a pasta `pelada/`. A pasta de envio também fica extraída ao lado do ZIP.

```text
pelada/
  public/                 única pasta pública do site
    index.html            Angular compilado
    assets/logo.png
    .htaccess             rotas do Angular e /api
    api/index.php         entrada da API, sem configurações privadas
  api/                    fonte PHP, migrations e comandos CLI
    .env.example          modelo de PRODUÇÃO, sem credenciais locais
  legacy/                 arquivos históricos preservados
  banco.sql               cópia do banco atual, fora da pasta pública
  LEIA-ME.md
```

O pacote não inclui `api/.env` local, `.git`, `node_modules` ou o executável/diretório de dados do MariaDB. O backup inclui hashes de senha e dados do grupo: mantenha o ZIP e o SQL privados, fora do Git e fora de `public/`.

Evite novos lançamentos entre o backup e a importação. Depois da mudança, use o site publicado como fonte dos novos lançamentos; os bancos local e remoto não se sincronizam automaticamente.

## 3. Enviar a pasta por SFTP

Em **Remote access > SSH/SFTP**, habilite o acesso da sua conta. Em um cliente SFTP, como WinSCP ou FileZilla, configure:

| Campo | Valor |
| --- | --- |
| Protocolo | SFTP |
| Servidor | `ssh-SUA_CONTA.alwaysdata.net` |
| Porta | `22` |
| Usuário | o usuário SSH indicado no painel |
| Senha | a senha desse usuário SSH |

Envie a pasta **pelada** inteira para **`/home/SUA_CONTA/`**. O resultado deve ser `/home/SUA_CONTA/pelada/public/index.html`. Preserve arquivos iniciados por ponto, em especial `public/.htaccess` e `api/.env.example`.

Se preferir enviar o ZIP, coloque-o em `/home/SUA_CONTA/` e extraia via SSH:

```bash
cd /home/SUA_CONTA
unzip pelada-alwaysdata.zip
```

Faça a primeira publicação em uma pasta nova. Não sobrescreva um site/banco já existente sem conferir o conteúdo e fazer backup.

## 4. Importar o banco

Abra o phpMyAdmin pelo painel (**Databases > MySQL**), selecione o banco vazio e use **Importar** para enviar o arquivo local `pelada/banco.sql` do pacote.

Isso preserva as contas, hashes de senha e os lançamentos existentes. Você continua usando o e-mail e a senha administrativos que já cadastrou. **Não execute novamente create-admin, finance-init ou a importação do histórico**: os dados já estão nesse backup.

O SQL exportado não contém DROP TABLE nem CREATE DATABASE; ele deve ser importado em um banco vazio. Se uma importação falhar, não repita em cima de tabelas parcialmente criadas: crie outro banco vazio ou investigue o erro antes de prosseguir.

Como alternativa ao phpMyAdmin, no SSH:

```bash
mysql -h mysql-SUA_CONTA.alwaysdata.net -u USUARIO_DO_BANCO -p NOME_DO_BANCO < /home/SUA_CONTA/pelada/banco.sql
```

A senha do banco é solicitada no prompt. Substitua os valores pelos informados no painel.

## 5. Configurar a API de produção

No servidor, copie `/home/SUA_CONTA/pelada/api/.env.example` para **`/home/SUA_CONTA/pelada/api/.env`** e edite esse novo arquivo:

```dotenv
APP_ENV=production
APP_ORIGIN=https://SUA_CONTA.alwaysdata.net
SESSION_SECURE=true
SESSION_IDLE_SECONDS=1800
SESSION_MAX_SECONDS=28800
DB_HOST=mysql-SUA_CONTA.alwaysdata.net
DB_PORT=3306
DB_DATABASE=NOME_DO_BANCO
DB_USERNAME=USUARIO_DO_BANCO
DB_PASSWORD=SENHA_DO_BANCO
```

`APP_ORIGIN` deve ser o endereço real, sem barra no final. Use a senha do banco, que pode ser diferente da senha do painel, do SSH e do administrador da Pelada. Salve em UTF-8 sem BOM e mantenha `.env` fora da pasta pública. Pelo SSH, limite a leitura desse arquivo ao usuário da conta:

```bash
chmod 600 /home/SUA_CONTA/pelada/api/.env
```

O código mantém o fuso dos lançamentos em America/Sao_Paulo. A origem única preserva `/api` e os cookies de autenticação; não precisa de um segundo subdomínio para o back-end.

## 6. Configurar o site

Em **Web > Sites**, edite o site do endereço gratuito existente (ou adicione um site se não houver):

| Campo | Valor |
| --- | --- |
| Endereço | `SUA_CONTA.alwaysdata.net` |
| Tipo | **PHP** |
| Diretório raiz / root directory | **`/home/SUA_CONTA/pelada/public`** |
| PHP | 8.4 ou versão padrão da conta configurada em 8.4 |

Em **SSL**, marque **Force HTTPS** e salve. Mantenha o cache HTTP da hospedagem desativado para as rotas `/api` (na primeira publicação, deixe desativado para todo o site).

É essencial selecionar **public** como raiz. A pasta pai contém o banco, as configurações e o código PHP privado. As regras `.htaccess` encaminham `/api/...` para o PHP e as demais rotas para o Angular, incluindo acesso direto a `/login` e `/gerenciamento/monthly`.

## 7. Conferir a publicação

Abra no navegador:

- `https://SUA_CONTA.alwaysdata.net/`
- `https://SUA_CONTA.alwaysdata.net/login`
- `https://SUA_CONTA.alwaysdata.net/api/session` — deve responder JSON.
- `https://SUA_CONTA.alwaysdata.net/api/finance?year=2026&month=10` — compare com o ambiente local e os lançamentos atuais.

Entre com seu administrador existente. Consulte outubro, confira as listas e o saldo; depois teste o gerenciamento com um rascunho e cancele para não criar lançamentos de teste no banco real. Recarregue uma rota interna para conferir o fallback do Angular. `/api/.env`, `/banco.sql` e `/api/src/Core/Env.php` não devem expor arquivos privados.

Se ocorrer erro 500, consulte os logs do site no painel e `/home/SUA_CONTA/admin/logs/`. Erro 503 da API geralmente exige conferir conexão/permissões do banco. Se o login retornar erro de origem/CSRF, confira HTTPS e o valor exato de `APP_ORIGIN`.

Depois de importar e validar, remova do servidor o ZIP e o SQL enviados, mantendo uma cópia privada do backup no seu computador. Preserve `api/.env` e o banco remoto nas atualizações futuras; não reimporte um backup antigo sobre os dados novos de produção.

## Fontes e alcance da validação

- [Criar/configurar site](https://help.alwaysdata.com/en/docs/web-hosting/sites/add-a-site/).
- [PHP e versões](https://help.alwaysdata.com/en/docs/web-hosting/languages/php/configuration/).
- [MariaDB e dados de conexão](https://help.alwaysdata.com/en/docs/web-hosting/databases/mariadb/).
- [SFTP](https://help.alwaysdata.com/en/docs/web-hosting/remote-access/sftp/).
- [Forçar HTTPS](https://help.alwaysdata.com/en/docs/web-hosting/sites/ssl-tls/redirect-http-to-https/).

O pacote é preparado localmente. A criação da conta, os dados do painel e a verificação final no endereço remoto dependem da sua conta alwaysdata. Não foi feita publicação automática nem alteração de infraestrutura externa.
