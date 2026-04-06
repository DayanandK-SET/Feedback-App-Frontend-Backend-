import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TokenService } from '../../Services/token.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {

  private router = inject(Router);
  private tokenService = inject(TokenService);

  menuOpen = signal(false);
  username = signal<string | null>(null);
  role = signal<string | null>(null);

  constructor() {
    this.username.set(this.tokenService.getUsername());
    this.role.set(this.tokenService.getRole());
  }

  get isAdmin(): boolean {
    return this.role() === 'Admin';
  }

  get isUser(): boolean {
    return this.role() === 'User';
  }

  get isCreatorOrAdmin(): boolean {
    return this.role() === 'Creator' || this.role() === 'Admin';
  }

  toggleMenu() {
    this.menuOpen.update(v => !v);
  }

  logout() {
    sessionStorage.removeItem('token');
    this.router.navigateByUrl('');
  }

}
