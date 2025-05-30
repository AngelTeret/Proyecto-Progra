// Manejo de autenticación para el panel administrativo

// Verificar si hay token guardado
window.verificarAutenticacion = function() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/admin/login';
        return false;
    }
    return true;
}

// Iniciar sesión
window.iniciarSesion = async function(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const datos = { email, password };
    
    try {
        const response = await fetch('/api/admin/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });

        const data = await response.json();
        
        if (response.ok) {
            // Guardar token y datos del usuario
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminNombre', data.usuario.nombre);
            
            // Redirigir al dashboard
            window.location.href = '/admin/dashboard';
        } else {
            mostrarError(data.error || 'Error al iniciar sesión');
        }
    } catch (error) {
        mostrarError('Error de conexión al servidor');
    }
}

// Cerrar sesión
window.cerrarSesion = function() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminNombre');
    window.location.href = '/admin/login';
}

// Mostrar mensaje de error
window.mostrarError = function(mensaje) {
    const errorDiv = document.getElementById('mensajeError');
    if (errorDiv) {
        errorDiv.textContent = mensaje;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    } else {
        alert(mensaje);
    }
}

// Configurar headers para peticiones autenticadas
window.obtenerHeadersAuth = function() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/admin/login';
        return null;
    }
    
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// Agregar event listener al formulario de login
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', iniciarSesion);
    }

    // Si no estamos en la página de login, verificar autenticación
    if (!window.location.pathname.includes('/admin/login')) {
    verificarAutenticacion();
}

// Funcionalidad para mostrar/ocultar contraseña
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
        // Cambiar el tipo de input
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Cambiar el icono del ojo
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
}
});
