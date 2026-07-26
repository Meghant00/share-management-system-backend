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

      let firstDayOfWeek = toDate.getDate() - currentDay;

      if (firstDayOfWeek < 1) {
        const lastDayOfPreviousMonth = new Date(
          toDate.getFullYear(),
          toDate.getMonth(),
          0,
        ).getDate();

        firstDayOfWeek = lastDayOfPreviousMonth + firstDayOfWeek;

        fromDate = new Date(
          `${toDate.getFullYear()}-${currentMonth - 1 >= 10 ? '' : 0}${currentMonth - 1}-${firstDayOfWeek}`,
        );
      } else {
        fromDate = new Date(
          `${toDate.getFullYear()}-${currentMonth >= 10 ? '' : 0}${currentMonth}-${firstDayOfWeek >= 10 ? '' : 0}${firstDayOfWeek}`,
        );
      }

      toDate.setDate(toDate.getDate() + (6 - currentDay));

      const lastDayOfWeekMonth = toDate.getMonth() + 1;
      const lastDayOfWeek = toDate.getDate();

      toDate = new Date(
        `${toDate.getFullYear()}-${lastDayOfWeekMonth >= 10 ? '' : 0}${lastDayOfWeekMonth}-${lastDayOfWeek >= 10 ? '' : 0}${lastDayOfWeek}`,
      );

      break;
    default:
      break;
  }

  return { fromDate, toDate };
};
