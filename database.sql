CREATE DATABASE chatapp;

-- Crear las tablas 
USE chatapp;

-- Tabla de productos
CREATE TABLE productos (
    id_producto INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 0,
    imagen VARCHAR(255),
    destacado BOOLEAN DEFAULT FALSE,
    estado ENUM('activo', 'inactivo', 'agotado') DEFAULT 'activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de categorías
CREATE TABLE categorias (
    id_categoria INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT,
    estado BOOLEAN DEFAULT TRUE
);

-- Tabla relación productos-categorías
CREATE TABLE producto_categoria (
    id_producto INT,
    id_categoria INT,
    PRIMARY KEY (id_producto, id_categoria),
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
    FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria)
);


-- Tabla de usuarios administrativos
CREATE TABLE usuarios_admin (
    id_usuario INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol ENUM('admin', 'editor') DEFAULT 'editor',
    estado BOOLEAN DEFAULT TRUE,
    ultimo_acceso TIMESTAMP
);


-- Tabla para transacciones bancarias detalladas
CREATE TABLE transacciones_bancarias (
    id_transaccion INT PRIMARY KEY AUTO_INCREMENT,
    tipo_transaccion VARCHAR(2),
    canal_terminal VARCHAR(2),
    id_empresa VARCHAR(4),
    id_sucursal VARCHAR(2),
    codigo_cliente VARCHAR(11),
    tipo_moneda VARCHAR(2),
    monto_entero VARCHAR(10),
    monto_decimal VARCHAR(2),
    numero_referencia VARCHAR(12),
    fecha_hora_trama VARCHAR(14),
    estado_banco VARCHAR(2),
    descripcion_estado VARCHAR(100),
    trama_enviada VARCHAR(64),
    trama_recibida VARCHAR(64),
    -- Información de contacto
    nombre_cliente VARCHAR(100),
    email_cliente VARCHAR(100),
    telefono_cliente VARCHAR(20),
    direccion_cliente TEXT,
    fecha_transaccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


INSERT INTO usuarios_admin (nombre, email, password, rol, estado) 
VALUES (
    'Administrador',
    'admin@tienda.com',
    'admin123',
    'admin',
    1
);

