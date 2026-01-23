import React, { useState, useEffect, useRef } from 'react';

// ============================================================================
// CONFIGURAÇÃO INICIAL (MOCK)
// ============================================================================

const DEFAULT_USERS = [
  { id: 1, email: 'admin@totvs.com.br', name: 'Administrador', role: 'admin', permissions: ['all'], active: true },
  { id: 2, email: 'dev@core.teste', name: 'Desenvolvedor', role: 'admin', permissions: ['all'], active: true }
];

// Tags iniciais (agora editáveis)
const DEFAULT_TAGS = [
  { id: 'NOME', label: 'Nome Colaborador', type: 'text' },
  { id: 'CPF', label: 'CPF', type: 'text' },
  { id: 'EMAIL', label: 'E-mail', type: 'email' },
  { id: 'UNIDADE', label: 'Unidade', type: 'text' },
  { id: 'DEPTO', label: 'Departamento', type: 'text' },
  { id: 'DATA', label: 'Data Atual', type: 'date' },
  { id: 'RESP', label: 'Responsável TI', type: 'text' },
  { id: 'NOTEBOOK_MODELO', label: 'Notebook (Modelo)', type: 'text' },
  { id: 'NOTEBOOK_SERIAL', label: 'Notebook (Serial)', type: 'text' },
  { id: 'CELULAR_MODELO', label: 'Celular (Modelo)', type: 'text' },
  { id: 'CELULAR_IMEI', label: 'Celular (IMEI)', type: 'text' },
];

// Configuração padrão dos delimitadores
const DEFAULT_DELIMITERS = { prefix: '<<', suffix: '>>' };

const TOOLS_CONFIG = {
  desligamento: { 
    label: 'Gerador de Termos', 
    desc: 'Emissão automatizada de termos de recolhimento de ativos.',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    active: true 
  },
  telefonia: { 
    label: 'Telefonia', 
    desc: 'Gestão de linhas, aparelhos e chips corporativos.',
    icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
    active: false 
  },
  monitores: { 
    label: 'Monitores', 
    desc: 'Controle de inventário de periféricos e monitores.',
    icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    active: false 
  },
};

const DEFAULT_HTML_TEMPLATE = `<div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333;">
  <h1 style="border-bottom: 2px solid #002233; color: #002233; padding-bottom: 10px;">Termo de Devolução</h1>
  <p>Declaro que <strong><<NOME>></strong> devolveu o notebook modelo <strong><<NOTEBOOK_MODELO>></strong> em <strong><<DATA>></strong>.</p>
</div>`;

// ============================================================================
// LOGIN PAGE
// ============================================================================
const LoginPage = ({ onLogin, users }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!foundUser || !foundUser.active) { setError('Usuário inválido.'); setLoading(false); return; }
      if (!email.toLowerCase().endsWith('@totvs.com.br') && !email.includes('core.teste')) { setError('Use e-mail @totvs.com.br'); setLoading(false); return; }
      onLogin(foundUser); setLoading(false);
    }, 800);
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#00121a] relative overflow-hidden font-sans">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#00DBFF]/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#005580]/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
      <div className="w-full max-w-md p-8 relative z-10 animate-fadeIn">
        <div className="text-center mb-10">
          <div className="bg-white/5 w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6 border border-white/10 shadow-2xl backdrop-blur-sm">
             <img src="https://i.imgur.com/dFv3pQh.png" alt="Logo" className="w-12" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">PROJETO CORE</h1>
          <p className="text-slate-400 mt-2 text-sm">Gestão de Ativos e Desligamentos</p>
        </div>
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="bg-red-500/10 border border-red-500/50 text-red-200 text-xs p-3 rounded-lg flex items-center gap-2"><span>⚠️</span> {error}</div>}
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@totvs.com.br" className="w-full bg-[#002233]/50 border border-slate-700 text-white rounded-lg p-3 focus:border-[#00DBFF] outline-none" />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-[#002233]/50 border border-slate-700 text-white rounded-lg p-3 focus:border-[#00DBFF] outline-none" />
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[#00DBFF] to-[#009dc4] text-[#002233] font-bold py-3 rounded-lg shadow-lg hover:shadow-[#00DBFF]/20 transition-all">{loading ? 'Acessando...' : 'ACESSAR SISTEMA'}</button>
            <button type="button" onClick={() => onLogin(users.find(u => u.email === 'dev@core.teste'))} className="w-full border border-white/10 bg-white/5 text-slate-400 text-xs font-bold py-2 rounded-lg hover:bg-white/10 hover:text-white border-dashed">⚡ Login DEV</button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PAINEL ADMINISTRATIVO (Tags, Templates, Users)
// ============================================================================
const AdminPanel = ({ users, setUsers, templates, setTemplates, tagsConfig, setTagsConfig, delimiters, setDelimiters }) => {
  const [activeTab, setActiveTab] = useState('templates');
  
  // States Upload/Edit Template
  const [targetModule, setTargetModule] = useState('');
  const [uploadStatus, setUploadStatus] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null); 
  const [htmlContent, setHtmlContent] = useState('');
  const textAreaRef = useRef(null);

  // States Users
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'user', permissions: [] });

  // States Tags Editor
  const [editingTagId, setEditingTagId] = useState(null); // ID da tag sendo editada
  const [tagForm, setTagForm] = useState({ id: '', label: '', type: 'text' });
  const [tempDelimiters, setTempDelimiters] = useState(delimiters); // Estado temporário para edição dos delimitadores

  // --- UPLOAD HTML ---
  const handleFileUpload = (e) => {
      const file = e.target.files[0];
      if(!targetModule) return alert("Selecione um módulo primeiro.");
      if(!file) return;

      if(file.name.endsWith('.html')) {
          setUploadStatus('Carregando HTML...');
          const reader = new FileReader();
          reader.onload = (ev) => {
              setTemplates(prev => ({
                  ...prev,
                  [targetModule]: { name: file.name, content: ev.target.result, date: new Date().toLocaleDateString(), type: 'html' }
              }));
              setUploadStatus('Sucesso! HTML carregado.');
          };
          reader.readAsText(file);
      } else {
          setUploadStatus('Erro: Apenas arquivos .html são permitidos.');
      }
  };

  // --- EDITOR DE TEMPLATE (VS CODE STYLE) ---
  const handleEditTemplate = (moduleKey) => {
      setEditingTemplate(moduleKey);
      setHtmlContent(templates[moduleKey]?.content || DEFAULT_HTML_TEMPLATE);
  };

  const insertAtCursor = (textToInsert) => {
    const textarea = textAreaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = text.substring(0, start) + textToInsert + text.substring(end);
    setHtmlContent(newText);
    setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
        textarea.focus();
    }, 0);
  };

  // --- GESTÃO DE TAGS ---
  const handleSaveTag = (e) => {
    e.preventDefault();
    // Limpar caracteres especiais do ID da tag para evitar quebra
    const cleanId = tagForm.id.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    
    if (editingTagId) {
        // Editando
        setTagsConfig(prev => prev.map(t => t.id === editingTagId ? { ...t, id: cleanId, label: tagForm.label, type: tagForm.type } : t));
        setEditingTagId(null);
    } else {
        // Criando nova
        if (tagsConfig.some(t => t.id === cleanId)) return alert('Tag já existe!');
        setTagsConfig(prev => [...prev, { ...tagForm, id: cleanId }]);
    }
    setTagForm({ id: '', label: '', type: 'text' });
  };

  const handleEditTagClick = (tag) => {
      setEditingTagId(tag.id);
      setTagForm(tag);
  };

  const handleDeleteTag = (id) => {
      if(window.confirm('Excluir esta tag? Ela deixará de aparecer nos formulários.')) {
          setTagsConfig(prev => prev.filter(t => t.id !== id));
      }
  };

  const handleSaveDelimiters = () => {
    setDelimiters(tempDelimiters);
    alert('Formato de tags atualizado!');
  };

  // --- GESTÃO DE USUÁRIOS ---
  const handleAddUser = (e) => {
    e.preventDefault();
    if (users.some(u => u.email === newUser.email)) return alert('E-mail já existe.');
    setUsers([...users, { ...newUser, id: Date.now(), active: true, permissions: newUser.role === 'admin' ? ['all'] : newUser.permissions }]);
    setShowAddModal(false);
    setNewUser({ email: '', name: '', role: 'user', permissions: [] });
  };

  const removeUser = (id) => { if(window.confirm('Remover?')) setUsers(users.filter(u => u.id !== id)); };

  return (
    <div className="p-8 h-full w-full overflow-y-auto animate-fadeIn bg-[#f0f4f8]">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-[#002233] mb-6 border-b pb-2">Painel Administrativo</h2>
        
        <div className="flex gap-4 mb-6">
            <button onClick={() => setActiveTab('templates')} className={`px-4 py-2 rounded font-bold text-sm ${activeTab === 'templates' ? 'bg-[#002233] text-white' : 'bg-white text-slate-600'}`}>Templates HTML</button>
            <button onClick={() => setActiveTab('tags')} className={`px-4 py-2 rounded font-bold text-sm ${activeTab === 'tags' ? 'bg-[#002233] text-white' : 'bg-white text-slate-600'}`}>Configurar Tags</button>
            <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded font-bold text-sm ${activeTab === 'users' ? 'bg-[#002233] text-white' : 'bg-white text-slate-600'}`}>Usuários</button>
        </div>

        {/* --- ABA TEMPLATES --- */}
        {activeTab === 'templates' && (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded shadow border border-slate-200 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-slate-500 mb-1">1. Módulo de Destino</label>
                        <select value={targetModule} onChange={(e) => { setTargetModule(e.target.value); setUploadStatus(null); }} className="w-full border p-2 rounded text-sm outline-none focus:border-[#00DBFF]">
                            <option value="">Selecione...</option>
                            {Object.entries(TOOLS_CONFIG).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-slate-500 mb-1">2. Importar HTML</label>
                        <div className="relative">
                            <input type="file" accept=".html" onChange={handleFileUpload} disabled={!targetModule} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 cursor-pointer border rounded"/>
                        </div>
                    </div>
                </div>
                {uploadStatus && <div className="text-sm font-bold text-blue-600">{uploadStatus}</div>}

                <div className="grid gap-4">
                    <h3 className="font-bold text-slate-700">Templates Ativos</h3>
                    {Object.entries(TOOLS_CONFIG).filter(([k]) => k === 'desligamento').map(([key, tool]) => (
                        <div key={key} className="bg-white p-4 rounded shadow border-l-4 border-[#00DBFF] flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-[#002233]">{tool.label}</h4>
                                <p className="text-xs text-slate-500">{templates[key] ? `Custom: ${templates[key].name}` : 'Padrão do Sistema'}</p>
                            </div>
                            <button onClick={() => handleEditTemplate(key)} className="bg-[#002233] text-white px-4 py-2 rounded text-sm font-bold hover:bg-[#00334d] flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                Editor HTML (VS Code)
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- ABA TAGS --- */}
        {activeTab === 'tags' && (
            <div className="flex gap-6">
                <div className="w-1/3 bg-white p-6 rounded shadow h-fit space-y-6">
                    {/* Configuração de Delimitadores */}
                    <div className="border-b pb-4 mb-4">
                        <h3 className="font-bold text-[#002233] mb-3">Formato das Tags</h3>
                        <div className="flex gap-2 items-center mb-2">
                            <input 
                                value={tempDelimiters.prefix} 
                                onChange={e => setTempDelimiters({...tempDelimiters, prefix: e.target.value})} 
                                className="w-1/3 border p-2 rounded text-center text-sm font-mono bg-slate-50"
                                placeholder="Prefixo"
                            />
                            <span className="font-bold text-slate-400">NOME_TAG</span>
                            <input 
                                value={tempDelimiters.suffix} 
                                onChange={e => setTempDelimiters({...tempDelimiters, suffix: e.target.value})} 
                                className="w-1/3 border p-2 rounded text-center text-sm font-mono bg-slate-50"
                                placeholder="Sufixo"
                            />
                        </div>
                        <button onClick={handleSaveDelimiters} className="w-full bg-slate-200 text-slate-700 font-bold py-1.5 rounded text-xs hover:bg-slate-300">Atualizar Formato</button>
                        <p className="text-[10px] text-slate-400 mt-2 text-center">Exemplo atual: {tempDelimiters.prefix}NOME{tempDelimiters.suffix}</p>
                    </div>

                    {/* Formulário de Tags */}
                    <div>
                        <h3 className="font-bold text-[#002233] mb-4">{editingTagId ? 'Editar Tag' : 'Nova Tag'}</h3>
                        <form onSubmit={handleSaveTag} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">ID da Tag (sem símbolos)</label>
                                <input value={tagForm.id} onChange={e => setTagForm({...tagForm, id: e.target.value})} className="w-full border p-2 rounded uppercase font-mono text-sm" placeholder="EX: DATA_NASC" required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Nome do Botão/Label</label>
                                <input value={tagForm.label} onChange={e => setTagForm({...tagForm, label: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="Ex: Data de Nascimento" required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Tipo de Campo</label>
                                <select value={tagForm.type} onChange={e => setTagForm({...tagForm, type: e.target.value})} className="w-full border p-2 rounded text-sm">
                                    <option value="text">Texto</option>
                                    <option value="date">Data</option>
                                    <option value="email">E-mail</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button type="submit" className="flex-1 bg-[#00DBFF] text-[#002233] font-bold py-2 rounded text-sm hover:bg-[#00c4e6]">{editingTagId ? 'Salvar' : 'Criar'}</button>
                                {editingTagId && <button type="button" onClick={() => {setEditingTagId(null); setTagForm({id:'', label:'', type:'text'})}} className="px-3 py-2 text-slate-500 text-sm hover:bg-slate-100 rounded">Cancelar</button>}
                            </div>
                        </form>
                    </div>
                </div>

                <div className="flex-1 bg-white rounded shadow overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 text-slate-600 font-bold">
                            <tr>
                                <th className="p-3">ID (Tag)</th>
                                <th className="p-3">Nome no Menu</th>
                                <th className="p-3">Tipo</th>
                                <th className="p-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tagsConfig.map(tag => (
                                <tr key={tag.id} className="border-b hover:bg-slate-50">
                                    <td className="p-3 font-mono text-blue-600">{delimiters.prefix}{tag.id}{delimiters.suffix}</td>
                                    <td className="p-3">{tag.label}</td>
                                    <td className="p-3 text-xs uppercase text-slate-400">{tag.type}</td>
                                    <td className="p-3 text-right flex justify-end gap-2">
                                        <button onClick={() => handleEditTagClick(tag)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                        <button onClick={() => handleDeleteTag(tag.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --- ABA USUÁRIOS --- */}
        {activeTab === 'users' && (
          <div>
            <button onClick={() => setShowAddModal(true)} className="bg-[#00DBFF] text-[#002233] px-4 py-2 rounded font-bold text-sm mb-4 hover:bg-[#00b0cc]">+ Convidar Usuário</button>
            <div className="bg-white rounded shadow overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-600 font-bold border-b"><tr><th className="p-3">Nome</th><th className="p-3">Email</th><th className="p-3">Função</th><th className="p-3 text-right">Ações</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b hover:bg-slate-50"><td className="p-3 font-medium">{u.name}</td><td className="p-3 text-slate-500">{u.email}</td><td className="p-3"><span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs uppercase">{u.role}</span></td><td className="p-3 text-right"><button onClick={() => removeUser(u.id)} className="text-red-500 hover:text-red-700 font-bold text-xs">Excluir</button></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL EDITOR HTML (VS CODE STYLE) */}
        {editingTemplate && (
            <div className="fixed inset-0 bg-[#00121a] z-50 flex flex-col animate-fadeIn">
                <div className="bg-[#1e1e1e] text-white p-3 flex justify-between items-center border-b border-[#333]">
                    <div className="flex items-center gap-3">
                        <span className="text-[#00DBFF] text-lg font-mono">HTML Editor</span>
                        <span className="text-xs text-gray-400 bg-[#333] px-2 py-1 rounded">{TOOLS_CONFIG[editingTemplate]?.label}</span>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setEditingTemplate(null)} className="px-4 py-1 text-sm text-gray-400 hover:text-white">Cancelar</button>
                        <button onClick={() => {
                            setTemplates(prev => ({ ...prev, [editingTemplate]: { name: 'Editado Manualmente', content: htmlContent, date: new Date().toLocaleDateString(), type: 'html' } }));
                            setEditingTemplate(null);
                        }} className="px-4 py-1 bg-[#007acc] text-white text-sm hover:bg-[#0098ff]">Salvar (Ctrl+S)</button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    <div className="w-64 bg-[#252526] border-r border-[#333] p-2 overflow-y-auto custom-scroll">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2 px-2">Inserir Tags</p>
                        {Array.isArray(tagsConfig) && tagsConfig.map(tag => (
                            <button key={tag.id} onClick={() => insertAtCursor(`${delimiters.prefix}${tag.id}${delimiters.suffix}`)} className="w-full text-left text-gray-300 hover:bg-[#37373d] hover:text-white px-2 py-1 rounded text-xs font-mono mb-1 flex justify-between group">
                                <span>{tag.label}</span>
                                <span className="text-[#00DBFF] opacity-50 group-hover:opacity-100">{delimiters.prefix}{tag.id}{delimiters.suffix}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 bg-[#1e1e1e] relative">
                        <textarea 
                            ref={textAreaRef}
                            className="w-full h-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm p-4 outline-none resize-none leading-relaxed"
                            value={htmlContent}
                            onChange={(e) => setHtmlContent(e.target.value)}
                            spellCheck="false"
                            style={{ resize: 'both' }} // Permite redimensionar se o container permitir (simulado pelo flex)
                        />
                    </div>
                    <div className="w-[40%] bg-white border-l border-gray-300 flex flex-col">
                        <div className="bg-gray-100 p-2 text-xs font-bold text-gray-500 border-b text-center">Live Preview</div>
                        <div className="flex-1 p-4 overflow-y-auto bg-gray-200">
                            <div className="bg-white shadow-lg min-h-[29.7cm] p-[1cm] text-[10px]" dangerouslySetInnerHTML={{ __html: htmlContent }} />
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL USER ADD */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-96">
              <h3 className="text-lg font-bold mb-4">Convidar Usuário</h3>
              <form onSubmit={handleAddUser} className="space-y-3">
                <input placeholder="Nome" required className="w-full border p-2 rounded" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                <input placeholder="Email" required type="email" className="w-full border p-2 rounded" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                <div className="flex justify-end gap-2 mt-4"><button type="button" onClick={() => setShowAddModal(false)} className="text-slate-500">Cancelar</button><button type="submit" className="bg-[#00DBFF] px-3 py-1.5 rounded font-bold">Enviar</button></div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// GERADOR DINÂMICO
// ============================================================================
const DynamicGenerator = ({ template, tagsConfig, delimiters }) => {
  const [formData, setFormData] = useState({});
  const [parsedTags, setParsedTags] = useState([]);

  useEffect(() => {
    const content = template?.content || DEFAULT_HTML_TEMPLATE;
    
    // Escapar caracteres especiais dos delimitadores para regex
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const p = escapeRegExp(delimiters.prefix);
    const s = escapeRegExp(delimiters.suffix);

    // Regex dinâmica baseada nos delimitadores configurados
    const regex = new RegExp(`${p}([A-Z0-9_]+)${s}`, 'g');
    
    const foundTags = new Set();
    let match;
    while ((match = regex.exec(content)) !== null) foundTags.add(match[1]);
    
    const tagsArray = Array.from(foundTags);
    setParsedTags(tagsArray);
    
    const initialData = {};
    tagsArray.forEach(tag => {
        initialData[tag] = '';
        if(tag === 'DATA') initialData[tag] = new Date().toISOString().split('T')[0];
    });
    setFormData(initialData);
  }, [template, delimiters]); // Re-executa se o template ou os delimitadores mudarem

  const handleChange = (tag, value) => setFormData(prev => ({ ...prev, [tag]: value }));

  const renderDocument = () => {
      let html = template?.content || DEFAULT_HTML_TEMPLATE;
      parsedTags.forEach(tag => {
          let val = formData[tag] || '';
          if(tag === 'DATA' && val) val = val.split('-').reverse().join('/');
          // Substituição manual sem regex para evitar problemas com caracteres especiais no valor
          html = html.split(`${delimiters.prefix}${tag}${delimiters.suffix}`).join(val);
      });
      return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const renderInputForTag = (tag) => {
      const safeTagsConfig = Array.isArray(tagsConfig) ? tagsConfig : DEFAULT_TAGS;
      const tagConfig = safeTagsConfig.find(t => t.id === tag);
      const label = tagConfig ? tagConfig.label : tag.replace(/_/g, ' ');
      const type = tagConfig ? tagConfig.type : 'text';

      return (
          <div key={tag} className="mb-3">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>
              <input type={type} className="w-full border p-2 rounded text-sm focus:border-[#00DBFF] outline-none" value={formData[tag] || ''} onChange={e => handleChange(tag, e.target.value)} />
          </div>
      );
  };

  return (
    <div className="flex flex-row h-full w-full animate-fadeIn overflow-hidden bg-[#f0f4f8]">
      <div className="w-[400px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full z-10 no-print shadow-lg">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div><h2 className="font-bold text-[#002233]">Preenchimento</h2><p className="text-[10px] text-slate-400">{parsedTags.length} campos detectados</p></div>
          <button onClick={() => window.print()} className="bg-[#002233] text-white px-4 py-2 rounded-lg hover:bg-slate-700 font-bold text-xs flex items-center gap-2 shadow-lg"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>IMPRIMIR</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scroll bg-white">
            {parsedTags.length === 0 && <p className="text-center text-slate-400 mt-10">Nenhuma tag encontrada (ex: {delimiters.prefix}NOME{delimiters.suffix}).</p>}
            {parsedTags.sort().map(tag => renderInputForTag(tag))}
        </div>
      </div>
      <div className="flex-1 bg-slate-100 p-8 flex justify-center overflow-auto custom-scroll w-full">
        <div className="print-area bg-white shadow-2xl w-[21cm] min-h-[29.7cm] p-[1cm] relative mx-auto origin-top transition-transform duration-200">
            {renderDocument()}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// HOME PAGE (Redesigned)
// ============================================================================
const HomePage = ({ onNavigate }) => (
  <div className="h-full w-full flex flex-col bg-[#f0f4f8] animate-fadeIn overflow-y-auto">
    <div className="bg-gradient-to-r from-[#002233] to-[#001a26] text-white px-10 py-16 shadow-lg">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-black mb-2 tracking-tight">Bem-vindo ao <span className="text-[#00DBFF]">CORE</span></h1>
        <p className="text-slate-400 text-lg max-w-2xl">Centralize a gestão de ativos, automatize documentos e controle o inventário de TI em uma única plataforma.</p>
      </div>
    </div>
    <div className="flex-1 p-10 max-w-6xl mx-auto w-full">
        <h2 className="text-lg font-bold text-slate-700 mb-6 border-b pb-2">Acesso Rápido</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(TOOLS_CONFIG).map(([key, tool]) => (
                <div key={key} onClick={() => tool.active && onNavigate(key === 'desligamento' ? 'Desligamento' : '')} className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all ${tool.active ? 'hover:shadow-md hover:border-[#00DBFF] cursor-pointer group' : 'opacity-60 cursor-not-allowed grayscale'}`}>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${tool.active ? 'bg-blue-50 text-[#002233] group-hover:bg-[#00DBFF]' : 'bg-slate-100 text-slate-400'}`}>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tool.icon} /></svg>
                    </div>
                    <h3 className="font-bold text-[#002233] text-lg">{tool.label}</h3>
                    <p className="text-sm text-slate-500 mt-2 h-10">{tool.desc}</p>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${tool.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>{tool.active ? 'Acessar' : 'Em Breve'}</span>
                        {tool.active && <svg className="w-4 h-4 text-[#00DBFF] transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
                    </div>
                </div>
            ))}
        </div>
    </div>
  </div>
);

// ============================================================================
// DASHBOARD
// ============================================================================
const Dashboard = ({ user, onLogout, users, setUsers, templates, setTemplates, tagsConfig, setTagsConfig, delimiters, setDelimiters }) => {
  const [activePage, setActivePage] = useState('Home');
  const [expandedMenu, setExpandedMenu] = useState({ geradores: true });

  const toggleMenu = (key) => setExpandedMenu(prev => ({ ...prev, [key]: !prev[key] }));

  // Verificação de permissões E status ativo
  const hasAccess = (toolKey) => {
      const tool = TOOLS_CONFIG[toolKey];
      if (!tool || !tool.active) return false;
      return user.role === 'admin' || user.permissions.includes('all') || user.permissions.includes(toolKey);
  };

  return (
    <div className="flex w-screen h-screen bg-[#f0f4f8] font-sans text-slate-800 overflow-hidden">
      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#002233] text-white flex flex-col flex-shrink-0 z-50 shadow-xl no-print">
        <div className="p-6 flex flex-col items-center border-b border-white/10 cursor-pointer hover:bg-[#002b40] transition" onClick={() => setActivePage('Home')}>
          <img src="https://i.imgur.com/dFv3pQh.png" alt="Logo" className="w-10 mb-2" />
          <span className="font-bold text-sm tracking-widest">PROJETO CORE</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 custom-scroll">
          <div className="px-3 space-y-1">
            
            {/* ITEM: HOME */}
            <button onClick={() => setActivePage('Home')} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium ${activePage === 'Home' ? 'bg-[#00DBFF] text-[#002233]' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              Visão Geral
            </button>

            {/* ITEM: GERADORES (Accordion) */}
            <div>
              <button onClick={() => toggleMenu('geradores')} className="w-full flex items-center justify-between px-3 py-2 rounded text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  Geradores
                </div>
                <svg className={`w-3 h-3 transition-transform ${expandedMenu.geradores ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              
              {expandedMenu.geradores && (
                <div className="pl-10 pr-2 space-y-1 mt-1">
                  
                  {/* Desligamento (Ativo) */}
                  <button 
                    onClick={() => hasAccess('desligamento') && setActivePage('Desligamento')} 
                    className={`w-full text-left px-3 py-1.5 rounded text-xs font-medium flex justify-between items-center ${activePage === 'Desligamento' ? 'bg-white/10 text-[#00DBFF]' : hasAccess('desligamento') ? 'text-slate-400 hover:text-white' : 'text-slate-600 cursor-not-allowed'}`}
                  >
                    Desligamento
                  </button>

                  {/* Telefonia (Inativo) */}
                  <div className="group relative">
                    <button className="w-full text-left px-3 py-1.5 rounded text-xs font-medium text-slate-600 cursor-not-allowed flex justify-between items-center">
                      Telefonia
                      <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </button>
                  </div>

                  {/* Monitores (Inativo) */}
                  <div className="group relative">
                    <button className="w-full text-left px-3 py-1.5 rounded text-xs font-medium text-slate-600 cursor-not-allowed flex justify-between items-center">
                      Monitores
                      <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </button>
                  </div>

                </div>
              )}
            </div>

            {/* ITEM: ADMIN */}
            {(user.role === 'admin' || user.permissions.includes('all')) && (
              <button onClick={() => setActivePage('Admin')} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium ${activePage === 'Admin' ? 'bg-[#00DBFF] text-[#002233]' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Administração
              </button>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#00DBFF] text-[#002233] flex items-center justify-center font-bold text-sm">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{user.name.split(' ')[0]}</p>
              <p className="text-[10px] text-slate-400 truncate uppercase">{user.role}</p>
            </div>
            <button onClick={onLogout} className="text-slate-400 hover:text-red-400" title="Sair">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ÁREA DE CONTEÚDO (Full Flex) */}
      <main className="flex-1 relative flex flex-col h-full overflow-hidden bg-[#F8FAFC]">
        <div className="flex-1 relative overflow-hidden flex w-full">
          {activePage === 'Home' ? <HomePage user={user} onNavigate={setActivePage} /> :
           activePage === 'Admin' ? <AdminPanel users={users} setUsers={setUsers} templates={templates} setTemplates={setTemplates} tagsConfig={tagsConfig} setTagsConfig={setTagsConfig} delimiters={delimiters} setDelimiters={setDelimiters} /> :
           activePage === 'Desligamento' ? <DynamicGenerator template={templates['desligamento']} tagsConfig={tagsConfig} delimiters={delimiters} /> :
           null
          }
        </div>
      </main>
    </div>
  );
};

// ============================================================================
// APP ROOT
// ============================================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState(() => { const s = localStorage.getItem('core_users'); return s ? JSON.parse(s) : DEFAULT_USERS; });
  const [templates, setTemplates] = useState(() => { const s = localStorage.getItem('core_templates'); return s ? JSON.parse(s) : {}; });
  
  // CORREÇÃO DE MIGRAÇÃO: Força array se o dado antigo for objeto ou inválido
  const [tagsConfig, setTagsConfig] = useState(() => {
    const saved = localStorage.getItem('core_tags');
    try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
    } catch(e) {}
    return DEFAULT_TAGS;
  });

  const [delimiters, setDelimiters] = useState(() => {
    const s = localStorage.getItem('core_delimiters');
    return s ? JSON.parse(s) : DEFAULT_DELIMITERS;
  });

  useEffect(() => localStorage.setItem('core_users', JSON.stringify(users)), [users]);
  useEffect(() => localStorage.setItem('core_templates', JSON.stringify(templates)), [templates]);
  useEffect(() => localStorage.setItem('core_tags', JSON.stringify(tagsConfig)), [tagsConfig]);
  useEffect(() => localStorage.setItem('core_delimiters', JSON.stringify(delimiters)), [delimiters]);

  useEffect(() => {
    if (!document.querySelector('script[src*="tailwindcss"]')) { 
      const s = document.createElement('script'); s.src = "https://cdn.tailwindcss.com"; document.head.appendChild(s); 
    }
    const style = document.createElement('style');
    style.innerHTML = `body, html, #root { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; } .custom-scroll::-webkit-scrollbar { width: 6px; } .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }`;
    document.head.appendChild(style);
  }, []);

  return user ? <Dashboard user={user} onLogout={() => setUser(null)} users={users} setUsers={setUsers} templates={templates} setTemplates={setTemplates} tagsConfig={tagsConfig} setTagsConfig={setTagsConfig} delimiters={delimiters} setDelimiters={setDelimiters} /> : <LoginPage onLogin={setUser} users={users} />;
}