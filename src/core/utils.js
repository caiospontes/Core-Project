function sortTools(config) {
    if (!config) return [];
    return Object.entries(config).sort(([, a], [, b]) => {
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return 1;
        return a.label.localeCompare(b.label);
    });
}

const getCompositeKey = (moduleId, subId) => subId ? `${moduleId}_${subId}` : moduleId;

const buildKeyCandidates = (moduleId, subId = '') => {
  const composite = getCompositeKey(moduleId, subId);
  const normalized = String(composite || '').trim();
  if (!normalized) return [];

  const variants = new Set([
    normalized,
    normalized.toLowerCase(),
    normalized.replace(/-/g, '_'),
    normalized.replace(/_/g, '-'),
    normalized.replace(/\s+/g, '_'),
    normalized.replace(/\s+/g, '-'),
    normalized.toLowerCase().replace(/\s+/g, '_'),
    normalized.toLowerCase().replace(/\s+/g, '-')
  ]);

  return Array.from(variants).filter(Boolean);
};

const resolveKeyFromMap = (mapObject, moduleId, subId = '') => {
  const keys = buildKeyCandidates(moduleId, subId);
  return keys.find((key) => Object.prototype.hasOwnProperty.call(mapObject || {}, key)) || null;
};

const formatDateToBR = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = value.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return String(value);
};

const getTodayBR = () => formatDateToBR(new Date());

const normalizeScannerText = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 .\/$+%\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildNotebookBarcodeValue = (entry) => {
    const compact = [
        normalizeScannerText(entry.status).slice(0, 12),
        normalizeScannerText(entry.marca).slice(0, 12),
        normalizeScannerText(entry.modelo).slice(0, 18),
        normalizeScannerText(entry.processador).slice(0, 16),
        normalizeScannerText(entry.patrimonio).slice(0, 14),
        normalizeScannerText(entry.serviceTag).slice(0, 14),
        normalizeScannerText(entry.observacao).slice(0, 20)
    ].map((item) => item.replace(/\//g, '-'));

    return `NB/${compact.join('/')}`;
};

const parseNotebookBarcodeValue = (value) => {
    const cleaned = normalizeScannerText(value);
    if (!cleaned.startsWith('NB/')) return null;

    const parts = cleaned.slice(3).split('/');
    const [status = '', marca = '', modelo = '', processador = '', patrimonio = '', serviceTag = '', observacao = ''] = parts;

    return { status, marca, modelo, processador, patrimonio, serviceTag, observacao };
};

export { sortTools, getCompositeKey, buildKeyCandidates, resolveKeyFromMap, formatDateToBR, getTodayBR, normalizeScannerText, buildNotebookBarcodeValue, parseNotebookBarcodeValue };
