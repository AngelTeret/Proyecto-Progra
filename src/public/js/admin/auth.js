// Manejo de autenticación para el panel administrativo

// Verificar si hay token guardado
function verificarAutenticacion() {
    const token = localStorage.getItem('adminToken');
    if (!token && !window.location.href.includes('login.html')) {
        window.location.href = '/views/admin/login.html';
        return false;
    }
    return true;
}

// Iniciar sesión
async function iniciarSesion(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    console.log('Intentando iniciar sesión con:', { email }); // Log para debugging
    
    try {
        const response = await fetch('/api/admin/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        console.log('Respuesta del servidor:', response.status); // Log para debugging

        const data = await response.json();
        console.log('Datos de respuesta:', data); // Log para debugging
        
        if (response.ok) {
            console.log('Login exitoso'); // Log para debugging
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminNombre', data.nombre);
            window.location.href = '/views/admin/dashboard.html';
        } else {
            console.log('Error en login:', data); // Log para debugging
            mostrarError(data.mensaje || data.error || 'Error al iniciar sesión');
        }
    } catch (error) {
        console.error('Error de conexión:', error);
        mostrarError('Error de conexión al servidor');
    }
}

// Cerrar sesión
function cerrarSesion() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminNombre');
    window.location.href = '/views/admin/login.html';
}

// Mostrar mensaje de error
function mostrarError(mensaje) {
    console.log('Error:', mensaje); // Log para debugging
    const errorDiv = document.getElementById('mensajeError');
    if (errorDiv) {
        errorDiv.textContent = mensaje;
        errorDiv.style.display = 'block';
    } else {
        console.error('No se encontró el elemento mensajeError');
    }
    if (errorDiv) {
        errorDiv.textContent = mensaje;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
}

// Configurar headers para peticiones autenticadas
function obtenerHeadersAuth() {
    const token = localStorage.getItem('adminToken');
    console.log('Token almacenado:', token);
    
    if (!token) {
        console.error('No hay token almacenado');
        window.location.href = '/views/admin/login.html';
        return {};
    }
    
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// Verificar autenticación al cargar cualquier página admin
if (!window.location.href.includes('login.html')) {
    verificarAutenticacion();
}
