// QUESTION BANK MODELS

import { QuestionType } from "./survey.models";


//  Create 

export interface CreateQuestionBankDto {
  text: string;
  questionType: QuestionType;
  options?: string[];   // Required if QuestionType = MultipleChoice
}

//  Request (paginated + filtered) 

export interface GetQuestionBankRequestDto {
  questionType?: QuestionType | null;
  pageNumber?: number;
  pageSize?: number;
}

//  Response 

export interface QuestionBankResponseDto {
  id: number;
  text: string;
  questionType: QuestionType;
  options?: string[];
}

export interface QuestionBankPagedResponseDto {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  questions: QuestionBankResponseDto[];
}
