// ═══════════════════════════════════════
// PATCH para src/components/chat/ChatArea.tsx
// Solo 3 cambios. NO reemplazar todo el archivo.
// ═══════════════════════════════════════

// ── CAMBIO 1: Agregar import (al inicio del archivo, con los otros imports) ──
// AGREGAR esta línea:
import { extractPdfText, exportChatToPdf } from '@/lib/pdfUtils';


// ── CAMBIO 2: Reemplazar la sección de PDF en processFile ──
// BUSCAR esto (líneas ~204-211):

    } else if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = () => {
        const text = extractPdfText(reader.result as ArrayBuffer);
        setAttachment({ type: 'pdf', data: text || `[PDF: ${file.name}]`, name: file.name, mimeType: file.type });
      };
      reader.readAsArrayBuffer(file);
    }

// REEMPLAZAR por:

    } else if (file.type === 'application/pdf') {
      try {
        const text = await extractPdfText(file);
        setAttachment({ type: 'pdf', data: text, name: file.name, mimeType: file.type });
      } catch {
        setAttachment({ type: 'pdf', data: `[PDF: ${file.name} — Error al leer]`, name: file.name, mimeType: file.type });
      }
    }


// ── CAMBIO 3: Borrar la función extractPdfText vieja ──
// BUSCAR y ELIMINAR todo este bloque (líneas ~214-231):

  const extractPdfText = (buffer: ArrayBuffer): string => {
    try {
      const text = new TextDecoder('latin1').decode(new Uint8Array(buffer));
      const matches: string[] = [];
      const btRegex = /BT\s([\s\S]*?)ET/g;
      let m;
      while ((m = btRegex.exec(text)) !== null) {
        const strRegex = /\(([^)]*)\)/g; let sm;
        while ((sm = strRegex.exec(m[1])) !== null) {
          const s = sm[1].replace(/\\n/g,'\n').replace(/\\\(/,'(').replace(/\\\)/,')');
          if (s.trim()) matches.push(s.trim());
        }
      }
      if (matches.length > 0) return matches.join(' ').slice(0, 8000);
      const readable = text.replace(/[^\x20-\x7E\n]/g,' ').replace(/\s+/g,' ').trim().match(/[a-zA-Z]{3,}/g);
      return readable && readable.length > 20 ? readable.join(' ').slice(0, 8000) : '';
    } catch { return ''; }
  };

// (simplemente borralo, ya no se usa — el nuevo está en pdfUtils.ts)


// ── CAMBIO 4 (OPCIONAL): Agregar botón "Exportar PDF" ──
// BUSCAR el botón de exportar existente (handleExport):

  const handleExport = () => {

// EN ESA MISMA FUNCIÓN, después de la línea:
    a.click(); URL.revokeObjectURL(url);

// AGREGAR al final de la función (antes del cierre }):
  };

  // Nuevo: exportar como PDF
  const handleExportPdf = () => {
    if (!messages.length) return;
    exportChatToPdf(messages, activeSession?.title || 'Chat AIdark', character.name);
  };

// Y luego BUSCAR donde está el botón de Download y agregar otro al lado:
// BUSCAR:
            <Download size={14} />
// Ese botón llama a handleExport. Después de ese botón, agregar:
//   Otro botón idéntico que llame a handleExportPdf con icono FileText
//   (esto es opcional, solo si querés el export a PDF visual)
