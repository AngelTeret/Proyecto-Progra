async function register() {
    const username = document.getElementById("regUsername").value;
    const password = document.getElementById("regPassword").value;

    if (!username || !password) {
        document.getElementById("message").innerText = "Por favor completa todos los campos";
        return;
    }

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (!data.error) {
            document.getElementById("message").innerText = data.message;
            sessionStorage.setItem('userInfo', JSON.stringify({
                username: data.username,
                ip: data.ip,
                port: data.port
            }));
            setTimeout(() => toggleForm('login'), 1500);
        } else {
            document.getElementById("message").innerText = data.error;
        }
    } catch (error) {
        document.getElementById("message").innerText = "Error al conectar con el servidor";
    }
}

async function login() {
    const username = document.getElementById("logUsername").value;
    const password = document.getElementById("logPassword").value;

    if (!username || !password) {
        document.getElementById("message").innerText = "Por favor completa todos los campos";
        return;
    }

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (!data.error) {
            // Guardar información del usuario en sessionStorage
            sessionStorage.setItem('userInfo', JSON.stringify({
                username: data.username,
                ip: data.ip,
                port: data.port
            }));
            
            // Redirigir al chat
            console.log('Login exitoso, redirigiendo...');
            window.location.href = '/chat';
        } else {
            document.getElementById("message").innerText = data.error;
        }
    } catch (error) {
        console.error('Error en login:', error);
        document.getElementById("message").innerText = "Error al conectar con el servidor";
    }
}
