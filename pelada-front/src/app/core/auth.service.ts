import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, shareReplay, tap } from 'rxjs';
import { Session, User } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  readonly user = signal<User | null>(null);
  private token = '';
  private pending?: Observable<Session>;

  load(): Observable<Session> {
    // Share only an in-flight check. A later protected navigation must revalidate expiry/permissions.
    return this.pending ??= this.http.get<Session>('/api/session').pipe(tap(s => this.accept(s)), finalize(() => this.pending = undefined), shareReplay({ bufferSize: 1, refCount: false }));
  }
  private accept(session: Session): void { this.user.set(session.user); this.token = session.csrfToken; }
  headers(): Record<string, string> { return { 'X-CSRF-Token': this.token }; }
  login(email: string, password: string): Observable<Session> {
    return this.http.post<Session>('/api/login', { email, password }, { headers: this.headers() }).pipe(tap(s => { this.accept(s); this.pending = undefined; }));
  }
  logout(): Observable<Session> {
    return this.http.post<Session>('/api/logout', {}, { headers: this.headers() }).pipe(tap(s => { this.accept(s); this.pending = undefined; }));
  }
  expire(): void { this.user.set(null); this.token = ''; this.pending = undefined; }
}
