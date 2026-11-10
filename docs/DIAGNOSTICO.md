# Diagnóstico e decisões de implementação

## Estado encontrado

- Um único projeto `pelada-front`, Angular 18.2 instalado, componentes standalone, Tailwind, roteamento público e scaffolding SSR/Express.
- Quatro páginas: saldo (`/`), mensalistas (`/mensalistas`), diaristas (`/diaristas`) e churrasco (`/churrasco`). Todas repetiam o cabeçalho e usavam links que recarregavam a página.
- Dados financeiros e listas escritos diretamente nos templates. Classes verdes/vermelhas representavam pagamentos. Nenhum serviço HTTP, autenticação, formulário administrativo, banco ou API.
- As páginas não possuíam dependências de dados entre si: o resumo financeiro era outro conjunto de valores fixos, sem derivação das listas.
- Os testes existentes eram scaffolding de criação de componentes; o teste raiz ainda esperava o título de boas-vindas gerado pelo Angular.
- Não foram encontrados arquivos AGENTS.md aplicáveis nem alterações preexistentes no Git.

## Regras existentes identificadas

- Mensalidade por mês, diárias por data e churrascos por data, com nomes e pagamentos individuais.
- Churrascos podem ter valores diferentes por participante/categoria; o modelo permite preço individual além do preço de referência.
- Existem churrascos distintos na mesma data, como o evento e o pagamento do Tião em 26/03/2026. Um título diferencia esses eventos.
- Uma pessoa pode participar de vários eventos. Unicidade de pessoa não significa unicidade de participação no histórico.
- Há saldo acumulado no HTML. O responsável confirmou que R$ 1.985,48 é o saldo de setembro/2026, R$ 1.765,65 é o fechamento de outubro/2026 e que o acompanhamento deve começar em outubro/2026.
- Alguns totais históricos não conferem com as listas. Nenhuma correção foi inferida. Dois cards de diárias também têm a mesma data e título; ambos foram preservados para revisão.

## Arquitetura aplicada

O Angular conserva as rotas e a linguagem visual de cartões brancos, fundo claro e navegação cinza. O cabeçalho passou para a raiz; as três consultas de participantes compartilham o mesmo componente. Filtro mês/ano é reutilizado e persistido na URL. Consultas antigas são canceladas quando o período muda.

A API PHP separa HTTP/rotas, controladores, serviços, repositório e domínio. PDO usa consultas preparadas reais; as operações sobre evento/participantes são transacionais. A base MariaDB normaliza pessoas, eventos, participações e gastos. O serviço financeiro consulta os lançamentos sob um snapshot consistente e não mantém totais redundantes.

As participações carregam valor individual, situação e data de pagamento. Participantes novos são criados apenas no salvamento completo. Cancelar é uma operação exclusivamente de estado do Angular. Exclusões são lógicas; alterações e exclusões possuem auditoria e checagem da versão lida.

A sessão usa cookie HttpOnly, SameSite Strict, renovação no login/logout, expiração por inatividade e duração máxima. Login e escritas requerem token CSRF. Autorizações são reavaliadas no banco, inclusive status ativo e papel. O bootstrap administrativo é CLI, com senha própria via stdin. Não há registro público.

O scaffolding SSR/Express foi retirado para que a aplicação seja servida como Angular estático + PHP-FPM. Isso evita um segundo back-end e remove dependências de servidor sem função no sistema solicitado. Após auditoria, Angular e ferramentas foram atualizados para a linha 21; Node/TypeScript/Zone foram alinhados à compatibilidade publicada.

## Preservação e mapeamento

| Fonte original | Destino |
| --- | --- |
| Card mensalista | `events(kind=monthly)` com dia 01 do mês |
| Card diarista | `events(kind=daily)` com a data do título |
| Card churrasco | `events(kind=barbecue)` com data e título |
| Nome em `<li>` | `people` + `event_participants` |
| Classe verde/vermelha | `event_participants.paid` |
| Preço do card / preço revisado | valor de referência + valor individual |
| Quatro linhas de despesas do saldo | `expenses` em outubro/2026, data exata `NULL` |
| Saldo anterior confirmado | `financial_config` em 01/10/2026 |
| Valores de receita no resumo | Apenas conferência; não criam receitas adicionais |

Foram preservados os quatro HTML originais, incluindo duplicidades e divergências. SHA-256 verifica as origens e chaves de importação impedem reexecuções duplicadas. Os arquivos originais têm conversão de finais de linha desabilitada no Git para manter os hashes entre Windows/Linux.

## Limites explícitos

Os 17 registros pendentes não são descartados nem tratados como zero. Eles estão fora da importação consistente e precisam de revisão humana. O histórico anterior a outubro tem consultas de movimento, mas não se inventa saldo acumulado ou despesas ausentes. Datas exatas antigas não são preenchidas artificialmente. Não houve acesso ou alteração de produção.
