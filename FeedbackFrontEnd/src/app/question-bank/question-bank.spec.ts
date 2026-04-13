import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuestionBank } from './question-bank';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { QuestionType } from '../models/survey.models';

describe('QuestionBank', () => {

  let component: QuestionBank;
  let fixture: ComponentFixture<QuestionBank>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionBank, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(QuestionBank);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  // ── Component Creation ────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with add modal hidden', () => {
    expect(component.showAddModal()).toBeFalsy();
  });

  it('should start on page 1', () => {
    expect(component.pageNumber).toBe(1);
  });

  // ── Add Question Modal ────────────────────────────

  it('should open add modal', () => {
    component.openAddModal();
    expect(component.showAddModal()).toBeTruthy();
  });

  it('should close add modal', () => {
    component.openAddModal();
    component.closeAddModal();
    expect(component.showAddModal()).toBeFalsy();
  });

  it('should reset question text when add modal opens', () => {
    component.newQuestion.text = 'old text';
    component.openAddModal();
    expect(component.newQuestion.text).toBe('');
  });

  it('should reset options to 2 empty strings when add modal opens', () => {
    component.newOptions = ['X', 'Y', 'Z'];
    component.openAddModal();
    expect(component.newOptions.length).toBe(2);
    expect(component.newOptions[0]).toBe('');
  });

  it('should clear errors when add modal opens', () => {
    component.submitError.set('old error');
    component.submitSuccess.set('old success');
    component.openAddModal();
    expect(component.submitError()).toBe('');
    expect(component.submitSuccess()).toBe('');
  });

  it('should default new question type to Text when modal opens', () => {
    component.openAddModal();
    expect(component.newQuestion.questionType).toBe(QuestionType.Text);
  });

  // ── Options ───────────────────────────────────────

  it('should add an option', () => {
    component.openAddModal();
    component.addOption();
    expect(component.newOptions.length).toBe(3);
  });

  it('should remove an option if more than 2 exist', () => {
    component.newOptions = ['A', 'B', 'C'];
    component.removeOption(2);
    expect(component.newOptions.length).toBe(2);
  });

  it('should not remove an option if only 2 remain', () => {
    component.newOptions = ['A', 'B'];
    component.removeOption(0);
    expect(component.newOptions.length).toBe(2);
  });

  // ── Submit Validation ─────────────────────────────

  it('should set submitError if question text is empty', () => {
    component.newQuestion.text = '';
    component.submitQuestion();
    expect(component.submitError()).toBe('Question text is required.');
  });

  it('should set submitError if MultipleChoice has fewer than 2 valid options', () => {
    component.newQuestion.text = 'Some question';
    component.newQuestion.questionType = QuestionType.MultipleChoice;
    component.newOptions = ['Only one', ''];
    component.submitQuestion();
    expect(component.submitError()).toBe('Please add at least 2 options.');
  });

  // ── Pagination ────────────────────────────────────

  it('should calculate total pages correctly', () => {
    component.totalCount.set(20);
    component.pageSize = 8;
    expect(component.totalPages).toBe(3);
  });

  it('should calculate startIndex correctly on page 1', () => {
    component.pageNumber = 1;
    component.pageSize = 8;
    expect(component.startIndex).toBe(1);
  });

  it('should calculate startIndex correctly on page 2', () => {
    component.pageNumber = 2;
    component.pageSize = 8;
    expect(component.startIndex).toBe(9);
  });

  it('should not go to previous page when already on page 1', () => {
    component.pageNumber = 1;
    component.prevPage();
    expect(component.pageNumber).toBe(1);
  });

  it('should go to next page when available', () => {
    component.totalCount.set(20);
    component.pageSize = 8;
    component.pageNumber = 1;
    component.nextPage();
    expect(component.pageNumber).toBe(2);
  });

  it('should not go beyond last page on nextPage', () => {
    component.totalCount.set(8);
    component.pageSize = 8;
    component.pageNumber = 1;
    component.nextPage();
    expect(component.pageNumber).toBe(1);
  });

  // ── Filter ────────────────────────────────────────

  it('should reset to page 1 when filter changes', () => {
    component.pageNumber = 3;
    component.onFilterChange();
    expect(component.pageNumber).toBe(1);
  });

  // ── Type Helpers ──────────────────────────────────

  it('should return correct type name for Text', () => {
    expect(component.getTypeName(QuestionType.Text)).toBe('Text');
  });

  it('should return correct type name for Rating', () => {
    expect(component.getTypeName(QuestionType.Rating)).toBe('Rating');
  });

  it('should return correct type name for MultipleChoice', () => {
    expect(component.getTypeName(QuestionType.MultipleChoice)).toBe('Multiple Choice');
  });

  it('should return correct badge class for Text', () => {
    expect(component.getTypeBadgeClass(QuestionType.Text)).toBe('badge-text');
  });

  it('should return correct badge class for Rating', () => {
    expect(component.getTypeBadgeClass(QuestionType.Rating)).toBe('badge-rating');
  });

  it('should return correct badge class for MultipleChoice', () => {
    expect(component.getTypeBadgeClass(QuestionType.MultipleChoice)).toBe('badge-mc');
  });

});
