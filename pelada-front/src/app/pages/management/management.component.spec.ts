import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ManagementComponent } from './management.component';
import { FootballEvent } from '../../core/models';

describe('Formulários de gerenciamento', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({imports:[ManagementComponent],providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([]), {provide:ActivatedRoute,useValue:{snapshot:{data:{module:'daily'}},queryParamMap:of(convertToParamMap({year:'2026',month:'10'}))}}]});
    http=TestBed.inject(HttpTestingController);
  });
  afterEach(()=>http.verify());
  function setup(module = 'daily') { TestBed.inject(ActivatedRoute).snapshot.data['module'] = module; const fixture=TestBed.createComponent(ManagementComponent); fixture.detectChanges(); http.expectOne(r=>r.url==='/api/events').flush({data:[]}); return fixture.componentInstance; }
  function previousMonth(date = '2026-09-01'): FootballEvent {
    return {id:42,kind:'monthly',date,title:'Mensalidade antiga',amount:'100.00',version:3,participants:[
      {personId:1,name:'João',amount:'100.00',paid:true,paidAt:'2026-09-10'},
      {personId:2,name:'Pedro',amount:'80.00',paid:false,paidAt:null}
    ],totals:{count:2,expected:'180.00',received:'100.00',pending:'80.00'}};
  }
  function expectPrevious(month: number, year: number) {
    return http.expectOne(r => r.method === 'GET' && r.url === '/api/events' && r.params.get('kind') === 'monthly' && r.params.get('month') === String(month) && r.params.get('year') === String(year));
  }
  it('adicionar participante e cancelar não envia escrita à API', () => {
    const component=setup(); component.newRecord(); component.event!.amount='30.00'; component.newName='João'; component.addPerson();
    expect(component.dirty).toBeTrue(); spyOn(window,'confirm').and.returnValue(true); component.cancel();
    expect(component.event).toBeNull(); http.expectNone(r=>r.method!=='GET');
  });
  it('preserva edição quando o descarte é recusado', () => {
    const component=setup(); component.newRecord(); component.event!.amount='30.00'; spyOn(window,'confirm').and.returnValue(false); component.cancel();
    expect(component.event!.amount).toBe('30.00'); expect(component.canLeave()).toBeFalse();
  });
  it('grava pagamentos e participantes apenas ao salvar e atualiza a consulta', () => {
    const component=setup(); component.newRecord(); component.event!.amount='30,00'; component.newName='João'; component.addPerson(); component.togglePaid(0);
    http.expectNone(r=>r.method==='POST'); component.save();
    const save=http.expectOne(r=>r.method==='POST' && r.url==='/api/events');
    expect(save.request.body.amount).toBe('30.00'); expect(save.request.body.participants[0].paid).toBeTrue();
    save.flush({id:1,message:'Salvo'}); http.expectOne(r=>r.url==='/api/events').flush({data:[]});
    expect(component.event).toBeNull(); expect(component.success).toContain('salvas');
  });
  it('copia participantes e valores para o rascunho com pagamentos e datas reiniciados', () => {
    const component=setup('monthly'); component.newRecord(); component.event!.title='Mensalidade do novo mês';
    const key=component.event!.requestKey, source=previousMonth();
    component.importPreviousMonth(); expect(component.importing).toBeTrue();
    expectPrevious(9,2026).flush({data:[source]});
    expect(component.importing).toBeFalse(); expect(component.dirty).toBeTrue();
    expect(component.event!.date).toBe('2026-10-01'); expect(component.event!.id).toBeUndefined();
    expect(component.event!.requestKey).toBe(key); expect(component.event!.title).toBe('Mensalidade do novo mês');
    expect(component.event!.amount).toBe('100.00');
    expect(component.event!.participants).toEqual(source.participants.map(person=>({...person,paid:false,paidAt:null})));
    expect(component.preview(true)).toBe(0); expect(component.preview(false)).toBe(180);
    component.event!.participants[0].amount='120.00'; expect(source.participants[0].amount).toBe('100.00');
    expect(source.participants[0].paid).toBeTrue(); expect(source.participants[0].paidAt).toBe('2026-09-10');
    expect(component.importNotice).toContain('setembro/2026'); http.expectNone(r=>r.method!=='GET');
  });
  it('busca dezembro do ano anterior ao importar uma mensalidade de janeiro', () => {
    const component=setup('monthly'); component.newRecord(); component.formMonth=1; component.formYear=2027;
    component.importPreviousMonth(); expectPrevious(12,2026).flush({data:[previousMonth('2026-12-01')]});
    expect(component.importNotice).toContain('dezembro/2026'); expect(component.formMonth).toBe(1); expect(component.formYear).toBe(2027);
  });
  it('mantém a lista atual quando não há mensalidade no mês anterior', () => {
    const component=setup('monthly'); component.newRecord(); component.event!.amount='55.00'; component.newName='Lista atual'; component.addPerson();
    const before=structuredClone(component.event);
    component.importPreviousMonth(); expectPrevious(9,2026).flush({data:[]});
    expect(component.event).toEqual(before); expect(component.error).toContain('Não há lista'); expect(component.importing).toBeFalse();
  });
  it('permite recusar a substituição da lista e dos valores preenchidos', () => {
    const component=setup('monthly'); component.newRecord(); component.event!.amount='55.00'; component.newName='Lista atual'; component.addPerson();
    const before=structuredClone(component.event); spyOn(window,'confirm').and.returnValue(false);
    component.importPreviousMonth(); expectPrevious(9,2026).flush({data:[previousMonth()]});
    expect(window.confirm).toHaveBeenCalled(); expect(component.event).toEqual(before); expect(component.importNotice).toBe('');
  });
  it('substitui uma lista existente sem duplicar pessoas e mantém o registro de destino', () => {
    const component=setup('monthly'); const target=previousMonth('2026-10-01'); target.id=90; component.editEvent(target);
    spyOn(window,'confirm').and.returnValue(true);
    component.importPreviousMonth(); expectPrevious(9,2026).flush({data:[previousMonth()]});
    expect(component.event!.id).toBe(90); expect(component.event!.version).toBe(3); expect(component.event!.participants.length).toBe(2);
    expect(component.event!.participants.every(p=>!p.paid && p.paidAt===null)).toBeTrue(); http.expectNone(r=>r.method!=='GET');
  });
  it('cancelar uma lista importada não grava nem altera o mês anterior', () => {
    const component=setup('monthly'); component.newRecord(); const source=previousMonth();
    component.importPreviousMonth(); expectPrevious(9,2026).flush({data:[source]});
    spyOn(window,'confirm').and.returnValue(true); component.cancel();
    expect(component.event).toBeNull(); expect(source.participants[0].paid).toBeTrue(); http.expectNone(r=>r.method!=='GET');
  });
  it('salva a cópia no mês escolhido sem reutilizar o identificador do mês anterior', () => {
    const component=setup('monthly'); component.newRecord(); component.formMonth=1; component.formYear=2027;
    component.importPreviousMonth(); expectPrevious(12,2026).flush({data:[previousMonth('2026-12-01')]}); component.save();
    const save=http.expectOne(r=>r.method==='POST' && r.url==='/api/events');
    expect(save.request.body.date).toBe('2027-01-01'); expect(save.request.body.id).toBeUndefined();
    expect(save.request.body.participants.every((p: {paid: boolean; paidAt: string | null})=>!p.paid && p.paidAt===null)).toBeTrue();
    save.flush({id:43,message:'Salvo'}); expect(component.success).toContain('salvas');
  });
  it('trata falha de comunicação e permite tentar importar novamente', () => {
    const component=setup('monthly'); component.newRecord();
    component.importPreviousMonth(); expectPrevious(9,2026).flush({error:{message:'Servidor indisponível'}},{status:503,statusText:'Unavailable'});
    expect(component.error).toBe('Servidor indisponível'); expect(component.importing).toBeFalse(); expect(component.event!.participants).toEqual([]);
    component.importPreviousMonth(); expectPrevious(9,2026).flush({data:[previousMonth()]});
    expect(component.error).toBe(''); expect(component.event!.participants.length).toBe(2);
  });
  it('impede reenvio e salvamento enquanto a consulta anterior ainda está em andamento', () => {
    const component=setup('monthly'); component.newRecord(); component.importPreviousMonth();
    component.importPreviousMonth(); component.save();
    expect(component.importing).toBeTrue(); expect(component.saving).toBeFalse();
    expectPrevious(9,2026).flush({data:[previousMonth()]}); http.expectNone(r=>r.method!=='GET');
    expect(component.importing).toBeFalse();
  });
  it('valida o período antes de consultar o histórico', () => {
    const component=setup('monthly'); component.newRecord(); component.formYear=1999; component.importPreviousMonth();
    expect(component.error).toContain('válidos'); component.formYear=2000; component.formMonth=1; component.importPreviousMonth();
    expect(component.error).toContain('fora do histórico'); http.expectNone(r=>r.url==='/api/events');
  });
});
