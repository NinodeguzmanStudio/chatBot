// ═══════════════════════════════════════
// AIdark — PDF Utilities v3 (FIXED)
// src/lib/pdfUtils.ts
// CAMBIOS v3:
//   [1] Carga pdf.js robusta con fallback (import dinámico + script tag)
//   [2] extractPdfText acepta maxPages para limitar por plan
//   [3] maxChars subido a 60000 (el backend controla el límite real por plan)
//   [4] Mejor manejo de errores y PDFs escaneados
// ═══════════════════════════════════════

let pdfjsLib: any = null;

// Cargar pdf.js — usa script injection (compatible con todos los navegadores)
async function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;

  // Si ya fue cargado por otra llamada
  if ((window as any).__pdfjsLib) {
    pdfjsLib = (window as any).__pdfjsLib;
    return pdfjsLib;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = [
      "import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';",
      "pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';",
      "window.__pdfjsLib = pdfjsLib;",
      "window.dispatchEvent(new Event('pdfjsReady'));"
    ].join('\n');

    const onReady = () => {
      window.removeEventListener('pdfjsReady', onReady);
      pdfjsLib = (window as any).__pdfjsLib;
      resolve(pdfjsLib);
    };

    window.addEventListener('pdfjsReady', onReady);
    document.head.appendChild(script);

    setTimeout(() => {
      window.removeEventListener('pdfjsReady', onReady);
      reject(new Error('pdf.js timeout'));
    }, 15000);
  });
}

// ── Extraer texto de un PDF ──
// maxPages: límite de páginas (controlado por plan desde el frontend)
// maxChars: límite de caracteres total
export async function extractPdfText(
  file: File,
  maxPages: number = 100,
  maxChars: number = 60000
): Promise<string> {
  try {
    const lib = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data: arrayBuffer }).promise;

    const totalPages = pdf.numPages;
    const pagesToRead = Math.min(totalPages, maxPages);
    const texts: string[] = [];
    let totalChars = 0;

    for (let i = 1; i <= pagesToRead; i++) {
      if (totalChars >= maxChars) break;

      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (pageText) {
        texts.push(`[Página ${i}] ${pageText}`);
        totalChars += pageText.length;
      }
    }

    const result = texts.join('\n\n').slice(0, maxChars);

    if (!result.trim()) {
      return `[PDF escaneado: ${file.name} — ${totalPages} páginas. No se pudo extraer texto. El PDF puede contener solo imágenes.]`;
    }

    const truncatedNote = pagesToRead < totalPages
      ? `\n\n[NOTA: Se leyeron ${pagesToRead} de ${totalPages} páginas según tu plan.]`
      : '';

    return `[PDF: ${file.name} — ${totalPages} páginas, ${pagesToRead} leídas]\n\n${result}${truncatedNote}`;

  } catch (err) {
    console.error('[PDF] Error extrayendo texto:', err);
    return fallbackExtract(file);
  }
}

// Fallback mínimo si pdf.js no carga
async function fallbackExtract(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder('latin1').decode(new Uint8Array(buffer));
    const matches: string[] = [];
    const btRegex = /BT\s([\s\S]*?)ET/g;
    let m;
    while ((m = btRegex.exec(text)) !== null) {
      const strRegex = /\(([^)]*)\)/g;
      let sm;
      while ((sm = strRegex.exec(m[1])) !== null) {
        const s = sm[1].replace(/\\n/g, '\n').replace(/\\\(/, '(').replace(/\\\)/, ')');
        if (s.trim()) matches.push(s.trim());
      }
    }
    if (matches.length > 0) return `[PDF: ${file.name}]\n${matches.join(' ').slice(0, 8000)}`;
    return `[PDF: ${file.name} — No se pudo extraer texto. Intenta con otro PDF.]`;
  } catch {
    return `[PDF: ${file.name} — Error al leer]`;
  }
}

// ── Exportar chat a PDF ──
export async function exportChatToPdf(
  messages: { role: string; content: string; timestamp: number; character?: string }[],
  chatTitle: string,
  characterName: string = 'AIdark'
): Promise<void> {
  // Crear contenido HTML para imprimir
  const date = new Date().toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${chatTitle} — AIdark</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, system-ui, sans-serif; font-size: 12px; color: #222; padding: 40px; max-width: 700px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #8b7355; }
        .header h1 { font-size: 20px; color: #8b7355; margin-bottom: 4px; }
        .header p { font-size: 11px; color: #888; }
        .msg { margin-bottom: 16px; page-break-inside: avoid; }
        .msg-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .msg-name { font-weight: 600; font-size: 12px; }
        .msg-time { font-size: 10px; color: #999; }
        .msg-user .msg-name { color: #555; }
        .msg-ai .msg-name { color: #8b7355; }
        .msg-content { font-size: 12px; line-height: 1.7; color: #333; padding-left: 2px; white-space: pre-wrap; word-wrap: break-word; }
        .msg-ai .msg-content { color: #222; }
        .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; font-size: 10px; color: #aaa; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>AIdark</h1>
        <p>${chatTitle} — ${date}</p>
      </div>
      ${messages.map(m => {
        const isUser = m.role === 'user';
        const time = new Date(m.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
        const name = isUser ? 'Tú' : characterName;
        // Escape HTML
        const content = m.content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return `
          <div class="msg ${isUser ? 'msg-user' : 'msg-ai'}">
            <div class="msg-header">
              <span class="msg-name">${name}</span>
              <span class="msg-time">${time}</span>
            </div>
            <div class="msg-content">${content}</div>
          </div>
        `;
      }).join('')}
      <div class="footer">
        Exportado desde AIdark — aidark.es
      </div>
    </body>
    </html>
  `;

  // Abrir ventana de impresión (funciona en mobile y desktop)
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');

  if (printWindow) {
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        URL.revokeObjectURL(url);
      }, 500);
    };
  } else {
    // Fallback: descargar como HTML
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chatTitle.replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'chat'}-aidark.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
