// logs_view.js
// Script para bitácora visual con paginación, filtros, detalles expandibles y acciones sobre archivo
// No modifica funciones ni variables existentes

const LOGS_PER_PAGE = 10;
let logsData = [];
let currentPage = 1;
let currentLevel = 'all';
let searchText = '';

function getIcon(level) {
    if (level === 'info') return `<span class=\"activity-icon icon-info\">&#9432;</span>`;
    if (level === 'warn') return `<span class=\"activity-icon icon-warn\">&#9888;</span>`;
    if (level === 'error') return `<span class=\"activity-icon icon-error\">&#10060;</span>`;
    return `<span class=\"activity-icon icon-info\">&#9432;</span>`;
}
function getBadge(level) {
    if (level === 'info') return '<span class=\"badge badge-info\">INFO</span>';
    if (level === 'warn') return '<span class=\"badge badge-warn\">ADVERTENCIA</span>';
    if (level === 'error') return '<span class=\"badge badge-error\">ERROR</span>';
    return `<span class=\"badge badge-info\">${level.toUpperCase()}</span>`;
}

function renderLogs() {
    const container = document.getElementById('activityLog');
    container.innerHTML = '';
    // Filtrar por nivel y búsqueda
    let filtered = logsData.filter(log =>
        (currentLevel === 'all' || log.level === currentLevel) &&
        (searchText === '' || log.message.toLowerCase().includes(searchText))
    );
    // Paginación
    const totalPages = Math.ceil(filtered.length / LOGS_PER_PAGE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * LOGS_PER_PAGE;
    const end = start + LOGS_PER_PAGE;
    const pageLogs = filtered.slice(start, end);
    // Renderizar logs
    pageLogs.forEach((log, idx) => {
        const div = document.createElement('div');
        div.className = 'activity-item';
        div.innerHTML = `
            ${getIcon(log.level)}
            <div class=\"activity-details\">
                <div class=\"activity-header\">
                    ${getBadge(log.level)}
                    <span class=\"activity-date\">${new Date(log.timestamp).toLocaleString('es-ES')}</span>
                    <button class=\"btn-ver-mas\" data-idx=\"${start+idx}\">Ver más</button>
                </div>
                <div class=\"activity-message\">${log.message.length > 150 ? log.message.slice(0,150)+'...' : log.message}</div>
                <div class=\"activity-details-extendido\" style=\"display:none;\">${log.message}</div>
            </div>
        `;
        container.appendChild(div);
    });
    renderPagination(totalPages);
    addVerMasListeners();
}

function renderPagination(totalPages) {
    const pagDiv = document.getElementById('pagination');
    if (!pagDiv) return;
    pagDiv.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = (i === currentPage ? 'btn-page active' : 'btn-page');
        btn.onclick = () => { currentPage = i; renderLogs(); };
        pagDiv.appendChild(btn);
    }
}

function addVerMasListeners() {
    document.querySelectorAll('.btn-ver-mas').forEach(btn => {
        btn.onclick = function() {
            const idx = this.getAttribute('data-idx');
            const details = this.parentElement.parentElement.querySelector('.activity-details-extendido');
            if (details.style.display === 'none') {
                details.style.display = 'block';
                this.textContent = 'Ver menos';
            } else {
                details.style.display = 'none';
                this.textContent = 'Ver más';
            }
        };
    });
}

function onLevelFilterChange(e) {
    currentLevel = e.target.value;
    currentPage = 1;
    renderLogs();
}
function onSearchChange(e) {
    searchText = e.target.value.toLowerCase();
    currentPage = 1;
    renderLogs();
}

function descargarArchivo() {
    Swal.fire({
        title: 'Descargando logs',
        text: 'La descarga del archivo de logs comenzará en breve.',
        icon: 'info',
        timer: 1200,
        showConfirmButton: false
    });
    window.location.href = '/api/logs/download';
}
function limpiarArchivo() {
    Swal.fire({
        title: '¿Limpiar todos los logs?',
        text: 'Esta acción eliminará todos los registros y no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, limpiar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('/api/logs/clear', { method: 'POST' })
                .then(() => {
                    Swal.fire('¡Limpiado!', 'Todos los logs han sido eliminados.', 'success').then(() => location.reload());
                })
                .catch(() => {
                    Swal.fire('Error', 'No se pudieron limpiar los logs.', 'error');
                });
        }
    });
}
function eliminarArchivo() {
    Swal.fire({
        title: '¿Eliminar archivo de logs?',
        text: 'Esta acción eliminará el archivo y no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('/api/logs/delete', { method: 'POST' })
                .then(() => {
                    Swal.fire('¡Eliminado!', 'El archivo de logs ha sido eliminado.', 'success').then(() => location.reload());
                })
                .catch(() => {
                    Swal.fire('Error', 'No se pudo eliminar el archivo.', 'error');
                });
        }
    });
}

// Inicializar
fetch('/api/logs')
  .then(res => res.json())
  .then(data => {
    logsData = data;
    renderLogs();
  });

document.getElementById('levelFilter').onchange = onLevelFilterChange;
document.getElementById('searchInput').oninput = onSearchChange;
document.getElementById('btnDescargar').onclick = descargarArchivo;
document.getElementById('btnLimpiar').onclick = limpiarArchivo;
document.getElementById('btnEliminar').onclick = eliminarArchivo;
