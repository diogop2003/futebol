import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiaristasComponent } from './diaristas.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

describe('DiaristasComponent', () => {
  let component: DiaristasComponent;
  let fixture: ComponentFixture<DiaristasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiaristasComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
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
