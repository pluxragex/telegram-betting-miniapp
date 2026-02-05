const TIMEZONE = 'Europe/Moscow';

export function getMoscowTime(): Date {
  return new Date();
}

function getMoscowTimeString(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  const hour = parts.find(p => p.type === 'hour')?.value || '';
  const minute = parts.find(p => p.type === 'minute')?.value || '';
  const second = parts.find(p => p.type === 'second')?.value || '';
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export function formatMoscowTime(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: TIMEZONE,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  };
  
  const formatter = new Intl.DateTimeFormat('ru-RU', {
    ...defaultOptions,
    ...options,
    timeZone: TIMEZONE,
  });
  
  return formatter.format(dateObj);
}

export function formatMoscowDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const formatter = new Intl.DateTimeFormat('ru-RU', {
    timeZone: TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  
  return formatter.format(dateObj);
}

function getMoscowTimeStringFromDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(dateObj);
  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  const hour = parts.find(p => p.type === 'hour')?.value || '';
  const minute = parts.find(p => p.type === 'minute')?.value || '';
  const second = parts.find(p => p.type === 'second')?.value || '';
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export function isMatchStarted(startTime: Date | string): boolean {
  const matchStartMoscow = getMoscowTimeStringFromDate(startTime);
  const nowMoscow = getMoscowTimeString();
  
  return matchStartMoscow <= nowMoscow;
}

export function localDateTimeToMoscowISO(localDateTimeString: string): string {
  if (!localDateTimeString) return '';
  
  const [datePart, timePart] = localDateTimeString.split('T');
  if (!datePart || !timePart) return '';
  
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  
  let testUTC = new Date(Date.UTC(year, month - 1, day, hours - 3, minutes));
  
  const moscowFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  for (let i = 0; i < 20; i++) {
    const parts = moscowFormatter.formatToParts(testUTC);
    const mYear = parseInt(parts.find(p => p.type === 'year')?.value || '0');
    const mMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0');
    const mDay = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    const mHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const mMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    
    if (mYear === year && mMonth === month && mDay === day && mHour === hours && mMinute === minutes) {
      return testUTC.toISOString();
    }
    
    const moscowUTC = Date.UTC(mYear, mMonth - 1, mDay, mHour, mMinute);
    const inputUTC = Date.UTC(year, month - 1, day, hours, minutes);
    const diffMs = inputUTC - moscowUTC;
    
    if (Math.abs(diffMs) < 1000) break;
    
    testUTC = new Date(testUTC.getTime() - diffMs);
  }
  
  return testUTC.toISOString();
}

export function moscowISOToLocalDateTime(isoString: string): string {
  if (!isoString) return '';
  
  const date = new Date(isoString);
  
  const moscowFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  const parts = moscowFormatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  const hour = parts.find(p => p.type === 'hour')?.value || '';
  const minute = parts.find(p => p.type === 'minute')?.value || '';
  
  return `${year}-${month}-${day}T${hour}:${minute}`;
}
