import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../core/api.service';
import { EVENT_LABELS, EventKind, FootballEvent } from '../core/models';
import { PeriodFilterComponent } from './period-filter.component';
import { PeriodPage } from './period-page';

@Component({
  selector: 'app-event-list', standalone: true, imports: [CommonModule, PeriodFilterComponent],
  template: `<div class="page-heading"><div><p class="eyebrow">Consulta pública</p><h1>{{ labels[kind] }}</h1><p>Participantes e pagamentos do período selecionado.</p></div></div>
    <app-period-filter [period]="period" (periodChange)="changePeriod($event)" />
    <div aria-live="polite" [attr.aria-busy]="loading">
    @if (loading) { <p class="notice">Carregando registros…</p> }
    @else if (error) { <div class="notice error" role="alert">{{ error }} <button class="secondary" (click)="retry()">Tentar novamente</button></div> }
    @else if (!events.length) { <div class="empty"><h2>Nenhum registro neste período</h2><p>Selecione outro mês e ano para consultar o histórico.</p></div> }
    @else { <div class="event-grid">@for (event of events; track event.id) {
      <article class="card"><div class="card-heading"><h2>{{ event.title || labels[kind] }}</h2><time [attr.datetime]="event.date">{{ event.date | date:'dd/MM/yyyy':'UTC' }}</time></div>
        <p>Valor de referência: <strong>{{ event.amount | currency:'BRL' }}</strong> · {{ event.totals.count }} participantes</p>
        <dl class="mini-stats"><div><dt>Previsto</dt><dd>{{ event.totals.expected | currency:'BRL' }}</dd></div><div><dt>Recebido</dt><dd class="positive">{{ event.totals.received | currency:'BRL' }}</dd></div><div><dt>Pendente</dt><dd class="pending">{{ event.totals.pending | currency:'BRL' }}</dd></div></dl>
        <ul class="participants">@for (person of event.participants; track person.personId) {
          <li><span>{{ person.name }}<small>{{ person.amount | currency:'BRL' }}@if (person.paidAt) { · Pago em {{ person.paidAt | date:'dd/MM/yyyy':'UTC' }} }</small></span><span class="badge" [class.paid]="person.paid" [class.unpaid]="!person.paid">{{ person.paid ? 'Pago' : 'Não pago' }}</span></li>
        }</ul>
      </article>
    }</div> }</div>`
})
export class EventListComponent extends PeriodPage implements OnInit {
  @Input({required: true}) kind!: EventKind;
  private api = inject(ApiService);
  events: FootballEvent[] = []; labels = EVENT_LABELS;
  ngOnInit(): void { this.observe(p => this.api.events(this.kind, p), result => this.events = result.data); }
  retry(): void { this.refresh(); }
}
