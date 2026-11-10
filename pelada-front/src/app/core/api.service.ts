import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { EventDraft, EventKind, Expense, ExpenseDraft, FinanceSummary, FootballEvent, Period, Person } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  events(kind: EventKind, period: Period) { return this.http.get<{data: FootballEvent[]}>('/api/events', { params: { kind, ...period } }); }
  expenses(period: Period) { return this.http.get<{data: Expense[]}>('/api/expenses', { params: { ...period } }); }
  finance(period: Period) { return this.http.get<{data: FinanceSummary}>('/api/finance', { params: { ...period } }); }
  people(search: string) { return this.http.get<{data: Person[]}>('/api/people', { params: { search } }).pipe(catchError(e => this.failure(e))); }
  saveEvent(draft: EventDraft) { return this.write('events', draft.id, draft); }
  saveExpense(draft: ExpenseDraft) { return this.write('expenses', draft.id, draft); }
  delete(resource: 'events' | 'expenses', id: number, version: number) {
    return this.http.delete(`/api/${resource}/${id}`, { body: {version}, headers: this.auth.headers() }).pipe(catchError(e => this.failure(e)));
  }
  private write(resource: string, id: number | undefined, body: unknown) {
    return this.http.request<{id: number; message: string}>(id ? 'PUT' : 'POST', `/api/${resource}${id ? '/' + id : ''}`, { body, headers: this.auth.headers() }).pipe(catchError(e => this.failure(e)));
  }
  private failure(error: HttpErrorResponse) { if (error.status === 401) this.auth.expire(); return throwError(() => error); }
}
export function errorMessage(error: unknown): string {
  return error instanceof HttpErrorResponse && typeof error.error?.error?.message === 'string' ? error.error.error.message : 'Não foi possível comunicar com o servidor. Tente novamente.';
}
