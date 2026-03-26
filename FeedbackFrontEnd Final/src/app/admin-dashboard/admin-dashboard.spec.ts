import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminDashboard } from './admin-dashboard';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

describe('AdminDashboard', () => {

  let component: AdminDashboard;
  let fixture: ComponentFixture<AdminDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDashboard, HttpClientTestingModule, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  // ── Component Creation ────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start on creators tab', () => {
    expect(component.activeTab()).toBe('creators');
  });

  // ── Tab Switching ─────────────────────────────────

  it('should switch to surveys tab', () => {
    component.setTab('surveys');
    expect(component.activeTab()).toBe('surveys');
  });

  it('should switch to auditLogs tab', () => {
    component.setTab('auditLogs');
    expect(component.activeTab()).toBe('auditLogs');
  });

  it('should switch back to creators tab', () => {
    component.setTab('surveys');
    component.setTab('creators');
    expect(component.activeTab()).toBe('creators');
  });

  // ── Delete Modal ──────────────────────────────────

  it('should open delete modal for a creator', () => {
    component.openDeleteModal('creator', 1, 'alice');
    expect(component.showDeleteModal()).toBeTruthy();
    expect(component.deleteTarget()?.type).toBe('creator');
    expect(component.deleteTarget()?.name).toBe('alice');
  });

  it('should open delete modal for a survey', () => {
    component.openDeleteModal('survey', 5, 'Survey A');
    expect(component.showDeleteModal()).toBeTruthy();
    expect(component.deleteTarget()?.type).toBe('survey');
    expect(component.deleteTarget()?.id).toBe(5);
  });

  it('should close delete modal and clear target', () => {
    component.openDeleteModal('creator', 1, 'alice');
    component.closeDeleteModal();
    expect(component.showDeleteModal()).toBeFalsy();
    expect(component.deleteTarget()).toBeNull();
  });

  it('should clear deleteError when modal opens', () => {
    component.deleteError.set('old error');
    component.openDeleteModal('creator', 1, 'alice');
    expect(component.deleteError()).toBe('');
  });

  // ── Creator Search ────────────────────────────────

  it('should reset creator page to 1 when search changes', () => {
    component.creatorPage = 3;
    component.onCreatorSearchChange();
    expect(component.creatorPage).toBe(1);
  });

  it('should return empty list when no creators loaded and search applied', () => {
    component.creatorSearch = 'zzznomatch';
    expect(component.filteredCreators.length).toBe(0);
  });

  // ── Survey Search ─────────────────────────────────

  it('should reset survey page to 1 when search changes', () => {
    component.surveyPage = 3;
    component.onSurveySearchChange();
    expect(component.surveyPage).toBe(1);
  });

  // ── Audit Log Filters ─────────────────────────────

  it('should detect active audit filter when fromDate is set', () => {
    component.auditFromDate = '2026-01-01';
    expect(component.hasAuditFilters).toBeTruthy();
  });

  it('should detect active audit filter when search is set', () => {
    component.auditLogSearch = 'alice';
    expect(component.hasAuditFilters).toBeTruthy();
  });

  it('should return false for hasAuditFilters when nothing is set', () => {
    component.auditFromDate = '';
    component.auditToDate = '';
    component.auditLogSearch = '';
    expect(component.hasAuditFilters).toBeFalsy();
  });

  it('should reset audit log page to 1 when applying filters', () => {
    component.auditLogPage = 3;
    component.applyAuditFilters();
    expect(component.auditLogPage).toBe(1);
  });

  it('should clear all audit filters on clearAuditFilters()', () => {
    component.auditFromDate = '2026-01-01';
    component.auditToDate = '2026-03-01';
    component.auditLogSearch = 'alice';
    component.auditLogPage = 3;
    component.clearAuditFilters();
    expect(component.auditFromDate).toBe('');
    expect(component.auditToDate).toBe('');
    expect(component.auditLogSearch).toBe('');
    expect(component.auditLogPage).toBe(1);
  });

  it('should reset audit search page to 1 when search changes', () => {
    component.auditLogPage = 4;
    component.onAuditSearchChange();
    expect(component.auditLogPage).toBe(1);
  });

  // ── Action Badge Helpers ──────────────────────────

  it('should return badge-activated for Survey Activated', () => {
    expect(component.getActionClass('Survey Activated')).toBe('badge-activated');
  });

  it('should return badge-deactivated for Survey Deactivated', () => {
    expect(component.getActionClass('Survey Deactivated')).toBe('badge-deactivated');
  });

  it('should return badge-updated for Survey Updated', () => {
    expect(component.getActionClass('Survey Updated')).toBe('badge-updated');
  });

  it('should return badge-deleted for Survey Deleted', () => {
    expect(component.getActionClass('Survey Deleted')).toBe('badge-deleted');
  });

  it('should return badge-default for unknown action', () => {
    expect(component.getActionClass('Unknown Action')).toBe('badge-default');
  });

  it('should return correct icon for Survey Activated', () => {
    expect(component.getActionIcon('Survey Activated')).toBe('✅');
  });

  it('should return correct icon for Survey Deactivated', () => {
    expect(component.getActionIcon('Survey Deactivated')).toBe('⏸️');
  });

  it('should return correct icon for Survey Updated', () => {
    expect(component.getActionIcon('Survey Updated')).toBe('✏️');
  });

  it('should return correct icon for Survey Deleted', () => {
    expect(component.getActionIcon('Survey Deleted')).toBe('🗑️');
  });

});
