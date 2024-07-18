import { AfterViewInit, Component, signal } from '@angular/core';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { ProgressCallback } from '@ffmpeg/util/dist/cjs/types';
import { Reciter } from 'src/app/Interfaces/reciter';
import { Surah } from 'src/app/Interfaces/surah';
import { HelperService } from 'src/app/Services/helper.service';
import { QuranService } from 'src/app/Services/quran.service';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Dialog } from '@capacitor/dialog';
import { FFmpegKitPlugin } from '@himeka/capacitor-ffmpeg-kit';
import { Capacitor } from '@capacitor/core';
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


    if(Capacitor.getPlatform() != 'android'){
      this.ffmpeg.on("log", ({ message }) => {
        this.message = message;
      });
      this.ffmpeg.on("progress",({progress,time}) =>{
        this.executingProgress.set(Math.floor(progress * 100));
        this.executingTime = Math.floor(time / 1000000);
      })

      await this.ffmpeg.load({
        coreURL: await toBlobURL(`assets/ffmpeg/ffmpeg-core.js`, 'text/javascript',true,((ev) => this.GetProgressText(ev.url,'Core Script',ev.received))),
        wasmURL: await toBlobURL(`assets/ffmpeg/ffmpeg-core.wasm`, 'application/wasm',true,(ev => this.GetProgressText(ev.url,'Web Worker',ev.received))),
        classWorkerURL: `${window.location.href}assets/ffmpeg/worker.js`
    });
    }
  this.loaded = true;
  };
  async transcode(audios:Blob[]) {
    if(Capacitor.getPlatform() == 'android'){
      await this.transcodeAndroid(audios);
      return;
    }
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
    let randomVideo = Math.max(Math.round((Math.random() * 15)),1)
    let finalVideoName = this.pickedVideo ? this.pickedVideo : randomVideo;
    await this.ffmpeg.writeFile('video.mp4',await fetchFile(`/assets/videos/${finalVideoName}.mp4`));
    await this.ffmpeg.exec(commands);
    this.executingProgressLabel.set('Merging Audio with Video');
    // let subtitleFile = new TextEncoder().encode(this.getSubTitles());
    let subtitleFile = this.getSubtitlesAsAss('center','Al-QuranAlKareem',this.fontSize.toString());
    await this.ffmpeg.writeFile('subtitles.ass',subtitleFile);
    await this.ffmpeg.writeFile('/tmp/Al-QuranAlKareem',await fetchFile('/assets/fonts/Al-QuranAlKareem.ttf'));
    // await this.ffmpeg.writeFile('subtitles.ass',await fetchFile('/assets/subs/test.ass'));
    this.ffmpegExecuting = true;
    this.executingProgress.set(0);
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

  ArrayToBase64( Array:Uint8Array ) {
    var binary = '';
    var len = Array.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( Array[ i ] );
    }
    return window.btoa( binary );
}

async transcodeAndroid(audios:Blob[]) {
  try {
    if(!((await Filesystem.checkPermissions()).publicStorage == 'granted')){
      await Filesystem.requestPermissions()
    }
  } catch (error) {

  }
  try {
    let dirRes = await Filesystem.readdir({directory:Directory.Documents,path:'quranvideos'});
    for(let file of dirRes.files){
      await Filesystem.deleteFile({path:file.uri});
    }
    await Filesystem.rmdir({directory:Directory.Documents,path:'quranvideos',recursive:true});
  } catch (error) {

  }
  try {
    await Filesystem.mkdir({path:'quranvideos',directory:Directory.Documents});
  } catch (error) {

  }
  let cachePath = '/storage/emulated/0/Documents/quranvideos'
  let OutputcachePath = 'storage/emulated/0/Documents/quranvideos'
  this.firstLoad = true;
  this.loadedAudio = true;
  let audioInfos:{name:string,duration:number | undefined,data:Uint8Array}[] = [];
  let audioNames: string[] = [];
  for (let index = 0; index < audios.length; index++) {
    let audioData = await fetchFile(audios[index]);
    let duration = await this.helper.getDuration(audioData);
    // await this.ffmpeg.writeFile(index + '.mp3', audioData);
    await Filesystem.writeFile({
      directory:Directory.Documents,
      path:`quranvideos/${index}.mp3`,
      data:this.ArrayToBase64(audioData)
    })
    audioInfos.push({name:`${index}.mp3`,duration:duration,data:audioData})
    this.ayahtTextAndAudio.push({text:this.ayatTexts[index],duration:duration ?? 0})
    // let duration = await this.ffmpeg.
    audioNames.push(`file ${cachePath}/${index}.mp3`);
    if (index < audios.length - 1) { // Don't add silence after the last audio file
      // audioNames.push(`file 'silence.mp3'`);
    }
  }
  // let silenceCommand = ['-f', 'lavfi', '-i', 'anullsrc', '-t', '0.5', 'silence.mp3'];
  // await this.ffmpeg.exec(silenceCommand);
  // Create a text file with the names of the audio files to be concatenated
  this.executingProgressLabel.set('Generating Subtitles');
  let filelist = audioNames.join('\n');
  // await this.ffmpeg.writeFile('filelist.txt', filelist);
  this.executingProgressLabel.set('Generating Audio');
  // Use the concat demuxer in ffmpeg
  await Filesystem.writeFile({
    data: btoa(filelist),
    directory:Directory.Documents,
    path: 'quranvideos/filelist.txt'
  });
  // fmp.exec()
  await FFmpegKitPlugin.scanFile({
    directory: 'DOCUMENTS',
    path: 'quranvideos'
  })
  let commands = ['-f', 'concat', '-safe', '0', '-i', `${cachePath}/filelist.txt`, '-c', 'copy', `${OutputcachePath}/output.mp3`];
  let res = await FFmpegKitPlugin.execute({command:commands.join(' ')});
  console.warn(res,res.returnCode);

  let randomVideo = Math.max(Math.round((Math.random() * 15)),1)
  let finalVideoName = this.pickedVideo ? this.pickedVideo : randomVideo;
  let videoResult = await Filesystem.writeFile({
    data: this.ArrayToBase64(await fetchFile(`/assets/videos/${finalVideoName}.mp4`)),
    directory: Directory.Documents,
    path: 'quranvideos/video.mp4'
  });
  let mp3Result = await FFmpegKitPlugin.execute({command:commands.join(' ')});
  console.warn('mp3Result',mp3Result.returnCode);

  this.executingProgressLabel.set('Merging Audio with Video');
  // let subtitleFile = new TextEncoder().encode(this.getSubTitles());
  let subtitleFile = this.getSubtitlesAsAss('center','Al-QuranAlKareem',this.fontSize.toString());
  // await this.ffmpeg.writeFile('subtitles.ass',subtitleFile);

  let subtitleResult = await Filesystem.writeFile({
    data:subtitleFile,
    directory: Directory.Documents,
    path: 'quranvideos/subtitles.txt',
    encoding: Encoding.UTF8
  })
  await Filesystem.rename({
    directory:Directory.Documents,
    from: 'quranvideos/subtitles.txt',
    to: 'quranvideos/subtitles.ass'
  })
  let fontResult = await Filesystem.writeFile({
    data: this.ArrayToBase64(await fetchFile('/assets/fonts/Al-QuranAlKareem.ttf')),
    directory: Directory.Documents,
    path: 'quranvideos/Al-QuranAlKareem'
  })
  // await this.ffmpeg.writeFile('subtitles.ass',await fetchFile('/assets/subs/test.ass'));
  this.ffmpegExecuting = true;
  this.executingProgress.set(0);
  // await this.ffmpeg.exec(['-stream_loop', '-1', '-i', 'video.mp4', '-i', `${cachePath}/output.mp3`, '-c:v', 'copy', '-c:a', 'aac', '-map', '0:v:0', '-map', '1:a:0', '-shortest',`${cachePath}/output.mp4`]);
  // let res2 = await FFmpegKitPlugin.execute({command:['-fflags','+genpts','-stream_loop', '-1', '-i', `${cachePath}/video.mp4`,'-i', `${cachePath}/output.mp3`, '-c:v', 'copy','-fflags','+shortest', '-c:a', 'aac', '-map', '0:v:0', '-map', '1:a:0', '-shortest',`${OutputcachePath}/output.mp4`].join(' ')});
  console.log('----- start loop -----')
  let res2 = await FFmpegKitPlugin.execute({command:['-stream_loop', '-1', '-i', `${cachePath}/video.mp4`,'-i', `${cachePath}/output.mp3`, '-shortest', '-map','0:v:0', '-map', '1:a:0', '-y',`${OutputcachePath}/output.mp4`].join(' ')});
  // let res2 = await FFmpegKitPlugin.execute({command:['-i', `${cachePath}/video.mp4`, '-i', `${cachePath}/output.mp3`, 'filter_complex', '[1:v]colorkey=0xFFFFFF:0.01:0.0[KeyedOverlay];[0:v][KeyedOverlay]overlay=shortest=1:format=auto[Composite]', '-map', '[Composite]', `${OutputcachePath}/output.mp4`].join(' ')});
  console.warn('loop result',res2.returnCode);


  //:fontsdir=/tmp:force_style='Fontname=Arimo,Fontsize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H000000FF,BackColour=&H00000000,Bold=1,Italic=0,Alignment=2,MarginV=40
  // let command = ['-i',`${cachePath}/output.mp4`,"-vf",`ass=${cachePath}/subtitles.ass:fontsdir=${cachePath}`,"-c:v","libx264","-preset","ultrafast","-crf","32","-c:a","copy",`${OutputcachePath}/outputsub.mp4`];
  let command = ['-i',`${cachePath}/output.mp4`,"-vf",`ass=${cachePath}/subtitles.ass:fontsdir=${cachePath}`,"-c:a","copy",`${OutputcachePath}/outputsub.mp4`];
  let res3 = await FFmpegKitPlugin.execute({command:command.join(' ')})
  console.warn('res3',res3.returnCode);

  // await this.ffmpeg.exec(command);




  const fileData = await Filesystem.readFile({directory:Directory.Documents,path:'quranvideos/outputsub.mp4',encoding:Encoding.UTF8});
  this.videoURL =  this.ArrayToBase64(new Uint8Array(fileData.data as any))
  try {
    try {
      await Filesystem.mkdir({
        directory: Directory.Documents,
        path: 'videos',
        recursive:false

      });
    } catch (error) {

    }
    await Filesystem.writeFile({
      data: this.videoURL,
      path:`videos/generated-video-${Date.now()}.mp4`,
      directory: Directory.Documents
    });

    await Dialog.alert({
      title:'Video Saved!',
      message: `Video has been saved to your device`,
      buttonTitle: 'Ok'
    })
  } catch (error) {

  }
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


}
