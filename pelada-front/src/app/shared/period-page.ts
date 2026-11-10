import { Directive, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, BehaviorSubject, combineLatest, catchError, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import { Period } from '../core/models';
import { errorMessage } from '../core/api.service';
import { currentPeriod } from './period-filter.component';

@Directive()
export abstract class PeriodPage {
  protected route = inject(ActivatedRoute);
  protected router = inject(Router);
  protected destroyRef = inject(DestroyRef);
  period = currentPeriod();
  loading = false; error = '';
  private refreshChanges = new BehaviorSubject(0);
  refresh(): void { this.refreshChanges.next(this.refreshChanges.value + 1); }
  changePeriod(period: Period): void { void this.router.navigate([], {relativeTo: this.route, queryParams: period, queryParamsHandling: 'merge'}); }
  protected observe<T>(load: (period: Period) => Observable<T>, accept: (value: T) => void): void {
    const periods = this.route.queryParamMap.pipe(
      map(params => {
        const fallback = currentPeriod(), month = Number(params.get('month')), year = Number(params.get('year'));
        return {month: month >= 1 && month <= 12 && Number.isInteger(month) ? month : fallback.month, year: year >= 2000 && year <= 2100 && Number.isInteger(year) ? year : fallback.year};
      }), distinctUntilChanged((a,b) => a.month === b.month && a.year === b.year));
    combineLatest([periods, this.refreshChanges]).pipe(
      map(([period]) => period),
      tap(p => { this.period = p; this.loading = true; this.error = ''; }),
      switchMap(p => load(p).pipe(map(value => ({value})), catchError(error => {this.error = errorMessage(error); return of(null);}))),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => { this.loading = false; if (result) accept(result.value); });
  }
}
