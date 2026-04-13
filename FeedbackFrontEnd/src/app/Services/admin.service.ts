// import { Injectable } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import {
//   AdminCreatorDto,
//   AdminSurveyDto,
//   AuditLogDto,
//   GetAdminCreatorsRequestDto,
//   GetAdminSurveysRequestDto,
//   AdminCreatorsPagedResponseDto,
//   AdminSurveysPagedResponseDto,
//   GetAuditLogsRequestDto,
//   AuditLogsPagedResponseDto
// } from '../models/admin.models';

// @Injectable({ providedIn: 'root' })
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
//     return this.http.delete(`${this.baseUrl}/survey/${id}`, { responseType: 'text' });
//   }

//   toggleCreatorStatus(id: number) {
//     return this.http.patch(`${this.baseUrl}/creator/${id}/toggle-status`, {});
//   }

//   // Legacy — kept for backward compat
//   getAuditLogs() {
//     return this.http.get<AuditLogDto[]>(`${this.baseUrl}/audit-logs`);
//   }

//   searchCreators(request: GetAdminCreatorsRequestDto) {
//     return this.http.post<AdminCreatorsPagedResponseDto>(`${this.baseUrl}/creators/search`, request);
//   }

//   searchSurveys(request: GetAdminSurveysRequestDto) {
//     return this.http.post<AdminSurveysPagedResponseDto>(`${this.baseUrl}/surveys/search`, request);
//   }

//   searchAuditLogs(request: GetAuditLogsRequestDto) {
//     return this.http.post<AuditLogsPagedResponseDto>(`${this.baseUrl}/audit-logs/search`, request);
//   }
// }

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.prod';

import {
  AdminCreatorDto,
  AdminSurveyDto,
  AuditLogDto,
  GetAdminCreatorsRequestDto,
  GetAdminSurveysRequestDto,
  AdminCreatorsPagedResponseDto,
  AdminSurveysPagedResponseDto,
  GetAuditLogsRequestDto,
  AuditLogsPagedResponseDto
} from '../models/admin.models';

@Injectable({ providedIn: 'root' })
export class AdminService {

  private baseUrl = `${environment.apiUrl}/Admin`;

  constructor(private http: HttpClient) {}

  getAllCreators() {
    return this.http.get<AdminCreatorDto[]>(`${this.baseUrl}/creators`);
  }

  getAllSurveys() {
    return this.http.get<AdminSurveyDto[]>(`${this.baseUrl}/surveys`);
  }

  deleteSurvey(id: number) {
    return this.http.delete(`${this.baseUrl}/survey/${id}`, { responseType: 'text' });
  }

  toggleCreatorStatus(id: number) {
    return this.http.patch(`${this.baseUrl}/creator/${id}/toggle-status`, {});
  }

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

  searchAuditLogs(request: GetAuditLogsRequestDto) {
    return this.http.post<AuditLogsPagedResponseDto>(
      `${this.baseUrl}/audit-logs/search`,
      request
    );
  }
}