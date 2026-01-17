import {
  addDays,
  addWeeks,
  addMonths,
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  nextSaturday,
  nextSunday,
  format,
  isValid,
  getDay,
} from 'date-fns';
import { PriorityLevel, Label } from '@/types/database';

interface ParsedTask {
  title: string;
  date: Date | null;
  time: string | null;
  priority: PriorityLevel | null;
}

// =============================================================================
// MONTHS (FR + EN + typos)
// =============================================================================
const monthsMap: Record<string, number> = {
  // Janvier (0)
  'janvier': 0, 'janiver': 0, 'janvie': 0, 'janv': 0, 'jan': 0,
  'january': 0, 'januray': 0,
  // Février (1)
  'février': 1, 'fevrier': 1, 'fevirer': 1, 'fev': 1, 'feb': 1,
  'february': 1, 'febuary': 1, 'feburary': 1,
  // Mars (2)
  'mars': 2, 'mar': 2, 'march': 2, 'marhc': 2,
  // Avril (3)
  'avril': 3, 'avrli': 3, 'avrl': 3, 'avri': 3,
  'april': 3, 'apirl': 3, 'apr': 3,
  // Mai (4)
  'mai': 4, 'mia': 4, 'may': 4,
  // Juin (5)
  'juin': 5, 'jui': 5, 'june': 5, 'jun': 5,
  // Juillet (6)
  'juillet': 6, 'juilet': 6, 'juill': 6, 'juil': 6,
  'july': 6, 'jul': 6,
  // Août (7)
  'août': 7, 'aout': 7, 'aou': 7,
  'august': 7, 'aug': 7, 'agust': 7,
  // Septembre (8)
  'septembre': 8, 'setpembre': 8, 'sept': 8, 'sep': 8,
  'september': 8, 'septmber': 8,
  // Octobre (9)
  'octobre': 9, 'octobr': 9, 'ocotbre': 9, 'oct': 9,
  'october': 9, 'ocotber': 9,
  // Novembre (10)
  'novembre': 10, 'novembr': 10, 'novmbre': 10, 'nov': 10,
  'november': 10, 'novmeber': 10,
  // Décembre (11)
  'décembre': 11, 'decembre': 11, 'decembr': 11, 'dec': 11,
  'december': 11, 'decmber': 11,
};

// =============================================================================
// NUMBERS IN WORDS (FR + EN + typos)
// =============================================================================
const numbersMap: Record<string, number> = {
  // French
  'un': 1, 'une': 1,
  'deux': 2, 'deu': 2, 'duex': 2, 'deuxx': 2,
  'trois': 3, 'trios': 3, 'troi': 3, 'toirs': 3,
  'quatre': 4, 'qatre': 4, 'quatr': 4, 'quattre': 4, 'qautre': 4,
  'cinq': 5, 'cinc': 5, 'sinq': 5, 'cинq': 5,
  'six': 6, 'sxi': 6, 'sixx': 6,
  'sept': 7, 'spt': 7, 'setp': 7, 'setpt': 7,
  'huit': 8, 'huti': 8, 'huiit': 8, 'huite': 8,
  'neuf': 9, 'nuef': 9,
  'dix': 10, 'dxi': 10,
  'onze': 11,
  'douze': 12, 'douz': 12,
  'treize': 13,
  'quatorze': 14, 'qatorze': 14,
  'quinze': 15, 'quinz': 15, 'qinze': 15, 'quinzze': 15,
  // English
  'one': 1,
  'two': 2, 'tow': 2,
  'three': 3, 'thre': 3, 'tree': 3,
  'four': 4, 'foru': 4,
  'five': 5, 'fiev': 5,
  'seven': 7, 'sevn': 7,
  'eight': 8, 'eigth': 8, 'eihgt': 8,
  'nine': 9, 'nien': 9,
  'ten': 10,
  'eleven': 11,
  'twelve': 12,
  'fifteen': 15, 'fiveteen': 15,
};

// Day index for setDay (0 = Sunday, 1 = Monday, etc.)
const dayIndexMap: Record<string, number> = {
  // French
  'lundi': 1, 'lunid': 1, 'lundii': 1, 'ludi': 1, 'lun': 1,
  'mardi': 2, 'madri': 2, 'mardii': 2, 'mradi': 2, 'mar': 2,
  'mercredi': 3, 'mercerdi': 3, 'mecredi': 3, 'mercrredi': 3, 'mercrdei': 3, 'mer': 3,
  'jeudi': 4, 'juedi': 4, 'jeudii': 4, 'jeuidi': 4, 'jeu': 4,
  'vendredi': 5, 'vendrdei': 5, 'vendreidi': 5, 'vendredii': 5, 'vendrei': 5, 'ven': 5,
  'samedi': 6, 'samdei': 6, 'samedii': 6, 'smedi': 6, 'sam': 6,
  'dimanche': 0, 'diamnche': 0, 'dimanchee': 0, 'dimnache': 0, 'dimance': 0, 'dim': 0,
  // English
  'monday': 1, 'mondya': 1, 'monady': 1, 'mon': 1,
  'tuesday': 2, 'teusday': 2, 'tueday': 2, 'tue': 2, 'tues': 2,
  'wednesday': 3, 'wedensday': 3, 'wensday': 3, 'wedneday': 3, 'wed': 3,
  'thursday': 4, 'thurday': 4, 'thrusday': 4, 'thursady': 4, 'thu': 4, 'thur': 4, 'thurs': 4,
  'friday': 5, 'firday': 5, 'fridya': 5, 'friady': 5, 'fri': 5,
  'saturday': 6, 'saterday': 6, 'satruday': 6, 'saturady': 6, 'sat': 6,
  'sunday': 0, 'sunady': 0, 'sudnay': 0, 'sundya': 0, 'sun': 0,
};

const dayPatterns: Record<string, (date: Date) => Date> = {
  // Monday + typos
  monday: nextMonday,
  mondya: nextMonday,
  monady: nextMonday,
  mon: nextMonday,
  // Tuesday + typos
  tuesday: nextTuesday,
  teusday: nextTuesday,
  tueday: nextTuesday,
  tue: nextTuesday,
  tues: nextTuesday,
  // Wednesday + typos
  wednesday: nextWednesday,
  wedensday: nextWednesday,
  wensday: nextWednesday,
  wedneday: nextWednesday,
  wed: nextWednesday,
  // Thursday + typos
  thursday: nextThursday,
  thurday: nextThursday,
  thrusday: nextThursday,
  thursady: nextThursday,
  thu: nextThursday,
  thur: nextThursday,
  thurs: nextThursday,
  // Friday + typos
  friday: nextFriday,
  firday: nextFriday,
  fridya: nextFriday,
  friady: nextFriday,
  fri: nextFriday,
  // Saturday + typos
  saturday: nextSaturday,
  saterday: nextSaturday,
  satruday: nextSaturday,
  saturady: nextSaturday,
  sat: nextSaturday,
  // Sunday + typos
  sunday: nextSunday,
  sunady: nextSunday,
  sudnay: nextSunday,
  sundya: nextSunday,
  sun: nextSunday,
};

// Helper to get next Saturday (weekend)
const getNextSaturday = () => {
  const today = new Date();
  const dayOfWeek = getDay(today);
  const daysUntilSaturday = dayOfWeek === 6 ? 7 : (6 - dayOfWeek);
  return addDays(today, daysUntilSaturday);
};

// Helper to get start of next week (Monday)
const getStartOfNextWeek = () => {
  const today = new Date();
  const dayOfWeek = getDay(today);
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  return addDays(today, daysUntilMonday);
};

// Helper to get end of current week (Friday)
const getEndOfWeek = () => {
  const today = new Date();
  const dayOfWeek = getDay(today);
  const daysUntilFriday = dayOfWeek <= 5 ? (5 - dayOfWeek) : (5 + 7 - dayOfWeek);
  return addDays(today, daysUntilFriday);
};

const relativePatterns: Record<string, () => Date> = {
  // English + typos
  'today': () => new Date(),
  'todya': () => new Date(),
  'toaday': () => new Date(),
  'tomorrow': () => addDays(new Date(), 1),
  'tommorow': () => addDays(new Date(), 1),
  'tomorow': () => addDays(new Date(), 1),
  'tommorrow': () => addDays(new Date(), 1),
  'tomorroww': () => addDays(new Date(), 1),
  'tomorrw': () => addDays(new Date(), 1),
  'tmrw': () => addDays(new Date(), 1),
  'tmr': () => addDays(new Date(), 1),
  'next week': () => addDays(new Date(), 7),
  'nxt week': () => addDays(new Date(), 7),
  'next wek': () => addDays(new Date(), 7),
  // French - Aujourd'hui + typos
  "aujourd'hui": () => new Date(),
  'aujourdhui': () => new Date(),
  'aujoudhui': () => new Date(),
  'aujourdui': () => new Date(),
  'ajd': () => new Date(),
  'auj': () => new Date(),
  // Demain + typos
  'demain': () => addDays(new Date(), 1),
  'demian': () => addDays(new Date(), 1),
  'demaain': () => addDays(new Date(), 1),
  'dmain': () => addDays(new Date(), 1),
  'demin': () => addDays(new Date(), 1),
  'deman': () => addDays(new Date(), 1),
  'demn': () => addDays(new Date(), 1),
  'dmeain': () => addDays(new Date(), 1),
  'demani': () => addDays(new Date(), 1),
  'demaiin': () => addDays(new Date(), 1),
  'demainj': () => addDays(new Date(), 1),
  'dem': () => addDays(new Date(), 1),
  // Après-demain + typos
  'apres-demain': () => addDays(new Date(), 2),
  'après-demain': () => addDays(new Date(), 2),
  'apres demain': () => addDays(new Date(), 2),
  'après demain': () => addDays(new Date(), 2),
  'aprés demain': () => addDays(new Date(), 2),
  'apres dmeain': () => addDays(new Date(), 2),
  'aprs demain': () => addDays(new Date(), 2),
  // Semaine prochaine + typos
  'la semaine prochaine': () => addDays(new Date(), 7),
  'semaine prochaine': () => addDays(new Date(), 7),
  'semiane prochaine': () => addDays(new Date(), 7),
  'semmaine prochaine': () => addDays(new Date(), 7),
  'semaine prochiane': () => addDays(new Date(), 7),
  'semaine prochane': () => addDays(new Date(), 7),
  'sem pro': () => addDays(new Date(), 7),
  'sem prochaine': () => addDays(new Date(), 7),
  'la sem pro': () => addDays(new Date(), 7),
  'la sem prochaine': () => addDays(new Date(), 7),
  // Weekend + typos
  'ce weekend': () => getNextSaturday(),
  'ce week-end': () => getNextSaturday(),
  'ce week end': () => getNextSaturday(),
  'ce we': () => getNextSaturday(),
  'ce w-e': () => getNextSaturday(),
  'this weekend': () => getNextSaturday(),
  'this week-end': () => getNextSaturday(),
  'weekend': () => getNextSaturday(),
  'week-end': () => getNextSaturday(),
  'week end': () => getNextSaturday(),
  'wikend': () => getNextSaturday(),
  'wekend': () => getNextSaturday(),
  'weeken': () => getNextSaturday(),
  'we': () => getNextSaturday(),
  'w-e': () => getNextSaturday(),
  'fin de semaine': () => getEndOfWeek(),
  'fin de sem': () => getEndOfWeek(),
  'fni de semaine': () => getEndOfWeek(),
  // Début de semaine + typos
  'début de semaine': () => getStartOfNextWeek(),
  'debut de semaine': () => getStartOfNextWeek(),
  'début de sem': () => getStartOfNextWeek(),
  'debut de sem': () => getStartOfNextWeek(),
  'debtu de semaine': () => getStartOfNextWeek(),
  'début de semaine prochaine': () => addDays(getStartOfNextWeek(), 7),
  'debut de semaine prochaine': () => addDays(getStartOfNextWeek(), 7),
  // Mois prochain + typos
  'le mois prochain': () => addMonths(new Date(), 1),
  'mois prochain': () => addMonths(new Date(), 1),
  'mois prochian': () => addMonths(new Date(), 1),
  'mois prochaine': () => addMonths(new Date(), 1),
  'mois pro': () => addMonths(new Date(), 1),
  'mois proch': () => addMonths(new Date(), 1),
  'moi prochain': () => addMonths(new Date(), 1),
  'moi pro': () => addMonths(new Date(), 1),
  'next month': () => addMonths(new Date(), 1),
  'nxt month': () => addMonths(new Date(), 1),
  // Dans un mois + typos
  'dans un mois': () => addMonths(new Date(), 1),
  'dans 1 mois': () => addMonths(new Date(), 1),
  'ds un mois': () => addMonths(new Date(), 1),
  'ds 1 mois': () => addMonths(new Date(), 1),
  'dans 1m': () => addMonths(new Date(), 1),
  'ds 1m': () => addMonths(new Date(), 1),
  'in a month': () => addMonths(new Date(), 1),
  'in 1 month': () => addMonths(new Date(), 1),
  // Dans deux mois
  'dans deux mois': () => addMonths(new Date(), 2),
  'dans 2 mois': () => addMonths(new Date(), 2),
  'ds 2 mois': () => addMonths(new Date(), 2),
  'dans 2m': () => addMonths(new Date(), 2),
  // Cette semaine
  'cette semaine': () => getEndOfWeek(),
  'cette sem': () => getEndOfWeek(),
  'cet semaine': () => getEndOfWeek(),
  'this week': () => getEndOfWeek(),
  'ths week': () => getEndOfWeek(),
};

// =============================================================================
// TIME-ONLY KEYWORDS (set time, NOT date - unless used alone)
// These are used to set time when combined with date keywords
// When used alone, they imply today's date
// =============================================================================
const timeOnlyKeywords = new Set([
  // MIDI
  'midi', 'mdii', 'miid', 'mdi', 'miidi', 'midii', 'a midi', 'à midi', 'pour midi',
  // MINUIT
  'minuit', 'minui', 'minuiit', 'minut', 'minuitt', 'minuut', 'a minuit', 'à minuit',
  // MATIN / RÉVEIL
  'matin', 'mat', 'mtin', 'matni', 'matiin', 'matn', 'mattin', 'le matin', 'ce matin',
  'au reveil', 'au réveil', 'au reveill', 'au reviel', 'au revel', 'a mon reveil', 'à mon réveil',
  'tot le matin', 'tôt le matin', 'tot', 'tôt', 'early', 'early morning',
  // SOIR / NUIT
  'soir', 'sori', 'soirr', 'soiir', 'soire', 'soiree', 'soirée', 'ce soir', 'le soir',
  'en soiree', 'en soirée', 'cette nuit', 'cete nuit', 'cette nui', 'cett nuit', 'la nuit',
  'tonight', 'tonite', 'this evening', 'this night', 'late', 'tard', 'tard le soir',
  // APRÈS-MIDI
  'aprem', 'aprèm', 'apres-midi', 'après-midi', 'apres midi', 'après midi', 'apresmidi', 'aprèsmidi',
  'apremd', 'apresm', 'cet aprem', 'cette aprem', 'cet après-midi', 'cet apres-midi', 'cette après-midi',
  'afternoon', 'this afternoon',
  // PETIT DÉJEUNER
  'petit dej', 'petit déj', 'petit dejeuner', 'petit déjeuner', 'ptit dej', 'ptit déj',
  "p'tit dej", "p'tit déj", 'au petit dej', 'au petit déj', 'pour le petit dej', 'pour le petit déj',
  'au petit dejeuner', 'au petit déjeuner', 'pour le petit dejeuner', 'pour le petit déjeuner',
  'breakfast', 'for breakfast', 'at breakfast',
  // BRUNCH
  'brunch', 'brunhc', 'brnuch', 'bruhcn', 'brunh', 'au brunch', 'pour le brunch', 'for brunch', 'at brunch',
  // DÉJEUNER / LUNCH
  'dej', 'déj', 'dejeuner', 'déjeuner', 'dejuner', 'déjuner', 'dejeune', 'dejeuener', 'dejeuné',
  'au dej', 'au déj', 'pour le dej', 'pour le déj', 'a dejeuner', 'à dejeuner', 'a déjeuner', 'à déjeuner',
  'au dejeuner', 'au déjeuner', 'pour le dejeuner', 'pour le déjeuner',
  'lunch', 'luch', 'lunhc', 'lnuch', 'at lunch', 'for lunch', 'during lunch',
  // GOÛTER
  'gouter', 'goûter', 'goute', 'gouté', 'goutee', 'goutér', 'au gouter', 'au goûter',
  'pour le gouter', 'pour le goûter', 'snack', 'snack time', 'tea time', 'quatre heures', '4 heures',
  // DÎNER / DINNER
  'diner', 'dîner', 'dinner', 'diiner', 'dinre', 'dner', 'diné', 'au diner', 'au dîner',
  'pour le diner', 'pour le dîner', 'a diner', 'à dîner', 'dinnre', 'dinener', 'at dinner', 'for dinner',
  // SOUPER
  'souper', 'soupé', 'soupe', 'soupper', 'soper', 'au souper', 'pour le souper', 'supper', 'supper time',
  // COUCHER / BEDTIME
  'coucher', 'couche', 'couchée', 'couchee', 'couchér', 'couché', 'au coucher',
  'avant de dormir', 'avant dormir', 'avant dodo', 'au lit', 'bedtime', 'bed time', 'before bed', 'before sleep',
  // LEVER / COUCHER DE SOLEIL
  'lever de soleil', 'levée de soleil', 'levee de soleil', 'lever du soleil', 'levée du soleil', 'levee du soleil',
  'au lever du soleil', 'lever soleil', 'levé de soleil', 'leve de soleil', 'sunrise', 'sun rise', 'at sunrise',
  'coucher de soleil', 'couchée de soleil', 'couchee de soleil', 'coucher du soleil', 'couchée du soleil',
  'couchee du soleil', 'au coucher du soleil', 'coucher soleil', 'sunset', 'sun set', 'at sunset',
  // PAUSE
  'pause', 'pause cafe', 'pause café', 'coffee break', 'break',
  // AUBE
  'aube', "à l'aube", "a l'aube", 'aux aurores', 'aurore', "à l'aurore", 'dawn', 'at dawn',
  // MATINÉE
  'dans la matinee', 'dans la matinée', 'en matinee', 'en matinée', 'durant la matinee', 'durant la matinée',
  'pendant la matinee', 'pendant la matinée', 'en debut de matinee', 'en début de matinée',
  'debut de matinee', 'début de matinée', 'en fin de matinee', 'en fin de matinée',
  'fin de matinee', 'fin de matinée', 'milieu de matinee', 'milieu de matinée', 'mid morning', 'late morning',
  // APRÈS-MIDI VARIATIONS
  "en debut d'aprem", "en début d'aprem", "debut d'aprem", "début d'aprem",
  "en debut d'apres-midi", "en début d'après-midi", "debut d'apres-midi", "début d'après-midi", 'early afternoon',
  "en fin d'aprem", "en fin d'apres-midi", "en fin d'après-midi", "fin d'aprem", "fin d'apres-midi", "fin d'après-midi",
  'late afternoon', "milieu d'aprem", "milieu d'apres-midi", "milieu d'après-midi", 'mid afternoon',
  "dans l'aprem", "dans l'apres-midi", "dans l'après-midi", "durant l'aprem", "pendant l'aprem",
  // VERS / AROUND
  'vers midi', 'vers le dej', 'vers le déj', 'vers le dejeuner', 'vers le déjeuner', 'around lunch', 'around noon',
  'vers le diner', 'vers le dîner', 'around dinner', 'vers le petit dej', 'vers le petit déj', 'around breakfast',
  'vers le gouter', 'vers le goûter',
  // FIN DE JOURNÉE
  'fin de journee', 'fin de journée', 'en fin de journee', 'en fin de journée', 'end of day', 'eod',
  'avant la fin de journee', 'avant la fin de journée',
  // SOIRÉE VARIATIONS
  'en debut de soiree', 'en début de soirée', 'debut de soiree', 'début de soirée', 'early evening',
  'en fin de soiree', 'en fin de soirée', 'fin de soiree', 'fin de soirée', 'late evening',
  'dans la soiree', 'dans la soirée', 'durant la soiree', 'durant la soirée', 'pendant la soiree', 'pendant la soirée',
  // NUIT VARIATIONS
  'en pleine nuit', 'pleine nuit', 'au milieu de la nuit', 'milieu de la nuit', 'middle of the night',
  'tard dans la nuit', 'late at night',
  // CRÉPUSCULE
  'crepuscule', 'crépuscule', 'au crepuscule', 'au crépuscule', 'twilight', 'at twilight', 'dusk', 'at dusk',
  // REPAS AVEC PRÉFIXES
  'avant le dej', 'avant le déj', 'avant le dejeuner', 'avant le déjeuner', 'before lunch',
  'apres le dej', 'après le dej', 'après le déj', 'apres le dejeuner', 'après le déjeuner', 'after lunch',
  'avant le diner', 'avant le dîner', 'before dinner', 'apres le diner', 'après le diner', 'après le dîner', 'after dinner',
  'entre midi et deux', 'pendant le dej', 'pendant le déj',
  // SIESTE
  'sieste', 'a la sieste', 'à la sieste', 'apres la sieste', 'après la sieste', 'avant la sieste', 'nap time', 'after nap',
  // AUTRES
  'a la premiere heure', 'à la première heure', 'premiere heure', 'première heure',
  'first thing', 'first thing in the morning', 'des le reveil', 'dès le réveil',
  'au plus tot', 'au plus tôt', 'asap morning',
]);

// French day names + typos
const frenchDayPatterns: Record<string, (date: Date) => Date> = {
  // Lundi + abbreviations
  lundi: nextMonday,
  lunid: nextMonday,
  lundii: nextMonday,
  ludi: nextMonday,
  lun: nextMonday,
  // Mardi + abbreviations
  mardi: nextTuesday,
  madri: nextTuesday,
  mardii: nextTuesday,
  mradi: nextTuesday,
  mar: nextTuesday,
  // Mercredi + abbreviations
  mercredi: nextWednesday,
  mercerdi: nextWednesday,
  mecredi: nextWednesday,
  mercrredi: nextWednesday,
  mercrdei: nextWednesday,
  mer: nextWednesday,
  // Jeudi + abbreviations
  jeudi: nextThursday,
  juedi: nextThursday,
  jeudii: nextThursday,
  jeuidi: nextThursday,
  jeu: nextThursday,
  // Vendredi + abbreviations
  vendredi: nextFriday,
  vendrdei: nextFriday,
  vendreidi: nextFriday,
  vendredii: nextFriday,
  vendrei: nextFriday,
  ven: nextFriday,
  // Samedi (pas d'abréviation "sam" car trop souvent un prénom)
  samedi: nextSaturday,
  samdei: nextSaturday,
  samedii: nextSaturday,
  smedi: nextSaturday,
  // Dimanche + abbreviations
  dimanche: nextSunday,
  diamnche: nextSunday,
  dimanchee: nextSunday,
  dimnache: nextSunday,
  dimance: nextSunday,
  dim: nextSunday,
};

// =============================================================================
// DESCRIPTIVE TIME KEYWORDS
// These keywords set the time BUT are kept in the title because they describe
// the nature of the task (e.g., "dej avec Sarah" → title stays "dej avec Sarah")
// =============================================================================
const descriptiveTimeKeywords: Set<string> = new Set([
  // Repas - ces mots décrivent la nature du RDV, pas juste l'heure
  'dej', 'déj', 'dejeuner', 'déjeuner', 'dejuner', 'déjuner', 'dejeune', 'dejeuener', 'dejeuné',
  'lunch', 'luch', 'lunhc', 'lnuch',
  'breakfast', 'brunch', 'brunhc', 'brnuch', 'bruhcn', 'brunh',
  'diner', 'dîner', 'dinner', 'diiner', 'dinre', 'dner', 'diné', 'dinnre', 'dinener',
  'souper', 'soupé', 'soupper', 'soper', 'supper',
  'gouter', 'goûter', 'goute', 'gouté', 'goutee', 'goutér', 'snack',
  'petit dej', 'petit déj', 'petit dejeuner', 'petit déjeuner', 'ptit dej', 'ptit déj',
  "p'tit dej", "p'tit déj",
  // Pauses et moments qui décrivent un type de RDV
  'cafe', 'café', 'coffee',
  'pause', 'pause cafe', 'pause café', 'coffee break', 'break',
  'tea time', 'tea',
]);

// =============================================================================
// SHORT DAY ABBREVIATIONS (3 letters) - require special context to avoid false positives
// e.g., "sam" could be "Samuel" or "samedi"
// =============================================================================
const shortDayAbbreviations: Set<string> = new Set([
  'lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim',
  'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
]);

// Time keywords (French) + typos
const timeKeywords: Record<string, string> = {
  // ==========================================================================
  // MIDI + typos
  // ==========================================================================
  'midi': '12:00',
  'mdii': '12:00',
  'miid': '12:00',
  'mdi': '12:00',
  'miidi': '12:00',
  'midii': '12:00',
  'a midi': '12:00',
  'à midi': '12:00',
  'pour midi': '12:00',

  // ==========================================================================
  // MINUIT + typos
  // ==========================================================================
  'minuit': '00:00',
  'minui': '00:00',
  'minuiit': '00:00',
  'minut': '00:00',
  'minuitt': '00:00',
  'minuut': '00:00',
  'a minuit': '00:00',
  'à minuit': '00:00',

  // ==========================================================================
  // MATIN / RÉVEIL + typos
  // ==========================================================================
  'matin': '09:00',
  'mat': '09:00',
  'mtin': '09:00',
  'matni': '09:00',
  'matiin': '09:00',
  'matn': '09:00',
  'mattin': '09:00',
  'le matin': '09:00',
  'ce matin': '09:00',
  'au reveil': '07:00',
  'au réveil': '07:00',
  'au reveill': '07:00',
  'au reviel': '07:00',
  'au revel': '07:00',
  'a mon reveil': '07:00',
  'à mon réveil': '07:00',
  'tot le matin': '07:00',
  'tôt le matin': '07:00',
  'tot': '07:00',
  'tôt': '07:00',
  'early': '07:00',
  'early morning': '07:00',

  // ==========================================================================
  // SOIR / NUIT + typos
  // ==========================================================================
  'soir': '18:00',
  'sori': '18:00',
  'soirr': '18:00',
  'soiir': '18:00',
  'soire': '18:00',
  'soiree': '20:00',
  'soirée': '20:00',
  'ce soir': '18:00',
  'le soir': '18:00',
  'en soiree': '20:00',
  'en soirée': '20:00',
  'cette nuit': '23:00',
  'cete nuit': '23:00',
  'cette nui': '23:00',
  'cett nuit': '23:00',
  'la nuit': '23:00',
  'tonight': '20:00',
  'tonite': '20:00',
  'this evening': '18:00',
  'this night': '23:00',
  'late': '22:00',
  'tard': '22:00',
  'tard le soir': '22:00',

  // ==========================================================================
  // APRÈS-MIDI + typos
  // ==========================================================================
  'aprem': '14:00',
  'aprèm': '14:00',
  'apres-midi': '14:00',
  'après-midi': '14:00',
  'apres midi': '14:00',
  'après midi': '14:00',
  'apresmidi': '14:00',
  'aprèsmidi': '14:00',
  'apremd': '14:00',
  'apresm': '14:00',
  'cet aprem': '14:00',
  'cette aprem': '14:00',
  "cet après-midi": '14:00',
  'cet apres-midi': '14:00',
  'cette après-midi': '14:00',
  'afternoon': '14:00',
  'this afternoon': '14:00',

  // ==========================================================================
  // PETIT DÉJEUNER / BREAKFAST + typos
  // ==========================================================================
  'petit dej': '08:00',
  'petit déj': '08:00',
  'petit dejeuner': '08:00',
  'petit déjeuner': '08:00',
  'ptit dej': '08:00',
  'ptit déj': '08:00',
  'p\'tit dej': '08:00',
  'p\'tit déj': '08:00',
  'au petit dej': '08:00',
  'au petit déj': '08:00',
  'pour le petit dej': '08:00',
  'pour le petit déj': '08:00',
  'au petit dejeuner': '08:00',
  'au petit déjeuner': '08:00',
  'pour le petit dejeuner': '08:00',
  'pour le petit déjeuner': '08:00',
  'breakfast': '08:00',
  'for breakfast': '08:00',
  'at breakfast': '08:00',

  // ==========================================================================
  // BRUNCH + typos
  // ==========================================================================
  'brunch': '11:00',
  'brunhc': '11:00',
  'brnuch': '11:00',
  'bruhcn': '11:00',
  'brunh': '11:00',
  'au brunch': '11:00',
  'pour le brunch': '11:00',
  'for brunch': '11:00',
  'at brunch': '11:00',

  // ==========================================================================
  // DÉJEUNER / LUNCH + typos
  // ==========================================================================
  'dej': '12:30',
  'déj': '12:30',
  'dejeuner': '12:30',
  'déjeuner': '12:30',
  'dejuner': '12:30',
  'déjuner': '12:30',
  'dejeune': '12:30',
  'dejeuener': '12:30',
  'dejeuné': '12:30',
  'au dej': '12:30',
  'au déj': '12:30',
  'pour le dej': '12:30',
  'pour le déj': '12:30',
  'a dejeuner': '12:30',
  'à dejeuner': '12:30',
  'a déjeuner': '12:30',
  'à déjeuner': '12:30',
  'au dejeuner': '12:30',
  'au déjeuner': '12:30',
  'pour le dejeuner': '12:30',
  'pour le déjeuner': '12:30',
  'lunch': '12:30',
  'luch': '12:30',
  'lunhc': '12:30',
  'lnuch': '12:30',
  'at lunch': '12:30',
  'for lunch': '12:30',
  'during lunch': '12:30',

  // ==========================================================================
  // GOÛTER / SNACK + typos
  // ==========================================================================
  'gouter': '16:00',
  'goûter': '16:00',
  'goute': '16:00',
  'gouté': '16:00',
  'goutee': '16:00',
  'goutér': '16:00',
  'au gouter': '16:00',
  'au goûter': '16:00',
  'pour le gouter': '16:00',
  'pour le goûter': '16:00',
  'snack': '16:00',
  'snack time': '16:00',
  'tea time': '16:00',
  'quatre heures': '16:00',
  '4 heures': '16:00',

  // ==========================================================================
  // DÎNER / DINNER + typos
  // ==========================================================================
  'diner': '19:30',
  'dîner': '19:30',
  'dinner': '19:30',
  'diiner': '19:30',
  'dinre': '19:30',
  'dner': '19:30',
  'diné': '19:30',
  'au diner': '19:30',
  'au dîner': '19:30',
  'pour le diner': '19:30',
  'pour le dîner': '19:30',
  'a diner': '19:30',
  'à dîner': '19:30',
  'dinnre': '19:30',
  'dinener': '19:30',
  'at dinner': '19:30',
  'for dinner': '19:30',

  // ==========================================================================
  // SOUPER / SUPPER + typos
  // ==========================================================================
  'souper': '20:00',
  'soupé': '20:00',
  'soupe': '20:00',
  'soupper': '20:00',
  'soper': '20:00',
  'au souper': '20:00',
  'pour le souper': '20:00',
  'supper': '20:00',
  'supper time': '20:00',

  // ==========================================================================
  // COUCHER / BEDTIME + typos
  // ==========================================================================
  'coucher': '22:00',
  'couche': '22:00',
  'couchée': '22:00',
  'couchee': '22:00',
  'couchér': '22:00',
  'couché': '22:00',
  'au coucher': '22:00',
  'avant de dormir': '22:00',
  'avant dormir': '22:00',
  'avant dodo': '22:00',
  'au lit': '22:00',
  'bedtime': '22:00',
  'bed time': '22:00',
  'before bed': '22:00',
  'before sleep': '22:00',

  // ==========================================================================
  // LEVER / COUCHER DE SOLEIL + typos
  // ==========================================================================
  'lever de soleil': '06:30',
  'levée de soleil': '06:30',
  'levee de soleil': '06:30',
  'lever du soleil': '06:30',
  'levée du soleil': '06:30',
  'levee du soleil': '06:30',
  'au lever du soleil': '06:30',
  'lever soleil': '06:30',
  'levé de soleil': '06:30',
  'leve de soleil': '06:30',
  'sunrise': '06:30',
  'sun rise': '06:30',
  'at sunrise': '06:30',
  'coucher de soleil': '18:30',
  'couchée de soleil': '18:30',
  'couchee de soleil': '18:30',
  'coucher du soleil': '18:30',
  'couchée du soleil': '18:30',
  'couchee du soleil': '18:30',
  'au coucher du soleil': '18:30',
  'coucher soleil': '18:30',
  'sunset': '18:30',
  'sun set': '18:30',
  'at sunset': '18:30',

  // ==========================================================================
  // PAUSE / BREAK + typos
  // ==========================================================================
  'pause': '10:30',
  'pause cafe': '10:30',
  'pause café': '10:30',
  'coffee break': '10:30',
  'break': '10:30',

  // ==========================================================================
  // AUBE / DAWN + typos
  // ==========================================================================
  'aube': '05:30',
  'à l\'aube': '05:30',
  'a l\'aube': '05:30',
  'aux aurores': '05:30',
  'aurore': '05:30',
  'à l\'aurore': '05:30',
  'dawn': '05:30',
  'at dawn': '05:30',

  // ==========================================================================
  // MATINÉE / MORNING VARIATIONS + typos
  // ==========================================================================
  'dans la matinee': '10:00',
  'dans la matinée': '10:00',
  'en matinee': '10:00',
  'en matinée': '10:00',
  'durant la matinee': '10:00',
  'durant la matinée': '10:00',
  'pendant la matinee': '10:00',
  'pendant la matinée': '10:00',
  'en debut de matinee': '08:00',
  'en début de matinée': '08:00',
  'debut de matinee': '08:00',
  'début de matinée': '08:00',
  'en fin de matinee': '11:00',
  'en fin de matinée': '11:00',
  'fin de matinee': '11:00',
  'fin de matinée': '11:00',
  'milieu de matinee': '10:00',
  'milieu de matinée': '10:00',
  'mid morning': '10:00',
  'late morning': '11:00',

  // ==========================================================================
  // APRÈS-MIDI VARIATIONS + typos
  // ==========================================================================
  'en debut d\'aprem': '13:00',
  'en début d\'aprem': '13:00',
  'debut d\'aprem': '13:00',
  'début d\'aprem': '13:00',
  'en debut d\'apres-midi': '13:00',
  'en début d\'après-midi': '13:00',
  'debut d\'apres-midi': '13:00',
  'début d\'après-midi': '13:00',
  'early afternoon': '13:00',
  'en fin d\'aprem': '17:00',
  'en fin d\'apres-midi': '17:00',
  'en fin d\'après-midi': '17:00',
  'fin d\'aprem': '17:00',
  'fin d\'apres-midi': '17:00',
  'fin d\'après-midi': '17:00',
  'late afternoon': '17:00',
  'milieu d\'aprem': '15:00',
  'milieu d\'apres-midi': '15:00',
  'milieu d\'après-midi': '15:00',
  'mid afternoon': '15:00',
  'dans l\'aprem': '14:00',
  'dans l\'apres-midi': '14:00',
  'dans l\'après-midi': '14:00',
  'durant l\'aprem': '14:00',
  'pendant l\'aprem': '14:00',

  // ==========================================================================
  // VERS / AROUND + repas
  // ==========================================================================
  'vers midi': '12:00',
  'vers le dej': '12:30',
  'vers le déj': '12:30',
  'vers le dejeuner': '12:30',
  'vers le déjeuner': '12:30',
  'around lunch': '12:30',
  'around noon': '12:00',
  'vers le diner': '19:30',
  'vers le dîner': '19:30',
  'around dinner': '19:30',
  'vers le petit dej': '08:00',
  'vers le petit déj': '08:00',
  'around breakfast': '08:00',
  'vers le gouter': '16:00',
  'vers le goûter': '16:00',

  // ==========================================================================
  // FIN DE JOURNÉE / END OF DAY
  // ==========================================================================
  'fin de journee': '17:00',
  'fin de journée': '17:00',
  'en fin de journee': '17:00',
  'en fin de journée': '17:00',
  'end of day': '17:00',
  'eod': '17:00',
  'avant la fin de journee': '17:00',
  'avant la fin de journée': '17:00',

  // ==========================================================================
  // SOIRÉE VARIATIONS
  // ==========================================================================
  'en debut de soiree': '18:00',
  'en début de soirée': '18:00',
  'debut de soiree': '18:00',
  'début de soirée': '18:00',
  'early evening': '18:00',
  'en fin de soiree': '22:00',
  'en fin de soirée': '22:00',
  'fin de soiree': '22:00',
  'fin de soirée': '22:00',
  'late evening': '22:00',
  'dans la soiree': '20:00',
  'dans la soirée': '20:00',
  'durant la soiree': '20:00',
  'durant la soirée': '20:00',
  'pendant la soiree': '20:00',
  'pendant la soirée': '20:00',

  // ==========================================================================
  // NUIT VARIATIONS
  // ==========================================================================
  'en pleine nuit': '02:00',
  'pleine nuit': '02:00',
  'au milieu de la nuit': '02:00',
  'milieu de la nuit': '02:00',
  'middle of the night': '02:00',
  'tard dans la nuit': '01:00',
  'late at night': '01:00',

  // ==========================================================================
  // CRÉPUSCULE / TWILIGHT
  // ==========================================================================
  'crepuscule': '18:30',
  'crépuscule': '18:30',
  'au crepuscule': '18:30',
  'au crépuscule': '18:30',
  'twilight': '18:30',
  'at twilight': '18:30',
  'dusk': '18:30',
  'at dusk': '18:30',

  // ==========================================================================
  // REPAS AVEC PRÉFIXES
  // ==========================================================================
  'avant le dej': '11:30',
  'avant le déj': '11:30',
  'avant le dejeuner': '11:30',
  'avant le déjeuner': '11:30',
  'before lunch': '11:30',
  'apres le dej': '13:30',
  'après le dej': '13:30',
  'après le déj': '13:30',
  'apres le dejeuner': '13:30',
  'après le déjeuner': '13:30',
  'after lunch': '13:30',
  'avant le diner': '18:30',
  'avant le dîner': '18:30',
  'before dinner': '18:30',
  'apres le diner': '21:00',
  'après le diner': '21:00',
  'après le dîner': '21:00',
  'after dinner': '21:00',
  'entre midi et deux': '13:00',
  'pendant le dej': '12:30',
  'pendant le déj': '12:30',

  // ==========================================================================
  // SIESTE / NAP
  // ==========================================================================
  'sieste': '14:00',
  'a la sieste': '14:00',
  'à la sieste': '14:00',
  'apres la sieste': '15:30',
  'après la sieste': '15:30',
  'avant la sieste': '13:00',
  'nap time': '14:00',
  'after nap': '15:30',

  // ==========================================================================
  // AUTRES / MISCELLANEOUS
  // ==========================================================================
  'a la premiere heure': '07:00',
  'à la première heure': '07:00',
  'premiere heure': '07:00',
  'première heure': '07:00',
  'first thing': '07:00',
  'first thing in the morning': '07:00',
  'des le reveil': '07:00',
  'dès le réveil': '07:00',
  'au plus tot': '07:00',
  'au plus tôt': '07:00',
  'asap morning': '07:00',
};

// Priority keywords (returns PriorityLevel)
// 0 = low, 1 = normal, 2 = high, 3 = urgent
// IMPORTANT: Order matters! Multi-word patterns (like "pas urgent") must come BEFORE
// single-word patterns (like "urgent") to avoid partial matches
const priorityPatterns: { pattern: RegExp; level: PriorityLevel }[] = [
  // Low (0) - MUST BE FIRST to catch "pas urgent" before "urgent" matches
  {
    pattern: /\b(pas\s+urgent|pas\s+urgente|pas\s+urgnt|pas\s+urgen|pas\s+pressé|pas\s+presse|pas\s+pressee|pas\s+press|basse\s+priorité|basse\s+priorite|basse\s+priorit|basse\s+prio|quand\s+possible|quand\s+posible|quand\s+possble|quand\s+possinle|quand\s+tu\s+peux|quand\s+tu\s+px|si\s+possible|si\s+posible|si\s+possble|si\s+possinle|si\s+possibel|low\s+priority|low\s+prio|not\s+urgent|optionnel|optionnelle|optionel|optionell|optinonel|optional|when\s+possible|when\s+you\s+can|no\s+rush|tranquille|tranquile|tranquil|sans\s+pression|pas\s+prioritaire|pas\s+prio)\b/i,
    level: 0
  },
  // Urgent (3) - FR + EN + typos
  {
    pattern: /\b(très\s+urgent|tres\s+urgent|tres\s+urgnt|trés\s+urgent|super\s+urgent|ultra\s+urgent|vraiment\s+urgent|vraiement\s+urgent|urgent|urgente|urgnt|urgen|urgant|urgnet|urgten|urgn|uregnt|urgetn|urggent|ugent|urgenet|asap|a\.s\.a\.p|critical|criticl|critica|critcal|critique|critque|critiqu|critiqeu|critik)\b/i,
    level: 3
  },
  // High (2) - FR + EN + typos
  {
    pattern: /\b(haute\s+priorité|haute\s+priorite|haute\s+priorit|haute\s+prio|high\s+priority|high\s+prio|très\s+important|tres\s+important|trés\s+important|vraiment\s+important|important|importante|importnt|importan|improtant|importnat|impotant|importnant|imprtant|ipmortant|imporant|importat|priority|priorité|priorite|priorit|prioirté|prioirite|priorty|priotity|prio|high)\b/i,
    level: 2
  },
];

// Helper to get next occurrence of a day (or the week after if today)
function getNextDayOccurrence(dayIndex: number, weeksAhead: number = 0): Date {
  const today = new Date();
  const currentDay = getDay(today);
  let daysToAdd = dayIndex - currentDay;
  if (daysToAdd <= 0) daysToAdd += 7; // Next week if today or past
  return addDays(today, daysToAdd + (weeksAhead * 7));
}

// Helper to parse number (digit or word)
function parseNumber(str: string): number | null {
  // Try digit first
  const digit = parseInt(str);
  if (!isNaN(digit)) return digit;
  // Try word
  const lower = str.toLowerCase();
  return numbersMap[lower] ?? null;
}

export function parseTaskInput(input: string): ParsedTask {
  const lowerInput = input.toLowerCase().trim();
  let title = input;
  let date: Date | null = null;
  let time: string | null = null;
  let priority: PriorityLevel | null = null;

  // Parse priority keywords first
  for (const { pattern, level } of priorityPatterns) {
    if (pattern.test(lowerInput)) {
      priority = level;
      title = title.replace(pattern, '').trim();
      break;
    }
  }

  // Parse EXPLICIT time format FIRST (21h, 14h30, etc.) - takes priority over keywords
  // Simple regex to match French time format: captures hours and optional minutes
  const frenchTimeRegex = /(\d{1,2})h(\d{2})?\b/i;
  const frenchTimeMatch = lowerInput.match(frenchTimeRegex);
  let explicitTimeFound = false;

  if (frenchTimeMatch) {
    const hours = parseInt(frenchTimeMatch[1]);
    const minutes = frenchTimeMatch[2] ? parseInt(frenchTimeMatch[2]) : 0;

    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      // Remove the time pattern and clean up "a" or "à" prefix if present
      title = title.replace(/\s+[àa]\s*\d{1,2}h\d{0,2}\b/i, '').trim();
      title = title.replace(/\s*\d{1,2}h\d{0,2}\b/i, '').trim();
      explicitTimeFound = true;
    }
  }

  // Parse time keywords ONLY if no explicit time was found
  if (!time) {
    // Sort by length descending to match longer patterns first (e.g., "petit dej" before "dej")
    const sortedTimeKeywords = Object.entries(timeKeywords).sort((a, b) => b[0].length - a[0].length);
    for (const [keyword, timeValue] of sortedTimeKeywords) {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lowerInput)) {
        time = timeValue;
        // ONLY remove from title if it's NOT a descriptive keyword
        // Descriptive keywords (dej, lunch, dinner, etc.) describe the nature of the task
        // and should remain in the title
        const isDescriptive = descriptiveTimeKeywords.has(keyword.toLowerCase());
        if (!isDescriptive) {
          title = title.replace(regex, '').trim();
        }
        break;
      }
    }
  }

  // ==========================================================================
  // DATE PARSING - Order matters! Most specific patterns first
  // ==========================================================================

  // 1. "jour prochain" / "jour pro" / "next jour" / "ce jour"
  if (!date) {
    const dayNames = Object.keys(dayIndexMap).join('|');
    const dayProchainRegex = new RegExp(`\\b(${dayNames})\\s+(prochain|prochaine|pro|proch|prochian)\\b`, 'i');
    const nextDayRegex = new RegExp(`\\bnext\\s+(${dayNames})\\b`, 'i');
    const ceDayRegex = new RegExp(`\\b(ce|this)\\s+(${dayNames})\\b`, 'i');

    let match = lowerInput.match(dayProchainRegex);
    if (match) {
      const dayIndex = dayIndexMap[match[1].toLowerCase()];
      if (dayIndex !== undefined) {
        date = getNextDayOccurrence(dayIndex);
        title = title.replace(dayProchainRegex, '').trim();
      }
    }

    if (!date) {
      match = lowerInput.match(nextDayRegex);
      if (match) {
        const dayIndex = dayIndexMap[match[1].toLowerCase()];
        if (dayIndex !== undefined) {
          date = getNextDayOccurrence(dayIndex);
          title = title.replace(nextDayRegex, '').trim();
        }
      }
    }

    if (!date) {
      match = lowerInput.match(ceDayRegex);
      if (match) {
        const dayIndex = dayIndexMap[match[2].toLowerCase()];
        if (dayIndex !== undefined) {
          // "ce lundi" = this week's monday (could be past if today is later)
          const today = new Date();
          const currentDay = getDay(today);
          let daysToAdd = dayIndex - currentDay;
          if (daysToAdd < 0) daysToAdd += 7;
          date = addDays(today, daysToAdd);
          title = title.replace(ceDayRegex, '').trim();
        }
      }
    }
  }

  // 2. "jour de la semaine prochaine" / "jour sem pro"
  if (!date) {
    const dayNames = Object.keys(dayIndexMap).join('|');
    const dayDeLaSemProRegex = new RegExp(`\\b(${dayNames})\\s+(?:de\\s+)?(?:la\\s+)?(?:sem(?:aine)?\\s+)?(?:pro(?:chain(?:e)?)?|proch)\\b`, 'i');

    const match = lowerInput.match(dayDeLaSemProRegex);
    if (match) {
      const dayIndex = dayIndexMap[match[1].toLowerCase()];
      if (dayIndex !== undefined) {
        date = getNextDayOccurrence(dayIndex, 1); // +1 week
        title = title.replace(dayDeLaSemProRegex, '').trim();
      }
    }
  }

  // 3. "jour en 8" / "jour en 15" (French: in 1 or 2 weeks)
  if (!date) {
    const dayNames = Object.keys(dayIndexMap).join('|');
    const dayEn8Regex = new RegExp(`\\b(${dayNames})\\s+en\\s+(8|15|huit|quinze)\\b`, 'i');

    const match = lowerInput.match(dayEn8Regex);
    if (match) {
      const dayIndex = dayIndexMap[match[1].toLowerCase()];
      const weeksNum = match[2];
      if (dayIndex !== undefined) {
        const weeks = (weeksNum === '8' || weeksNum === 'huit') ? 1 : 2;
        date = getNextDayOccurrence(dayIndex, weeks);
        title = title.replace(dayEn8Regex, '').trim();
      }
    }
  }

  // 4. "jour dans X jours/semaines" (e.g., "lundi dans 15j", "mardi dans deux semaines")
  if (!date) {
    const dayNames = Object.keys(dayIndexMap).join('|');
    const numberWords = Object.keys(numbersMap).join('|');
    const dayDansRegex = new RegExp(`\\b(${dayNames})\\s+(?:dans|ds|in)\\s+(\\d+|${numberWords})\\s*([js]|jours?|semaines?|weeks?)\\b`, 'i');

    const match = lowerInput.match(dayDansRegex);
    if (match) {
      const dayIndex = dayIndexMap[match[1].toLowerCase()];
      const num = parseNumber(match[2]);
      const unit = match[3].toLowerCase();

      if (dayIndex !== undefined && num !== null) {
        const isWeeks = unit.startsWith('s') || unit.startsWith('sem') || unit.startsWith('week');
        const daysToAdd = isWeeks ? num * 7 : num;
        date = addDays(getNextDayOccurrence(dayIndex), daysToAdd);
        title = title.replace(dayDansRegex, '').trim();
      }
    }
  }

  // 5. Relative patterns (weekend, mois prochain, demain, etc.)
  if (!date) {
    // Sort by length descending to match longer patterns first
    const sortedPatterns = Object.entries(relativePatterns).sort((a, b) => b[0].length - a[0].length);
    for (const [pattern, getDate] of sortedPatterns) {
      if (lowerInput.includes(pattern)) {
        date = getDate();
        title = title.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').trim();
        break;
      }
    }
  }

  // 6. Abbreviated time: "dans Xj", "ds Xj", "+Xj", "dans Xs", "+Xs"
  if (!date) {
    const numberWords = Object.keys(numbersMap).join('|');
    // "dans 2j", "ds 3j", "dans 2s", "ds 3s"
    const dansAbbrevRegex = new RegExp(`\\b(?:dans|ds)\\s*(\\d+|${numberWords})\\s*([js])\\b`, 'i');
    // "+2j", "+3s", "j+2"
    const plusAbbrevRegex = /(?:\+\s*(\d+)\s*([js])\b|\b([js])\s*\+\s*(\d+))/i;

    let match = lowerInput.match(dansAbbrevRegex);
    if (match) {
      const num = parseNumber(match[1]);
      const unit = match[2].toLowerCase();
      if (num !== null) {
        date = unit === 's' ? addWeeks(new Date(), num) : addDays(new Date(), num);
        title = title.replace(dansAbbrevRegex, '').trim();
      }
    }

    if (!date) {
      match = lowerInput.match(plusAbbrevRegex);
      if (match) {
        const num = parseInt(match[1] || match[4]);
        const unit = (match[2] || match[3]).toLowerCase();
        if (!isNaN(num)) {
          date = unit === 's' ? addWeeks(new Date(), num) : addDays(new Date(), num);
          title = title.replace(plusAbbrevRegex, '').trim();
        }
      }
    }
  }

  // 7. "dans X jours/semaines" with numbers (digit or word)
  if (!date) {
    const numberWords = Object.keys(numbersMap).join('|');
    const dansDaysRegex = new RegExp(`\\b(?:dans|ds|in)\\s+(\\d+|${numberWords})\\s*(jours?|jour|days?|day)\\b`, 'i');
    const dansWeeksRegex = new RegExp(`\\b(?:dans|ds|in)\\s+(\\d+|${numberWords})\\s*(semaines?|semaine|weeks?|week)\\b`, 'i');

    let match = lowerInput.match(dansDaysRegex);
    if (match) {
      const num = parseNumber(match[1]);
      if (num !== null) {
        date = addDays(new Date(), num);
        title = title.replace(dansDaysRegex, '').trim();
      }
    }

    if (!date) {
      match = lowerInput.match(dansWeeksRegex);
      if (match) {
        const num = parseNumber(match[1]);
        if (num !== null) {
          date = addWeeks(new Date(), num);
          title = title.replace(dansWeeksRegex, '').trim();
        }
      }
    }
  }

  // 8. Date formats: "22/01", "22-01", "22.01" (European DD/MM)
  if (!date) {
    const euroDateRegex = /\b(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?\b/;
    const match = lowerInput.match(euroDateRegex);
    if (match) {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]) - 1; // 0-indexed
      const year = match[3] ? parseInt(match[3].length === 2 ? '20' + match[3] : match[3]) : new Date().getFullYear();

      if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
        const parsedDate = new Date(year, month, day);
        if (isValid(parsedDate)) {
          date = parsedDate;
          title = title.replace(euroDateRegex, '').trim();
        }
      }
    }
  }

  // 9. "le 22" (day of current/next month)
  if (!date) {
    const leJourRegex = /\ble\s+(\d{1,2})\b/i;
    const match = lowerInput.match(leJourRegex);
    if (match) {
      const day = parseInt(match[1]);
      if (day >= 1 && day <= 31) {
        const today = new Date();
        let targetDate = new Date(today.getFullYear(), today.getMonth(), day);
        // If the day has passed this month, use next month
        if (targetDate < today) {
          targetDate = addMonths(targetDate, 1);
        }
        if (isValid(targetDate)) {
          date = targetDate;
          title = title.replace(leJourRegex, '').trim();
        }
      }
    }
  }

  // 10. "22 janvier", "22 jan" (day + month FR/EN)
  if (!date) {
    const monthNames = Object.keys(monthsMap).join('|');
    const dayMonthRegex = new RegExp(`\\b(\\d{1,2})\\s+(${monthNames})(?:\\s+(\\d{2,4}))?\\b`, 'i');
    const match = lowerInput.match(dayMonthRegex);
    if (match) {
      const day = parseInt(match[1]);
      const monthName = match[2].toLowerCase();
      const month = monthsMap[monthName];
      const year = match[3] ? parseInt(match[3].length === 2 ? '20' + match[3] : match[3]) : new Date().getFullYear();

      if (day >= 1 && day <= 31 && month !== undefined) {
        const parsedDate = new Date(year, month, day);
        if (isValid(parsedDate)) {
          date = parsedDate;
          title = title.replace(dayMonthRegex, '').trim();
        }
      }
    }
  }

  // 11. "janvier 22", "jan 22" (month + day EN style)
  if (!date) {
    const monthNames = Object.keys(monthsMap).join('|');
    const monthDayRegex = new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(?:\\s+(\\d{2,4}))?\\b`, 'i');
    const match = lowerInput.match(monthDayRegex);
    if (match) {
      const monthName = match[1].toLowerCase();
      const day = parseInt(match[2]);
      const month = monthsMap[monthName];
      const year = match[3] ? parseInt(match[3].length === 2 ? '20' + match[3] : match[3]) : new Date().getFullYear();

      if (day >= 1 && day <= 31 && month !== undefined) {
        const parsedDate = new Date(year, month, day);
        if (isValid(parsedDate)) {
          date = parsedDate;
          title = title.replace(monthDayRegex, '').trim();
        }
      }
    }
  }

  // 12. Simple day names (fallback)
  // For short abbreviations (3 letters like "sam", "lun"), we need to be careful
  // because they could be names (Samuel, Martin, etc.)
  // Only recognize short abbreviations if:
  // - They are at the START of the input, OR
  // - They are followed by another temporal indicator (matin, soir, etc.), OR
  // - The input is very short (likely just a day reference)
  if (!date) {
    // Helper to check if a short day abbreviation should be recognized
    const shouldRecognizeShortDay = (pattern: string, input: string): boolean => {
      if (!shortDayAbbreviations.has(pattern.toLowerCase())) {
        return true; // Not a short abbreviation, always recognize
      }

      const patternRegex = new RegExp(`\\b${pattern}\\b`, 'i');
      const match = input.match(patternRegex);
      if (!match) return false;

      const matchIndex = match.index ?? 0;
      const afterMatch = input.slice(matchIndex + pattern.length).trim().toLowerCase();
      const beforeMatch = input.slice(0, matchIndex).trim();

      // Check if there's already another temporal indicator in the input
      // If yes, this short abbreviation is probably a name, not a day
      const otherTemporalIndicators = [
        /\b(demain|aujourd'?hui|ajd|tomorrow|today)\b/i,
        /\b(matin|mat|soir|aprem|après-midi|midi)\b/i,
        /\bfin\s+d[e']?\s*aprem/i,
        /\bfin\s+d[e']?\s*après-midi/i,
        /\b(semaine prochaine|mois prochain|next week)\b/i,
        /\b(ce soir|ce matin|this morning|this evening|tonight)\b/i,
      ];

      const testInput = input.replace(patternRegex, ''); // Remove the potential day to test
      const hasOtherTemporal = otherTemporalIndicators.some(regex => regex.test(testInput));

      // If there's another temporal indicator, this is probably a name, not a day
      // Exception: if followed DIRECTLY by a temporal modifier (sam matin, sam soir)
      if (hasOtherTemporal) {
        const directTemporalFollower = /^(matin|mat|soir|aprem|après-midi|midi|prochain|pro|en\s*8|en\s*15)/i;
        if (directTemporalFollower.test(afterMatch)) {
          return true; // "sam matin" → sam = samedi
        }
        return false; // "sam en fin d'aprem" → sam = probably a name
      }

      // Recognize if followed DIRECTLY by temporal modifiers (e.g., "sam matin")
      const temporalFollowers = /^(matin|mat|soir|aprem|après-midi|midi|prochain|pro|en\s*8|en\s*15)/i;
      if (temporalFollowers.test(afterMatch)) return true;

      // Recognize ONLY if at the very start of input (no significant words before)
      // This prevents "appeler Sam" from recognizing Sam as Saturday
      const isAtVeryStart = beforeMatch.length === 0 || /^(le|ce|this|next|pour)$/i.test(beforeMatch);
      if (!isAtVeryStart) return false; // "appeler Sam" → Sam is a name

      // At start and no other temporal indicators: recognize as day
      return true;
    };

    for (const [pattern, getNextDay] of Object.entries(dayPatterns)) {
      if (!shouldRecognizeShortDay(pattern, lowerInput)) continue;

      const regex = new RegExp(`\\b${pattern}\\b`, 'i');
      if (regex.test(lowerInput)) {
        date = getNextDay(new Date());
        title = title.replace(regex, '').trim();
        break;
      }
    }
  }

  if (!date) {
    // Same helper logic for French patterns (reusing the same algorithm)
    const shouldRecognizeShortDayFr = (pattern: string, input: string): boolean => {
      if (!shortDayAbbreviations.has(pattern.toLowerCase())) {
        return true;
      }

      const patternRegex = new RegExp(`\\b${pattern}\\b`, 'i');
      const match = input.match(patternRegex);
      if (!match) return false;

      const matchIndex = match.index ?? 0;
      const afterMatch = input.slice(matchIndex + pattern.length).trim().toLowerCase();
      const beforeMatch = input.slice(0, matchIndex).trim();

      const otherTemporalIndicators = [
        /\b(demain|aujourd'?hui|ajd|tomorrow|today)\b/i,
        /\b(matin|mat|soir|aprem|après-midi|midi)\b/i,
        /\bfin\s+d[e']?\s*aprem/i,
        /\bfin\s+d[e']?\s*après-midi/i,
        /\b(semaine prochaine|mois prochain|next week)\b/i,
        /\b(ce soir|ce matin|this morning|this evening|tonight)\b/i,
      ];

      const testInput = input.replace(patternRegex, '');
      const hasOtherTemporal = otherTemporalIndicators.some(regex => regex.test(testInput));

      if (hasOtherTemporal) {
        const directTemporalFollower = /^(matin|mat|soir|aprem|après-midi|midi|prochain|pro|en\s*8|en\s*15)/i;
        if (directTemporalFollower.test(afterMatch)) {
          return true;
        }
        return false;
      }

      const temporalFollowers = /^(matin|mat|soir|aprem|après-midi|midi|prochain|pro|en\s*8|en\s*15)/i;
      if (temporalFollowers.test(afterMatch)) return true;

      const isAtVeryStart = beforeMatch.length === 0 || /^(le|ce|this|next|pour)$/i.test(beforeMatch);
      if (!isAtVeryStart) return false;

      return true;
    };

    for (const [pattern, getNextDay] of Object.entries(frenchDayPatterns)) {
      if (!shouldRecognizeShortDayFr(pattern, lowerInput)) continue;

      const regex = new RegExp(`\\b${pattern}\\b`, 'i');
      if (regex.test(lowerInput)) {
        date = getNextDay(new Date());
        title = title.replace(regex, '').trim();
        break;
      }
    }
  }

  // 13. If a time was found but NO date keyword, default to today
  // This handles cases like "au dej call" → today at 12:30
  // Also handles explicit time like "x a 10h" → today at 10:00
  // But "demain au dej call" → tomorrow at 12:30 (date already set from "demain")
  if (!date && time) {
    // If an explicit time format was used (like "10h", "14h30"), always default to today
    if (explicitTimeFound) {
      date = new Date(); // Today
    } else {
      // Check if input contained a time-only keyword (like "midi", "soir", etc.)
      const sortedTimeKeywords = Array.from(timeOnlyKeywords).sort((a, b) => b.length - a.length);
      for (const keyword of sortedTimeKeywords) {
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(lowerInput)) {
          date = new Date(); // Today
          break;
        }
      }
    }
  }

  // Clean up the title
  title = title.replace(/\s+/g, ' ').trim();
  // Remove trailing/leading punctuation
  title = title.replace(/^[,.\-\s]+|[,.\-\s]+$/g, '').trim();

  return { title, date, time, priority };
}

/**
 * Find matching labels based on task title content
 * Uses strict matching to avoid false positives
 */
export function findMatchingLabels(title: string, labels: Label[]): Label[] {
  if (!labels.length) return [];

  const lowerTitle = title.toLowerCase();
  const matchedLabels: Label[] = [];

  for (const label of labels) {
    const labelName = label.name.toLowerCase();

    // Direct match - full label name appears in title
    if (lowerTitle.includes(labelName)) {
      matchedLabels.push(label);
      continue;
    }

    // Split label name by common separators and check each word
    // Only consider words with 3+ characters to avoid matching short words like "a", "de", etc.
    const labelWords = labelName.split(/[\s\-_\/]+/).filter(w => w.length > 2);
    // Only consider title words with 3+ characters for matching
    const titleWords = lowerTitle.split(/[\s\-_\/]+/).filter(w => w.length > 2);

    // Check if all significant label words appear as significant title words
    // Use exact word match or require substantial overlap (not just containing a single letter)
    const allWordsMatch = labelWords.length > 0 && labelWords.every(labelWord =>
      titleWords.some(titleWord =>
        // Exact match
        titleWord === labelWord ||
        // titleWord contains labelWord (labelWord is substring of titleWord)
        (labelWord.length >= 3 && titleWord.includes(labelWord)) ||
        // labelWord contains titleWord (titleWord is substring of labelWord) - only if titleWord is substantial
        (titleWord.length >= 4 && labelWord.includes(titleWord))
      )
    );

    if (allWordsMatch) {
      matchedLabels.push(label);
    }
  }

  return matchedLabels;
}

export function formatDoDate(dateStr: string | null): string {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = addDays(today, 1);
  const taskDate = new Date(date);
  taskDate.setHours(0, 0, 0, 0);

  if (taskDate.getTime() === today.getTime()) {
    return 'Today';
  }

  if (taskDate.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  }

  const diffDays = Math.ceil(
    (taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    return `${Math.abs(diffDays)} days overdue`;
  }

  if (diffDays <= 7) {
    return format(date, 'EEEE'); // Day name
  }

  return format(date, 'MMM d');
}

export function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const taskDate = new Date(dateStr);
  taskDate.setHours(0, 0, 0, 0);

  return taskDate < today;
}
