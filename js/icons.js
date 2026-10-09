function makeIcon(size, stroke, paths) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

export const ICONS = {
  back: makeIcon(20, 2, '<path d="M15 18l-6-6 6-6" />'),
  check: makeIcon(16, 3, '<path d="M5 12l5 5 9-10" />'),
  cross: makeIcon(16, 3, '<path d="M6 6l12 12M18 6L6 18" />'),
  clock: makeIcon(18, 2.5, '<circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />'),
  trophy: makeIcon(
    28,
    2,
    '<path d="M8 4h8v5a4 4 0 0 1-8 0V4z" /><path d="M8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M9 20h6M10 17h4" />',
  ),
  eye: makeIcon(
    20,
    2,
    '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />',
  ),
  retake: makeIcon(
    20,
    2,
    '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />',
  ),
  deck: makeIcon(
    24,
    2,
    '<rect x="8" y="3" width="13" height="13" rx="3" /><path d="M16 20H6a3 3 0 0 1-3-3V8" />',
  ),
  play: makeIcon(24, 2, '<path d="M7 4l13 8-13 8z" />'),
  arrowRight: makeIcon(22, 2, '<path d="M5 12h14M13 6l6 6-6 6" />'),
  arrowLeft: makeIcon(22, 2, '<path d="M19 12H5M11 6l-6 6 6 6" />'),
  chevron: makeIcon(20, 2, '<path d="M9 6l6 6-6 6" />'),
  refresh: makeIcon(
    20,
    2,
    '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />',
  ),
};
