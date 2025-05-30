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


-- Tabla de facturas
CREATE TABLE facturas (
    id_factura INT PRIMARY KEY AUTO_INCREMENT,
    id_transaccion INT,
    numero_factura VARCHAR(20) UNIQUE,
    nombre_cliente VARCHAR(100),
    email_cliente VARCHAR(100),
    telefono_cliente VARCHAR(20),
    direccion_cliente TEXT,
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(10,2),
    detalles TEXT, 
    ruta_pdf VARCHAR(255), 
    FOREIGN KEY (id_transaccion) REFERENCES transacciones_bancarias(id_transaccion)
);


DELIMITER //
DROP TRIGGER IF EXISTS bitacora_factura_generada;
CREATE TRIGGER bitacora_factura_generada
AFTER INSERT ON facturas
FOR EACH ROW
BEGIN
    INSERT INTO bitacora_transacciones (
        tipo_evento,
        estado,
        descripcion,
        id_factura,
        numero_factura,
        nombre_cliente,
        email_cliente,
        monto,
        ruta_pdf,
        id_transaccion,
        datos_adicionales
    ) VALUES (
        'FACTURA_GENERADA',
        'EXITOSO',
        CONCAT('Factura generada exitosamente: ', NEW.numero_factura, ' | Cliente: ', NEW.nombre_cliente, ' | Total: Q. ', FORMAT(NEW.total, 2)),
        NEW.id_factura,
        NEW.numero_factura,
        NEW.nombre_cliente,
        NEW.email_cliente,
        NEW.total,
        NEW.ruta_pdf,
        NEW.id_transaccion,
        JSON_OBJECT(
            'telefono_cliente', NEW.telefono_cliente,
            'direccion_cliente', NEW.direccion_cliente,
            'detalles_compra', NEW.detalles
        )
    );
END//
DELIMITER ;

-- Usuario administrador por defecto
INSERT INTO usuarios_admin (nombre, email, password, rol, estado) 
VALUES (
    'Administrador',
    'admin@tienda.com',
    'admin123',
    'admin',
    1
);







