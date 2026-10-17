import { getTopicData } from '../data/topics.js';

export function topicIconHtml(categoryId, size) {
  const data = getTopicData(categoryId);
  const iconSize = Math.round(size * 0.58);
  return `<span class="topic-badge" style="display: inline-grid; flex: none; place-items: center; width: ${size}px; height: ${size}px; border-radius: 28%; background: ${data.tile}; color: ${data.color};"><svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${data.path}</svg></span>`;
}