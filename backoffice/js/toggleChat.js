document.addEventListener('DOMContentLoaded', () => {
  const chatToggleBtn = document.getElementById('chatToggleBtn');
  const chatSidebar = document.getElementById('chatSidebar');

  chatToggleBtn.addEventListener('click', () => {
    if (chatSidebar.style.display === 'none' || chatSidebar.style.display === '') {
      chatSidebar.style.display = 'flex';
    } else {
      chatSidebar.style.display = 'none';
    }
  });
});