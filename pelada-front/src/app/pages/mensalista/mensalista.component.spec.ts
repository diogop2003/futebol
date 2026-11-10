import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MensalistaComponent } from './mensalista.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

describe('MensalistaComponent', () => {
  let component: MensalistaComponent;
  let fixture: ComponentFixture<MensalistaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MensalistaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MensalistaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
