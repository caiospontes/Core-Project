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
// 1. CONFIGURAÇÃO FIREBASE
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

// Inicialização segura
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const appId = firebaseConfig.projectId;

const getCollectionRef = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);
const getDocRef = (colName, docId) => doc(db, 'artifacts', appId, 'public', 'data', colName, docId);

// ============================================================================
// 2. COMPONENTE SAFE PREVIEW (A4 ESTÁTICO - VISÃO DE IMPRESSÃO)
// ============================================================================
const SafePreview = ({ html }) => {
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const shadowRootRef = useRef(null);

  useEffect(() => {
    const updateScale = () => {
      if (wrapperRef.current && containerRef.current) {
        const parentWidth = wrapperRef.current.clientWidth;
        const parentHeight = wrapperRef.current.clientHeight;
        
        // Dimensões A4 em pixels (96 DPI) - 210mm x 297mm
        const A4_WIDTH_PX = 794; 
        const A4_HEIGHT_PX = 1123;
        
        const PADDING = 40;
        
        // Calcula escala para caber na largura disponível
        const availableWidth = parentWidth - PADDING;
        const availableHeight = parentHeight - PADDING;
        
        // Fit to width or height logic - vamos priorizar width, mas garantir que cabe na tela se possível
        // Para simular "visão de folha inteira", usamos o menor fator de escala
        const scaleW = availableWidth / A4_WIDTH_PX;
        
        // Limite máximo de zoom para não ficar gigante em telas enormes
        let scale = Math.min(scaleW, 1.0); 
        
        containerRef.current.style.transform = `scale(${scale})`;
        containerRef.current.style.transformOrigin = 'top center';
        
        // O container tem tamanho fixo A4. O wrapper ajusta a altura para o espaço ocupado pelo elemento escalado.
        wrapperRef.current.style.height = `${(A4_HEIGHT_PX * scale) + 50}px`; 
      }
    };

    const observer = new ResizeObserver(updateScale);
    if (wrapperRef.current) observer.observe(wrapperRef.current);
    
    setTimeout(updateScale, 100);

    return () => observer.disconnect();
  }, [html]);

  useEffect(() => {
    if (!containerRef.current) return;
    
    if (!shadowRootRef.current) {
        shadowRootRef.current = containerRef.current.attachShadow({ mode: 'open' });
    }
    
    const shadowRoot = shadowRootRef.current;
    
    // CSS Isolado para o Preview - Fixo A4
    shadowRoot.innerHTML = `
      <style>
        :host { 
            display: block; 
            width: 794px;  /* 210mm fixo */
            height: 1123px; /* 297mm fixo */
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.15);
            margin: 0 auto;
            overflow: hidden; /* Corta o que passar da folha, igual impressão */
            position: relative;
        }
        body { 
            margin: 0; 
            padding: 0; 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            width: 100%; 
            height: 100%;
            box-sizing: border-box;
            color: black;
            overflow-wrap: break-word;
        }
        * { box-sizing: border-box; }
        img { max-width: 100%; height: auto; display: block; }
        table { border-collapse: collapse; width: 100%; }
        p { margin: 0 0 10px 0; }
        
        /* Reset básico para garantir consistência com PDF */
        h1, h2, h3, h4, h5, h6 { margin-top: 0; }
        
        @media print { :host { display: none; } }
      </style>
      ${html}
    `;
  }, [html]);

  return (
    <div ref={wrapperRef} className="w-full h-full flex items-start justify-center overflow-auto bg-slate-200/50 p-4 custom-scroll">
      <div 
        ref={containerRef} 
        style={{ 
           width: '794px', 
           height: '1123px',
           minWidth: '794px',
           minHeight: '1123px',
           backgroundColor: 'white'
        }}
      ></div>
    </div>
  );
};

// ============================================================================
// 3. DADOS PADRÃO E UTILS
// ============================================================================

const DEFAULT_USERS = [
  { id: '1', email: 'admin@totvs.com.br', name: 'Administrador', role: 'admin', permissions: ['all'], active: true },
  { id: '2', email: 'dev@core.teste', name: 'Desenvolvedor', role: 'admin', permissions: ['all'], active: true }
];

const DEFAULT_DELIMITERS = { prefix: '<<', suffix: '>>' };

const DEFAULT_CHANGELOG = [
  { id: '1', version: '3.7', date: '2024-02-09', title: 'Correções Finais', content: 'Correção de erros de referência no Admin, melhorias no Live Preview A4 e persistência de sessão.' },
  { id: '2', version: '3.6', date: '2024-02-08', title: 'Ordenação e Preview', content: 'Geradores ordenados por status/nome e correção no Live Preview para mostrar todo conteúdo.' },
  { id: '3', version: '3.0', date: '2024-02-04', title: 'Refatoração Completa', content: 'Nova arquitetura do sistema.' },
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
    icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
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
// 4. TELA DE LOGIN
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
          <p className="text-[#00DBFF] text-xs font-bold tracking-widest uppercase mt-1">Centro de Otimização e Rendimento da Equipe</p>
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
            <div className="pt-2 text-center"><button type="button" onClick={handleDevLogin} className="text-[10px] text-slate-600 hover:text-white transition-colors">Desenvolvedor (Offline/Local)</button></div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 5. PAINEL ADMINISTRATIVO
// ============================================================================
const AdminPanel = ({ users, templates, tagsConfig, delimiters, changelog, toolsConfig }) => {
  const [activeTab, setActiveTab] = useState('templates');
  const [targetModule, setTargetModule] = useState(Object.keys(toolsConfig)[0] || '');
  
  // Tag Management
  const [tagModuleFilter, setTagModuleFilter] = useState(Object.keys(toolsConfig)[0] || '');
  const [tagForm, setTagForm] = useState({ id: '', label: '', type: 'text', sessionId: '' });
  const [editingTag, setEditingTag] = useState(null);
  const [newSessionName, setNewSessionName] = useState('');
  const [tempDelimiters, setTempDelimiters] = useState(delimiters);

  // Tools Management
  const [showToolModal, setShowToolModal] = useState(false);
  const [toolForm, setToolForm] = useState({ id: '', label: '', desc: '', icon: '', active: true });
  const [isEditingTool, setIsEditingTool] = useState(false);
  const [editingToolKey, setEditingToolKey] = useState(null);

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

  // Editor Tags State
  const [editorEditingTagId, setEditorEditingTagId] = useState(null);
  const [editorTagForm, setEditorTagForm] = useState({ id: '', label: '', type: 'text' });

  const getSortedTools = () => {
    return Object.entries(toolsConfig).sort(([, a], [, b]) => {
      if (a.active && !b.active) return -1;
      if (!a.active && b.active) return 1;
      return a.label.localeCompare(b.label);
    });
  };

  // --- Handlers ---
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
      } else { setUploadStatus('Erro: Apenas .html'); }
  };

  const handleEditTemplate = (moduleKey) => {
      setEditingTemplate(moduleKey);
      setHtmlContent(templates[moduleKey]?.content || DEFAULT_HTML_TEMPLATE);
  };

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

  const saveTag = async (id, label, type, module, isEdit = false, originalId = null) => {
      const cleanId = id.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      const currentTags = tagsConfig[module] || { sessions: [] };
      const sessions = JSON.parse(JSON.stringify(currentConfig.sessions || []));
      
      const targetSessionId = tagForm.sessionId || sessions[0]?.id;
      const sessionIndex = sessions.findIndex(s => s.id === targetSessionId);
      
      if(sessionIndex === -1) return false;

      const newTag = { id: cleanId, label: tagForm.label, type: tagForm.type };

      if (isEdit && editingTag) {
          const oldSessionIndex = sessions.findIndex(s => s.id === editingTag.sessionId);
          if (oldSessionIndex !== -1) {
              sessions[oldSessionIndex].tags.splice(editingTag.tagIndex, 1);
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

  const handleDeleteTag = async (sessionId, tagIndex, module = tagModuleFilter) => {
      if(!window.confirm('Excluir tag?')) return;
      const currentConfig = tagsConfig[module];
      const sessions = JSON.parse(JSON.stringify(currentConfig.sessions));
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      sessions[sessionIndex].tags.splice(tagIndex, 1);
      await setDoc(getDocRef('tags', module), { ...currentConfig, sessions });
  };

  const handleSaveTagPanel = async (e) => {
      e.preventDefault();
      const success = await saveTag(tagForm.id, tagForm.label, tagForm.type, tagModuleFilter, !!editingTagId, editingTagId);
      if(success !== false) {
        setTagForm({ id: '', label: '', type: 'text', sessionId: tagForm.sessionId });
        setEditingTag(null);
        setEditingTagId(null);
        alert('Tag salva!');
      } else {
        alert('Tag já existe ou sessão inválida!');
      }
  };

  const handleSaveTagInEditor = async (e) => {
    e.preventDefault();
    const success = await saveTag(editorTagForm.id, editorTagForm.label, editorTagForm.type, editingTemplate, true, editorEditingTagId);
    if(success) {
        setEditorEditingTagId(null);
        setEditorTagForm({ id: '', label: '', type: 'text' });
    } else {
        alert("Erro ao editar tag.");
    }
  };

  const handleEditTagClick = (tag, sessionId, index) => {
      setEditingTag({ sessionId, tagIndex: index, tagData: tag });
      setEditingTagId(tag.id);
      setTagForm({ ...tag, sessionId });
  };

  const handleSaveDelimiters = async () => {
    await setDoc(getDocRef('settings', 'delimiters'), tempDelimiters);
    alert(`Delimitadores atualizados.`);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    const userId = editingUserId || Date.now().toString();
    const userData = { ...userForm, id: userId, active: true };
    if (userData.role === 'admin') userData.permissions = ['all'];
    if (!editingUserId && users.some(u => u.email === userForm.email)) return alert('E-mail já cadastrado.');
    await setDoc(getDocRef('users', userId), userData);
    setShowUserModal(false);
    setUserForm({ email: '', name: '', role: 'user', permissions: [] });
  };

  const handleEditUserClick = (user) => {
      setUserForm(user);
      setEditingUserId(user.id);
      setShowUserModal(true);
  };

  const removeUser = async (id) => { 
      if(window.confirm('Remover?')) await deleteDoc(getDocRef('users', id)); 
  };

  const toggleUserPermission = (toolKey) => {
    if (userForm.permissions.includes(toolKey)) {
        setUserForm({ ...userForm, permissions: userForm.permissions.filter(p => p !== toolKey) });
    } else {
        setUserForm({ ...userForm, permissions: [...userForm.permissions, toolKey] });
    }
  };

  const handleSaveLog = async (e) => {
      e.preventDefault();
      const logId = editingLogId || Date.now().toString();
      const logData = { ...newLog, id: logId };
      await setDoc(getDocRef('changelog', logId), logData);
      setEditingLogId(null);
      setNewLog({ version: '', date: '', title: '', content: '' });
  };

  const handleEditLogClick = (log) => {
      setNewLog(log);
      setEditingLogId(log.id);
  };

  const handleDeleteLog = async (id) => {
      if(window.confirm('Remover registro?')) await deleteDoc(getDocRef('changelog', id));
  };

  const handleCreateCustomTagInEditor = async (tagInput) => {
    if(!tagInput) return;
    const cleanId = tagInput.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const tagText = `${delimiters.prefix}${cleanId}${delimiters.suffix}`;
    const textarea = textAreaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      setHtmlContent(text.substring(0, start) + tagText + text.substring(end));
    }
    const currentModule = editingTemplate;
    const currentTags = tagsConfig[currentModule] || [];
    if (!currentTags.some(t => t.id === cleanId)) {
        const updatedTags = [...currentTags, { id: cleanId, label: cleanId.replace(/_/g, ' '), type: 'text' }];
        await setDoc(getDocRef('tags', currentModule), { list: updatedTags });
    }
  };

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

  // Session Handlers
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

  const onDragStart = (e, sessionId, tagIndex) => e.dataTransfer.setData("text/plain", JSON.stringify({ sessionId, tagIndex, module: tagModuleFilter }));
  const onDragOver = (e) => e.preventDefault();
  const onDrop = async (e, targetSessionId) => {
      e.preventDefault();
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data.module !== tagModuleFilter || data.sessionId === targetSessionId) return;

      const currentConfig = tagsConfig[tagModuleFilter];
      const sessions = JSON.parse(JSON.stringify(currentConfig.sessions));
      const sourceSession = sessions.find(s => s.id === data.sessionId);
      const targetSession = sessions.find(s => s.id === targetSessionId);

      if (sourceSession && targetSession) {
          const [movedTag] = sourceSession.tags.splice(data.tagIndex, 1);
          targetSession.tags.push(movedTag);
          await setDoc(getDocRef('tags', tagModuleFilter), { ...currentConfig, sessions });
      }
  };

  // Tools Handlers
  const handleSaveTool = async (e) => {
      e.preventDefault();
      const cleanId = toolForm.id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const newToolsConfig = { ...toolsConfig };
      if (isEditingTool && editingToolKey && editingToolKey !== cleanId) delete newToolsConfig[editingToolKey];
      newToolsConfig[cleanId] = { ...toolForm, icon: toolForm.icon || 'M13 10V3L4 14h7v7l9-11h-7z' };
      delete newToolsConfig[cleanId].id;
      await setDoc(getDocRef('settings', 'tools'), newToolsConfig);
      setShowToolModal(false); setToolForm({ id: '', label: '', desc: '', icon: '', active: true });
  };
  const prepareEditTool = (key, tool) => { setEditingToolKey(key); setToolForm({ id: key, ...tool }); setIsEditingTool(true); setShowToolModal(true); };
  const handleDeleteTool = async (key) => { if(window.confirm('Excluir?')) { const n = { ...toolsConfig }; delete n[key]; await setDoc(getDocRef('settings', 'tools'), n); }};

  const prepareEditTagInEditor = (tag) => { setEditorEditingTagId(tag.id); setEditorTagForm(tag); };
  const handleDeleteTagInEditor = (tagId) => { const currentSessions = tagsConfig[editingTemplate]?.sessions || []; let foundSessionId = null; let foundIndex = -1; for(let s of currentSessions) { const idx = s.tags.findIndex(t => t.id === tagId); if(idx !== -1) { foundSessionId = s.id; foundIndex = idx; break; } } if(foundSessionId) handleDeleteTag(foundSessionId, foundIndex, editingTemplate); };

  return (
    <div className="flex h-screen w-full bg-[#f0f4f8] overflow-hidden">
      <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col no-print">
        <div className="p-6 border-b border-slate-100"><h2 className="text-xl font-black text-[#002233]">Administração</h2></div>
        <nav className="flex-1 p-4 space-y-2">
            {['templates', 'tags', 'tools', 'users', 'changelog'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
            ))}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto p-8 bg-[#f0f4f8]">
        <div className="max-w-5xl mx-auto">
            {/* TEMPLATES */}
            {activeTab === 'templates' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-sm text-slate-500 mb-4">Importar / Editar</h3>
                        <div className="flex gap-4">
                            <select value={targetModule} onChange={(e) => setTargetModule(e.target.value)} className="border p-2 rounded text-sm w-1/3">
                                {getSortedTools(toolsConfig).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
                            </select>
                            <input type="file" accept=".html" onChange={handleFileUpload} className="text-sm"/>
                        </div>
                        {uploadStatus && <p className="text-xs font-bold text-blue-600 mt-2">{uploadStatus}</p>}
                    </div>
                    <div className="grid gap-3">{getSortedTools(toolsConfig).map(([key, tool]) => (<div key={key} className="bg-white p-4 rounded shadow flex justify-between items-center"><div><p className="font-bold text-sm">{tool.label}</p><p className="text-xs text-slate-400">{templates[key] ? 'Customizado' : 'Padrão'}</p></div><button onClick={() => handleEditTemplate(key)} className="bg-[#002233] text-white px-3 py-1 rounded text-xs">Editar HTML</button></div>))}</div>
                </div>
            )}
            
            {/* TAGS */}
            {activeTab === 'tags' && (
                <div className="flex gap-6 items-start h-full">
                     <div className="w-1/3 bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-4 max-h-full overflow-y-auto custom-scroll">
                        <div className="mb-6 border-b pb-4">
                            <label className="text-xs font-bold text-slate-500 block mb-2">Módulo</label>
                            <select value={tagModuleFilter} onChange={(e) => { setTagModuleFilter(e.target.value); setEditingTag(null); }} className="w-full border p-2 rounded text-sm mb-4">
                                {getSortedTools(toolsConfig).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
                            </select>
                            <label className="text-xs font-bold text-slate-500 block mb-2">Nova Sessão</label>
                            <div className="flex gap-2 mb-4"><input value={newSessionName} onChange={e => setNewSessionName(e.target.value)} className="w-full border p-2 rounded text-sm" placeholder="Nome da Sessão" /><button onClick={handleAddSession} className="bg-green-600 text-white px-3 rounded font-bold text-sm">+</button></div>
                            <label className="text-xs font-bold text-slate-500 block mb-2">Delimitadores</label>
                            <div className="flex gap-2 mb-2"><input value={tempDelimiters.prefix} onChange={e => setTempDelimiters({...tempDelimiters, prefix: e.target.value})} className="w-1/2 border p-1 rounded text-center" /><input value={tempDelimiters.suffix} onChange={e => setTempDelimiters({...tempDelimiters, suffix: e.target.value})} className="w-1/2 border p-1 rounded text-center" /></div>
                            <button onClick={handleSaveDelimiters} className="w-full bg-slate-200 text-xs py-1 rounded font-bold">Salvar Símbolos</button>
                        </div>
                        <form onSubmit={saveTag} className="space-y-3">
                            <h3 className="font-bold text-sm text-[#002233]">{editingTagId ? 'Editar Tag' : 'Nova Tag'}</h3>
                            <select value={tagForm.sessionId} onChange={e => setTagForm({...tagForm, sessionId: e.target.value})} className="w-full border p-2 rounded text-sm" required>
                                <option value="">Selecione a Sessão...</option>
                                {(tagsConfig[tagModuleFilter]?.sessions || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                            </select>
                            <input value={tagForm.id} onChange={e => setTagForm({...tagForm, id: e.target.value})} className="w-full border p-2 rounded text-sm uppercase" placeholder="ID (ex: NOME)" required />
                            <input value={tagForm.label} onChange={e => setTagForm({...tagForm, label: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="Rótulo" required />
                            <select value={tagForm.type} onChange={e => setTagForm({...tagForm, type: e.target.value})} className="w-full border p-2 rounded text-sm"><option value="text">Texto</option><option value="date">Data</option><option value="email">E-mail</option></select>
                            <div className="flex gap-2"><button type="submit" className="flex-1 bg-[#00DBFF] text-[#002233] font-bold py-2 rounded text-sm">{editingTagId ? 'Atualizar' : 'Adicionar'}</button>{editingTagId && <button type="button" onClick={() => { setEditingTag(null); setEditingTagId(null); setTagForm({id:'', label:'', type:'text', sessionId: ''}) }} className="px-3 bg-slate-200 rounded">X</button>}</div>
                        </form>
                     </div>
                     <div className="flex-1 space-y-4">
                         {(tagsConfig[tagModuleFilter]?.sessions || []).map((session) => (
                             <div key={session.id} className={`bg-white rounded-xl shadow-sm border ${session.active ? 'border-slate-200' : 'border-red-200 opacity-75'}`} onDragOver={onDragOver} onDrop={(e) => onDrop(e, session.id)}>
                                 <div className="p-3 bg-slate-50 border-b flex justify-between items-center rounded-t-xl">
                                     <div className="flex items-center gap-2"><button onClick={() => toggleSessionActive(session.id)} title="Ativar/Desativar" className={`w-3 h-3 rounded-full ${session.active ? 'bg-green-500' : 'bg-red-500'}`}></button><h4 className="font-bold text-sm text-slate-700">{session.title}</h4></div>
                                     <div className="flex gap-2"><button onClick={() => handleRenameSession(session.id)} className="text-blue-500 text-xs hover:underline">Renomear</button><button onClick={() => handleDeleteSession(session.id)} className="text-red-400 text-xs hover:underline">Excluir</button></div>
                                 </div>
                                 <div className="divide-y divide-slate-100 min-h-[40px]">
                                     {session.tags.map((tag, idx) => (
                                         <div key={idx} draggable onDragStart={(e) => onDragStart(e, session.id, idx)} className="p-3 flex justify-between items-center hover:bg-slate-50 cursor-move group">
                                             <div><span className="block text-xs font-mono text-blue-600 font-bold">{delimiters.prefix}{tag.id}{delimiters.suffix}</span><span className="block text-xs text-slate-600">{tag.label}</span></div>
                                             <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleEditTagClick(tag, session.id, idx)} className="text-blue-500 text-xs font-bold">Editar</button><button onClick={() => handleDeleteTag(session.id, idx)} className="text-red-500 text-xs font-bold">Excluir</button></div>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         ))}
                     </div>
                </div>
            )}
            
            {/* TOOLS */}
            {activeTab === 'tools' && (
                <div className="space-y-6">
                    <button onClick={() => { setIsEditingTool(false); setToolForm({ id: '', label: '', desc: '', icon: '', active: true }); setShowToolModal(true); }} className="bg-[#00DBFF] text-[#002233] px-4 py-2 rounded font-bold text-sm">+ Novo Gerador</button>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {getSortedTools(toolsConfig).map(([key, tool]) => (
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
};

// ============================================================================
// 7. APP ROOT
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

  // RESTAURA SESSÃO DO LOCALSTORAGE
  useEffect(() => {
    const session = localStorage.getItem('core_session_user');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        setUser(parsed);
      } catch (e) { localStorage.removeItem('core_session_user'); }
    }
  }, []);

  // PERSISTE SESSÃO NO LOCALSTORAGE
  useEffect(() => {
    if (user) localStorage.setItem('core_session_user', JSON.stringify(user));
    else localStorage.removeItem('core_session_user');
  }, [user]);

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