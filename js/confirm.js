import { ICONS } from './icons.js';

export function askToLeaveQuiz() {
  return new Promise(function (resolve) {
    const dialog = document.createElement('dialog');
    dialog.className = 'confirm-dialog';
    dialog.setAttribute('aria-labelledby', 'confirm-title');
    dialog.setAttribute('aria-describedby', 'confirm-text');

    dialog.innerHTML = `
      <span class="confirm-icon">${ICONS.clock}</span>
      <h2 class="confirm-title" id="confirm-title">Leave the quiz?</h2>
      <p class="confirm-text" id="confirm-text">
        You are in the middle of a quiz. Do you want to finish it before you move to another page,
        or end it now? If you end it now, your answers so far will be lost.
      </p>
      <div class="confirm-actions">
        <button class="btn btn--primary" id="confirm-stay" type="button">Continue and finish the quiz</button>
        <button class="btn btn--outline" id="confirm-leave" type="button">End quiz now</button>
      </div>
    `;

    let leave = false;

    dialog.querySelector('#confirm-stay').addEventListener('click', function () {
      dialog.close();
    });

    dialog.querySelector('#confirm-leave').addEventListener('click', function () {
      leave = true;
      dialog.close();
    });

    dialog.addEventListener('close', function () {
      dialog.remove();
      resolve(leave);
    });

    document.body.appendChild(dialog);
    dialog.showModal();
    dialog.querySelector('#confirm-stay').focus();
  });
}