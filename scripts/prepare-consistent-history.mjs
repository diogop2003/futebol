import {readFileSync,writeFileSync} from 'node:fs';
const input=new URL('../legacy/extracted.json',import.meta.url);
const manifest=JSON.parse(readFileSync(input,'utf8'));
const pending=manifest.events.filter(e=>!e.approved);
manifest.events=manifest.events.filter(e=>e.approved);
writeFileSync(new URL('../legacy/consistent.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
console.log(`${manifest.events.length} eventos e ${manifest.expenses.length} gastos preparados; ${pending.length} eventos preservados para revisão em extracted.json e REVIEW.md.`);
