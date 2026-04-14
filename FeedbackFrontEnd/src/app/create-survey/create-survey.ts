import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SurveyService } from '../Services/survey.service';
import { QuestionBankService } from '../Services/question-bank.service';
import { CreateSurveyDto, CreateQuestionDto, QuestionType } from '../models/survey.models';
import { QuestionBankResponseDto } from '../models/question-bank.models';
import { parseAndValidateEmails } from '../utils/email-validator';

interface QuestionForm {
  id: number;
  text: string;
  questionType: QuestionType;
  options: string[];
  fromBank: boolean;
  questionBankId?: number;
}

@Component({
  selector: 'app-create-survey',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './create-survey.html',
  styleUrl: './create-survey.css'
})
export class CreateSurvey {

    minExpiryDate = '';


  ngOnInit() {
    const now = new Date();
    now.setSeconds(0);
    now.setMilliseconds(0);

    this.minExpiryDate = now.toISOString().slice(0, 16);
  }

  private surveyService = inject(SurveyService);
  private questionBankService = inject(QuestionBankService);
  private router = inject(Router);

  QuestionType = QuestionType;

  // Survey Details
  title = '';
  description = '';
  expireAt = '';
  maxResponses: number | null = null;

  // Private Survey
  isPrivate = false;
  participantEmailsInput = '';   // raw textarea input
  participantEmails: string[] = [];
  emailInputError = '';

  // Questions
  questions = signal<QuestionForm[]>([]);
  nextId = 1;

  // Submit State
  isSubmitting = signal(false);
  submitError = signal('');
  submitSuccess = signal('');

  // Question Bank Modal
  showBankModal = signal(false);
  bankQuestions = signal<QuestionBankResponseDto[]>([]);
  bankLoading = signal(false);
  bankError = signal('');
  bankPage = 1;
  bankPageSize = 8;
  bankTotalCount = signal(0);
  bankTypeFilter: QuestionType | '' = '';
  selectedBankIds = new Set<number>();

  // Add Question Form (inline)
  showAddForm = signal(false);
  newQuestion: QuestionForm = this.emptyQuestion();

  private emptyQuestion(): QuestionForm {
    return { id: this.nextId++, text: '', questionType: QuestionType.Text, options: ['', ''], fromBank: false };
  }

  // ── Private Survey helpers ────────────────────────

  onPrivateToggle() {
    if (!this.isPrivate) {
      this.participantEmailsInput = '';
      this.participantEmails = [];
      this.emailInputError = '';
    }
  }

  parseEmails() {
    const result = parseAndValidateEmails(this.participantEmailsInput);
    this.emailInputError = result.error;
    if (!result.error) {
      this.participantEmails = result.emails;
    }
  }

  removeEmail(email: string) {
    this.participantEmails = this.participantEmails.filter(e => e !== email);
    this.participantEmailsInput = this.participantEmails.join('\n');
  }

  // ── Add Question Manually ─────────────────────────

  openAddForm() { this.newQuestion = this.emptyQuestion(); this.showAddForm.set(true); }
  closeAddForm() { this.showAddForm.set(false); }
  addOption() { this.newQuestion.options.push(''); }
  removeOption(i: number) { if (this.newQuestion.options.length > 2) this.newQuestion.options.splice(i, 1); }
  trackOption(i: number) { return i; }

  saveQuestion() {
    if (!this.newQuestion.text.trim()) return;
    if (this.newQuestion.questionType === QuestionType.MultipleChoice) {
      const valid = this.newQuestion.options.filter(o => o.trim());
      if (valid.length < 2) return;
      this.newQuestion.options = valid;
    }
    this.questions.update(list => [...list, { ...this.newQuestion }]);
    this.showAddForm.set(false);
  }

  removeQuestion(id: number) { this.questions.update(list => list.filter(q => q.id !== id)); }

  moveUp(i: number) {
    if (i === 0) return;
    this.questions.update(list => { const a = [...list]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a; });
  }

  moveDown(i: number) {
    if (i === this.questions().length - 1) return;
    this.questions.update(list => { const a = [...list]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a; });
  }

  // ── Question Bank Modal ───────────────────────────

  openBankModal() {
    this.selectedBankIds.clear(); this.bankPage = 1; this.bankTypeFilter = '';
    this.showBankModal.set(true); this.loadBankQuestions();
  }
  closeBankModal() { this.showBankModal.set(false); }

  loadBankQuestions() {
    this.bankLoading.set(true); this.bankError.set('');
    this.questionBankService.getMyQuestions({
      pageNumber: this.bankPage, pageSize: this.bankPageSize,
      questionType: this.bankTypeFilter !== '' ? this.bankTypeFilter : null
    }).subscribe({
      next: (res) => { this.bankQuestions.set(res.questions); this.bankTotalCount.set(res.totalCount); this.bankLoading.set(false); },
      error: () => { this.bankError.set('Failed to load questions.'); this.bankLoading.set(false); }
    });
  }

  onBankFilterChange() { this.bankPage = 1; this.loadBankQuestions(); }
  bankNextPage() { if (this.bankPage * this.bankPageSize < this.bankTotalCount()) { this.bankPage++; this.loadBankQuestions(); } }
  bankPrevPage() { if (this.bankPage > 1) { this.bankPage--; this.loadBankQuestions(); } }
  toggleBankSelect(id: number) { this.selectedBankIds.has(id) ? this.selectedBankIds.delete(id) : this.selectedBankIds.add(id); }
  isBankSelected(id: number) { return this.selectedBankIds.has(id); }

  addSelectedFromBank() {
    const newOnes: QuestionForm[] = this.bankQuestions()
      .filter(q => this.selectedBankIds.has(q.id))
      .map(q => ({ id: this.nextId++, text: q.text, questionType: q.questionType, options: q.options ?? [], fromBank: true, questionBankId: q.id }));
    this.questions.update(list => [...list, ...newOnes]);
    this.closeBankModal();
  }

  // ── Helpers ───────────────────────────────────────

  getTypeName(type: QuestionType): string {
    return { [QuestionType.Text]: 'Text', [QuestionType.Rating]: 'Rating (1–10)', [QuestionType.MultipleChoice]: 'Multiple Choice' }[type] ?? 'Unknown';
  }

  getTypeIcon(type: QuestionType): string {
    return { [QuestionType.Text]: '✏️', [QuestionType.Rating]: '⭐', [QuestionType.MultipleChoice]: '☑️' }[type] ?? '❓';
  }

  get bankTotalPages(): number { return Math.ceil(this.bankTotalCount() / this.bankPageSize); }

  // ── Invitation Email Builder ──────────────────────
  // Builds the HTML invitation email that is sent to each participant.
  // The backend receives this HTML and sends it as-is — no HTML in the backend.

  buildInvitationEmail(): string {

  const baseUrl = window.location.origin;
  const surveyLink = `${baseUrl}/survey/SURVEY_LINK/verify`;
  const title = this.title.trim();


    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f6fa; margin: 0; padding: 0; }
  .wrapper { max-width: 560px; margin: 32px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,.08); }
  .header  { background: #1a1a2e; padding: 28px 32px; text-align: center; }
  .header h1 { color: #7c83fd; margin: 0; font-size: 22px; }
  .body    { padding: 32px; text-align: center; }
  .icon    { font-size: 48px; margin-bottom: 16px; }
  .heading { font-size: 18px; font-weight: 700; color: #1a1a2e; margin-bottom: 8px; }
  .message { font-size: 15px; color: #374151; line-height: 1.6; margin-bottom: 28px; }
  .survey-name { font-weight: 700; color: #7c83fd; }
  .btn     { display: inline-block; background: #7c83fd; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; }
  .note    { font-size: 12px; color: #9ca3af; margin-top: 20px; line-height: 1.5; }
  .footer  { background: #f9fafb; padding: 16px 32px; font-size: 12px; color: #9ca3af; text-align: center; border-top: 1px solid #f3f4f6; }
</style></head>
<body>
  <div class="wrapper">
    <div class="header"><h1>📋 FeedbackApp</h1></div>
    <div class="body">
      <div class="icon">👋</div>
      <div class="heading">You've been invited!</div>
      <p class="message">
        You are invited to complete the survey:<br>
        <span class="survey-name">&quot;${this.escapeHtml(title)}&quot;</span><br><br>
        Please complete the survey at your earliest convenience.
      </p>
      <a href="${surveyLink}" class="btn">Access Survey</a>
      <p class="note">
        You will need to verify your email with a one-time password (OTP) to access the survey.<br>
        If you did not expect this invitation, you can safely ignore this email.
      </p>
    </div>
    <div class="footer">Sent by FeedbackApp &nbsp;·&nbsp; Do not reply to this email</div>
  </div>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Submit Survey ─────────────────────────────────

  submitSurvey() {
    this.submitError.set(''); this.submitSuccess.set('');

    if (!this.title.trim()) { this.submitError.set('Survey title is required.'); return; }
    if (this.questions().length === 0) { this.submitError.set('Please add at least one question.'); return; }

    if (this.isPrivate) {
      // Re-parse emails on submit to catch any unsaved input
      this.parseEmails();
      if (this.emailInputError) return;
      if (this.participantEmails.length === 0) {
        this.submitError.set('Please add at least one participant email for a private survey.');
        return;
      }
    }

    const dto: CreateSurveyDto = {
      title: this.title.trim(),
      description: this.description.trim(),
      expireAt: this.expireAt ? new Date(this.expireAt).toISOString() : null,
      maxResponses: this.maxResponses || null,
      isPrivate: this.isPrivate,
      participantEmails: this.isPrivate ? this.participantEmails : undefined,
      invitationHtmlBody: this.isPrivate ? this.buildInvitationEmail() : undefined,
      questions: this.questions().map(q => {
        const question: CreateQuestionDto = {};
        if (q.fromBank && q.questionBankId) {
          question.questionBankId = q.questionBankId;
        } else {
          question.text = q.text;
          question.questionType = q.questionType;
          if (q.questionType === QuestionType.MultipleChoice)
            question.options = q.options.filter(o => o.trim());
        }
        return question;
      })
    };

    this.isSubmitting.set(true);
    this.surveyService.createSurvey(dto).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.submitSuccess.set('Survey created successfully!');
        setTimeout(() => this.router.navigateByUrl('/dashboard'), 1500);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.submitError.set(err?.error?.message || 'Failed to create survey. Please try again.');
      }
    });
  }
}