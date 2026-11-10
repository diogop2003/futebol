import { Component } from '@angular/core';
import { EventListComponent } from '../../shared/event-list.component';

@Component({
  selector: 'app-diaristas',
  standalone: true,
  imports: [EventListComponent],
  templateUrl: './diaristas.component.html',
  styleUrl: './diaristas.component.css'
})
export class DiaristasComponent {

}
