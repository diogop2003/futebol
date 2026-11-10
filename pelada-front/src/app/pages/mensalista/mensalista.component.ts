import { Component } from '@angular/core';
import { EventListComponent } from '../../shared/event-list.component';

@Component({
  selector: 'app-mensalista',
  standalone: true,
  imports: [EventListComponent],
  templateUrl: './mensalista.component.html',
  styleUrl: './mensalista.component.css'
})
export class MensalistaComponent {

}
