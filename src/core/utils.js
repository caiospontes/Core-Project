function sortTools(config) {
    if (!config) return [];
    return Object.entries(config).sort(([, a], [, b]) => {
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return 1;
        return a.label.localeCompare(b.label);
    });
}

const getCompositeKey = (moduleId, subId) => subId ? `${moduleId}_${subId}` : moduleId;

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

export { sortTools, getCompositeKey, normalizeScannerText, buildNotebookBarcodeValue, parseNotebookBarcodeValue };
