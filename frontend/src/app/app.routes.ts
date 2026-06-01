import { Routes } from '@angular/router';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout.component';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { ChatComponent } from './features/chat/chat.component';
import { LoginComponent } from './features/auth/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { DocumentsComponent } from './features/knowledge/documents/documents.component';
import { TutorialsComponent } from './features/knowledge/tutorials/tutorials.component';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // Redirección Raíz
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'chat'
  },
  
  // Layout Público (RAG Chat público)
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: 'chat',
        component: ChatComponent
      }
    ]
  },
  
  // Pantalla de Acceso Independiente
  {
    path: 'login',
    component: LoginComponent
  },
  
  // Layout de Administración Interno protegido por Guard
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'documents',
        component: DocumentsComponent
      },
      {
        path: 'tutorials',
        component: TutorialsComponent
      }
    ]
  },
  
  // Comodín de Redirección para rutas no existentes
  {
    path: '**',
    redirectTo: 'chat'
  }
];
