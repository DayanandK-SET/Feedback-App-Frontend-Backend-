import { Component, inject, signal, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoginModel } from './Models/LoginModel';
import { RegisterModel } from './Models/RegisterModel';
import { APIAuthenactionService } from '../Services/api.Authentication.Service';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { Router } from '@angular/router';
import { TokenService } from '../Services/token.service';
import { isValidEmail } from '../utils/email-validator';

@Component({
  selector: 'app-authentication',
  imports: [FormsModule, CommonModule],
  templateUrl: './authentication.html',
  styleUrls: ['./authentication.css'],
})
export class Authentication {

  loginModel: LoginModel;
  registerModel: RegisterModel;

  activeTab: string = 'login';

  loginError: string = '';
  registerError: string = '';

  isLoginLoading: boolean = false;
  isRegisterLoading: boolean = false;

  // Toast
  toastMessage = signal('');
  toastVisible = signal(false);
  toastType = signal<'success' | 'error'>('success');

  private apiAuthService  = inject(APIAuthenactionService);
  private cd              = inject(ChangeDetectorRef);
  private router          = inject(Router);
  private tokenService    = inject(TokenService);

  constructor() {
    this.loginModel    = new LoginModel();
    this.registerModel = new RegisterModel();

    // BACK BUTTON FIX: if a token already exists redirect away immediately
    const token = this.tokenService.getToken();
    if (token) {
      const role = this.tokenService.getRole();
      if (role === 'Admin') {
        this.router.navigate(['/admin'], { replaceUrl: true });
      } else if (role === 'User') {
        this.router.navigate(['/user-dashboard'], { replaceUrl: true });
      } else {
        this.router.navigate(['/dashboard'], { replaceUrl: true });
      }
    }
  }

  //  Toast helper 

  private showToast(message: string, type: 'success' | 'error' = 'success') {
    this.toastMessage.set(message);
    this.toastType.set(type);
    this.toastVisible.set(true);

    // Auto-hide after 2.5 seconds
    setTimeout(() => {
      this.toastVisible.set(false);
    }, 2500);
  }

  // ── Login ─────────────────────────────────────────

  login() {
    this.loginError = '';
    this.isLoginLoading = true;

    this.apiAuthService.apiLogin(this.loginModel)
      .pipe(
        finalize(() => {
          this.isLoginLoading = false;
          this.cd.detectChanges();
        })
      )
      .subscribe({
        next: (response: any) => {
          if (response) {
            sessionStorage.setItem('token', response?.token);

            this.showToast('Login successful! Redirecting...');

            // replaceUrl: true so back button cannot return to login page
            setTimeout(() => {
              const role = this.tokenService.getRole();
              if (role === 'Admin') {
                this.router.navigate(['/admin'], { replaceUrl: true });
              } else if (role === 'User') {
                this.router.navigate(['/user-dashboard'], { replaceUrl: true });
              } else {
                this.router.navigate(['/dashboard'], { replaceUrl: true });
              }
            }, 1000);
          }
        },
        error: (error) => {
          if (error.status === 401) {
            this.loginError = 'Invalid username or password';
          } else {
            this.loginError = 'Something went wrong. Please try again.';
          }
        }
      });
  }

  // ── Register ──────────────────────────────────────

  register() {
    this.registerError = '';

    // Validate email before hitting the API
    if (!isValidEmail(this.registerModel.email.trim())) {
      this.registerError = 'Please enter a valid email address.';
      return;
    }

    this.isRegisterLoading = true;

    this.apiAuthService.apiRegister(this.registerModel)
      .pipe(
        finalize(() => {
          this.isRegisterLoading = false;
          this.cd.detectChanges();
        })
      )
      .subscribe({
        next: (response: any) => {
          if (response) {

            this.showToast('Registration successful! Please log in.');
            this.registerModel = new RegisterModel();
            this.activeTab = 'login';
          }
        },
        error: (error) => {
          if (error.status === 400) {
            this.registerError = error.error?.message || 'Registration failed';
          } else {
            this.registerError = 'Something went wrong.';
          }
        }
      });
  }
}
