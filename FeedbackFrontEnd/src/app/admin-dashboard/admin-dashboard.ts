import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../Services/admin.service';
import { AdminCreatorDto, AdminSurveyDto, AuditLogDto} from '../models/admin.models';
import { TokenService } from '../Services/token.service';

type ActiveTab = 'creators' | 'surveys' | 'auditLogs';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, FormsModule, DatePipe, RouterModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard {

  private adminService = inject(AdminService);
  private tokenService = inject(TokenService);

  Math = Math;

  activeTab = signal<ActiveTab>('creators');

  // ── Stats strip (overall counts, not affected by filters) ────
  totalCreatorsCount = signal(0);
  totalSurveysCount  = signal(0);
  activeSurveysCount = signal(0);

  get totalCreators(): number { return this.totalCreatorsCount(); }
  get totalSurveys():  number { return this.totalSurveysCount();  }
  get activeSurveys(): number { return this.activeSurveysCount(); }

  // ── Creators ─────────────────────────────────────
  creators       = signal<AdminCreatorDto[]>([]);
  creatorsLoading = signal(true);
  creatorsError   = signal('');
  creatorTotalCount = signal(0);

  // Creators — live filter inputs
  creatorSearchInput   = '';
  creatorStatusInput: boolean | null = null;

  // Creators — applied filters (only change on Apply)
  appliedCreatorSearch: string | null = null;
  appliedCreatorStatus: boolean | null = null;

  // Creators — pagination
  creatorPage     = 1;
  creatorPageSize = 8;

  // Creator toggle
  togglingCreatorId = signal<number | null>(null);

  // ── Surveys ───────────────────────────────────────
  surveys       = signal<AdminSurveyDto[]>([]);
  surveysLoading = signal(true);
  surveysError   = signal('');
  surveyTotalCount = signal(0);

  // Surveys — live filter inputs
  surveySearchInput   = '';
  surveyCreatorInput  = '';
  surveyStatusInput: boolean | null = null;

  // Surveys — applied filters
  appliedSurveySearch: string | null  = null;
  appliedSurveyCreator: string | null = null;
  appliedSurveyStatus: boolean | null = null;

  // Surveys — pagination
  surveyPage     = 1;
  surveyPageSize = 8;

  // ── Audit Logs — now backend-driven with pagination + filters ──
  auditLogs        = signal<AuditLogDto[]>([]);
  auditLogsLoading = signal(false);
  auditLogsError   = signal('');
  auditTotalCount  = signal(0);

  // Live filter inputs (bound to form fields)
  auditFromDateInput = '';
  auditToDateInput   = '';
  auditSearchInput   = '';

  // Applied filters (only update on Apply click)
  appliedAuditSearch   = '';
  appliedAuditFromDate = '';
  appliedAuditToDate   = '';

  auditLogPage     = 1;
  auditLogPageSize = 8;

  // ── Delete modal (surveys tab) ────────────────────
  showDeleteModal = signal(false);
  deleteTarget    = signal<{ id: number; name: string } | null>(null);
  isDeleting      = signal(false);
  deleteError     = signal('');

  // ── Admin info ────────────────────────────────────
  adminUsername = signal<string | null>(null);


  constructor() {
    this.adminUsername.set(this.tokenService.getUsername());
    this.loadCreators();
    this.loadSurveys();
  }

  // ══════════════════════════════════════════════════
  // CREATORS — Backend calls
  // ══════════════════════════════════════════════════

  loadCreators() {
    this.creatorsLoading.set(true);
    this.creatorsError.set('');

    this.adminService.searchCreators({
      pageNumber: this.creatorPage,
      pageSize:   this.creatorPageSize,
      search:     this.appliedCreatorSearch || null,
      isActive:   this.appliedCreatorStatus
    }).subscribe({
      next: (data) => {
        this.creators.set(data.creators);
        this.creatorTotalCount.set(data.totalCount);
        // Update stats strip from overall count
        this.totalCreatorsCount.set(data.totalAllCreators);
        this.creatorsLoading.set(false);
      },
      error: () => {
        this.creatorsError.set('Failed to load creators.');
        this.creatorsLoading.set(false);
      }
    });
  }

  applyCreatorFilters() {
    this.appliedCreatorSearch = this.creatorSearchInput || null;
    this.appliedCreatorStatus = this.creatorStatusInput;
    this.creatorPage = 1;
    this.loadCreators();
  }

  clearCreatorFilters() {
    this.creatorSearchInput  = '';
    this.creatorStatusInput  = null;
    this.appliedCreatorSearch = null;
    this.appliedCreatorStatus = null;
    this.creatorPage = 1;
    this.loadCreators();
  }

  get hasCreatorFilters(): boolean {
    return !!(this.appliedCreatorSearch || this.appliedCreatorStatus !== null);
  }

  get creatorTotalPages(): number {
    return Math.max(1, Math.ceil(this.creatorTotalCount() / this.creatorPageSize));
  }

  get creatorPageNumbers(): number[] {
    return this.getPageNumbers(this.creatorPage, this.creatorTotalPages);
  }

  toggleCreatorStatus(creator: AdminCreatorDto) {
    this.togglingCreatorId.set(creator.id);
    this.adminService.toggleCreatorStatus(creator.id).subscribe({
      next: () => {
        // Update locally then reload to keep counts accurate
        this.creators.update(list =>
          list.map(c => c.id === creator.id ? { ...c, isActive: !c.isActive } : c)
        );
        this.totalCreatorsCount.update(n => n); // keep same
        this.togglingCreatorId.set(null);
        // Reload if status filter is active so the row correctly appears/disappears
        if (this.appliedCreatorStatus !== null) {
          this.loadCreators();
        }
      },
      error: () => this.togglingCreatorId.set(null)
    });
  }


  // SURVEYS — Backend calls
  // ══════════════════════════════════════════════════

  loadSurveys() {
    this.surveysLoading.set(true);
    this.surveysError.set('');

    this.adminService.searchSurveys({
      pageNumber: this.surveyPage,
      pageSize:   this.surveyPageSize,
      search:     this.appliedSurveySearch  || null,
      creator:    this.appliedSurveyCreator || null,
      isActive:   this.appliedSurveyStatus
    }).subscribe({
      next: (data) => {
        this.surveys.set(data.surveys);
        this.surveyTotalCount.set(data.totalCount);
        // Update stats strip from overall counts
        this.totalSurveysCount.set(data.totalAllSurveys);
        this.activeSurveysCount.set(data.totalActiveSurveys);
        this.surveysLoading.set(false);
      },
      error: () => {
        this.surveysError.set('Failed to load surveys.');
        this.surveysLoading.set(false);
      }
    });
  }

  applySurveyFilters() {
    this.appliedSurveySearch  = this.surveySearchInput  || null;
    this.appliedSurveyCreator = this.surveyCreatorInput || null;
    this.appliedSurveyStatus  = this.surveyStatusInput;
    this.surveyPage = 1;
    this.loadSurveys();
  }

  clearSurveyFilters() {
    this.surveySearchInput  = '';
    this.surveyCreatorInput = '';
    this.surveyStatusInput  = null;
    this.appliedSurveySearch  = null;
    this.appliedSurveyCreator = null;
    this.appliedSurveyStatus  = null;
    this.surveyPage = 1;
    this.loadSurveys();
  }

  get hasSurveyFilters(): boolean {
    return !!(this.appliedSurveySearch || this.appliedSurveyCreator || this.appliedSurveyStatus !== null);
  }

  get surveyTotalPages(): number {
    return Math.max(1, Math.ceil(this.surveyTotalCount() / this.surveyPageSize));
  }

  get surveyPageNumbers(): number[] {
    return this.getPageNumbers(this.surveyPage, this.surveyTotalPages);
  }

  // ══════════════════════════════════════════════════
  // AUDIT LOGS — backend pagination + filtering
  // ══════════════════════════════════════════════════

  loadAuditLogs() {
    this.auditLogsLoading.set(true);
    this.auditLogsError.set('');

    this.adminService.searchAuditLogs({
      pageNumber: this.auditLogPage,
      pageSize:   this.auditLogPageSize,
      search:     this.appliedAuditSearch   || null,
      fromDate:   this.appliedAuditFromDate || null,
      toDate:     this.appliedAuditToDate   || null
    }).subscribe({
      next: (data) => {
        this.auditLogs.set(data.logs);
        this.auditTotalCount.set(data.totalCount);
        this.auditLogsLoading.set(false);
      },
      error: () => {
        this.auditLogsError.set('Failed to load audit logs.');
        this.auditLogsLoading.set(false);
      }
    });
  }

  applyAuditFilters() {
    this.appliedAuditSearch   = this.auditSearchInput;
    this.appliedAuditFromDate = this.auditFromDateInput;
    this.appliedAuditToDate   = this.auditToDateInput;
    this.auditLogPage = 1;
    this.loadAuditLogs();
  }

  clearAuditFilters() {
    this.auditSearchInput   = '';
    this.auditFromDateInput = '';
    this.auditToDateInput   = '';
    this.appliedAuditSearch   = '';
    this.appliedAuditFromDate = '';
    this.appliedAuditToDate   = '';
    this.auditLogPage = 1;
    this.loadAuditLogs();
  }

  onAuditSearchChange() {
    // Live search — apply immediately without needing Apply button
    this.appliedAuditSearch = this.auditSearchInput;
    this.auditLogPage = 1;
    this.loadAuditLogs();
  }

  get auditLogTotalPages(): number {
    return Math.max(1, Math.ceil(this.auditTotalCount() / this.auditLogPageSize));
  }

  // auditLogPagedItems is now just the current page from the backend
  get auditLogPagedItems(): AuditLogDto[] {
    return this.auditLogs();
  }

  get auditLogPageNumbers(): number[] {
    return this.getPageNumbers(this.auditLogPage, this.auditLogTotalPages);
  }

  get hasAuditFilters(): boolean {
    return !!(this.appliedAuditSearch || this.appliedAuditFromDate || this.appliedAuditToDate);
  }

  // ── Tabs ──────────────────────────────────────────

  setTab(tab: ActiveTab) {
    this.activeTab.set(tab);
    if (tab === 'auditLogs' && this.auditLogs().length === 0 && !this.auditLogsLoading()) {
      this.loadAuditLogs();
    }

  }

  // ── Delete modal (surveys) ────────────────────────

  openDeleteModal(id: number, name: string) {
    this.deleteTarget.set({ id, name });
    this.deleteError.set('');
    this.showDeleteModal.set(true);
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
    this.deleteTarget.set(null);
    this.deleteError.set('');
  }

  confirmDelete() {
    const target = this.deleteTarget();
    if (!target) return;
    this.isDeleting.set(true);
    this.deleteError.set('');
    this.adminService.deleteSurvey(target.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        this.loadSurveys(); // reload to reflect accurate counts
      },
      error: () => {
        this.deleteError.set('Delete failed. Please try again.');
        this.isDeleting.set(false);
      }
    });
  }

  // ── Shared page number helper ─────────────────────

  private getPageNumbers(current: number, total: number): number[] {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    let start = Math.max(1, current - 2);
    let end   = Math.min(total, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  // ── Audit badge helpers ───────────────────────────

  getActionClass(action: string): string {
    if (action === 'Survey Activated')    return 'badge-activated';
    if (action === 'Survey Deactivated')  return 'badge-deactivated';
    if (action === 'Survey Updated')      return 'badge-updated';
    if (action === 'Survey Deleted')      return 'badge-deleted';
    if (action === 'Creator Activated')   return 'badge-activated';
    if (action === 'Creator Deactivated') return 'badge-deactivated';
    return 'badge-default';
  }

  getActionIcon(action: string): string {
    if (action === 'Survey Activated')    return '✅';
    if (action === 'Survey Deactivated')  return '⏸️';
    if (action === 'Survey Updated')      return '✏️';
    if (action === 'Survey Deleted')      return '🗑️';
    if (action === 'Creator Activated')   return '✅';
    if (action === 'Creator Deactivated') return '🚫';
    return '📝';
  }

  // Bootstrap Icons for audit log badges
  getActionBiIcon(action: string): string {
    if (action === 'Survey Activated')    return 'bi-check-circle-fill';
    if (action === 'Survey Deactivated')  return 'bi-pause-circle-fill';
    if (action === 'Survey Updated')      return 'bi-pencil-fill';
    if (action === 'Survey Deleted')      return 'bi-trash3-fill';
    if (action === 'Creator Activated')   return 'bi-person-check-fill';
    if (action === 'Creator Deactivated') return 'bi-person-slash';
    return 'bi-journal-text';
  }
}
