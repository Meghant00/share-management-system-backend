export const getDatesBetweenTwoDates = ({
  fromDate,
  toDate,
}: {
  fromDate: string;
  toDate?: string;
}) => {
  const datesBetweenFromDateAndToDate: number[] = [];

  if (!toDate) {
    datesBetweenFromDateAndToDate.push(new Date(fromDate).getTime());
  } else {
    const fromDateInMilliseconds = new Date(fromDate).getTime();

    const toDateInMilliseconds = new Date(toDate).getTime();

    const oneDayInMilliseconds = 1000 * 60 * 60 * 24;

    for (
      let i = fromDateInMilliseconds;
      i <= toDateInMilliseconds;
      i += oneDayInMilliseconds
    ) {
      datesBetweenFromDateAndToDate.push(i);
    }
  }

  return datesBetweenFromDateAndToDate;
};

export const formatDateInDDMMYYYY = (date: Date | string) => {
  const tempDate = new Date(date);

  const formattedDate = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(tempDate);

  return formattedDate;
};
