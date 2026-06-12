export function buildQueryParams(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          searchParams.append(key, String(item));
        }
      });

      return;
    }

    searchParams.set(key, String(value));
  });

  return searchParams;
}

export function appendQueryParams(url, params = {}) {
  const searchParams = buildQueryParams(params);
  const queryString = searchParams.toString();

  if (!queryString) {
    return url;
  }

  return `${url}?${queryString}`;
}
