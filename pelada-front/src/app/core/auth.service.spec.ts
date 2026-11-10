import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController,provideHttpClientTesting} from '@angular/common/http/testing';
import {AuthService} from './auth.service';

describe('Validação da sessão',()=>{
  it('compartilha consultas simultâneas e revalida a sessão em navegações posteriores',()=>{
    TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});
    const auth=TestBed.inject(AuthService),http=TestBed.inject(HttpTestingController);
    auth.load().subscribe(); auth.load().subscribe();
    http.expectOne('/api/session').flush({user:{id:1,name:'Admin',email:'admin@example.test',role:'admin'},csrfToken:'first'});
    expect(auth.user()?.id).toBe(1);
    auth.load().subscribe();http.expectOne('/api/session').flush({user:null,csrfToken:'expired'});
    expect(auth.user()).toBeNull();http.verify();
  });
});
