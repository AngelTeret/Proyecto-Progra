const socket = io('http://localhost:3000');

let user = null;

// **Login automático para pruebas**
fetch('http://localhost:3000/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'angel', password: '1234' }) // Usa credenciales reales
})
.then(res => res.json())
.then(data => {
    if (data.token) {
        user = data.user;
        console.log("Usuario autenticado:", user);
    }
});

// **Enviar mensaje**
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (message && user) {
        socket.emit('sendMessage', { sender: user.id, receiver: 2, message }); // ID receptor de prueba
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
