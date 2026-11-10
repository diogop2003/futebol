export type EventKind = 'monthly' | 'daily' | 'barbecue';
export type ExpenseCategory = 'field' | 'goalkeepers' | 'barbecue' | 'additional';
export interface Period { month: number; year: number; }
export interface User { id: number; name: string; email: string; role: 'admin' | 'manager'; }
export interface Session { user: User | null; csrfToken: string; }
export interface Person { id: number; name: string; }
export interface Participant { personId?: number; name: string; amount: string; paid: boolean; paidAt: string | null; }
export interface Totals { count: number; expected: string; received: string; pending: string; }
export interface FootballEvent {
  id: number; kind: EventKind; date: string; title: string; amount: string; version: number;
  participants: Participant[]; totals: Totals;
}
export interface EventDraft {
  id?: number; kind: EventKind; date: string; title: string; amount: string; version?: number;
  participants: Participant[]; requestKey: string;
}
export interface Expense {
  id: number; date: string | null; referenceDate: string; amount: string;
  category: ExpenseCategory; description: string; version: number;
}
export interface ExpenseDraft {
  id?: number; date: string; month: number; year: number; amount: string;
  category: ExpenseCategory; description: string; version?: number; requestKey: string;
}
export interface FinanceSummary {
  period: string; basis: 'reference'; expected: string; received: string; pending: string;
  expenses: string; balance: string; previousBalance: string | null; accumulatedBalance: string | null;
  opening: { opening_date: string; opening_balance: string; description: string } | null;
  revenues: Record<EventKind, Totals>; categories: Record<ExpenseCategory, string>;
}
export const EVENT_LABELS: Record<EventKind, string> = { monthly: 'Mensalidades', daily: 'Diárias', barbecue: 'Churrascos' };
export const CATEGORY_LABELS: Record<ExpenseCategory, string> = { field: 'Mensalidade do campo', goalkeepers: 'Pagamento dos goleiros', barbecue: 'Custo do churrasco', additional: 'Custos adicionais' };
