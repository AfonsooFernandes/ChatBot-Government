function sendMessage() {
  const input = document.getElementById('userInput').value.trim();
  if (input) {
    const chatBody = document.getElementById('chat-body');
    const userMsg = document.createElement('div');
    userMsg.classList.add('user-msg');
    userMsg.textContent = input;
    chatBody.appendChild(userMsg);
    document.getElementById('userInput').value = '';
    chatBody.scrollTop = chatBody.scrollHeight;
    setTimeout(() => {
      const botMsg = document.createElement('div');
      botMsg.classList.add('bot-msg');
      botMsg.textContent = 'Aguarde, estamos a processar a sua solicitação...';
      chatBody.appendChild(botMsg);
      chatBody.scrollTop = chatBody.scrollHeight;
    }, 500);
  }
}
document.getElementById('userInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') sendMessage();
});