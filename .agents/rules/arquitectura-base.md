---
description: Reglas base de arquitectura, convenciones y estilo de código para el proyecto.
---

# Reglas de Arquitectura Base

## 🛠️ Tecnologías y Frameworks principales
*   **Frontend:** [Ej: React 18, Vite...]
*   **Backend:** [Ej: Node.js, Express...]
*   **Base de datos:** [Ej: SQLite...]
*   **Otras tecnologías clave:** [Ej: Telegram Bot API, GraphQL, JWT...]

## 🎨 Reglas de estilo de código y convenciones de nomenclatura
*   **Variables y funciones:** [Ej: camelCase obligatoriamente]
*   **Componentes de UI y Clases:** [Ej: PascalCase (App.jsx, UserCard.jsx)]
*   **Constantes:** [Ej: UPPER_SNAKE_CASE_PARA_CONSTANTES]
*   **Linter y Formateo:** [Ej: Usar Prettier, ESLint, usar comillas simples, etc.]

## 🏗️ Patrones de diseño obligatorios y Estructura
*   **Estructura de carpetas:** 
    *   `client/src/components/` para componentes visuales (ej. GalleryTracker).
    *   `server/services/` para lógica de negocio e integraciones (ej. sorare.js, telegram.js).
    *   `server/routes.js` y controladores de red.
    *   `server/worker.js` para los procesos de polling en background (verificando alertas y trackeo de galería).
*   **Gestión de estado:** Context API en Frontend (ej. AuthContext).
*   **Manejo de errores:** Respuestas JSON estructuradas con `{ error: 'Message' }`.

## 🧪 Reglas de testing
*   **Frameworks:** [Ej: Jest para backend, React Testing Library para frontend]
*   **Estrategia:** [Ej: Unitarios obligatorios en `services/`, e2e opcionales]
*   **Nomenclatura:** [Ej: `*.test.js` o `*.spec.js`]
