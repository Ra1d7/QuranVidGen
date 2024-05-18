import { Injectable } from '@angular/core';
import { CORE_SIZE } from './constants';
import { QuranService } from './quran.service';

@Injectable({
  providedIn: 'root'
})
export class HelperService {

  constructor(private quranService:QuranService) { }


  inputNumberRestrict(surahInput:HTMLInputElement,startAyahInput:HTMLInputElement,endAyahInput:HTMLInputElement,min:number,max:number){
    if(!surahInput.value || surahInput.value == ''){return}
    let surahNumber = Number.parseInt(surahInput.value);
    if(min > surahNumber){
      surahInput.value = min.toString();
    }
    if(surahNumber > max){
      surahInput.value = max.toString();
    }
    startAyahInput.disabled = true;
    endAyahInput.disabled = true;
    startAyahInput.value = '';
    endAyahInput.value = '';
    this.quranService.GetSurah(surahNumber)?.subscribe(surah => {
      startAyahInput.value = '1';
      endAyahInput.value = surah.totalAyah.toString();
      startAyahInput.max = surah.totalAyah.toString();
      endAyahInput.max = surah.totalAyah.toString();
      startAyahInput.disabled = false;
      endAyahInput.disabled = false;
    });


  }

  getDownloadProgress(url:string,recieved:number):number{
    const total = (CORE_SIZE as any)[url];
    return Math.floor(recieved / total * 100);
  }
}
