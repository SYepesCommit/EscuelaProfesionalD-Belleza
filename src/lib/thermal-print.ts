'use client';

/**
 * 1. Impresión Térmica en Ventana Independiente (Popup 72mm):
 * A diferencia de un iframe oculto dentro de una página de 100vh (donde el spooler de Windows
 * hereda el alto de la ventana principal y deja espacios en blanco arriba y abajo),
 * una ventana popup independiente con altura ajustada al contenido envía al driver
 * únicamente el alto real del ticket.
 */
export function printThermalHtml(title: string, innerHtml: string): void {
  if (typeof window === 'undefined') return;

  const popup = window.open(
    '',
    'epb_thermal_print_window',
    'width=320,height=520,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes'
  );

  if (!popup) {
    alert(
      'Por favor permita las ventanas emergentes en el navegador para imprimir la tirilla sin márgenes.'
    );
    return;
  }

  popup.document.open();
  popup.document.write(`<!DOCTYPE html>
<html lang="es-CO">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @page {
      size: 72mm auto;
      margin: 0mm !important;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 68mm;
      max-width: 68mm;
      height: fit-content !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.25;
      color: #000000;
      background: #ffffff;
    }
    #ticket-root {
      width: 68mm;
      padding: 0mm 1mm 2mm 1mm;
      page-break-inside: avoid;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: 700; }
    .title { font-size: 13px; font-weight: 800; letter-spacing: 0.2px; }
    .subtitle { font-size: 10px; }
    .divider {
      border-top: 1px dashed #000;
      margin: 3px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 4px;
      margin: 1.5px 0;
    }
    .item {
      margin: 2.5px 0;
    }
    .item-name {
      font-weight: 700;
      word-break: break-word;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 800;
      border-top: 1px solid #000;
      padding-top: 3px;
      margin-top: 3px;
    }
    .footer {
      text-align: center;
      font-size: 9.5px;
      margin-top: 3px;
    }
  </style>
</head>
<body>
  <div id="ticket-root">${innerHtml}</div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
        window.close();
      }, 120);
    };
  </script>
</body>
</html>`);
  popup.document.close();
}

/**
 * 2. Impresión Directa ESC/POS por Puerto USB / Serial (WebSerial API):
 * Envía los bytes puros directamente al cabezal térmico sin pasar por el diálogo de
 * impresión de Windows ni usar hojas de 297mm. Cero espacio en blanco arriba/abajo
 * y corte automático de papel (GS V 66 0).
 */
export async function printDirectEscPosUsb(lines: string[]): Promise<void> {
  if (typeof window === 'undefined') return;

  const nav = navigator as unknown as {
    serial?: {
      requestPort: () => Promise<{
        open: (opts: { baudRate: number }) => Promise<void>;
        close: () => Promise<void>;
        writable?: {
          getWriter: () => {
            write: (chunk: Uint8Array) => Promise<void>;
            releaseLock: () => void;
          };
        };
      }>;
    };
  };

  if (!nav.serial) {
    throw new Error(
      'Su navegador no soporta WebSerial directo. Use Chrome o Brave en PC.'
    );
  }

  const port = await nav.serial.requestPort();
  await port.open({ baudRate: 9600 });

  const writer = port.writable?.getWriter();
  if (!writer) {
    await port.close();
    throw new Error('No se pudo abrir canal de escritura con la impresora USB.');
  }

  const encoder = new TextEncoder();
  // ESC @ (Inicializar impresora)
  const initCmd = new Uint8Array([0x1b, 0x40]);
  // Avanzar 4 líneas y cortar papel (GS V 66 0)
  const feedAndCutCmd = new Uint8Array([0x0a, 0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x42, 0x00]);

  const cleanText = lines
    .join('\n')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Limpiar tildes para tabla ASCII estándar ESC/POS

  await writer.write(initCmd);
  await writer.write(encoder.encode(cleanText + '\n'));
  await writer.write(feedAndCutCmd);

  writer.releaseLock();
  await port.close();
}
