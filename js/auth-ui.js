import { MESSAGES } from './config.js';
import { getUser, isAuthReady, onUserChange, signInWithGoogle, signOutUser } from './auth.js';

const area = document.getElementById('auth-area');

let tooltipText = MESSAGES.signInTip;
let tooltipHidden = false;

async function handleSignIn() {
  try {
    await signInWithGoogle();
  } catch (error) {
    if (error.code === 'auth/popup-closed-by-user') {
      return;
    }
    if (error.code === 'auth/cancelled-popup-request') {
      return;
    }
    tooltipText = 'Could not sign in. Please try again.';
    tooltipHidden = false;
    render();
  }
}

function handleSignOut() {
  signOutUser();
}

function closeTooltip() {
  tooltipHidden = true;
  render();
}

function render() {
  if (!isAuthReady()) {
    area.innerHTML = '';
    return;
  }

  const user = getUser();

  if (user) {
    let letter = '?';
    if (user.email) {
      letter = user.email.charAt(0).toUpperCase();
    }

    area.innerHTML = `
      <span class="avatar">${letter}</span>
      <button class="btn btn--outline auth-btn" id="sign-out-btn" type="button">Sign out</button>
    `;
    area.querySelector('#sign-out-btn').addEventListener('click', handleSignOut);
    return;
  }

  let tooltipHtml = '';
  if (!tooltipHidden) {
    tooltipHtml = `
      <div class="tooltip" role="status">
        <p>${tooltipText}</p>
        <button class="tooltip-close" id="tooltip-close" type="button" aria-label="Close tip">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    `;
  }

  area.innerHTML = `
    <button class="btn btn--outline auth-btn" id="sign-in-btn" type="button">
      <span class="google-g">G</span>
      <span>Sign in<span class="auth-more"> with Google</span></span>
    </button>
    ${tooltipHtml}
  `;
  area.querySelector('#sign-in-btn').addEventListener('click', handleSignIn);

  if (!tooltipHidden) {
    area.querySelector('#tooltip-close').addEventListener('click', closeTooltip);
  }
}

export function setupAuthUi() {
  onUserChange(render);
  render();
}
