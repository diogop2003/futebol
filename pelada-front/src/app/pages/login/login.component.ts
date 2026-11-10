import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errorMessage } from '../../core/api.service';

@Component({
  selector: 'app-login', standalone: true, imports: [FormsModule],
  template: `<div class="login-wrap"><section class="card"><p class="eyebrow">Acesso restrito</p><h1>Entrar no gerenciamento</h1><p>As consultas financeiras continuam disponíveis sem login.</p>
    @if (error) { <p class="notice error" role="alert">{{ error }}</p> }
    <form #form="ngForm" (ngSubmit)="submit()">
      <label>E-mail<input name="email" type="email" [(ngModel)]="email" required email maxlength="190" autocomplete="username" /></label>
      <label>Senha<input name="password" type="password" [(ngModel)]="password" required maxlength="72" autocomplete="current-password" /></label>
      <button type="submit" [disabled]="!ready || busy || form.invalid">{{ busy ? 'Entrando…' : 'Entrar' }}</button>
    </form>
    @if (!ready && !busy) { <button class="secondary" (click)="load()">Reconectar</button> }
  </section></div>`
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService); private router = inject(Router);
  email = ''; password = ''; error = ''; ready = false; busy = false;
  ngOnInit(): void { this.load(); }
  load(): void { this.error = ''; this.auth.load().subscribe({next: s => {this.ready = true; if (s.user) void this.router.navigate(['/gerenciamento/monthly']);}, error: e => {this.auth.expire(); this.error = errorMessage(e);}}); }
  submit(): void {
    if (!this.ready || this.busy) return;
    this.busy = true; this.error = '';
    this.auth.login(this.email, this.password).subscribe({next: () => {this.password = ''; void this.router.navigate(['/gerenciamento/monthly']);}, error: e => {this.busy = false; this.password = ''; this.error = errorMessage(e); if (e.status === 403) {this.auth.expire(); this.ready = false;}}});
  }
}
