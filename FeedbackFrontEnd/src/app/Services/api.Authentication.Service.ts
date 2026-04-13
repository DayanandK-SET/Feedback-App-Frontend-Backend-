// import { HttpClient } from "@angular/common/http";
 
// import { Injectable } from "@angular/core";
// import { LoginModel } from "../authentication/Models/LoginModel";
// import { RegisterModel } from "../authentication/Models/RegisterModel";

 
// @Injectable({
//     providedIn: 'root'
// })
// export class APIAuthenactionService {
//     constructor(private http: HttpClient) {
//     }
//     apiLogin(loginModel: LoginModel){
//         return this.http.post('http://localhost:5215/api/Authentication/Login', loginModel);
//     }

//     apiRegister(registerModel: RegisterModel){
//     return this.http.post(
//         'http://localhost:5215/api/Authentication/Register',
//         registerModel);
//     }

//     getMySurveys(){
//   return this.http.get<any[]>(
//     'http://localhost:5215/api/Survey/my-surveys'
//   );
// }

// }


import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.prod';
import { LoginModel } from '../authentication/Models/LoginModel';
import { RegisterModel } from '../authentication/Models/RegisterModel';

@Injectable({ providedIn: 'root' })
export class APIAuthenactionService {

  private baseUrl = `${environment.apiUrl}/Authentication`;

  constructor(private http: HttpClient) {}

  apiLogin(loginModel: LoginModel) {
    return this.http.post(`${this.baseUrl}/Login`, loginModel);
  }

  apiRegister(registerModel: RegisterModel) {
    return this.http.post(`${this.baseUrl}/Register`, registerModel);
  }

  getMySurveys() {
    return this.http.get<any[]>(`${environment.apiUrl}/Survey/my-surveys`);
  }
}