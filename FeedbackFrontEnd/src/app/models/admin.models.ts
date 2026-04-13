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

// request DTOs for backend search endpoints

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

// paged response DTOs

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



// ── Audit Log Search ──────────────────────────────

export interface GetAuditLogsRequestDto {
  pageNumber: number;
  pageSize: number;
  search?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
}

export interface AuditLogsPagedResponseDto {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  logs: AuditLogDto[];
}
