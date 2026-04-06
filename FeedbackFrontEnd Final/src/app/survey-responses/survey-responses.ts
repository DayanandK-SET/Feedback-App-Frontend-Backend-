import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SurveyService } from '../Services/survey.service';
import {
  SurveyResponsesDto,
  GetSurveyResponsesRequestDto,
  QuestionType
} from '../models/survey.models';

@Component({
  selector: 'app-survey-responses',
  imports: [CommonModule, FormsModule, RouterLink, DatePipe],
  templateUrl: './survey-responses.html',
  styleUrl: './survey-responses.css'
})
export class SurveyResponses {

  private route = inject(ActivatedRoute);
  private surveyService = inject(SurveyService);

  QuestionType = QuestionType;

  surveyId!: number;

  //  Data 
  surveyData = signal<SurveyResponsesDto | null>(null);
  isLoading = signal(true);
  errorMessage = signal('');

  //  Filters 
  fromDate = '';
  toDate = '';

  //  Pagination 
  pageNumber = 1;
  pageSize = 5;

  //  Export 
  isExporting = signal(false);
  exportError = signal('');

  //  Expanded Responses 
  expandedIds = new Set<number>();

  constructor() {
    this.surveyId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadResponses();
  }

  //  Load 

  loadResponses() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const request: GetSurveyResponsesRequestDto = {
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      fromDate: this.fromDate || null,
      toDate: this.toDate || null,
    };

    this.surveyService.getSurveyResponses(this.surveyId, request).subscribe({
      next: (data) => {
        this.surveyData.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load responses. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  applyFilters() {
    this.pageNumber = 1;
    this.expandedIds.clear();
    this.loadResponses();
  }

  clearFilters() {
    this.fromDate = '';
    this.toDate = '';
    this.pageNumber = 1;
    this.expandedIds.clear();
    this.loadResponses();
  }

  get hasActiveFilters(): boolean {
    return !!(this.fromDate || this.toDate );
  }

  //  Pagination 

  nextPage() {
    if (this.pageNumber < this.totalPages) {
      this.pageNumber++;
      this.expandedIds.clear();
      this.loadResponses();
    }
  }

  prevPage() {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.expandedIds.clear();
      this.loadResponses();
    }
  }

  get totalPages(): number {
    const total = this.surveyData()?.totalResponses ?? 0;
    return Math.ceil(total / this.pageSize);
  }

  get startIndex(): number {
    return (this.pageNumber - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    const responses = this.surveyData()?.responses?.length ?? 0;
    return (this.pageNumber - 1) * this.pageSize + responses;
  }

  //  Expand / Collapse response 

  toggleExpand(responseId: number) {
    if (this.expandedIds.has(responseId)) {
      this.expandedIds.delete(responseId);
    } else {
      this.expandedIds.add(responseId);
    }
  }

  isExpanded(responseId: number): boolean {
    return this.expandedIds.has(responseId);
  }

  expandAll() {
    const responses = this.surveyData()?.responses ?? [];
    responses.forEach(r => this.expandedIds.add(r.responseId));
  }

  collapseAll() {
    this.expandedIds.clear();
  }

  get allExpanded(): boolean {
    const responses = this.surveyData()?.responses ?? [];
    return responses.length > 0 &&
      responses.every(r => this.expandedIds.has(r.responseId));
  }

  //  Export to Excel 

  exportToExcel() {
    this.isExporting.set(true);
    this.exportError.set('');

    this.surveyService.exportResponses(this.surveyId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Survey_${this.surveyId}_Responses.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.isExporting.set(false);
      },
      error: () => {
        this.exportError.set('Export failed. Please try again.');
        this.isExporting.set(false);
      }
    });
  }
}
