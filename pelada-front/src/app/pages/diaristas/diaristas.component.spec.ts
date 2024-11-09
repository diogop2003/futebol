import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiaristasComponent } from './diaristas.component';

describe('DiaristasComponent', () => {
  let component: DiaristasComponent;
  let fixture: ComponentFixture<DiaristasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiaristasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiaristasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
