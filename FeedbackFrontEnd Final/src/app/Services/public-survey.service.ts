import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PublicSurveyDto, SubmitSurveyDto } from '../models/public-survey.models';

@Injectable({
  providedIn: 'root'
})
export class PublicSurveyService {

  private baseUrl = 'http://localhost:5215/api/Public';

  constructor(private http: HttpClient) {}

  // GET /api/Public/{publicIdentifier}
  // Load survey for public respondent (no auth)
  getSurvey(publicIdentifier: string) {
    return this.http.get<PublicSurveyDto>(
      `${this.baseUrl}/${publicIdentifier}`
    );
  }

  // POST /api/Public/{publicIdentifier}/submit
  // Submit survey answers (no auth)


  submitSurvey(publicIdentifier: string, dto: SubmitSurveyDto) {
    return this.http.post(
      `${this.baseUrl}/${publicIdentifier}/submit`,
      dto,
      { responseType: 'text' }
    );
  }

}
