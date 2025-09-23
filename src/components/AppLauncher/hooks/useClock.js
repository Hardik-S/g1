import { useEffect, useState } from 'react';

const useClock = (options = {}) => {
  const {
    timeZone = 'America/Toronto',
    locale = 'en-CA',
  } = options;

  const [time, setTime] = useState('--:--:--');

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const updateTime = () => {
      setTime(formatter.format(new Date()));
    };

    updateTime();
    const intervalId = setInterval(updateTime, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [locale, timeZone]);

  return time;
};

export default useClock;
