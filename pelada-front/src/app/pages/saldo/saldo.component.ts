import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api.service';
import { CATEGORY_LABELS, EVENT_LABELS, FinanceSummary } from '../../core/models';
import { PeriodPage } from '../../shared/period-page';
import { PeriodFilterComponent } from '../../shared/period-filter.component';

@Component({
  selector: 'app-saldo',
  standalone: true,
  imports: [CommonModule, PeriodFilterComponent],
  templateUrl: './saldo.component.html',
  styleUrl: './saldo.component.css'
})
export class SaldoComponent extends PeriodPage implements OnInit {
  private api = inject(ApiService);
  summary: FinanceSummary | null = null;
  eventLabels: Record<string, string> = EVENT_LABELS; categoryLabels: Record<string, string> = CATEGORY_LABELS;
  ngOnInit(): void {
    this.observe(p => this.api.finance(p), result => this.summary = result.data);
  }

}
