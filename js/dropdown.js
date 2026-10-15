import { ICONS } from './icons.js';
import { escapeHtml } from './helpers.js';

export function createDropdown(container, settings) {
  const options = settings.options;
  const baseId = settings.id;
  let value = settings.value;
  let isOpen = false;
  let activeIndex = 0;

  container.classList.add('dropdown');
  container.innerHTML = `
    <button class="dropdown-button" id="${baseId}-button" type="button" role="combobox"
      aria-haspopup="listbox" aria-expanded="false" aria-controls="${baseId}-list"
      aria-labelledby="${settings.labelId} ${baseId}-button">
      <span class="dropdown-value"></span>
      <span class="dropdown-arrow">${ICONS.chevron}</span>
    </button>
    <ul class="dropdown-list" id="${baseId}-list" role="listbox" aria-labelledby="${settings.labelId}" hidden></ul>
  `;

  const button = container.querySelector('.dropdown-button');
  const valueText = container.querySelector('.dropdown-value');
  const list = container.querySelector('.dropdown-list');

  function indexOfValue(target) {
    for (let i = 0; i < options.length; i++) {
      if (String(options[i].value) === String(target)) {
        return i;
      }
    }
    return 0;
  }

  function drawValue() {
    valueText.textContent = options[indexOfValue(value)].label;
  }

  function drawOptions() {
    let html = '';
    const selectedIndex = indexOfValue(value);
    for (let i = 0; i < options.length; i++) {
      const selected = i === selectedIndex;
      let activeClass = '';
      if (i === activeIndex) {
        activeClass = ' is-active';
      }
      let check = '';
      if (selected) {
        check = `<span class="dropdown-check">${ICONS.check}</span>`;
      }
      html += `
        <li class="dropdown-option${activeClass}" id="${baseId}-option-${i}" role="option"
          data-index="${i}" aria-selected="${selected}">
          <span>${escapeHtml(options[i].label)}</span>${check}
        </li>
      `;
    }
    list.innerHTML = html;
  }

  function highlight(index) {
    activeIndex = index;
    const items = list.querySelectorAll('.dropdown-option');
    for (let i = 0; i < items.length; i++) {
      items[i].classList.toggle('is-active', i === index);
    }
    button.setAttribute('aria-activedescendant', baseId + '-option-' + index);
    if (items[index] && items[index].scrollIntoView) {
      items[index].scrollIntoView({ block: 'nearest' });
    }
  }

  function openList() {
    isOpen = true;
    activeIndex = indexOfValue(value);
    drawOptions();
    list.hidden = false;
    container.classList.add('is-open');
    button.setAttribute('aria-expanded', 'true');
    container.classList.remove('opens-up');
    const box = container.getBoundingClientRect();
    const listHeight = list.offsetHeight + 12;
    if (window.innerHeight - box.bottom < listHeight && box.top > listHeight) {
      container.classList.add('opens-up');
    }
    highlight(activeIndex);
  }

  function closeList() {
    isOpen = false;
    list.hidden = true;
    container.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    button.removeAttribute('aria-activedescendant');
  }

  function choose(index) {
    const next = options[index].value;
    const changed = String(next) !== String(value);
    value = next;
    drawValue();
    closeList();
    if (changed && settings.onChange) {
      settings.onChange(next);
    }
  }

  button.addEventListener('click', function () {
    if (isOpen) {
      closeList();
    } else {
      openList();
    }
  });

  list.addEventListener('click', function (event) {
    const item = event.target.closest('.dropdown-option');
    if (item) {
      choose(Number(item.dataset.index));
      button.focus();
    }
  });

  list.addEventListener('mouseover', function (event) {
    const item = event.target.closest('.dropdown-option');
    if (item) {
      highlight(Number(item.dataset.index));
    }
  });

  button.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        openList();
      } else {
        highlight(Math.min(options.length - 1, activeIndex + 1));
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        openList();
      } else {
        highlight(Math.max(0, activeIndex - 1));
      }
    } else if (event.key === 'Home' && isOpen) {
      event.preventDefault();
      highlight(0);
    } else if (event.key === 'End' && isOpen) {
      event.preventDefault();
      highlight(options.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (isOpen) {
        choose(activeIndex);
      } else {
        openList();
      }
    } else if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      closeList();
    } else if (event.key === 'Tab' && isOpen) {
      closeList();
    }
  });

  button.addEventListener('keyup', function (event) {
    if (event.key === ' ') {
      event.preventDefault();
    }
  });

  function handleOutsideClick(event) {
    if (isOpen && !container.contains(event.target)) {
      closeList();
    }
  }

  document.addEventListener('pointerdown', handleOutsideClick);
  drawValue();

  return {
    destroy: function () {
      document.removeEventListener('pointerdown', handleOutsideClick);
    },
  };
}