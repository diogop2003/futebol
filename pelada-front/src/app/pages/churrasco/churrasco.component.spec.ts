import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChurrascoComponent } from './churrasco.component';

describe('ChurrascoComponent', () => {
  let component: ChurrascoComponent;
  let fixture: ComponentFixture<ChurrascoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChurrascoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChurrascoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
