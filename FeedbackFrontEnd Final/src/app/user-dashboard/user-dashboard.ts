import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TokenService } from '../Services/token.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-dashboard',
  imports: [CommonModule],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.css'
})
export class UserDashboard {

  private http = inject(HttpClient);
  private tokenService = inject(TokenService);
  private router = inject(Router);

  username = signal<string | null>(null);

  isRequesting = signal(false);
  requestSuccess = signal('');
  requestError = signal('');
  alreadyRequested = signal(false);

  constructor() {
    this.username.set(this.tokenService.getUsername());
  }

  requestCreatorRole() {
    this.isRequesting.set(true);
    this.requestSuccess.set('');
    this.requestError.set('');

    this.http.post('http://localhost:5215/api/User/request-creator-role', {})
      .subscribe({
        next: (res: any) => {
          this.isRequesting.set(false);
          this.requestSuccess.set(res?.message || 'Request submitted successfully. Please wait for admin approval.');
          this.alreadyRequested.set(true);
        },
        error: (err) => {
          this.isRequesting.set(false);
          this.requestError.set(err?.error?.message || 'Failed to submit request. Please try again.');
          // If already pending, mark as requested
          if (err?.error?.message?.toLowerCase().includes('pending')) {
            this.alreadyRequested.set(true);
          }
        }
      });
  }

  logout() {
    sessionStorage.removeItem('token');
    this.router.navigateByUrl('');
  }
}
