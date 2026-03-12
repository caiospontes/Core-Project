const DEFAULT_USERS = [
  { id: '1', email: 'admin@totvs.com.br', name: 'Administrador', role: 'admin', permissions: ['all'], active: true },
  { id: '2', email: 'dev@core.teste', name: 'Desenvolvedor', role: 'admin', permissions: ['all'], active: true }
];

const DEFAULT_DELIMITERS = { prefix: '<<', suffix: '>>' };

const DEFAULT_CHANGELOG = [
  { id: '1', version: '4.6', date: '18/02/2024', title: 'Correção Crítica', content: 'Remoção total de injeção de scripts externos para resolver conflitos de ambiente.' },
  { id: '2', version: '4.5', date: '17/02/2024', title: 'Correção de Erros', content: 'Remoção de scripts conflitantes e estabilização do sistema.' },
  { id: '3', version: '4.4', date: '16/02/2024', title: 'Sub-Geradores', content: 'Adicionada capacidade de criar múltiplos tipos de termos dentro de um único módulo.' },
];

const DEFAULT_TOOLS_CONFIG = {
  correios: {
    label: 'Correios',
    desc: 'Geração de etiquetas e documentos logísticos de envio.',
    icon: 'M3 7h18M5 7l1 12h12l1-12M9 11h6M10 15h4',
    active: true,
  },
  telefonia: {
    label: 'Telefonia',
    desc: 'Formulários e termos operacionais de telefonia.',
    icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.95.684l1.2 3.6a1 1 0 01-.23 1.02l-1.54 1.54a16 16 0 006.48 6.48l1.54-1.54a1 1 0 011.02-.23l3.6 1.2a1 1 0 01.684.95V19a2 2 0 01-2 2h-1C10.85 21 3 13.15 3 3V5z',
    active: true,
  },
  desligamento: {
    label: 'Desligamento',
    desc: 'Emissão de termos para devolução e baixa de ativos.',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    active: true,
  },
  monitores: {
    label: 'Monitores',
    desc: 'Termos e controles para equipamentos de vídeo.',
    icon: 'M4 6h16v10H4zM8 20h8M10 16v4m4-4v4',
    active: true,
  },
  notebooks: {
    label: 'Notebooks',
    desc: 'Documentos operacionais para notebooks e acessórios.',
    icon: 'M3 6h18v10H3zM2 18h20',
    active: true,
  },
};

const DEFAULT_TAGS_WITH_SESSIONS = {
  desligamento: {
    sessions: [
      {
        id: 'colaborador',
        title: 'Dados do Colaborador',
        active: true,
        tags: [
          { id: 'NOME', label: 'Nome Colaborador', type: 'text' },
          { id: 'CPF', label: 'CPF', type: 'text' },
        ]
      }
    ]
  }
};


const DEFAULT_INVENTORY_CONFIGS = [
  {
    id: 'inventario_telefonia',
    name: 'Inventário de Telefonia',
    description: 'Controle de aparelhos móveis e chips por unidade.',
    sheets: [
      {
        id: 'estoque',
        name: 'Estoque',
        columns: ['Marca', 'Modelo', 'IMEI', 'Status', 'Observações'],
        statusOptions: ['Estoque', 'Em uso', 'Defeito', 'Reparo', 'Baixado']
      },
      {
        id: 'chips',
        name: 'Chips',
        columns: ['CHIP', 'LINHA', 'TOTVER', 'OBSERVAÇÃO'],
        statusOptions: []
      }
    ]
  },
  {
    id: 'inventario_notebooks',
    name: 'Inventário de Notebooks',
    description: 'Controle patrimonial e técnico de notebooks.',
    sheets: [
      {
        id: 'janeiro',
        name: 'Janeiro',
        columns: ['Status', 'Marca', 'Modelo', 'Processador', 'Patrimônio', 'ServiceTag', 'Observação'],
        statusOptions: ['Em estoque', 'Depreciado', 'Em uso', 'Manutenção']
      }
    ]
  }
];


const DEFAULT_HTML_TEMPLATE = `<div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333;">
  <h1 style="border-bottom: 2px solid #e2e8f0; color: #0f172a; padding-bottom: 10px;">Termo Padrão</h1>
  <p>Edite este modelo no painel administrativo.</p>
</div>`;

export { DEFAULT_USERS, DEFAULT_DELIMITERS, DEFAULT_CHANGELOG, DEFAULT_TOOLS_CONFIG, DEFAULT_TAGS_WITH_SESSIONS, DEFAULT_INVENTORY_CONFIGS, DEFAULT_HTML_TEMPLATE };
