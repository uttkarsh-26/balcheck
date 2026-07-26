const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2})$/;

function daysInMonth(year, month) {
  if (month === 2) {
    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return leapYear ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isValidDateParts(year, month, day) {
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

function isValidIsoDateOrDateTime(value) {
  const dateMatch = ISO_DATE_PATTERN.exec(value);
  if (dateMatch) {
    const [, year, month, day] = dateMatch.map(Number);
    return isValidDateParts(year, month, day);
  }

  const datetimeMatch = ISO_DATETIME_PATTERN.exec(value);
  if (!datetimeMatch) return false;

  const [, year, month, day, hour, minute, second = '0', , timezone] = datetimeMatch;
  const numericYear = Number(year);
  const numericMonth = Number(month);
  const numericDay = Number(day);
  const numericHour = Number(hour);
  const numericMinute = Number(minute);
  const numericSecond = Number(second);

  if (!isValidDateParts(numericYear, numericMonth, numericDay)) return false;
  if (numericHour > 23 || numericMinute > 59 || numericSecond > 59) return false;
  if (timezone !== 'Z') {
    const offsetMatch = /^[+-](\d{2}):(\d{2})$/.exec(timezone);
    if (!offsetMatch) return false;

    const offsetHours = Number(offsetMatch[1]);
    const offsetMinutes = Number(offsetMatch[2]);
    if (offsetHours > 14 || offsetMinutes > 59 || (offsetHours === 14 && offsetMinutes !== 0)) return false;
  }

  return true;
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isSafeOfficialUrl(value) {
  if (typeof value !== 'string' || !/^https:\/\//i.test(value.trim())) return false;

  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function wordCount(value) {
  return value.match(/\S+/gu)?.length ?? 0;
}

/**
 * Return contract violations without mutating the supplied article brief.
 * Optional sections are allowed to be absent; supplied arrays are capped.
 */
export function validateScannableArticleSummary(props) {
  const errors = [];
  const brief = props && typeof props === 'object' ? props : {};

  if (!isNonEmptyString(brief.summary)) {
    errors.push('summary must be a non-empty string');
  } else if (wordCount(brief.summary) > 35) {
    errors.push('summary must contain at most 35 words');
  }

  if (brief.facts !== undefined) {
    if (!Array.isArray(brief.facts)) {
      errors.push('facts must be an array when supplied');
    } else {
      if (brief.facts.length > 5) errors.push('facts must contain at most 5 items');
      brief.facts.forEach((fact, index) => {
        if (!isObject(fact)) {
          errors.push(`facts[${index}] must be a non-null object`);
          return;
        }
        if (!isNonEmptyString(fact.label)) errors.push(`facts[${index}].label must be a non-empty string`);
        if (!isNonEmptyString(fact.value)) errors.push(`facts[${index}].value must be a non-empty string`);
      });
    }
  }

  if (brief.timeline !== undefined) {
    if (!Array.isArray(brief.timeline)) {
      errors.push('timeline must be an array when supplied');
    } else {
      if (brief.timeline.length > 5) errors.push('timeline must contain at most 5 items');
      brief.timeline.forEach((event, index) => {
        if (!isObject(event)) {
          errors.push(`timeline[${index}] must be a non-null object`);
          return;
        }
        if (!isNonEmptyString(event.date)) errors.push(`timeline[${index}].date must be a non-empty string`);
        if (!isNonEmptyString(event.text)) errors.push(`timeline[${index}].text must be a non-empty string`);
        if (event.datetime !== undefined && (typeof event.datetime !== 'string' || !isValidIsoDateOrDateTime(event.datetime))) {
          errors.push(`timeline[${index}].datetime must be a valid ISO calendar date or date-time with timezone`);
        }
      });
    }
  }

  if (brief.action !== undefined) {
    if (!brief.action || typeof brief.action !== 'object' || Array.isArray(brief.action)) {
      errors.push('action must be a non-null object');
    } else {
      if (!isNonEmptyString(brief.action.title)) errors.push('action.title must be a non-empty string');
      if (brief.action.steps !== undefined) {
        if (!Array.isArray(brief.action.steps)) {
          errors.push('action.steps must be an array when supplied');
        } else {
          if (brief.action.steps.length > 5) errors.push('action.steps must contain at most 5 items');
          brief.action.steps.forEach((step, index) => {
            if (!isNonEmptyString(step)) errors.push(`action.steps[${index}] must be a non-empty string`);
          });
        }
      }
      if (brief.action.officialUrl !== undefined && !isSafeOfficialUrl(brief.action.officialUrl)) {
        errors.push('action.officialUrl must be a safe absolute HTTPS URL without credentials when supplied');
      }
      if (brief.action.officialLabel !== undefined && !isNonEmptyString(brief.action.officialLabel)) {
        errors.push('action.officialLabel must be a non-empty string');
      }
    }
  }

  if (brief.details !== undefined) {
    if (!isObject(brief.details)) {
      errors.push('details must be a non-null object');
    } else {
      if (!isNonEmptyString(brief.details.title)) errors.push('details.title must be a non-empty string');
      if (!isNonEmptyString(brief.details.body)) errors.push('details.body must be a non-empty string');
    }
  }

  return errors;
}
