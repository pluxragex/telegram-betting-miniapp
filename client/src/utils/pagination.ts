export function getPaginationWindow(current: number, total: number, windowSize: number = 7): number[] {
  if (total <= 0) return [];
  const size = Math.min(windowSize, total);

  let start = current - Math.floor(size / 2);
  let end = current + Math.floor(size / 2);

  if (start < 1) {
    start = 1;
    end = size;
  }

  if (end > total) {
    end = total;
    start = total - size + 1;
    if (start < 1) start = 1;
  }

  const pages: number[] = [];
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
}

