import dayjs from 'dayjs';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat('en-US');

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function safeNumber(value, fallback = 0) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

export function safePercent(part, total) {
  const safeTotal = safeNumber(total);

  if (safeTotal <= 0) {
    return 0;
  }

  return (safeNumber(part) / safeTotal) * 100;
}

export function formatCurrency(value) {
  return currencyFormatter.format(safeNumber(value));
}

export function formatCompactCurrency(value) {
  return compactCurrencyFormatter.format(safeNumber(value));
}

export function formatNumber(value) {
  return numberFormatter.format(safeNumber(value));
}

export function formatPercent(value, maximumFractionDigits = 1) {
  return `${safeNumber(value).toFixed(maximumFractionDigits).replace(/\.0$/, '')}%`;
}

export function formatSignedPercent(value) {
  const numericValue = safeNumber(value);
  const absoluteValue = Math.abs(numericValue).toFixed(1).replace(/\.0$/, '');
  const prefix = numericValue > 0 ? '+' : numericValue < 0 ? '-' : '';

  return `${prefix}${absoluteValue}%`;
}

export function formatDurationFromMinutes(value) {
  const totalMinutes = Math.max(0, Math.round(safeNumber(value)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function formatPreviewDate(value) {
  return value && dayjs(value).isValid() ? dayjs(value).format('MMM D, YYYY') : '-';
}

export function getDeltaTone(value) {
  const numericValue = safeNumber(value);

  if (numericValue > 0) {
    return 'text-emerald-500';
  }

  if (numericValue < 0) {
    return 'text-rose-500';
  }

  return 'text-muted-foreground';
}
