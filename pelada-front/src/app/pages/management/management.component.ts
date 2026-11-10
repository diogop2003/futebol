import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import { CATEGORY_LABELS, EVENT_LABELS, EventDraft, EventKind, Expense, ExpenseDraft, FootballEvent, Person } from '../../core/models';
import { PeriodPage } from '../../shared/period-page';
import { MONTHS, PeriodFilterComponent } from '../../shared/period-filter.component';

@Component({
  selector: 'app-management', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, PeriodFilterComponent],
  templateUrl: './management.component.html'
})
export class ManagementComponent extends PeriodPage implements OnInit {
  private api = inject(ApiService);
  module: EventKind | 'expenses' = 'monthly';
  labels = EVENT_LABELS; categories = CATEGORY_LABELS; months = MONTHS;
  events: FootballEvent[] = []; expenses: Expense[] = [];
  expenseSummary: Record<string, string> = {}; expenseGrandTotal = '0.00';
  event: EventDraft | null = null; expense: ExpenseDraft | null = null;
  formMonth = this.period.month; formYear = this.period.year;
  people: Person[] = []; search = ''; newName = ''; success = ''; saving = false;
  importing = false; importNotice = '';
  baseline = ''; private searchChanges = new Subject<string>();
  ngOnInit(): void {
    this.module = this.route.snapshot.data['module'];
    this.observe<{data: Expense[] | FootballEvent[]}>(p => this.module === 'expenses' ? forkJoin({list: this.api.expenses(p), finance: this.api.finance(p)}).pipe(map(r => { this.expenseSummary = r.finance.data.categories; this.expenseGrandTotal = r.finance.data.expenses; return r.list; })) : this.api.events(this.module, p), result => {
      if (this.module === 'expenses') this.expenses = result.data as Expense[]; else this.events = result.data as FootballEvent[];
    });
    this.searchChanges.pipe(debounceTime(200), distinctUntilChanged(), switchMap(search => this.api.people(search).pipe(catchError(() => of({data: []})))), takeUntilDestroyed(this.destroyRef)).subscribe(r => this.people = r.data);
  }
  get title(): string { return this.module === 'expenses' ? 'Gastos' : this.labels[this.module]; }
  get dirty(): boolean { return !!(this.event || this.expense) && this.snapshot() !== this.baseline; }
  private snapshot(): string { return JSON.stringify({event: this.event, expense: this.expense, month: this.formMonth, year: this.formYear}); }
  canLeave(): boolean { return !this.saving && (!this.dirty || window.confirm('Existem alterações não salvas. Deseja descartá-las?')); }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent): void { if (this.dirty || this.saving) {event.preventDefault(); event.returnValue = ''; } }
  newRecord(): void {
    if (this.importing || !this.canLeave()) return;
    this.reset(); this.formMonth = this.period.month; this.formYear = this.period.year;
    const date = `${this.formYear}-${String(this.formMonth).padStart(2,'0')}-01`;
    if (this.module === 'expenses') this.expense = {date, month: this.formMonth, year: this.formYear, amount: '', category: 'field', description: '', requestKey: crypto.randomUUID()};
    else this.event = {kind: this.module, date, title: '', amount: '', participants: [], requestKey: crypto.randomUUID()};
    this.baseline = this.snapshot();
  }
  editEvent(row: FootballEvent): void {
    if (!this.canLeave()) return;
    this.reset(); this.event = {...structuredClone(row), requestKey: crypto.randomUUID()};
    this.formMonth = Number(row.date.slice(5,7)); this.formYear = Number(row.date.slice(0,4)); this.baseline = this.snapshot();
  }
  editExpense(row: Expense): void {
    if (!this.canLeave()) return;
    this.reset(); this.expense = {...row, date: row.date ?? '', month: Number(row.referenceDate.slice(5,7)), year: Number(row.referenceDate.slice(0,4)), requestKey: crypto.randomUUID()}; this.baseline = this.snapshot();
  }
  cancel(): void { if (this.canLeave()) this.reset(); }
  private reset(): void { this.event = null; this.expense = null; this.error = ''; this.success = ''; this.importNotice = ''; this.people = []; this.search = ''; this.newName = ''; this.baseline = ''; }
  importPreviousMonth(): void {
    const draft = this.event;
    if (!draft || draft.kind !== 'monthly' || this.saving || this.importing) return;
    this.error = ''; this.importNotice = '';
    if (!Number.isInteger(this.formMonth) || this.formMonth < 1 || this.formMonth > 12 || !Number.isInteger(this.formYear) || this.formYear < 2000 || this.formYear > 2100) {
      this.error = 'Selecione um mês e ano de referência válidos antes de importar.'; return;
    }
    const month = this.formMonth === 1 ? 12 : this.formMonth - 1;
    const year = this.formMonth === 1 ? this.formYear - 1 : this.formYear;
    if (year < 2000) { this.error = 'O mês anterior está fora do histórico disponível (a partir de 2000).'; return; }
    const label = `${this.months[month - 1].toLowerCase()}/${year}`;
    this.importing = true;
    this.api.events('monthly', {month, year}).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.importing = false)).subscribe({
      next: result => {
        if (this.event !== draft) return;
        const source = result.data[0];
        if (!source?.participants.length) { this.error = `Não há lista de mensalidades para importar de ${label}.`; return; }
        if ((draft.participants.length > 0 || (draft.amount !== '' && this.normalize(draft.amount) !== source.amount)) && !window.confirm('Importar a lista do mês anterior substituirá os participantes e os valores deste formulário. Todos os pagamentos ficarão como Não pago. Deseja continuar?')) return;
        draft.amount = source.amount;
        draft.participants = source.participants.map(person => ({personId: person.personId, name: person.name, amount: person.amount, paid: false, paidAt: null}));
        this.importNotice = `Lista de ${label} copiada: ${draft.participants.length} participantes. Todos os pagamentos estão como Não pago. Revise e clique em Salvar para gravar.`;
      },
      error: error => this.error = errorMessage(error)
    });
  }
  findPeople(): void { this.searchChanges.next(this.search); }
  addPerson(person?: Person): void {
    if (!this.event || this.saving) return;
    const name = (person?.name ?? this.newName).trim().replace(/\s+/g, ' ');
    if (!name) return;
    if (this.event.participants.some(p => person ? p.personId === person.id : p.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) {this.error = 'Esse participante já está nesta lista.'; return;}
    this.event.participants.push({...(person ? {personId: person.id} : {}), name, amount: this.event.amount || '0.00', paid: false, paidAt: null});
    this.newName = ''; this.search = ''; this.people = []; this.error = '';
  }
  applyAmount(): void { if (this.event && window.confirm('Aplicar o valor de referência a todos os participantes?')) this.event.participants.forEach(p => p.amount = this.event!.amount); }
  togglePaid(index: number): void { const p = this.event!.participants[index]; p.paid = !p.paid; p.paidAt = null; }
  removePerson(index: number): void { this.event?.participants.splice(index, 1); }
  save(): void {
    if (this.saving || this.importing) return;
    this.error = ''; this.success = '';
    let request;
    if (this.event) {
      if (this.event.kind === 'monthly') this.event.date = `${this.formYear}-${String(this.formMonth).padStart(2,'0')}-01`;
      if (!this.event.participants.length) {this.error = 'Adicione pelo menos um participante.'; return;}
      this.event.amount = this.normalize(this.event.amount); this.event.participants.forEach(p => p.amount = this.normalize(p.amount));
      request = this.api.saveEvent(this.event);
    } else if (this.expense) { this.expense.amount = this.normalize(this.expense.amount); request = this.api.saveExpense(this.expense); }
    else return;
    const date = this.event?.date;
    const period = this.expense ? {month: +this.expense.month, year: +this.expense.year} : {month: Number(date!.slice(5,7)), year: Number(date!.slice(0,4))};
    this.saving = true;
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next: () => {this.saving = false; this.reset(); this.success = 'Alterações salvas com sucesso.'; if (period.month !== this.period.month || period.year !== this.period.year) this.changePeriod(period); else this.reload();}, error: e => {this.saving = false; this.error = errorMessage(e);}});
  }
  private normalize(value: string): string { return String(value).trim().replace(',', '.'); }
  remove(row: FootballEvent | Expense): void {
    if (this.saving || !this.canLeave() || !window.confirm('Confirma a exclusão deste registro? Ele deixará de compor os totais financeiros.')) return;
    this.saving = true; this.error = '';
    this.api.delete(this.module === 'expenses' ? 'expenses' : 'events', row.id, row.version).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next: () => {this.saving = false; this.reset(); this.success = 'Registro excluído.'; this.reload();}, error: e => {this.saving = false; this.error = errorMessage(e);}});
  }
  reload(): void { this.refresh(); }
  expenseTotal(category?: string): string { return category ? this.expenseSummary[category] ?? '0.00' : this.expenseGrandTotal; }
  preview(paid?: boolean): number { return (this.event?.participants ?? []).filter(p => paid === undefined || p.paid === paid).reduce((sum,p) => sum + this.toCents(this.normalize(p.amount)), 0) / 100; }
  private toCents(value: string): number { const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(value); return m ? Number(m[1])*100 + Number((m[2] ?? '').padEnd(2,'0')) : 0; }
}
