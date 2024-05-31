import { AfterViewInit, Component, signal } from '@angular/core';
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
  currentLoading:currentLoading = {name:'',value:0};
  progress:ProgressCallback | undefined;
  firstLoad = true;
  ayatTexts:string[] = [];
  suras:Surah[] = [];
  reciters:Reciter[] = [];
  currentSurah:string = '';
  currentReciterId:string = '';
  ffmpegExecuting = false;
  videoPickerVisible = false;
  executingProgress = signal(0);
  executingTime = 0;
  ayahtTextAndAudio:{text:string,duration:number}[] = [];
  executingProgressLabel = signal('');
  fontSize:number = 18;
  pickedVideo:number | undefined;
  clock:number = 0;
  getPickedVideo():string | undefined{
    if(this.pickedVideo){
      return `Video ${this.pickedVideo}`;
    }
    return undefined;
  }
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
    this.ayahtTextAndAudio = [];
    this.ayatTexts = [];
    let reciterId = Number.parseInt(reciter)
    let start = Number.parseInt(startAyah)
    let end = Number.parseInt(endAyah)
    this.ayatTexts = await this.quranService.GetAyatTexts(surahNumber,start,end,'arabic').toPromise() ?? [];

    let blobs = await this.quranService.GetAyahsAudio(reciterId,surahNumber,start,end).toPromise() ?? [];
    await this.transcode(blobs);
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
    this.ffmpeg.on("log", ({ message,type }) => {
      this.message = message;
    });
    this.ffmpeg.on("progress",({progress,time}) =>{
      this.executingProgress.set(Math.floor(progress * 100));
      this.executingTime = Math.floor(time / 1000000);


    })

    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript',true,((ev) => this.GetProgressText(ev.url,'Core Script',ev.received))),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm',true,(ev => this.GetProgressText(ev.url,'Web Worker',ev.received))),
      classWorkerURL: `${window.location.href}assets/ffmpeg/worker.js`
  });
  this.loaded = true;
  };
  async transcode(audios:Blob[]) {
    this.ffmpegExecuting = true;
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
    // let silenceCommand = ['-f', 'lavfi', '-i', 'anullsrc', '-t', '0.5', 'silence.mp3'];
    // await this.ffmpeg.exec(silenceCommand);
    // Create a text file with the names of the audio files to be concatenated
    this.executingProgressLabel.set('Generating Subtitles');
    let filelist = audioNames.join('\n');
    await this.ffmpeg.writeFile('filelist.txt', filelist);
    this.executingProgressLabel.set('Generating Audio');
    // Use the concat demuxer in ffmpeg
    let commands = ['-f', 'concat', '-safe', '0', '-i', 'filelist.txt', '-c', 'copy', 'output.mp3'];
    let randomVideo = Math.max(Math.round((Math.random() * 19)),1)
    let finalVideoName = this.pickedVideo ? this.pickedVideo : randomVideo;
    await this.ffmpeg.writeFile('video.mp4',await fetchFile(`/assets/videos/${finalVideoName}.mp4`));
    await this.ffmpeg.exec(commands);
    this.executingProgressLabel.set('Merging Audio with Video');
    // let subtitleFile = new TextEncoder().encode(this.getSubTitles());
    let subtitleFile = this.getSubtitlesAsAss('center','Al-QuranAlKareem',this.fontSize.toString());
    await this.ffmpeg.writeFile('subtitles.ass',subtitleFile);
    await this.ffmpeg.writeFile('/tmp/Al-QuranAlKareem',await fetchFile('/assets/fonts/Al-QuranAlKareem.ttf'));
    // await this.ffmpeg.writeFile('subtitles.ass',await fetchFile('/assets/subs/test.ass'));
    await this.ffmpeg.exec(['-stream_loop', '-1', '-i', 'video.mp4', '-i', 'output.mp3', '-c:v', 'copy', '-c:a', 'aac', '-map', '0:v:0', '-map', '1:a:0', '-shortest','output.mp4']);
    //:fontsdir=/tmp:force_style='Fontname=Arimo,Fontsize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H000000FF,BackColour=&H00000000,Bold=1,Italic=0,Alignment=2,MarginV=40
    let command = ['-i','output.mp4',"-vf","ass=subtitles.ass:fontsdir=tmp","-c:v","libx264","-preset","ultrafast","-crf","32","-c:a","copy",'outputsub.mp4'];
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

      getSubtitlesAsAss(alignment: string,fontName:string,fontsize:string='16'): string {
        let assContent = `[Script Info]
; Script generated by Ebby.co
ScriptType: v4.00+
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontsize},&Hffffff,&Hffffff,&H000000,&H0,0,0,0,0,100,100,0,0,0,1,1,5,0,0,0,0,UTF-8

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;

        // Set alignment based on the provided parameter
        let alignmentCode = "10"; // Default: left alignment
        if (alignment === "center") {
            alignmentCode = "2";
        } else if (alignment === "right") {
            alignmentCode = "8";
        }

        let startTime = 0;
        this.ayahtTextAndAudio.forEach((subtitle, index) => {
            let endTime = startTime + subtitle.duration;
            let start_time_str = this.formatTime(startTime);
            let end_time_str = this.formatTime(endTime);

            // let end = new Date(endTime * 1000).toISOString().substr(11, 12);

            assContent += `Dialogue: 0,${start_time_str},${end_time_str},Default,,0,0,0,,${subtitle['text']}\n`;
            startTime = endTime;
        });

        return assContent;
    }

    formatTime(seconds: number): string {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = Math.fround(seconds % 60);
      const hundredths = Math.floor((remainingSeconds % 1) * 100).toFixed(2);

      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toFixed(2).toString().padStart(2, '0')}:${hundredths.toString().padStart(2, '0')}`;
  }


}
