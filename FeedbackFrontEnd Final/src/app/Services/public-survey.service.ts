import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PublicSurveyDto, SubmitSurveyDto } from '../models/public-survey.models';

@Injectable({ providedIn: 'root' })
export class PublicSurveyService {

  private baseUrl    = 'http://localhost:5215/api/Public';
  private privateUrl = 'http://localhost:5215/api/private-survey';

  constructor(private http: HttpClient) {}

  // ── Public surveys ────────────────────────────────

  checkIsPrivate(publicIdentifier: string) {
    return this.http.get<{ isPrivate: boolean; surveyId: number }>(
      `${this.baseUrl}/${publicIdentifier}/is-private`
    );
  }

  getSurvey(publicIdentifier: string) {
    return this.http.get<PublicSurveyDto>(`${this.baseUrl}/${publicIdentifier}`);
  }

  submitSurvey(publicIdentifier: string, dto: SubmitSurveyDto) {
    return this.http.post(`${this.baseUrl}/${publicIdentifier}/submit`, dto, { responseType: 'text' });
  }

  // ── Private surveys ───────────────────────────────

  sendOtp(surveyId: number, email: string) {
    return this.http.post(`${this.privateUrl}/send-otp`, { surveyId, email });
  }

  verifyOtp(surveyId: number, email: string, otp: string) {
    return this.http.post(`${this.privateUrl}/verify-otp`, { surveyId, email, otp });
  }

  getPrivateSurvey(surveyId: number, email: string) {
    return this.http.get<PublicSurveyDto>(
      `${this.privateUrl}/${surveyId}?email=${encodeURIComponent(email)}`
    );
  }

  submitPrivateSurvey(surveyId: number, email: string, dto: SubmitSurveyDto) {
    return this.http.post(
      `${this.privateUrl}/${surveyId}/submit?email=${encodeURIComponent(email)}`,
      dto
    );
  }
}
