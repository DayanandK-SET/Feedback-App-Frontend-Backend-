import { HttpClient } from "@angular/common/http";
 
import { Injectable } from "@angular/core";
import { LoginModel } from "../authentication/Models/LoginModel";
import { RegisterModel } from "../authentication/Models/RegisterModel";

 
@Injectable({
    providedIn: 'root'
})
export class APIAuthenactionService {
    constructor(private http: HttpClient) {
    }
    apiLogin(loginModel: LoginModel){
        return this.http.post('http://localhost:5215/api/Authentication/Login', loginModel);
    }

    apiRegister(registerModel: RegisterModel){
    return this.http.post(
        'http://localhost:5215/api/Authentication/Register',
        registerModel);
    }

    getMySurveys(){
  return this.http.get<any[]>(
    'http://localhost:5215/api/Survey/my-surveys'
  );
}

}