import { AfterViewInit, Component } from '@angular/core';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { ProgressCallback } from '@ffmpeg/util/dist/cjs/types';
import { Reciter } from 'src/app/Interfaces/reciter';
import { Surah } from 'src/app/Interfaces/surah';
import { HelperService } from 'src/app/Services/helper.service';
import { QuranService } from 'src/app/Services/quran.service';

const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
export interface currentLoading{
  name:string;
  value:number;
}

@Component({
  selector: 'app-generator',
  templateUrl: './generator.component.html',
  styleUrls: ['./generator.component.scss']
})
export class GeneratorComponent {
  constructor(public quranService:QuranService,public helper:HelperService){}
  loaded = false;
  loadedAudio = false;
  ffmpeg = new FFmpeg();
  videoURL = "";
  message = "";
  currentLoading:currentLoading | undefined;
  progress:ProgressCallback | undefined;
  firstLoad = true;
  ayatTexts:string[] = [];
  suras:Surah[] = [];
  reciters:Reciter[] = [];
  currentSurah:string = '';
  currentReciterId:string = '';
  ffmpegExecuting = false;
  executingProgress = 0;
  ayahtTextAndAudio:{text:string,duration:number}[] = [];
  async ngAfterViewInit(){
    await this.load();
    this.quranService.GetAllSuras().subscribe(suras =>{
      this.suras = suras;
    })
    this.quranService.GetReciters()?.subscribe(reciters =>{
      this.reciters = reciters;
    })

  }
  async GetAyahsAndLoadThem(surahNumber:number,reciter:string,startAyah:string,endAyah:string){
    let reciterId = Number.parseInt(reciter)
    let start = Number.parseInt(startAyah)
    let end = Number.parseInt(endAyah)
    this.quranService.GetAyahsAudio(reciterId,surahNumber,start,end).subscribe(async blobs => {
      await this.transcode(blobs);
    });
    this.quranService.GetAyatTexts(surahNumber,start,end,'arabic').subscribe(text =>
      this.ayatTexts = text

    );
  }

  GetCurrentSurahNumber():number{
    this.currentSurah;
    this.suras;
    return this.suras.findIndex(x => x.surahName == this.currentSurah)+1;
  }

   previousPercentage = -1;
  GetProgressText(url:string | URL,name:string,recieved:number){
    url = url.toString();
      let percentage = this.helper.getDownloadProgress(url,recieved);
      if(percentage != this.previousPercentage){
        this.currentLoading = {name:name,value:percentage}
        this.previousPercentage = percentage;
      }

  }


  async load() {
    this.loaded = false;
    this.ffmpeg.on("log", ({ message }) => {
      this.message = message;
      console.warn(message);

    });
    this.ffmpeg.on("progress",({progress,time}) =>{
      this.executingProgress = Math.floor(progress * 100);

    })

    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript',true,((ev) => this.GetProgressText(ev.url,'Core Script',ev.received))),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm',true,(ev => this.GetProgressText(ev.url,'Web Worker',ev.received))),
      classWorkerURL:`${window.location.href}assets/ffmpeg/worker.js`
  });
  this.loaded = true;
  };
  async transcode(audios:Blob[]) {

    this.firstLoad = true;
    this.loadedAudio = true;

    let audioNames: string[] = [];
    for (let index = 0; index < audios.length; index++) {
      let audioData = await fetchFile(audios[index]);
      let duration = await this.helper.getDuration(audioData);
      await this.ffmpeg.writeFile(index + '.mp3', audioData);
      this.ayahtTextAndAudio.push({text:this.ayatTexts[index],duration:duration ?? 0})
      // let duration = await this.ffmpeg.
      audioNames.push(`file ${index}.mp3`);
      if (index < audios.length - 1) { // Don't add silence after the last audio file
        // audioNames.push(`file 'silence.mp3'`);
      }
    }
    let silenceCommand = ['-f', 'lavfi', '-i', 'anullsrc', '-t', '0.5', 'silence.mp3'];
    await this.ffmpeg.exec(silenceCommand);

    // Create a text file with the names of the audio files to be concatenated
    let filelist = audioNames.join('\n');
    await this.ffmpeg.writeFile('filelist.txt', filelist);

    // Use the concat demuxer in ffmpeg
    let commands = ['-f', 'concat', '-safe', '0', '-i', 'filelist.txt', '-c', 'copy', 'output.mp3'];
    await this.ffmpeg.writeFile('video.mp4',await fetchFile('/assets/videos/landscapevid2.mp4'));
    await this.ffmpeg.exec(commands);

    let subtitleFile = new TextEncoder().encode(this.getSubTitles());
    // let subtitleFile = this.getSubTitles();
    console.error(subtitleFile);

    await this.ffmpeg.writeFile('subtitles.srt',subtitleFile);
    await this.ffmpeg.exec(['-stream_loop', '-1', '-i', 'video.mp4', '-i', 'output.mp3', '-c:v', 'copy', '-c:a', 'aac', '-map', '0:v:0', '-map', '1:a:0', '-shortest','output.mp4']);
    await this.ffmpeg.writeFile('/tmp/QuranFont',await fetchFile('/assets/fonts/QuranFont.ttf'));
    //:fontsdir=/tmp:force_style='Fontname=Arimo,Fontsize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H000000FF,BackColour=&H00000000,Bold=1,Italic=0,Alignment=2,MarginV=40
    let command = ['-i','output.mp4','-vf',"subtitles=subtitles.srt:fontsdir=tmp:force_style='Fontname=QuranFont,Alignment=10'","-c:v","libx264","-preset","ultrafast","-crf","22","-c:a","copy",'outputsub.mp4'];
    this.executingProgress = 0;
    this.ffmpegExecuting = true;
    await this.ffmpeg.exec(command);

    const fileData = await this.ffmpeg.readFile('outputsub.mp4');
    const data = new Uint8Array(fileData as ArrayBuffer);
    this.videoURL = URL.createObjectURL(new Blob([data.buffer],{type:'video/mp4'}))
        // let result:number = await this.ffmpeg.exec(commands);
        // if(result != 0)return;
        // const fileData = await this.ffmpeg.readFile('output.mp3');
        // const data = new Uint8Array(fileData as ArrayBuffer);
        // this.videoURL = URL.createObjectURL(
        //   new Blob([data.buffer], { type: 'audio/mpeg' })
        // );

        this.loadedAudio = true;
        this.ffmpegExecuting = false;
      };

  getSubTitles():string{
    console.log(this.ayahtTextAndAudio);

    let srtContent = '';
    let startTime = 0;
    this.ayahtTextAndAudio.forEach((subtitle,index) => {
      let endTime = startTime + subtitle.duration;
      let start = new Date(startTime * 1000).toISOString().substr(11, 12);
      let end = new Date(endTime * 1000).toISOString().substr(11, 12);

      srtContent += `${index + 1}\n${start} --> ${end}\n${subtitle.text}\n\n`;
      startTime = endTime;
    })
    return srtContent;
  }

}
