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
    *   [Ej: `client/src/` para componentes visuales]
    *   [Ej: `server/services/` para lógica de negocio e integraciones]
    *   [Ej: `server/routes.js` y controladores para la capa de red]
*   **Inyección de dependencias / Gestión de estado:** [Ej: Context API en Frontend, paso de instancias de DB o servicios en Backend]
*   **Manejo de errores:** [Ej: Todo manejado por un middleware central, respuestas tipadas estandarizadas]

## 🧪 Reglas de testing
*   **Frameworks:** [Ej: Jest para backend, React Testing Library para frontend]
*   **Estrategia:** [Ej: Unitarios obligatorios en `services/`, e2e opcionales]
*   **Nomenclatura:** [Ej: `*.test.js` o `*.spec.js`]
