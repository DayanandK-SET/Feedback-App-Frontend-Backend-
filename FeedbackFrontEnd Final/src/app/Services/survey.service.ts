// import { Injectable } from '@angular/core';
// import { HttpClient, HttpParams } from '@angular/common/http';
// import {
//   CreateSurveyDto,
//   UpdateSurveyDto,
//   CreatorSurveyListDto,
//   GetMySurveysRequestDto,
//   PagedSurveyResponseDto,
//   SurveyResponsesDto,
//   GetSurveyResponsesRequestDto,
//   SurveyAnalyticsDto,
//   ResponseTrendDto
// } from '../models/survey.models';

// @Injectable({
//   providedIn: 'root'
// })
// export class SurveyService {

//   private baseUrl = 'http://localhost:5215/api/Survey';

//   constructor(private http: HttpClient) {}

//   // -----------------------------------------------
//   // POST /api/Survey
//   // Create a new survey
//   // -----------------------------------------------
//   createSurvey(dto: CreateSurveyDto) {
//     return this.http.post<{ message: string; publicLink: string }>(
//       this.baseUrl,
//       dto
//     );
//   }

//   // -----------------------------------------------
//   // POST /api/Survey/my-surveys/search
//   // Get surveys with pagination + date + status filter
//   // Using POST so filter params go in request body
//   // (trainer recommendation — cleaner than long URLs)
//   // -----------------------------------------------
//   getMySurveys(request: GetMySurveysRequestDto) {
//     return this.http.post<PagedSurveyResponseDto>(
//       `${this.baseUrl}/my-surveys/search`,
//       request
//     );
//   }

//   // -----------------------------------------------
//   // DELETE /api/Survey/{id}
//   // Delete a survey
//   // -----------------------------------------------
//   deleteSurvey(id: number) {
//     return this.http.delete<{ message: string }>(
//       `${this.baseUrl}/${id}`
//     );
//   }

//   // -----------------------------------------------
//   // PATCH /api/Survey/{id}/toggle-status
//   // Toggle Active / Inactive
//   // -----------------------------------------------
//   toggleSurveyStatus(id: number) {
//     return this.http.patch<{ message: string }>(
//       `${this.baseUrl}/${id}/toggle-status`,
//       {}
//     );
//   }

//   // -----------------------------------------------
//   // PUT /api/Survey/{id}
//   // Update survey title and description
//   // -----------------------------------------------
//   updateSurvey(id: number, dto: UpdateSurveyDto) {
//     return this.http.put<{ message: string }>(
//       `${this.baseUrl}/${id}`,
//       dto
//     );
//   }

//   // -----------------------------------------------
//   // GET /api/Survey/{id}/responses
//   // Get paginated responses with optional filters
//   // -----------------------------------------------
//   getSurveyResponses(id: number, request: GetSurveyResponsesRequestDto) {
//     let params = new HttpParams();

//     if (request.pageNumber)
//       params = params.set('pageNumber', request.pageNumber);

//     if (request.pageSize)
//       params = params.set('pageSize', request.pageSize);

//     if (request.questionType != null)
//       params = params.set('questionType', request.questionType);

//     if (request.fromDate)
//       params = params.set('fromDate', request.fromDate);

//     if (request.toDate)
//       params = params.set('toDate', request.toDate);

//     return this.http.get<SurveyResponsesDto>(
//       `${this.baseUrl}/${id}/responses`,
//       { params }
//     );
//   }

//   // -----------------------------------------------
//   // GET /api/Survey/{id}/analytics
//   // Get full analytics for a survey
//   // -----------------------------------------------
//   getSurveyAnalytics(id: number) {
//     return this.http.get<SurveyAnalyticsDto>(
//       `${this.baseUrl}/${id}/analytics`
//     );
//   }

//   // -----------------------------------------------
//   // GET /api/Survey/{id}/response-trend
//   // Get daily response trend data (for chart)
//   // -----------------------------------------------
//   getResponseTrend(id: number) {
//     return this.http.get<ResponseTrendDto[]>(
//       `${this.baseUrl}/${id}/response-trend`
//     );
//   }

//   // -----------------------------------------------
//   // GET /api/Survey/{surveyId}/export-responses
//   // Download Excel file of all responses
//   // -----------------------------------------------
//   exportResponses(surveyId: number) {
//     return this.http.get(
//       `${this.baseUrl}/${surveyId}/export-responses`,
//       { responseType: 'blob' }   // Important: blob for file download
//     );
//   }

//   // -----------------------------------------------
//   // POST /api/Survey/import-excel
//   // Import a survey from an uploaded Excel file
//   // -----------------------------------------------
//   importSurveyFromExcel(title: string, description: string, file: File) {
//     const formData = new FormData();
//     formData.append('title', title);
//     formData.append('description', description ?? '');
//     formData.append('file', file);

//     return this.http.post<{ message: string; surveyIdentifier: string }>(
//       `${this.baseUrl}/import-excel`,
//       formData
//     );
//   }

// }

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  CreateSurveyDto,
  UpdateSurveyDto,
  CreatorSurveyListDto,
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

  private baseUrl = 'http://localhost:5215/api/Survey';

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


  importSurveyFromExcel(
    title: string,
    description: string,
    file: File,
    expireAt: string | null,
    maxResponses: number | null
  ) {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description ?? '');
    formData.append('file', file);

    if (expireAt) {
      formData.append('expireAt', expireAt);
    }
    if (maxResponses != null) {
      formData.append('maxResponses', maxResponses.toString());
    }

    return this.http.post<{ message: string; surveyIdentifier: string }>(
      `${this.baseUrl}/import-excel`,
      formData
    );
  }
}
