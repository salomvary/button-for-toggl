const togglUrlRegex = /^(\w+\.)?toggl\.(space|com)$/

export function secToHHMM (sum: number) {
  const hours = Math.floor(sum / 3600);
  const minutes = Math.floor((sum % 3600) / 60);

  return hours + 'h ' + minutes + 'm';
}

export function report (e: Error) {
  if (process.env.DEBUG) {
    console.error(e);
  }
}

const entityMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;'
};

export function escapeHtml (string: string) {
  return String(string).replace(/[&<>"'/]/g, function (s) {
    return entityMap[s];
  });
}

export function getUrlParam (location: string, key: string) {
  const url = new URL(location);
  return url.searchParams.get(key);
}

export function isTogglURL (url: string) {
  try {
    return togglUrlRegex.test(new URL(url).hostname);
  } catch (err) {
    return false;
  }
}

