import {
  addDays,
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  nextSaturday,
  nextSunday,
  format,
  parse,
  isValid,
} from 'date-fns';

interface ParsedTask {
  title: string;
  date: Date | null;
  time: string | null;
}

const dayPatterns: Record<string, (date: Date) => Date> = {
  monday: nextMonday,
  mon: nextMonday,
  tuesday: nextTuesday,
  tue: nextTuesday,
  tues: nextTuesday,
  wednesday: nextWednesday,
  wed: nextWednesday,
  thursday: nextThursday,
  thu: nextThursday,
  thur: nextThursday,
  thurs: nextThursday,
  friday: nextFriday,
  fri: nextFriday,
  saturday: nextSaturday,
  sat: nextSaturday,
  sunday: nextSunday,
  sun: nextSunday,
};

const relativePatterns: Record<string, () => Date> = {
  // English
  today: () => new Date(),
  tomorrow: () => addDays(new Date(), 1),
  tommorow: () => addDays(new Date(), 1), // common typo
  tomorow: () => addDays(new Date(), 1), // common typo
  'next week': () => addDays(new Date(), 7),
  // French
  "aujourd'hui": () => new Date(),
  'aujourdhui': () => new Date(),
  'aujoudhui': () => new Date(), // typo
  'demain': () => addDays(new Date(), 1),
  'demian': () => addDays(new Date(), 1), // typo
  'demaain': () => addDays(new Date(), 1), // typo
  'dmain': () => addDays(new Date(), 1), // typo
  'apres-demain': () => addDays(new Date(), 2),
  'après-demain': () => addDays(new Date(), 2),
  'apres demain': () => addDays(new Date(), 2),
  'après demain': () => addDays(new Date(), 2),
  'la semaine prochaine': () => addDays(new Date(), 7),
  'semaine prochaine': () => addDays(new Date(), 7),
};

// French day names
const frenchDayPatterns: Record<string, (date: Date) => Date> = {
  lundi: nextMonday,
  mardi: nextTuesday,
  mercredi: nextWednesday,
  jeudi: nextThursday,
  vendredi: nextFriday,
  samedi: nextSaturday,
  dimanche: nextSunday,
};

export function parseTaskInput(input: string): ParsedTask {
  const lowerInput = input.toLowerCase().trim();
  let title = input;
  let date: Date | null = null;
  let time: string | null = null;

  // Parse time first (format 24h: 14h30, 9h, 18h15, à 14h, at 2pm)
  // French format: 14h30, 9h, 18h15
  const frenchTimeRegex = /(?:à\s*)?(\d{1,2})h(\d{2})?\b/i;
  const frenchTimeMatch = lowerInput.match(frenchTimeRegex);

  if (frenchTimeMatch) {
    const hours = parseInt(frenchTimeMatch[1]);
    const minutes = frenchTimeMatch[2] ? parseInt(frenchTimeMatch[2]) : 0;

    // Validate hours and minutes
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      title = title.replace(new RegExp(frenchTimeRegex.source, 'i'), '').trim();
    }
  }

  // Check for relative dates (both English and French)
  for (const [pattern, getDate] of Object.entries(relativePatterns)) {
    if (lowerInput.includes(pattern)) {
      date = getDate();
      title = title.replace(new RegExp(pattern, 'i'), '').trim();
      break;
    }
  }

  // Check for English day names
  if (!date) {
    for (const [pattern, getNextDay] of Object.entries(dayPatterns)) {
      const regex = new RegExp(`\\b${pattern}\\b`, 'i');
      if (regex.test(lowerInput)) {
        date = getNextDay(new Date());
        title = title.replace(regex, '').trim();
        break;
      }
    }
  }

  // Check for French day names
  if (!date) {
    for (const [pattern, getNextDay] of Object.entries(frenchDayPatterns)) {
      const regex = new RegExp(`\\b${pattern}\\b`, 'i');
      if (regex.test(lowerInput)) {
        date = getNextDay(new Date());
        title = title.replace(regex, '').trim();
        break;
      }
    }
  }

  // Check for date formats like "Jan 15", "1/15", "15/1"
  if (!date) {
    // Match patterns like "Jan 15" or "January 15"
    const monthDayRegex =
      /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})\b/i;
    const monthDayMatch = lowerInput.match(monthDayRegex);

    if (monthDayMatch) {
      const dateStr = `${monthDayMatch[1]} ${monthDayMatch[2]}`;
      const parsedDate = parse(dateStr, 'MMM d', new Date());
      if (isValid(parsedDate)) {
        date = parsedDate;
        title = title.replace(monthDayRegex, '').trim();
      }
    }
  }

  // Check for patterns like "in 3 days" or "in 2 weeks" (English)
  if (!date) {
    const inDaysRegex = /\bin\s+(\d+)\s+(day|days)\b/i;
    const inWeeksRegex = /\bin\s+(\d+)\s+(week|weeks)\b/i;

    const daysMatch = lowerInput.match(inDaysRegex);
    const weeksMatch = lowerInput.match(inWeeksRegex);

    if (daysMatch) {
      date = addDays(new Date(), parseInt(daysMatch[1]));
      title = title.replace(inDaysRegex, '').trim();
    } else if (weeksMatch) {
      date = addDays(new Date(), parseInt(weeksMatch[1]) * 7);
      title = title.replace(inWeeksRegex, '').trim();
    }
  }

  // Check for French patterns like "dans 3 jours" or "dans 2 semaines"
  if (!date) {
    const dansDaysRegex = /\bdans\s+(\d+)\s+(jour|jours)\b/i;
    const dansWeeksRegex = /\bdans\s+(\d+)\s+(semaine|semaines)\b/i;

    const daysMatch = lowerInput.match(dansDaysRegex);
    const weeksMatch = lowerInput.match(dansWeeksRegex);

    if (daysMatch) {
      date = addDays(new Date(), parseInt(daysMatch[1]));
      title = title.replace(dansDaysRegex, '').trim();
    } else if (weeksMatch) {
      date = addDays(new Date(), parseInt(weeksMatch[1]) * 7);
      title = title.replace(dansWeeksRegex, '').trim();
    }
  }

  // Clean up the title
  title = title.replace(/\s+/g, ' ').trim();
  // Remove trailing/leading punctuation
  title = title.replace(/^[,.\-\s]+|[,.\-\s]+$/g, '').trim();

  return { title, date, time };
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
