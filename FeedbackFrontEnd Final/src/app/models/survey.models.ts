// =============================================
// SURVEY MODELS
// Matches backend DTOs exactly
// =============================================

// ---------- Enums ----------

// export enum QuestionType {
//   MultipleChoice = 1,
//   Text = 2,
//   Rating = 3
// }

// ---------- Create Survey ----------

// export interface CreateQuestionDto {
//   text?: string;
//   questionType?: QuestionType;
//   options?: string[];           // For MultipleChoice only
//   questionBankId?: number;      // OR pick from question bank
// }

// export interface CreateSurveyDto {
//   title: string;
//   description: string;
//   questions: CreateQuestionDto[];
//   expireAt?: string | null;     // ISO date string
//   maxResponses?: number | null;
// }

// ---------- Update Survey ----------

// export interface UpdateSurveyDto {
//   title: string;
//   description: string;
// }

// ---------- Survey List (my-surveys) ----------

// export interface CreatorSurveyListDto {
//   surveyId: number;
//   title: string;
//   description: string;
//   isActive: boolean;
//   createdAt: string;
//   totalResponses: number;
//   publicIdentifier: string;
// }

// ---------- Survey Responses ----------

// export interface GetSurveyResponsesRequestDto {
//   pageNumber?: number;
//   pageSize?: number;
//   questionType?: QuestionType | null;
//   fromDate?: string | null;
//   toDate?: string | null;
// }

// export interface AnswerDto {
//   questionId: number;
//   questionText: string;
//   answer: string;
// }

// export interface ResponseDto {
//   responseId: number;
//   submittedAt: string;
//   answers: AnswerDto[];
// }

// export interface SurveyResponsesDto {
//   surveyId: number;
//   title: string;
//   totalResponses: number;
//   responses: ResponseDto[];
// }

// ---------- Analytics ----------

// export interface OptionAnalyticsDto {
//   optionText: string;
//   count: number;
// }

// export interface QuestionAnalyticsDto {
//   questionId: number;
//   questionText: string;
//   questionType: QuestionType;
//   options?: OptionAnalyticsDto[];     // MultipleChoice
//   averageRating?: number;             // Rating
//   minRating?: number;
//   maxRating?: number;
//   textAnswers?: string[];             // Text
// }

// export interface SurveyAnalyticsDto {
//   surveyId: number;
//   title: string;
//   totalResponses: number;
//   questions: QuestionAnalyticsDto[];
// }

// ---------- Response Trend ----------

// export interface ResponseTrendDto {
//   date: string;
//   count: number;
// }

// ---------- Import Excel ----------

// export interface ImportSurveyExcelDto {
//   title: string;
//   description?: string;
//   file: File;
// }


// =============================================
// SURVEY MODELS
// Matches backend DTOs exactly
// =============================================

//  Enums 

export enum QuestionType {
  MultipleChoice = 1,
  Text = 2,
  Rating = 3
}

//  Create Survey 

export interface CreateQuestionDto {
  text?: string;
  questionType?: QuestionType;
  options?: string[];           // For MultipleChoice only
  questionBankId?: number;      // OR pick from question bank
}

export interface CreateSurveyDto {
  title: string;
  description: string;
  questions: CreateQuestionDto[];
  expireAt?: string | null;     // ISO date string
  maxResponses?: number | null;
}

//  Update Survey 

export interface UpdateSurveyDto {
  title: string;
  description: string;
  expireAt?: string | null;
  maxResponses?: number | null;
}

//  Survey List (my-surveys) 

export interface CreatorSurveyListDto {
  surveyId: number;
  title: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  totalResponses: number;
  publicIdentifier: string;
  isLocked: boolean;
  expireAt?: string | null;
  maxResponses?: number | null;
}

//  My Surveys - POST filter request 

export interface GetMySurveysRequestDto {
  pageNumber: number;
  pageSize: number;
  fromDate?: string | null;
  toDate?: string | null;
  isActive?: boolean | null;
}

//  My Surveys — Paged response 

export interface PagedSurveyResponseDto {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalResponsesCount: number;
  totalActiveSurveys: number;

  surveys: CreatorSurveyListDto[];
}

//  Survey Responses 

export interface GetSurveyResponsesRequestDto {
  pageNumber?: number;
  pageSize?: number;
  questionType?: QuestionType | null;
  fromDate?: string | null;
  toDate?: string | null;
}

export interface AnswerDto {
  questionId: number;
  questionText: string;
  answer: string;
}

export interface ResponseDto {
  responseId: number;
  submittedAt: string;
  answers: AnswerDto[];
}

export interface SurveyResponsesDto {
  surveyId: number;
  title: string;
  totalResponses: number;
  responses: ResponseDto[];
}

//  Analytics 

export interface OptionAnalyticsDto {
  optionText: string;
  count: number;
}

export interface QuestionAnalyticsDto {
  questionId: number;
  questionText: string;
  questionType: QuestionType;
  options?: OptionAnalyticsDto[];     // MultipleChoice
  averageRating?: number;             // Rating
  minRating?: number;
  maxRating?: number;
  textAnswers?: string[];             // Text
}

export interface SurveyAnalyticsDto {
  surveyId: number;
  title: string;
  totalResponses: number;
  questions: QuestionAnalyticsDto[];
}

//  Response Trend 

export interface ResponseTrendDto {
  date: string;
  count: number;
}

//  Import Excel 

export interface ImportSurveyExcelDto {
  title: string;
  description?: string;
  file: File;
}