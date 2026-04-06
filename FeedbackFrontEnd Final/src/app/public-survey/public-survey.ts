import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PublicSurveyService } from '../Services/public-survey.service';
import {
  PublicSurveyDto,
  PublicQuestionDto,
  SubmitSurveyDto,
  SubmitAnswerDto
} from '../models/public-survey.models';
import { QuestionType } from '../models/survey.models';

@Component({
  selector: 'app-public-survey',
  imports: [CommonModule, FormsModule],
  templateUrl: './public-survey.html',
  styleUrl: './public-survey.css'
})
export class PublicSurvey {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private publicSurveyService = inject(PublicSurveyService);

  QuestionType = QuestionType;
  publicIdentifier = '';

  isLoading = signal(true);
  survey = signal<PublicSurveyDto | null>(null);
  errorMessage = signal('');
  alreadySubmitted = signal(false);
  submitSuccess = signal(false);
  isSubmitting = signal(false);
  submitError = signal('');

  answers: Map<number, string | number> = new Map();
  unanswered = new Set<number>();

  constructor() {
    this.publicIdentifier = this.route.snapshot.paramMap.get('publicIdentifier') ?? '';
    this.checkAlreadySubmitted();

    // First check if private — redirect to OTP page if so
    this.publicSurveyService.checkIsPrivate(this.publicIdentifier).subscribe({
      next: (res) => {
        if (res.isPrivate) {
          this.router.navigate(['/survey', this.publicIdentifier, 'verify'], { replaceUrl: true });
        } else {
          this.loadSurvey();
        }
      },
      error: () => {
        // If check fails just try loading normally
        this.loadSurvey();
      }
    });
  }

  //  Duplicate Prevention 
  // Store the token in localStorage keyed by publicIdentifier.
  // On load, if a token exists AND was already submitted, block re-submission.

  private storageKey(): string {
    return `survey_token_${this.publicIdentifier}`;
  }

  private submittedKey(): string {
    return `survey_submitted_${this.publicIdentifier}`;
  }

  private getOrCreateToken(): string {
    let token = localStorage.getItem(this.storageKey());
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem(this.storageKey(), token);
    }
    return token;
  }

  checkAlreadySubmitted() {
    const submitted = localStorage.getItem(this.submittedKey());
    if (submitted === 'true') {
      this.alreadySubmitted.set(true);
    }
  }

  //  Load Survey 

  loadSurvey() {
    this.isLoading.set(true);

    this.publicSurveyService.getSurvey(this.publicIdentifier).subscribe({
      next: (data) => {
        this.survey.set(data);
        // Pre-initialise answers map
        data.questions.forEach(q => {
          if (q.questionType === QuestionType.Rating) {
            this.answers.set(q.questionId, '');
          }
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        if (err.status === 400) {
          this.errorMessage.set(err.error?.message ?? 'This survey is no longer available.');
        } else if (err.status === 404) {
          this.errorMessage.set('Survey not found.');
        } else {
          this.errorMessage.set('Failed to load survey. Please try again.');
        }
        this.isLoading.set(false);
      }
    });
  }

  //  Answer Helpers 

  getTextAnswer(questionId: number): string {
    return (this.answers.get(questionId) as string) ?? '';
  }

  setTextAnswer(questionId: number, value: string) {
    this.answers.set(questionId, value);
    this.unanswered.delete(questionId);
  }

  getRatingAnswer(questionId: number): number {
    const val = this.answers.get(questionId);
    return val !== undefined && val !== '' ? Number(val) : 0;
  }

  setRating(questionId: number, value: number) {
    this.answers.set(questionId, value);
    this.unanswered.delete(questionId);
  }

  getSelectedOption(questionId: number): number {
    return (this.answers.get(questionId) as number) ?? 0;
  }

  setSelectedOption(questionId: number, optionId: number) {
    this.answers.set(questionId, optionId);
    this.unanswered.delete(questionId);
  }

  isUnanswered(questionId: number): boolean {
    return this.unanswered.has(questionId);
  }

  // Rating stars array for a given max
  ratingRange(question: PublicQuestionDto): number[] {
    // Backend stores rating as 1-10 by default
    return Array.from({ length: 10 }, (_, i) => i + 1);
  }

  //  Submit 

  submitSurvey() {
    this.unanswered.clear();
    this.submitError.set('');

    const questions = this.survey()?.questions ?? [];

    // Validate all questions answered
    let valid = true;
    for (const q of questions) {
      const ans = this.answers.get(q.questionId);
      if (ans === undefined || ans === '' || ans === 0) {
        this.unanswered.add(q.questionId);
        valid = false;
      }
    }

    if (!valid) {
      this.submitError.set('Please answer all questions before submitting.');
      return;
    }

    const token = this.getOrCreateToken();

    const submitAnswers: SubmitAnswerDto[] = questions.map(q => {
      const ans = this.answers.get(q.questionId);
      if (q.questionType === QuestionType.Text) {
        return { questionId: q.questionId, textAnswer: ans as string };
      } else if (q.questionType === QuestionType.Rating) {
        return { questionId: q.questionId, ratingValue: Number(ans) };
      } else {
        return { questionId: q.questionId, selectedOptionId: ans as number };
      }
    });

    const dto: SubmitSurveyDto = {
      answers: submitAnswers,
      responseToken: token
    };

    this.isSubmitting.set(true);

    this.publicSurveyService.submitSurvey(this.publicIdentifier, dto).subscribe({
      next: () => {
        // 200 OK — mark as submitted and show success
        localStorage.setItem(this.submittedKey(), 'true');
        this.isSubmitting.set(false);
        this.submitSuccess.set(true);
      },
      error: (err) => {
        this.isSubmitting.set(false);

        // Backend error middleware returns JSON: {"success":false,"message":"..."}
        // Backend controller returns plain string: "You have already submitted..."
        let msg = '';
        if (typeof err.error === 'string') {
          try {
            const parsed = JSON.parse(err.error);
            msg = parsed.message ?? '';
          } catch {
            // Not JSON — use the raw string directly
            msg = err.error;
          }
        } else {
          msg = err.error?.message ?? '';
        }

        if (msg.toLowerCase().includes('already submitted')) {
          localStorage.setItem(this.submittedKey(), 'true');
          this.alreadySubmitted.set(true);
        } else {
          this.submitError.set(msg || 'Submission failed. Please try again.');
        }
      }
    });
  }

  getTypeName(type: QuestionType): string {
    const map: Record<number, string> = {
      [QuestionType.Text]: 'Text Answer',
      [QuestionType.Rating]: 'Rating',
      [QuestionType.MultipleChoice]: 'Multiple Choice'
    };
    return map[type] ?? '';
  }
}
