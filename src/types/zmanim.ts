export type Location = {
  // Stable id of the CITIES entry this location came from; absent for a fix far from every city.
  cityId?: string;
  // Id of the place picked from the places list (src/data/places.ts), when it is not a CITIES entry.
  placeId?: string;
  lat: number;
  lng: number;
  tz: string;
  name: string;
  nameEn?: string;
  inIsrael: boolean;
  elevation?: number;
  // Local minhag override for candle lighting, in minutes before shkia.
  candleLightingMinutes?: number;
};

export type Zmanim = {
  alotHaShachar: Date;
  misheyakir: Date;
  netzHaChama: Date;
  sofZmanShmaGra: Date;
  sofZmanShmaMA: Date;
  sofZmanTfilaGra: Date;
  chatzot: Date;
  chatzotLayla: Date;
  minchaGedola: Date;
  minchaKetana: Date;
  plagHaMincha: Date;
  shkia: Date;
  tzeitHakochavim: Date;
  // The exit of Shabbat and Yom Tov, and the end of a fast other than Yom Kippur.
  tzeitShabbat: Date;
  tzeitTaanit: Date;
  candleLighting?: Date;
  havdalah?: Date;
};

export type ZmanimKey = keyof Zmanim;

export type HolyBlockKind = 'shabbat' | 'yomTov' | 'shabbatYomTov' | 'yomKippur';

// A maximal run of consecutive Shabbat / Yom Tov days at one location, from candle lighting on the
// erev until the exit of the last day (`holyBlockExit()`, a fixed time after its shkia). `days` are the
// location's calendar dates (YYYY-MM-DD) whose daytime is holy.
export type HolyBlock = {
  start: Date;
  end: Date;
  days: string[];
  kind: HolyBlockKind;
};

export type HebrewDate = {
  year: number;
  month: number;
  day: number;
  hebrewYearStr: string;
  hebrewDateStr: string;
};

export type CalendarInfo = {
  hebrew: HebrewDate;
  parasha?: string;
  holidays: string[];
  isShabbat: boolean;
  isYomTov: boolean;
  omerDay?: number;
  dafYomi?: string;
};
