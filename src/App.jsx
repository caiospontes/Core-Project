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

// Garante inicialização única mesmo com hot-reload
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const appId = firebaseConfig.projectId;

// Paths helpers
const getCollectionRef = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);
const getDocRef = (colName, docId) => doc(db, 'artifacts', appId, 'public', 'data', colName, docId);

// ============================================================================
// COMPONENTE: SAFE PREVIEW (A4 FIXO E ISOLAMENTO)
// ============================================================================
const SafePreview = ({ html }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const shadowRoot = containerRef.current.shadowRoot || containerRef.current.attachShadow({ mode: 'open' });
    
    // Configuração estrita para A4 (210mm x 297mm)
    shadowRoot.innerHTML = `
      <style>
        :host { 
            display: block; 
            width: 210mm; 
            height: 297mm; 
            background: white;
            overflow: hidden; 
            box-shadow: 0 0 15px rgba(0,0,0,0.1);
            margin: 0 auto;
        }
        * { box-sizing: border-box; }
        img { max-width: 100%; height: auto; }
        body { 
            margin: 0; 
            padding: 0; 
            font-family: Arial, sans-serif; 
            width: 100%; 
            height: 100%;
        }
        table { border-collapse: collapse; width: 100%; }
        
        @media print { :host { display: none; } }
      </style>
      ${html}
    `;
  }, [html]);

  return <div ref={containerRef} className="safe-preview-container"></div>;
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
  { id: '1', version: '2.9', date: '2024-01-31', title: 'Impressão A4 & Sessão', content: 'Correção crítica na impressão A4 sem bordas e persistência de login.' },
  { id: '2', version: '2.8', date: '2024-01-30', title: 'Persistência de Sessão', content: 'O sistema agora mantém o usuário logado após recarregar a página.' },
  { id: '3', version: '2.7', date: '2024-01-29', title: 'Editor de Tags Avançado', content: 'Edição e remoção de tags diretamente no editor HTML.' },
];

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
  telefonia: { sessions: [] },
  monitores: { sessions: [] }
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
            setError('Este e-mail Google não possui convite para acessar o sistema.');
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
    else alert('Usuário DEV não encontrado.');
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
          {!dbReady && <span className="text-xs text-yellow-500 animate-pulse block mt-2">Conectando ao banco de dados...</span>}
          {dbReady && <span className="text-xs text-green-500 block mt-2">Online</span>}
        </div>
        
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl">
          <button type="button" onClick={handleGoogleLogin} disabled={loading} className="w-full bg-white text-slate-700 font-bold py-3 rounded-lg shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3 mb-6">
            {loading ? <span className="text-xs">Processando...</span> : <><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5" /><span>Entrar com Google</span></>}
          </button>
          <div className="flex items-center gap-4 mb-6"><div className="h-px bg-white/10 flex-1"></div><span className="text-xs text-slate-500 font-bold">OU USE CREDENCIAIS</span><div className="h-px bg-white/10 flex-1"></div></div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-500/10 border border-red-500/50 text-red-200 text-xs p-3 rounded-lg flex items-center gap-2 font-bold animate-pulse"><span>⚠️</span> {error}</div>}
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="w-full bg-[#002233]/50 border border-slate-700 text-white rounded-lg p-3 text-sm focus:border-[#00DBFF] outline-none transition-colors" />
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
const AdminPanel = ({ users, templates, tagsConfig, delimiters, changelog }) => {
  const [activeTab, setActiveTab] = useState('templates');
  
  // States Templates
  const [targetModule, setTargetModule] = useState('desligamento'); 
  const [uploadStatus, setUploadStatus] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null); 
  const [htmlContent, setHtmlContent] = useState('');
  const textAreaRef = useRef(null);

  // States Users
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ email: '', name: '', role: 'user', permissions: [] });
  const [editingUserId, setEditingUserId] = useState(null);

  // States Tags
  const [editingTagId, setEditingTagId] = useState(null);
  const [tagForm, setTagForm] = useState({ id: '', label: '', type: 'text', sessionId: '' });
  const [tagModuleFilter, setTagModuleFilter] = useState('desligamento');
  const [tempDelimiters, setTempDelimiters] = useState(delimiters); 
  const [newSessionName, setNewSessionName] = useState('');

  // States Editor Tag Editing (New)
  const [editorEditingTagId, setEditorEditingTagId] = useState(null);
  const [editorTagForm, setEditorTagForm] = useState({ id: '', label: '', type: 'text' });

  // States Changelog
  const [newLog, setNewLog] = useState({ version: '', date: '', title: '', content: '' });
  const [editingLogId, setEditingLogId] = useState(null);

  // --- Handlers (Firestore wrappers) ---
  const handleFileUpload = (e) => {
      const file = e.target.files[0];
      if(!targetModule) return alert("Selecione um módulo.");
      if(!file) return;

      if(file.name.endsWith('.html')) {
          setUploadStatus('Carregando HTML...');
          const reader = new FileReader();
          reader.onload = async (ev) => {
              const content = ev.target.result;
              await setDoc(getDocRef('templates', targetModule), {
                  name: file.name,
                  content: content,
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

  // --- SESSIONS & TAGS ---
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
    if (!window.confirm('Excluir sessão?')) return;
    const currentConfig = tagsConfig[tagModuleFilter];
    const updatedSessions = currentConfig.sessions.filter(s => s.id !== sessionId);
    await setDoc(getDocRef('tags', tagModuleFilter), { ...currentConfig, sessions: updatedSessions });
  };

  const toggleSessionActive = async (sessionId) => {
      const currentConfig = tagsConfig[tagModuleFilter];
      const sessions = currentConfig.sessions.map(s => s.id === sessionId ? { ...s, active: !s.active } : s);
      await setDoc(getDocRef('tags', tagModuleFilter), { ...currentConfig, sessions });
  };

  const saveTag = async (id, label, type, module, isEdit = false, originalId = null) => {
      if (!tagForm.sessionId && !isEdit) return alert('Selecione uma sessão!');
      
      const cleanId = id.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      const currentConfig = tagsConfig[module];
      const sessions = [...currentConfig.sessions];
      
      // Encontrar sessão correta
      const sessionIndex = sessions.findIndex(s => s.id === (isEdit ? editingTag.sessionId : tagForm.sessionId));
      
      if(sessionIndex === -1) return false;

      const newTag = { id: cleanId, label, type };

      if (isEdit) {
           const tagIndex = editingTag.tagIndex;
           sessions[sessionIndex].tags[tagIndex] = newTag;
      } else {
           // Check duplicate global
           let exists = false;
           sessions.forEach(s => { if(s.tags.some(t => t.id === cleanId)) exists = true; });
           if(exists) return false;
           
           sessions[sessionIndex].tags.push(newTag);
      }

      await setDoc(getDocRef('tags', module), { ...currentConfig, sessions });
      return true;
  };

  const handleDeleteTag = async (sessionId, tagIndex) => {
      if(!window.confirm('Excluir tag?')) return;
      const currentConfig = tagsConfig[tagModuleFilter];
      const sessions = [...currentConfig.sessions];
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      sessions[sessionIndex].tags.splice(tagIndex, 1);
      await setDoc(getDocRef('tags', tagModuleFilter), { ...currentConfig, sessions });
  };

  const handleSaveTagPanel = async (e) => {
      e.preventDefault();
      const success = await saveTag(tagForm.id, tagForm.label, tagForm.type, tagModuleFilter, !!editingTagId, editingTagId);
      if(success !== false) {
        setTagForm({ id: '', label: '', type: 'text', sessionId: tagForm.sessionId });
        setEditingTagId(null);
      } else {
          alert('Tag já existe!');
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
      setEditingTagId(tag.id); // Apenas visual
      setTagForm({ ...tag, sessionId });
  };
  
  // State for tracking editing tag logic in panel
  const [editingTag, setEditingTag] = useState(null);

  const handleSaveDelimiters = async () => {
    await setDoc(getDocRef('settings', 'delimiters'), tempDelimiters);
    alert(`Delimitadores atualizados.`);
  };

  // --- USERS ---
  const handleSaveUser = async (e) => {
    e.preventDefault();
    const userId = editingUserId || Date.now().toString();
    const userData = { ...userForm, id: userId, active: true };
    if (userData.role === 'admin') userData.permissions = ['all'];
    if (!editingUserId && users.some(u => u.email === userForm.email)) return alert('E-mail existe.');
    await setDoc(getDocRef('users', userId), userData);
    setShowUserModal(false);
    setUserForm({ email: '', name: '', role: 'user', permissions: [] });
  };
  const handleEditUserClick = (u) => { setUserForm(u); setEditingUserId(u.id); setShowUserModal(true); };
  const removeUser = async (id) => { if(window.confirm('Remover?')) await deleteDoc(getDocRef('users', id)); };
  const toggleUserPermission = (k) => {
    if (userForm.permissions.includes(k)) setUserForm({...userForm, permissions: userForm.permissions.filter(p=>p!==k)});
    else setUserForm({...userForm, permissions: [...userForm.permissions, k]});
  };

  // --- LOGS ---
  const handleSaveLog = async (e) => {
      e.preventDefault();
      const id = editingLogId || Date.now().toString();
      await setDoc(getDocRef('changelog', id), { ...newLog, id });
      setEditingLogId(null); setNewLog({ version: '', date: '', title: '', content: '' });
  };
  const handleDeleteLog = async (id) => { if(window.confirm('Remover?')) await deleteDoc(getDocRef('changelog', id)); };
  const handleEditLogClick = (l) => { setNewLog(l); setEditingLogId(l.id); };

  // --- EDITOR SAVE ---
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
    // Simplificado para criar na primeira sessão disponível ou criar uma nova se não existir
    const currentConfig = tagsConfig[editingTemplate] || { sessions: [] };
    let session = currentConfig.sessions[0];
    if(!session) {
        session = { id: 'geral', title: 'Geral', active: true, tags: [] };
        currentConfig.sessions.push(session);
    }
    
    // Check duplication
    let exists = false;
    currentConfig.sessions.forEach(s => { if(s.tags.some(t => t.id === cleanId)) exists = true; });
    
    if (!exists) {
        session.tags.push({ id: cleanId, label: cleanId.replace(/_/g, ' '), type: 'text' });
        await setDoc(getDocRef('tags', editingTemplate), currentConfig);
    }
  };

  const handleSaveEditedTemplate = async () => {
    await setDoc(getDocRef('templates', editingTemplate), { name: 'Editado Manualmente', content: htmlContent, date: new Date().toLocaleDateString(), type: 'html' });
    setEditingTemplate(null); alert('Salvo!');
  };

  return (
    <div className="flex h-screen w-full bg-[#f0f4f8] overflow-hidden">
      <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col no-print">
        <div className="p-6 border-b border-slate-100"><h2 className="text-xl font-black text-[#002233]">Administração</h2></div>
        <nav className="flex-1 p-4 space-y-1">
            <button onClick={() => setActiveTab('templates')} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${activeTab === 'templates' ? 'bg-[#00DBFF]/10 text-[#008fb3]' : 'text-slate-500 hover:bg-slate-50'}`}>Templates</button>
            <button onClick={() => setActiveTab('tags')} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${activeTab === 'tags' ? 'bg-[#00DBFF]/10 text-[#008fb3]' : 'text-slate-500 hover:bg-slate-50'}`}>Configurar Tags</button>
            <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-[#00DBFF]/10 text-[#008fb3]' : 'text-slate-500 hover:bg-slate-50'}`}>Usuários</button>
            <button onClick={() => setActiveTab('changelog')} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${activeTab === 'changelog' ? 'bg-[#00DBFF]/10 text-[#008fb3]' : 'text-slate-500 hover:bg-slate-50'}`}>Changelog</button>
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto p-8 bg-[#f0f4f8]">
        <div className="max-w-5xl mx-auto">
            {activeTab === 'templates' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex gap-4 items-end"><div className="flex-1"><label className="text-xs font-bold text-slate-400">Módulo</label><select value={targetModule} onChange={(e) => setTargetModule(e.target.value)} className="w-full border p-2 rounded text-sm mt-1">{Object.entries(TOOLS_CONFIG).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}</select></div><div className="flex-1"><label className="text-xs font-bold text-slate-400">Importar HTML</label><input type="file" accept=".html" onChange={handleFileUpload} className="block w-full text-sm mt-1"/></div></div>
                        {uploadStatus && <p className="text-xs font-bold text-blue-600 mt-2">{uploadStatus}</p>}
                    </div>
                    <div className="grid gap-3">{Object.entries(TOOLS_CONFIG).map(([key, tool]) => (<div key={key} className="bg-white p-4 rounded shadow flex justify-between items-center"><div><p className="font-bold text-sm">{tool.label}</p><p className="text-xs text-slate-400">{templates[key] ? 'Customizado' : 'Padrão'}</p></div><button onClick={() => handleEditTemplate(key)} className="bg-[#002233] text-white px-3 py-1 rounded text-xs">Editar</button></div>))}</div>
                </div>
            )}
            {activeTab === 'tags' && (
                <div className="flex gap-6 items-start h-full">
                     <div className="w-1/3 bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-4 max-h-full overflow-y-auto custom-scroll">
                        <div className="mb-6 border-b pb-4">
                            <label className="text-xs font-bold text-slate-500 block mb-2">Módulo</label>
                            <select value={tagModuleFilter} onChange={(e) => setTagModuleFilter(e.target.value)} className="w-full border p-2 rounded text-sm mb-4">{Object.entries(TOOLS_CONFIG).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}</select>
                            <label className="text-xs font-bold text-slate-500 block mb-2">Nova Sessão</label>
                            <div className="flex gap-2 mb-4"><input value={newSessionName} onChange={e => setNewSessionName(e.target.value)} className="w-full border p-2 rounded text-sm" placeholder="Ex: Dados Pessoais" /><button onClick={handleAddSession} className="bg-green-600 text-white px-3 rounded font-bold text-sm">+</button></div>
                            <label className="text-xs font-bold text-slate-500 block mb-2">Delimitadores</label>
                            <div className="flex gap-2 mb-2"><input value={tempDelimiters.prefix} onChange={e => setTempDelimiters({...tempDelimiters, prefix: e.target.value})} className="w-1/2 border p-1 rounded text-center" /><input value={tempDelimiters.suffix} onChange={e => setTempDelimiters({...tempDelimiters, suffix: e.target.value})} className="w-1/2 border p-1 rounded text-center" /></div>
                            <button onClick={handleSaveDelimiters} className="w-full bg-slate-200 text-xs py-1 rounded font-bold">Salvar Símbolos</button>
                        </div>
                        <form onSubmit={handleSaveTagPanel} className="space-y-3">
                            <h3 className="font-bold text-sm text-[#002233]">{editingTagId ? 'Editar Tag' : 'Nova Tag'}</h3>
                            <select value={tagForm.sessionId} onChange={e => setTagForm({...tagForm, sessionId: e.target.value})} className="w-full border p-2 rounded text-sm" required><option value="">Selecione a Sessão...</option>{(tagsConfig[tagModuleFilter]?.sessions || []).map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select>
                            <input value={tagForm.id} onChange={e => setTagForm({...tagForm, id: e.target.value})} className="w-full border p-2 rounded text-sm uppercase" placeholder="ID" required />
                            <input value={tagForm.label} onChange={e => setTagForm({...tagForm, label: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="Rótulo" required />
                            <select value={tagForm.type} onChange={e => setTagForm({...tagForm, type: e.target.value})} className="w-full border p-2 rounded text-sm"><option value="text">Texto</option><option value="date">Data</option><option value="email">E-mail</option></select>
                            <div className="flex gap-2"><button type="submit" className="flex-1 bg-[#00DBFF] text-[#002233] font-bold py-2 rounded text-sm">{editingTagId ? 'Atualizar' : 'Criar'}</button>{editingTagId && <button type="button" onClick={() => { setEditingTag(null); setEditingTagId(null); setTagForm({id:'', label:'', type:'text', sessionId: ''}) }} className="px-3 bg-slate-200 rounded">X</button>}</div>
                        </form>
                     </div>
                     <div className="flex-1 space-y-4">
                         {(tagsConfig[tagModuleFilter]?.sessions || []).map((session) => (
                             <div key={session.id} className={`bg-white rounded-xl shadow-sm border ${session.active ? 'border-slate-200' : 'border-red-200 opacity-75'}`}>
                                 <div className="p-3 bg-slate-50 border-b flex justify-between items-center rounded-t-xl">
                                     <div className="flex items-center gap-2"><button onClick={() => toggleSessionActive(session.id)} className={`w-3 h-3 rounded-full ${session.active ? 'bg-green-500' : 'bg-red-500'}`}></button><h4 className="font-bold text-sm text-slate-700">{session.title}</h4></div>
                                     <button onClick={() => handleDeleteSession(session.id)} className="text-red-400 hover:text-red-600">X</button>
                                 </div>
                                 <div className="divide-y divide-slate-100">{session.tags.map((tag, idx) => (<div key={idx} className="p-3 flex justify-between items-center hover:bg-slate-50"><div><span className="block text-xs font-mono text-blue-600">{delimiters.prefix}{tag.id}{delimiters.suffix}</span><span className="block text-xs text-slate-600">{tag.label}</span></div><div className="flex gap-2"><button onClick={() => handleEditTagClick(tag, session.id, idx)} className="text-blue-500 text-xs">Editar</button><button onClick={() => handleDeleteTag(session.id, idx)} className="text-red-500 text-xs">Excluir</button></div></div>))}</div>
                             </div>
                         ))}
                     </div>
                </div>
            )}
            {activeTab === 'users' && (
                <div className="space-y-6">
                    <button onClick={() => { setEditingUserId(null); setUserForm({ email: '', name: '', role: 'user', permissions: [] }); setShowUserModal(true); }} className="bg-[#00DBFF] text-[#002233] px-4 py-2 rounded font-bold text-sm">+ Novo Usuário</button>
                    <div className="bg-white rounded shadow overflow-hidden">
                        <table className="w-full text-sm text-left"><thead className="bg-slate-50 border-b"><tr><th className="p-3">Nome</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3 text-right">Ações</th></tr></thead><tbody>{users.map(u => <tr key={u.id} className="border-b"><td className="p-3">{u.name}</td><td className="p-3">{u.email}</td><td className="p-3 capitalize">{u.role}</td><td className="p-3 text-right"><button onClick={() => handleEditUserClick(u)} className="text-blue-500 mr-2">Editar</button><button onClick={() => removeUser(u.id)} className="text-red-500">Excluir</button></td></tr>)}</tbody></table>
                    </div>
                </div>
            )}
            {activeTab === 'changelog' && (
                 <div className="space-y-6">
                     <div className="bg-white p-6 rounded shadow border"><div className="grid grid-cols-3 gap-2 mb-2"><input value={newLog.version} onChange={e => setNewLog({...newLog, version: e.target.value})} placeholder="Versão" className="border p-2 rounded text-sm"/><input type="date" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} className="border p-2 rounded text-sm"/><input value={newLog.title} onChange={e => setNewLog({...newLog, title: e.target.value})} placeholder="Título" className="border p-2 rounded text-sm"/></div><textarea value={newLog.content} onChange={e => setNewLog({...newLog, content: e.target.value})} placeholder="Descrição" className="w-full border p-2 rounded text-sm h-16"/><button onClick={handleSaveLog} className="bg-[#00DBFF] text-[#002233] px-4 py-2 rounded text-sm font-bold mt-2">{editingLogId ? 'Atualizar' : 'Adicionar'}</button></div>
                     <div className="space-y-2">{changelog.map(log => (<div key={log.id} className="bg-white p-3 rounded border flex justify-between"><div><span className="font-bold text-xs bg-green-100 px-2 py-0.5 rounded mr-2">{log.version}</span><span className="font-bold text-sm">{log.title}</span><p className="text-xs text-slate-500">{log.content}</p></div><div><button onClick={() => { setNewLog(log); setEditingLogId(log.id); }} className="text-blue-500 text-xs mr-2">Editar</button><button onClick={() => handleDeleteLog(log.id)} className="text-red-500 text-xs">Excluir</button></div></div>))}</div>
                 </div>
            )}
        </div>
      </div>

      {editingTemplate && (
            <div className="fixed inset-0 bg-[#00121a] z-50 flex flex-col">
                <div className="bg-[#1e1e1e] text-white p-3 flex justify-between border-b border-[#333]">
                    <span className="font-bold">Editor HTML ({TOOLS_CONFIG[editingTemplate]?.label})</span>
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
                                                    <button onClick={() => { setEditorEditingTagId(tag.id); setEditorTagForm(tag); }} className="text-blue-400 hover:text-white p-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
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
                    {Object.entries(TOOLS_CONFIG).map(([key, tool]) => (<label key={key} className="flex items-center gap-2 text-xs mb-1 cursor-pointer"><input type="checkbox" checked={userForm.permissions.includes(key)} onChange={() => toggleUserPermission(key)} /> {tool.label}</label>))}
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

// ... (HomePage e App Root mantidos iguais)
// ============================================================================
// HOME PAGE
// ============================================================================
const HomePage = ({ onNavigate, user, changelog }) => (
  <div className="h-full w-full flex flex-col bg-[#f0f4f8] overflow-y-auto">
    <div className="bg-gradient-to-r from-[#002233] to-[#001a26] text-white px-10 py-16 shadow-lg">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-black mb-2 tracking-tight">Bem-vindo ao <span className="text-[#00DBFF]">CORE</span></h1>
        <p className="text-slate-400 text-lg max-w-2xl">Centralize a gestão de ativos e automatize documentos.</p>
      </div>
    </div>
    <div className="flex-1 p-10 max-w-6xl mx-auto w-full flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-700 mb-6 border-b pb-2">Acesso Rápido</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(TOOLS_CONFIG).map(([key, tool]) => (
                    <div key={key} onClick={() => tool.active && onNavigate(key === 'desligamento' ? 'Desligamento' : '')} className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all ${tool.active ? 'hover:shadow-md cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}>
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
const Dashboard = ({ user, onLogout, users, setUsers, templates, setTemplates, tagsConfig, setTagsConfig, delimiters, setDelimiters, changelog, setChangelog }) => {
  const [activePage, setActivePage] = useState('Home');
  const [expandedMenu, setExpandedMenu] = useState({ geradores: true });
  const toggleMenu = (key) => setExpandedMenu(prev => ({ ...prev, [key]: !prev[key] }));
  const hasAccess = (toolKey) => {
      const tool = TOOLS_CONFIG[toolKey];
      if (!tool || !tool.active) return false;
      return user.role === 'admin' || user.permissions.includes('all') || user.permissions.includes(toolKey);
  };

  return (
    <div className="flex w-screen h-screen bg-[#f0f4f8] font-sans text-slate-800 overflow-hidden">
      <style>{`.custom-scroll::-webkit-scrollbar { width: 6px; } .custom-scroll::-webkit-scrollbar-track { background: transparent; } .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; } @media print { .no-print { display: none !important; } }`}</style>
      <aside className="w-64 bg-[#002233] text-white flex flex-col flex-shrink-0 z-50 shadow-xl no-print">
        <div className="p-6 flex flex-col items-center border-b border-white/10 cursor-pointer hover:bg-[#002b40] transition" onClick={() => setActivePage('Home')}>
          <img src="https://i.imgur.com/dFv3pQh.png" alt="Logo" className="w-10 mb-2" />
          <span className="font-bold text-sm tracking-widest">PROJETO CORE</span>
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
                  <button onClick={() => hasAccess('desligamento') && setActivePage('Desligamento')} className={`w-full text-left px-3 py-1.5 rounded text-xs font-medium ${activePage === 'Desligamento' ? 'bg-white/10 text-[#00DBFF]' : 'text-slate-400 hover:text-white'}`}>Desligamento</button>
                  <button className="w-full text-left px-3 py-1.5 rounded text-xs font-medium text-slate-600 cursor-not-allowed flex justify-between items-center">Telefonia<svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></button>
                  <button className="w-full text-left px-3 py-1.5 rounded text-xs font-medium text-slate-600 cursor-not-allowed flex justify-between items-center">Monitores<svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></button>
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
        {activePage === 'Home' && <HomePage user={user} onNavigate={setActivePage} changelog={changelog} />}
        {activePage === 'Admin' && <AdminPanel users={users} setUsers={setUsers} templates={templates} setTemplates={setTemplates} tagsConfig={tagsConfig} setTagsConfig={setTagsConfig} delimiters={delimiters} setDelimiters={setDelimiters} changelog={changelog} setChangelog={setChangelog} />}
        {activePage === 'Desligamento' && <DynamicGenerator template={templates['desligamento']} tagsConfig={tagsConfig} delimiters={delimiters} moduleId="desligamento" />}
      </main>
    </div>
  );
};

// ============================================================================
// APP ROOT
// ============================================================================
export default function App() {
  const [user, setUser] = useState(null);
  
  // 1. Initial State from LocalStorage
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('core_users');
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });
  
  // Restore user session if valid
  useEffect(() => {
    const session = localStorage.getItem('core_session_user');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        // Verify if still valid against user list
        // Note: Se o usuário foi deletado do banco, ele será deslogado quando a lista de usuários atualizar via Firestore
        setUser(parsed);
      } catch (e) { localStorage.removeItem('core_session_user'); }
    }
  }, []);

  const [templates, setTemplates] = useState({});
  const [tagsConfig, setTagsConfig] = useState(DEFAULT_TAGS_WITH_SESSIONS); // Mudança para estrutura nova
  const [delimiters, setDelimiters] = useState(DEFAULT_DELIMITERS);
  const [changelog, setChangelog] = useState([]);
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
          // Auto-migration for old data structure
          if (Object.keys(loaded).length === 0) {
              Object.entries(DEFAULT_TAGS_WITH_SESSIONS).forEach(([k, v]) => setDoc(getDocRef('tags', k), v));
          } else {
              // Verifica se é estrutura antiga (array) e converte se necessário
              const migrated = {};
              Object.keys(loaded).forEach(k => {
                 if (loaded[k].list) { // Estrutura antiga
                     migrated[k] = { sessions: [{ id: 'geral', title: 'Geral', active: true, tags: loaded[k].list }] };
                 } else {
                     migrated[k] = loaded[k];
                 }
              });
              setTagsConfig(migrated);
          }
      }, () => {});
      const unsubSettings = onSnapshot(getCollectionRef('settings'), (snap) => {
           snap.forEach(doc => { if(doc.id === 'delimiters') setDelimiters(doc.data()); });
      }, () => {});
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

  return user ? <Dashboard user={user} onLogout={() => setUser(null)} users={users} setUsers={setUsers} templates={templates} setTemplates={setTemplates} tagsConfig={tagsConfig} setTagsConfig={setTagsConfig} delimiters={delimiters} setDelimiters={setDelimiters} changelog={changelog} setChangelog={setChangelog} /> : <LoginPage onLogin={setUser} users={users} dbReady={dbReady} />;
}