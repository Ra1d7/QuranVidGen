import { Injectable } from '@angular/core';
import { CORE_SIZE } from './constants';

@Injectable({
  providedIn: 'root'
})
export class HelperService {

  constructor() { }


  inputNumberRestrict(input:HTMLInputElement,min:number,max:number){
    let numVal = Number.parseInt(input.value);
    if(min > numVal){
      input.value = min.toString();
    }
    if(numVal > max){
      input.value = max.toString();
    }
  }

  getDownloadProgress(url:string,recieved:number):number{
    const total = (CORE_SIZE as any)[url];
    return Math.floor(recieved / total * 100);
  }
}
