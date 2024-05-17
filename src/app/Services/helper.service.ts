import { Injectable } from '@angular/core';

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
}
