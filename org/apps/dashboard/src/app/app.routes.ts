import { Route } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { LoginComponent } from './auth/login.component';
import { TasksDashboardComponent } from './tasks/tasks-dashboard.component';

export const appRoutes: Route[] = [
	{
		path: 'login',
		component: LoginComponent,
	},
	{
		path: '',
		canActivate: [authGuard],
		component: TasksDashboardComponent,
	},
	{
		path: '**',
		redirectTo: '',
	},
];
