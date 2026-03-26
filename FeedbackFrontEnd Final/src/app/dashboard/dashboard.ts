import { Component, inject, signal } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SurveyService } from '../Services/survey.service';
import * as XLSX from 'xlsx';
import {
  CreatorSurveyListDto,
  UpdateSurveyDto,
  GetMySurveysRequestDto,
  PagedSurveyResponseDto
} from '../models/survey.models';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {

  private surveyService = inject(SurveyService);

  // ── Data ─────────────────────────────────────────
  surveys = signal<CreatorSurveyListDto[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');

  // ── Stats ─────────────────────────────────────────
  totalSurveys = signal(0);
  totalResponses = signal(0);
  activeSurveys = signal(0);

  // ── Pagination ────────────────────────────────────
  pageNumber = 1;
  pageSize = 10;
  totalCount = signal(0);

  // ── Filters (live — bound to inputs) ──────────────
  fromDate = '';
  toDate = '';
  isActiveFilter: boolean | null = null;

  // ── Applied Filters (only update on Apply click) ──
  // ✅ FIX: tags only show after Apply, not on dropdown change
  appliedFromDate = '';
  appliedToDate = '';
  appliedIsActiveFilter: boolean | null = null;

  // ── Delete ────────────────────────────────────────
  deletingSurveyId = signal<number | null>(null);
  showDeleteModal = signal(false);
  surveyToDelete = signal<CreatorSurveyListDto | null>(null);

  // ── Edit ──────────────────────────────────────────
  showEditModal = signal(false);
  editingSurvey = signal<CreatorSurveyListDto | null>(null);
  // ✅ Extended to include expireAt and maxResponses
  editForm: {
    title: string;
    description: string;
    expireAt: string;        // datetime-local input needs string
    maxResponses: number | null;
  } = { title: '', description: '', expireAt: '', maxResponses: null };
  isEditLoading = signal(false);
  editError = signal('');

  // ── Toggle ────────────────────────────────────────
  togglingId = signal<number | null>(null);

  // ── Copy link ─────────────────────────────────────
  copiedId = signal<number | null>(null);

  // ── Import from Excel ─────────────────────────────
  showImportModal = signal(false);
  importTitle = '';
  importDescription = '';
  importFile: File | null = null;
  importFileName = '';
  importExpireAt = '';
  importMaxResponses: number | null = null;
  isImporting = signal(false);
  importError = signal('');
  importSuccess = signal('');

  constructor() {
    this.loadSurveys();
  }

  // ── Pagination helpers ────────────────────────────

  get totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize);
  }

  get startIndex(): number {
    return this.totalCount() === 0 ? 0 : (this.pageNumber - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    return Math.min(this.pageNumber * this.pageSize, this.totalCount());
  }

  // ✅ FIX: hasActiveFilters now based on APPLIED values, not live values
  get hasActiveFilters(): boolean {
    return !!(this.appliedFromDate || this.appliedToDate || this.appliedIsActiveFilter !== null);
  }

  // ── Load ──────────────────────────────────────────

  loadSurveys() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const request: GetMySurveysRequestDto = {
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      fromDate: this.appliedFromDate || null,
      toDate: this.appliedToDate || null,
      isActive: this.appliedIsActiveFilter
    };

    this.surveyService.getMySurveys(request).subscribe({
      next: (data: PagedSurveyResponseDto) => {
        this.surveys.set(data.surveys);
        this.totalCount.set(data.totalCount);

        if (this.pageNumber === 1 && !this.hasActiveFilters) {
          this.totalSurveys.set(data.totalCount);
          this.totalResponses.set(data.totalResponsesCount);
          this.activeSurveys.set(data.totalActiveSurveys);
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load surveys. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  // ── Filter actions ────────────────────────────────

  applyFilters() {
    // ✅ FIX: copy live values to applied values only on Apply click
    this.appliedFromDate = this.fromDate;
    this.appliedToDate = this.toDate;
    this.appliedIsActiveFilter = this.isActiveFilter;
    this.pageNumber = 1;
    this.loadSurveys();
  }

  clearFilters() {
    // Clear both live and applied values
    this.fromDate = '';
    this.toDate = '';
    this.isActiveFilter = null;
    this.appliedFromDate = '';
    this.appliedToDate = '';
    this.appliedIsActiveFilter = null;
    this.pageNumber = 1;
    this.loadSurveys();
  }

  // ── Pagination actions ────────────────────────────

  nextPage() {
    if (this.pageNumber < this.totalPages) {
      this.pageNumber++;
      this.loadSurveys();
    }
  }

  prevPage() {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.loadSurveys();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.pageNumber = page;
      this.loadSurveys();
    }
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const half = 2;
    let start = Math.max(1, this.pageNumber - half);
    let end = Math.min(total, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  // ── Toggle Status ─────────────────────────────────

  toggleStatus(survey: CreatorSurveyListDto) {
    this.togglingId.set(survey.surveyId);
    this.surveyService.toggleSurveyStatus(survey.surveyId).subscribe({
      next: () => {
        this.surveys.update(list =>
          list.map(s =>
            s.surveyId === survey.surveyId ? { ...s, isActive: !s.isActive } : s //spread operator copies existin objct and updates only specific field
          )
        );
        this.loadSurveys();
        this.togglingId.set(null);
      },
      error: () => this.togglingId.set(null)
    });
  }

  // ── Delete ────────────────────────────────────────

  openDeleteModal(survey: CreatorSurveyListDto) {
    this.surveyToDelete.set(survey);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
    this.surveyToDelete.set(null);
  }

  confirmDelete() {
    const survey = this.surveyToDelete();
    if (!survey) return;
    this.deletingSurveyId.set(survey.surveyId);
    this.surveyService.deleteSurvey(survey.surveyId).subscribe({
      next: () => {
        this.surveys.update(list => list.filter(s => s.surveyId !== survey.surveyId));
        this.totalCount.update(n => n - 1);
        this.totalSurveys.update(n => n - 1);
        if (survey.isActive) this.activeSurveys.update(n => n - 1);
        this.totalResponses.update(n => n - survey.totalResponses);
        this.deletingSurveyId.set(null);
        this.closeDeleteModal();
      },
      error: () => {
        this.deletingSurveyId.set(null);
        this.closeDeleteModal();
      }
    });
  }

  // ── Edit ──────────────────────────────────────────

  openEditModal(survey: CreatorSurveyListDto) {
    this.editingSurvey.set(survey);
    this.editError.set('');

    // ✅ Pre-populate all fields including expireAt and maxResponses
    // datetime-local input needs format "yyyy-MM-ddTHH:mm" so we slice to 16 chars
    this.editForm = {
      title: survey.title,
      description: survey.description,
      expireAt: survey.expireAt
        ? new Date(survey.expireAt).toISOString().substring(0, 16)
        : '',
      maxResponses: survey.maxResponses ?? null
    };

    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.editingSurvey.set(null);
    this.editError.set('');
  }

  saveEdit() {
    const survey = this.editingSurvey();
    if (!survey || !this.editForm.title.trim()) return;

    this.isEditLoading.set(true);
    this.editError.set('');

    // ✅ Build the DTO — convert expireAt string back to ISO format for backend
    const dto: UpdateSurveyDto = {
      title: this.editForm.title,
      description: this.editForm.description,
      expireAt: this.editForm.expireAt
        ? new Date(this.editForm.expireAt).toISOString()
        : null,
      maxResponses: this.editForm.maxResponses || null
    };

    this.surveyService.updateSurvey(survey.surveyId, dto).subscribe({
      next: () => {
        this.surveys.update(list =>
          list.map(s =>
            s.surveyId === survey.surveyId
              ? {
                ...s,
                title: dto.title,
                description: dto.description,
                expireAt: dto.expireAt,
                maxResponses: dto.maxResponses
              }
              : s
          )
        );
        this.isEditLoading.set(false);
        this.closeEditModal();
      },
      error: () => {
        this.editError.set('Failed to update survey. Please try again.');
        this.isEditLoading.set(false);
      }
    });
  }

  // ── Copy Public Link ──────────────────────────────

  copyPublicLink(survey: CreatorSurveyListDto) {
    const link = `http://localhost:4200/survey/${survey.publicIdentifier}`;
    navigator.clipboard.writeText(link).then(() => {
      this.copiedId.set(survey.surveyId);
      setTimeout(() => this.copiedId.set(null), 2000);
    });
  }

  // ── Import from Excel ─────────────────────────────

  openImportModal() {
    this.importTitle = '';
    this.importDescription = '';
    this.importFile = null;
    this.importFileName = '';
    this.importExpireAt = '';
    this.importMaxResponses = null;
    this.importError.set('');
    this.importSuccess.set('');
    this.showImportModal.set(true);
  }

  closeImportModal() {
    this.showImportModal.set(false);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (!file.name.endsWith('.xlsx')) {
        this.importError.set('Only .xlsx files are supported.');
        this.importFile = null;
        this.importFileName = '';
        return;
      }
      this.importFile = file;
      this.importFileName = file.name;
      this.importError.set('');
    }
  }

  submitImport() {
    this.importError.set('');
    this.importSuccess.set('');

    if (!this.importTitle.trim()) {
      this.importError.set('Survey title is required.');
      return;
    }

    if (!this.importFile) {
      this.importError.set('Please select an Excel file.');
      return;
    }

    this.isImporting.set(true);

    const expireAt = this.importExpireAt
      ? new Date(this.importExpireAt).toISOString()
      : null;

    this.surveyService.importSurveyFromExcel(
      this.importTitle.trim(),
      this.importDescription.trim(),
      this.importFile,
      expireAt,
      this.importMaxResponses
    ).subscribe({
      next: () => {
        this.isImporting.set(false);
        this.importSuccess.set('Survey imported successfully!');
        setTimeout(() => {
          this.closeImportModal();
          this.loadSurveys();
        }, 1500);
      },
      error: (err) => {
        this.isImporting.set(false);
        this.importError.set(
          err?.error?.message || 'Import failed. Please check the file format and try again.'
        );
      }
    });
  }

  // ── Download Excel Template ✅ NEW ────────────────
  // Generates a sample .xlsx file using SheetJS so users
  // know exactly how to format their questions file.
  // Requires: npm install xlsx

  downloadExcelTemplate() {
    const templateRows = [
      // Header row explaining each column
      [
        'Question Text',
        'Type (Text / Rating / MultipleChoice)',
        'Option 1 (MultipleChoice only)',
        'Option 2 (MultipleChoice only)',
        'Option 3 (MultipleChoice only)'
      ],
      // Example rows
      ['How satisfied are you with our service?', 'Rating'],
      ['Please describe your experience', 'Text'],
      ['Which feature do you use most?', 'MultipleChoice', 'Dashboard', 'Analytics', 'Reports']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateRows);

    // Set column widths for readability
    worksheet['!cols'] = [
      { wch: 45 },
      { wch: 35 },
      { wch: 22 },
      { wch: 22 },
      { wch: 22 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');

    XLSX.writeFile(workbook, 'survey_template.xlsx');
  }
}
