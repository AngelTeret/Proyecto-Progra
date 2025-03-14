// Elementos del DOM
const loginSection = document.getElementById('loginSection');
const registerSection = document.getElementById('registerSection');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const registerSuccess = document.getElementById('registerSuccess');

// Función para mostrar el formulario de registro
function showRegister() {
    loginSection.classList.remove('active');
    registerSection.classList.add('active');
    clearMessages();
    clearForms();
}

// Función para mostrar el formulario de login
function showLogin() {
    registerSection.classList.remove('active');
    loginSection.classList.add('active');
    clearMessages();
    clearForms();
}

// Limpiar mensajes de error y éxito
function clearMessages() {
    loginError.style.display = 'none';
    registerError.style.display = 'none';
    registerSuccess.style.display = 'none';
}

// Limpiar formularios
function clearForms() {
    loginForm.reset();
    registerForm.reset();
}

// Mostrar mensaje de error
function showError(element, message) {
    element.querySelector('span').textContent = message;
    element.style.display = 'block';
}

// Mostrar mensaje de éxito
function showSuccess(element, message) {
    element.querySelector('span').textContent = message;
    element.style.display = 'block';
}

// Manejar el envío del formulario de login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Guardar información del usuario
            sessionStorage.setItem('userInfo', JSON.stringify({
                username: data.user.username,
                id: data.user.id,
                unreadMessages: data.user.unreadMessages || {}
            }));
            
            // Redirigir al chat
            window.location.href = '/chat';
        } else {
            showError(loginError, data.error || 'Error al iniciar sesión');
        }
    } catch (error) {
        console.error('Error:', error);
        showError(loginError, 'Error al conectar con el servidor');
    }
});

// Manejar el envío del formulario de registro
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            showSuccess(registerSuccess, 'Registro exitoso. Redirigiendo al login...');
            registerForm.reset();
            
            // Mostrar el formulario de login después de 2 segundos
            setTimeout(() => {
                showLogin();
            }, 2000);
        } else {
            showError(registerError, data.error || 'Error al registrar usuario');
        }
    } catch (error) {
        console.error('Error:', error);
        showError(registerError, 'Error al conectar con el servidor');
    }
});
