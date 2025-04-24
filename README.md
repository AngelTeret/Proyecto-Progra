# 🧾 Proyecto Progra

Aplicación web de comercio electrónico desarrollada con Node.js, Express y MySQL, simulando una tienda en línea

---

## 👥 Autores

- **HENRY ANGEL GABRIEL TERET HERNÁNDEZ**   — *1990-23-15274*
- **KATHERINE MICHEL TRUJILLO BARRIENTO**   — *1990-23-14951*
- **DANIELA ALEJANDRA CARRILLO GARCÍA**     — *1990-23-12614*

---

## 🎯 Funcionalidades principales
- 📦 Gestión completa de productos y categorías (alta, baja, cambios y consulta)
- 🖼️ Carga y eliminación de imágenes para los productos
- 🛍️ Carrito de compras dinámico, accesible en cualquier página
- 💳 Simulación de pagos bancarios mediante una trama estructurada
- 📈 Panel administrativo con dashboard para gestión de productos y categorías
- 📁 Logs detallados (bitácora del sistema) para seguimiento de operaciones
- 📡 Comunicación con sistema bancario Java externo vía tramas
- 📱 Interfaz responsiva compatible con dispositivos móviles y escritorio

## 🛠️ Tecnologías utilizadas
- **Backend:** Node.js, Express.js
- **Base de datos:** MySQL
- **Frontend:** HTML5, CSS3 (Flexbox), JavaScript ES6+
- **Notificaciones:** SweetAlert2
- **Carga de archivos:** Multer
- **Logs:** Winston
- **Comunicación bancaria:** Java .class vía Child Process

---

## ⚙️ Instalación

1. **Clona el repositorio:**
   git clone <URL_DEL_REPO>
   cd "Proyecto Progra"

2. **Instala dependencias:**
   npm install

3. **Configura la base de datos y variables de entorno (.env):**

   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_DATABASE=chatapp
   PORT=3000

4. **Ejecuta el script SQL** para crear las tablas (users, productos, categorias, transacciones, etc.).
5. **Inicia el servidor:**

   npm start
   # o para desarrollo
   npm run dev

6. **Accede a la app:**
   [http://localhost:3000](http://localhost:3000)

---

## 📁 Estructura del proyecto
```bash
Proyecto Progra/
├── public/                # Archivos estáticos (JS, CSS, imágenes)
│   ├── js/
│   ├── styles/
│   ├── img/
│   └── uploads/
│       └── productos/
├── src/                  # Lógica del servidor y controladores
│   ├── controllers/
│   ├── modelo/           # Archivos Java (.java / .class)
│   ├── logs/             # Bitácora del sistema
│   ├── database.js
│   ├── routes.js
│   └── config.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

---

## 🔁 Flujo completo del sistema de pagos bancarios

### 🧩 ¿Qué es una "trama bancaria"?

Una **trama bancaria** es un mensaje estructurado de exactamente 63 caracteres que encapsula toda la información relevante para una transacción bancaria electrónica. Este mensaje es el medio de comunicación entre el sistema de la tienda y el sistema bancario externo (implementado en Java), siguiendo un protocolo estricto y seguro.

#### **Estructura de la trama**
Cada posición de la trama tiene un significado y formato específico. Un ejemplo típico de estructura puede ser:

| Posición | Longitud | Campo                | Descripción                                      |
|----------|----------|----------------------|--------------------------------------------------|
| 1-2      | 2        | Código de operación  | Tipo de transacción (por ejemplo, "01" = pago)   |
| 3-12     | 10       | Fecha/Hora           | AAAAMMDDHH (año, mes, día, hora)                 |
| 13-22    | 10       | Código de cliente    | Identificador único del cliente                  |
| 23-32    | 10       | Monto                | Monto total de la transacción, sin decimales     |
| 33-44    | 12       | Número de referencia | Único para cada transacción                      |
| 45-63    | 19       | Relleno/otros campos | Reservado o para ampliaciones futuras            |

**Ejemplo de trama:**
```
01 2025042301 0000123456 0000015000 202504230001 0000000000000000000
```

#### **Validaciones y armado de la trama**
- **Longitud fija:** La trama siempre debe tener 63 caracteres, usando ceros a la izquierda o espacios para rellenar campos.
- **Campos obligatorios:** El sistema valida que cada campo esté presente y en el formato correcto (por ejemplo, el monto debe ser numérico y positivo).
- **Referencia única:** El backend genera un número de referencia único para cada transacción, evitando duplicados.
- **Integridad:** Antes de enviar, se verifica que la suma de los campos coincida con el total esperado y que no haya manipulación en el frontend.

#### **Comunicación con el sistema bancario**
1. **Generación:** El backend arma la trama y la envía a un proceso Java externo usando sockets TCP/IP.
2. **Transmisión:** El proceso Java conecta con el servidor bancario y transmite la trama.
3. **Recepción:** El servidor bancario responde con otra trama de 63 caracteres, que incluye un código de resultado y, opcionalmente, mensajes adicionales.

#### **Ejemplo de flujo completo**
1. El usuario confirma el pago en la tienda.
2. El backend arma la trama:
   - Código operación: `01` (pago)
   - Fecha/hora: `2025042301`
   - Cliente: `0000123456`
   - Monto: `0000015000` (Q150.00)
   - Referencia: `202504230001`
   - Relleno: `0000000000000000000`
3. Se envía la trama al sistema bancario.
4. El banco responde con:
   - `01...` (aprobada)
   - `02...` (rechazada)
   - `05...` (fondos insuficientes)
   - etc.
5. El backend interpreta la respuesta y:
   - Si es exitosa, registra la transacción, vacía el carrito y muestra un mensaje de éxito al usuario.
   - Si es error, muestra un mensaje claro y permite reintentar.

#### **Códigos de respuesta y manejo en frontend**
- `01`: Éxito (transacción aprobada)
- `02`: Rechazada
- `03`: Sistema fuera de servicio
- `04`: Cancelada por usuario
- `05`: Sin fondos suficientes
- `06`: Cliente no identificado
- `07`: Empresa/Sucursal inválida
- `08`: Monto inválido
- `09`: Transacción duplicada

Cada código es interpretado en el frontend con una alerta visual personalizada (SweetAlert2), colores e iconos distintos, y acciones específicas (volver a intentar, limpiar carrito, etc.).

#### **Seguridad y trazabilidad**
- **No se transmiten datos sensibles** como números de tarjeta reales.
- **Toda la información de la trama y la respuesta** se registra en la base de datos para auditoría y seguimiento.
- **El sistema valida que la trama no sea manipulada** desde el frontend y que el monto corresponda al carrito.
- **Errores y transacciones sospechosas** quedan registradas en la bitácora del sistema.

#### **Ventajas de este esquema**
- Permite simular un entorno bancario real para pruebas y educación.
- Es fácilmente integrable con sistemas bancarios reales que usen protocolos similares.
- La estructura fija y validaciones estrictas minimizan errores y fraudes.

---

## 🗂️ Diagramas del sistema

### Diagrama visual de la estructura de la trama bancaria

Este diagrama representa de forma visual cómo se distribuyen los campos dentro de la trama bancaria de 63 caracteres. Cada bloque muestra el campo, su longitud y propósito, facilitando la comprensión de cómo se arma y valida la trama.


```mermaid
flowchart LR
    A[1-2 Codigo Operacion 2] --> B[3-12 Fecha/Hora 10]
    B --> C[13-22 Codigo Cliente 10]
    C --> D[23-32 Monto 10]
    D --> E[33-44 Referencia 12]
    E --> F[45-63 Relleno/Otros 19]
```


**Explicación:**
- Cada bloque representa un campo de la trama, con su posición y longitud.
- Todos los campos juntos suman exactamente 63 caracteres.
- El relleno final permite futuras ampliaciones o información adicional.

---

### Diagrama de flujo de la trama bancaria

Este diagrama ilustra el flujo completo de la comunicación de la trama bancaria, desde que el usuario confirma el pago hasta la respuesta final del banco y la notificación al usuario. Permite visualizar cómo viaja la información y cómo cada componente interactúa en el proceso.


```mermaid
sequenceDiagram
    participant Usuario
    participant Frontend
    participant Backend
    participant JavaBank
    participant Banco

    Usuario->>Frontend: Confirma pago
    Frontend->>Backend: Envía datos del carrito
    Backend->>Backend: Arma trama bancaria (63 caracteres)
    Backend->>JavaBank: Envía trama por socket TCP
    JavaBank->>Banco: Transmite trama bancaria
    Banco-->>JavaBank: Responde con trama de resultado
    JavaBank-->>Backend: Devuelve trama de respuesta
    Backend->>Frontend: Interpreta código y responde
    Frontend->>Usuario: Muestra resultado (SweetAlert2)
```


**Explicación:**
- El usuario inicia el pago desde el frontend.
- El backend arma la trama y la envía mediante un proceso Java.
- El sistema bancario responde y el resultado es mostrado al usuario.
- Todo el proceso es seguro, trazable y validado.

---

### Diagrama de arquitectura general del sistema

Este diagrama muestra la arquitectura general del sistema, resaltando la interacción entre los diferentes componentes: usuario, frontend, backend, base de datos, sistema bancario Java y bitácora de logs. Es útil para entender la infraestructura y los puntos de integración principales.


```mermaid
graph TD
    Usuario --> Frontend
    Frontend --> Backend
    Backend --> BaseDeDatos
    Backend --> JavaClass
    JavaClass --> BancoExterno
    Backend --> BitacoraLogs
```


**Explicación:**
- El usuario interactúa con el frontend en su navegador.
- El backend gestiona la lógica, accede a la base de datos y se comunica con el sistema bancario externo vía Java.
- Los logs y bitácoras permiten auditoría y trazabilidad de todo el sistema.

---

# 💬 Chat de Tramas Bancarias

## 📝 Propósito y características
El **Chat de Tramas Bancarias** es una interfaz especializada que permite el envío directo de tramas bancarias al sistema, sin necesidad de pasar por el flujo de compra tradicional. Esta herramienta está diseñada principalmente para:

- **Pruebas técnicas:** Permite a los desarrolladores y testers enviar tramas predefinidas para validar el comportamiento del sistema bancario.
- **Depuración:** Facilita el diagnóstico de problemas en la comunicación con el sistema bancario.
- **Demostraciones:** Ideal para mostrar el funcionamiento del protocolo de comunicación bancaria sin necesidad de crear pedidos reales.
- **Monitoreo:** Permite verificar la disponibilidad y respuesta del sistema bancario en tiempo real.

## 🔄 Flujo de funcionamiento del Chat de Tramas

```mermaid
sequenceDiagram
    actor Usuario
    participant Chat as Chat Interface
    participant Backend as Express Backend
    participant PagoController as Controlador de Pagos
    participant UtilsBanco as Utilidades Bancarias
    participant Banco as Sistema Bancario (Java)
    
    Usuario->>Chat: Ingresa trama de 63 dígitos
    Chat->>Chat: Validación local (formato, longitud)
    Usuario->>Chat: Presiona enviar
    Chat->>Backend: Petición HTTP POST a /api/trama
    Backend->>PagoController: Procesa trama (mismo flujo que pago.html)
    PagoController->>UtilsBanco: Envía trama al sistema bancario
    UtilsBanco->>Banco: Envía trama mediante Child Process
    Banco-->>UtilsBanco: Devuelve respuesta (trama con estado)
    UtilsBanco-->>PagoController: Devuelve respuesta formateada
    PagoController-->>Backend: Procesa respuesta (éxito/error)
    Backend-->>Chat: Respuesta JSON con resultado
    Chat-->>Usuario: Muestra SweetAlert con resultado y detalles
```

## 🧩 Componentes principales del sistema

### 1. **Interfaz de Chat (`chat.html` y `chat.js`)**
- **Vista minimalista** enfocada en la entrada y visualización de tramas bancarias
- **Validación en tiempo real** de la estructura y formato de la trama
- **Botón de generación automática** de tramas válidas con la fecha actual
- **Visualización de tramas enviadas y recibidas** como mensajes en la interfaz
- **Feedback visual mediante SweetAlert2** que muestra el resultado detallado de la transacción

### 2. **Endpoint dedicado en el Backend (`/api/trama`)**
- **Recibe tramas en formato JSON** mediante peticiones POST
- **Reutiliza la lógica existente** de `pagoController.js` y `utilsBanco.js`
- **Adapta la respuesta** al formato esperado por la interfaz de chat
- **Procesa la respuesta del banco** y extrae información relevante (estado, referencia, etc.)

### 3. **Gestión de respuestas y errores**
- **Sistema de códigos de estado** para interpretar la respuesta del banco (01-09)
- **Alertas visuales personalizadas** según el tipo de respuesta
- **Manejo de errores de comunicación** que informa cuando una trama pudo haber llegado al banco pero no se recibió confirmación
- **Prevención de envíos duplicados** mediante bloqueo del botón durante el procesamiento

## 📋 Especificaciones técnicas

### Validaciones implementadas
- **Longitud exacta de 63 dígitos** verificada antes de enviar
- **Solo caracteres numéricos** (0-9) permitidos
- **Estado inicial '00'** al final de la trama para envíos nuevos
- **Formato de fecha válido** en los primeros 14 caracteres (AAAAMMDDHHMMSS)
- **Prevención de múltiples envíos** mientras se procesa una trama

### Estados de respuesta y visualización

| Código | Estado | Visualización | Descripción |
|--------|--------|---------------|-------------|
| 01 | Aprobada | ✅ Verde, icono check | Transacción exitosa |
| 02 | Rechazada | ❌ Rojo, icono error | Transacción rechazada por el banco |
| 03 | Sistema fuera de servicio | ❌ Rojo, icono error | Banco no disponible |
| 04 | Cancelada por usuario | ℹ️ Azul, icono info | El usuario canceló la operación |
| 05 | Sin fondos suficientes | ⚠️ Amarillo, icono warning | Fondos insuficientes |
| 06 | Cliente no identificado | ⚠️ Amarillo, icono warning | Cliente no encontrado |
| 07 | Empresa/Sucursal inválida | ⚠️ Amarillo, icono warning | Datos de comercio incorrectos |
| 08 | Monto inválido | ⚠️ Amarillo, icono warning | Problema con el monto |
| 09 | Transacción duplicada | ℹ️ Azul, icono info | Trama ya procesada anteriormente |

### Estructura de la respuesta visual (SweetAlert2)
```html
<div style="text-align: left; padding: 10px 20px;">
   <p><strong>Estado:</strong> Transacción aprobada</p>
   <p><strong>Referencia:</strong> 123456789012</p>
   <p><strong>Monto:</strong> $123.45</p>
   <p><strong>Fecha:</strong> 23/4/2025, 9:15:24 p.m.</p>
</div>
```

## 🔧 Diagrama de componentes del Chat de Tramas

```mermaid
graph TD
    A[Chat Interface] -->|1. Validación local| B[Generador de Tramas]
    A -->|2. POST /api/trama| C[Express Endpoint]
    C -->|3. Procesa trama| D[pagoController.js]
    D -->|4. Envía al banco| E[utilsBanco.js]
    E -->|5. Spawns proceso| F[Java ClienteBanco]
    F -->|6. Conexión TCP/IP| G[Servidor Banco]
    G -->|7. Respuesta| F
    F -->|8. Respuesta| E
    E -->|9. Procesa respuesta| D
    D -->|10. Formato JSON| C
    C -->|11. Respuesta HTTP| A
    A -->|12. Muestra resultado| H[SweetAlert2]
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style G fill:#bbf,stroke:#333,stroke-width:2px
    style H fill:#bfb,stroke:#333,stroke-width:2px
```

## 📊 Ventajas y casos de uso

### Ventajas del Chat de Tramas
- **Depuración más rápida** de problemas de comunicación bancaria
- **Testeo directo** sin necesidad de crear productos o completar flujos de compra
- **Interfaz dedicada** para personal técnico y administradores
- **Feedback visual consistente** con el resto del sistema (mismo estilo que en pago.html)
- **Reutilización de código** mediante el aprovechamiento de los componentes existentes

### Casos de uso típicos
1. **Desarrollo y pruebas:** Envío de tramas específicas para verificar el manejo de diferentes escenarios (fondos insuficientes, transacción duplicada, etc.)
2. **Demostración a clientes:** Visualización del proceso de comunicación bancaria sin afectar datos reales
3. **Diagnóstico en producción:** Verificación rápida de la conectividad con el sistema bancario
4. **Capacitación:** Herramienta educativa para comprender el funcionamiento del protocolo bancario

## 🔐 Consideraciones de seguridad
- El chat está configurado como **acceso público** pero puede restringirse a usuarios administradores si es necesario
- Las tramas contienen **validaciones estrictas** para evitar inyecciones o ataques
- El sistema registra en los **logs todas las operaciones** para auditoría
- El cliente valida **localmente el formato** para reducir carga innecesaria al servidor

## 🔍 Detalles de implementación técnica

### Formato de trama bancaria
La trama consiste en una cadena de 63 caracteres numéricos estructurados de la siguiente manera:
- **Caracteres 1-14:** Fecha y hora en formato AAAAMMDDHHMMSS (ej. 20250423213000 para 23/04/2025 21:30:00)
- **Caracteres 15-26:** Número de referencia única para la transacción (12 dígitos)
- **Caracteres 27-36:** Identificador del comercio/sucursal (10 dígitos)
- **Caracteres 37-46:** Identificador del cliente (10 dígitos)
- **Caracteres 47-60:** Monto con 2 decimales, sin punto decimal (ej. 000000012345 para $123.45)
- **Caracteres 61-63:** Código de estado (00 para envío inicial, 01-09 para respuestas)

### Flujo detallado del procesamiento
1. **Creación manual o automática de trama:**
   - El usuario puede ingresar manualmente una trama de 63 dígitos
   - Alternativamente, puede generarla con el botón "Generar Trama" que completa la fecha actual y valores aleatorios válidos

2. **Validación en el cliente:**
   - Se verifica que la trama tenga exactamente 63 dígitos
   - Se comprueba que solo contenga caracteres numéricos
   - Se confirma que el estado sea "00" para envíos nuevos
   - Se valida que el formato de fecha en los primeros 14 caracteres sea correcto

3. **Envío al backend:**
   - La trama se envía mediante una petición POST al endpoint `/api/trama`
   - Se bloquea el botón de envío para prevenir múltiples envíos mientras se procesa

4. **Procesamiento en el servidor:**
   - El backend recibe la trama y utiliza el mismo controlador de pagos existente
   - Se reutiliza la lógica de procesamiento que ya se usa para los pagos regulares

5. **Comunicación con el sistema bancario:**
   - Se genera un proceso Java para enviar la trama al banco
   - El sistema bancario procesa la solicitud y devuelve una respuesta

6. **Visualización del resultado:**
   - Se muestra una alerta estilizada con SweetAlert2 con el resultado
   - El color e ícono varían según el código de respuesta del banco
   - Se muestran los detalles importantes: estado, referencia, monto y fecha


## 🔗 Rutas importantes del sistema

### Sitio principal (Frontend)
| Ruta              | Descripción                        |
|-------------------|------------------------------------|
| `/`               | Página principal                   |
| `/productos`      | Listado de productos               |
| `/carrito`        | Vista del carrito de compras       |
| `/pago`           | Página para finalizar la compra    |
| `/bitacora`/`/logs` | Visualización de eventos del sistema |

### Panel de administración
| Ruta                  | Descripción                      |
|-----------------------|----------------------------------|
| `/admin/login`        | Acceso al panel administrativo   |
| `/admin/dashboard`    | Panel de control                 |
| `/admin/productos`    | Gestión de productos             |
| `/admin/categorias`   | Gestión de categorías            |

---

### Vistas principales (Frontend)
- **Landing:** [http://localhost:3000/](http://localhost:3000/)
- **Productos:** [http://localhost:3000/productos](http://localhost:3000/productos)
- **Carrito:** [http://localhost:3000/carrito](http://localhost:3000/carrito)
- **Pago:** [http://localhost:3000/pago](http://localhost:3000/pago)
- **Bitácora (logs visuales):** [http://localhost:3000/bitacora](http://localhost:3000/bitacora) o [http://localhost:3000/logs](http://localhost:3000/logs)


### Panel administrativo (requiere autenticación)
- **Ingreso a vistas administrativas:**
  - **Login:** [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
  - **Dashboard:** [http://localhost:3000/admin/dashboard](http://localhost:3000/admin/dashboard)
  - **Gestión de productos:** [http://localhost:3000/admin/productos](http://localhost:3000/admin/productos)
  - **Gestión de categorías:** [http://localhost:3000/admin/categorias](http://localhost:3000/admin/categorias)


