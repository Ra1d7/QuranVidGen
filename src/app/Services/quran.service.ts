import { Injectable } from '@angular/core';
import { CallServerService } from './call-server.service';
import { Observable, forkJoin, map, of, tap, throwError } from 'rxjs';
import { Surah } from '../Interfaces/surah';
import {Reciter} from '../Interfaces/reciter';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class QuranService {

  constructor(private callServerService:CallServerService,private http:HttpClient) { }


  GetSurah(surahNumber:number):Observable<Surah> | undefined{
    return this.callServerService.Get(`https://quranapi.pages.dev/api/${surahNumber}.json`);
  }
  GetReciters():Observable<Reciter[]> | undefined{
    return this.callServerService.Get(`https://quranapi.pages.dev/api/reciters.json`).pipe(map(value => {
      return Object.keys(value).map(key => {
        return {
          id: key,
          name: value[key]
        } as Reciter;
      });
    }));
  }
  GetAyahAudio(reciterId:number | string,surahNumber:number,ayahNumber:number):Observable<Blob>{
    return this.http.get(`https://quranaudio.pages.dev/${reciterId}/${surahNumber}_${ayahNumber}.mp3`,{responseType:'blob'});
  }

  GetAyahsAudio(reciterId: number | string, surahNumber: number, startAyah: number, endAyah: number): Observable<Blob[]> {
    const observables: Observable<Blob>[] = [];

    for (let ayahNumber = startAyah; ayahNumber <= endAyah; ayahNumber++) {
      const observable = this.GetAyahAudio(reciterId,surahNumber,ayahNumber);
      observables.push(observable);
    }
    return forkJoin(observables);
  }

}
