document.addEventListener('DOMContentLoaded', () => {
  const chatToggleBtn = document.getElementById('chatToggleBtn');
  const chatSidebar = document.getElementById('chatSidebar');
  const chatCloseBtn = document.querySelector('.chat-close-btn');

  if (chatToggleBtn) {
    chatToggleBtn.addEventListener('click', () => {
      chatSidebar.style.display = 'flex';
      chatToggleBtn.style.display = 'none';
    });
  }

  if (chatCloseBtn) {
    chatCloseBtn.addEventListener('click', fecharChat);
  }
});

function fecharChat() {
  const chatSidebar = document.getElementById('chatSidebar');
  const chatToggleBtn = document.getElementById('chatToggleBtn');
  if (chatSidebar) {
    chatSidebar.style.display = 'none';
  }
  if (chatToggleBtn) {
    chatToggleBtn.style.display = 'flex'; 
  }
}