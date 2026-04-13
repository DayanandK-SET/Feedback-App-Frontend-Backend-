import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Dashboard } from './dashboard';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

describe('Dashboard', () => {

  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard, HttpClientTestingModule, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  // ── Component Creation ────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Initial State ─────────────────────────────────

  it('should start on page 1', () => {
    expect(component.pageNumber).toBe(1);
  });

  it('should start with no active filters', () => {
    expect(component.hasActiveFilters).toBeFalsy();
  });

  it('should start with import modal hidden', () => {
    expect(component.showImportModal()).toBeFalsy();
  });

  it('should start with delete modal hidden', () => {
    expect(component.showDeleteModal()).toBeFalsy();
  });

  it('should start with edit modal hidden', () => {
    expect(component.showEditModal()).toBeFalsy();
  });

  // ── Filter Helpers ────────────────────────────────

  it('should detect active filter when fromDate is set', () => {
    component.fromDate = '2026-01-01';
    expect(component.hasActiveFilters).toBeTruthy();
  });

  it('should detect active filter when toDate is set', () => {
    component.toDate = '2026-03-01';
    expect(component.hasActiveFilters).toBeTruthy();
  });

  it('should detect active filter when isActiveFilter is set to true', () => {
    component.isActiveFilter = true;
    expect(component.hasActiveFilters).toBeTruthy();
  });

  it('should detect active filter when isActiveFilter is set to false', () => {
    component.isActiveFilter = false;
    expect(component.hasActiveFilters).toBeTruthy();
  });

  it('should clear all filters on clearFilters()', () => {
    component.fromDate = '2026-01-01';
    component.toDate = '2026-03-01';
    component.isActiveFilter = true;
    component.pageNumber = 3;
    component.clearFilters();
    expect(component.fromDate).toBe('');
    expect(component.toDate).toBe('');
    expect(component.isActiveFilter).toBeNull();
    expect(component.pageNumber).toBe(1);
  });

  it('should reset to page 1 when applyFilters is called', () => {
    component.pageNumber = 5;
    component.applyFilters();
    expect(component.pageNumber).toBe(1);
  });

  // ── Pagination Helpers ────────────────────────────

  it('should calculate totalPages correctly', () => {
    component.totalCount.set(25);
    component.pageSize = 10;
    expect(component.totalPages).toBe(3);
  });

  it('should return 0 for startIndex when no surveys', () => {
    component.totalCount.set(0);
    expect(component.startIndex).toBe(0);
  });

  it('should not go below page 1 on prevPage()', () => {
    component.pageNumber = 1;
    component.prevPage();
    expect(component.pageNumber).toBe(1);
  });

  it('should go to correct page with goToPage()', () => {
    component.totalCount.set(30);
    component.pageSize = 10;
    component.goToPage(2);
    expect(component.pageNumber).toBe(2);
  });

  it('should not go to invalid page with goToPage()', () => {
    component.totalCount.set(10);
    component.pageSize = 10;
    component.goToPage(99);
    expect(component.pageNumber).not.toBe(99);
  });

  // ── Delete Modal ──────────────────────────────────

  it('should open delete modal', () => {
    const survey = {
      surveyId: 1, title: 'Test', description: '',
      isActive: true, createdAt: '', totalResponses: 0,
      publicIdentifier: 'abc', isLocked: false
    };
    component.openDeleteModal(survey);
    expect(component.showDeleteModal()).toBeTruthy();
    expect(component.surveyToDelete()?.title).toBe('Test');
  });

  it('should close delete modal', () => {
    const survey = {
      surveyId: 1, title: 'Test', description: '',
      isActive: true, createdAt: '', totalResponses: 0,
      publicIdentifier: 'abc', isLocked: false
    };
    component.openDeleteModal(survey);
    component.closeDeleteModal();
    expect(component.showDeleteModal()).toBeFalsy();
    expect(component.surveyToDelete()).toBeNull();
  });

  // ── Edit Modal ────────────────────────────────────

  it('should open edit modal with correct data', () => {
    const survey = {
      surveyId: 1, title: 'My Survey', description: 'My Desc',
      isActive: true, createdAt: '', totalResponses: 0,
      publicIdentifier: 'abc', isLocked: false
    };
    component.openEditModal(survey);
    expect(component.showEditModal()).toBeTruthy();
    expect(component.editForm.title).toBe('My Survey');
    expect(component.editForm.description).toBe('My Desc');
  });

  it('should close edit modal', () => {
    const survey = {
      surveyId: 1, title: 'My Survey', description: '',
      isActive: true, createdAt: '', totalResponses: 0,
      publicIdentifier: 'abc', isLocked: false
    };
    component.openEditModal(survey);
    component.closeEditModal();
    expect(component.showEditModal()).toBeFalsy();
    expect(component.editingSurvey()).toBeNull();
  });

  it('should clear editError when edit modal opens', () => {
    component.editError.set('some error');
    const survey = {
      surveyId: 1, title: 'T', description: '',
      isActive: true, createdAt: '', totalResponses: 0,
      publicIdentifier: 'abc', isLocked: false
    };
    component.openEditModal(survey);
    expect(component.editError()).toBe('');
  });

  // ── Import Modal ──────────────────────────────────

  it('should open import modal', () => {
    component.openImportModal();
    expect(component.showImportModal()).toBeTruthy();
  });

  it('should close import modal', () => {
    component.openImportModal();
    component.closeImportModal();
    expect(component.showImportModal()).toBeFalsy();
  });

  it('should reset import fields when modal opens', () => {
    component.importTitle = 'old title';
    component.importDescription = 'old desc';
    component.importExpireAt = '2026-01-01';
    component.importMaxResponses = 50;
    component.openImportModal();
    expect(component.importTitle).toBe('');
    expect(component.importDescription).toBe('');
    expect(component.importExpireAt).toBe('');
    expect(component.importMaxResponses).toBeNull();
  });

  it('should clear importError when modal opens', () => {
    component.importError.set('some error');
    component.openImportModal();
    expect(component.importError()).toBe('');
  });

  // ── Import Validation ─────────────────────────────

  it('should set importError if title is empty on submitImport', () => {
    component.importTitle = '';
    component.importFile = null;
    component.submitImport();
    expect(component.importError()).toBe('Survey title is required.');
  });

  it('should set importError if file is missing on submitImport', () => {
    component.importTitle = 'My Survey';
    component.importFile = null;
    component.submitImport();
    expect(component.importError()).toBe('Please select an Excel file.');
  });

  // ── File Selection ────────────────────────────────

  it('should reject non-xlsx files', () => {
    const mockFile = new File(['content'], 'questions.csv', { type: 'text/csv' });
    const mockEvent = { target: { files: [mockFile] } } as unknown as Event;
    component.onFileSelected(mockEvent);
    expect(component.importFile).toBeNull();
    expect(component.importError()).toBe('Only .xlsx files are supported.');
  });

  it('should accept xlsx files', () => {
    const mockFile = new File(['content'], 'questions.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const mockEvent = { target: { files: [mockFile] } } as unknown as Event;
    component.onFileSelected(mockEvent);
    expect(component.importFile).toBeTruthy();
    expect(component.importFileName).toBe('questions.xlsx');
    expect(component.importError()).toBe('');
  });

});
