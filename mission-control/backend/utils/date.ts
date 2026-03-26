/**
 * calculates diffrence of days between two dates
 *
 * @param date1 - current date
 * @param date2 - robot's expiry date
 * @returns days
 */

import dayjs from "dayjs";

/* eslint-disable import/prefer-default-export */
export const dateDiffInDays = (date1: Date, date2: Date) => {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  // Discard the time and time-zone information.
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());

  return Math.floor((utc2 - utc1) / MS_PER_DAY);
};

export const timeDifferenceInMinutes = (time1: string, time2: string) => {
  // Parse the time strings and set them to the start of the day
  const t1 = dayjs(`1970-01-01T${time1}`);
  const t2 = dayjs(`1970-01-01T${time2}`);

  // Calculate the difference in minutes
  const diffMinutes = t2.diff(t1, "minute");

  return diffMinutes;
};

export const getDelayUntilTime = (
  hours: number,
  min: number = 0,
  sec: number = 0,
  ms: number = 0
): number => {
  const now = dayjs();
  let target = now.hour(hours).minute(min).second(sec).millisecond(ms);

  if (now.isAfter(target)) {
    target = target.add(1, "day");
  }

  return target.diff(now);
};

/**
 * Gets today's date range (start and end) in IST timezone
 *
 * @returns Object with start and end Date objects adjusted for IST (UTC+5:30)
 */
export const getISTDateRange = () => {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds

  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const todayEnd = new Date(now.setHours(23, 59, 59, 999));

  return {
    start: new Date(todayStart.getTime() - IST_OFFSET_MS),
    end: new Date(todayEnd.getTime() - IST_OFFSET_MS)
  };
};
