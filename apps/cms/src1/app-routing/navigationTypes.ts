export type AppRoute =
  | 'home'
  | 'services'
  | 'about'
  | 'portfolio'
  | 'contact'
  | 'projects'
  | 'services-all'
  | 'service-design'
  | 'service-web'
  | 'blog'
  | 'apropos'
  | 'login'
  | 'register'
  | 'account'
  | 'cms-dashboard'
  | 'cms-unavailable'
  | 'cms-forbidden'
  | 'auth-loading'
  | `cms-${string}`
  | `project-${string}`
  | `blog-${string}`
  | string;

export type ResolvedPage =
  | 'home'
  | 'projects'
  | 'services-all'
  | 'service-design'
  | 'service-web'
  | 'portfolio'
  | 'blog'
  | 'apropos'
  | 'login'
  | 'register'
  | 'account'
  | 'cms-dashboard'
  | 'cms-unavailable'
  | 'cms-forbidden'
  | 'auth-loading'
  | `project-${string}`
  | `blog-${string}`
  | `service-${string}`;

export interface AuthRoutingState {
  isAuthenticated: boolean;
  isAuthReady: boolean;
  canAccessCMS: boolean;
  cmsEnabled: boolean;
  registrationEnabled: boolean;
  postLoginRoute: ResolvedPage;
}

export interface RouteResolution {
  page: ResolvedPage;
  sectionToScroll: string | null;
  normalizedHash?: string;
}
