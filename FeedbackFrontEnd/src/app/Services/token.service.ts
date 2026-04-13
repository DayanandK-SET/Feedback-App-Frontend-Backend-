import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class TokenService {

  getToken() {
    return sessionStorage.getItem('token');
  }

  getDecodedToken(): any {
    const token = this.getToken();
    if (!token) return null;

    try {
      return jwtDecode(token);
    } catch {
      return null;
    }
  }

  getUsername(): string | null {
    const decoded = this.getDecodedToken();
    return decoded?.unique_name || null;
  }

  getRole(): string | null {
    const decoded = this.getDecodedToken();
    return decoded?.role || null;
  }

  getUserId(): number {
    const decoded = this.getDecodedToken();
    // .NET ClaimTypes.NameIdentifier maps to 'nameid' in JWT
    const id = decoded?.nameid ?? decoded?.sub;
    return id ? Number(id) : 0;
  }

}