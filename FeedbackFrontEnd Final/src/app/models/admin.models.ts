// =============================================
// ADMIN MODELS
// =============================================

// ---------- Creators ----------

// export interface AdminCreatorDto {
//   id: number;
//   username: string;
//   email: string;
// }

// // ---------- Surveys ----------

// export interface AdminSurveyDto {
//   id: number;
//   title: string;
//   isActive: boolean;
//   creator: string;
// }


// export interface AdminCreatorDto {
//   id: number;
//   username: string;
//   email: string;
//   isActive: boolean;
// }

// export interface AdminSurveyDto {
//   id: number;
//   title: string;
//   isActive: boolean;
//   creator: string;
// }


// export interface AuditLogDto {
//   id: number;
//   action: string;
//   surveyId: number;
//   surveyTitle: string;
//   performedBy: string;
//   performedAt: string;
// }


export interface AdminCreatorDto {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
}

export interface AdminSurveyDto {
  id: number;
  title: string;
  isActive: boolean;
  creator: string;
}

export interface AuditLogDto {
  id: number;
  action: string;
  surveyId: number;
  surveyTitle: string;
  performedBy: string;
  performedAt: string;
}

// ✅ NEW — request DTOs for backend search endpoints

export interface GetAdminCreatorsRequestDto {
  pageNumber: number;
  pageSize: number;
  search?: string | null;
  isActive?: boolean | null;
}

export interface GetAdminSurveysRequestDto {
  pageNumber: number;
  pageSize: number;
  search?: string | null;
  creator?: string | null;
  isActive?: boolean | null;
}

// ✅ NEW — paged response DTOs

export interface AdminCreatorsPagedResponseDto {
  totalCount: number;
  totalAllCreators: number;
  pageNumber: number;
  pageSize: number;
  creators: AdminCreatorDto[];
}

export interface AdminSurveysPagedResponseDto {
  totalCount: number;
  totalAllSurveys: number;
  totalActiveSurveys: number;
  pageNumber: number;
  pageSize: number;
  surveys: AdminSurveyDto[];
}
