import { Routes } from '@angular/router';
import { Authentication } from './authentication/authentication';
import { Dashboard } from './dashboard/dashboard';
import { CreateSurvey } from './create-survey/create-survey';
import { QuestionBank } from './question-bank/question-bank';
import { SurveyResponses } from './survey-responses/survey-responses';
import { Analytics } from './analytics/analytics';
import { PublicSurvey } from './public-survey/public-survey';
import { AdminDashboard } from './admin-dashboard/admin-dashboard';
import { PrivateSurveyOtp } from './private-survey-otp/private-survey-otp';
import { authGuard } from './guards/authGuard';
import { adminGuard } from './guards/adminGuard';
import { Layout } from './layout/layout/layout';

export const routes: Routes = [

  // ── Public (no login required) ──────────────────
  { path: '', component: Authentication },
  { path: 'survey/:publicIdentifier', component: PublicSurvey },
  { path: 'survey/:publicIdentifier/verify', component: PrivateSurveyOtp },



  // ── Creator + Admin protected routes ────────────
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'create-survey', component: CreateSurvey },
      { path: 'question-bank', component: QuestionBank },
      { path: 'surveys/:id/responses', component: SurveyResponses },
      { path: 'surveys/:id/analytics', component: Analytics },
    ]
  },

  // ── Admin only ───────────────────────────────────
  {
    path: '',
    component: Layout,
    canActivate: [adminGuard],
    children: [
      { path: 'admin', component: AdminDashboard }
    ]
  }

];
