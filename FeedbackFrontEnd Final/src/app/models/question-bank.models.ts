// QUESTION BANK MODELS

import { QuestionType } from "./survey.models";

// Create

export interface CreateQuestionBankDto {
  text: string;
  questionType: QuestionType;
  options?: string[];
}

// Update

export interface UpdateQuestionBankDto {
  text: string;
  options?: string[];
}

// Request (paginated + filtered)

export interface GetQuestionBankRequestDto {
  questionType?: QuestionType | null;
  pageNumber?: number;
  pageSize?: number;
}

// Response

export interface QuestionBankResponseDto {
  id: number;
  text: string;
  questionType: QuestionType;
  options?: string[];
  createdById: number;
}

export interface QuestionBankPagedResponseDto {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  questions: QuestionBankResponseDto[];
}
