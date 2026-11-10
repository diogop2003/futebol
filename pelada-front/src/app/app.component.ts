import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { errorMessage } from './core/api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'pelada-web';
  auth = inject(AuthService); private router = inject(Router);
  error = ''; loggingOut = false;
  ngOnInit(): void { this.auth.load().subscribe({error: () => this.auth.expire()}); }
  async logout(): Promise<void> {
    if (this.loggingOut) return;
    // Navigation runs the unsaved changes guard before ending the session.
    if (!await this.router.navigate(['/'])) return;
    this.loggingOut = true; this.error = '';
    this.auth.logout().subscribe({next: () => this.loggingOut = false, error: e => {this.error = errorMessage(e); this.loggingOut = false;}});
  }
}
