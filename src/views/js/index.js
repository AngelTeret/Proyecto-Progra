const socket = io('http://localhost:3000');

let user = null;


// **Enviar mensaje**
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (message && user) {
        socket.emit('sendMessage', { sender: user.id, receiver: 2, message }); 
        messageInput.value = '';
    }
}

// **Recibir mensaje**
socket.on('message', ({ sender, receiver, message }) => {
    const messagesDiv = document.getElementById('messages');
    const msgElement = document.createElement('div');
    msgElement.className = sender === user.id ? 'my-message' : 'other-message';
    msgElement.textContent = message;
    messagesDiv.appendChild(msgElement);
});
