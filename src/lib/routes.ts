export type AppRoute = 'creator' | 'preview' | 'runtime';

export const CREATOR_HASH = '#/creator';
export const PREVIEW_HASH = '#/preview';
export const RUNTIME_HASH = '#/runtime';

export function getCurrentRoute(hash: string): AppRoute {
  if (hash === CREATOR_HASH) {
    return 'creator';
  }

  if (hash === PREVIEW_HASH) {
    return 'preview';
  }

  return 'runtime';
}

export function navigateToRoute(route: AppRoute): void {
  if (route === 'creator') {
    window.location.hash = '/creator';
    return;
  }

  if (route === 'preview') {
    window.location.hash = '/preview';
    return;
  }

  window.location.hash = '/runtime';
}
