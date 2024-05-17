import { Component } from '@angular/core';
import { QuranService } from './Services/quran.service';
import { catchError, of } from 'rxjs';
import { Ayah } from './Interfaces/ayah';
import { Surah } from './Interfaces/surah';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(private quranService:QuranService){}
  ngOnInit(){ }
}
