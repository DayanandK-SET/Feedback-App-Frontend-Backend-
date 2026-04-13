import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment.prod';

import {
  CreateSurveyDto,
  UpdateSurveyDto,
  GetMySurveysRequestDto,
  PagedSurveyResponseDto,
  SurveyResponsesDto,
  GetSurveyResponsesRequestDto,
  SurveyAnalyticsDto,
  ResponseTrendDto
} from '../models/survey.models';

@Injectable({
  providedIn: 'root'
})
export class SurveyService {

  // private baseUrl = 'http://localhost:5215/api/Survey';

  private baseUrl = `${environment.apiUrl}/Survey`



  constructor(private http: HttpClient) {}

  createSurvey(dto: CreateSurveyDto) {
    return this.http.post<{ message: string; publicLink: string }>(
      this.baseUrl,
      dto
    );
  }

  getMySurveys(request: GetMySurveysRequestDto) {
    return this.http.post<PagedSurveyResponseDto>(
      `${this.baseUrl}/my-surveys/search`,
      request
    );
  }

  deleteSurvey(id: number) {
    return this.http.delete(
      `${this.baseUrl}/${id}`,
      { responseType: 'text' }
    );
  }

  toggleSurveyStatus(id: number) {
    return this.http.patch(
      `${this.baseUrl}/${id}/toggle-status`,
      {},
      { responseType: 'text' }
    );
  }

  updateSurvey(id: number, dto: UpdateSurveyDto) {
    return this.http.put(
      `${this.baseUrl}/${id}`,
      dto,
      { responseType: 'text' }
    );
  }

  getSurveyResponses(id: number, request: GetSurveyResponsesRequestDto) {
    let params = new HttpParams();
    if (request.pageNumber) params = params.set('pageNumber', request.pageNumber);
    if (request.pageSize)   params = params.set('pageSize', request.pageSize);
    if (request.fromDate)   params = params.set('fromDate', request.fromDate);
    if (request.toDate)     params = params.set('toDate', request.toDate);
    if (request.questionType != null)
      params = params.set('questionType', request.questionType);

    return this.http.get<SurveyResponsesDto>(
      `${this.baseUrl}/${id}/responses`,
      { params }
    );
  }

  getSurveyAnalytics(id: number) {
    return this.http.get<SurveyAnalyticsDto>(
      `${this.baseUrl}/${id}/analytics`
    );
  }

  getResponseTrend(id: number) {
    return this.http.get<ResponseTrendDto[]>(
      `${this.baseUrl}/${id}/response-trend`
    );
  }

  exportResponses(surveyId: number) {
    return this.http.get(
      `${this.baseUrl}/${surveyId}/export-responses`,
      { responseType: 'blob' }
    );
  }

  sendAnalyticsEmail(surveyId: number, email?: string, htmlBody?: string) {
    return this.http.post(
      `${this.baseUrl}/${surveyId}/send-analytics-email`,
      { email: email || null, htmlBody: htmlBody || null }
    );
  }


  importSurveyFromExcel(
    title: string,
    description: string,
    file: File,
    expireAt: string | null,
    maxResponses: number | null,
    isPrivate: boolean = false,
    participantEmailsCsv: string | null = null,
    invitationHtmlBody: string | null = null
  ) {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description ?? '');
    formData.append('file', file);
    if (expireAt) formData.append('expireAt', expireAt);
    if (maxResponses != null) formData.append('maxResponses', maxResponses.toString());
    formData.append('isPrivate', isPrivate.toString());
    if (isPrivate && participantEmailsCsv) formData.append('participantEmailsCsv', participantEmailsCsv);
    if (isPrivate && invitationHtmlBody)   formData.append('invitationHtmlBody', invitationHtmlBody);

    return this.http.post<{ message: string; surveyIdentifier: string }>(
      `${this.baseUrl}/import-excel`,
      formData
    );
  }
}
