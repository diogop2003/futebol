import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Period } from '../core/models';

export const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
export function currentPeriod(): Period {
  const parts = new Intl.DateTimeFormat('en', {timeZone: 'America/Sao_Paulo', month: 'numeric', year: 'numeric'}).formatToParts(new Date());
  return {month: Number(parts.find(p => p.type === 'month')!.value), year: Number(parts.find(p => p.type === 'year')!.value)};
}
@Component({
  selector: 'app-period-filter', standalone: true, imports: [FormsModule],
  template: `<form class="period-filter" (ngSubmit)="apply()" aria-label="Filtrar por período">
    <label>Mês<select name="month" [ngModel]="period.month" (ngModelChange)="month = +$event">
      @for (name of months; track $index) { <option [ngValue]="$index + 1">{{ name }}</option> }
    </select></label>
    <label>Ano<select name="year" [ngModel]="period.year" (ngModelChange)="year = +$event">
      @for (value of years; track value) { <option [ngValue]="value">{{ value }}</option> }
    </select></label>
    <button type="submit">Consultar</button>
  </form>`
})
export class PeriodFilterComponent {
  @Input({required: true}) period!: Period;
  @Output() periodChange = new EventEmitter<Period>();
  months = MONTHS; years = Array.from({length: 101}, (_, i) => 2000 + i);
  month?: number; year?: number;
  apply(): void { this.periodChange.emit({month: this.month ?? this.period.month, year: this.year ?? this.period.year}); this.month = this.year = undefined; }
}
