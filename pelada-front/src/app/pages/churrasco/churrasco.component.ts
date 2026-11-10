import { Component } from '@angular/core';
import { EventListComponent } from '../../shared/event-list.component';

@Component({
  selector: 'app-churrasco',
  standalone: true,
  imports: [EventListComponent],
  templateUrl: './churrasco.component.html',
  styleUrl: './churrasco.component.css'
})
export class ChurrascoComponent {

}
