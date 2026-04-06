import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PublicSurveyService } from '../Services/public-survey.service';
import {
  PublicSurveyDto,
  SubmitSurveyDto,
  SubmitAnswerDto
} from '../models/public-survey.models';
import { QuestionType } from '../models/survey.models';

type Step = 'email' | 'otp' | 'survey' | 'success';

@Component({
  selector: 'app-private-survey-otp',
  imports: [CommonModule, FormsModule],
  templateUrl: './private-survey-otp.html',
  styleUrl: './private-survey-otp.css'
})
export class PrivateSurveyOtp {

  private route = inject(ActivatedRoute);
  private svc   = inject(PublicSurveyService);

  QuestionType = QuestionType;

  // From route
  publicIdentifier = '';
  surveyId = 0;

  // Steps
  step = signal<Step>('email');

  // Email step
  email = '';
  emailError = signal('');
  isSendingOtp = signal(false);

  // OTP step
  otp = '';
  otpError = signal('');
  isVerifying = signal(false);
  isResending = signal(false);
  resendSuccess = signal('');

  // Survey step
  survey = signal<PublicSurveyDto | null>(null);
  surveyLoading = signal(false);
  surveyError = signal('');
  answers: Map<number, string | number> = new Map();
  unanswered = new Set<number>();
  isSubmitting = signal(false);
  submitError = signal('');

  constructor() {
    this.publicIdentifier = this.route.snapshot.paramMap.get('publicIdentifier') ?? '';
    // Resolve surveyId from the is-private check
    this.svc.checkIsPrivate(this.publicIdentifier).subscribe({
      next: (res) => { this.surveyId = res.surveyId; },
      error: () => { this.emailError.set('Survey not found or inactive.'); }
    });
  }

  // ── Step 1: Send OTP ─────────────────────────────

  sendOtp() {
    this.emailError.set('');
    if (!this.email.trim() || !this.email.includes('@')) {
      this.emailError.set('Please enter a valid email address.');
      return;
    }
    this.isSendingOtp.set(true);
    this.svc.sendOtp(this.surveyId, this.email.trim()).subscribe({
      next: () => {
        this.isSendingOtp.set(false);
        this.step.set('otp');
      },
      error: (err) => {
        this.isSendingOtp.set(false);
        this.emailError.set(err?.error?.message || 'Failed to send OTP. Check your email and try again.');
      }
    });
  }

  // ── Step 2: Verify OTP ───────────────────────────

  verifyOtp() {
    this.otpError.set('');
    if (!this.otp.trim()) { this.otpError.set('Please enter the OTP.'); return; }
    this.isVerifying.set(true);
    this.svc.verifyOtp(this.surveyId, this.email.trim(), this.otp.trim()).subscribe({
      next: () => {
        this.isVerifying.set(false);
        this.loadSurvey();
      },
      error: (err) => {
        this.isVerifying.set(false);
        this.otpError.set(err?.error?.message || 'Invalid or expired OTP. Please try again.');
      }
    });
  }

  resendOtp() {
    this.resendSuccess.set('');
    this.otpError.set('');
    this.isResending.set(true);
    this.svc.sendOtp(this.surveyId, this.email.trim()).subscribe({
      next: () => { this.isResending.set(false); this.resendSuccess.set('A new OTP has been sent to your email.'); },
      error: (err) => { this.isResending.set(false); this.otpError.set(err?.error?.message || 'Failed to resend OTP.'); }
    });
  }

  // ── Step 3: Load & show survey ───────────────────

  loadSurvey() {
    this.surveyLoading.set(true);
    this.svc.getPrivateSurvey(this.surveyId, this.email.trim()).subscribe({
      next: (data) => {
        this.survey.set(data);
        this.surveyLoading.set(false);
        this.step.set('survey');
      },
      error: (err) => {
        this.surveyLoading.set(false);
        this.surveyError.set(err?.error?.message || 'Failed to load survey.');
      }
    });
  }

  // ── Answer helpers ────────────────────────────────

  getTextAnswer(qId: number): string { return (this.answers.get(qId) as string) ?? ''; }
  setTextAnswer(qId: number, v: string) { this.answers.set(qId, v); this.unanswered.delete(qId); }
  getRatingAnswer(qId: number): number { const v = this.answers.get(qId); return v !== undefined && v !== '' ? Number(v) : 0; }
  setRating(qId: number, v: number) { this.answers.set(qId, v); this.unanswered.delete(qId); }
  getSelectedOption(qId: number): number { return (this.answers.get(qId) as number) ?? 0; }
  setSelectedOption(qId: number, optId: number) { this.answers.set(qId, optId); this.unanswered.delete(qId); }
  isUnanswered(qId: number): boolean { return this.unanswered.has(qId); }
  ratingRange(): number[] { return Array.from({ length: 10 }, (_, i) => i + 1); }

  getTypeName(type: QuestionType): string {
    return { [QuestionType.Text]: 'Text Answer', [QuestionType.Rating]: 'Rating', [QuestionType.MultipleChoice]: 'Multiple Choice' }[type] ?? '';
  }

  // ── Step 4: Submit ────────────────────────────────

  submitSurvey() {
    this.unanswered.clear();
    this.submitError.set('');
    const questions = this.survey()?.questions ?? [];

    let valid = true;
    for (const q of questions) {
      const ans = this.answers.get(q.questionId);
      if (ans === undefined || ans === '' || ans === 0) {
        this.unanswered.add(q.questionId);
        valid = false;
      }
    }
    if (!valid) { this.submitError.set('Please answer all questions before submitting.'); return; }

    const submitAnswers: SubmitAnswerDto[] = questions.map(q => {
      const ans = this.answers.get(q.questionId);
      if (q.questionType === QuestionType.Text) return { questionId: q.questionId, textAnswer: ans as string };
      if (q.questionType === QuestionType.Rating) return { questionId: q.questionId, ratingValue: Number(ans) };
      return { questionId: q.questionId, selectedOptionId: ans as number };
    });

    const dto: SubmitSurveyDto = { answers: submitAnswers, responseToken: this.email.trim() };

    this.isSubmitting.set(true);
    this.svc.submitPrivateSurvey(this.surveyId, this.email.trim(), dto).subscribe({
      next: () => { this.isSubmitting.set(false); this.step.set('success'); },
      error: (err) => {
        this.isSubmitting.set(false);
        this.submitError.set(err?.error?.message || 'Submission failed. Please try again.');
      }
    });
  }
}
