// Funciones para el dashboard administrativo

// Variables globales para los gráficos
let categoriasChart = null;
let bitacoraChart = null;

// Verificar si hay un token válido
function verificarAutenticacion() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        console.log('No hay token de autenticación');
        window.location.href = '/admin/login';
        return false;
    }
    console.log('Token de autenticación encontrado');
    return true;
}

// Cerrar sesión
function cerrarSesion() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminNombre');
    window.location.href = '/admin/login';
}

// Cargar datos del dashboard
async function cargarDatosDashboard() {
    try {
        console.log('Iniciando carga de datos del dashboard');
        const token = localStorage.getItem('adminToken');
        
        console.log('Realizando petición al servidor...');
        const response = await fetch('/api/admin/dashboard', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Respuesta recibida:', response.status);
        const data = await response.json();
        console.log('Datos recibidos:', data);

        if (response.ok) {
            actualizarInterfaz(data);
        } else {
            console.error('Error al cargar datos:', data.error);
            alert('Error al cargar los datos del dashboard: ' + (data.error || 'Error desconocido'));
        }
    } catch (error) {
        console.error('Error al cargar datos del dashboard:', error);
        alert('Error al conectar con el servidor');
    }
}

// Inicializar un gráfico
function inicializarGrafico(canvas, config) {
    if (!canvas) {
        console.error('No se encontró el elemento canvas');
        return null;
    }

    try {
        return new Chart(canvas, config);
    } catch (error) {
        console.error('Error al crear el gráfico:', error);
        return null;
    }
}

// Actualizar la interfaz con los datos
function actualizarInterfaz(data) {
    try {
        console.log('Actualizando interfaz con datos:', data);
        
        // Actualizar resumen de productos
        const resumenProductos = data.productos?.resumen || {
            total_productos: 0,
            productos_activos: 0,
            productos_agotados: 0,
            stock_total: 0
        };
        
        document.getElementById('totalProductos').textContent = resumenProductos.total_productos || 0;
        document.getElementById('productosActivos').textContent = resumenProductos.productos_activos || 0;
        document.getElementById('productosAgotados').textContent = resumenProductos.productos_agotados || 0;
        document.getElementById('stockTotal').textContent = resumenProductos.stock_total || 0;

        // Obtener los elementos canvas
        const categoriasCanvas = document.getElementById('categoriasChart');
        const bitacoraCanvas = document.getElementById('bitacoraChart');

        // Destruir gráficos existentes si los hay
        if (categoriasChart) {
            categoriasChart.destroy();
            categoriasChart = null;
        }
        if (bitacoraChart) {
            bitacoraChart.destroy();
            bitacoraChart = null;
        }

        // Preparar datos para el gráfico de categorías
        const categorias = data.categorias || [];
        console.log('Creando gráfico de categorías con:', categorias);
        
        if (categoriasCanvas && categorias.length > 0) {
            const configCategorias = {
                type: 'bar',
        data: {
                    labels: categorias.map(c => c.categoria || 'Sin nombre'),
            datasets: [{
                        label: 'Productos por Categoría',
                        data: categorias.map(c => c.total_productos || 0),
                        backgroundColor: '#28a745'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                }
            }
        }
                }
            };
            categoriasChart = inicializarGrafico(categoriasCanvas, configCategorias);
        }

        // Preparar datos para el gráfico de bitácora
        const eventosBitacora = data.bitacora?.eventos24h || [];
        console.log('Creando gráfico de bitácora con:', eventosBitacora);
        
        if (bitacoraCanvas && eventosBitacora.length > 0) {
            const configBitacora = {
                type: 'pie',
        data: {
                    labels: eventosBitacora.map(e => e.tipo_evento || 'Sin tipo'),
            datasets: [{
                        data: eventosBitacora.map(e => e.total || 0),
                        backgroundColor: [
                            '#007bff', '#28a745', '#dc3545', '#ffc107',
                            '#17a2b8', '#6c757d', '#343a40', '#f8f9fa'
                        ]
            }]
        },
        options: {
            responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                }
            }
        }
            };
            bitacoraChart = inicializarGrafico(bitacoraCanvas, configBitacora);
        }

        console.log('Interfaz actualizada exitosamente');
    } catch (error) {
        console.error('Error al actualizar la interfaz:', error);
        alert('Error al mostrar los datos en la interfaz');
    }
}

// Inicializar dashboard
document.addEventListener('DOMContentLoaded', () => {
    console.log('Página cargada, iniciando dashboard');
    
    if (verificarAutenticacion()) {
    // Mostrar nombre del administrador
    const nombreAdmin = localStorage.getItem('adminNombre');
    const spanNombreAdmin = document.getElementById('nombreAdmin');
    if (spanNombreAdmin && nombreAdmin) {
        spanNombreAdmin.textContent = nombreAdmin;
    }

    // Cargar datos iniciales
    cargarDatosDashboard();
    }
});
