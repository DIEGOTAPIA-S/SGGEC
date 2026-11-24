# SGCN - Sistema de Gestión de Continuidad del Negocio
**Versión Portable / Autónoma (Zero-Backend)**

Este repositorio contiene el código fuente de la herramienta SGCN v2.1. 

## Arquitectura
La plataforma ha sido construida como una **Single Page Application (SPA)** utilizando:
- **React 18**
- **Vite** (con `vite-plugin-singlefile`)
- **Leaflet & Turf.js** (Para análisis y renderizado geoespacial)

## Características de Seguridad (Auditoría)
Esta versión está diseñada para funcionar de forma **100% aislada (Air-gapped)** del lado del cliente.
- No utiliza bases de datos remotas.
- No cuenta con API backend ni puertos abiertos.
- Los datos cargados (Excel) se anonimizan en tiempo real y se almacenan temporalmente en la memoria volátil del navegador (`sessionStorage`).
- Al cerrar la pestaña, toda la información confidencial se destruye automáticamente.

---

## 💻 Instrucciones para USUARIOS (Uso en PC del Trabajo)
Para utilizar la aplicación en cualquier computador de la compañía, **NO requiere instalar absolutamente nada** (Ni Node.js, ni bases de datos, ni servidores locales).

1. Abra la carpeta `dist`.
2. Haga **doble clic** en el archivo `SGCN-App.html` (o `index.html`).
3. El sistema se abrirá automáticamente en su navegador web (Chrome, Edge, etc.) con cartografía **Esri ArcGIS World Street Map** compatible con ejecución local (`file:///`) y estará listo para usarse.

---

## 🛠️ Instrucciones para AUDITORES (Auditoría de Código Fuente)
Esta sección es **exclusiva para los ingenieros que deseen auditar el código fuente**. Si desea recompilar la aplicación desde cero:

1. Asegúrese de tener Node.js instalado.
2. Instale las dependencias locales en la raíz del proyecto:
   ```bash
   npm install
   ```
3. Compile la aplicación:
   ```bash
   npm run build
   ```
4. El ejecutable autónomo se generará automáticamente en `dist/SGCN-App.html` y `dist/index.html`.
