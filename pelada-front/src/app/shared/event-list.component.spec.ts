import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { EventListComponent } from './event-list.component';

describe('Consulta pública por período', () => {
  const params = new BehaviorSubject(convertToParamMap({year:'2026',month:'10'}));
  let http: HttpTestingController;
  beforeEach(() => {
    params.next(convertToParamMap({year:'2026',month:'10'}));
    TestBed.configureTestingModule({imports:[EventListComponent], providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([]), {provide:ActivatedRoute,useValue:{queryParamMap:params}}]});
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('consulta somente o mês escolhido e cancela uma consulta antiga ao trocar o filtro', () => {
    const fixture = TestBed.createComponent(EventListComponent);
    fixture.componentRef.setInput('kind','daily'); fixture.detectChanges();
    const october = http.expectOne(r=>r.url==='/api/events' && r.params.get('month')==='10' && r.params.get('year')==='2026');
    expect(october.request.method).toBe('GET');
    params.next(convertToParamMap({year:'2026',month:'11'}));
    expect(october.cancelled).toBeTrue();
    const november = http.expectOne(r=>r.params.get('month')==='11' && r.params.get('kind')==='daily');
    november.flush({data:[]}); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhum registro neste período');
  });
  it('exibe erro da API e permite nova consulta', () => {
    const fixture = TestBed.createComponent(EventListComponent); fixture.componentRef.setInput('kind','barbecue'); fixture.detectChanges();
    http.expectOne(r=>r.url==='/api/events').flush({error:{message:'Serviço indisponível'}},{status:503,statusText:'Unavailable'});
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Serviço indisponível');
    fixture.componentInstance.retry(); http.expectOne(r=>r.url==='/api/events').flush({data:[]});
    expect(fixture.componentInstance.error).toBe('');
  });
});
