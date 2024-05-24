import { Injectable } from '@angular/core';
import { CORE_SIZE } from './constants';
import { QuranService } from './quran.service';
import { Observable, fromEvent, map, take } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HelperService {

  constructor(private quranService:QuranService) { }


  SurahNumberRestrict(surahNumber:number,startAyahInput:HTMLInputElement,endAyahInput:HTMLInputElement){
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

  InputNumberRestrict(input:HTMLInputElement){
    let numVal = Number.parseInt(input.value);
    let max = Number.parseInt(input.max)
    let min = Number.parseInt(input.min)
    if(numVal > max){
      input.value = max.toString();
    }
    if(numVal < min){
      input.value = min.toString();
    }
  }

  getDownloadProgress(url:string,recieved:number):number{
    const total = (CORE_SIZE as any)[url];
    return Math.floor(recieved / total * 100);
  }

  getDuration(data: Uint8Array): Promise<number | undefined> {
    // Create a Blob from the Uint8Array
    const blob = new Blob([data], { type: 'audio/mpeg' });

    // Create an object URL from the Blob
    const url = URL.createObjectURL(blob);

    const audio = new Audio(url);
    return fromEvent(audio, 'loadedmetadata').pipe(
      map(() => audio.duration),
      take(1)
    ).toPromise();
  }
}
