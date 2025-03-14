const socket = io();
let selectedUser = null;
const userInfo = JSON.parse(sessionStorage.getItem('userInfo'));

if (!userInfo) {
    window.location.href = '/login';
}

// Mostrar nombre de usuario actual
document.getElementById('currentUsername').textContent = userInfo.username;
document.querySelector('.user-avatar span').textContent = userInfo.username.charAt(0).toUpperCase();

// Conectar socket
socket.emit('register socket', userInfo.username);

// Manejar lista de usuarios
socket.on('users update', (users) => {
    console.log('Recibida actualización de usuarios:', users);
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';
    
    const currentUser = users.find(u => u.username === userInfo.username);
    console.log('Usuario actual:', currentUser);
    
    users.forEach(user => {
        if (user.username !== userInfo.username) {
            const div = document.createElement('div');
            div.className = `user-item ${selectedUser === user.username ? 'selected' : ''}`;
            
            // Solo mostrar mensajes no leídos si no es el chat actualmente seleccionado
            const unreadCount = selectedUser !== user.username ? 
                (currentUser?.unreadMessages[user.username] || 0) : 0;
            
            div.innerHTML = `
                <div class="user-status ${user.online ? 'online' : ''}"></div>
                <span class="user-name">${user.username}</span>
                ${unreadCount > 0 ? `<span class="unread-counter">${unreadCount}</span>` : ''}
            `;
            div.onclick = () => selectUser(user.username);
            usersList.appendChild(div);
        }
    });
});

// Agregar evento al input de mensaje para marcar como leídos
document.getElementById('messageInput').addEventListener('focus', function() {
    if (selectedUser) {
        socket.emit('request messages', { with: selectedUser });
    }
});

// Manejar mensajes privados
socket.on('private message', (data) => {
    console.log('Mensaje privado recibido:', data);
    
    // Si el mensaje es del usuario seleccionado, mostrarlo
    if (data.from === selectedUser) {
        appendMessage(data, true);
    }
    
    // Solicitar actualización de la lista de usuarios para actualizar contadores
    socket.emit('request users list');
});

// Manejar historial de mensajes
socket.on('message history', (messages) => {
    loadMessageHistory(messages);
});

// Seleccionar usuario para chatear
function selectUser(username) {
    console.log('Seleccionando usuario:', username);
    selectedUser = username;
    document.getElementById('selectedUser').textContent = username;
    
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    
    messageInput.disabled = false;
    sendButton.disabled = false;
    messageInput.placeholder = `Escribe un mensaje para ${username}...`;
    
    // Actualizar selección visual
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('selected');
        if (item.querySelector('.user-name').textContent === username) {
            item.classList.add('selected');
        }
    });

    // Limpiar mensajes anteriores
    document.getElementById('messagesContainer').innerHTML = '';
    
    // Solicitar mensajes específicos para este usuario
    socket.emit('request messages', { with: username });
}

// Enviar mensaje
function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (message && selectedUser) {
        console.log('Enviando mensaje a:', selectedUser);
        socket.emit('private message', {
            to: selectedUser,
            message: message
        });

        appendMessage({ message, created_at: new Date().toISOString() });
        
        input.value = '';
    }
}

// Enter para enviar mensaje
document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Función para formatear la hora
function formatMessageTime(created_at) {
    const time = new Date(created_at).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });
    return time;
}

// Agregar mensaje al chat
function appendMessage(data, isReceived = false) {
    const messageContainer = document.createElement('div');
    messageContainer.className = `message ${isReceived ? 'received' : 'sent'}`;
    
    const time = formatMessageTime(data.created_at);
    
    messageContainer.innerHTML = `
        <div class="message-content">
            <p>${data.message}</p>
            <span class="message-time">${time}</span>
        </div>
    `;
    
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.appendChild(messageContainer);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Cargar historial de mensajes
function loadMessageHistory(messages) {
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.innerHTML = '';
    messages.forEach(msg => {
        const isReceived = msg.sender_username !== userInfo.username;
        const time = formatMessageTime(msg.created_at);
        
        const messageContainer = document.createElement('div');
        messageContainer.className = `message ${isReceived ? 'received' : 'sent'}`;
        
        messageContainer.innerHTML = `
            <div class="message-content">
                <p>${msg.message}</p>
                <span class="message-time">${time}</span>
            </div>
        `;
        
        messagesContainer.appendChild(messageContainer);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Función de logout
function logout() {
    sessionStorage.removeItem('userInfo');
    window.location.href = '/login';
}

// Solicitar lista de usuarios al cargar
socket.emit('request users list');
