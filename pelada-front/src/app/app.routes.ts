import { Routes } from '@angular/router';
import { SaldoComponent } from './pages/saldo/saldo.component';
import { DiaristasComponent } from './pages/diaristas/diaristas.component';
import { MensalistaComponent } from './pages/mensalista/mensalista.component';
import { ChurrascoComponent } from './pages/churrasco/churrasco.component';

export const routes: Routes = [
  { path: '', component: SaldoComponent },
  { path: 'diaristas', component: DiaristasComponent },
  { path: 'mensalistas', component: MensalistaComponent },
  { path: 'churrasco', component: ChurrascoComponent },
];
