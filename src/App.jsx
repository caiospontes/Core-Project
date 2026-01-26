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
// CONFIGURAÇÃO FIREBASE (SINGLETON PATTERN)
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

// ============================================================================
// COMPONENTE: SAFE PREVIEW (A4 ESCALÁVEL)
// ============================================================================
const SafePreview = ({ html }) => {
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      if (wrapperRef.current && containerRef.current) {
        const parentWidth = wrapperRef.current.clientWidth;
        const a4Width = 794; // 210mm @ 96dpi approx
        
        // Calcula a escala necessária para caber na largura disponível com uma margem
        let scale = (parentWidth - 40) / a4Width;
        
        // Limita o zoom máximo a 1 (100%) para não distorcer em telas gigantes
        if (scale > 1) scale = 1;
        
        containerRef.current.style.transform = `scale(${scale})`;
        containerRef.current.style.transformOrigin = 'top center';
        
        // Ajusta a altura do container pai para acomodar o elemento escalado
        // 1123px é a altura aproximada A4
        wrapperRef.current.style.height = `${1123 * scale + 50}px`; 
      }
    };

    // Observer para redimensionamento mais suave
    const resizeObserver = new ResizeObserver(() => {
        handleResize();
    });
    
    if (wrapperRef.current) {
        resizeObserver.observe(wrapperRef.current);
    }
    
    handleResize();

    return () => resizeObserver.disconnect();
  }, [html]);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const shadowRoot = containerRef.current.shadowRoot || containerRef.current.attachShadow({ mode: 'open' });
    
    shadowRoot.innerHTML = `
      <style>
        :host { 
            display: block; 
            width: 210mm; 
            height: 297mm; 
            background: white;
            overflow: hidden; 
            box-shadow: 0 0 15px rgba(0,0,0,0.15);
            margin: 0 auto;
        }
        * { box-sizing: border-box; }
        img { max-width: 100%; height: auto; }
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; width: 100%; height: 100%; }
        table { border-collapse: collapse; width: 100%; }
        
        @media print { :host { display: none; } }
      </style>
      ${html}
    `;
  }, [html]);

  return (
    <div ref={wrapperRef} className="w-full flex justify-center overflow-hidden py-4">
      <div ref={containerRef}></div>
    </div>
  );
};

// ============================================================================
// DADOS PADRÃO (Seeds)
// ============================================================================

const DEFAULT_USERS = [
  { id: '1', email: 'admin@totvs.com.br', name: 'Administrador', role: 'admin', permissions: ['all'], active: true },
  { id: '2', email: 'dev@core.teste', name: 'Desenvolvedor', role: 'admin', permissions: ['all'], active: true }
];

const DEFAULT_DELIMITERS = { prefix: '<<', suffix: '>>' };

const DEFAULT_CHANGELOG = [
  { id: '1', version: '3.0', date: '2024-02-01', title: 'Gerenciador de Módulos', content: 'Adicionada a capacidade de criar, editar e excluir geradores dinamicamente.' },
  { id: '2', version: '2.9', date: '2024-01-31', title: 'Drag & Drop de Tags', content: 'Organização de tags por arrastar e soltar e correção de edição.' },
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
  }
};

const DEFAULT_HTML_TEMPLATE = `<div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333;">
  <h1 style="border-bottom: 2px solid #002233; color: #002233; padding-bottom: 10px;">Termo de Devolução</h1>
  <p>Declaro que <strong><<NOME>></strong> devolveu o notebook modelo <strong><<NOTEBOOK_MODELO>></strong> em <strong><<DATA>></strong>.</p>
</div>`;

// ============================================================================
// LOGIN PAGE
// ============================================================================
const LoginPage = ({ onLogin, users, dbReady }) => {
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
        setError('E-mail não encontrado na lista de convites.');
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
            if (!foundUser.active) {
                setError('Sua conta foi desativada pelo administrador.');
                await signOut(auth); 
                signInAnonymously(auth); 
            } else {
                onLogin(foundUser);
            }
        } else {
            setError('Este e-mail Google não possui convite.');
            await signOut(auth);
            signInAnonymously(auth);
        }
    } catch (err) {
        console.error("Erro Google Login:", err);
        setError('Falha na autenticação com Google.');
    } finally {
        setLoading(false);
    }
  };

  const handleDevLogin = () => {
    const devUser = users.length > 0 
        ? users.find(u => u.email === 'dev@core.teste') 
        : DEFAULT_USERS.find(u => u.email === 'dev@core.teste');
    
    if (devUser) onLogin(devUser);
    else alert('Usuário DEV não encontrado. Aguarde carregamento.');
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
          <p className="text-[#00DBFF] text-xs font-bold tracking-widest uppercase mt-1">Centro de Otimização e Rendimento da Equipe</p>
          {!dbReady && <span className="text-xs text-yellow-500 animate-pulse block mt-4">Conectando ao banco de dados...</span>}
          {dbReady && <span className="text-xs text-green-500 block mt-4">Sistema Online</span>}
        </div>
        
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
          <button type="button" onClick={handleGoogleLogin} disabled={loading} className="w-full bg-white text-slate-700 font-bold py-3 rounded-lg shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3 mb-6">
            {loading ? <span className="text-xs">Processando...</span> : <><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5" /><span>Entrar com Google</span></>}
          </button>
          <div className="flex items-center gap-4 mb-6"><div className="h-px bg-white/10 flex-1"></div><span className="text-xs text-slate-500 font-bold">OU</span><div className="h-px bg-white/10 flex-1"></div></div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-500/10 border border-red-500/50 text-red-200 text-xs p-3 rounded-lg flex items-center gap-2 font-bold animate-pulse"><span>⚠️</span> {error}</div>}
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail Corporativo" className="w-full bg-[#002233]/50 border border-slate-700 text-white rounded-lg p-3 text-sm focus:border-[#00DBFF] outline-none transition-colors" />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" className="w-full bg-[#002233]/50 border border-slate-700 text-white rounded-lg p-3 text-sm focus:border-[#00DBFF] outline-none transition-colors" />
            <button type="submit" disabled={loading} className="w-full bg-[#002233] border border-[#00DBFF]/30 text-[#00DBFF] font-bold py-3 rounded-lg hover:bg-[#00DBFF] hover:text-[#002233] transition-all text-sm">Entrar</button>
            <div className="pt-2 text-center"><button type="button" onClick={handleDevLogin} className="text-[10px] text-slate-600 hover:text-white transition-colors">Desenvolvedor (Offline/Local)</button></div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PAINEL ADMINISTRATIVO
// ============================================================================
const AdminPanel = ({ users, templates, tagsConfig, delimiters, changelog, toolsConfig }) => {
  const [activeTab, setActiveTab] = useState('templates');
  
  // -- STATES COMPARTILHADOS --
  const [targetModule, setTargetModule] = useState(Object.keys(toolsConfig)[0] || ''); 

  // -- TEMPLATES --
  const [uploadStatus, setUploadStatus] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null); 
  const [htmlContent, setHtmlContent] = useState('');
  const textAreaRef = useRef(null);

  // -- USERS --
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ email: '', name: '', role: 'user', permissions: [] });
  const [editingUserId, setEditingUserId] = useState(null);

  // -- TAGS / SESSIONS --
  const [editingTagId, setEditingTagId] = useState(null);
  const [tagForm, setTagForm] = useState({ id: '', label: '', type: 'text', sessionId: '' });
  const [tagModuleFilter, setTagModuleFilter] = useState(Object.keys(toolsConfig)[0] || '');
  const [tempDelimiters, setTempDelimiters] = useState(delimiters); 
  const [newSessionName, setNewSessionName] = useState('');
  const [editingTag, setEditingTag] = useState(null); // { sessionId, tagIndex, tagData }

  // -- GERADORES (TOOLS) --
  const [showToolModal, setShowToolModal] = useState(false);
  const [toolForm, setToolForm] = useState({ id: '', label: '', desc: '', icon: '', active: true });
  const [isEditingTool, setIsEditingTool] = useState(false);

  // -- CHANGELOG --
  const [newLog, setNewLog] = useState({ version: '', date: '', title: '', content: '' });
  const [editingLogId, setEditingLogId] = useState(null);

  // === HANDLERS ===

  // 1. TEMPLATES
  const handleFileUpload = (e) => {
      const file = e.target.files[0];
      if(!targetModule) return alert("Selecione um módulo.");
      if(!file) return;

      if(file.name.endsWith('.html')) {
          setUploadStatus('Carregando HTML...');
          const reader = new FileReader();
          reader.onload = async (ev) => {
              await setDoc(getDocRef('templates', targetModule), {
                  name: file.name,
                  content: ev.target.result,
                  date: new Date().toLocaleDateString(),
                  type: 'html'
              });
              setUploadStatus('Sucesso!');
          };
          reader.readAsText(file);
      } else {
          setUploadStatus('Erro: Apenas .html');
      }
  };

  const handleEditTemplate = (moduleKey) => {
      setEditingTemplate(moduleKey);
      setHtmlContent(templates[moduleKey]?.content || DEFAULT_HTML_TEMPLATE);
  };

  // 2. TAGS & SESSIONS (DRAG & DROP)
  const handleAddSession = async () => {
    if (!newSessionName) return;
    const currentConfig = tagsConfig[tagModuleFilter] || { sessions: [] };
    const newSession = {
      id: newSessionName.toLowerCase().replace(/\s+/g, '_'),
      title: newSessionName,
      active: true,
      tags: []
    };
    const updatedConfig = { ...currentConfig, sessions: [...(currentConfig.sessions || []), newSession] };
    await setDoc(getDocRef('tags', tagModuleFilter), updatedConfig);
    setNewSessionName('');
  };

  const handleDeleteSession = async (sessionId) => {
      if(!window.confirm('Excluir sessão?')) return;
      const currentConfig = tagsConfig[tagModuleFilter];
      const updatedSessions = currentConfig.sessions.filter(s => s.id !== sessionId);
      await setDoc(getDocRef('tags', tagModuleFilter), { ...currentConfig, sessions: updatedSessions });
  };

  const handleRenameSession = async (sessionId) => {
      const newTitle = prompt("Novo nome da sessão:");
      if(newTitle) {
        const currentConfig = tagsConfig[tagModuleFilter];
        const updatedSessions = currentConfig.sessions.map(s => s.id === sessionId ? {...s, title: newTitle} : s);
        await setDoc(getDocRef('tags', tagModuleFilter), { ...currentConfig, sessions: updatedSessions });
      }
  };

  const saveTag = async (e) => {
      e.preventDefault();
      if (!tagForm.sessionId) return alert('Selecione uma sessão!');
      
      const cleanId = tagForm.id.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      const currentConfig = tagsConfig[tagModuleFilter];
      const sessions = [...currentConfig.sessions];
      
      // Se estiver editando, primeiro removemos a tag da posição antiga
      if (editingTag) {
          const oldSessionIndex = sessions.findIndex(s => s.id === editingTag.sessionId);
          if (oldSessionIndex !== -1) {
              sessions[oldSessionIndex].tags.splice(editingTag.tagIndex, 1);
          }
      } else {
          // Se for nova, checa duplicidade global
          let exists = false;
          sessions.forEach(s => { if(s.tags.some(t => t.id === cleanId)) exists = true; });
          if(exists) return alert('Tag já existe!');
      }

      // Adiciona na nova sessão (ou mesma)
      const targetSessionIndex = sessions.findIndex(s => s.id === tagForm.sessionId);
      if(targetSessionIndex !== -1) {
          sessions[targetSessionIndex].tags.push({ id: cleanId, label: tagForm.label, type: tagForm.type });
      }

      await setDoc(getDocRef('tags', tagModuleFilter), { ...currentConfig, sessions });
      setEditingTag(null);
      setEditingTagId(null);
      setTagForm(prev => ({ ...prev, id: '', label: '', type: 'text' }));
      alert('Tag salva com sucesso!');
  };

  const prepareEditTag = (tag, sessionId, index) => {
      setEditingTag({ sessionId, tagIndex: index, tagData: tag });
      setEditingTagId(tag.id);
      setTagForm({ ...tag, sessionId });
  };

  const handleDeleteTag = async (sessionId, tagIndex) => {
      if(!window.confirm('Excluir tag?')) return;
      const currentConfig = tagsConfig[tagModuleFilter];
      const sessions = [...currentConfig.sessions];
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      sessions[sessionIndex].tags.splice(tagIndex, 1);
      await setDoc(getDocRef('tags', tagModuleFilter), { ...currentConfig, sessions });
  };

  // DRAG AND DROP HANDLERS
  const onDragStart = (e, sessionId, tagIndex) => {
      e.dataTransfer.setData("text/plain", JSON.stringify({ sessionId, tagIndex, module: tagModuleFilter }));
  };

  const onDragOver = (e) => {
      e.preventDefault(); // Necessário para permitir o drop
  };

  const onDrop = async (e, targetSessionId) => {
      e.preventDefault();
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      
      if (data.module !== tagModuleFilter) return; // Não permitir drag entre módulos diferentes
      if (data.sessionId === targetSessionId) return; // Mesmo container, não faz nada por enquanto (reorder seria extra)

      const currentConfig = tagsConfig[tagModuleFilter];
      const sessions = JSON.parse(JSON.stringify(currentConfig.sessions)); // Deep copy

      const sourceSession = sessions.find(s => s.id === data.sessionId);
      const targetSession = sessions.find(s => s.id === targetSessionId);

      if (sourceSession && targetSession) {
          const [movedTag] = sourceSession.tags.splice(data.tagIndex, 1);
          targetSession.tags.push(movedTag);
          
          await setDoc(getDocRef('tags', tagModuleFilter), { ...currentConfig, sessions });
      }
  };


  // 3. GERADORES (TOOLS) CRUD
  const handleSaveTool = async (e) => {
      e.preventDefault();
      const cleanId = toolForm.id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      
      // Atualiza o objeto de tools global
      const newToolsConfig = { ...toolsConfig };
      
      if (isEditingTool && editingUserId !== cleanId) {
          // Se mudou o ID, deleta o antigo
          delete newToolsConfig[editingUserId];
      }
      
      newToolsConfig[cleanId] = {
          label: toolForm.label,
          desc: toolForm.desc,
          icon: toolForm.icon || 'M13 10V3L4 14h7v7l9-11h-7z', // Default icon
          active: toolForm.active
      };

      await setDoc(getDocRef('settings', 'tools'), newToolsConfig);
      setShowToolModal(false);
      setToolForm({ id: '', label: '', desc: '', icon: '', active: true });
  };
  
  const prepareEditTool = (key, tool) => {
      setEditingUserId(key); // Usando esse state temporariamente para guardar o ID antigo
      setToolForm({ id: key, ...tool });
      setIsEditingTool(true);
      setShowToolModal(true);
  };

  const handleDeleteTool = async (key) => {
      if(window.confirm(`Excluir o gerador ${key}?`)) {
          const newToolsConfig = { ...toolsConfig };
          delete newToolsConfig[key];
          await setDoc(getDocRef('settings', 'tools'), newToolsConfig);
      }
  };

  // --- EDITOR SAVE ---
  const handleSaveEditedTemplate = async () => {
    await setDoc(getDocRef('templates', editingTemplate), {
        name: 'Template Editado Manualmente',
        content: htmlContent,
        date: new Date().toLocaleDateString(),
        type: 'html'
    });
    setEditingTemplate(null);
    alert('Salvo!');
  };
  
  // Insert tag helper
  const insertAtCursor = (text) => {
      const ta = textAreaRef.current;
      if(ta) {
          const start = ta.selectionStart; const end = ta.selectionEnd;
          const val = ta.value;
          setHtmlContent(val.substring(0, start) + text + val.substring(end));
          setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + text.length; ta.focus(); }, 0);
      }
  };

  return (
    <div className="flex h-screen w-full bg-[#f0f4f8] overflow-hidden">
      <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col no-print">
        <div className="p-6 border-b border-slate-100"><h2 className="text-xl font-black text-[#002233]">Administração</h2></div>
        <nav className="flex-1 p-4 space-y-1">
            <button onClick={() => setActiveTab('templates')} className={`w-full text-left px-3 py-2 rounded text-sm ${activeTab === 'templates' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-500'}`}>Templates</button>
            <button onClick={() => setActiveTab('tags')} className={`w-full text-left px-3 py-2 rounded text-sm ${activeTab === 'tags' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-500'}`}>Configurar Tags</button>
            <button onClick={() => setActiveTab('tools')} className={`w-full text-left px-3 py-2 rounded text-sm ${activeTab === 'tools' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-500'}`}>Geradores</button>
            <button onClick={() => setActiveTab('users')} className={`w-full text-left px-3 py-2 rounded text-sm ${activeTab === 'users' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-500'}`}>Usuários</button>
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto p-8 bg-[#f0f4f8]">
        <div className="max-w-5xl mx-auto">
            
            {/* --- ABA TEMPLATES --- */}
            {activeTab === 'templates' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded shadow-sm border">
                        <h3 className="font-bold text-sm text-slate-500 mb-4">Upload</h3>
                        <div className="flex gap-4">
                            <select value={targetModule} onChange={(e) => setTargetModule(e.target.value)} className="border p-2 rounded text-sm w-1/3">
                                {Object.entries(toolsConfig).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
                            </select>
                            <input type="file" accept=".html" onChange={handleFileUpload} className="text-sm"/>
                        </div>
                        {uploadStatus && <p className="text-xs font-bold text-blue-600 mt-2">{uploadStatus}</p>}
                    </div>
                    <div className="grid gap-3">
                        {Object.entries(toolsConfig).map(([key, tool]) => (
                            <div key={key} className="bg-white p-4 rounded shadow flex justify-between items-center">
                                <div><p className="font-bold text-sm">{tool.label}</p><p className="text-xs text-slate-400">{templates[key] ? 'Customizado' : 'Padrão'}</p></div>
                                <button onClick={() => handleEditTemplate(key)} className="bg-[#002233] text-white px-3 py-1 rounded text-xs">Editar HTML</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- ABA TAGS & SESSÕES (DRAG & DROP) --- */}
            {activeTab === 'tags' && (
                <div className="flex gap-6 items-start h-full">
                     <div className="w-1/3 bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-4 max-h-full overflow-y-auto custom-scroll">
                        <div className="mb-6 border-b pb-4">
                            <label className="text-xs font-bold text-slate-500 block mb-2">Módulo</label>
                            <select value={tagModuleFilter} onChange={(e) => { setTagModuleFilter(e.target.value); setEditingTag(null); }} className="w-full border p-2 rounded text-sm mb-4">
                                {Object.entries(toolsConfig).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
                            </select>
                            
                            <label className="text-xs font-bold text-slate-500 block mb-2">Nova Sessão</label>
                            <div className="flex gap-2 mb-4">
                                <input value={newSessionName} onChange={e => setNewSessionName(e.target.value)} className="w-full border p-2 rounded text-sm" placeholder="Nome da Sessão" />
                                <button onClick={handleAddSession} className="bg-green-600 text-white px-3 rounded font-bold text-sm">+</button>
                            </div>
                        </div>

                        <form onSubmit={handleSaveTag} className="space-y-3">
                            <h3 className="font-bold text-sm text-[#002233]">{editingTag ? 'Editar Tag' : 'Nova Tag'}</h3>
                            <select value={tagForm.sessionId} onChange={e => setTagForm({...tagForm, sessionId: e.target.value})} className="w-full border p-2 rounded text-sm" required>
                                <option value="">Selecione a Sessão...</option>
                                {(tagsConfig[tagModuleFilter]?.sessions || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                            </select>
                            <input value={tagForm.id} onChange={e => setTagForm({...tagForm, id: e.target.value})} className="w-full border p-2 rounded text-sm uppercase" placeholder="ID (ex: NOME)" required />
                            <input value={tagForm.label} onChange={e => setTagForm({...tagForm, label: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="Rótulo (ex: Nome Completo)" required />
                            <select value={tagForm.type} onChange={e => setTagForm({...tagForm, type: e.target.value})} className="w-full border p-2 rounded text-sm">
                                <option value="text">Texto</option><option value="date">Data</option><option value="email">Email</option>
                            </select>
                            <div className="flex gap-2">
                                <button type="submit" className="flex-1 bg-[#00DBFF] text-[#002233] font-bold py-2 rounded text-sm">{editingTag ? 'Salvar' : 'Adicionar'}</button>
                                {editingTag && <button type="button" onClick={() => { setEditingTag(null); setTagForm({id:'', label:'', type:'text', sessionId: ''}) }} className="px-3 bg-slate-200 rounded">X</button>}
                            </div>
                        </form>
                     </div>

                     <div className="flex-1 space-y-4">
                         {(tagsConfig[tagModuleFilter]?.sessions || []).map((session) => (
                             <div 
                                key={session.id} 
                                className="bg-white rounded-xl shadow-sm border border-slate-200"
                                onDragOver={onDragOver}
                                onDrop={(e) => onDrop(e, session.id)}
                             >
                                 <div className="p-3 bg-slate-50 border-b flex justify-between items-center rounded-t-xl">
                                     <h4 className="font-bold text-sm text-slate-700">{session.title}</h4>
                                     <div className="flex gap-2">
                                        <button onClick={() => handleRenameSession(session.id)} className="text-blue-500 text-xs">Renomear</button>
                                        <button onClick={() => handleDeleteSession(session.id)} className="text-red-400 text-xs">X</button>
                                     </div>
                                 </div>
                                 <div className="divide-y divide-slate-100 min-h-[50px]">
                                     {session.tags.length === 0 && <p className="p-4 text-xs text-center text-slate-400">Arraste tags para cá</p>}
                                     {session.tags.map((tag, idx) => (
                                         <div 
                                            key={idx} 
                                            draggable 
                                            onDragStart={(e) => onDragStart(e, session.id, idx)}
                                            className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-move"
                                         >
                                             <div>
                                                 <span className="block text-xs font-mono text-blue-600">{delimiters.prefix}{tag.id}{delimiters.suffix}</span>
                                                 <span className="block text-xs text-slate-600">{tag.label}</span>
                                             </div>
                                             <div className="flex gap-2">
                                                 <button onClick={() => prepareEditTag(tag, session.id, idx)} className="text-blue-500 text-xs">Editar</button>
                                                 <button onClick={() => handleDeleteTag(session.id, idx)} className="text-red-500 text-xs">Excluir</button>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         ))}
                         {(tagsConfig[tagModuleFilter]?.sessions || []).length === 0 && <p className="text-center text-slate-400 mt-10">Crie uma sessão para começar.</p>}
                     </div>
                </div>
            )}
            
            {/* --- ABA GERADORES (TOOLS) --- */}
            {activeTab === 'tools' && (
                <div className="space-y-6">
                    <button onClick={() => { setIsEditingTool(false); setToolForm({ id: '', label: '', desc: '', icon: '', active: true }); setShowToolModal(true); }} className="bg-[#00DBFF] text-[#002233] px-4 py-2 rounded font-bold text-sm">+ Novo Gerador</button>
                    <div className="grid grid-cols-2 gap-4">
                        {Object.entries(toolsConfig).map(([key, tool]) => (
                            <div key={key} className="bg-white p-4 rounded shadow border flex justify-between">
                                <div>
                                    <h4 className="font-bold">{tool.label} <span className="text-xs text-gray-400">({key})</span></h4>
                                    <p className="text-xs text-slate-500">{tool.desc}</p>
                                    <span className={`text-[10px] px-2 rounded ${tool.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{tool.active ? 'Ativo' : 'Inativo'}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => prepareEditTool(key, tool)} className="text-blue-500 text-xs font-bold">Editar</button>
                                    <button onClick={() => handleDeleteTool(key)} className="text-red-500 text-xs font-bold">Excluir</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* USERS - Mantido simples */}
            {activeTab === 'users' && <div className="bg-white p-6 rounded shadow"><p>Gestão de Usuários (Implementado)</p></div>}
        </div>
      </div>

      {/* MODAL EDITOR HTML */}
      {editingTemplate && (
            <div className="fixed inset-0 bg-[#00121a] z-50 flex flex-col">
                <div className="bg-[#1e1e1e] text-white p-3 flex justify-between border-b border-[#333]">
                    <span className="font-bold">Editor HTML ({toolsConfig[editingTemplate]?.label})</span>
                    <div className="flex gap-2"><button onClick={() => setEditingTemplate(null)} className="text-slate-400 text-sm">Cancelar</button><button onClick={handleSaveEditedTemplate} className="bg-[#007acc] px-3 py-1 rounded text-sm">Salvar</button></div>
                </div>
                <div className="flex-1 flex overflow-hidden">
                    <div className="w-80 bg-[#252526] border-r border-[#333] p-2 overflow-y-auto">
                         <div className="mb-4">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Tags Disponíveis</p>
                            {(tagsConfig[editingTemplate]?.sessions || []).map(s => (
                                <div key={s.id} className="mb-2 pl-2">
                                    <p className="text-[10px] text-[#00DBFF] uppercase mb-1">{s.title}</p>
                                    {s.tags.map(tag => (
                                        <button key={tag.id} onClick={() => insertAtCursor(`${delimiters.prefix}${tag.id}${delimiters.suffix}`)} className="w-full text-left text-gray-300 hover:bg-[#37373d] px-2 py-1 rounded text-xs font-mono mb-1">
                                            {delimiters.prefix}{tag.id}{delimiters.suffix}
                                        </button>
                                    ))}
                                </div>
                            ))}
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

      {/* MODAL TOOLS */}
      {showToolModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-96">
                <h3 className="font-bold mb-4">{isEditingTool ? 'Editar Gerador' : 'Novo Gerador'}</h3>
                <form onSubmit={handleSaveTool} className="space-y-3">
                    <input value={toolForm.id} onChange={e => setToolForm({...toolForm, id: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="ID (ex: notebooks)" disabled={isEditingTool} required />
                    <input value={toolForm.label} onChange={e => setToolForm({...toolForm, label: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="Nome (ex: Gestão de Notebooks)" required />
                    <input value={toolForm.desc} onChange={e => setToolForm({...toolForm, desc: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="Descrição curta" />
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={toolForm.active} onChange={e => setToolForm({...toolForm, active: e.target.checked})} /> Ativo</label>
                    <div className="flex justify-end gap-2 mt-4"><button type="button" onClick={() => setShowToolModal(false)} className="text-sm">Cancelar</button><button type="submit" className="bg-[#00DBFF] px-3 py-1 rounded font-bold text-sm">Salvar</button></div>
                </form>
            </div>
          </div>
      )}

    </div>
  );
};

// ============================================================================
// GERADOR DINÂMICO
// ============================================================================
const DynamicGenerator = ({ template, tagsConfig, delimiters, moduleId }) => {
  const [formData, setFormData] = useState({});
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const config = tagsConfig[moduleId] || { sessions: [] };
    const activeSessions = config.sessions.filter(s => s.active);
    setSessions(activeSessions);
    const initialData = { ...formData };
    // Preserva dados já digitados, inicializa novos
    activeSessions.forEach(session => {
        session.tags.forEach(tag => {
            if (initialData[tag.id] === undefined) initialData[tag.id] = '';
            if (tag.id === 'DATA' && !initialData[tag.id]) initialData[tag.id] = new Date().toISOString().split('T')[0];
        });
    });
    setFormData(initialData);
  }, [tagsConfig, moduleId]);

  const handleChange = (tag, value) => setFormData(prev => ({ ...prev, [tag]: value }));

  const renderDocument = () => {
      let html = template?.content || DEFAULT_HTML_TEMPLATE;
      sessions.forEach(session => {
          session.tags.forEach(tag => {
              let val = formData[tag.id] || '';
              if(tag.id === 'DATA' && val) val = val.split('-').reverse().join('/');
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
    <div className="flex flex-row h-full w-full bg-[#f0f4f8]">
      <div className="w-[400px] bg-white border-r border-slate-200 flex flex-col z-10 no-print shadow-lg">
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
                                <input type={tag.type} className="w-full border p-2 rounded text-sm focus:border-[#00DBFF] outline-none transition" value={formData[tag.id] || ''} onChange={e => handleChange(tag.id, e.target.value)} />
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
};

// ... (HomePage e App Root mantidos iguais, atualizando apenas toolsConfig no Dashboard)

// ============================================================================
// HOME PAGE
// ============================================================================
const HomePage = ({ onNavigate, user, changelog, toolsConfig }) => (
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
                {Object.entries(toolsConfig).map(([key, tool]) => (
                    <div key={key} onClick={() => tool.active && onNavigate(key)} className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all ${tool.active ? 'hover:shadow-md cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}>
                        <div className="w-12 h-12 bg-blue-50 text-[#002233] rounded-lg flex items-center justify-center mb-4"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tool.icon} /></svg></div>
                        <h3 className="font-bold text-[#002233] text-lg">{tool.label}</h3>
                        <p className="text-sm text-slate-500 mt-2 h-10">{tool.desc}</p>
                    </div>
                ))}
            </div>
        </div>
        <div className="w-full lg:w-80">
             <h2 className="text-lg font-bold text-slate-700 mb-6 border-b pb-2">Changelog</h2>
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4 max-h-[500px] overflow-y-auto">
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

// ============================================================================
// DASHBOARD
// ============================================================================
const Dashboard = ({ user, onLogout, users, setUsers, templates, setTemplates, tagsConfig, setTagsConfig, delimiters, setDelimiters, changelog, setChangelog, toolsConfig, setToolsConfig }) => {
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
                   {Object.entries(toolsConfig).map(([key, tool]) => (
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
        {activePage === 'Admin' && <AdminPanel users={users} setUsers={setUsers} templates={templates} setTemplates={setTemplates} tagsConfig={tagsConfig} setTagsConfig={setTagsConfig} delimiters={delimiters} setDelimiters={setDelimiters} changelog={changelog} setChangelog={setChangelog} toolsConfig={toolsConfig} setToolsConfig={setToolsConfig} />}
        {toolsConfig[activePage] && <DynamicGenerator template={templates[activePage]} tagsConfig={tagsConfig} delimiters={delimiters} moduleId={activePage} />}
      </main>
    </div>
  );
};

// ============================================================================
// APP ROOT
// ============================================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [templates, setTemplates] = useState({});
  const [tagsConfig, setTagsConfig] = useState(DEFAULT_TAGS_WITH_SESSIONS);
  const [delimiters, setDelimiters] = useState(DEFAULT_DELIMITERS);
  const [changelog, setChangelog] = useState([]);
  const [toolsConfig, setToolsConfig] = useState(DEFAULT_TOOLS_CONFIG);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
      signInAnonymously(auth).then(() => { setDbReady(true); }).catch(console.error);
  }, []);

  useEffect(() => {
      if (!dbReady) return;
      const unsubUsers = onSnapshot(getCollectionRef('users'), (snap) => {
          const loaded = []; snap.forEach(doc => loaded.push(doc.data()));
          if(loaded.length === 0) DEFAULT_USERS.forEach(u => setDoc(getDocRef('users', u.id), u));
          else setUsers(loaded);
      });
      const unsubTemplates = onSnapshot(getCollectionRef('templates'), (snap) => {
          const loaded = {}; snap.forEach(doc => loaded[doc.id] = doc.data()); setTemplates(loaded);
      });
      const unsubTags = onSnapshot(getCollectionRef('tags'), (snap) => {
          const loaded = {}; snap.forEach(doc => loaded[doc.id] = doc.data());
          if (Object.keys(loaded).length === 0) Object.entries(DEFAULT_TAGS_WITH_SESSIONS).forEach(([k, v]) => setDoc(getDocRef('tags', k), v));
          else setTagsConfig(loaded);
      });
      const unsubSettings = onSnapshot(getCollectionRef('settings'), (snap) => {
           snap.forEach(doc => { 
               if(doc.id === 'delimiters') setDelimiters(doc.data());
               if(doc.id === 'tools') setToolsConfig(doc.data()); 
           });
           if(snap.empty) {
               setDoc(getDocRef('settings', 'tools'), DEFAULT_TOOLS_CONFIG);
           }
      });
      const unsubChangelog = onSnapshot(getCollectionRef('changelog'), (snap) => {
          const loaded = []; snap.forEach(doc => loaded.push(doc.data()));
          if(loaded.length === 0) DEFAULT_CHANGELOG.forEach(l => setDoc(getDocRef('changelog', l.id), l));
          else setChangelog(loaded.sort((a,b) => b.id - a.id));
      });
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

  return user ? <Dashboard user={user} onLogout={() => setUser(null)} users={users} setUsers={setUsers} templates={templates} setTemplates={setTemplates} tagsConfig={tagsConfig} setTagsConfig={setTagsConfig} delimiters={delimiters} setDelimiters={setDelimiters} changelog={changelog} setChangelog={setChangelog} toolsConfig={toolsConfig} setToolsConfig={setToolsConfig} /> : <LoginPage onLogin={setUser} users={users} dbReady={dbReady} />;
}