import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SurveyService } from '../Services/survey.service';
import { QuestionBankService } from '../Services/question-bank.service';
import { CreateSurveyDto, CreateQuestionDto, QuestionType } from '../models/survey.models';
import { QuestionBankResponseDto } from '../models/question-bank.models';

// Local interface for building a question in the UI
interface QuestionForm {
  id: number;                   // temp UI id
  text: string;
  questionType: QuestionType;
  options: string[];            // for MultipleChoice
  fromBank: boolean;            // was picked from question bank
  questionBankId?: number;
}

@Component({
  selector: 'app-create-survey',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './create-survey.html',
  styleUrl: './create-survey.css'
})
export class CreateSurvey {

  private surveyService = inject(SurveyService);
  private questionBankService = inject(QuestionBankService);
  private router = inject(Router);

  // Expose enum to template
  QuestionType = QuestionType;

  //  Survey Details 
  title = '';
  description = '';
  expireAt = '';
  maxResponses: number | null = null;

  //  Questions 
  questions = signal<QuestionForm[]>([]);
  nextId = 1;

  //  Submit State 
  isSubmitting = signal(false);
  submitError = signal('');
  submitSuccess = signal('');

  //  Question Bank Modal 
  showBankModal = signal(false);
  bankQuestions = signal<QuestionBankResponseDto[]>([]);
  bankLoading = signal(false);
  bankError = signal('');
  bankPage = 1;
  bankPageSize = 8;
  bankTotalCount = signal(0);
  bankTypeFilter: QuestionType | '' = '';
  selectedBankIds = new Set<number>();

  //  Add Question Form (inline) 
  showAddForm = signal(false);
  newQuestion: QuestionForm = this.emptyQuestion();

  // ─────────────────────────────────────────────────

  private emptyQuestion(): QuestionForm {
    return {
      id: this.nextId++,
      text: '',
      questionType: QuestionType.Text,
      options: ['', ''],
      fromBank: false
    };
  }

  //  Add Question Manually 

  openAddForm() {
    this.newQuestion = this.emptyQuestion();
    this.showAddForm.set(true);
  }

  closeAddForm() {
    this.showAddForm.set(false);
  }

  addOption() {
    this.newQuestion.options.push('');
  }

  removeOption(index: number) {
    if (this.newQuestion.options.length > 2) {
      this.newQuestion.options.splice(index, 1);
    }
  }

  trackOption(index: number): number {
    return index;
  }

  saveQuestion() {
    if (!this.newQuestion.text.trim()) return;

    if (this.newQuestion.questionType === QuestionType.MultipleChoice) {
      const validOptions = this.newQuestion.options.filter(o => o.trim());
      if (validOptions.length < 2) return;
      this.newQuestion.options = validOptions;
    }

    this.questions.update(list => [...list, { ...this.newQuestion }]);
    this.showAddForm.set(false);
  }

  removeQuestion(id: number) {
    this.questions.update(list => list.filter(q => q.id !== id));
  }

  moveUp(index: number) {
    if (index === 0) return;
    this.questions.update(list => {
      const arr = [...list];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      return arr;
    });
  }

  moveDown(index: number) {
    const list = this.questions();
    if (index === list.length - 1) return;
    this.questions.update(arr => {
      const copy = [...arr];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy;
    });
  }

  //  Question Bank Modal 

  openBankModal() {
    this.selectedBankIds.clear();
    this.bankPage = 1;
    this.bankTypeFilter = '';
    this.showBankModal.set(true);
    this.loadBankQuestions();
  }

  closeBankModal() {
    this.showBankModal.set(false);
  }

  loadBankQuestions() {
    this.bankLoading.set(true);
    this.bankError.set('');

    this.questionBankService.getMyQuestions({
      pageNumber: this.bankPage,
      pageSize: this.bankPageSize,
      questionType: this.bankTypeFilter !== '' ? this.bankTypeFilter : null
    }).subscribe({
      next: (res) => {
        this.bankQuestions.set(res.questions);
        this.bankTotalCount.set(res.totalCount);
        this.bankLoading.set(false);
      },
      error: () => {
        this.bankError.set('Failed to load questions.');
        this.bankLoading.set(false);
      }
    });
  }

  onBankFilterChange() {
    this.bankPage = 1;
    this.loadBankQuestions();
  }

  bankNextPage() {
    if (this.bankPage * this.bankPageSize < this.bankTotalCount()) {
      this.bankPage++;
      this.loadBankQuestions();
    }
  }

  bankPrevPage() {
    if (this.bankPage > 1) {
      this.bankPage--;
      this.loadBankQuestions();
    }
  }

  toggleBankSelect(id: number) {
    if (this.selectedBankIds.has(id)) {
      this.selectedBankIds.delete(id);
    } else {
      this.selectedBankIds.add(id);
    }
  }

  isBankSelected(id: number): boolean {
    return this.selectedBankIds.has(id);
  }

  addSelectedFromBank() {
    const toAdd = this.bankQuestions().filter(q =>
      this.selectedBankIds.has(q.id)
    );

    const newOnes: QuestionForm[] = toAdd.map(q => ({
      id: this.nextId++,
      text: q.text,
      questionType: q.questionType,
      options: q.options ?? [],
      fromBank: true,
      questionBankId: q.id
    }));

    this.questions.update(list => [...list, ...newOnes]);
    this.closeBankModal();
  }

  //  Helpers 

  getTypeName(type: QuestionType): string {
    const map: Record<number, string> = {
      [QuestionType.Text]: 'Text',
      [QuestionType.Rating]: 'Rating (1–10)',
      [QuestionType.MultipleChoice]: 'Multiple Choice'
    };
    return map[type] ?? 'Unknown';
  }

  getTypeIcon(type: QuestionType): string {
    const map: Record<number, string> = {
      [QuestionType.Text]: '✏️',
      [QuestionType.Rating]: '⭐',
      [QuestionType.MultipleChoice]: '☑️'
    };
    return map[type] ?? '❓';
  }

  get bankTotalPages(): number {
    return Math.ceil(this.bankTotalCount() / this.bankPageSize);
  }

  //  Submit Survey 

  submitSurvey() {
    this.submitError.set('');
    this.submitSuccess.set('');

    if (!this.title.trim()) {
      this.submitError.set('Survey title is required.');
      return;
    }

    if (this.questions().length === 0) {
      this.submitError.set('Please add at least one question.');
      return;
    }

    const dto: CreateSurveyDto = {
      title: this.title.trim(),
      description: this.description.trim(),
      expireAt: this.expireAt ? new Date(this.expireAt).toISOString() : null,
      maxResponses: this.maxResponses || null,
      questions: this.questions().map(q => {
        const question: CreateQuestionDto = {};

        if (q.fromBank && q.questionBankId) {
          // From bank — just send the bank ID
          question.questionBankId = q.questionBankId;
        } else {
          // Manual question
          question.text = q.text;
          question.questionType = q.questionType;
          if (q.questionType === QuestionType.MultipleChoice) {
            question.options = q.options.filter(o => o.trim());
          }
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
        this.submitError.set(
          err?.error?.message || 'Failed to create survey. Please try again.'
        );
      }
    });
  }
}
