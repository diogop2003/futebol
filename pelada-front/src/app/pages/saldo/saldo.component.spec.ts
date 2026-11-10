import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SaldoComponent } from './saldo.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

describe('SaldoComponent', () => {
  let component: SaldoComponent;
  let fixture: ComponentFixture<SaldoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaldoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SaldoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
