import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SurveyResponses } from './survey-responses';

describe('SurveyResponses', () => {
  let component: SurveyResponses;
  let fixture: ComponentFixture<SurveyResponses>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SurveyResponses],
    }).compileComponents();

    fixture = TestBed.createComponent(SurveyResponses);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
