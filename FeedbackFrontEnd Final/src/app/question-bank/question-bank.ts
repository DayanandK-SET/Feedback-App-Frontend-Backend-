import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuestionBankService } from '../Services/question-bank.service';
import {
  QuestionBankResponseDto,
  CreateQuestionBankDto
} from '../models/question-bank.models';
import { QuestionType } from '../models/survey.models';

@Component({
  selector: 'app-question-bank',
  imports: [CommonModule, FormsModule],
  templateUrl: './question-bank.html',
  styleUrl: './question-bank.css'
})
export class QuestionBank {

  private qbService = inject(QuestionBankService);

  // Expose enum to template
  QuestionType = QuestionType;

  //  List State 
  questions = signal<QuestionBankResponseDto[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  totalCount = signal(0);

  //  Pagination & Filter 
  pageNumber = 1;
  pageSize = 8;
  typeFilter: QuestionType | '' = '';

  //  Add Question Modal 
  showAddModal = signal(false);
  isSubmitting = signal(false);
  submitError = signal('');
  submitSuccess = signal('');

  // New question form
  newQuestion: CreateQuestionBankDto = this.emptyForm();
  newOptions: string[] = ['', ''];

  constructor() {
    this.loadQuestions();
  }

  //  Load Questions 

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

  onFilterChange() {
    this.pageNumber = 1;
    this.loadQuestions();
  }

  nextPage() {
    if (this.pageNumber < this.totalPages) {
      this.pageNumber++;
      this.loadQuestions();
    }
  }

  prevPage() {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.loadQuestions();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize);
  }

  get startIndex(): number {
    return (this.pageNumber - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    return Math.min(this.pageNumber * this.pageSize, this.totalCount());
  }

  //  Add Question Modal 

  openAddModal() {
    this.newQuestion = this.emptyForm();
    this.newOptions = ['', ''];
    this.submitError.set('');
    this.submitSuccess.set('');
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  private emptyForm(): CreateQuestionBankDto {
    return {
      text: '',
      questionType: QuestionType.Text,
      options: []
    };
  }

  addOption() {
    this.newOptions.push('');
  }

  removeOption(index: number) {
    if (this.newOptions.length > 2) {
      this.newOptions.splice(index, 1);
    }
  }

  trackOption(index: number): number {
    return index;
  }

  submitQuestion() {
    this.submitError.set('');

    if (!this.newQuestion.text.trim()) {
      this.submitError.set('Question text is required.');
      return;
    }

    if (this.newQuestion.questionType === QuestionType.MultipleChoice) {
      const validOptions = this.newOptions.filter(o => o.trim());
      if (validOptions.length < 2) {
        this.submitError.set('Please add at least 2 options.');
        return;
      }
      this.newQuestion.options = validOptions;
    }

    this.isSubmitting.set(true);

    this.qbService.createQuestions([this.newQuestion]).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.submitSuccess.set('Question added successfully!');
        // Reload list so new question shows up
        this.pageNumber = 1;
        this.typeFilter = '';
        this.loadQuestions();
        setTimeout(() => {
          this.closeAddModal();
          this.submitSuccess.set('');
        }, 1200);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.submitError.set('Failed to add question. Please try again.');
      }
    });
  }

  //  Helpers 

  getTypeName(type: QuestionType): string {
    const map: Record<number, string> = {
      [QuestionType.Text]: 'Text',
      [QuestionType.Rating]: 'Rating',
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

  getTypeBadgeClass(type: QuestionType): string {
    const map: Record<number, string> = {
      [QuestionType.Text]: 'badge-text',
      [QuestionType.Rating]: 'badge-rating',
      [QuestionType.MultipleChoice]: 'badge-mc'
    };
    return map[type] ?? '';
  }
}
