# COINSI · Control de asistencia (React)

Aplicación web para registrar la asistencia de un congreso escaneando el código de barras del DNI
con un lector USB o Bluetooth. Exporta reportes PDF y CSV y guarda todo en el navegador.

## Requisitos

- Node.js 18 o superior.
- Chrome (recomendado), Edge o Firefox actualizado.

## Puesta en marcha

```bash
cd asistencia
npm install
npm run dev
```

## API del proyecto

El frontend usa por defecto la ruta relativa `/api/buscar/dni/{dni}`. En desarrollo, Vite la
redirige al backend Express del repositorio. En otra terminal, desde la raíz del proyecto:

```bash
npm install
npm start
```

El backend toma `URL_RENIEC` del `.env` (`https://api.reniec.cloud/dni/`) y responde
`{ "datos": { ... } }`; el frontend desenvuelve esa forma automáticamente y no necesita token.
Si la API falla, el registro continúa con el ingreso manual.

## Escanear con la cámara

El botón **Escanear con cámara** lee el reverso del DNI con ZXing, sin depender de
`BarcodeDetector`:

- **Code 39** lineal del borde derecho del reverso: contiene el número de DNI (lectura más rápida).
- **PDF417** de la parte inferior del reverso, como alternativa.

La cámara requiere Chrome/Edge y un contexto seguro: `http://localhost` o HTTPS. En una IP de
LAN por HTTP el navegador bloquea la cámara. El video se procesa en el dispositivo y no se guarda.

Abre `http://localhost:5174`. Para generar la versión de producción:

```bash
npm run build
npm run preview
```

El resultado queda en `asistencia/dist`. Las librerías de PDF (`jspdf` y `jspdf-autotable`) se
incluyen en el paquete, por lo que la exportación funciona sin Internet.

## Despliegue en Vercel

La carpeta `asistencia` es un proyecto Vite autónomo y incluye una función serverless en
`api/buscar/dni/[dni].js` que consulta RENIEC sin exponer tokens.

Desde `asistencia`:

```bash
npx vercel login
npx vercel --prod
```

Si prefieres hacerlo desde el panel de Vercel, importa el repositorio y configura:

- **Root Directory**: `asistencia`
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

Opcionalmente define `URL_RENIEC` en las variables de entorno del proyecto; si no existe se usa
`https://api.reniec.cloud/dni/`. La cámara funciona en Vercel porque el sitio se sirve por HTTPS.

Cada navegador guarda sus asistencias en `localStorage`: dos equipos no comparten datos. Para
consolidar jornadas, exporta el CSV/PDF de cada equipo o restaura un respaldo JSON.

## Uso rápido

1. **Evento**: en el asistente inicial o en Ajustes define el nombre del evento, el lugar y la
   sesión/día activo.
2. **Padrón**: en la pestaña Padrón importa un CSV con columnas `DNI`, `Nombres`, `Escuela`.
   Puedes descargar una plantilla desde la misma pantalla.
3. **RENIEC (opcional)**: en Ajustes escribe la URL del proveedor autorizado con el marcador
   `{dni}` y tu token Bearer. Ejemplo:
   `https://api.apis.net.pe/v2/reniec/dni?numero={dni}`. Si no hay API o falla, el sistema pide
   el nombre y registra la asistencia como **Manual**.
4. **Escaneo**: conecta el lector en modo teclado, haz clic en el campo grande o presiona `F2` y
   escanea el DNI. Cada lectura muestra una tarjeta verde, ámbar o roja con un pitido distinto.
5. **Exportar**: usa el botón Exportar o `Ctrl + P`. Elige sesión, orden y orientación; revisa la
   vista previa y descarga el PDF (o CSV con BOM para Excel). También puedes imprimir como respaldo.
6. **Respaldo**: en Ajustes descarga el JSON completo y restáuralo en otro equipo cuando lo
   necesites.

## Datos y privacidad

Todo se guarda en `localStorage` del navegador. El token de RENIEC también queda solo en este
dispositivo. La información se trata según la Ley 29733 de Protección de Datos Personales del Perú:
úsala únicamente para el congreso y elimínala al finalizar (Ajustes → Borrar todos los datos).
