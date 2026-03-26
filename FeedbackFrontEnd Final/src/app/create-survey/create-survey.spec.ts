import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateSurvey } from './create-survey';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { QuestionType } from '../models/survey.models';

describe('CreateSurvey', () => {

  let component: CreateSurvey;
  let fixture: ComponentFixture<CreateSurvey>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateSurvey, HttpClientTestingModule, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateSurvey);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  // ── Component Creation ────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with empty title', () => {
    expect(component.title).toBe('');
  });

  it('should start with zero questions', () => {
    expect(component.questions().length).toBe(0);
  });

  it('should start with add form hidden', () => {
    expect(component.showAddForm()).toBeFalsy();
  });

  it('should start with bank modal hidden', () => {
    expect(component.showBankModal()).toBeFalsy();
  });

  // ── Add Question Form ─────────────────────────────

  it('should open add form', () => {
    component.openAddForm();
    expect(component.showAddForm()).toBeTruthy();
  });

  it('should close add form', () => {
    component.openAddForm();
    component.closeAddForm();
    expect(component.showAddForm()).toBeFalsy();
  });

  it('should reset question text when add form opens', () => {
    component.newQuestion.text = 'some old text';
    component.openAddForm();
    expect(component.newQuestion.text).toBe('');
  });

  it('should default question type to Text when add form opens', () => {
    component.openAddForm();
    expect(component.newQuestion.questionType).toBe(QuestionType.Text);
  });

  it('should default to 2 empty options when add form opens', () => {
    component.openAddForm();
    expect(component.newQuestion.options.length).toBe(2);
  });

  // ── Save Question ─────────────────────────────────

  it('should not save question if text is empty', () => {
    component.openAddForm();
    component.newQuestion.text = '';
    component.saveQuestion();
    expect(component.questions().length).toBe(0);
  });

  it('should save a Text question', () => {
    component.openAddForm();
    component.newQuestion.text = 'What is your name?';
    component.newQuestion.questionType = QuestionType.Text;
    component.saveQuestion();
    expect(component.questions().length).toBe(1);
    expect(component.questions()[0].text).toBe('What is your name?');
  });

  it('should close add form after saving', () => {
    component.openAddForm();
    component.newQuestion.text = 'A valid question';
    component.saveQuestion();
    expect(component.showAddForm()).toBeFalsy();
  });

  it('should not save MultipleChoice with fewer than 2 valid options', () => {
    component.openAddForm();
    component.newQuestion.text = 'Pick one';
    component.newQuestion.questionType = QuestionType.MultipleChoice;
    component.newQuestion.options = ['Option A', ''];
    component.saveQuestion();
    expect(component.questions().length).toBe(0);
  });

  it('should save MultipleChoice with 2 valid options', () => {
    component.openAddForm();
    component.newQuestion.text = 'Pick one';
    component.newQuestion.questionType = QuestionType.MultipleChoice;
    component.newQuestion.options = ['Option A', 'Option B'];
    component.saveQuestion();
    expect(component.questions().length).toBe(1);
  });

  // ── Remove Question ───────────────────────────────

  it('should remove a question by id', () => {
    component.openAddForm();
    component.newQuestion.text = 'Q1';
    component.saveQuestion();
    const qId = component.questions()[0].id;
    component.removeQuestion(qId);
    expect(component.questions().length).toBe(0);
  });

  // ── Move Up / Down ────────────────────────────────

  it('should move a question up', () => {
    component.openAddForm();
    component.newQuestion.text = 'Q1';
    component.saveQuestion();
    component.openAddForm();
    component.newQuestion.text = 'Q2';
    component.saveQuestion();
    component.moveUp(1);
    expect(component.questions()[0].text).toBe('Q2');
  });

  it('should not move the first question up', () => {
    component.openAddForm();
    component.newQuestion.text = 'Q1';
    component.saveQuestion();
    component.openAddForm();
    component.newQuestion.text = 'Q2';
    component.saveQuestion();
    component.moveUp(0);
    expect(component.questions()[0].text).toBe('Q1');
  });

  it('should move a question down', () => {
    component.openAddForm();
    component.newQuestion.text = 'Q1';
    component.saveQuestion();
    component.openAddForm();
    component.newQuestion.text = 'Q2';
    component.saveQuestion();
    component.moveDown(0);
    expect(component.questions()[0].text).toBe('Q2');
  });

  // ── Options ───────────────────────────────────────

  it('should add an option', () => {
    component.openAddForm();
    const initial = component.newQuestion.options.length;
    component.addOption();
    expect(component.newQuestion.options.length).toBe(initial + 1);
  });

  it('should remove an option if more than 2 exist', () => {
    component.newQuestion.options = ['A', 'B', 'C'];
    component.removeOption(2);
    expect(component.newQuestion.options.length).toBe(2);
  });

  it('should not remove an option if only 2 remain', () => {
    component.newQuestion.options = ['A', 'B'];
    component.removeOption(0);
    expect(component.newQuestion.options.length).toBe(2);
  });

  // ── Bank Modal ────────────────────────────────────

  it('should open bank modal', () => {
    component.openBankModal();
    expect(component.showBankModal()).toBeTruthy();
  });

  it('should close bank modal', () => {
    component.openBankModal();
    component.closeBankModal();
    expect(component.showBankModal()).toBeFalsy();
  });

  it('should clear selectedBankIds when opening bank modal', () => {
    component.selectedBankIds.add(1);
    component.openBankModal();
    expect(component.selectedBankIds.size).toBe(0);
  });

  it('should reset bankPage to 1 when opening bank modal', () => {
    component.bankPage = 3;
    component.openBankModal();
    expect(component.bankPage).toBe(1);
  });

  // ── Submit Validation ─────────────────────────────

  it('should set submitError if title is empty', () => {
    component.title = '';
    component.submitSurvey();
    expect(component.submitError()).toBe('Survey title is required.');
  });

  it('should set submitError if no questions added', () => {
    component.title = 'My Survey';
    component.submitSurvey();
    expect(component.submitError()).toBe('Please add at least one question.');
  });

  // ── Type Helpers ──────────────────────────────────

  it('should return correct type name for Text', () => {
    expect(component.getTypeName(QuestionType.Text)).toBe('Text');
  });

  it('should return correct type name for Rating', () => {
    expect(component.getTypeName(QuestionType.Rating)).toBe('Rating (1–10)');
  });

  it('should return correct type name for MultipleChoice', () => {
    expect(component.getTypeName(QuestionType.MultipleChoice)).toBe('Multiple Choice');
  });

  it('should return correct icon for Text', () => {
    expect(component.getTypeIcon(QuestionType.Text)).toBe('✏️');
  });

  it('should return correct icon for Rating', () => {
    expect(component.getTypeIcon(QuestionType.Rating)).toBe('⭐');
  });

  it('should return correct icon for MultipleChoice', () => {
    expect(component.getTypeIcon(QuestionType.MultipleChoice)).toBe('☑️');
  });

});
