import { Component, EventEmitter, Output } from '@angular/core';
import { range } from 'rxjs';

@Component({
  selector: 'app-videos-dialog',
  templateUrl: './videos-dialog.component.html',
  styleUrls: ['./videos-dialog.component.scss']
})
export class VideosDialogComponent {
  videoNumbers: number[] = Array.from({ length: 19 }, (_, i) => i + 1);
  @Output() pickedVideo = new EventEmitter<number | undefined>();

  pickVideo(number:number | undefined){
    this.pickedVideo.emit(number);
  }
}
