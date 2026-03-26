// PUBLIC SURVEY MODELS


import { QuestionType } from './survey.models';

//  Get Public Survey 

export interface PublicOptionDto {
  optionId: number;
  optionText: string;
}

export interface PublicQuestionDto {
  questionId: number;
  text: string;
  questionType: QuestionType;
  options?: PublicOptionDto[];
}

export interface PublicSurveyDto {
  title: string;
  description: string;
  questions: PublicQuestionDto[];
}

//  Submit Survey 

export interface SubmitAnswerDto {
  questionId: number;
  textAnswer?: string;
  selectedOptionId?: number;
  ratingValue?: number;
}

export interface SubmitSurveyDto {
  answers: SubmitAnswerDto[];
  responseToken: string;   // UID generated on client side to prevent duplicate submissions
}
