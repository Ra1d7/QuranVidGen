import { AfterViewInit, Component } from '@angular/core';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

@Component({
  selector: 'app-generator',
  templateUrl: './generator.component.html',
  styleUrls: ['./generator.component.scss']
})
export class GeneratorComponent {
  loaded = false;
  ffmpeg = new FFmpeg();
  videoURL = "";
  message = "";
  async ngAfterViewInit(){
    await this.load();
  }
  async load() {
    this.ffmpeg.on("log", ({ message }) => {
      this.message = message;
      console.warn(message);

    });
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      classWorkerURL: 'assets/ffmpeg/worker.js' // PATH TO WEB WORKER SCRIPT
    });
    this.loaded = true;
  };
  async transcode() {
    const videoURL = "https://raw.githubusercontent.com/ffmpegwasm/testdata/master/video-15s.avi";
    await this.ffmpeg.writeFile("input.avi", await fetchFile(videoURL));
    await this.ffmpeg.exec(["-i", "input.avi", "output.mp4"]);
    const fileData = await this.ffmpeg.readFile('output.mp4');
    const data = new Uint8Array(fileData as ArrayBuffer);
    this.videoURL = URL.createObjectURL(
      new Blob([data.buffer], { type: 'video/mp4' })
    );
  };

}
