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

// Inicialização segura (Singleton)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const appId = firebaseConfig.projectId;

const getCollectionRef = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);
const getDocRef = (colName, docId) => doc(db, 'artifacts', appId, 'public', 'data', colName, docId);

// Helper para ordenar ferramentas (Ativos primeiro, depois alfabético)
function sortTools(config) {
    if (!config) return [];
    return Object.entries(config).sort(([, a], [, b]) => {
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return 1;
        return a.label.localeCompare(b.label);
    });
}

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
        const A4_WIDTH_PX = 794; // 210mm @ 96dpi
        const PADDING = 40;
        
        // Calcula escala para caber na largura disponível
        const availableWidth = parentWidth - PADDING;
        const scale = Math.min(availableWidth / A4_WIDTH_PX, 1.2); 
        
        containerRef.current.style.transform = `scale(${scale})`;
        containerRef.current.style.transformOrigin = 'top center';
        
        // Altura do conteúdo
        const contentHeight = shadowRootRef.current.body.scrollHeight;
        const displayHeight = Math.max(contentHeight, 1123); // Mínimo A4
        
        containerRef.current.style.height = `${displayHeight}px`;
        // Ajusta wrapper com margem extra no final para scroll
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
            box-shadow: 0 0 20px rgba(0,0,0,0.15);
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
  { id: '1', version: '4.3', date: '2024-02-15', title: 'Integração CEP', content: 'Adicionada busca automática de CEP e configuração de mapeamento de tags.' },
  { id: '2', version: '4.2', date: '2024-02-14', title: 'Drag & Drop Corrigido', content: 'Melhoria na movimentação de tags.' },
];

const DEFAULT_TOOLS_CONFIG = {
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
          { id: 'EMAIL', label: 'E-mail', type: 'text' },
          { id: 'UNIDADE', label: 'Unidade', type: 'text' },
          { id: 'DEPTO', label: 'Departamento', type: 'text' },
          { id: 'DATA', label: 'Data Atual', type: 'date' },
        ]
      },
      {
        id: 'equipamentos',
        title: 'Equipamentos e Validadores',
        active: true,
        tags: [
          { id: 'RESP', label: 'Responsável TI', type: 'text' },
          { id: 'NOTEBOOK_MODELO', label: 'Notebook (Modelo)', type: 'text' },
          { id: 'NOTEBOOK_SERIAL', label: 'Notebook (Serial)', type: 'text' },
          { id: 'CELULAR_MODELO', label: 'Celular (Modelo)', type: 'text' },
          { id: 'CELULAR_IMEI', label: 'Celular (IMEI)', type: 'text' },
        ]
      }
    ]
  },
  telefonia: { sessions: [{ id: 'geral', title: 'Geral', active: true, tags: [] }] },
  monitores: { sessions: [{ id: 'geral', title: 'Geral', active: true, tags: [] }] }
};

const DEFAULT_HTML_TEMPLATE = `<div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333;">
  <h1 style="border-bottom: 2px solid #002233; color: #002233; padding-bottom: 10px;">Termo de Devolução</h1>
  <p>Declaro que <strong><<NOME>></strong> devolveu o notebook modelo <strong><<NOTEBOOK_MODELO>></strong> em <strong><<DATA>></strong>.</p>
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
      const foundUser = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
      
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
        const foundUser = users.find(u => u.email && u.email.toLowerCase() === googleUser.email.toLowerCase());
        if (foundUser) {
            if (!foundUser.active) { setError('Conta desativada.'); await signOut(auth); signInAnonymously(auth); }
            else onLogin(foundUser);
        } else {
            setError('Este e-mail Google não possui convite.'); await signOut(auth); signInAnonymously(auth);
        }
    } catch (err) { setError('Falha na autenticação Google.'); } finally { setLoading(false); }
  };

  const handleDevLogin = () => {
    const devUser = users.length > 0 
        ? users.find(u => u.email === 'dev@core.teste') 
        : DEFAULT_USERS.find(u => u.email === 'dev@core.teste');
    if (devUser) onLogin(devUser); else alert('Usuário DEV não encontrado. Aguarde carregamento.');
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
          <h1 className="text-3xl font-black text-white tracking-tight">CORE</h1>
          <p className="text-[#00DBFF] text-xs font-bold tracking-widest uppercase mt-1">Centro de Otimização</p>
          {!dbReady && <span className="text-xs text-yellow-500 animate-pulse block mt-4">Conectando ao banco de dados...</span>}
          {dbReady && <span className="text-xs text-green-500 block mt-4">Sistema Online</span>}
        </div>
        
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
          <button type="button" onClick={handleGoogleLogin} disabled={loading} className="w-full bg-white text-slate-700 font-bold py-3 rounded-lg shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3 mb-6">
            {loading ? <span className="text-xs">Processando...</span> : <><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5" /><span>Entrar com Google</span></>}
          </button>
          <div className="flex items-center gap-4 mb-6"><div className="h-px bg-white/10 flex-1"></div><span className="text-xs text-slate-500 font-bold">OU USE CREDENCIAIS</span><div className="h-px bg-white/10 flex-1"></div></div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-500/10 border border-red-500/50 text-red-200 text-xs p-3 rounded-lg flex items-center gap-2 font-bold animate-pulse"><span>⚠️</span> {error}</div>}
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail Corporativo" className="w-full bg-[#002233]/50 border border-slate-700 text-white rounded-lg p-3 text-sm focus:border-[#00DBFF] outline-none transition-colors" />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" className="w-full bg-[#002233]/50 border border-slate-700 text-white rounded-lg p-3 text-sm focus:border-[#00DBFF] outline-none transition-colors" />
            <button type="submit" disabled={loading} className="w-full bg-[#002233] border border-[#00DBFF]/30 text-[#00DBFF] font-bold py-3 rounded-lg hover:bg-[#00DBFF] hover:text-[#002233] transition-all text-sm">Entrar</button>
            
            {systemSettings?.devBypass && (
                <div className="pt-2 text-center">
                    <button type="button" onClick={handleDevLogin} className="text-[10px] text-slate-600 hover:text-white transition-colors">
                     Desenvolvedor (Offline/Local)
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
  <div className="h-full w-full flex flex-col bg-[#f0f4f8] overflow-y-auto">
    <div className="bg-gradient-to-r from-[#002233] to-[#001a26] text-white px-10 py-16 shadow-lg">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-black mb-2 tracking-tight">CORE <span className="text-[#00DBFF]">| Centro de Otimização</span></h1>
        <p className="text-slate-400 text-lg max-w-2xl">Gestão centralizada de ativos e processos.</p>
      </div>
    </div>
    <div className="flex-1 p-10 max-w-6xl mx-auto w-full flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-700 mb-6 border-b pb-2">Ferramentas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sortTools(toolsConfig).map(([key, tool]) => (
                    <div key={key} onClick={() => tool.active && onNavigate(key)} className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all ${tool.active ? 'hover:shadow-md cursor-pointer' : 'opacity-60 cursor-not-allowed grayscale'}`}>
                        <div className="w-12 h-12 bg-blue-50 text-[#002233] rounded-lg flex items-center justify-center mb-4"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tool.icon} /></svg></div>
                        <h3 className="font-bold text-[#002233] text-lg">{tool.label}</h3>
                        <p className="text-sm text-slate-500 mt-2 h-10">{tool.desc}</p>
                    </div>
                ))}
            </div>
        </div>
        <div className="w-full lg:w-80">
             <h2 className="text-lg font-bold text-slate-700 mb-6 border-b pb-2">Changelog</h2>
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4 max-h-[500px] overflow-y-auto custom-scroll">
                {changelog.map(log => (
                    <div key={log.id} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center mb-1"><span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded">v{log.version}</span><span className="text-xs text-slate-400">{log.date}</span></div>
                        <h4 className="font-bold text-slate-700 text-sm">{log.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">{log.content}</p>
                    </div>
                ))}
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
  
  // Tag Management
  const [tagModuleFilter, setTagModuleFilter] = useState(Object.keys(toolsConfig)[0] || '');
  const [tagForm, setTagForm] = useState({ id: '', label: '', type: 'text', sessionId: '', options: [] });
  const [editingTag, setEditingTag] = useState(null);
  const [editingTagId, setEditingTagId] = useState(null);
  const [newSessionName, setNewSessionName] = useState('');
  const [tempDelimiters, setTempDelimiters] = useState(delimiters);
  const [newOption, setNewOption] = useState('');

  // Tools Management
  const [showToolModal, setShowToolModal] = useState(false);
  const [toolForm, setToolForm] = useState({ id: '', label: '', desc: '', icon: '', active: true });
  const [isEditingTool, setIsEditingTool] = useState(false);
  const [editingToolKey, setEditingToolKey] = useState(null);

  // CEP Integration Management
  const [cepMapForm, setCepMapForm] = useState({ triggerTag: '', streetTag: '', districtTag: '', cityTag: '', stateTag: '' });

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

  // Handlers
  const handleFileUpload = (e) => {
      const file = e.target.files[0];
      if(!targetModule) return alert("Selecione um módulo.");
      if(!file) return;

      if(file.name.endsWith('.html')) {
          setUploadStatus('Carregando HTML...');
          const reader = new FileReader();
          reader.onload = async (ev) => {
              await setDoc(getDocRef('templates', targetModule), {
                  name: file.name, content: ev.target.result, date: new Date().toLocaleDateString(), type: 'html'
              });
              setUploadStatus('Sucesso!');
          };
          reader.readAsText(file);
      } else { setUploadStatus('Erro: Apenas .html'); }
  };
  const handleEditTemplate = (moduleKey) => { setEditingTemplate(moduleKey); setHtmlContent(templates[moduleKey]?.content || DEFAULT_HTML_TEMPLATE); };
  
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
    const currentConfig = tagsConfig[tagModuleFilter] || { sessions: [] };
    const newSession = { id: newSessionName.toLowerCase().replace(/\s+/g, '_'), title: newSessionName, active: true, tags: [] };
    const updatedConfig = { ...currentConfig, sessions: [...(currentConfig.sessions || []), newSession] };
    await setDoc(getDocRef('tags', tagModuleFilter), updatedConfig);
    setNewSessionName('');
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Excluir sessão e todas as suas tags?')) return;
    const currentConfig = tagsConfig[tagModuleFilter];
    const updatedSessions = currentConfig.sessions.filter(s => s.id !== sessionId);
    await setDoc(getDocRef('tags', tagModuleFilter), { ...currentConfig, sessions: updatedSessions });
  };

  const handleRenameSession = async (sessionId) => {
      const newTitle = prompt("Novo nome:");
      if(newTitle) {
        const currentConfig = tagsConfig[tagModuleFilter];
        const updatedSessions = currentConfig.sessions.map(s => s.id === sessionId ? {...s, title: newTitle} : s);
        await setDoc(getDocRef('tags', tagModuleFilter), { ...currentConfig, sessions: updatedSessions });
      }
  };

  const toggleSessionActive = async (sessionId) => {
      const currentConfig = tagsConfig[tagModuleFilter];
      const sessions = currentConfig.sessions.map(s => s.id === sessionId ? { ...s, active: !s.active } : s);
      await setDoc(getDocRef('tags', tagModuleFilter), { ...currentConfig, sessions });
  };

  const saveTag = async (id, label, type, module, isEdit = false, originalId = null, sessionId = null) => {
      const cleanId = id.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      const currentConfig = tagsConfig[module] || { sessions: [] };
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
      await setDoc(getDocRef('tags', module), { ...currentConfig, sessions });
      return true;
  };

  const handleSaveTagPanel = async (e) => {
      e.preventDefault();
      const success = await saveTag(tagForm.id, tagForm.label, tagForm.type, tagModuleFilter, !!editingTag, editingTag?.tagData.id, tagForm.sessionId);
      if(success) {
        setTagForm({ id: '', label: '', type: 'text', sessionId: tagForm.sessionId, options: [] });
        setEditingTag(null);
        setEditingTagId(null);
        alert('Tag salva!');
      } else { alert('Erro ou tag duplicada!'); }
  };
  const handleDeleteTag = async (sessionId, tagIndex, module = tagModuleFilter) => {
      if(!window.confirm('Excluir?')) return;
      const currentConfig = tagsConfig[module];
      const sessions = JSON.parse(JSON.stringify(currentConfig.sessions));
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      sessions[sessionIndex].tags.splice(tagIndex, 1);
      await setDoc(getDocRef('tags', module), { ...currentConfig, sessions });
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

  const handleSaveTool = async (e) => { e.preventDefault(); const cleanId = toolForm.id.toLowerCase().replace(/[^a-z0-9_]/g, '_'); const newToolsConfig = { ...toolsConfig }; if (isEditingTool && editingToolKey && editingToolKey !== cleanId) delete newToolsConfig[editingToolKey]; newToolsConfig[cleanId] = { ...toolForm, icon: toolForm.icon || 'M13 10V3L4 14h7v7l9-11h-7z' }; delete newToolsConfig[cleanId].id; await setDoc(getDocRef('settings', 'tools'), newToolsConfig); setShowToolModal(false); setToolForm({ id: '', label: '', desc: '', icon: '', active: true }); };
  const prepareEditTool = (key, tool) => { setEditingToolKey(key); setToolForm({ id: key, ...tool }); setIsEditingTool(true); setShowToolModal(true); };
  const handleDeleteTool = async (key) => { if(window.confirm('Excluir?')) { const n = { ...toolsConfig }; delete n[key]; await setDoc(getDocRef('settings', 'tools'), n); }};

  const handleSaveEditedTemplate = async () => { await setDoc(getDocRef('templates', editingTemplate), { name: 'Editado Manualmente', content: htmlContent, date: new Date().toLocaleDateString(), type: 'html' }); setEditingTemplate(null); alert('Salvo!'); };
  const handleSaveDelimiters = async () => { await setDoc(getDocRef('settings', 'delimiters'), tempDelimiters); alert('Salvo.'); };

  const handleSaveUser = async (e) => { e.preventDefault(); const uid=editingUserId||Date.now().toString(); const d={...userForm, id:uid, active:true}; if(d.role==='admin') d.permissions=['all']; await setDoc(getDocRef('users',uid),d,{merge:true}); setShowUserModal(false); };
  const removeUser = async (id) => { if(window.confirm('Remover?')) await deleteDoc(getDocRef('users', id)); };
  const handleEditUserClick = (u) => { setUserForm(u); setEditingUserId(u.id); setShowUserModal(true); };
  const toggleUserPermission = (k) => { if(userForm.permissions.includes(k)) setUserForm({...userForm, permissions: userForm.permissions.filter(p=>p!==k)}); else setUserForm({...userForm, permissions: [...userForm.permissions, k]}); };
  
  const handleSaveLog = async (e) => { e.preventDefault(); const id=editingLogId||Date.now().toString(); await setDoc(getDocRef('changelog',id),{...newLog,id},{merge:true}); setEditingLogId(null); setNewLog({version:'',date:'',title:'',content:''}); };
  const handleDeleteLog = async (id) => await deleteDoc(getDocRef('changelog',id));
  const handleEditLogClick = (l) => { setNewLog(l); setEditingLogId(l.id); };
  
  const handleSaveConfig = async () => {
      await setDoc(getDocRef('settings', 'config'), { devBypass: configDevBypass }, { merge: true });
      alert('Configurações salvas.');
  };

  // CEP Mapping Handlers
  const handleSaveCepMapping = async () => {
      // Adiciona novo mapeamento ao array existente (ou cria novo)
      const currentMappings = cepMappings || [];
      const newMapping = {
          id: Date.now().toString(),
          ...cepMapForm
      };
      
      const updatedMappings = [...currentMappings, newMapping];
      await setDoc(getDocRef('settings', 'cepMappings'), { list: updatedMappings });
      
      setCepMapForm({ triggerTag: '', streetTag: '', districtTag: '', cityTag: '', stateTag: '' });
      alert('Integração salva!');
  };

  const handleDeleteCepMapping = async (mapId) => {
      if(!window.confirm('Remover esta integração?')) return;
      const updatedMappings = (cepMappings || []).filter(m => m.id !== mapId);
      await setDoc(getDocRef('settings', 'cepMappings'), { list: updatedMappings });
  };

  // Drag Drop
  const onDragStart = (e, sessionId, tagIndex) => {
      e.dataTransfer.setData("text/plain", JSON.stringify({ sessionId, tagIndex, module: tagModuleFilter }));
      e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = async (e, targetSessionId, targetIndex = null) => {
      e.preventDefault(); e.stopPropagation();
      const dataStr = e.dataTransfer.getData("text/plain"); if(!dataStr) return;
      const data = JSON.parse(dataStr); if (data.module !== tagModuleFilter) return;
      const currentConfig = tagsConfig[tagModuleFilter];
      const sessions = JSON.parse(JSON.stringify(currentConfig.sessions));
      const sourceSessionIndex = sessions.findIndex(s => s.id === data.sessionId);
      const targetSessionIndex = sessions.findIndex(s => s.id === targetSessionId);
      if (sourceSessionIndex !== -1 && targetSessionIndex !== -1) {
          const sourceSession = sessions[sourceSessionIndex];
          const targetSession = sessions[targetSessionIndex];
          const [movedTag] = sourceSession.tags.splice(data.tagIndex, 1);
          if (targetIndex !== null) targetSession.tags.splice(targetIndex, 0, movedTag);
          else targetSession.tags.push(movedTag);
          await setDoc(getDocRef('tags', tagModuleFilter), { ...currentConfig, sessions });
      }
  };

  return (
    <div className="flex h-screen w-full bg-[#f0f4f8] overflow-hidden">
      <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col no-print">
        <div className="p-6 border-b border-slate-100"><h2 className="text-xl font-black text-[#002233]">Administração</h2></div>
        <nav className="flex-1 p-4 space-y-2">
            {['templates', 'tags', 'tools', 'integrations', 'users', 'changelog', 'config'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
            ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto p-8 bg-[#f0f4f8]">
        <div className="max-w-5xl mx-auto">
            {activeTab === 'templates' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-sm text-slate-500 mb-4">Importar / Editar</h3>
                        <div className="flex gap-4">
                            <select value={targetModule} onChange={(e) => setTargetModule(e.target.value)} className="border p-2 rounded text-sm w-1/3">
                                {sortTools(toolsConfig).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
                            </select>
                            <input type="file" accept=".html" onChange={handleFileUpload} className="text-sm"/>
                        </div>
                        {uploadStatus && <p className="text-xs font-bold text-blue-600 mt-2">{uploadStatus}</p>}
                    </div>
                    <div className="grid gap-3">{sortTools(toolsConfig).map(([key, tool]) => (<div key={key} className="bg-white p-4 rounded shadow flex justify-between items-center"><div><p className="font-bold text-sm">{tool.label}</p><p className="text-xs text-slate-400">{templates[key] ? templates[key].name : 'Padrão'}</p></div><button onClick={() => handleEditTemplate(key)} className="bg-[#002233] text-white px-3 py-1 rounded text-xs">Editar HTML</button></div>))}</div>
                </div>
            )}
            
            {activeTab === 'tags' && (
                <div className="flex gap-6 items-start h-full">
                     <div className="w-1/3 bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-4 max-h-full overflow-y-auto custom-scroll">
                        <div className="mb-6 border-b pb-4">
                            <label className="text-xs font-bold text-slate-500 block mb-2">Módulo</label>
                            <select value={tagModuleFilter} onChange={(e) => { setTagModuleFilter(e.target.value); setEditingTag(null); }} className="w-full border p-2 rounded text-sm mb-4">
                                {sortTools(toolsConfig).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
                            </select>
                            <label className="text-xs font-bold text-slate-500 block mb-2">Nova Sessão</label>
                            <div className="flex gap-2 mb-4"><input value={newSessionName} onChange={e => setNewSessionName(e.target.value)} className="w-full border p-2 rounded text-sm" placeholder="Nome da Sessão" /><button onClick={handleAddSession} className="bg-green-600 text-white px-3 rounded font-bold text-sm">+</button></div>
                            <label className="text-xs font-bold text-slate-500 block mb-2">Delimitadores</label>
                            <div className="flex gap-2 mb-2"><input value={tempDelimiters.prefix} onChange={e => setTempDelimiters({...tempDelimiters, prefix: e.target.value})} className="w-1/2 border p-1 rounded text-center" /><input value={tempDelimiters.suffix} onChange={e => setTempDelimiters({...tempDelimiters, suffix: e.target.value})} className="w-1/2 border p-1 rounded text-center" /></div>
                            <button onClick={handleSaveDelimiters} className="w-full bg-slate-200 text-xs py-1 rounded font-bold">Salvar Símbolos</button>
                        </div>
                        <form onSubmit={handleSaveTagPanel} className="space-y-3">
                            <h3 className="font-bold text-sm text-[#002233]">{editingTagId ? 'Editar Tag' : 'Nova Tag'}</h3>
                            <select value={tagForm.sessionId} onChange={e => setTagForm({...tagForm, sessionId: e.target.value})} className="w-full border p-2 rounded text-sm" required>
                                <option value="">Selecione a Sessão...</option>
                                {(tagsConfig[tagModuleFilter]?.sessions || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                            </select>
                            <input value={tagForm.id} onChange={e => setTagForm({...tagForm, id: e.target.value})} className="w-full border p-2 rounded text-sm uppercase" placeholder="ID (ex: NOME)" required />
                            <input value={tagForm.label} onChange={e => setTagForm({...tagForm, label: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="Rótulo" required />
                            <select value={tagForm.type} onChange={e => setTagForm({...tagForm, type: e.target.value})} className="w-full border p-2 rounded text-sm">
                                <option value="text">Texto</option>
                                <option value="date">Data</option>
                                <option value="email">E-mail</option>
                                <option value="checkbox">Caixa de Seleção (Múltipla)</option>
                            </select>

                            {/* Checkbox Options Manager */}
                            {tagForm.type === 'checkbox' && (
                                <div className="bg-slate-100 p-3 rounded border border-slate-200">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Opções de Checkbox</label>
                                    <div className="flex gap-2 mb-2">
                                        <input 
                                            className="flex-1 border p-1 text-sm rounded outline-none focus:border-[#00DBFF]" 
                                            placeholder="Nova opção (ex: Sim/Não)" 
                                            value={newOption} 
                                            onChange={(e) => setNewOption(e.target.value)}
                                            onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddOption(); } }}
                                        />
                                        <button type="button" onClick={handleAddOption} className="bg-blue-500 text-white px-3 rounded text-sm font-bold">+</button>
                                    </div>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {(tagForm.options || []).map((opt, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border text-xs">
                                                <span>{opt}</span>
                                                <button type="button" onClick={() => handleRemoveOption(idx)} className="text-red-500 font-bold hover:text-red-700">x</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2"><button type="submit" className="flex-1 bg-[#00DBFF] text-[#002233] font-bold py-2 rounded text-sm">{editingTag ? 'Atualizar' : 'Adicionar'}</button>{editingTag && <button type="button" onClick={() => { setEditingTag(null); setEditingTagId(null); setTagForm({id:'', label:'', type:'text', sessionId: '', options: []}) }} className="px-3 bg-slate-200 rounded">X</button>}</div>
                        </form>
                     </div>
                     <div className="flex-1 space-y-4">
                         {(tagsConfig[tagModuleFilter]?.sessions || []).map((session) => (
                             <div 
                                key={session.id} 
                                className={`bg-white rounded-xl shadow-sm border ${session.active ? 'border-slate-200' : 'border-red-200 opacity-75'}`} 
                                onDragOver={onDragOver} 
                                onDrop={(e) => handleDrop(e, session.id)} 
                            >
                                 <div className="p-3 bg-slate-50 border-b flex justify-between items-center rounded-t-xl">
                                     <div className="flex items-center gap-2"><button onClick={() => toggleSessionActive(session.id)} title="Ativar/Desativar" className={`w-3 h-3 rounded-full ${session.active ? 'bg-green-500' : 'bg-red-500'}`}></button><h4 className="font-bold text-sm text-slate-700">{session.title}</h4></div>
                                     <div className="flex gap-2"><button onClick={() => handleRenameSession(session.id)} className="text-blue-500 text-xs hover:underline">Renomear</button><button onClick={() => handleDeleteSession(session.id)} className="text-red-400 text-xs hover:underline">Excluir</button></div>
                                 </div>
                                 <div className="divide-y divide-slate-100 min-h-[40px]">
                                     {session.tags.map((tag, idx) => (
                                         <div 
                                            key={tag.id} 
                                            draggable 
                                            onDragStart={(e) => onDragStart(e, session.id, idx)} 
                                            onDragOver={onDragOver}
                                            onDrop={(e) => handleDrop(e, session.id, idx)} 
                                            className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-move group border-b border-transparent hover:border-blue-200 transition-colors active:opacity-50"
                                        >
                                             <div>
                                                 <span className="block text-xs font-mono text-blue-600 font-bold">{tempDelimiters.prefix}{tag.id}{tempDelimiters.suffix}</span>
                                                 <span className="block text-xs text-slate-600">{tag.label} {tag.type === 'checkbox' && '(Checkbox)'}</span>
                                             </div>
                                             <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleEditTagClick(tag, session.id, idx)} className="text-blue-500 text-xs font-bold">Editar</button><button onClick={() => handleDeleteTag(session.id, idx)} className="text-red-500 text-xs font-bold">Excluir</button></div>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         ))}
                     </div>
                </div>
            )}

            {activeTab === 'integrations' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-lg text-slate-700 mb-4">Busca Automática de Endereço (ViaCEP)</h3>
                        <p className="text-xs text-slate-500 mb-4">Configure quais tags devem ser preenchidas automaticamente quando um CEP for digitado. Use os IDs das tags (ex: RUA_DESTINO).</p>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div><label className="block text-xs font-bold text-slate-500">Tag de Gatilho (CEP)</label><input value={cepMapForm.triggerTag} onChange={e => setCepMapForm({...cepMapForm, triggerTag: e.target.value.toUpperCase()})} className="w-full border p-2 rounded text-sm uppercase" placeholder="Ex: CEP_DESTINO"/></div>
                            <div><label className="block text-xs font-bold text-slate-500">Tag de Rua (Logradouro)</label><input value={cepMapForm.streetTag} onChange={e => setCepMapForm({...cepMapForm, streetTag: e.target.value.toUpperCase()})} className="w-full border p-2 rounded text-sm uppercase" placeholder="Ex: RUA_DESTINO"/></div>
                            <div><label className="block text-xs font-bold text-slate-500">Tag de Bairro</label><input value={cepMapForm.districtTag} onChange={e => setCepMapForm({...cepMapForm, districtTag: e.target.value.toUpperCase()})} className="w-full border p-2 rounded text-sm uppercase" placeholder="Ex: BAIRRO_DESTINO"/></div>
                            <div><label className="block text-xs font-bold text-slate-500">Tag de Cidade</label><input value={cepMapForm.cityTag} onChange={e => setCepMapForm({...cepMapForm, cityTag: e.target.value.toUpperCase()})} className="w-full border p-2 rounded text-sm uppercase" placeholder="Ex: CIDADE_DESTINO"/></div>
                            <div><label className="block text-xs font-bold text-slate-500">Tag de Estado (UF)</label><input value={cepMapForm.stateTag} onChange={e => setCepMapForm({...cepMapForm, stateTag: e.target.value.toUpperCase()})} className="w-full border p-2 rounded text-sm uppercase" placeholder="Ex: UF_DESTINO"/></div>
                        </div>
                        <button onClick={handleSaveCepMapping} className="bg-[#00DBFF] text-[#002233] px-6 py-2 rounded font-bold text-sm">Adicionar Regra</button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                         <table className="w-full text-sm text-left">
                             <thead className="bg-slate-50 border-b"><tr><th className="p-3">Gatilho (CEP)</th><th className="p-3">Rua</th><th className="p-3">Bairro</th><th className="p-3">Cidade/UF</th><th className="p-3 text-right">Ação</th></tr></thead>
                             <tbody>
                                 {(cepMappings || []).map(map => (
                                     <tr key={map.id} className="border-b">
                                         <td className="p-3 font-bold">{map.triggerTag}</td>
                                         <td className="p-3 text-slate-500">{map.streetTag || '-'}</td>
                                         <td className="p-3 text-slate-500">{map.districtTag || '-'}</td>
                                         <td className="p-3 text-slate-500">{map.cityTag}/{map.stateTag}</td>
                                         <td className="p-3 text-right"><button onClick={() => handleDeleteCepMapping(map.id)} className="text-red-500 font-bold">X</button></td>
                                     </tr>
                                 ))}
                                 {(cepMappings || []).length === 0 && <tr><td colSpan="5" className="p-4 text-center text-slate-400">Nenhuma regra configurada.</td></tr>}
                             </tbody>
                         </table>
                    </div>
                </div>
            )}
            
            {activeTab === 'tools' && (
                <div className="space-y-6">
                    <button onClick={() => { setIsEditingTool(false); setToolForm({ id: '', label: '', desc: '', icon: '', active: true }); setShowToolModal(true); }} className="bg-[#00DBFF] text-[#002233] px-4 py-2 rounded font-bold text-sm">+ Novo Gerador</button>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sortTools(toolsConfig).map(([key, tool]) => (
                            <div key={key} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between h-52 relative group hover:shadow-md transition-shadow">
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="p-2 bg-slate-50 rounded-lg"><svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tool.icon} /></svg></div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${tool.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{tool.active ? 'Ativo' : 'Inativo'}</span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-lg">{tool.label}</h4>
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tool.desc}</p>
                                </div>
                                <div className="flex gap-3 mt-4 pt-3 border-t border-slate-100">
                                    <button onClick={() => prepareEditTool(key, tool)} className="text-blue-600 text-xs font-bold hover:underline">Editar</button>
                                    <button onClick={() => handleDeleteTool(key)} className="text-red-500 text-xs font-bold hover:underline">Excluir</button>
                                </div>
                                <span className="absolute bottom-3 right-3 text-[10px] font-mono text-slate-300">{key}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="space-y-6">
                    <button onClick={() => { setEditingUserId(null); setUserForm({ email: '', name: '', role: 'user', permissions: [] }); setShowUserModal(true); }} className="bg-[#00DBFF] text-[#002233] px-4 py-2 rounded font-bold text-sm">+ Novo Usuário</button>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm text-left"><thead className="bg-slate-50 border-b"><tr><th className="p-4">Nome</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4 text-right">Ações</th></tr></thead><tbody>{users.map(u => <tr key={u.id} className="border-b hover:bg-slate-50"><td className="p-4 font-bold text-slate-700">{u.name}</td><td className="p-4 text-slate-500">{u.email}</td><td className="p-4"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold uppercase">{u.role}</span></td><td className="p-4 text-right"><button onClick={() => handleEditUserClick(u)} className="text-blue-600 font-bold text-xs mr-4 hover:underline">Editar</button><button onClick={() => removeUser(u.id)} className="text-red-500 font-bold text-xs hover:underline">Excluir</button></td></tr>)}</tbody></table>
                    </div>
                </div>
            )}

            {activeTab === 'changelog' && (
                 <div className="space-y-6">
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                         <div className="grid grid-cols-3 gap-4 mb-4"><input value={newLog.version} onChange={e => setNewLog({...newLog, version: e.target.value})} placeholder="Versão" className="border p-2 rounded text-sm"/><input type="date" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} className="border p-2 rounded text-sm"/><input value={newLog.title} onChange={e => setNewLog({...newLog, title: e.target.value})} placeholder="Título" className="border p-2 rounded text-sm"/></div><textarea value={newLog.content} onChange={e => setNewLog({...newLog, content: e.target.value})} placeholder="Descrição" className="w-full border p-2 rounded text-sm h-20 mb-4"/><button onClick={handleSaveLog} className="bg-[#00DBFF] text-[#002233] px-6 py-2 rounded text-sm font-bold">{editingLogId ? 'Atualizar' : 'Adicionar'}</button></div>
                     <div className="space-y-3">{changelog.map(log => (<div key={log.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-start"><div><div className="flex items-center gap-3 mb-1"><span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded">v{log.version}</span><span className="text-xs text-slate-400 font-bold uppercase">{log.date}</span></div><h4 className="font-bold text-slate-700">{log.title}</h4><p className="text-sm text-slate-500 mt-1">{log.content}</p></div><div className="flex gap-3"><button onClick={() => { setNewLog(log); setEditingLogId(log.id); }} className="text-blue-500 text-xs font-bold hover:underline">Editar</button><button onClick={() => handleDeleteLog(log.id)} className="text-red-500 text-xs font-bold hover:underline">Excluir</button></div></div>))}</div>
                 </div>
            )}

            {activeTab === 'config' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-lg text-slate-700 mb-4">Configurações Gerais</h3>
                        <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-slate-50">
                            <input type="checkbox" checked={configDevBypass} onChange={(e) => setConfigDevBypass(e.target.checked)} className="w-5 h-5 rounded text-[#00DBFF] focus:ring-[#00DBFF]" />
                            <div>
                                <span className="block font-bold text-slate-800">Ativar Login de Desenvolvedor (Bypass)</span>
                                <span className="text-xs text-slate-500">Permite acesso local sem autenticação real (útil para testes offline).</span>
                            </div>
                        </label>
                        <div className="mt-4"><button onClick={handleSaveConfig} className="bg-[#00DBFF] text-[#002233] px-6 py-2 rounded font-bold text-sm">Salvar Configurações</button></div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {editingTemplate && (
            <div className="fixed inset-0 bg-[#00121a] z-50 flex flex-col">
                <div className="bg-[#1e1e1e] text-white p-3 flex justify-between border-b border-[#333]">
                    <span className="font-bold">Editor HTML ({toolsConfig[editingTemplate]?.label})</span>
                    <div className="flex gap-2"><button onClick={() => setEditingTemplate(null)} className="text-slate-400 text-sm">Cancelar</button><button onClick={handleSaveEditedTemplate} className="bg-[#007acc] px-3 py-1 rounded text-sm">Salvar</button></div>
                </div>
                <div className="flex-1 flex overflow-hidden">
                    <div className="w-80 bg-[#252526] border-r border-[#333] p-2 overflow-y-auto">
                        {editorEditingTagId ? (
                             <div className="p-3 bg-[#333] rounded mb-4 border border-blue-500/50">
                                <h4 className="text-xs font-bold text-blue-400 mb-2">Editar Tag</h4>
                                <input className="w-full bg-[#1e1e1e] text-white text-xs p-1 mb-2 border border-gray-600 rounded" value={editorTagForm.id} onChange={e => setEditorTagForm({...editorTagForm, id: e.target.value.toUpperCase()})} placeholder="ID" />
                                <input className="w-full bg-[#1e1e1e] text-white text-xs p-1 mb-2 border border-gray-600 rounded" value={editorTagForm.label} onChange={e => setEditorTagForm({...editorTagForm, label: e.target.value})} placeholder="Label" />
                                <select className="w-full bg-[#1e1e1e] text-white text-xs p-1 mb-2 border border-gray-600 rounded" value={editorTagForm.type} onChange={e => setEditorTagForm({...editorTagForm, type: e.target.value})}>
                                    <option value="text">Texto</option><option value="date">Data</option><option value="email">Email</option>
                                </select>
                                <div className="flex gap-2">
                                    <button onClick={handleSaveTagInEditor} className="bg-blue-600 text-white px-2 py-1 rounded text-xs flex-1">Salvar</button>
                                    <button onClick={() => setEditorEditingTagId(null)} className="bg-gray-600 text-white px-2 py-1 rounded text-xs">Cancelar</button>
                                </div>
                             </div>
                        ) : (
                             <div className="mb-4">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Tags do Módulo</p>
                                {(tagsConfig[editingTemplate]?.sessions || []).map(s => (
                                    <div key={s.id} className="mb-4">
                                        <p className="text-[10px] text-[#00DBFF] font-bold uppercase mb-1">{s.title}</p>
                                        {s.tags.map(tag => (
                                            <div key={tag.id} className="group flex items-center justify-between px-2 py-1 hover:bg-[#37373d] rounded mb-1">
                                                <button onClick={() => insertAtCursor(`${delimiters.prefix}${tag.id}${delimiters.suffix}`)} className="text-left flex-1 min-w-0">
                                                    <span className="text-gray-300 text-xs block truncate">{tag.label}</span>
                                                    <span className="text-[#00DBFF] opacity-50 text-[10px]">{delimiters.prefix}{tag.id}{delimiters.suffix}</span>
                                                </button>
                                                <div className="hidden group-hover:flex gap-1">
                                                    <button onClick={() => prepareEditTagInEditor(tag)} className="text-blue-400 hover:text-white p-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                                    <button onClick={() => handleDeleteTagInEditor(tag.id)} className="text-red-400 hover:text-white p-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                             </div>
                        )}
                         <div className="border-t border-[#333] pt-4 mt-2">
                             <input className="bg-[#3c3c3c] text-white text-xs p-1 rounded w-full mb-1" placeholder="Nova Tag" id="quickTagInput" onKeyDown={(e) => { if(e.key === 'Enter') handleCreateCustomTagInEditor(e.target.value); }} />
                             <p className="text-[9px] text-gray-500">Enter para criar</p>
                        </div>
                    </div>
                    <textarea ref={textAreaRef} className="flex-1 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm p-4 outline-none resize-none" value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} spellCheck="false" />
                    <div className="w-[35%] bg-white border-l border-gray-300 flex flex-col">
                        <div className="bg-gray-100 p-2 text-xs font-bold text-gray-500 border-b text-center">Preview</div>
                        <div className="flex-1 p-4 overflow-y-auto bg-gray-200">
                             <div className="bg-white shadow-lg mx-auto" style={{ width: '210mm', height: '297mm', transform: 'scale(0.6)', transformOrigin: 'top center' }}><SafePreview html={htmlContent} /></div>
                        </div>
                    </div>
                </div>
            </div>
      )}

      {showToolModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-96 transform transition-all scale-100">
                <h3 className="font-bold text-xl text-[#002233] mb-6">{isEditingTool ? 'Editar Gerador' : 'Novo Gerador'}</h3>
                <form onSubmit={handleSaveTool} className="space-y-4">
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">ID Único</label><input value={toolForm.id} onChange={e => setToolForm({...toolForm, id: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg text-sm bg-slate-50" placeholder="ex: notebooks" disabled={isEditingTool} required /></div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Nome</label><input value={toolForm.label} onChange={e => setToolForm({...toolForm, label: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg text-sm" required /></div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Descrição</label><input value={toolForm.desc} onChange={e => setToolForm({...toolForm, desc: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg text-sm" /></div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Ícone SVG (Path)</label><textarea value={toolForm.icon} onChange={e => setToolForm({...toolForm, icon: e.target.value})} className="w-full border border-slate-300 p-2 rounded-lg text-sm h-24 font-mono text-xs" /></div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer mt-2"><input type="checkbox" checked={toolForm.active} onChange={e => setToolForm({...toolForm, active: e.target.checked})} className="rounded text-[#00DBFF]" /> <span className="font-bold text-slate-700">Ativo</span></label>
                    <div className="flex justify-end gap-3 mt-6"><button type="button" onClick={() => setShowToolModal(false)} className="text-slate-500 font-bold text-sm">Cancelar</button><button type="submit" className="bg-[#00DBFF] text-[#002233] px-6 py-2 rounded-lg font-bold text-sm">Salvar</button></div>
                </form>
            </div>
          </div>
      )}

      {showUserModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-96">
              <h3 className="font-bold mb-4">{editingUserId ? 'Editar' : 'Novo'} Usuário</h3>
              <form onSubmit={handleSaveUser} className="space-y-3">
                <input placeholder="Nome" required className="w-full border p-2 rounded text-sm" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} />
                <input placeholder="Email" required className="w-full border p-2 rounded text-sm" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} />
                <select className="w-full border p-2 rounded text-sm" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})}><option value="user">Colaborador</option><option value="admin">Admin</option></select>
                {userForm.role === 'user' && (
                  <div className="border p-2 rounded bg-slate-50 max-h-40 overflow-y-auto">
                    <p className="text-xs font-bold mb-2">Permissões:</p>
                    {Object.entries(toolsConfig).map(([key, tool]) => (<label key={key} className="flex items-center gap-2 text-xs mb-1 cursor-pointer"><input type="checkbox" checked={userForm.permissions.includes(key)} onChange={() => toggleUserPermission(key)} /> {tool.label}</label>))}
                  </div>
                )}
                <div className="flex justify-end gap-2 mt-4"><button type="button" onClick={() => setShowUserModal(false)} className="text-sm">Cancelar</button><button type="submit" className="bg-[#00DBFF] px-3 py-1.5 rounded font-bold text-sm">Salvar</button></div>
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
                // Se for checkbox, inicializa como array vazio
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
    
    // Check for CEP trigger
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
            } catch (error) {
                console.error("Erro ao buscar CEP:", error);
            }
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
              
              if (Array.isArray(val)) {
                  val = val.join(', '); // Formata array como string para exibição
              }
              
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
      printWindow.document.write(`<html><head><title>Imprimir</title><style>@page { size: A4; margin: 0; } body { margin: 0; padding: 0; width: 210mm; height: 297mm; } img { max-width: 100%; height: auto; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } table { border-collapse: collapse; width: 100%; }</style></head><body>${printContent}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-[#f0f4f8]">
      <div className="w-full md:w-[400px] bg-white border-r border-slate-200 flex flex-col z-10 no-print shadow-lg">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-[#002233]">Preenchimento</h2>
          <button onClick={handlePrint} className="bg-[#002233] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-slate-700 transition flex items-center gap-2">IMPRIMIR</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scroll space-y-6">
            {sessions.length === 0 && <p className="text-center text-slate-400 mt-10">Nenhuma sessão configurada.</p>}
            {sessions.map(session => (
                <div key={session.id} className="border-b border-slate-100 pb-4 last:border-0">
                    <h3 className="text-sm font-black text-[#00DBFF] uppercase tracking-wide mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-[#00DBFF] rounded-full"></span>
                        {session.title}
                    </h3>
                    <div className="space-y-3">
                        {session.tags.map(tag => (
                            <div key={tag.id}>
                                <label className="block text-xs font-bold text-slate-500 mb-1">{tag.label}</label>
                                
                                {tag.type === 'checkbox' ? (
                                    <div className="space-y-2 bg-slate-50 p-2 rounded border border-slate-200">
                                        {(tag.options || []).map((opt, idx) => (
                                            <label key={idx} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 p-1 rounded">
                                                <input 
                                                    type="checkbox" 
                                                    checked={(formData[tag.id] || []).includes(opt)}
                                                    onChange={() => handleCheckboxChange(tag.id, opt)}
                                                    className="rounded text-[#00DBFF] focus:ring-[#00DBFF]"
                                                />
                                                <span className="text-slate-700">{opt}</span>
                                            </label>
                                        ))}
                                        {(tag.options || []).length === 0 && <span className="text-xs text-red-400">Sem opções configuradas.</span>}
                                    </div>
                                ) : (
                                    <input 
                                        type={tag.type} 
                                        className="w-full border p-2 rounded text-sm focus:border-[#00DBFF] outline-none transition" 
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
      <div className="flex-1 bg-slate-100 p-8 flex justify-center overflow-auto custom-scroll">
        <div className="bg-white shadow-2xl relative mx-auto origin-top" style={{ width: '210mm', height: '297mm', minWidth: '210mm', minHeight: '297mm' }}>
            <SafePreview html={renderDocument()} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 7. DASHBOARD
// ============================================================================
function Dashboard({ user, onLogout, users, setUsers, templates, setTemplates, tagsConfig, setTagsConfig, delimiters, setDelimiters, changelog, setChangelog, toolsConfig, setToolsConfig, systemSettings, cepMappings }) {
  const [activePage, setActivePage] = useState('Home');
  const [expandedMenu, setExpandedMenu] = useState({ geradores: true });
  const toggleMenu = (key) => setExpandedMenu(prev => ({ ...prev, [key]: !prev[key] }));
  const hasAccess = (toolKey) => {
      const tool = toolsConfig[toolKey];
      if (!tool || !tool.active) return false;
      return user.role === 'admin' || user.permissions.includes('all') || user.permissions.includes(toolKey);
  };

  return (
    <div className="flex w-screen h-screen bg-[#f0f4f8] font-sans text-slate-800 overflow-hidden">
      <style>{`.custom-scroll::-webkit-scrollbar { width: 6px; } .custom-scroll::-webkit-scrollbar-track { background: transparent; } .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; } @media print { .no-print { display: none !important; } }`}</style>
      <aside className="w-64 bg-[#002233] text-white flex flex-col flex-shrink-0 z-50 shadow-xl no-print">
        <div className="p-6 flex flex-col items-center border-b border-white/10 cursor-pointer hover:bg-[#002b40] transition" onClick={() => setActivePage('Home')}>
          <img src="https://i.imgur.com/dFv3pQh.png" alt="Logo" className="w-10 mb-2" />
          <span className="font-bold text-sm tracking-widest text-center mt-2">CORE | Centro de Otimização</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 custom-scroll">
          <div className="px-3 space-y-1">
            <button onClick={() => setActivePage('Home')} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium ${activePage === 'Home' ? 'bg-[#00DBFF] text-[#002233]' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>Visão Geral
            </button>
            <div>
              <button onClick={() => toggleMenu('geradores')} className="w-full flex items-center justify-between px-3 py-2 rounded text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white">
                <div className="flex items-center gap-3"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>Geradores</div>
                <svg className={`w-3 h-3 transition-transform ${expandedMenu.geradores ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {expandedMenu.geradores && (
                <div className="pl-10 pr-2 space-y-1 mt-1">
                   {sortTools(toolsConfig).map(([key, tool]) => (
                        <button 
                            key={key}
                            onClick={() => hasAccess(key) && setActivePage(key)} 
                            className={`w-full text-left px-3 py-1.5 rounded text-xs font-medium flex justify-between items-center ${activePage === key ? 'bg-white/10 text-[#00DBFF]' : hasAccess(key) ? 'text-slate-400 hover:text-white' : 'text-slate-600 cursor-not-allowed'}`}
                        >
                            {tool.label}
                            {!hasAccess(key) && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                        </button>
                   ))}
                </div>
              )}
            </div>
            {(user.role === 'admin' || user.permissions.includes('all')) && (
              <button onClick={() => setActivePage('Admin')} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium ${activePage === 'Admin' ? 'bg-[#00DBFF] text-[#002233]' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Administração
              </button>
            )}
          </div>
        </nav>
        <div className="p-4 border-t border-white/10 bg-black/20 flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#00DBFF] text-[#002233] flex items-center justify-center font-bold text-sm">{user.name.charAt(0)}</div>
            <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate">{user.name.split(' ')[0]}</p><p className="text-[10px] text-slate-400 truncate uppercase">{user.role}</p></div>
            <button onClick={onLogout} className="text-slate-400 hover:text-red-400" title="Sair"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button>
        </div>
      </aside>
      <main className="flex-1 relative flex flex-col h-full overflow-hidden bg-[#F8FAFC]">
        {activePage === 'Home' && <HomePage user={user} onNavigate={setActivePage} changelog={changelog} toolsConfig={toolsConfig} />}
        {activePage === 'Admin' && <AdminPanel users={users} setUsers={setUsers} templates={templates} setTemplates={setTemplates} tagsConfig={tagsConfig} setTagsConfig={setTagsConfig} delimiters={delimiters} setDelimiters={setDelimiters} changelog={changelog} setChangelog={setChangelog} toolsConfig={toolsConfig} setToolsConfig={setToolsConfig} systemSettings={systemSettings} cepMappings={cepMappings} />}
        {toolsConfig[activePage] && <DynamicGenerator template={templates[activePage]} tagsConfig={tagsConfig} delimiters={delimiters} moduleId={activePage} cepMappings={cepMappings} />}
      </main>
    </div>
  );
}

// ============================================================================
// 8. APP ROOT
// ============================================================================
export default function App() {
  const [user, setUser] = useState(null);
  
  // 1. Initial State from LocalStorage (Sync)
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('core_users');
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });
  
  // Restore user session IMMEDIATELY on mount
  useEffect(() => {
    const session = localStorage.getItem('core_session_user');
    if (session) {
      try { const parsed = JSON.parse(session); setUser(parsed); } catch (e) { localStorage.removeItem('core_session_user'); }
    }
    
    // Favicon e Título
    document.title = "CORE | Sistema";
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = "https://midias-tdw.totvs.com/wp-content/uploads/2025/06/favicon-bg-light-192x192-1.png"; // Ícone TOTVS Core
  }, []);

  const [templates, setTemplates] = useState({});
  const [tagsConfig, setTagsConfig] = useState(DEFAULT_TAGS_WITH_SESSIONS); 
  const [delimiters, setDelimiters] = useState(DEFAULT_DELIMITERS);
  const [changelog, setChangelog] = useState([]);
  const [toolsConfig, setToolsConfig] = useState(DEFAULT_TOOLS_CONFIG);
  const [systemSettings, setSystemSettings] = useState({ devBypass: true }); // Default true
  const [cepMappings, setCepMappings] = useState([]); // Mapeamento de CEP
  const [dbReady, setDbReady] = useState(false);

  // 2. Persist Login
  useEffect(() => {
    if (user) localStorage.setItem('core_session_user', JSON.stringify(user));
    else localStorage.removeItem('core_session_user');
  }, [user]);

  // 3. Firebase Connection
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
    const style = document.createElement('style');
    style.innerHTML = `body, html, #root { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; } .custom-scroll::-webkit-scrollbar { width: 6px; } .custom-scroll::-webkit-scrollbar-track { background: transparent; } .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }`;
    document.head.appendChild(style);
    if (!document.querySelector('script[src*="mammoth"]')) {
       const s = document.createElement('script'); s.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.4.21/mammoth.browser.min.js";
       document.head.appendChild(s);
    }
  }, []);

  return user ? <Dashboard user={user} onLogout={() => setUser(null)} users={users} setUsers={setUsers} templates={templates} setTemplates={setTemplates} tagsConfig={tagsConfig} setTagsConfig={setTagsConfig} delimiters={delimiters} setDelimiters={setDelimiters} changelog={changelog} setChangelog={setChangelog} toolsConfig={toolsConfig} setToolsConfig={setToolsConfig} systemSettings={systemSettings} cepMappings={cepMappings} /> : <LoginPage onLogin={setUser} users={users} dbReady={dbReady} systemSettings={systemSettings} />;
}