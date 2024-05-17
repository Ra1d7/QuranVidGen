import { Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import {HttpClient} from '@angular/common/http'

@Injectable({
  providedIn: 'root'
})
export class CallServerService {

  constructor(private httpClient:HttpClient) { }
  Get(url:string):Observable<any>
  {
    try{
    return this.httpClient.get<any>(url).pipe(catchError(error => of([])));

    }catch(ex:any){
      throw (ex?.error?.Description);
    }
  }
}
