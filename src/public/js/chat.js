// --- Chat para envío de tramas bancarias ---

// Obtener elementos del DOM
const messagesContainer = document.querySelector('.messages-container');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');

// Crear botón para generar una trama de ejemplo
const generarTramaBtn = document.createElement('button');
generarTramaBtn.textContent = 'Generar Trama Ejemplo';
generarTramaBtn.className = 'btn btn-secondary';
generarTramaBtn.style.margin = '10px';
generarTramaBtn.style.padding = '5px 10px';
generarTramaBtn.style.backgroundColor = '#6c757d';
generarTramaBtn.style.color = '#fff';
generarTramaBtn.style.border = 'none';
generarTramaBtn.style.borderRadius = '4px';
generarTramaBtn.style.cursor = 'pointer';
generarTramaBtn.onclick = generarTramaEjemplo;

// Insertar el botón sobre el panel de mensajes
const chatPanel = document.querySelector('.chat-panel');
chatPanel.insertBefore(generarTramaBtn, messagesContainer);

// Enviar mensaje al presionar Enter
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Enviar mensaje al hacer clic
sendButton.addEventListener('click', sendMessage);

// Genera una trama bancaria válida para pruebas
function generarTramaEjemplo() {
    const ahora = new Date();
    const fechaHora = ahora.getFullYear() +
                     ('0' + (ahora.getMonth() + 1)).slice(-2) +
                     ('0' + ahora.getDate()).slice(-2) +
                     ('0' + ahora.getHours()).slice(-2) +
                     ('0' + ahora.getMinutes()).slice(-2) +
                     ('0' + ahora.getSeconds()).slice(-2);

    const tramaEjemplo = fechaHora + '01' + '04' + '0001' + '01' +
                         '12345678901' + '01' + '0000012345' + '00' +
                         '000000000000' + '00';

    messageInput.value = tramaEjemplo;
    return tramaEjemplo;
}

let procesandoTrama = false;

// Envía la trama al servidor y gestiona la respuesta
function sendMessage() {
    if (procesandoTrama) return;

    const trama = messageInput.value.trim();

    if (trama.length !== 63 || !/^\d+$/.test(trama) || trama.substring(61, 63) !== '00') {
        // console.log(`Validación: longitud=${trama.length}, números=${/^\d+$/.test(trama)}, estado=${trama.substring(61, 63)}`);
    }

    procesandoTrama = true;

    if (trama) {
        fetch('/api/trama', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trama })
        })
        .then(res => res.json())
        .then(data => {
            procesandoTrama = false;

            if (data.success) {
                const estado = data.estado || '01';
                const mensaje = data.mensaje || 'Transacción aprobada';
                const monto = data.monto ? `Q. ${data.monto.toFixed(2)}` : '';
                const referenciaBanco = data.referencia || '';
                const fechaActual = new Date().toLocaleString();

                let config = {};

                switch(estado) {
                    case '01':
                        config = {
                            title: '¡Transacción Aprobada!',
                            html: `
                                <div style="text-align: left; padding: 10px 20px;">
                                    <p><strong>Estado:</strong> ${mensaje}</p>
                                    <p><strong>Referencia:</strong> ${referenciaBanco}</p>
                                    ${monto ? `<p><strong>Monto:</strong> ${monto}</p>` : ''}
                                    <p><strong>Fecha:</strong> ${fechaActual}</p>
                                </div>`,
                            icon: 'success',
                            confirmButtonColor: '#28a745',
                            confirmButtonText: 'Aceptar'
                        };
                        break;
                    case '02':
                        config = {
                            title: 'Transacción Rechazada',
                            html: `<div style="text-align: left;"><p>${mensaje}</p><p><strong>Referencia:</strong> ${referenciaBanco}</p></div>`,
                            icon: 'error',
                            confirmButtonColor: '#dc3545'
                        };
                        break;
                    case '03':
                        config = {
                            title: 'Sistema No Disponible',
                            text: mensaje,
                            icon: 'error',
                            confirmButtonColor: '#dc3545'
                        };
                        break;
                    case '04':
                        config = {
                            title: 'Operación Cancelada',
                            text: mensaje,
                            icon: 'info',
                            confirmButtonColor: '#17a2b8'
                        };
                        break;
                    case '05':
                    case '06':
                    case '07':
                    case '08':
                        config = {
                            title: 'Advertencia',
                            text: mensaje,
                            icon: 'warning',
                            confirmButtonColor: '#ffc107'
                        };
                        break;
                    case '09':
                        config = {
                            title: 'Transacción Duplicada',
                            text: mensaje,
                            icon: 'info',
                            confirmButtonColor: '#17a2b8'
                        };
                        break;
                    default:
                        config = {
                            title: 'Información',
                            text: mensaje,
                            icon: 'info',
                            confirmButtonColor: '#17a2b8'
                        };
                }

                Swal.fire(config);
            } else {
                const errorMsg = data.error || data.mensaje || 'Error al procesar la trama';
                Swal.fire({
                    title: 'Error en la transacción',
                    text: errorMsg,
                    icon: 'error',
                    confirmButtonColor: '#dc3545'
                });
            }
        })
        .catch((error) => {
            procesandoTrama = false;

            Swal.fire({
                title: 'Error de comunicación',
                html: `
                    <div style="text-align: left; padding: 10px;">
                        <p>No se pudo recibir la respuesta del servidor.</p>
                        <p><strong>IMPORTANTE:</strong> Es posible que la trama haya llegado al banco correctamente.</p>
                        <p>Verifique en el sistema bancario antes de reenviar la trama.</p>
                    </div>`,
                icon: 'warning',
                confirmButtonColor: '#ffc107'
            });
        });

        // Mostrar indicador de carga mientras se envía la trama
        const originalText = sendButton.innerHTML;
        sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        sendButton.disabled = true;

        setTimeout(() => {
            sendButton.innerHTML = originalText;
            sendButton.disabled = false;
            procesandoTrama = false;
        }, 5000);

        appendMessage(trama, false);
        messageInput.value = '';
    }
}

// Agrega un mensaje al historial del chat
function appendMessage(message, isReceived = false) {
    const div = document.createElement('div');
    div.className = 'message' + (isReceived ? ' received' : ' sent');
    div.textContent = message;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
