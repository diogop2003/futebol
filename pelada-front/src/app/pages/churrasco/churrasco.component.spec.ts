import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChurrascoComponent } from './churrasco.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

describe('ChurrascoComponent', () => {
  let component: ChurrascoComponent;
  let fixture: ComponentFixture<ChurrascoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChurrascoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
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
