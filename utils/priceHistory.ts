import { QUARTER } from 'interface/date';
import { PriceHistoryPeriod } from 'src/priceHistory/priceHistory.interface';

export const getFromDateAndToDateFromPriceHistoryPeriod = (
  period: PriceHistoryPeriod,
) => {
  let fromDate = new Date();

  let toDate = new Date();

  const lastDayOfCurrentMonth = new Date(
    toDate.getFullYear(),
    toDate.getMonth() + 1,
    0,
  ).getDate();
  const currentMonth = toDate.getMonth() + 1;

  switch (period) {
    case 'annually':
      fromDate = new Date(`${toDate.getFullYear()}-01-01`);
      toDate = new Date(`${toDate.getFullYear()}-12-30`);

      break;
    case 'quarterly':
      const currentQuarter = Math.floor((toDate.getMonth() + 3) / 3);

      const startingMonthOfCurrentQuarter =
        QUARTER[currentQuarter].startingMonth;

      const endingMonthOfCurrentQuarter = QUARTER[currentQuarter].endingMonth;

      fromDate = new Date(
        `${toDate.getFullYear()}-${startingMonthOfCurrentQuarter >= 10 ? '' : 0}${startingMonthOfCurrentQuarter}-01`,
      );

      toDate = new Date(
        `${toDate.getFullYear()}-${endingMonthOfCurrentQuarter >= 10 ? '' : 0}${endingMonthOfCurrentQuarter}-${lastDayOfCurrentMonth}`,
      );
      break;
    case 'monthly':
      fromDate = new Date(
        `${toDate.getFullYear()}-${currentMonth >= 10 ? '' : 0}${currentMonth}-01`,
      );

      toDate = new Date(
        `${toDate.getFullYear()}-${currentMonth >= 10 ? '' : 0}${currentMonth}-${lastDayOfCurrentMonth}`,
      );
      break;
    case 'weekly':
      const currentDay = toDate.getDay();

      const firstDayOfWeek = toDate.getDate() - currentDay;

      const lastDayOfWeek = toDate.getDate() + (6 - currentDay);

      fromDate = new Date(
        `${toDate.getFullYear()}-${currentMonth >= 10 ? '' : 0}${currentMonth}-${firstDayOfWeek}`,
      );

      toDate = new Date(
        `${toDate.getFullYear()}-${currentMonth >= 10 ? '' : 0}${currentMonth}-${lastDayOfWeek}`,
      );

      break;
    default:
      break;
  }

  return { fromDate, toDate };
};
