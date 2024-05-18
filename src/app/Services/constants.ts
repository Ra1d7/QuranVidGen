export const CORE_VERSION = "0.12.6";

export const CORE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm/ffmpeg-core.js`;
export const CORE_MT_URL = `https://unpkg.com/@ffmpeg/core-mt@${CORE_VERSION}/dist/esm/ffmpeg-core.js`;

export const CORE_SIZE:{[key:string]:number} = {
  [`https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm/ffmpeg-core.js`]: 114673,
  [`https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm/ffmpeg-core.wasm`]: 32129114,
  [`https://unpkg.com/@ffmpeg/core-mt@${CORE_VERSION}/dist/esm/ffmpeg-core.js`]: 132680,
  [`https://unpkg.com/@ffmpeg/core-mt@${CORE_VERSION}/dist/esm/ffmpeg-core.wasm`]: 32609891,
  [`https://unpkg.com/@ffmpeg/core-mt@${CORE_VERSION}/dist/esm/ffmpeg-core.worker.js`]: 2915,
};
