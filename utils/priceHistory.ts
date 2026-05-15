import { PriceHistoryPeriod } from 'src/priceHistory/priceHistory.interface';

export const getFromDateAndToDateFromPriceHistoryPeriod = (
  period: PriceHistoryPeriod,
) => {
  let toDate = new Date();

  let fromDate = new Date();

  switch (period) {
    case 'annually':
      fromDate = new Date(`${toDate.getFullYear()}-01-01`);

      break;
    case 'quarterly':
      const currentQuarter = Math.floor((toDate.getMonth() + 3) / 3);

      fromDate = new Date(`${toDate.getFullYear()}-${currentQuarter}-01`);
      break;
    case 'monthly':
      break;
    default:
      break;
  }

  return { fromDate, toDate };
};
