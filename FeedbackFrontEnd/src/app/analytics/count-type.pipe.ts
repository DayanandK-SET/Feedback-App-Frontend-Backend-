import { Pipe, PipeTransform } from '@angular/core';
import { QuestionAnalyticsDto, QuestionType } from '../models/survey.models';

@Pipe({
  name: 'countType',
  standalone: true
})
export class CountTypePipe implements PipeTransform {
  transform(questions: QuestionAnalyticsDto[], type: QuestionType): number {
    return questions.filter(q => q.questionType === type).length;
  }
}
