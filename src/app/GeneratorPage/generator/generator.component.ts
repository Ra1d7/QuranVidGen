import { AfterViewInit, Component } from '@angular/core';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { HelperService } from 'src/app/Services/helper.service';
import { QuranService } from 'src/app/Services/quran.service';

const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

@Component({
  selector: 'app-generator',
  templateUrl: './generator.component.html',
  styleUrls: ['./generator.component.scss']
})
export class GeneratorComponent {
  constructor(private quranService:QuranService,public helper:HelperService){}
  loaded = false;
  loadedAudio = false;
  ffmpeg = new FFmpeg();
  videoURL = "";
  message = "";
  firstLoad = true;
  async ngAfterViewInit(){
    await this.load();

  }
  GetAyahsAndLoadThem(surahNumber:string,startAyah:string,endAyah:string){
    let surahNum = Number.parseInt(surahNumber)
    let start = Number.parseInt(startAyah)
    let end = Number.parseInt(endAyah)
    let blobs = this.quranService.GetAyahsAudio(1,surahNum,start,end).subscribe(async blobs => {
      await this.transcode(blobs);
    });
  }


  async load() {
    this.ffmpeg.on("log", ({ message }) => {
      this.message = message;
      console.warn(message);

    });
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      classWorkerURL:`${window.location.href}assets/ffmpeg/worker.js`
  });
  };
  async transcode(audios:Blob[]) {
    this.firstLoad = true;
    this.loadedAudio = true;
    let audioNames: string[] = [];
for (let index = 0; index < audios.length; index++) {
  await this.ffmpeg.writeFile(index + '.mp3', await fetchFile(audios[index]));
  audioNames.push(`file ${index}.mp3`);
  if (index < audios.length - 1) { // Don't add silence after the last audio file
    audioNames.push(`file 'silence.mp3'`);
  }
}

let silenceCommand = ['-f', 'lavfi', '-i', 'anullsrc', '-t', '0.5', 'silence.mp3'];
await this.ffmpeg.exec(silenceCommand);

// Create a text file with the names of the audio files to be concatenated
let filelist = audioNames.join('\n');
await this.ffmpeg.writeFile('filelist.txt', filelist);

// Use the concat demuxer in ffmpeg
let commands = ['-f', 'concat', '-safe', '0', '-i', 'filelist.txt', '-c', 'copy', 'output.mp3'];
await this.ffmpeg.exec(commands);

    let result:number = await this.ffmpeg.exec(commands);
    if(result != 0)return;
    const fileData = await this.ffmpeg.readFile('output.mp3');
    const data = new Uint8Array(fileData as ArrayBuffer);
    this.videoURL = URL.createObjectURL(
      new Blob([data.buffer], { type: 'audio/mpeg' })
    );

    this.loadedAudio = true;
  };

}
