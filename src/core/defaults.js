const DEFAULT_USERS = [
  { id: '1', email: 'admin@totvs.com.br', name: 'Administrador', role: 'admin', permissions: ['all'], active: true },
  { id: '2', email: 'dev@core.teste', name: 'Desenvolvedor', role: 'admin', permissions: ['all'], active: true }
];

const DEFAULT_DELIMITERS = { prefix: '<<', suffix: '>>' };

const DEFAULT_CHANGELOG = [
  { id: '1', version: '4.6', date: '2024-02-18', title: 'Correção Crítica', content: 'Remoção total de injeção de scripts externos para resolver conflitos de ambiente.' },
  { id: '2', version: '4.5', date: '2024-02-17', title: 'Correção de Erros', content: 'Remoção de scripts conflitantes e estabilização do sistema.' },
  { id: '3', version: '4.4', date: '2024-02-16', title: 'Sub-Geradores', content: 'Adicionada capacidade de criar múltiplos tipos de termos dentro de um único módulo.' },
];

const DEFAULT_TOOLS_CONFIG = {
  desligamento: { 
    label: 'Gerador de Termos', 
    desc: 'Emissão automatizada de termos de recolhimento de ativos.',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    active: true 
  }
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
