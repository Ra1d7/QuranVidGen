import { Injectable } from '@angular/core';
import { CallServerService } from './call-server.service';
import { Observable, forkJoin, from, map, of, tap, throwError } from 'rxjs';
import { Surah } from '../Interfaces/surah';
import {Reciter} from '../Interfaces/reciter';
import { HttpClient } from '@angular/common/http';
import { Ayah } from '../Interfaces/ayah';

@Injectable({
  providedIn: 'root'
})
export class QuranService {

  constructor(private callServerService:CallServerService,private http:HttpClient) { }


  GetSurah(surahNumber:number):Observable<Surah> | undefined{
    return this.callServerService.Get(`https://quranapi.pages.dev/api/${surahNumber}.json`);
  }

  GetAyah(surahNumber:number,AyahNumber:number):Observable<Ayah> | undefined{
    return this.callServerService.Get(`https://quranapi.pages.dev/api/${surahNumber}/${AyahNumber}.json`)
  }

  GetAyatTexts(surahNumber:number,AyahStartNumber:number,AyahEndNumber:number,language:'arabic' | 'english'): Observable<string[]> {
    let observables: Observable<Ayah>[] = [];
    for (let i = AyahStartNumber; i <= AyahEndNumber; i++) {
        observables.push(this.GetAyah(surahNumber,i)!);
    }

    return forkJoin(observables).pipe(
        map(ayahs => {
            let text: string[] = [];
            ayahs.forEach(ayah => {
                text.push(language == 'arabic' ? ayah.arabic2 : ayah.english);
            });
            return text;
        })
    );
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

  GetAllSuras():Observable<Surah[]>{
    return this.callServerService.Get('https://quranapi.pages.dev/api/surah.json');
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
