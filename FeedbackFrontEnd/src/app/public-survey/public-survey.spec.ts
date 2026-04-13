import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicSurvey } from './public-survey';

describe('PublicSurvey', () => {
  let component: PublicSurvey;
  let fixture: ComponentFixture<PublicSurvey>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicSurvey],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicSurvey);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
