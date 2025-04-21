// Funciones para el dashboard administrativo

// Verificar si hay un token válido
function verificarAutenticacion() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/views/admin/login.html';
        return;
    }
}

// Cerrar sesión
function cerrarSesion() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminNombre');
    window.location.href = '/views/admin/login.html';
}

// Cargar datos del dashboard
async function cargarDatosDashboard() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/admin/dashboard', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            actualizarInterfaz(data);
        } else {
            console.error('Error al cargar datos del dashboard');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Actualizar la interfaz con los datos
function actualizarInterfaz(data) {
    // Actualizar tarjetas principales
    document.getElementById('ventasDia').textContent = `$${data.ventasDia.toFixed(2)}`;
    
    document.getElementById('productosActivos').textContent = data.productosActivos;
    document.getElementById('totalClientes').textContent = data.totalClientes;

    // Actualizar gráfico de ventas
    const ventasChart = new Chart(document.getElementById('ventasChart'), {
        type: 'line',
        data: {
            labels: data.ventasUltimos7Dias.map(v => new Date(v.fecha).toLocaleDateString()),
            datasets: [{
                label: 'Ventas',
                data: data.ventasUltimos7Dias.map(v => v.total),
                borderColor: '#007bff',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Actualizar gráfico de productos más vendidos
    const productosChart = new Chart(document.getElementById('productosChart'), {
        type: 'bar',
        data: {
            labels: data.productosMasVendidos.map(p => p.nombre),
            datasets: [{
                label: 'Unidades vendidas',
                data: data.productosMasVendidos.map(p => p.total_vendido),
                backgroundColor: '#28a745'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Inicializar dashboard
document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacion();
    
    // Agregar evento al botón de cerrar sesión
    const btnCerrarSesion = document.getElementById('cerrarSesion');
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', cerrarSesion);
    }

    // Mostrar nombre del administrador
    const nombreAdmin = localStorage.getItem('adminNombre');
    const spanNombreAdmin = document.getElementById('nombreAdmin');
    if (spanNombreAdmin && nombreAdmin) {
        spanNombreAdmin.textContent = nombreAdmin;
    }

    // Cargar datos iniciales
    cargarDatosDashboard();
});
