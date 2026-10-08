// data/topics.js
export const TOPICS = [
  {
    id: 18,
    label: 'Computers',
    description: 'Learn the fundamentals of hardware, software, and networking.',
    tile: '#ece9ff',
    color: '#5b4bdb',
    path: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12"/>',
  },
  {
    id: 19,
    label: 'Mathematics',
    description: 'Test your skills with numbers, formulas, and complex equations.',
    tile: '#dbeafe',
    color: '#1d4ed8',
    path: '<path d="M4 8h8M8 4v8M14 8h6M5 14l6 6M11 14l-6 6M14 17h6"/>',
  },
  {
    id: 9,
    label: 'General Knowledge',
    description: 'A mix of random trivia to test your overall worldly knowledge.',
    tile: '#fef3c7',
    color: '#b45309',
    path: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
  },
  {
    id: 17,
    label: 'Science & Nature',
    description: 'Explore the natural world, biology, physics, and chemistry.',
    tile: '#dcfce7',
    color: '#15803d',
    path: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.5 15h9"/>',
  },
  {
    id: 23,
    label: 'History',
    description: 'Travel back in time to cover ancient empires and modern events.',
    tile: '#ffedd5',
    color: '#c2410c',
    path: '<path d="M3 10l9-6 9 6H3zM5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  },
  {
    id: 22,
    label: 'Geography',
    description: 'Identify countries, capitals, oceans, and natural landmarks.',
    tile: '#cffafe',
    color: '#0e7490',
    path: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  },
];

export function getTopicData(id) {
  return (
    TOPICS.find((t) => t.id === Number(id)) || {
      tile: '#fdebd3',
      color: '#c2410c',
      path: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5"/>',
    }
  );
}
