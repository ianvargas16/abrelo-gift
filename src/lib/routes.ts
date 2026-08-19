export type AppRoute = 'creator' | 'runtime';

export const CREATOR_HASH = '#/creator';
export const RUNTIME_HASH = '#/runtime';

export function getCurrentRoute(hash: string): AppRoute {
  return hash === CREATOR_HASH ? 'creator' : 'runtime';
}

export function navigateToRoute(route: AppRoute): void {
  window.location.hash = route === 'creator' ? '/creator' : '/runtime';
}
