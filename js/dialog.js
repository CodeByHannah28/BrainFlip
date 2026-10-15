import { TOPICS, getTopicData } from '../data/topics.js';
import { escapeHtml } from './helpers.js';
import { ICONS } from './icons.js';

function getLabel(category) {
  for (let i = 0; i < TOPICS.length; i++) {
    if (TOPICS[i].id === category.id) {
      return TOPICS[i].label;
    }
  }
  return category.name;
}

export function openTopicDialog(categories, selectedId, onPick, trigger) {
  const dialog = document.createElement('dialog');
  dialog.className = 'topic-dialog';
  dialog.setAttribute('aria-labelledby', 'topic-dialog-title');

  let optionsHtml = '';
  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];
    const data = getTopicData(category.id);
    const isSelected = category.id === selectedId;
    let mark = '';
    if (isSelected) {
      mark = `<span class="topic-dialog-mark">${ICONS.check}</span>`;
    }

    optionsHtml += `
      <button class="topic-dialog-option" type="button" data-id="${category.id}" aria-pressed="${isSelected}">
        <span class="topic-dialog-icon" style="background: ${data.tile}; color: ${data.color};">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${data.path}</svg>
        </span>
        <span class="topic-dialog-name">${escapeHtml(getLabel(category))}</span>
        ${mark}
      </button>
    `;
  }

  dialog.innerHTML = `
    <div class="topic-dialog-head">
      <h2 class="topic-dialog-title" id="topic-dialog-title">All topics</h2>
      <button class="topic-dialog-close" type="button" aria-label="Close">${ICONS.cross}</button>
    </div>
    <div class="topic-dialog-grid">${optionsHtml}</div>
  `;

  let pickedId = null;

  dialog.addEventListener('click', function (event) {
    const box = dialog.getBoundingClientRect();
    const inside =
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom;
    if (!inside) {
      dialog.close();
    }
  });

  dialog.querySelector('.topic-dialog-close').addEventListener('click', function () {
    dialog.close();
  });

  const options = dialog.querySelectorAll('.topic-dialog-option');
  for (let i = 0; i < options.length; i++) {
    options[i].addEventListener('click', function (event) {
      pickedId = Number(event.currentTarget.dataset.id);
      dialog.close();
    });
  }

  dialog.addEventListener('close', function () {
    dialog.remove();
    if (pickedId !== null) {
      for (let i = 0; i < categories.length; i++) {
        if (categories[i].id === pickedId) {
          onPick(categories[i]);
        }
      }
    } else if (trigger && document.contains(trigger)) {
      trigger.focus();
    }
  });

  document.body.appendChild(dialog);
  dialog.showModal();
}