import { Routes } from '@angular/router';
import { SaldoComponent } from './pages/saldo/saldo.component';
import { DiaristasComponent } from './pages/diaristas/diaristas.component';
import { MensalistaComponent } from './pages/mensalista/mensalista.component';
import { ChurrascoComponent } from './pages/churrasco/churrasco.component';
import { LoginComponent } from './pages/login/login.component';
import { authGuard, unsavedGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', component: SaldoComponent },
  { path: 'diaristas', component: DiaristasComponent },
  { path: 'mensalistas', component: MensalistaComponent },
  { path: 'churrasco', component: ChurrascoComponent },
  { path: 'login', component: LoginComponent },
  { path: 'gerenciamento', redirectTo: 'gerenciamento/monthly', pathMatch: 'full' },
  ...(['monthly','daily','barbecue','expenses'] as const).map(module => ({
    path: `gerenciamento/${module}`, loadComponent: () => import('./pages/management/management.component').then(m => m.ManagementComponent),
    canActivate: [authGuard], canDeactivate: [unsavedGuard], data: {module}
  })),
  { path: '**', redirectTo: '' },
];
