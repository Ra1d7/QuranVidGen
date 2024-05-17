import { AyahAudio } from "./ayah-audio";

export interface Ayah {
  surahName: string;
  surahNameArabic: string;
  surahNameArabicLong: string;
  surahNameTranslation: string;
  revelationPlace: string;
  totalAyah: number;
  surahNo: number;
  ayahNo: number;
  english: string;
  arabic1: string;
  arabic2: string;
  audio: AyahAudio;
}
