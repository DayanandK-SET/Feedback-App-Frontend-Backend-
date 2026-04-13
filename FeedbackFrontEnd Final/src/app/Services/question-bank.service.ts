import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  CreateQuestionBankDto,
  UpdateQuestionBankDto,
  GetQuestionBankRequestDto,
  QuestionBankPagedResponseDto
} from '../models/question-bank.models';

@Injectable({ providedIn: 'root' })
export class QuestionBankService {

  private baseUrl = 'http://localhost:5215/api/QuestionBank';

  constructor(private http: HttpClient) {}

  createQuestions(dtos: CreateQuestionBankDto[]) {
    return this.http.post<{ message: string; questionIds: number[] }>(this.baseUrl, dtos);
  }

  getMyQuestions(request: GetQuestionBankRequestDto) {
    let params = new HttpParams();
    if (request.pageNumber) params = params.set('pageNumber', request.pageNumber);
    if (request.pageSize)   params = params.set('pageSize', request.pageSize);
    if (request.questionType != null) params = params.set('questionType', request.questionType);
    return this.http.get<QuestionBankPagedResponseDto>(`${this.baseUrl}/my-questions`, { params });
  }

  updateQuestion(id: number, dto: UpdateQuestionBankDto) {
    return this.http.put(`${this.baseUrl}/${id}`, dto, { responseType: 'text' });
  }

  deleteQuestion(id: number) {
    return this.http.delete(`${this.baseUrl}/${id}`, { responseType: 'text' });
  }
}
