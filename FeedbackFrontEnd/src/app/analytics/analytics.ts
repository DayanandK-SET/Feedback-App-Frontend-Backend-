import { Component, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SurveyService } from '../Services/survey.service';
import {
  SurveyAnalyticsDto,
  QuestionAnalyticsDto,
  ResponseTrendDto,
  QuestionType
} from '../models/survey.models';
import { CountTypePipe } from './count-type.pipe';
import { isValidEmail } from '../utils/email-validator';

@Component({
  selector: 'app-analytics',
  imports: [CommonModule, FormsModule, RouterLink, DecimalPipe, CountTypePipe],
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

  // Email modal
  showEmailModal = signal(false);
  emailInput = '';
  isSendingEmail = signal(false);
  emailSuccess = signal('');
  emailError = signal('');

  constructor() {
    this.surveyId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadAnalytics();
    this.loadTrend();
  }

  loadAnalytics() {
    this.isLoading.set(true);
    this.surveyService.getSurveyAnalytics(this.surveyId).subscribe({
      next: (data) => { this.analytics.set(data); this.isLoading.set(false); },
      error: () => { this.errorMessage.set('Failed to load analytics.'); this.isLoading.set(false); }
    });
  }

  loadTrend() {
    this.isTrendLoading.set(true);
    this.surveyService.getResponseTrend(this.surveyId).subscribe({
      next: (data) => { this.trend.set(data); this.isTrendLoading.set(false); },
      error: () => { this.isTrendLoading.set(false); }
    });
  }

  // ── Email Analytics Modal ─────────────────────────

  openEmailModal() {
    this.emailInput = '';
    this.emailSuccess.set('');
    this.emailError.set('');
    this.isSendingEmail.set(false);  // reset guard on open
    this.showEmailModal.set(true);
  }

  closeEmailModal() {
    if (this.isSendingEmail()) return;  // don't close while sending
    this.showEmailModal.set(false);
  }

  sendAnalyticsEmail() {
    // Guard: prevent double-send (e.g. Enter key + button click firing together)
    if (this.isSendingEmail()) return;

    this.emailError.set('');
    this.emailSuccess.set('');

    const rawEmail = this.emailInput.trim();

    // If an email was entered, validate it using the shared validator
    if (rawEmail) {
      if (!isValidEmail(rawEmail)) {
        this.emailError.set('Please enter a valid email address (e.g. user@example.com).');
        return;
      }
    }

    // Pass the email only if one was entered; otherwise backend uses the registered email
    const emailToSend = rawEmail || undefined;

    // Build the HTML email body from the analytics data already in the component
    const htmlBody = this.buildAnalyticsEmailHtml();

    this.isSendingEmail.set(true);

    this.surveyService.sendAnalyticsEmail(this.surveyId, emailToSend, htmlBody).subscribe({
      next: () => {
        this.isSendingEmail.set(false);
        const destination = rawEmail || 'your registered email';
        this.emailSuccess.set(`Report sent successfully to ${destination}. Check your inbox.`);
        setTimeout(() => this.closeEmailModal(), 3000);
      },
      error: (err) => {
        this.isSendingEmail.set(false);
        const msg = err?.error?.message;
        // Show a meaningful error — not the generic "unexpected error" from the middleware
        if (msg && msg !== 'An unexpected error occurred.') {
          this.emailError.set(msg);
        } else {
          this.emailError.set('Failed to send email. Please check the address and try again.');
        }
      }
    });
  }

  // ── HTML Email Builder (frontend) ─────────────────
  // Builds the full HTML email body from the analytics data already loaded in the component.
  // Responsibility: presentation only — no business logic here.

  private buildAnalyticsEmailHtml(): string {
    const data = this.analytics();
    if (!data) return '';

    const mcCount     = data.questions.filter(q => q.questionType === QuestionType.MultipleChoice).length;
    const ratingCount = data.questions.filter(q => q.questionType === QuestionType.Rating).length;

    const questionsHtml = data.questions
      .map((q, i) => this.buildQuestionCard(q, i + 1))
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body  { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f6fa; margin: 0; padding: 0; }
    .wrapper { max-width: 680px; margin: 32px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,.08); }
    .header  { background: #1a1a2e; padding: 28px 32px; }
    .header h1 { color: #7c83fd; margin: 0; font-size: 22px; }
    .header p  { color: #aaa; margin: 6px 0 0; font-size: 13px; }
    .body    { padding: 28px 32px; }
    .greeting { font-size: 15px; color: #374151; margin-bottom: 20px; }
    .stats   { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
    .stat    { flex: 1; min-width: 110px; background: #f8f9ff; border-radius: 8px; padding: 14px 16px; text-align: center; border: 1px solid #e0e3ff; }
    .stat-number { font-size: 28px; font-weight: 700; color: #1a1a2e; }
    .stat-label  { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: .5px; margin-top: 4px; }
    .section-title { font-size: 16px; font-weight: 700; color: #1a1a2e; margin: 0 0 14px; }
    .question-card { background: #f9fafb; border-radius: 8px; padding: 16px 18px; margin-bottom: 14px; border-left: 4px solid #7c83fd; }
    .question-number { display: inline-block; background: #7c83fd; color: white; border-radius: 50%; width: 22px; height: 22px; text-align: center; line-height: 22px; font-size: 12px; font-weight: 700; margin-right: 8px; }
    .question-type   { font-size: 11px; background: #ede9fe; color: #5b21b6; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
    .question-text   { font-size: 14px; font-weight: 600; color: #1a1a2e; margin: 8px 0 12px; }
    .bar-row   { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .bar-label { font-size: 12px; color: #374151; min-width: 120px; text-align: right; }
    .bar-track { flex: 1; background: #e5e7eb; border-radius: 4px; height: 16px; overflow: hidden; }
    .bar-fill  { height: 100%; background: linear-gradient(90deg, #7c83fd, #a5b4fc); border-radius: 4px; }
    .bar-stat  { font-size: 12px; color: #6b7280; min-width: 60px; }
    .rating-value { font-size: 42px; font-weight: 800; color: #7c83fd; }
    .rating-meta  { font-size: 13px; color: #6b7280; margin-top: 4px; }
    .text-answer  { background: white; border-radius: 6px; padding: 8px 12px; margin-bottom: 6px; font-size: 13px; color: #374151; border-left: 3px solid #d1d5db; }
    .no-data { font-size: 13px; color: #9ca3af; font-style: italic; }
    .footer  { background: #f9fafb; padding: 18px 32px; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>📊 Survey Analytics Report</h1>
      <p>${this.escapeHtml(data.title)}</p>
    </div>
    <div class="body">
      <p class="greeting">Here is the analytics summary for your survey.</p>
      <div class="stats">
        <div class="stat"><div class="stat-number">${data.totalResponses}</div><div class="stat-label">Responses</div></div>
        <div class="stat"><div class="stat-number">${data.questions.length}</div><div class="stat-label">Questions</div></div>
        <div class="stat"><div class="stat-number">${mcCount}</div><div class="stat-label">Multiple Choice</div></div>
        <div class="stat"><div class="stat-number">${ratingCount}</div><div class="stat-label">Rating</div></div>
      </div>
      <p class="section-title">Question Breakdown</p>
      ${questionsHtml}
    </div>
    <div class="footer">
      📎 Full response data is attached as an Excel file.<br>
      Generated by FeedbackApp · ${new Date().toUTCString()}
    </div>
  </div>
</body>
</html>`;
  }

  // Builds one question card based on its type
  private buildQuestionCard(q: QuestionAnalyticsDto, num: number): string {
    const typeName = q.questionType === QuestionType.MultipleChoice ? 'Multiple Choice'
                   : q.questionType === QuestionType.Rating          ? 'Rating'
                   : 'Text';

    const answerSection = q.questionType === QuestionType.MultipleChoice ? this.buildMultipleChoiceSection(q)
                        : q.questionType === QuestionType.Rating          ? this.buildRatingSection(q)
                        : this.buildTextSection(q);

    return `
      <div class="question-card">
        <span class="question-number">${num}</span>
        <span class="question-type">${typeName}</span>
        <div class="question-text">${this.escapeHtml(q.questionText)}</div>
        ${answerSection}
      </div>`;
  }

  // Renders a bar chart row for each multiple choice option

private buildMultipleChoiceSection(q: QuestionAnalyticsDto): string {
  if (!q.options || q.options.length === 0) {
    return `<div class="no-data">No options.</div>`;
  }

  const totalVotes = q.options.reduce(
    (sum: number, o) => sum + o.count,
    0
  );

  const maxVotes = Math.max(
    ...q.options.map((o) => o.count),
    1
  );

  if (totalVotes === 0) {
    return `<div class="no-data">No votes yet.</div>`;
  }

  return q.options.map((opt) => {
    const pct = Math.round((opt.count / totalVotes) * 100);
    const barPct = Math.round((opt.count / maxVotes) * 100);

    return `
      <div class="bar-row">
        <div class="bar-label">${this.escapeHtml(opt.optionText)}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${barPct}%"></div>
        </div>
        <div class="bar-stat">${opt.count} (${pct}%)</div>
      </div>`;
  }).join('');
}


  // Renders the average rating with min/max
  private buildRatingSection(q: QuestionAnalyticsDto): string {
    if (q.averageRating == null) return `<div class="no-data">No ratings yet.</div>`;
    const maxScale = q.maxRating ?? 10;
    return `
      <div class="rating-value">${q.averageRating.toFixed(1)}<span style="font-size:18px;color:#9ca3af"> / ${maxScale}</span></div>
      <div class="rating-meta">Min: ${q.minRating} &nbsp;|&nbsp; Max: ${q.maxRating} &nbsp;|&nbsp; Avg: ${q.averageRating.toFixed(1)}</div>`;
  }

  // Renders text answers as a list (max 10)
  private buildTextSection(q: QuestionAnalyticsDto): string {
    if (!q.textAnswers || q.textAnswers.length === 0) return `<div class="no-data">No text answers yet.</div>`;
    const shown    = q.textAnswers.slice(0, 10);
    const overflow = q.textAnswers.length - 10;
    const rows     = shown.map(a => `<div class="text-answer">${this.escapeHtml(a)}</div>`).join('');
    const more     = overflow > 0 ? `<div class="no-data">...and ${overflow} more in the attached Excel.</div>` : '';
    return `<div style="font-size:12px;color:#6b7280;margin-bottom:8px">${q.textAnswers.length} answer(s)</div>${rows}${more}`;
  }

  // Escapes HTML special characters to prevent XSS in the email
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Bar Chart Helpers ─────────────────────────────

  getBarWidth(count: number, question: QuestionAnalyticsDto): number {
    const max = Math.max(...(question.options ?? []).map(o => o.count), 1);
    return Math.round((count / max) * 100);
  }

  getTotalVotes(question: QuestionAnalyticsDto): number {
    return (question.options ?? []).reduce((sum, o) => sum + o.count, 0);
  }

  getVotePercent(count: number, question: QuestionAnalyticsDto): number {
    const total = this.getTotalVotes(question);
    return total === 0 ? 0 : Math.round((count / total) * 100);
  }

  // ── Rating Helpers ────────────────────────────────

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
    const step = Math.ceil(data.length / 6);
    return data
      .filter((_, i) => i % step === 0 || i === data.length - 1)
      .map((d) => {
        const i = data.indexOf(d);
        return { x: this.PAD_LEFT + (i / Math.max(data.length - 1, 1)) * w, label: d.date.slice(5) };
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
    return `M ${this.PAD_LEFT},${bottom} L ${points.join(' L ')} L ${this.CHART_W - this.PAD_RIGHT},${bottom} Z`;
  }

  // ── Type Helpers ──────────────────────────────────

  getTypeName(type: QuestionType): string {
    return { [QuestionType.Text]: 'Text', [QuestionType.Rating]: 'Rating', [QuestionType.MultipleChoice]: 'Multiple Choice' }[type] ?? 'Unknown';
  }

  getTypeIcon(type: QuestionType): string {
    return { [QuestionType.Text]: '✏️', [QuestionType.Rating]: '⭐', [QuestionType.MultipleChoice]: '☑️' }[type] ?? '❓';
  }
}
