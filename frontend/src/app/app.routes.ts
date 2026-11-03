import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/auth';

export const routes: Routes = [
  { path: '', canActivate: [guestGuard], loadComponent: () => import('./pages/home').then((m) => m.HomePage) },
  { path: 'login', canActivate: [guestGuard], loadComponent: () => import('./pages/auth-pages').then((m) => m.LoginPage) },
  { path: 'register', canActivate: [guestGuard], loadComponent: () => import('./pages/auth-pages').then((m) => m.RegisterPage) },

  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./pages/dashboard').then((m) => m.DashboardPage) },
  { path: 'search', canActivate: [authGuard], loadComponent: () => import('./pages/search').then((m) => m.SearchPage) },
  { path: 'profile/:id', canActivate: [authGuard], loadComponent: () => import('./pages/profile-view').then((m) => m.ProfileViewPage) },
  { path: 'my-profile', canActivate: [authGuard], loadComponent: () => import('./pages/my-profile').then((m) => m.MyProfilePage) },
  { path: 'interests', canActivate: [authGuard], loadComponent: () => import('./pages/interests').then((m) => m.InterestsPage) },
  { path: 'shortlist', canActivate: [authGuard], loadComponent: () => import('./pages/shortlist').then((m) => m.ShortlistPage) },
  { path: 'messages', canActivate: [authGuard], loadComponent: () => import('./pages/messages').then((m) => m.MessagesPage) },
  { path: 'messages/:id', canActivate: [authGuard], loadComponent: () => import('./pages/messages').then((m) => m.MessagesPage) },

  { path: 'forgot-password', canActivate: [guestGuard], loadComponent: () => import('./pages/account-pages').then((m) => m.ForgotPasswordPage) },
  { path: 'reset-password', loadComponent: () => import('./pages/account-pages').then((m) => m.ResetPasswordPage) },
  { path: 'verify-email', loadComponent: () => import('./pages/account-pages').then((m) => m.VerifyEmailPage) },
  { path: 'plans', loadComponent: () => import('./pages/plans').then((m) => m.PlansPage) },
  { path: 'billing', canActivate: [authGuard], loadComponent: () => import('./pages/billing').then((m) => m.BillingPage) },
  { path: 'invoice/:id', canActivate: [authGuard], loadComponent: () => import('./pages/billing').then((m) => m.InvoicePage) },
  { path: 'success-stories', loadComponent: () => import('./pages/stories').then((m) => m.StoriesPage) },

  { path: 'notifications', canActivate: [authGuard], loadComponent: () => import('./pages/notifications').then((m) => m.NotificationsPage) },

  { path: 'admin', canActivate: [authGuard, adminGuard], loadComponent: () => import('./pages/admin').then((m) => m.AdminPage) },

  { path: '**', redirectTo: '' },
];
