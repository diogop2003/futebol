import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const plain = s => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
const cents = s => Math.round(Number(s.replace(/\./g, '').replace(',', '.')) * 100);
const decimal = n => (n / 100).toFixed(2);
const hash = s => createHash('sha256').update(s).digest('hex');
const manifest = { version: 1, sources: {}, events: [], expenses: [], notes: [
  'Nomes iguais em eventos diferentes representam a mesma pessoa; a participação é independente em cada evento.',
  'Nomes repetidos no MESMO evento exigem revisão; homônimos devem receber nomes distintos, sem excluir ocorrências.',
  'Não inferir aliases como JP/Bigode ou Xande/Alexandre. Revise identidades antes de mesclar.',
  'Datas reais de pagamentos e gastos não constavam no HTML: permanecem nulas na importação.',
  'Saldo inicial confirmado pelo responsável: 1985.48 em 2026-10-01. Financeiro acumulado começa em outubro/2026.'
] };

for (const [file, kind] of [['mensalistas','monthly'], ['diaristas','daily'], ['churrasco','barbecue']]) {
  const html = readFileSync(new URL(`../legacy/original/${file}.html`, import.meta.url), 'utf8');
  manifest.sources[`${file}.html`] = hash(html);
  const blocks = [...html.matchAll(/<div class="[^"]*rounded-xl[^"]*">([\s\S]*?)(?=<div class="[^"]*rounded-xl|<\/section>|$)/g)];
  blocks.forEach((match, index) => {
    const block = match[1];
    const headings = [...block.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map(m => plain(m[1]));
    const title = headings[0];
    if (!title) throw new Error(`Card sem título: ${file}#${index + 1}`);
    let date;
    if (kind === 'monthly') {
      const m = title.match(/Mensalistas\s+(\S+)\s+(\d{4})/i);
      if (m && months.includes(m[1].toLowerCase())) date = `${m[2]}-${String(months.indexOf(m[1].toLowerCase())+1).padStart(2,'0')}-01`;
    } else {
      const m = title.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (m) date = `${m[3]}-${m[2]}-${m[1]}`;
    }
    const warnings = [];
    const prices = headings.filter(h => /^Valor/i.test(h)).flatMap(h => [...h.matchAll(/R\$\s*([\d.,]+)/g)].map(m => cents(m[1])));
    if (prices.length !== 1) warnings.push('Valor individual ausente ou preços diferentes por categoria: definir valores individuais.');
    if (!date || Number.isNaN(Date.parse(date))) warnings.push('Data não identificada.');
    const participants = [...block.matchAll(/<li([^>]*)>([\s\S]*?)<\/li>/g)].map(m => {
      const paid = m[1].includes('text-green-500') ? true : m[1].includes('text-red-500') ? false : null;
      if (paid === null) warnings.push(`Situação não identificada: ${plain(m[2])}`);
      return { name: plain(m[2]), amount: prices.length === 1 ? decimal(prices[0]) : null, paid, paidAt: null };
    });
    const names = participants.map(p => p.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
    if (new Set(names).size !== names.length) warnings.push('Nome repetido dentro do mesmo evento.');
    if (!participants.length) warnings.push('Lista de participantes vazia.');
    const declaredExpected = headings.find(h => /^Total:/i.test(h));
    const declaredReceived = headings.find(h => /(?:arrecadado|arrecadado:)/i.test(h));
    const extractMoney = value => { const m = value?.match(/(?:R\$\s*)?(-?\d[\d.,]*)/); return m ? decimal(cents(m[1])) : null; };
    const declared = { expected: extractMoney(declaredExpected), received: extractMoney(declaredReceived) };
    if (declaredReceived && declared.received === null) warnings.push('Total arrecadado não numérico.');
    if (prices.length === 1) {
      const expected = participants.length * prices[0];
      const received = participants.filter(p => p.paid).length * prices[0];
      if (declared.expected !== null && declared.expected !== decimal(expected)) warnings.push(`Previsto declarado ${declared.expected} difere da lista ${decimal(expected)}.`);
      if (declared.received !== null && declared.received !== decimal(received)) warnings.push(`Recebido declarado ${declared.received} difere da lista ${decimal(received)}.`);
    }
    manifest.events.push({ sourceKey: `${file}:${index+1}`, sourceFile: `${file}.html`, sourceHash: hash(match[0]), approved: warnings.length === 0, warnings, declared,
      data: { kind, date: date ?? null, title, amount: prices.length === 1 ? decimal(prices[0]) : null, participants } });
  });
}
const eventKeys = new Map();
for (const event of manifest.events) {
  const key = [event.data.kind, event.data.date, event.data.title].join('|');
  eventKeys.set(key, [...(eventKeys.get(key) ?? []), event]);
}
for (const group of eventKeys.values()) {
  if (group.length < 2) continue;
  for (const event of group) {
    event.warnings.push(`Outro card tem a mesma data e título (${group.map(e=>e.sourceKey).join(', ')}): revisar se é o mesmo evento ou diferenciar os títulos.`);
    event.approved = false;
  }
}
const balance = readFileSync(new URL('../legacy/original/saldo.html', import.meta.url), 'utf8');
manifest.sources['saldo.html'] = hash(balance);
const rows = [...balance.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].flatMap(m => {
  const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => plain(c[1]));
  return cells.length === 2 ? [cells] : [];
});
for (const [label, category] of [['Mensalidade do campo','field'], ['Goleiros mês','goalkeepers'], ['Gastos adicionais mês','additional'], ['Gastos churrasco mês','barbecue']]) {
  const row = rows.find(r => r[0] === label);
  if (!row) throw new Error(`Gasto histórico ausente: ${label}`);
  manifest.expenses.push({ sourceKey: `saldo:2026-10:${category}`, sourceFile: 'saldo.html', sourceHash: hash(balance), approved: true, warnings: [],
    data: { date: null, year: 2026, month: 10, amount: decimal(cents(row[1].replace('-', ''))), category, description: `${label}. Importado do saldo de outubro/2026 confirmado pelo responsável; data exata do gasto não registrada.` } });
}
manifest.balance = { openingDate: '2026-10-01', openingBalance: '1985.48', expectedClosingBalance: '1765.65', source: 'saldo.html', confirmedByOwner: true };
const target = new URL('../legacy/extracted.json', import.meta.url);
writeFileSync(target, JSON.stringify(manifest, null, 2)+'\n');
const warnings = manifest.events.filter(e => e.warnings.length);
const report = ['# Conferência do histórico', '', `Eventos extraídos: ${manifest.events.length}. Sem inconsistências detectadas: ${manifest.events.length - warnings.length}. Exigem revisão: ${warnings.length}. Gastos de outubro/2026: ${manifest.expenses.length}.`, '',
'O arquivo extracted.json é uma proposta de importação, não uma fonte de dados do Angular. Os originais em original/ permanecem intactos. Nenhum registro foi gravado por este script.', '',
'O importador bloqueia o lote inteiro se qualquer item estiver sem aprovação. Para importar somente os consistentes, gere uma cópia com os demais itens removidos; eles continuam preservados no original e no relatório. Para corrigir um item, preencha os valores, mantenha a origem e registre reviewNote e approved=true. Nenhuma correção de valores é inferida.', '',
'## Itens para revisão', '', ...warnings.map(e => `- **${e.sourceKey} — ${e.data.title}**: ${e.warnings.join(' ')}`), '',
'## Identidades', '', 'A normalização evita diferenças apenas de maiúsculas, acentos e espaços. Apelidos diferentes continuam separados. Homônimos no mesmo evento precisam de um identificador no nome (por exemplo, João — Silva e João — Souza). Participações em dias diferentes são preservadas.', '',
'## Saldo', '', 'Saldo inicial em 01/10/2026: R$ 1.985,48. Saldo final esperado de outubro: R$ 1.765,65. As receitas são importadas das listas, sem criar entradas adicionais a partir do resumo. Os quatro gastos são importados do resumo com data exata desconhecida (NULL).'];
writeFileSync(new URL('../legacy/REVIEW.md', import.meta.url), report.join('\n')+'\n');
console.log(JSON.stringify({events: manifest.events.length, reviewRequired: warnings.length, expenses: manifest.expenses.length}));
