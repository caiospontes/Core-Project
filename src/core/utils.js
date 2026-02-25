function sortTools(config) {
    if (!config) return [];
    return Object.entries(config).sort(([, a], [, b]) => {
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return 1;
        return a.label.localeCompare(b.label);
    });
}

const getCompositeKey = (moduleId, subId) => subId ? `${moduleId}_${subId}` : moduleId;


export { sortTools, getCompositeKey };
