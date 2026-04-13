import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuestionBankService } from '../Services/question-bank.service';
import { TokenService } from '../Services/token.service';
import {
  QuestionBankResponseDto,
  CreateQuestionBankDto,
  UpdateQuestionBankDto
} from '../models/question-bank.models';
import { QuestionType } from '../models/survey.models';

@Component({
  selector: 'app-question-bank',
  imports: [CommonModule, FormsModule],
  templateUrl: './question-bank.html',
  styleUrl: './question-bank.css'
})
export class QuestionBank {

  private qbService    = inject(QuestionBankService);
  private tokenService = inject(TokenService);

  QuestionType = QuestionType;

  // Current user's ID — used to show edit/delete only on own questions
  private currentUserId = this.tokenService.getUserId();

  // Is the logged-in user an Admin? (Admin sees all questions but can only edit/delete their own)
  isAdmin = this.tokenService.getRole() === 'Admin';

  // Returns true if the current user owns this question
  isOwner(q: { createdById: number }): boolean {
    return q.createdById === this.currentUserId;
  }

  // ── List State ────────────────────────────────────
  questions    = signal<QuestionBankResponseDto[]>([]);
  isLoading    = signal(true);
  errorMessage = signal('');
  totalCount   = signal(0);

  // ── Pagination & Filter ───────────────────────────
  pageNumber = 1;
  pageSize   = 8;
  typeFilter: QuestionType | '' = '';

  // ── Add Modal ─────────────────────────────────────
  showAddModal  = signal(false);
  isSubmitting  = signal(false);
  submitError   = signal('');
  submitSuccess = signal('');
  newQuestion: CreateQuestionBankDto = this.emptyForm();
  newOptions: string[] = ['', ''];

  // ── Edit Modal ────────────────────────────────────
  showEditModal   = signal(false);
  editingQuestion = signal<QuestionBankResponseDto | null>(null);
  editText        = '';
  editOptions: string[] = [];
  isEditSaving    = signal(false);
  editError       = signal('');

  // ── Delete Confirm ────────────────────────────────
  showDeleteModal  = signal(false);
  deletingQuestion = signal<QuestionBankResponseDto | null>(null);
  isDeleting       = signal(false);
  deleteError      = signal('');

  constructor() { this.loadQuestions(); }

  // ── Load ──────────────────────────────────────────

  loadQuestions() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.qbService.getMyQuestions({
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      questionType: this.typeFilter !== '' ? this.typeFilter : null
    }).subscribe({
      next: (res) => {
        this.questions.set(res.questions);
        this.totalCount.set(res.totalCount);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load questions. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  onFilterChange() { this.pageNumber = 1; this.loadQuestions(); }

  nextPage() { if (this.pageNumber < this.totalPages) { this.pageNumber++; this.loadQuestions(); } }
  prevPage() { if (this.pageNumber > 1) { this.pageNumber--; this.loadQuestions(); } }

  get totalPages(): number { return Math.ceil(this.totalCount() / this.pageSize); }
  get startIndex(): number { return (this.pageNumber - 1) * this.pageSize + 1; }
  get endIndex(): number   { return Math.min(this.pageNumber * this.pageSize, this.totalCount()); }

  // ── Add Modal ─────────────────────────────────────

  openAddModal() {
    this.newQuestion = this.emptyForm();
    this.newOptions  = ['', ''];
    this.submitError.set('');
    this.submitSuccess.set('');
    this.showAddModal.set(true);
  }

  closeAddModal() { this.showAddModal.set(false); }

  private emptyForm(): CreateQuestionBankDto {
    return { text: '', questionType: QuestionType.Text, options: [] };
  }

  addOption()           { this.newOptions.push(''); }
  removeOption(i: number) { if (this.newOptions.length > 2) this.newOptions.splice(i, 1); }
  trackOption(i: number)  { return i; }

  submitQuestion() {
    this.submitError.set('');
    if (!this.newQuestion.text.trim()) { this.submitError.set('Question text is required.'); return; }
    if (this.newQuestion.questionType === QuestionType.MultipleChoice) {
      const valid = this.newOptions.filter(o => o.trim());
      if (valid.length < 2) { this.submitError.set('Please add at least 2 options.'); return; }
      this.newQuestion.options = valid;
    }
    this.isSubmitting.set(true);
    this.qbService.createQuestions([this.newQuestion]).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.submitSuccess.set('Question added successfully!');
        this.pageNumber = 1; this.typeFilter = '';
        this.loadQuestions();
        setTimeout(() => { this.closeAddModal(); this.submitSuccess.set(''); }, 1200);
      },
      error: () => { this.isSubmitting.set(false); this.submitError.set('Failed to add question.'); }
    });
  }

  // ── Edit Modal ────────────────────────────────────

  openEditModal(q: QuestionBankResponseDto) {
    this.editingQuestion.set(q);
    this.editText    = q.text;
    this.editOptions = q.options ? [...q.options] : [];
    // Ensure at least 2 option slots for MultipleChoice
    while (this.editOptions.length < 2 && q.questionType === QuestionType.MultipleChoice) {
      this.editOptions.push('');
    }
    this.editError.set('');
    this.showEditModal.set(true);
  }

  closeEditModal() { this.showEditModal.set(false); this.editingQuestion.set(null); }

  addEditOption()             { this.editOptions.push(''); }
  removeEditOption(i: number) { if (this.editOptions.length > 2) this.editOptions.splice(i, 1); }

  saveEdit() {
    this.editError.set('');
    const q = this.editingQuestion();
    if (!q) return;
    if (!this.editText.trim()) { this.editError.set('Question text is required.'); return; }

    if (q.questionType === QuestionType.MultipleChoice) {
      const valid = this.editOptions.filter(o => o.trim());
      if (valid.length < 2) { this.editError.set('At least 2 options are required.'); return; }
    }

    const dto: UpdateQuestionBankDto = {
      text: this.editText.trim(),
      options: q.questionType === QuestionType.MultipleChoice
        ? this.editOptions.filter(o => o.trim())
        : undefined
    };

    this.isEditSaving.set(true);
    this.qbService.updateQuestion(q.id, dto).subscribe({
      next: () => {
        this.isEditSaving.set(false);
        this.closeEditModal();
        this.loadQuestions();
      },
      error: (err) => {
        this.isEditSaving.set(false);
        this.editError.set(err?.error?.message || 'Failed to update question.');
      }
    });
  }

  // ── Delete Confirm ────────────────────────────────

  openDeleteModal(q: QuestionBankResponseDto) {
    this.deletingQuestion.set(q);
    this.deleteError.set('');
    this.showDeleteModal.set(true);
  }

  closeDeleteModal() { this.showDeleteModal.set(false); this.deletingQuestion.set(null); }

  confirmDelete() {
    const q = this.deletingQuestion();
    if (!q) return;
    this.isDeleting.set(true);
    this.qbService.deleteQuestion(q.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        // If last item on page, go back one page
        if (this.questions().length === 1 && this.pageNumber > 1) this.pageNumber--;
        this.loadQuestions();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.deleteError.set(err?.error?.message || 'Failed to delete question.');
      }
    });
  }

  // ── Helpers ───────────────────────────────────────

  getTypeName(type: QuestionType): string {
    return { [QuestionType.Text]: 'Text', [QuestionType.Rating]: 'Rating', [QuestionType.MultipleChoice]: 'Multiple Choice' }[type] ?? 'Unknown';
  }

  getTypeIcon(type: QuestionType): string {
    return { [QuestionType.Text]: '✏️', [QuestionType.Rating]: '⭐', [QuestionType.MultipleChoice]: '☑️' }[type] ?? '❓';
  }

  getTypeBadgeClass(type: QuestionType): string {
    return { [QuestionType.Text]: 'badge-text', [QuestionType.Rating]: 'badge-rating', [QuestionType.MultipleChoice]: 'badge-mc' }[type] ?? '';
  }
}
