================================================================================
SISTEMA INTEGRAL DE GESTIÓN DE ASISTENCIA Y PRENÓMINA AUTOMOTRIZ (SIGA WIN11)
================================================================================

CONTENIDO DEL PAQUETE .ZIP:
1. README_INSTRUCCIONES.md   -> Guía paso a paso de instalación y despliegue.
2. INICIAR_SISTEMA.bat       -> Script automático para Windows 10/11 (Doble clic).
3. package.json              -> Configuración de dependencias (React, Vite, Lucide, Recharts).
4. vite.config.js            -> Configuración del servidor Vite.
5. index.html                -> Plantilla principal con soporte Windows 11 Fluent UI.
6. src/main.jsx              -> Punto de entrada de React.
7. src/INSTRUCCIONES_APP.txt -> Indicaciones para pegar o actualizar src/App.jsx.

--------------------------------------------------------------------------------
PASOS RÁPIDOS DE INSTALACIÓN EN WINDOWS 10 / 11:
--------------------------------------------------------------------------------

PASO 1: Instalar Node.js (Solo la primera vez)
- Descarga e instala la versión LTS desde: https://nodejs.org/

PASO 2: Descomprimir este archivo .ZIP
- Extrae el contenido de "SIGA_Automotriz_Win11_Proyecto.zip" en una carpeta
  (por ejemplo: C:\SIGA_Automotriz).

PASO 3: Colocar el código completo del componente en src/App.jsx
- Copia el código completo del archivo "App.jsx" desde el editor y guárdalo en:
  src/App.jsx (reemplazando el archivo base incluido).

PASO 4: Ejecutar el sistema
- Opción A (Automática en Windows): Haz doble clic sobre "INICIAR_SISTEMA.bat".
- Opción B (Desde terminal / CMD / PowerShell):
    npm install
    npm run dev

PASO 5: Abrir en el navegador
- Ingresa a: http://localhost:5173
- Para compilar para producción (Intranet / Servidor):
    npm run build
================================================================================