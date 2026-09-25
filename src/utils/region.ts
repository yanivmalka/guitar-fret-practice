import type { Lang } from '../i18n/translations';
import { SEASONS, type Season } from './theme';

// Where the player is, as far as the app needs to know: which hemisphere (so
// the palette can follow the local season) and which language to open in the
// first time. It is read from the device's IANA time zone rather than the GPS
// or the network: no permission prompt, works offline and for guests, and
// nothing about the player's location ever leaves the device.
//
// The hemisphere test is mirrored in the inline boot script in index.html (it
// has to run before first paint) — keep the two in sync.

export type Hemisphere = 'north' | 'south';

export function detectTimeZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''; } catch { return ''; }
}

// Zones that sit south of the equator (their seasons run six months apart from
// the north). Equatorial zones have no real seasons; they fall on whichever
// side they are listed, which is fine for a colour palette.
const SOUTHERN_ZONE = new RegExp(
  '^(Australia/|Antarctica/'
  + '|Pacific/(Auckland|Chatham|Fiji|Tongatapu|Apia|Noumea|Norfolk|Efate|Tahiti|Pago_Pago|Rarotonga)'
  + '|Africa/(Johannesburg|Maputo|Harare|Lusaka|Windhoek|Gaborone|Maseru|Mbabane|Luanda|Blantyre|Lubumbashi)'
  + '|America/(Sao_Paulo|Argentina/|Buenos_Aires|Santiago|Punta_Arenas|Lima|La_Paz|Montevideo|Asuncion|Cuiaba|Campo_Grande|Bahia|Fortaleza|Recife|Belem|Manaus)'
  + '|Indian/(Antananarivo|Mauritius|Reunion))',
);

export function detectHemisphere(tz: string = detectTimeZone()): Hemisphere {
  return SOUTHERN_ZONE.test(tz) ? 'south' : 'north';
}

// Meteorological seasons: winter = Dec–Feb, spring = Mar–May, summer = Jun–Aug,
// autumn = Sep–Nov in the north; shifted half a year in the south.
export function seasonFor(date: Date, hemisphere: Hemisphere): Season {
  const northIndex = Math.floor(((date.getMonth() + 1) % 12) / 3); // 0 winter … 3 autumn
  const index = hemisphere === 'north' ? northIndex : (northIndex + 2) % 4;
  return SEASONS[index];
}

export function currentSeason(): Season {
  return seasonFor(new Date(), detectHemisphere());
}

// The season to show. A pick only holds for the season it was made in: once
// the real season turns over, the palette goes back to following the calendar.
export function resolveSeason(
  pick: Season | null, pickedIn: Season | null, actual: Season = currentSeason(),
): Season {
  return pick && pickedIn === actual ? pick : actual;
}

// Time zones mapped to the translated locales. English is everywhere else,
// which is also the fallback for an unreadable time zone.
const HEBREW_ZONES = new Set(['Asia/Jerusalem', 'Asia/Tel_Aviv', 'Israel']);

// Spain and the Spanish-speaking Americas (plus Equatorial Guinea).
const SPANISH_ZONE = new RegExp(
  '^(Europe/Madrid|Atlantic/Canary|Africa/Ceuta|Africa/Malabo|Pacific/Galapagos|Pacific/Easter'
  + '|America/(Argentina/.+|Buenos_Aires|Cordoba|Mendoza|Catamarca|Jujuy'
  + '|Mexico_City|Cancun|Merida|Monterrey|Matamoros|Chihuahua|Ciudad_Juarez|Ojinaga'
  + '|Mazatlan|Bahia_Banderas|Hermosillo|Tijuana|Ensenada'
  + '|Guatemala|El_Salvador|Tegucigalpa|Managua|Costa_Rica|Panama'
  + '|Havana|Santo_Domingo|Puerto_Rico|Bogota|Caracas|Guayaquil|Lima|La_Paz'
  + '|Santiago|Punta_Arenas|Asuncion|Montevideo))$',
);

export function detectLanguage(tz: string = detectTimeZone()): Lang {
  if (HEBREW_ZONES.has(tz)) return 'he';
  if (SPANISH_ZONE.test(tz)) return 'es';
  return 'en';
}
