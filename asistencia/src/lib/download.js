// Descarga de archivos generados en el navegador.

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2500);
}

export function downloadText(content, filename, mime = 'text/plain;charset=utf-8') {
  downloadBlob(new Blob([content], { type: mime }), filename);
}
