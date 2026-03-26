import { Component, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SurveyService } from '../Services/survey.service';
import {
  SurveyAnalyticsDto,
  QuestionAnalyticsDto,
  ResponseTrendDto,
  QuestionType
} from '../models/survey.models';
import { CountTypePipe } from './count-type.pipe';

@Component({
  selector: 'app-analytics',
  imports: [CommonModule, RouterLink, DecimalPipe, CountTypePipe],
  templateUrl: './analytics.html',
  styleUrl: './analytics.css'
})
export class Analytics {

  private route = inject(ActivatedRoute);
  private surveyService = inject(SurveyService);

  QuestionType = QuestionType;

  surveyId!: number;

  // Data 
  analytics = signal<SurveyAnalyticsDto | null>(null);
  trend = signal<ResponseTrendDto[]>([]);
  isLoading = signal(true);
  isTrendLoading = signal(true);
  errorMessage = signal('');

  constructor() {
    this.surveyId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadAnalytics();
    this.loadTrend();
  }

  //  Load 

  loadAnalytics() {
    this.isLoading.set(true);
    this.surveyService.getSurveyAnalytics(this.surveyId).subscribe({
      next: (data) => {
        this.analytics.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load analytics.');
        this.isLoading.set(false);
      }
    });
  }

  loadTrend() {
    this.isTrendLoading.set(true);
    this.surveyService.getResponseTrend(this.surveyId).subscribe({
      next: (data) => {
        this.trend.set(data);
        this.isTrendLoading.set(false);
      },
      error: () => {
        this.isTrendLoading.set(false);
      }
    });
  }

  //  Bar Chart Helpers 

  getBarWidth(count: number, question: QuestionAnalyticsDto): number {
    const max = Math.max(...(question.options ?? []).map(o => o.count), 1);
    return Math.round((count / max) * 100);
  }

  getTotalVotes(question: QuestionAnalyticsDto): number {
    return (question.options ?? []).reduce((sum, o) => sum + o.count, 0);
  }

  getVotePercent(count: number, question: QuestionAnalyticsDto): number {
    const total = this.getTotalVotes(question);
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  }

  //  Rating Helpers 

  getRatingColor(avg: number, max: number): string {
    const ratio = avg / max;
    if (ratio >= 0.7) return '#16a34a';
    if (ratio >= 0.4) return '#ca8a04';
    return '#dc2626';
  }

  getRatingBarWidth(avg: number, max: number): number {
    return Math.round((avg / max) * 100);
  }

  // ── Trend Chart Helpers ───────────────────────────

  readonly CHART_W = 600;
  readonly CHART_H = 160;
  readonly PAD_LEFT = 40;
  readonly PAD_RIGHT = 20;
  readonly PAD_TOP = 16;
  readonly PAD_BOTTOM = 32;

  get trendPoints(): string {
    const data = this.trend();
    if (data.length < 2) return '';
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const w = this.CHART_W - this.PAD_LEFT - this.PAD_RIGHT;
    const h = this.CHART_H - this.PAD_TOP - this.PAD_BOTTOM;

    return data.map((d, i) => {
      const x = this.PAD_LEFT + (i / (data.length - 1)) * w;
      const y = this.PAD_TOP + h - (d.count / maxCount) * h;
      return `${x},${y}`;
    }).join(' ');
  }

  get trendDotData(): { x: number; y: number; count: number; date: string }[] {
    const data = this.trend();
    if (data.length === 0) return [];
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const w = this.CHART_W - this.PAD_LEFT - this.PAD_RIGHT;
    const h = this.CHART_H - this.PAD_TOP - this.PAD_BOTTOM;

    return data.map((d, i) => ({
      x: this.PAD_LEFT + (i / Math.max(data.length - 1, 1)) * w,
      y: this.PAD_TOP + h - (d.count / maxCount) * h,
      count: d.count,
      date: d.date
    }));
  }

  get trendYLabels(): { y: number; label: string }[] {
    const data = this.trend();
    if (data.length === 0) return [];
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const h = this.CHART_H - this.PAD_TOP - this.PAD_BOTTOM;
    const steps = Math.min(maxCount, 4);

    return Array.from({ length: steps + 1 }, (_, i) => {
      const val = Math.round((i / steps) * maxCount);
      const y = this.PAD_TOP + h - (i / steps) * h;
      return { y, label: String(val) };
    });
  }

  get trendXLabels(): { x: number; label: string }[] {
    const data = this.trend();
    if (data.length === 0) return [];
    const w = this.CHART_W - this.PAD_LEFT - this.PAD_RIGHT;
    const h = this.CHART_H - this.PAD_TOP - this.PAD_BOTTOM;

    // Show at most 6 evenly spaced labels
    const step = Math.ceil(data.length / 6);
    return data
      .filter((_, i) => i % step === 0 || i === data.length - 1)
      .map((d, _, arr) => {
        const i = data.indexOf(d);
        return {
          x: this.PAD_LEFT + (i / Math.max(data.length - 1, 1)) * w,
          label: d.date.slice(5)   // show MM-DD only
        };
      });
  }

  get trendAreaPath(): string {
    const data = this.trend();
    if (data.length < 2) return '';
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const w = this.CHART_W - this.PAD_LEFT - this.PAD_RIGHT;
    const h = this.CHART_H - this.PAD_TOP - this.PAD_BOTTOM;
    const bottom = this.PAD_TOP + h;

    const points = data.map((d, i) => {
      const x = this.PAD_LEFT + (i / (data.length - 1)) * w;
      const y = this.PAD_TOP + h - (d.count / maxCount) * h;
      return `${x},${y}`;
    });

    const firstX = this.PAD_LEFT;
    const lastX = this.CHART_W - this.PAD_RIGHT;

    return `M ${firstX},${bottom} L ${points.join(' L ')} L ${lastX},${bottom} Z`;
  }

  //  Type Helpers 

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
}
