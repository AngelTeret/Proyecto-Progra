// chat.js - Chat de tramas bancarias limitado para Fase 2
// Este archivo asume que solo se envían tramas (cadenas de 63 dígitos) y se recibe la respuesta del banco.

// SweetAlert2 CDN
const swalScript = document.createElement('script');
swalScript.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
document.head.appendChild(swalScript);

const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

// Habilita el input para enviar tramas
messageInput.placeholder = 'Ingresa una trama bancaria de 63 dígitos...';
messageInput.disabled = false;
sendButton.disabled = false;

function appendMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.className = sender === 'yo' ? 'msg msg-yo' : 'msg msg-banco';
    msgDiv.innerHTML = `<span class="msg-sender">${sender === 'yo' ? 'Tú' : 'Banco'}</span><span class="msg-text">${text}</span>`;
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function validarTrama(trama) {
    if (!trama) return 'La trama no puede estar vacía.';
    if (!/^[0-9]{63}$/.test(trama)) return 'La trama debe tener exactamente 63 dígitos numéricos.';
    return null;
}

sendButton.onclick = sendMessage;
messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const trama = messageInput.value.trim();
    const error = validarTrama(trama);
    if (error) {
        Swal.fire({ icon: 'error', title: 'Trama inválida', text: error });
        return;
    }
    appendMessage(trama, 'yo');
    messageInput.value = '';
    messageInput.disabled = true;
    sendButton.disabled = true;
    // Envía la trama al backend
    fetch('/api/banco/procesar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trama })
    })
    .then(res => res.json())
    .then(data => {
        if (data.tramaRespuesta) {
            appendMessage(data.tramaRespuesta, 'banco');
            mostrarSweetAlertPorCodigo(data.tramaRespuesta);
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.mensaje || 'No se recibió respuesta del banco.' });
        }
    })
    .catch(err => {
        Swal.fire({ icon: 'error', title: 'Error de conexión', text: err.message });
    })
    .finally(() => {
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.focus();
    });
}

function mostrarSweetAlertPorCodigo(trama) {
    // El código de respuesta está en los últimos 2 dígitos
    const codigo = trama.slice(-2);
    let config = {};
    switch (codigo) {
        case '01': config = { icon: 'success', title: 'Transacción exitosa', text: 'La transacción fue aprobada.' }; break;
        case '02': config = { icon: 'error', title: 'Transacción rechazada', text: 'La transacción fue rechazada.' }; break;
        case '03': config = { icon: 'error', title: 'Sistema fuera de servicio', text: 'El sistema bancario no está disponible.' }; break;
        case '04': config = { icon: 'info', title: 'Transacción cancelada', text: 'La transacción fue cancelada por el usuario.' }; break;
        case '05': config = { icon: 'warning', title: 'Fondos insuficientes', text: 'El cliente no tiene fondos suficientes.' }; break;
        case '06': config = { icon: 'warning', title: 'Cliente no identificado', text: 'El cliente no está registrado.' }; break;
        case '07': config = { icon: 'warning', title: 'Empresa/Sucursal inválida', text: 'Empresa o sucursal inválida.' }; break;
        case '08': config = { icon: 'warning', title: 'Monto inválido', text: 'El monto es inválido.' }; break;
        case '09': config = { icon: 'info', title: 'Transacción duplicada', text: 'La transacción ya fue realizada.' }; break;
        default: config = { icon: 'question', title: 'Respuesta desconocida', text: 'Código de respuesta: ' + codigo };
    }
    Swal.fire(config);
}
