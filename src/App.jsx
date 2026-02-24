import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously, 
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';

// ============================================================================
// 1. CONFIGURAÇÃO FIREBASE & UTILS
// ============================================================================

const firebaseConfig = {
  apiKey: "AIzaSyDk_GDGvkyK29P2m8THra6scqhOcX8sX6g",
  authDomain: "projetocore-f640b.firebaseapp.com",
  projectId: "projetocore-f640b",
  storageBucket: "projetocore-f640b.firebasestorage.app",
  messagingSenderId: "185119471261",
  appId: "1:185119471261:web:eed71577b1b6befae7c674",
  measurementId: "G-LMEBJ66GHL"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const appId = firebaseConfig.projectId;

const getCollectionRef = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);
const getDocRef = (colName, docId) => doc(db, 'artifacts', appId, 'public', 'data', colName, docId);

function sortTools(config) {
    if (!config) return [];
    return Object.entries(config).sort(([, a], [, b]) => {
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return 1;
        return a.label.localeCompare(b.label);
    });
}

const getCompositeKey = (moduleId, subId) => subId ? `${moduleId}_${subId}` : moduleId;

// ============================================================================
// 2. COMPONENTE SAFE PREVIEW (A4 DINÂMICO)
// ============================================================================
function SafePreview({ html }) {
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const shadowRootRef = useRef(null);

  useEffect(() => {
    const updateScale = () => {
      if (wrapperRef.current && containerRef.current && shadowRootRef.current && shadowRootRef.current.body) {
        const parentWidth = wrapperRef.current.clientWidth;
        const A4_WIDTH_PX = 794; 
        const PADDING = 40;
        
        const availableWidth = parentWidth - PADDING;
        const scale = Math.min(availableWidth / A4_WIDTH_PX, 1.2); 
        
        containerRef.current.style.transform = `scale(${scale})`;
        containerRef.current.style.transformOrigin = 'top center';
        
        const contentHeight = shadowRootRef.current.body.scrollHeight;
        const displayHeight = Math.max(contentHeight, 1123); 
        
        containerRef.current.style.height = `${displayHeight}px`;
        wrapperRef.current.style.height = `${(displayHeight * scale) + 100}px`; 
      }
    };

    const observer = new ResizeObserver(updateScale);
    if (wrapperRef.current) observer.observe(wrapperRef.current);
    
    setTimeout(updateScale, 100);
    setTimeout(updateScale, 500);
    setTimeout(updateScale, 1000);

    return () => observer.disconnect();
  }, [html]);

  useEffect(() => {
    if (!containerRef.current) return;
    
    if (!shadowRootRef.current) {
        shadowRootRef.current = containerRef.current.attachShadow({ mode: 'open' });
    }
    
    const shadowRoot = shadowRootRef.current;
    
    shadowRoot.innerHTML = `
      <style>
        :host { 
            display: block; 
            width: 794px; 
            min-height: 1123px; 
            height: auto;
            background: white;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            margin: 0 auto;
            overflow: visible; 
            position: relative;
        }
        body { 
            margin: 0; 
            padding: 0; 
            font-family: Arial, sans-serif; 
            width: 100%; 
            min-height: 100%;
            box-sizing: border-box;
            color: black;
            overflow-wrap: break-word;
            word-wrap: break-word;
        }
        * { box-sizing: border-box; max-width: 100%; }
        img { max-width: 100% !important; height: auto !important; display: block; }
        table { width: 100% !important; border-collapse: collapse; table-layout: fixed; }
        td, th { word-wrap: break-word; overflow-wrap: break-word; }
        @media print { :host { display: none; } }
      </style>
      ${html}
    `;
  }, [html]);

  return (
    <div ref={wrapperRef} className="w-full h-full flex items-start justify-center overflow-auto bg-slate-200/50 p-4 custom-scroll">
      <div 
        ref={containerRef} 
        style={{ width: '794px', minHeight: '1123px', transition: 'transform 0.1s ease-out' }}
      ></div>
    </div>
  );
}

// ============================================================================
// 3. DADOS PADRÃO
// ============================================================================

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

const DEFAULT_HTML_TEMPLATE = `<div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333;">
  <h1 style="border-bottom: 2px solid #e2e8f0; color: #0f172a; padding-bottom: 10px;">Termo Padrão</h1>
  <p>Edite este modelo no painel administrativo.</p>
</div>`;

// ============================================================================
// 4. COMPONENTES DE PÁGINA
// ============================================================================

// --- LOGIN PAGE ---
function LoginPage({ onLogin, users, dbReady, systemSettings }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!dbReady) {
        setError('Conectando ao banco de dados... Aguarde.');
        setLoading(false);
        return;
    }

    setTimeout(() => {
      const foundUser = (users || []).find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
      
      if (!foundUser) {
        setError('E-mail não encontrado.');
        setLoading(false);
        return;
      }
      if (!foundUser.active) {
        setError('Conta desativada.');
        setLoading(false);
        return;
      }
      onLogin(foundUser);
      setLoading(false);
    }, 800);
  };

  const handleGoogleLogin = async () => {
    if (!dbReady) return alert('Aguarde a conexão com o sistema.');
    const provider = new GoogleAuthProvider();
    setLoading(true);
    setError('');
    try {
        const result = await signInWithPopup(auth, provider);
        const googleUser = result.user;
        const foundUser = (users || []).find(u => u.email && u.email.toLowerCase() === googleUser.email.toLowerCase());
        if (foundUser) {
            if (!foundUser.active) { setError('Conta desativada.'); await signOut(auth); signInAnonymously(auth); }
            else onLogin(foundUser);
        } else {
            setError('Este e-mail Google não possui convite.'); await signOut(auth); signInAnonymously(auth);
        }
    } catch (err) { setError('Falha na autenticação Google.'); } finally { setLoading(false); }
  };

  const handleDevLogin = () => {
    const devUser = (users || []).length > 0 
        ? users.find(u => u.email === 'dev@core.teste') 
        : DEFAULT_USERS.find(u => u.email === 'dev@core.teste');
    if (devUser) onLogin(devUser); else alert('Usuário DEV não encontrado. Aguarde carregamento.');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 font-sans text-slate-800">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-slate-200">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-lg flex items-center justify-center mb-4 border border-slate-100 shadow-sm bg-slate-50">
             <img src="https://midias-tdw.totvs.com/wp-content/uploads/2025/06/favicon-bg-light-192x192-1.png" alt="Logo" className="w-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">CORE ERP</h1>
          <p className="text-slate-500 text-sm mt-1">Centro de Otimização Operacional</p>
          {!dbReady && <span className="text-xs text-amber-600 font-medium block mt-2">Sincronizando ambiente...</span>}
          {dbReady && <span className="text-xs text-emerald-600 font-medium block mt-2">Ambiente Seguro Conectado</span>}
        </div>
        
        <div className="space-y-6">
          <button type="button" onClick={handleGoogleLogin} disabled={loading} className="w-full bg-white border border-slate-300 text-slate-700 font-medium py-2.5 rounded-md hover:bg-slate-50 transition-colors flex items-center justify-center gap-3 shadow-sm">
            {loading ? <span className="text-sm">Processando...</span> : <><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-4 h-4" /><span className="text-sm">Acessar com Google Workspace</span></>}
          </button>
          
          <div className="flex items-center gap-3">
              <div className="h-px bg-slate-200 flex-1"></div>
              <span className="text-xs text-slate-400 font-medium">ACESSO CREDENCIADO</span>
              <div className="h-px bg-slate-200 flex-1"></div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 text-sm p-3 rounded-md">{error}</div>}
            
            <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail Corporativo</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white border border-slate-300 text-slate-900 rounded-md p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Senha</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white border border-slate-300 text-slate-900 rounded-md p-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
            </div>
            
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-md hover:bg-blue-700 transition-colors shadow-sm text-sm mt-2">
                Entrar no Sistema
            </button>
            
            {systemSettings?.devBypass && (
                <div className="pt-4 text-center border-t border-slate-100">
                    <button type="button" onClick={handleDevLogin} className="text-xs text-slate-500 hover:text-blue-600 font-medium transition-colors">
                     Acesso de Desenvolvedor (Bypass)
                    </button>
                </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

// --- HOME PAGE ---
function HomePage({ onNavigate, user, changelog, toolsConfig }) {
  return (
  <div className="h-full w-full flex flex-col bg-slate-50 overflow-y-auto">
    <div className="bg-white border-b border-slate-200 px-8 py-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Visão Geral</h1>
        <p className="text-slate-500 text-sm mt-1">Acesso rápido aos módulos operacionais do CORE.</p>
      </div>
    </div>

    <div className="flex-1 p-8 max-w-6xl mx-auto w-full flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Módulos Disponíveis</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortTools(toolsConfig).map(([key, tool]) => (
                    <div key={key} onClick={() => tool.active && onNavigate(key)} className={`bg-white p-5 rounded-lg shadow-sm border border-slate-200 transition-all ${tool.active ? 'hover:border-blue-300 hover:shadow-md cursor-pointer' : 'opacity-60 cursor-not-allowed bg-slate-50'}`}>
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded flex-shrink-0 flex items-center justify-center border border-blue-100">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tool.icon} /></svg>
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">{tool.label}</h3>
                                {tool.subTypes && tool.subTypes.length > 0 && <span className="mt-1 text-[10px] bg-slate-100 border border-slate-200 text-slate-600 font-medium px-2 py-0.5 rounded inline-block">{tool.subTypes.length} variações</span>}
                                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{tool.desc}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        <div className="w-full lg:w-80">
             <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Atualizações Recentes</h2>
             <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-0 overflow-hidden">
                <div className="max-h-[500px] overflow-y-auto custom-scroll p-4 space-y-4">
                    {(changelog || []).map(log => (
                        <div key={log.id} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                            <div className="flex justify-between items-center mb-1">
                                <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded">v{log.version}</span>
                                <span className="text-xs text-slate-400 font-medium">{log.date}</span>
                            </div>
                            <h4 className="font-semibold text-slate-800 text-sm mt-1">{log.title}</h4>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{log.content}</p>
                        </div>
                    ))}
                </div>
             </div>
        </div>
    </div>
  </div>
  );
}

// --- ADMIN PANEL ---
function AdminPanel({ users, templates, tagsConfig, delimiters, changelog, toolsConfig, systemSettings, cepMappings }) {
  const [activeTab, setActiveTab] = useState('templates');
  const [targetModule, setTargetModule] = useState(Object.keys(toolsConfig)[0] || '');
  const [targetSubModule, setTargetSubModule] = useState('');
  
  // Tag Management
  const [tagModuleFilter, setTagModuleFilter] = useState(Object.keys(toolsConfig)[0] || '');
  const [tagSubModuleFilter, setTagSubModuleFilter] = useState('');
  const [tagForm, setTagForm] = useState({ id: '', label: '', type: 'text', sessionId: '', options: [] });
  const [editingTag, setEditingTag] = useState(null);
  const [editingTagId, setEditingTagId] = useState(null);
  const [newSessionName, setNewSessionName] = useState('');
  const [tempDelimiters, setTempDelimiters] = useState(delimiters);
  const [newOption, setNewOption] = useState('');

  // Tools Management
  const [showToolModal, setShowToolModal] = useState(false);
  const [toolForm, setToolForm] = useState({ id: '', label: '', desc: '', icon: '', active: true, subTypes: [] });
  const [isEditingTool, setIsEditingTool] = useState(false);
  const [editingToolKey, setEditingToolKey] = useState(null);
  
  // SubTools Management (inside Modal)
  const [newSubType, setNewSubType] = useState({ id: '', label: '' });

  // CEP Integration
  const [cepMapForm, setCepMapForm] = useState({ triggerTag: '', streetTag: '', districtTag: '', cityTag: '', stateTag: '' });
  const [editingCepMapId, setEditingCepMapId] = useState(null);

  // Template Editing
  const [uploadStatus, setUploadStatus] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null); 
  const [htmlContent, setHtmlContent] = useState('');
  const textAreaRef = useRef(null);

  // User Management
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ email: '', name: '', role: 'user', permissions: [] });
  const [editingUserId, setEditingUserId] = useState(null);

  // Changelog Management
  const [newLog, setNewLog] = useState({ version: '', date: '', title: '', content: '' });
  const [editingLogId, setEditingLogId] = useState(null);
  
  // Config Settings
  const [configDevBypass, setConfigDevBypass] = useState(systemSettings?.devBypass ?? true);

  // Editor Tags State
  const [editorEditingTagId, setEditorEditingTagId] = useState(null);
  const [editorTagForm, setEditorTagForm] = useState({ id: '', label: '', type: 'text' });

  // --- COMPOSITE KEY HELPER ---
  const getCurrentTemplateKey = (module, sub) => getCompositeKey(module, sub);

  // Handlers - File Upload
  const handleFileUpload = (e) => {
      const file = e.target.files[0];
      const key = getCurrentTemplateKey(targetModule, targetSubModule);
      
      if(!targetModule) return alert("Selecione um módulo.");
      if(!file) return;

      if(file.name.endsWith('.html')) {
          setUploadStatus('Carregando HTML...');
          const reader = new FileReader();
          reader.onload = async (ev) => {
              await setDoc(getDocRef('templates', key), {
                  name: file.name, content: ev.target.result, date: new Date().toLocaleDateString(), type: 'html'
              });
              setUploadStatus('Sucesso!');
          };
          reader.readAsText(file);
      } else { setUploadStatus('Erro: Apenas .html'); }
  };
  
  const handleEditTemplate = (moduleKey, subKey = '') => { 
      const key = getCurrentTemplateKey(moduleKey, subKey);
      setEditingTemplate(key); 
      setHtmlContent(templates[key]?.content || DEFAULT_HTML_TEMPLATE); 
  };
  
  // --- SUB TYPES MANAGEMENT ---
  const handleAddSubType = () => {
      if (!newSubType.id || !newSubType.label) return;
      setToolForm(prev => ({...prev, subTypes: [...(prev.subTypes || []), { ...newSubType }] }));
      setNewSubType({ id: '', label: '' });
  };
  const handleRemoveSubType = (idx) => {
      setToolForm(prev => ({...prev, subTypes: prev.subTypes.filter((_, i) => i !== idx) }));
  };

  // --- TAGS ---
  const currentTagConfigKey = getCurrentTemplateKey(tagModuleFilter, tagSubModuleFilter);
  
  const insertAtCursor = (textToInsert) => {
    const textarea = textAreaRef.current;
    if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const newText = text.substring(0, start) + textToInsert + text.substring(end);
        setHtmlContent(newText);
        setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
            textarea.focus();
        }, 0);
    }
  };

  const handleAddSession = async () => {
    if (!newSessionName) return;
    const currentConfig = tagsConfig[currentTagConfigKey] || { sessions: [] };
    const newSession = { id: newSessionName.toLowerCase().replace(/\s+/g, '_'), title: newSessionName, active: true, tags: [] };
    const updatedConfig = { ...currentConfig, sessions: [...(currentConfig.sessions || []), newSession] };
    await setDoc(getDocRef('tags', currentTagConfigKey), updatedConfig);
    setNewSessionName('');
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Excluir sessão e todas as suas tags?')) return;
    const currentConfig = tagsConfig[currentTagConfigKey];
    const updatedSessions = currentConfig.sessions.filter(s => s.id !== sessionId);
    await setDoc(getDocRef('tags', currentTagConfigKey), { ...currentConfig, sessions: updatedSessions });
  };

  const handleRenameSession = async (sessionId) => {
      const newTitle = prompt("Novo nome:");
      if(newTitle) {
        const currentConfig = tagsConfig[currentTagConfigKey];
        const updatedSessions = currentConfig.sessions.map(s => s.id === sessionId ? {...s, title: newTitle} : s);
        await setDoc(getDocRef('tags', currentTagConfigKey), { ...currentConfig, sessions: updatedSessions });
      }
  };

  const toggleSessionActive = async (sessionId) => {
      const currentConfig = tagsConfig[currentTagConfigKey];
      const sessions = currentConfig.sessions.map(s => s.id === sessionId ? { ...s, active: !s.active } : s);
      await setDoc(getDocRef('tags', currentTagConfigKey), { ...currentConfig, sessions });
  };

  const saveTag = async (id, label, type, configKey, isEdit = false, originalId = null, sessionId = null) => {
      const cleanId = id.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      const currentConfig = tagsConfig[configKey] || { sessions: [] };
      const sessions = JSON.parse(JSON.stringify(currentConfig.sessions));
      
      const targetSessionId = sessionId || (editingTag ? editingTag.sessionId : tagForm.sessionId) || sessions[0]?.id;
      const sessionIndex = sessions.findIndex(s => s.id === targetSessionId);
      
      if(sessionIndex === -1) return false;

      const newTag = { 
          id: cleanId, 
          label: label, 
          type: type,
          options: type === 'checkbox' ? (tagForm.options || []) : [] 
      };

      if (isEdit && originalId) {
          for (let s of sessions) {
             const tIdx = s.tags.findIndex(t => t.id === originalId);
             if(tIdx !== -1) { s.tags.splice(tIdx, 1); break; }
          }
      } else {
          let exists = false;
          sessions.forEach(s => { if(s.tags.some(t => t.id === cleanId)) exists = true; });
          if(exists) return false;
      }
      
      sessions[sessionIndex].tags.push(newTag);
      await setDoc(getDocRef('tags', configKey), { ...currentConfig, sessions });
      return true;
  };

  const handleSaveTagPanel = async (e) => {
      e.preventDefault();
      const success = await saveTag(tagForm.id, tagForm.label, tagForm.type, currentTagConfigKey, !!editingTag, editingTag?.tagData.id, tagForm.sessionId);
      if(success) {
        setTagForm({ id: '', label: '', type: 'text', sessionId: tagForm.sessionId, options: [] });
        setEditingTag(null);
        setEditingTagId(null);
      } else { alert('Erro ou tag duplicada!'); }
  };
  const handleDeleteTag = async (sessionId, tagIndex, configKey = currentTagConfigKey) => {
      if(!window.confirm('Excluir?')) return;
      const currentConfig = tagsConfig[configKey];
      const sessions = JSON.parse(JSON.stringify(currentConfig.sessions));
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      sessions[sessionIndex].tags.splice(tagIndex, 1);
      await setDoc(getDocRef('tags', configKey), { ...currentConfig, sessions });
  };
  const handleEditTagClick = (tag, sessionId, idx) => {
      setEditingTag({ sessionId, tagIndex: idx, tagData: tag });
      setEditingTagId(tag.id);
      setTagForm({ ...tag, sessionId, options: tag.options || [] });
  };
  
  const handleAddOption = () => {
    if (!newOption.trim()) return;
    setTagForm(prev => ({ ...prev, options: [...(prev.options || []), newOption.trim()] }));
    setNewOption('');
  };
  
  const handleRemoveOption = (index) => {
    setTagForm(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
  };

  const handleSaveTagInEditor = async (e) => {
    e.preventDefault();
    const success = await saveTag(editorTagForm.id, editorTagForm.label, editorTagForm.type, editingTemplate, true, editorEditingTagId, null);
    if(success) { setEditorEditingTagId(null); setEditorTagForm({ id: '', label: '', type: 'text' }); } else { alert("Erro."); }
  };
  const prepareEditTagInEditor = (tag) => { setEditorEditingTagId(tag.id); setEditorTagForm(tag); };
  const handleDeleteTagInEditor = (tagId) => { 
      const currentSessions = tagsConfig[editingTemplate]?.sessions || []; 
      let foundSessionId = null; let foundIndex = -1; 
      for(let s of currentSessions) { const idx = s.tags.findIndex(t => t.id === tagId); if(idx !== -1) { foundSessionId = s.id; foundIndex = idx; break; } } 
      if(foundSessionId) handleDeleteTag(foundSessionId, foundIndex, editingTemplate); 
  };
  const handleCreateCustomTagInEditor = async (tagInput) => {
    if(!tagInput) return;
    const cleanId = tagInput.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const tagText = `${delimiters.prefix}${cleanId}${delimiters.suffix}`;
    insertAtCursor(tagText);
    const currentConfig = tagsConfig[editingTemplate] || { sessions: [{id:'geral', title:'Geral', active:true, tags:[]}] };
    const sessions = JSON.parse(JSON.stringify(currentConfig.sessions));
    if(sessions.length === 0) sessions.push({id:'geral', title:'Geral', active:true, tags:[]});
    let exists = false;
    sessions.forEach(s => { if(s.tags.some(t => t.id === cleanId)) exists = true; });
    if(!exists) {
        sessions[0].tags.push({ id: cleanId, label: cleanId.replace(/_/g, ' '), type: 'text' });
        await setDoc(getDocRef('tags', editingTemplate), { ...currentConfig, sessions });
    }
  };

  const handleSaveTool = async (e) => { e.preventDefault(); const cleanId = toolForm.id.toLowerCase().replace(/[^a-z0-9_]/g, '_'); const newToolsConfig = { ...toolsConfig }; if (isEditingTool && editingToolKey && editingToolKey !== cleanId) delete newToolsConfig[editingToolKey]; newToolsConfig[cleanId] = { ...toolForm, icon: toolForm.icon || 'M13 10V3L4 14h7v7l9-11h-7z' }; delete newToolsConfig[cleanId].id; await setDoc(getDocRef('settings', 'tools'), newToolsConfig); setShowToolModal(false); setToolForm({ id: '', label: '', desc: '', icon: '', active: true, subTypes: [] }); };
  const prepareEditTool = (key, tool) => { setEditingToolKey(key); setToolForm({ id: key, ...tool, subTypes: tool.subTypes || [] }); setIsEditingTool(true); setShowToolModal(true); };
  const handleDeleteTool = async (key) => { if(window.confirm('Excluir?')) { const n = { ...toolsConfig }; delete n[key]; await setDoc(getDocRef('settings', 'tools'), n); }};

  const handleSaveEditedTemplate = async () => { await setDoc(getDocRef('templates', editingTemplate), { name: 'Editado Manualmente', content: htmlContent, date: new Date().toLocaleDateString(), type: 'html' }); setEditingTemplate(null); };
  const handleSaveDelimiters = async () => { await setDoc(getDocRef('settings', 'delimiters'), tempDelimiters); alert('Símbolos Salvos.'); };

  const handleSaveUser = async (e) => { e.preventDefault(); const uid=editingUserId||Date.now().toString(); const d={...userForm, id:uid, active:true}; if(d.role==='admin') d.permissions=['all']; await setDoc(getDocRef('users',uid),d,{merge:true}); setShowUserModal(false); };
  const removeUser = async (id) => { if(window.confirm('Remover usuário?')) await deleteDoc(getDocRef('users', id)); };
  const handleEditUserClick = (u) => { setUserForm(u); setEditingUserId(u.id); setShowUserModal(true); };
  
  const handleSaveLog = async (e) => { e.preventDefault(); const id=editingLogId||Date.now().toString(); await setDoc(getDocRef('changelog',id),{...newLog,id},{merge:true}); setEditingLogId(null); setNewLog({version:'',date:'',title:'',content:''}); };
  const handleDeleteLog = async (id) => await deleteDoc(getDocRef('changelog',id));
  
  const handleSaveConfig = async () => {
      await setDoc(getDocRef('settings', 'config'), { devBypass: configDevBypass }, { merge: true });
      alert('Configurações do sistema salvas com sucesso.');
  };

  const handleSaveCepMapping = async () => {
      const currentMappings = cepMappings || [];
      let updatedMappings;
      if (editingCepMapId) {
          updatedMappings = currentMappings.map(m => m.id === editingCepMapId ? { ...m, ...cepMapForm } : m);
          setEditingCepMapId(null);
      } else {
          const newMapping = { id: Date.now().toString(), ...cepMapForm };
          updatedMappings = [...currentMappings, newMapping];
      }
      await setDoc(getDocRef('settings', 'cepMappings'), { list: updatedMappings });
      setCepMapForm({ triggerTag: '', streetTag: '', districtTag: '', cityTag: '', stateTag: '' });
  };
  const handleEditCepMapping = (mapping) => { setEditingCepMapId(mapping.id); setCepMapForm({ triggerTag: mapping.triggerTag, streetTag: mapping.streetTag, districtTag: mapping.districtTag, cityTag: mapping.cityTag, stateTag: mapping.stateTag }); };
  const handleDeleteCepMapping = async (mapId) => { if(!window.confirm('Remover regra de integração?')) return; const updatedMappings = (cepMappings || []).filter(m => m.id !== mapId); await setDoc(getDocRef('settings', 'cepMappings'), { list: updatedMappings }); };

  const onDragStart = (e, sessionId, tagIndex) => { e.dataTransfer.setData("text/plain", JSON.stringify({ sessionId, tagIndex, module: currentTagConfigKey })); e.dataTransfer.effectAllowed = 'move'; };
  const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = async (e, targetSessionId, targetIndex = null) => {
      e.preventDefault(); e.stopPropagation();
      const dataStr = e.dataTransfer.getData("text/plain"); if(!dataStr) return;
      const data = JSON.parse(dataStr); if (data.module !== currentTagConfigKey) return;
      const currentConfig = tagsConfig[currentTagConfigKey];
      const sessions = JSON.parse(JSON.stringify(currentConfig.sessions));
      const sourceSessionIndex = sessions.findIndex(s => s.id === data.sessionId);
      const targetSessionIndex = sessions.findIndex(s => s.id === targetSessionId);

      if (sourceSessionIndex !== -1 && targetSessionIndex !== -1) {
          const sourceSession = sessions[sourceSessionIndex];
          const targetSession = sessions[targetSessionIndex];
          const [movedTag] = sourceSession.tags.splice(data.tagIndex, 1);
          if (targetIndex !== null) targetSession.tags.splice(targetIndex, 0, movedTag);
          else targetSession.tags.push(movedTag);
          await setDoc(getDocRef('tags', currentTagConfigKey), { ...currentConfig, sessions });
      }
  };

  return (
    <div className="flex h-full w-full bg-slate-50 overflow-hidden">
      <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col no-print z-10 shadow-sm">
        <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Setup ERP</h2>
        </div>
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
            {['templates', 'tags', 'tools', 'integrations', 'users', 'changelog', 'config'].map(tab => (
                <button 
                    key={tab} 
                    onClick={() => setActiveTab(tab)} 
                    className={`w-full text-left px-5 py-2.5 text-sm font-medium transition-colors border-l-4 ${activeTab === tab ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                    {tab === 'templates' && 'Gerenciar Modelos'}
                    {tab === 'tags' && 'Dicionário de Dados'}
                    {tab === 'tools' && 'Módulos do Sistema'}
                    {tab === 'integrations' && 'Integrações Externas'}
                    {tab === 'users' && 'Controle de Acessos'}
                    {tab === 'changelog' && 'Histórico de Versões'}
                    {tab === 'config' && 'Configurações Gerais'}
                </button>
            ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scroll">
        <div className="max-w-5xl mx-auto">
            {/* Header da aba ativa */}
            <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 capitalize">{activeTab}</h2>
                <p className="text-sm text-slate-500">Configuração e manutenção do módulo operacional.</p>
            </div>

            {activeTab === 'templates' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Importar Arquivo Estrutural (.html)</h3>
                        <div className="flex gap-4 items-center">
                            <select value={targetModule} onChange={(e) => setTargetModule(e.target.value)} className="border border-slate-300 p-2 rounded text-sm w-1/3 outline-none focus:border-blue-500 bg-slate-50">
                                {sortTools(toolsConfig).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
                            </select>
                            <input type="file" accept=".html" onChange={handleFileUpload} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition"/>
                        </div>
                        {toolsConfig[targetModule]?.subTypes && toolsConfig[targetModule].subTypes.length > 0 && (
                             <div className="flex gap-2 mt-4 items-center">
                                <span className="text-xs font-semibold text-slate-500">Variante do Módulo:</span>
                                {toolsConfig[targetModule].subTypes.map(sub => (
                                    <button key={sub.id} onClick={() => handleEditTemplate(targetModule, sub.id)} className="text-xs bg-slate-100 px-3 py-1.5 rounded-md hover:bg-slate-200 border border-slate-200 transition font-medium text-slate-700">
                                        {sub.label}
                                    </button>
                                ))}
                             </div>
                        )}
                        {uploadStatus && <p className="text-xs font-medium text-blue-600 mt-3">{uploadStatus}</p>}
                    </div>
                    <div className="grid gap-4">
                        {sortTools(toolsConfig).map(([key, tool]) => (
                            <div key={key} className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                                <div className="flex justify-between items-center mb-2">
                                    <div>
                                        <p className="font-semibold text-sm text-slate-900">{tool.label}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Template em uso: {templates[key] ? templates[key].name : 'Layout Padrão do Sistema'}</p>
                                    </div>
                                    <button onClick={() => handleEditTemplate(key)} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium px-3 py-1.5 rounded-md text-xs transition">Editor de Código</button>
                                </div>
                                {tool.subTypes && tool.subTypes.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                                        {tool.subTypes.map(sub => (
                                            <div key={sub.id} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                                                <span className="text-xs font-medium text-slate-700">{sub.label}</span>
                                                <button onClick={() => handleEditTemplate(key, sub.id)} className="text-blue-600 text-xs font-semibold hover:text-blue-800 transition">Editar Variante</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {activeTab === 'tags' && (
                <div className="flex flex-col lg:flex-row gap-6 items-start h-full">
                     <div className="w-full lg:w-1/3 bg-white p-5 rounded-lg shadow-sm border border-slate-200 sticky top-0 max-h-[80vh] overflow-y-auto custom-scroll">
                        <div className="mb-6 border-b border-slate-100 pb-5">
                            <label className="text-xs font-semibold text-slate-600 block mb-1">Módulo Alvo</label>
                            <select value={tagModuleFilter} onChange={(e) => { setTagModuleFilter(e.target.value); setTagSubModuleFilter(''); setEditingTag(null); }} className="w-full border border-slate-300 p-2 rounded-md text-sm mb-4 bg-slate-50 focus:border-blue-500 outline-none">
                                {sortTools(toolsConfig).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
                            </select>

                            {toolsConfig[tagModuleFilter]?.subTypes?.length > 0 && (
                                <div className="mb-4">
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Sub-tipo (Opcional)</label>
                                    <select value={tagSubModuleFilter} onChange={(e) => setTagSubModuleFilter(e.target.value)} className="w-full border border-slate-300 p-2 rounded-md text-sm bg-slate-50 focus:border-blue-500 outline-none">
                                        <option value="">Geral (Padrão)</option>
                                        {toolsConfig[tagModuleFilter].subTypes.map(sub => (
                                            <option key={sub.id} value={sub.id}>{sub.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <label className="text-xs font-semibold text-slate-600 block mb-1 mt-2">Criar Bloco de Dados (Sessão)</label>
                            <div className="flex gap-2 mb-5">
                                <input value={newSessionName} onChange={e => setNewSessionName(e.target.value)} className="flex-1 border border-slate-300 p-2 rounded-md text-sm outline-none focus:border-blue-500" placeholder="Ex: Dados Pessoais" />
                                <button onClick={handleAddSession} className="bg-slate-800 text-white px-3 rounded-md font-bold text-sm hover:bg-slate-900">+</button>
                            </div>
                            
                            <label className="text-xs font-semibold text-slate-600 block mb-1">Delimitadores de Tag no HTML</label>
                            <div className="flex gap-2 mb-2">
                                <input value={tempDelimiters.prefix} onChange={e => setTempDelimiters({...tempDelimiters, prefix: e.target.value})} className="w-1/2 border border-slate-300 p-1.5 rounded-md text-sm text-center font-mono bg-slate-50" />
                                <input value={tempDelimiters.suffix} onChange={e => setTempDelimiters({...tempDelimiters, suffix: e.target.value})} className="w-1/2 border border-slate-300 p-1.5 rounded-md text-sm text-center font-mono bg-slate-50" />
                            </div>
                            <button onClick={handleSaveDelimiters} className="w-full bg-white border border-slate-300 text-slate-700 text-xs py-1.5 rounded-md font-medium hover:bg-slate-50 transition">Aplicar Símbolos</button>
                        </div>

                        <form onSubmit={handleSaveTagPanel} className="space-y-4">
                            <h3 className="font-semibold text-sm text-slate-900 border-b border-slate-100 pb-2">{editingTagId ? 'Manutenção de Tag' : 'Cadastro de Nova Tag'}</h3>
                            <div>
                                <select value={tagForm.sessionId} onChange={e => setTagForm({...tagForm, sessionId: e.target.value})} className="w-full border border-slate-300 p-2 rounded-md text-sm outline-none focus:border-blue-500 bg-white" required>
                                    <option value="" disabled>Selecionar Bloco...</option>
                                    {(tagsConfig[currentTagConfigKey]?.sessions || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                </select>
                            </div>
                            <div>
                                <input value={tagForm.id} onChange={e => setTagForm({...tagForm, id: e.target.value})} className="w-full border border-slate-300 p-2 rounded-md text-sm font-mono uppercase outline-none focus:border-blue-500" placeholder="IDENTIFICADOR (Ex: NOME_COMPLETO)" required />
                            </div>
                            <div>
                                <input value={tagForm.label} onChange={e => setTagForm({...tagForm, label: e.target.value})} className="w-full border border-slate-300 p-2 rounded-md text-sm outline-none focus:border-blue-500" placeholder="Rótulo de Exibição" required />
                            </div>
                            <div>
                                <select value={tagForm.type} onChange={e => setTagForm({...tagForm, type: e.target.value})} className="w-full border border-slate-300 p-2 rounded-md text-sm outline-none focus:border-blue-500 bg-white">
                                    <option value="text">Campo de Texto</option>
                                    <option value="date">Data (Calendário)</option>
                                    <option value="email">Endereço de E-mail</option>
                                    <option value="checkbox">Caixa de Seleção (Múltipla)</option>
                                </select>
                            </div>

                            {tagForm.type === 'checkbox' && (
                                <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                                    <label className="text-xs font-semibold text-slate-600 block mb-2">Opções Disponíveis</label>
                                    <div className="flex gap-2 mb-3">
                                        <input 
                                            className="flex-1 border border-slate-300 p-1.5 text-sm rounded-md outline-none focus:border-blue-500" 
                                            placeholder="Descreva a opção..." 
                                            value={newOption} 
                                            onChange={(e) => setNewOption(e.target.value)}
                                            onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddOption(); } }}
                                        />
                                        <button type="button" onClick={handleAddOption} className="bg-slate-800 text-white px-3 rounded-md text-sm font-bold hover:bg-slate-900">+</button>
                                    </div>
                                    <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scroll pr-1">
                                        {(tagForm.options || []).map((opt, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-white px-2 py-1.5 rounded border border-slate-200 text-xs shadow-sm">
                                                <span className="font-medium text-slate-700">{opt}</span>
                                                <button type="button" onClick={() => handleRemoveOption(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded font-bold transition">×</button>
                                            </div>
                                        ))}
                                        {(tagForm.options || []).length === 0 && <span className="text-[10px] text-slate-400 italic">Nenhuma opção cadastrada.</span>}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 pt-2">
                                <button type="submit" className="flex-1 bg-blue-600 text-white font-medium py-2 rounded-md text-sm hover:bg-blue-700 transition shadow-sm">{editingTag ? 'Atualizar Registro' : 'Gravar Tag'}</button>
                                {editingTag && <button type="button" onClick={() => { setEditingTag(null); setEditingTagId(null); setTagForm({id:'', label:'', type:'text', sessionId: '', options: []}) }} className="px-4 border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 rounded-md transition font-medium">Cancelar</button>}
                            </div>
                        </form>
                     </div>
                     
                     <div className="flex-1 space-y-5">
                         {(tagsConfig[currentTagConfigKey]?.sessions || []).map((session) => (
                             <div 
                                key={session.id} 
                                className={`bg-white rounded-lg shadow-sm border ${session.active ? 'border-slate-200' : 'border-slate-200 bg-slate-50 opacity-75'}`} 
                                onDragOver={onDragOver} 
                                onDrop={(e) => handleDrop(e, session.id)} 
                            >
                                 <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center rounded-t-lg">
                                     <div className="flex items-center gap-3">
                                        <button onClick={() => toggleSessionActive(session.id)} title="Alternar status do bloco" className={`w-2.5 h-2.5 rounded-full ${session.active ? 'bg-emerald-500' : 'bg-slate-300'}`}></button>
                                        <h4 className="font-semibold text-sm text-slate-800 tracking-wide uppercase">{session.title}</h4>
                                     </div>
                                     <div className="flex gap-3">
                                         <button onClick={() => handleRenameSession(session.id)} className="text-slate-500 hover:text-blue-600 text-xs font-medium transition">Renomear</button>
                                         <span className="text-slate-300">|</span>
                                         <button onClick={() => handleDeleteSession(session.id)} className="text-slate-500 hover:text-red-600 text-xs font-medium transition">Excluir Bloco</button>
                                     </div>
                                 </div>
                                 <div className="divide-y divide-slate-100 min-h-[50px]">
                                     {session.tags.map((tag, idx) => (
                                         <div 
                                            key={tag.id} 
                                            draggable 
                                            onDragStart={(e) => onDragStart(e, session.id, idx)} 
                                            onDragOver={onDragOver}
                                            onDrop={(e) => handleDrop(e, session.id, idx)} 
                                            className={`px-4 py-3 flex justify-between items-center hover:bg-blue-50/50 cursor-move group transition-colors ${editingTagId === tag.id ? 'bg-blue-50 border-l-2 border-blue-500' : 'border-l-2 border-transparent'}`}
                                        >
                                             <div className="flex flex-col gap-0.5">
                                                 <div className="flex items-center gap-2">
                                                     <span className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-semibold">{tempDelimiters.prefix}{tag.id}{tempDelimiters.suffix}</span>
                                                     {tag.type === 'checkbox' && <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50 px-1 border border-slate-200 rounded">Lista</span>}
                                                 </div>
                                                 <span className="text-sm text-slate-700 font-medium">{tag.label}</span>
                                             </div>
                                             <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                 <button onClick={() => handleEditTagClick(tag, session.id, idx)} className="text-blue-600 text-xs font-semibold hover:underline">Modificar</button>
                                                 <button onClick={() => handleDeleteTag(session.id, idx, currentTagConfigKey)} className="text-red-500 text-xs font-semibold hover:underline">Remover</button>
                                             </div>
                                         </div>
                                     ))}
                                     {session.tags.length === 0 && <div className="p-4 text-center text-xs text-slate-400 italic">Arraste tags para cá ou cadastre uma nova neste bloco.</div>}
                                 </div>
                             </div>
                         ))}
                     </div>
                </div>
            )}
            
            {activeTab === 'tools' && (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <button onClick={() => { setIsEditingTool(false); setToolForm({ id: '', label: '', desc: '', icon: '', active: true, subTypes: [] }); setShowToolModal(true); }} className="bg-blue-600 text-white px-5 py-2 rounded-md font-medium text-sm hover:bg-blue-700 shadow-sm transition">Cadastrar Novo Gerador</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {sortTools(toolsConfig).map(([key, tool]) => (
                            <div key={key} className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col justify-between h-auto hover:border-slate-300 hover:shadow-md transition-all">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded border border-slate-200 flex items-center justify-center">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tool.icon} /></svg>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${tool.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{tool.active ? 'Online' : 'Offline'}</span>
                                    </div>
                                    <h4 className="font-semibold text-slate-900 text-base">{tool.label}</h4>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5 mb-2">ID: {key}</p>
                                    
                                    {tool.subTypes && tool.subTypes.length > 0 && (
                                        <div className="mb-3 flex flex-wrap gap-1.5">
                                            {tool.subTypes.map(st => <span key={st.id} className="text-[10px] bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded font-medium">{st.label}</span>)}
                                        </div>
                                    )}
                                    <p className="text-sm text-slate-600 line-clamp-2">{tool.desc}</p>
                                </div>
                                <div className="flex gap-4 mt-5 pt-4 border-t border-slate-100 justify-end">
                                    <button onClick={() => prepareEditTool(key, tool)} className="text-blue-600 text-sm font-medium hover:text-blue-800 transition">Configurar</button>
                                    <button onClick={() => handleDeleteTool(key)} className="text-red-500 text-sm font-medium hover:text-red-700 transition">Excluir</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <button onClick={() => { setEditingUserId(null); setUserForm({ email: '', name: '', role: 'user', permissions: [] }); setShowUserModal(true); }} className="bg-blue-600 text-white px-5 py-2 rounded-md font-medium text-sm hover:bg-blue-700 shadow-sm transition">Convidar Usuário</button>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3 font-semibold text-slate-600 uppercase text-xs tracking-wider">Colaborador</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600 uppercase text-xs tracking-wider">E-mail Corporativo</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600 uppercase text-xs tracking-wider">Perfil de Acesso</th>
                                    <th className="px-5 py-3 text-right font-semibold text-slate-600 uppercase text-xs tracking-wider">Gestão</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-4 font-medium text-slate-900">{u.name}</td>
                                        <td className="px-5 py-4 text-slate-600">{u.email}</td>
                                        <td className="px-5 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold uppercase border ${u.role === 'admin' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{u.role}</span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button onClick={() => handleEditUserClick(u)} className="text-blue-600 font-medium text-sm mr-4 hover:underline">Acessos</button>
                                            <button onClick={() => removeUser(u.id)} className="text-red-500 font-medium text-sm hover:underline">Revogar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'changelog' && (
                 <div className="space-y-6">
                     <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                         <h3 className="text-sm font-semibold text-slate-800 mb-4">Registro de Atualização</h3>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <input value={newLog.version} onChange={e => setNewLog({...newLog, version: e.target.value})} placeholder="Numeração (Ex: 5.0.1)" className="border border-slate-300 p-2 rounded-md text-sm outline-none focus:border-blue-500"/>
                            <input type="date" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} className="border border-slate-300 p-2 rounded-md text-sm outline-none focus:border-blue-500 text-slate-600"/>
                            <input value={newLog.title} onChange={e => setNewLog({...newLog, title: e.target.value})} placeholder="Título da Atualização" className="border border-slate-300 p-2 rounded-md text-sm outline-none focus:border-blue-500"/>
                         </div>
                         <textarea value={newLog.content} onChange={e => setNewLog({...newLog, content: e.target.value})} placeholder="Descreva os itens técnicos e operacionais alterados nesta versão..." className="w-full border border-slate-300 p-3 rounded-md text-sm h-24 mb-4 outline-none focus:border-blue-500 resize-none"/>
                         <div className="flex justify-end">
                            <button onClick={handleSaveLog} className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition">{editingLogId ? 'Sobrescrever Registro' : 'Gravar Histórico'}</button>
                         </div>
                     </div>
                     
                     <div className="space-y-4">
                        {(changelog || []).map(log => (
                            <div key={log.id} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="bg-slate-800 text-white text-xs font-bold px-2 py-0.5 rounded-md">v{log.version}</span>
                                        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{log.date}</span>
                                    </div>
                                    <h4 className="font-semibold text-slate-900 text-base">{log.title}</h4>
                                    <p className="text-sm text-slate-600 mt-1.5 leading-relaxed max-w-3xl">{log.content}</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => { setNewLog(log); setEditingLogId(log.id); }} className="text-blue-600 text-xs font-medium border border-blue-200 bg-blue-50 px-3 py-1 rounded hover:bg-blue-100 transition">Editar</button>
                                    <button onClick={() => handleDeleteLog(log.id)} className="text-red-600 text-xs font-medium border border-red-200 bg-red-50 px-3 py-1 rounded hover:bg-red-100 transition">Excluir</button>
                                </div>
                            </div>
                        ))}
                     </div>
                 </div>
            )}

            {activeTab === 'integrations' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <h3 className="font-semibold text-lg text-slate-900">{editingCepMapId ? 'Manutenção de Endpoint' : 'Motor de Busca (ViaCEP)'}</h3>
                        </div>
                        <p className="text-sm text-slate-500 mb-6 pb-4 border-b border-slate-100">Defina o mapeamento de variáveis locais para injeção autônoma de dados via API dos Correios.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Gatilho de Requisição (Tag CEP)</label>
                                <input value={cepMapForm.triggerTag} onChange={e => setCepMapForm({...cepMapForm, triggerTag: e.target.value.toUpperCase()})} className="w-full lg:w-1/2 border border-slate-300 p-2.5 rounded-md text-sm font-mono uppercase bg-slate-50 focus:border-blue-500 outline-none" placeholder="Ex: CEP_COLABORADOR"/>
                            </div>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Injetar em Logradouro</label><input value={cepMapForm.streetTag} onChange={e => setCepMapForm({...cepMapForm, streetTag: e.target.value.toUpperCase()})} className="w-full border border-slate-300 p-2 rounded-md text-sm uppercase font-mono focus:border-blue-500 outline-none" placeholder="Ex: RUA_DESTINO"/></div>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Injetar em Bairro</label><input value={cepMapForm.districtTag} onChange={e => setCepMapForm({...cepMapForm, districtTag: e.target.value.toUpperCase()})} className="w-full border border-slate-300 p-2 rounded-md text-sm uppercase font-mono focus:border-blue-500 outline-none" placeholder="Ex: BAIRRO_DESTINO"/></div>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Injetar em Município</label><input value={cepMapForm.cityTag} onChange={e => setCepMapForm({...cepMapForm, cityTag: e.target.value.toUpperCase()})} className="w-full border border-slate-300 p-2 rounded-md text-sm uppercase font-mono focus:border-blue-500 outline-none" placeholder="Ex: CIDADE_DESTINO"/></div>
                            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Injetar em Unidade Federativa (UF)</label><input value={cepMapForm.stateTag} onChange={e => setCepMapForm({...cepMapForm, stateTag: e.target.value.toUpperCase()})} className="w-full border border-slate-300 p-2 rounded-md text-sm uppercase font-mono focus:border-blue-500 outline-none" placeholder="Ex: ESTADO_DESTINO"/></div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleSaveCepMapping} className="bg-slate-800 text-white px-6 py-2 rounded-md font-medium text-sm hover:bg-slate-900 transition">{editingCepMapId ? 'Atualizar Mapeamento' : 'Registrar Automação'}</button>
                            {editingCepMapId && <button onClick={() => { setEditingCepMapId(null); setCepMapForm({ triggerTag: '', streetTag: '', districtTag: '', cityTag: '', stateTag: '' }) }} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md font-medium text-sm hover:bg-slate-50 transition">Cancelar</button>}
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                         <table className="w-full text-sm text-left border-collapse">
                             <thead className="bg-slate-50 border-b border-slate-200">
                                 <tr>
                                     <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Tag Gatilho</th>
                                     <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Retorno: Endereço</th>
                                     <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Retorno: Geo</th>
                                     <th className="px-4 py-3 text-right font-semibold text-slate-600 text-xs uppercase">Controle</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                                 {(cepMappings || []).map(map => (
                                     <tr key={map.id} className="hover:bg-slate-50 transition-colors">
                                         <td className="px-4 py-3 font-mono font-semibold text-slate-900">{map.triggerTag}</td>
                                         <td className="px-4 py-3 text-slate-600 text-xs font-mono">{map.streetTag || '-'} <br/> {map.districtTag || '-'}</td>
                                         <td className="px-4 py-3 text-slate-600 text-xs font-mono">{map.cityTag} / {map.stateTag}</td>
                                         <td className="px-4 py-3 text-right">
                                             <button onClick={() => handleEditCepMapping(map)} className="text-blue-600 font-medium text-sm mr-4 hover:underline">Revisar</button>
                                             <button onClick={() => handleDeleteCepMapping(map.id)} className="text-red-500 font-medium text-sm hover:underline">Remover</button>
                                         </td>
                                     </tr>
                                 ))}
                                 {(cepMappings || []).length === 0 && <tr><td colSpan="4" className="text-center py-6 text-slate-400 text-sm">Nenhum mapeamento ativo.</td></tr>}
                             </tbody>
                         </table>
                    </div>
                </div>
            )}
            
            {activeTab === 'config' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                        <h3 className="font-semibold text-lg text-slate-900 mb-5 border-b border-slate-100 pb-2">Ambiente & Operação</h3>
                        <label className="flex items-start gap-4 p-4 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50 transition bg-white">
                            <div className="mt-0.5">
                                <input type="checkbox" checked={configDevBypass} onChange={(e) => setConfigDevBypass(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
                            </div>
                            <div>
                                <span className="block font-semibold text-slate-900">Acesso Bypass (Desenvolvedor)</span>
                                <span className="text-sm text-slate-500 block mt-1 leading-relaxed">Libera no painel de autenticação um botão para contornar a validação padrão. Utilizado exclusivamente para suporte emergencial ou ambiente de homologação offline.</span>
                            </div>
                        </label>
                        <div className="mt-6 flex justify-end">
                            <button onClick={handleSaveConfig} className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium text-sm hover:bg-blue-700 transition shadow-sm">Aplicar Configuração</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
      
      {/* Editor & User Modals */}
      {editingTemplate && (
            <div className="fixed inset-0 bg-slate-900/95 z-[60] flex flex-col backdrop-blur-sm p-4 md:p-8">
                <div className="bg-white text-slate-800 rounded-t-xl overflow-hidden flex-1 flex flex-col shadow-2xl max-w-[1600px] mx-auto w-full">
                    <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center border-b border-slate-700">
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                            <span className="font-semibold tracking-wide">Ambiente de Desenvolvimento HTML <span className="opacity-50 text-sm ml-2 font-normal">({toolsConfig[editingTemplate]?.label || editingTemplate})</span></span>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setEditingTemplate(null)} className="text-slate-300 hover:text-white px-4 py-1.5 text-sm font-medium transition">Descartar</button>
                            <button onClick={handleSaveEditedTemplate} className="bg-blue-600 hover:bg-blue-500 px-5 py-1.5 rounded-md text-sm font-medium transition shadow-sm">Publicar Layout</button>
                        </div>
                    </div>
                    <div className="flex-1 flex overflow-hidden bg-slate-50">
                        <div className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
                            <div className="p-3 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider text-center">Dicionário Ativo</div>
                            <div className="p-3 overflow-y-auto custom-scroll flex-1">
                                {editorEditingTagId ? (
                                    <div className="p-4 bg-blue-50 rounded-md border border-blue-200 shadow-sm mb-4">
                                        <h4 className="text-xs font-bold text-blue-800 mb-3 uppercase tracking-wider">Edição Rápida</h4>
                                        <input className="w-full bg-white text-slate-900 text-sm p-2 mb-2 border border-blue-200 rounded outline-none focus:border-blue-500 font-mono uppercase" value={editorTagForm.id} onChange={e => setEditorTagForm({...editorTagForm, id: e.target.value.toUpperCase()})} placeholder="ID" />
                                        <input className="w-full bg-white text-slate-900 text-sm p-2 mb-2 border border-blue-200 rounded outline-none focus:border-blue-500" value={editorTagForm.label} onChange={e => setEditorTagForm({...editorTagForm, label: e.target.value})} placeholder="Rótulo" />
                                        <select className="w-full bg-white text-slate-900 text-sm p-2 mb-3 border border-blue-200 rounded outline-none focus:border-blue-500" value={editorTagForm.type} onChange={e => setEditorTagForm({...editorTagForm, type: e.target.value})}>
                                            <option value="text">Texto</option><option value="date">Data</option><option value="email">Email</option>
                                        </select>
                                        <div className="flex gap-2">
                                            <button onClick={handleSaveTagInEditor} className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium flex-1 hover:bg-blue-700">Confirmar</button>
                                            <button onClick={() => setEditorEditingTagId(null)} className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded text-xs font-medium hover:bg-slate-50">Sair</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {(tagsConfig[editingTemplate]?.sessions || []).map(s => (
                                            <div key={s.id}>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5 pb-1 border-b border-slate-100">{s.title}</p>
                                                <div className="space-y-1">
                                                    {s.tags.map(tag => (
                                                        <div key={tag.id} className="group flex items-center justify-between px-2 py-1.5 hover:bg-slate-100 rounded-md transition-colors border border-transparent hover:border-slate-200">
                                                            <button onClick={() => insertAtCursor(`${delimiters.prefix}${tag.id}${delimiters.suffix}`)} className="text-left flex-1 min-w-0" title="Clique para inserir no código">
                                                                <span className="text-slate-800 text-xs font-medium block truncate">{tag.label}</span>
                                                                <span className="text-blue-600 font-mono text-[10px] opacity-80 block">{delimiters.prefix}{tag.id}{delimiters.suffix}</span>
                                                            </button>
                                                            <div className="hidden group-hover:flex gap-1 bg-slate-100 pl-1 rounded">
                                                                <button onClick={() => prepareEditTagInEditor(tag)} className="text-slate-400 hover:text-blue-600 p-1 transition"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                                                <button onClick={() => handleDeleteTagInEditor(tag.id)} className="text-slate-400 hover:text-red-500 p-1 transition"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="p-3 bg-slate-50 border-t border-slate-200">
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">Criação Rápida (Texto)</label>
                                <input className="bg-white border border-slate-300 text-slate-900 text-xs p-2 rounded-md w-full outline-none focus:border-blue-500 transition" placeholder="Digite a TAG e pressione Enter" onKeyDown={(e) => { if(e.key === 'Enter') { handleCreateCustomTagInEditor(e.target.value); e.target.value = ''; } }} />
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col relative bg-[#1e1e1e]">
                             <div className="bg-[#2d2d2d] px-4 py-1.5 text-[#cccccc] text-xs font-mono border-b border-[#404040] flex items-center justify-between">
                                 <span>source.html</span>
                                 <span className="text-[10px] opacity-50">UTF-8</span>
                             </div>
                             <textarea ref={textAreaRef} className="flex-1 w-full bg-transparent text-[#d4d4d4] font-mono text-sm p-4 outline-none resize-none custom-scroll leading-relaxed" value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} spellCheck="false" />
                        </div>
                        <div className="w-[45%] bg-slate-200 border-l border-slate-300 flex flex-col z-10 shadow-xl">
                            <div className="bg-white p-2 text-xs font-bold text-slate-600 border-b border-slate-200 flex items-center justify-center shadow-sm">
                                Visualização de Impressão (Live Preview)
                            </div>
                            <div className="flex-1 p-4 overflow-hidden relative">
                                 <div className="absolute inset-0 overflow-auto custom-scroll p-4 pb-20">
                                     <SafePreview html={htmlContent} />
                                 </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
      )}

      {showToolModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg transform transition-all border border-slate-200 max-h-[90vh] overflow-y-auto custom-scroll">
                <h3 className="font-bold text-xl text-slate-900 mb-6 pb-4 border-b border-slate-100">{isEditingTool ? 'Configuração do Gerador' : 'Cadastro de Novo Gerador'}</h3>
                <form onSubmit={handleSaveTool} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Identificador do Módulo no Sistema</label>
                        <input value={toolForm.id} onChange={e => setToolForm({...toolForm, id: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-md text-sm font-mono bg-slate-50 outline-none focus:border-blue-500 disabled:opacity-50" placeholder="ex: termo_entrega_notebook" disabled={isEditingTool} required />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome de Exibição</label>
                        <input value={toolForm.label} onChange={e => setToolForm({...toolForm, label: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-md text-sm outline-none focus:border-blue-500" required />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição Operacional</label>
                        <input value={toolForm.desc} onChange={e => setToolForm({...toolForm, desc: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-md text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div>
                        <label className="flex justify-between items-end mb-1.5">
                            <span className="text-xs font-semibold text-slate-600">Representação Gráfica (Ícone SVG)</span>
                            <a href="https://heroicons.com/" target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline">Pegar do Heroicons</a>
                        </label>
                        <textarea value={toolForm.icon} onChange={e => setToolForm({...toolForm, icon: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-md text-sm h-16 font-mono text-xs outline-none focus:border-blue-500 resize-none bg-slate-50" placeholder="Insira apenas o atributo 'd' do path..." />
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-3">Variações do Documento (Sub-tipos)</label>
                        <div className="flex gap-2 mb-4">
                             <input className="w-1/3 border border-slate-300 p-2 rounded-md text-sm outline-none focus:border-blue-500 font-mono" placeholder="ID Interno" value={newSubType.id} onChange={e => setNewSubType({...newSubType, id: e.target.value.toLowerCase().replace(/\s/g,'_')})} />
                             <input className="flex-1 border border-slate-300 p-2 rounded-md text-sm outline-none focus:border-blue-500" placeholder="Rótulo de Exibição" value={newSubType.label} onChange={e => setNewSubType({...newSubType, label: e.target.value})} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault(); handleAddSubType();}}}/>
                             <button type="button" onClick={handleAddSubType} className="bg-slate-800 hover:bg-slate-900 text-white px-4 rounded-md text-sm font-bold transition">+</button>
                        </div>
                        <div className="space-y-2">
                             {(toolForm.subTypes || []).map((sub, idx) => (
                                 <div key={idx} className="flex justify-between items-center text-sm bg-white p-2.5 rounded-md border border-slate-200 shadow-sm">
                                     <span><span className="font-mono text-slate-500 text-xs mr-2">{sub.id}</span> <span className="font-semibold text-slate-800">{sub.label}</span></span>
                                     <button type="button" onClick={() => handleRemoveSubType(idx)} className="text-red-500 font-medium hover:bg-red-50 px-2 py-1 rounded transition">Remover</button>
                                 </div>
                             ))}
                             {(toolForm.subTypes || []).length === 0 && <p className="text-xs text-slate-400 italic">Módulo de documento único. Não requer sub-tipos.</p>}
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50 transition bg-white">
                            <input type="checkbox" checked={toolForm.active} onChange={e => setToolForm({...toolForm, active: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600" /> 
                            <span className="font-semibold text-slate-900">Disponibilizar Módulo na Produção</span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                        <button type="button" onClick={() => setShowToolModal(false)} className="bg-white border border-slate-300 text-slate-700 px-5 py-2 rounded-md font-medium text-sm hover:bg-slate-50 transition">Cancelar</button>
                        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium text-sm hover:bg-blue-700 transition shadow-sm">Salvar Módulo</button>
                    </div>
                </form>
            </div>
          </div>
      )}

      {showUserModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md transform transition-all border border-slate-200">
                  <h3 className="font-bold text-xl text-slate-900 mb-6 pb-4 border-b border-slate-100">{editingUserId ? 'Credenciais de Acesso' : 'Convite de Colaborador'}</h3>
                  <form onSubmit={handleSaveUser} className="space-y-5">
                      <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome Completo</label>
                          <input value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-md text-sm outline-none focus:border-blue-500" required />
                      </div>
                      <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">E-mail Corporativo</label>
                          <input type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-md text-sm outline-none focus:border-blue-500" required />
                      </div>
                      <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Hierarquia do Sistema</label>
                          <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})} className="w-full border border-slate-300 p-2.5 rounded-md text-sm outline-none focus:border-blue-500 bg-white">
                              <option value="user">Colaborador Padrão (Leitura e Operação)</option>
                              <option value="admin">Administrador (Setup e Manutenção)</option>
                          </select>
                      </div>
                      
                      {userForm.role === 'user' && (
                          <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                              <label className="block text-xs font-bold text-slate-700 uppercase mb-3">Concessão por Módulo</label>
                              <div className="space-y-2 max-h-40 overflow-y-auto custom-scroll pr-2">
                                  {sortTools(toolsConfig).map(([k, t]) => (
                                      <label key={k} className="flex items-center gap-3 p-2 bg-white rounded border border-slate-200 cursor-pointer hover:bg-blue-50 transition">
                                          <input type="checkbox" checked={userForm.permissions?.includes(k)} onChange={(e) => {
                                              const newPerms = e.target.checked ? [...(userForm.permissions||[]), k] : (userForm.permissions||[]).filter(p=>p!==k);
                                              setUserForm({...userForm, permissions: newPerms});
                                          }} className="rounded text-blue-600 focus:ring-blue-500"/>
                                          <span className="text-sm font-medium text-slate-700">{t.label}</span>
                                      </label>
                                  ))}
                              </div>
                          </div>
                      )}

                      <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                          <button type="button" onClick={() => setShowUserModal(false)} className="bg-white border border-slate-300 text-slate-700 px-5 py-2 rounded-md font-medium text-sm hover:bg-slate-50 transition">Cancelar</button>
                          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium text-sm hover:bg-blue-700 transition shadow-sm">Aplicar Perfil</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}

// ============================================================================
// 6. GERADOR DINÂMICO
// ============================================================================
function DynamicGenerator({ template, tagsConfig, delimiters, moduleId, cepMappings }) {
  const [formData, setFormData] = useState({});
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const config = tagsConfig[moduleId] || { sessions: [] };
    const activeSessions = config.sessions.filter(s => s.active);
    setSessions(activeSessions);
    const initialData = { ...formData };
    activeSessions.forEach(session => {
        session.tags.forEach(tag => {
            if (initialData[tag.id] === undefined) {
                if (tag.type === 'checkbox') initialData[tag.id] = [];
                else initialData[tag.id] = '';
            }
            if (tag.id === 'DATA' && !initialData[tag.id]) initialData[tag.id] = new Date().toISOString().split('T')[0];
        });
    });
    setFormData(initialData);
  }, [tagsConfig, moduleId]);

  const handleChange = async (tag, value) => {
    setFormData(prev => ({ ...prev, [tag.id]: value }));
    
    if (value.replace(/\D/g, '').length === 8 && cepMappings) {
        const mapping = cepMappings.find(m => m.triggerTag === tag.id);
        if (mapping) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${value}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        [mapping.streetTag]: data.logradouro || '',
                        [mapping.districtTag]: data.bairro || '',
                        [mapping.cityTag]: data.localidade || '',
                        [mapping.stateTag]: data.uf || ''
                    }));
                }
            } catch (error) { console.error("Erro no motor ViaCEP:", error); }
        }
    }
  };

  const handleCheckboxChange = (tagId, option) => {
      setFormData(prev => {
          const current = prev[tagId] || [];
          if (current.includes(option)) {
              return { ...prev, [tagId]: current.filter(item => item !== option) };
          } else {
              return { ...prev, [tagId]: [...current, option] };
          }
      });
  };

  const renderDocument = () => {
      let html = template?.content || DEFAULT_HTML_TEMPLATE;
      sessions.forEach(session => {
          session.tags.forEach(tag => {
              let val = formData[tag.id];
              if (Array.isArray(val)) val = val.join(', '); 
              val = val || '';
              if(tag.id === 'DATA' && val && !Array.isArray(val) && val.includes('-')) val = val.split('-').reverse().join('/');
              const tagPattern = `${delimiters.prefix}${tag.id}${delimiters.suffix}`;
              html = html.split(tagPattern).join(val);
          });
      });
      return html;
  };

  const handlePrint = () => {
      const printContent = renderDocument();
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`<html><head><title>Documento Operacional</title><style>@page { size: A4; margin: 0; } body { margin: 0; padding: 0; width: 210mm; height: 297mm; font-family: Arial, sans-serif; } img { max-width: 100%; height: auto; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; } table { border-collapse: collapse; width: 100%; }</style></head><body>${printContent}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-slate-50 border-t border-slate-200">
      <div className="w-full md:w-[420px] bg-white border-r border-slate-200 flex flex-col z-10 no-print shadow-sm">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
          <h2 className="font-bold text-slate-900 tracking-tight">Inserção de Dados</h2>
          <button onClick={handlePrint} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm hover:bg-blue-700 transition flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Finalizar & Imprimir
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scroll space-y-8 bg-slate-50/50">
            {sessions.length === 0 && <p className="text-center text-slate-500 mt-10 p-6 bg-slate-100 rounded-lg border border-slate-200 border-dashed">Nenhum bloco de dados configurado para este modelo.</p>}
            {sessions.map((session, sIdx) => (
                <div key={session.id} className="relative">
                    {sIdx !== 0 && <div className="absolute -top-4 left-0 right-0 h-px bg-slate-200"></div>}
                    <h3 className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-4 bg-blue-600 rounded-sm inline-block"></span>
                        {session.title}
                    </h3>
                    <div className="space-y-4">
                        {session.tags.map(tag => (
                            <div key={tag.id} className="bg-white p-3 rounded-md border border-slate-200 shadow-sm focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all">
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{tag.label}</label>
                                
                                {tag.type === 'checkbox' ? (
                                    <div className="space-y-1.5 pt-1">
                                        {(tag.options || []).map((opt, idx) => (
                                            <label key={idx} className="flex items-center gap-2.5 text-sm cursor-pointer hover:bg-slate-50 p-1.5 rounded transition">
                                                <input 
                                                    type="checkbox" 
                                                    checked={(formData[tag.id] || []).includes(opt)}
                                                    onChange={() => handleCheckboxChange(tag.id, opt)}
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-shadow"
                                                />
                                                <span className="text-slate-800 font-medium">{opt}</span>
                                            </label>
                                        ))}
                                        {(tag.options || []).length === 0 && <span className="text-xs text-red-500 font-medium bg-red-50 p-2 rounded block border border-red-100">Falta configurar opções base.</span>}
                                    </div>
                                ) : (
                                    <input 
                                        type={tag.type} 
                                        className="w-full bg-transparent border-none p-0 text-sm text-slate-900 font-medium placeholder-slate-300 focus:ring-0" 
                                        placeholder={`Preencher ${tag.label.toLowerCase()}...`}
                                        value={formData[tag.id] || ''} 
                                        onChange={e => handleChange(tag, e.target.value)} 
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      </div>
      <div className="flex-1 bg-slate-200 p-8 flex justify-center overflow-auto custom-scroll inset-shadow">
        <div className="bg-white shadow-2xl relative mx-auto origin-top border border-slate-300" style={{ width: '210mm', height: '297mm', minWidth: '210mm', minHeight: '297mm' }}>
            <SafePreview html={renderDocument()} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 7. DASHBOARD (MAIN LAYOUT)
// ============================================================================
function Dashboard({ user, onLogout, users, setUsers, templates, setTemplates, tagsConfig, setTagsConfig, delimiters, setDelimiters, changelog, setChangelog, toolsConfig, setToolsConfig, systemSettings, cepMappings }) {
  const [activePage, setActivePage] = useState('Home');
  const [activeSubPage, setActiveSubPage] = useState(null); 
  const [expandedMenu, setExpandedMenu] = useState({ geradores: true });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleMenu = (key) => setExpandedMenu(prev => ({ ...prev, [key]: !prev[key] }));
  const hasAccess = (toolKey) => {
      const tool = toolsConfig[toolKey];
      if (!tool || !tool.active) return false;
      return user.role === 'admin' || user.permissions.includes('all') || user.permissions.includes(toolKey);
  };

  const currentTool = activePage !== 'Home' && activePage !== 'Admin' ? toolsConfig[activePage] : null;

  return (
    <div className="flex w-screen h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden relative">
      <style>{`.custom-scroll::-webkit-scrollbar { width: 8px; height: 8px; } .custom-scroll::-webkit-scrollbar-track { background: transparent; } .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; border: 2px solid transparent; background-clip: padding-box; } .custom-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; border: 2px solid transparent; background-clip: padding-box; } .inset-shadow { box-shadow: inset 0 2px 10px 0 rgba(0,0,0,0.05); } @media print { .no-print { display: none !important; } }`}</style>
      
      {/* Mobile Toggle */}
      <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden absolute top-4 left-4 z-50 text-white bg-slate-900 p-2 rounded shadow-lg border border-slate-700">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>

      {/* Sidebar ERP Style */}
      <aside className={`fixed md:relative w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 z-40 shadow-xl no-print h-full transition-transform transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-800 cursor-pointer hover:bg-slate-800/50 transition-colors" onClick={() => {setActivePage('Home'); setActiveSubPage(null);}}>
          <img src="https://midias-tdw.totvs.com/wp-content/uploads/2025/06/favicon-bg-light-192x192-1.png" alt="Logo" className="w-8 mr-3 opacity-90" />
          <span className="font-bold text-sm tracking-widest text-white">CORE ERP</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-5 custom-scroll">
          <div className="px-3 space-y-1.5">
            <button onClick={() => { setActivePage('Home'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${activePage === 'Home' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
              <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              Visão Geral
            </button>
            
            <div className="pt-2 pb-1">
                <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Operações</span>
            </div>

            <div>
              <button onClick={() => toggleMenu('geradores')} className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-800 hover:text-white transition-colors">
                <div className="flex items-center gap-3"><svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Emissão Dinâmica</div>
                <svg className={`w-3 h-3 text-slate-500 transition-transform ${expandedMenu.geradores ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {expandedMenu.geradores && (
                <div className="pl-10 pr-2 space-y-1 mt-1 border-l border-slate-800 ml-5 py-1">
                   {sortTools(toolsConfig).map(([key, tool]) => (
                        <button 
                            key={key}
                            onClick={() => { hasAccess(key) && setActivePage(key); setActiveSubPage(null); setMobileMenuOpen(false); }} 
                            className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium flex justify-between items-center transition-colors ${activePage === key ? 'bg-slate-800 text-blue-400 font-semibold' : hasAccess(key) ? 'text-slate-400 hover:text-white hover:bg-slate-800/50' : 'text-slate-600 cursor-not-allowed'}`}
                        >
                            {tool.label}
                            {!hasAccess(key) && <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                        </button>
                   ))}
                </div>
              )}
            </div>

            {(user.role === 'admin' || user.permissions.includes('all')) && (
              <>
              <div className="pt-4 pb-1">
                  <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sistema</span>
              </div>
              <button onClick={() => { setActivePage('Admin'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${activePage === 'Admin' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
                <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Painel Administrativo
              </button>
              </>
            )}
          </div>
        </nav>
        
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-blue-900 border border-blue-700 text-blue-200 flex items-center justify-center font-bold text-sm shadow-inner">{user.name.charAt(0)}</div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">{user.name.split(' ')[0]}</p>
                <p className="text-[10px] text-slate-500 font-bold tracking-wider truncate uppercase">{user.role === 'admin' ? 'SysAdmin' : 'Operador'}</p>
            </div>
            <button onClick={onLogout} className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-slate-900 rounded-md transition" title="Encerrar Sessão">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
        </div>
      </aside>
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative">
        
        {/* Dynamic Context Header (Se estiver dentro de um módulo) */}
        {currentTool && (
            <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-2 text-sm">
                        <span className="text-slate-400 font-medium">Operações</span>
                        <span className="text-slate-300">/</span>
                        <span className="font-semibold text-slate-800">{currentTool.label}</span>
                        {activeSubPage && (
                            <>
                                <span className="text-slate-300">/</span>
                                <span className="font-bold text-blue-600">{currentTool.subTypes?.find(s=>s.id === activeSubPage)?.label}</span>
                            </>
                        )}
                    </div>
                </div>
            </header>
        )}

        {/* Content Router */}
        <div className="flex-1 overflow-hidden">
            {activePage === 'Home' && <HomePage user={user} onNavigate={setActivePage} changelog={changelog} toolsConfig={toolsConfig} />}
            {activePage === 'Admin' && <AdminPanel users={users} setUsers={setUsers} templates={templates} setTemplates={setTemplates} tagsConfig={tagsConfig} setTagsConfig={setTagsConfig} delimiters={delimiters} setDelimiters={setDelimiters} changelog={changelog} setChangelog={setChangelog} toolsConfig={toolsConfig} setToolsConfig={setToolsConfig} systemSettings={systemSettings} cepMappings={cepMappings} />}
            
            {/* Dynamic Generator Routing Logic */}
            {currentTool && currentTool?.subTypes?.length > 0 && !activeSubPage && (
                <div className="p-10 flex flex-col items-center justify-center h-full bg-slate-50">
                    <div className="text-center mb-10">
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Seleção de Variável</h2>
                        <p className="text-slate-500 mt-2">Este módulo possui múltiplas rotinas. Defina o escopo operacional:</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl w-full">
                        {currentTool.subTypes.map(sub => (
                            <button 
                                key={sub.id} 
                                onClick={() => setActiveSubPage(sub.id)}
                                className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all text-left flex items-start gap-4 group"
                            >
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900 text-lg group-hover:text-blue-700 transition-colors">{sub.label}</h3>
                                    <p className="text-xs text-slate-500 font-mono mt-1">REF: {sub.id}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setActivePage('Home')} className="mt-12 text-sm font-medium text-slate-500 hover:text-slate-800 underline">← Retornar à Visão Geral</button>
                </div>
            )}

            {currentTool && (!currentTool?.subTypes?.length || activeSubPage) && (
                <DynamicGenerator 
                    template={templates[activeSubPage ? `${activePage}_${activeSubPage}` : activePage]} 
                    tagsConfig={tagsConfig} 
                    delimiters={delimiters} 
                    moduleId={activeSubPage ? `${activePage}_${activeSubPage}` : activePage} 
                    cepMappings={cepMappings} 
                />
            )}
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// 8. APP ROOT
// ============================================================================
export default function App() {
  const [user, setUser] = useState(null);
  
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('core_users');
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });
  
  useEffect(() => {
    const session = localStorage.getItem('core_session_user');
    if (session) {
      try { const parsed = JSON.parse(session); setUser(parsed); } catch (e) { localStorage.removeItem('core_session_user'); }
    }
    
    document.title = "CORE ERP | Operações";
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = "https://midias-tdw.totvs.com/wp-content/uploads/2025/06/favicon-bg-light-192x192-1.png"; 
  }, []);

  const [templates, setTemplates] = useState({});
  const [tagsConfig, setTagsConfig] = useState(DEFAULT_TAGS_WITH_SESSIONS); 
  const [delimiters, setDelimiters] = useState(DEFAULT_DELIMITERS);
  const [changelog, setChangelog] = useState([]);
  const [toolsConfig, setToolsConfig] = useState(DEFAULT_TOOLS_CONFIG);
  const [systemSettings, setSystemSettings] = useState({ devBypass: true });
  const [cepMappings, setCepMappings] = useState([]);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    if (user) localStorage.setItem('core_session_user', JSON.stringify(user));
    else localStorage.removeItem('core_session_user');
  }, [user]);

  useEffect(() => {
      const unsubAuth = onAuthStateChanged(auth, (authUser) => {
          if (authUser) {
              setDbReady(true);
          } else {
              signInAnonymously(auth).catch(console.error);
          }
      });
      return () => unsubAuth();
  }, []);

  useEffect(() => {
      if (!dbReady) return;
      const unsubUsers = onSnapshot(getCollectionRef('users'), (snap) => {
          const loaded = []; snap.forEach(doc => loaded.push(doc.data()));
          if(loaded.length === 0) DEFAULT_USERS.forEach(u => setDoc(getDocRef('users', u.id), u));
          else setUsers(loaded);
      }, () => {});
      const unsubTemplates = onSnapshot(getCollectionRef('templates'), (snap) => {
          const loaded = {}; snap.forEach(doc => loaded[doc.id] = doc.data()); setTemplates(loaded);
      }, () => {});
      const unsubTags = onSnapshot(getCollectionRef('tags'), (snap) => {
          const loaded = {}; snap.forEach(doc => loaded[doc.id] = doc.data());
          if (Object.keys(loaded).length === 0) {
              Object.entries(DEFAULT_TAGS_WITH_SESSIONS).forEach(([k, v]) => setDoc(getDocRef('tags', k), v));
          } else {
              const migrated = {};
              Object.keys(loaded).forEach(k => {
                 if (loaded[k].list) { 
                     migrated[k] = { sessions: [{ id: 'geral', title: 'Geral', active: true, tags: loaded[k].list }] };
                 } else {
                     migrated[k] = loaded[k];
                 }
              });
              setTagsConfig(migrated);
          }
      }, () => {});
      const unsubSettings = onSnapshot(getCollectionRef('settings'), (snap) => {
           snap.forEach(doc => { 
               if(doc.id === 'delimiters') setDelimiters(doc.data());
               if(doc.id === 'tools') setToolsConfig(doc.data()); 
               if(doc.id === 'config') setSystemSettings(doc.data());
               if(doc.id === 'cepMappings') setCepMappings(doc.data().list || []);
           });
           if(snap.empty) {
               setDoc(getDocRef('settings', 'tools'), DEFAULT_TOOLS_CONFIG);
           }
      });
      const unsubChangelog = onSnapshot(getCollectionRef('changelog'), (snap) => {
          const loaded = []; snap.forEach(doc => loaded.push(doc.data()));
          if(loaded.length === 0) DEFAULT_CHANGELOG.forEach(l => setDoc(getDocRef('changelog', l.id), l));
          else setChangelog(loaded.sort((a,b) => b.id - a.id));
      }, () => {});
      return () => { unsubUsers(); unsubTemplates(); unsubTags(); unsubSettings(); unsubChangelog(); }
  }, [dbReady]);

  useEffect(() => {
    if (!document.querySelector('script[src*="tailwindcss"]')) { 
      const s = document.createElement('script'); s.src = "https://cdn.tailwindcss.com"; document.head.appendChild(s); 
    }
  }, []);

  return user ? <Dashboard user={user} onLogout={() => setUser(null)} users={users} setUsers={setUsers} templates={templates} setTemplates={setTemplates} tagsConfig={tagsConfig} setTagsConfig={setTagsConfig} delimiters={delimiters} setDelimiters={setDelimiters} changelog={changelog} setChangelog={setChangelog} toolsConfig={toolsConfig} setToolsConfig={setToolsConfig} systemSettings={systemSettings} cepMappings={cepMappings} /> : <LoginPage onLogin={setUser} users={users} dbReady={dbReady} systemSettings={systemSettings} />;
}