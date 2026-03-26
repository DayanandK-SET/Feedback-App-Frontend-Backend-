// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { AdminCreatorDto, AdminSurveyDto } from '../models/admin.models';

// @Injectable({
//   providedIn: 'root'
// })
// export class AdminService {

//   private baseUrl = 'http://localhost:5215/api/Admin';

//   constructor(private http: HttpClient) {}

//   // -----------------------------------------------
//   // GET /api/Admin/creators
//   // Get all registered creators
//   // -----------------------------------------------
//   getAllCreators() {
//     return this.http.get<AdminCreatorDto[]>(
//       `${this.baseUrl}/creators`
//     );
//   }

//   // -----------------------------------------------
//   // GET /api/Admin/surveys
//   // Get all surveys across all creators
//   // -----------------------------------------------
//   getAllSurveys() {
//     return this.http.get<AdminSurveyDto[]>(
//       `${this.baseUrl}/surveys`
//     );
//   }

//   // -----------------------------------------------
//   // DELETE /api/Admin/survey/{id}
//   // Admin deletes any survey
//   // -----------------------------------------------
//   deleteSurvey(id: number) {
//     return this.http.delete<string>(
//       `${this.baseUrl}/survey/${id}`
//     );
//   }

//   // -----------------------------------------------
//   // DELETE /api/Admin/creator/{id}
//   // Admin deletes a creator account
//   // -----------------------------------------------
//   deleteCreator(id: number) {
//     return this.http.delete<string>(
//       `${this.baseUrl}/creator/${id}`
//     );
//   }

// }



//////////////


// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { AdminCreatorDto, AdminSurveyDto, AuditLogDto } from '../models/admin.models';

// @Injectable({
//   providedIn: 'root'
// })
// export class AdminService {

//   private baseUrl = 'http://localhost:5215/api/Admin';

//   constructor(private http: HttpClient) {}

//   getAllCreators() {
//     return this.http.get<AdminCreatorDto[]>(`${this.baseUrl}/creators`);
//   }

//   getAllSurveys() {
//     return this.http.get<AdminSurveyDto[]>(`${this.baseUrl}/surveys`);
//   }

//   deleteSurvey(id: number) {
//     return this.http.delete<string>(`${this.baseUrl}/survey/${id}`);
//   }

//   deleteCreator(id: number) {
//     return this.http.delete<string>(`${this.baseUrl}/creator/${id}`);
//   }

//     // now toggles active/inactive
//   toggleCreatorStatus(id: number) {
//     return this.http.patch(
//       `${this.baseUrl}/creator/${id}/toggle-status`,
//       {}
//     );
//   }

//   // api/Admin/audit-logs
//   getAuditLogs() {
//     return this.http.get<AuditLogDto[]>(`${this.baseUrl}/audit-logs`);
//   }

// }



import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  AdminCreatorDto,
  AdminSurveyDto,
  AuditLogDto,
  GetAdminCreatorsRequestDto,
  GetAdminSurveysRequestDto,
  AdminCreatorsPagedResponseDto,
  AdminSurveysPagedResponseDto
} from '../models/admin.models';

@Injectable({
  providedIn: 'root'
})
export class AdminService {

  private baseUrl = 'http://localhost:5215/api/Admin';

  constructor(private http: HttpClient) {}

  // ── Existing methods — unchanged ──────────────────

  getAllCreators() {
    return this.http.get<AdminCreatorDto[]>(`${this.baseUrl}/creators`);
  }

  getAllSurveys() {
    return this.http.get<AdminSurveyDto[]>(`${this.baseUrl}/surveys`);
  }

  deleteSurvey(id: number) {
    return this.http.delete(
      `${this.baseUrl}/survey/${id}`,
      { responseType: 'text' }
    );
  }

  toggleCreatorStatus(id: number) {
    return this.http.patch(
      `${this.baseUrl}/creator/${id}/toggle-status`,
      {}
    );
  }

  getAuditLogs() {
    return this.http.get<AuditLogDto[]>(`${this.baseUrl}/audit-logs`);
  }

  // ✅ NEW — paged + filtered search methods

  searchCreators(request: GetAdminCreatorsRequestDto) {
    return this.http.post<AdminCreatorsPagedResponseDto>(
      `${this.baseUrl}/creators/search`,
      request
    );
  }

  searchSurveys(request: GetAdminSurveysRequestDto) {
    return this.http.post<AdminSurveysPagedResponseDto>(
      `${this.baseUrl}/surveys/search`,
      request
    );
  }
}

