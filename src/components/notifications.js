export function createNotifications() {
  let message = {
    type: 'info',
    text: 'Audio stays in this browser for the local MVP.',
  };

  function set(type, text) {
    message = { type, text };
  }

  return {
    info(text) {
      set('info', text);
    },
    success(text) {
      set('success', text);
    },
    error(text) {
      set('error', text);
    },
    render(container) {
      container.innerHTML = `<p class="toast ${message.type}">${message.text}</p>`;
    },
  };
}
