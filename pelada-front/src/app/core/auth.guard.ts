import { inject } from '@angular/core';
import { CanActivateFn, CanDeactivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService), router = inject(Router);
  return auth.load().pipe(map(s => s.user ? true : router.createUrlTree(['/login'], {queryParams: {returnUrl: state.url}})), catchError(() => of(router.createUrlTree(['/login']))));
};
export interface UnsavedForm { canLeave(): boolean; }
export const unsavedGuard: CanDeactivateFn<UnsavedForm> = component => component.canLeave();
