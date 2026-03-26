import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Navbar } from './navbar';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

describe('Navbar', () => {

  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar, HttpClientTestingModule, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  // ── Component Creation ────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Menu Toggle ───────────────────────────────────

  it('should start with menu closed', () => {
    expect(component.menuOpen()).toBeFalsy();
  });

  it('should open menu when toggleMenu is called', () => {
    component.toggleMenu();
    expect(component.menuOpen()).toBeTruthy();
  });

  it('should close menu when toggleMenu is called twice', () => {
    component.toggleMenu();
    component.toggleMenu();
    expect(component.menuOpen()).toBeFalsy();
  });

  it('should toggle menu when hamburger button is clicked', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const hamburger = compiled.querySelector('.hamburger') as HTMLButtonElement;
    hamburger.click();
    fixture.detectChanges();
    expect(component.menuOpen()).toBeTruthy();
  });

  // ── Admin Role ────────────────────────────────────

  it('should return false for isAdmin when no token set', () => {
    sessionStorage.removeItem('token');
    expect(component.isAdmin).toBeFalsy();
  });

  it('should not show admin link when no token is set', () => {
    sessionStorage.removeItem('token');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const adminLink = compiled.querySelector('.admin-link');
    expect(adminLink).toBeNull();
  });

  // ── Logout ────────────────────────────────────────

  it('should remove token from sessionStorage on logout', () => {
    sessionStorage.setItem('token', 'fake-token');
    component.logout();
    expect(sessionStorage.getItem('token')).toBeNull();
  });

});
