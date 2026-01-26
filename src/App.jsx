import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
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
// CONFIGURAÇÃO FIREBASE
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = firebaseConfig.projectId;

// Paths
const getCollectionRef = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);
const getDocRef = (colName, docId) => doc(db, 'artifacts', appId, 'public', 'data', colName, docId);

// ============================================================================
// DADOS PADRÃO (Seeds)
// ============================================================================

const DEFAULT_USERS = [
  { id: '1', email: 'admin@totvs.com.br', name: 'Administrador', role: 'admin', permissions: ['all'], active: true },
  { id: '2', email: 'dev@core.teste', name: 'Desenvolvedor', role: 'admin', permissions: ['all'], active: true }
];

const DEFAULT_DELIMITERS = { prefix: '<<', suffix: '>>' };

const DEFAULT_CHANGELOG = [
  { id: '1', version: '2.6', date: '2024-01-28', title: 'Integração Firebase', content: 'Login Google e Banco de Dados ativados.' },
  { id: '2', version: '2.5', date: '2024-01-27', title: 'Gestão Completa', content: 'Painel administrativo e editor de templates.' },
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

const DEFAULT_TAGS_BY_MODULE = {
  desligamento: [
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
  ],
  telefonia: [
    { id: 'LINHA', label: 'Número da Linha', type: 'text' },
    { id: 'OPERADORA', label: 'Operadora', type: 'text' },
  ],
  monitores: [
    { id: 'PATRIMONIO', label: 'Patrimônio', type: 'text' },
  ]
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

  // Login com E-mail/Senha (Simulado)
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
      // 1. Verificação Estrita de Existência (Convite)
      const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!foundUser) {
        setError('Acesso negado. Este e-mail não possui um convite ativo.');
        setLoading(false);
        return;
      }

      // 2. Verificação de Status da Conta
      if (!foundUser.active) {
        setError('Sua conta foi desativada pelo administrador.');
        setLoading(false);
        return;
      }

      // 3. Verificação de Domínio (Camada extra de segurança)
      if (!email.toLowerCase().endsWith('@totvs.com.br') && !email.includes('core.teste')) {
        setError('Domínio não autorizado. Use seu e-mail corporativo @totvs.com.br');
        setLoading(false);
        return;
      }

      // Login bem sucedido
      onLogin(foundUser);
      setLoading(false);
    }, 800);
  };

  // Login com Google
  const handleGoogleLogin = async () => {
    if (!dbReady) return alert('Aguarde a conexão com o sistema.');
    
    const provider = new GoogleAuthProvider();
    setLoading(true);
    setError('');

    try {
        const result = await signInWithPopup(auth, provider);
        const googleUser = result.user;
        
        // Verifica se o e-mail do Google está na lista de usuários permitidos (Convite)
        const foundUser = users.find(u => u.email.toLowerCase() === googleUser.email.toLowerCase());

        if (foundUser) {
            if (!foundUser.active) {
                setError('Sua conta foi desativada pelo administrador.');
                await signOut(auth); // Desloga se não tiver permissão no app
                // Re-conecta anonimamente para manter leitura do banco
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
    if (!dbReady) {
       alert("Aguarde a conexão com o banco de dados...");
       return;
    }
    const devUser = users.find(u => u.email === 'dev@core.teste');
    if (devUser) onLogin(devUser);
    else alert('Usuário DEV não encontrado no banco de dados. Certifique-se de que a inicialização do DB ocorreu.');
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
          
          {/* LOGIN COM GOOGLE */}
          <button 
            type="button" 
            onClick={handleGoogleLogin} 
            disabled={loading}
            className="w-full bg-white text-slate-700 font-bold py-3 rounded-lg shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3 mb-6"
          >
            {loading ? (
                <span className="text-xs">Processando...</span>
            ) : (
                <>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-5 h-5" />
                    <span>Entrar com Google</span>
                </>
            )}
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-xs text-slate-500 font-bold">OU USE CREDENCIAIS</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-500/10 border border-red-500/50 text-red-200 text-xs p-3 rounded-lg flex items-center gap-2 font-bold animate-pulse"><span>⚠️</span> {error}</div>}
            
            <div>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="w-full bg-[#002233]/50 border border-slate-700 text-white rounded-lg p-3 text-sm focus:border-[#00DBFF] outline-none" />
            </div>
            
            <div>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" className="w-full bg-[#002233]/50 border border-slate-700 text-white rounded-lg p-3 text-sm focus:border-[#00DBFF] outline-none" />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-[#002233] border border-[#00DBFF]/30 text-[#00DBFF] font-bold py-3 rounded-lg hover:bg-[#00DBFF] hover:text-[#002233] transition-all text-sm">
                Entrar
            </button>
            
            <div className="pt-2 text-center">
                <button type="button" onClick={handleDevLogin} className="text-[10px] text-slate-600 hover:text-white transition-colors">
                 Desenvolvedor (Offline/Local)
                </button>
            </div>
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
  const [tagForm, setTagForm] = useState({ id: '', label: '', type: 'text' });
  const [tagModuleFilter, setTagModuleFilter] = useState('desligamento');
  const [tempDelimiters, setTempDelimiters] = useState(delimiters); 

  // States Changelog
  const [newLog, setNewLog] = useState({ version: '', date: '', title: '', content: '' });
  const [editingLogId, setEditingLogId] = useState(null);

  // --- TEMPLATE & EDITOR ---
  const handleFileUpload = (e) => {
      const file = e.target.files[0];
      if(!targetModule) return alert("Selecione um módulo primeiro.");
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
              setUploadStatus('Sucesso! HTML carregado e salvo na nuvem.');
          };
          reader.readAsText(file);
      } else {
          setUploadStatus('Erro: Apenas arquivos .html são permitidos.');
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

  // --- GESTÃO DE TAGS (Firestore) ---
  const saveTag = async (id, label, type, module, isEdit = false, originalId = null) => {
      const cleanId = id.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      const currentTags = tagsConfig[module] || [];

      if (!isEdit && currentTags.some(t => t.id === cleanId)) return false;

      let updatedTags = [...currentTags];
      if (isEdit && originalId) {
           updatedTags = updatedTags.map(t => t.id === originalId ? { id: cleanId, label, type } : t);
      } else {
           updatedTags.push({ id: cleanId, label, type });
      }

      await setDoc(getDocRef('tags', module), { list: updatedTags });
      return true;
  };

  const handleDeleteTag = async (id, module) => {
      if(window.confirm('Excluir esta tag?')) {
          const updatedTags = (tagsConfig[module] || []).filter(t => t.id !== id);
          await setDoc(getDocRef('tags', module), { list: updatedTags });
      }
  };

  const handleSaveTagPanel = async (e) => {
      e.preventDefault();
      const success = await saveTag(tagForm.id, tagForm.label, tagForm.type, tagModuleFilter, !!editingTagId, editingTagId);
      if(success !== false) {
        setTagForm({ id: '', label: '', type: 'text' });
        setEditingTagId(null);
      } else {
          alert('Tag já existe!');
      }
  };

  const handleEditTagClick = (tag) => {
      setEditingTagId(tag.id);
      setTagForm(tag);
  };

  const handleSaveDelimiters = async () => {
    await setDoc(getDocRef('settings', 'delimiters'), tempDelimiters);
    alert(`Delimitadores atualizados para: ${tempDelimiters.prefix}TAG${tempDelimiters.suffix}`);
  };

  // --- GESTÃO DE USUÁRIOS (Firestore) ---
  const handleSaveUser = async (e) => {
    e.preventDefault();
    const userId = editingUserId || Date.now().toString();
    const userData = { ...userForm, id: userId, active: true };
    if (userData.role === 'admin') userData.permissions = ['all'];

    if (!editingUserId && users.some(u => u.email === userForm.email)) {
        return alert('E-mail já cadastrado.');
    }

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

  // --- CHANGELOG (Firestore) ---
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

  // --- EDITOR SAVE ---
  const handleCreateCustomTagInEditor = async (tagInput) => {
    if(!tagInput) return;
    const cleanId = tagInput.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    
    // Inserir no editor
    const tagText = `${delimiters.prefix}${cleanId}${delimiters.suffix}`;
    const textarea = textAreaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      setHtmlContent(text.substring(0, start) + tagText + text.substring(end));
    }

    // Salvar na configuração de tags
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
    alert('Template salvo no Firebase!');
  };

  return (
    <div className="flex h-screen w-full bg-[#f0f4f8] overflow-hidden">
      {/* ADMIN SIDEBAR */}
      <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col no-print">
        <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-black text-[#002233]">Administração</h2>
            <p className="text-xs text-slate-400">Painel de Controle</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
            <button onClick={() => setActiveTab('templates')} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${activeTab === 'templates' ? 'bg-[#00DBFF]/10 text-[#008fb3]' : 'text-slate-500 hover:bg-slate-50'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Templates
            </button>
            <button onClick={() => setActiveTab('tags')} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${activeTab === 'tags' ? 'bg-[#00DBFF]/10 text-[#008fb3]' : 'text-slate-500 hover:bg-slate-50'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                Configurar Tags
            </button>
            <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-[#00DBFF]/10 text-[#008fb3]' : 'text-slate-500 hover:bg-slate-50'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                Usuários
            </button>
            <button onClick={() => setActiveTab('changelog')} className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${activeTab === 'changelog' ? 'bg-[#00DBFF]/10 text-[#008fb3]' : 'text-slate-500 hover:bg-slate-50'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Changelog
            </button>
        </nav>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-8 bg-[#f0f4f8]">
        <div className="max-w-5xl mx-auto">
            
            {/* VIEW: TEMPLATES */}
            {activeTab === 'templates' && (
                <div className="space-y-6 animate-fadeIn">
                    <h2 className="text-2xl font-bold text-slate-800">Gerenciamento de Templates</h2>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex gap-4 items-end mb-4">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-slate-400">Módulo</label>
                                <select value={targetModule} onChange={(e) => setTargetModule(e.target.value)} className="w-full border p-2 rounded text-sm mt-1 outline-none focus:border-[#00DBFF]">
                                    {Object.entries(TOOLS_CONFIG).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-bold text-slate-400">Importar .HTML</label>
                                <input type="file" accept=".html" onChange={handleFileUpload} className="block w-full text-sm mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                            </div>
                        </div>
                        {uploadStatus && <p className="text-xs font-bold text-blue-600 mb-4">{uploadStatus}</p>}
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-sm text-slate-500 uppercase mb-4">Templates Ativos</h3>
                        <div className="space-y-3">
                            {Object.entries(TOOLS_CONFIG).map(([key, tool]) => (
                                <div key={key} className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${tool.active ? 'bg-green-500' : 'bg-red-300'}`}></div>
                                        <div>
                                            <p className="font-bold text-sm text-slate-700">{tool.label}</p>
                                            <p className="text-xs text-slate-400">{templates[key] ? `Custom: ${templates[key].name}` : 'Padrão do Sistema'}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleEditTemplate(key)} className="bg-[#002233] text-white px-4 py-2 rounded text-sm font-bold hover:bg-[#00334d] flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        Editor HTML
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW: TAGS */}
            {activeTab === 'tags' && (
                <div className="space-y-6 animate-fadeIn">
                    <h2 className="text-2xl font-bold text-slate-800">Configuração de Tags</h2>
                    <div className="flex gap-6 items-start">
                         <div className="w-1/3 bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-4">
                            <div className="mb-6 border-b pb-4">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Delimitadores</label>
                                <div className="flex gap-2">
                                    <input value={tempDelimiters.prefix} onChange={e => setTempDelimiters({...tempDelimiters, prefix: e.target.value})} className="w-1/3 border p-1 rounded text-center text-xs font-mono" placeholder="<<" />
                                    <span className="text-xs text-slate-400 self-center">TAG</span>
                                    <input value={tempDelimiters.suffix} onChange={e => setTempDelimiters({...tempDelimiters, suffix: e.target.value})} className="w-1/3 border p-1 rounded text-center text-xs font-mono" placeholder=">>" />
                                </div>
                                <button onClick={handleSaveDelimiters} className="w-full mt-2 bg-slate-200 text-slate-600 text-xs py-1 rounded hover:bg-slate-300 font-bold">Salvar Símbolos</button>
                            </div>

                            <h3 className="font-bold text-sm text-slate-500 uppercase mb-4">{editingTagId ? 'Editar Tag' : 'Nova Tag'}</h3>
                            <form onSubmit={handleSaveTagPanel} className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-400">Módulo</label>
                                    <select value={tagModuleFilter} onChange={(e) => setTagModuleFilter(e.target.value)} className="w-full border p-2 rounded text-sm outline-none focus:border-[#00DBFF]">
                                        {Object.entries(TOOLS_CONFIG).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400">ID da Tag</label>
                                    <input value={tagForm.id} onChange={e => setTagForm({...tagForm, id: e.target.value})} className="w-full bg-slate-50 border p-2 rounded text-sm font-mono uppercase" placeholder="NOME" required />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400">Rótulo do Campo</label>
                                    <input value={tagForm.label} onChange={e => setTagForm({...tagForm, label: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="Ex: Nome Completo" required />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400">Tipo de Input</label>
                                    <select value={tagForm.type} onChange={e => setTagForm({...tagForm, type: e.target.value})} className="w-full border p-2 rounded text-sm">
                                        <option value="text">Texto</option>
                                        <option value="date">Data</option>
                                        <option value="email">E-mail</option>
                                    </select>
                                </div>
                                <div className="pt-2 flex gap-2">
                                    <button type="submit" className="flex-1 bg-[#00DBFF] text-[#002233] font-bold py-2 rounded text-sm hover:bg-[#00b0cc]">{editingTagId ? 'Salvar Alteração' : 'Criar Tag'}</button>
                                    {editingTagId && <button type="button" onClick={() => { setEditingTagId(null); setTagForm({id:'', label:'', type:'text'}) }} className="px-3 bg-slate-200 rounded text-slate-600 text-sm">X</button>}
                                </div>
                            </form>
                         </div>

                         <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                             <table className="w-full text-left text-sm">
                                 <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                                     <tr>
                                         <th className="p-3">Tag</th>
                                         <th className="p-3">Rótulo</th>
                                         <th className="p-3 text-right">Ações</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                     {(tagsConfig[tagModuleFilter] || []).length === 0 && <tr><td colSpan="3" className="p-4 text-center text-slate-400">Nenhuma tag configurada para este módulo.</td></tr>}
                                     {(tagsConfig[tagModuleFilter] || []).map((tag, idx) => (
                                         <tr key={idx} className="hover:bg-slate-50">
                                             <td className="p-3 font-mono text-blue-600 text-xs">{delimiters.prefix}{tag.id}{delimiters.suffix}</td>
                                             <td className="p-3">{tag.label}</td>
                                             <td className="p-3 text-right">
                                                 <button onClick={() => { setEditingTagId(tag.id); setTagForm(tag); }} className="text-blue-500 hover:underline mr-3 text-xs font-bold">Editar</button>
                                                 <button onClick={() => handleDeleteTag(tag.id, tagModuleFilter)} className="text-red-500 hover:underline text-xs font-bold">Excluir</button>
                                             </td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>
                    </div>
                </div>
            )}
            
            {/* VIEW: CHANGELOG */}
            {activeTab === 'changelog' && (
                 <div className="space-y-6 animate-fadeIn">
                     <h2 className="text-2xl font-bold text-slate-800">Gerenciar Changelog</h2>
                     
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                         <h3 className="font-bold text-sm text-slate-500 uppercase mb-4">{editingLogId ? 'Editar Registro' : 'Novo Registro'}</h3>
                         <div className="grid grid-cols-4 gap-4 mb-4">
                             <input value={newLog.version} onChange={e => setNewLog({...newLog, version: e.target.value})} placeholder="Versão (ex: 1.0)" className="border p-2 rounded text-sm"/>
                             <input type="date" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} className="border p-2 rounded text-sm"/>
                             <input value={newLog.title} onChange={e => setNewLog({...newLog, title: e.target.value})} placeholder="Título" className="col-span-2 border p-2 rounded text-sm"/>
                         </div>
                         <textarea value={newLog.content} onChange={e => setNewLog({...newLog, content: e.target.value})} placeholder="Descrição..." className="w-full border p-2 rounded text-sm h-20 mb-4 resize-none"/>
                         <div className="flex gap-2">
                            <button onClick={handleSaveLog} className="bg-[#00DBFF] text-[#002233] px-6 py-2 rounded font-bold text-sm hover:bg-[#00b0cc]">{editingLogId ? 'Atualizar' : 'Adicionar'}</button>
                            {editingLogId && <button onClick={() => { setEditingLogId(null); setNewLog({ version: '', date: '', title: '', content: '' }) }} className="bg-slate-200 px-4 py-2 rounded text-sm">Cancelar</button>}
                         </div>
                     </div>

                     <div className="space-y-4">
                         {changelog.map(log => (
                             <div key={log.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-start group">
                                 <div>
                                     <div className="flex items-center gap-3 mb-1">
                                         <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded">v{log.version}</span>
                                         <span className="text-slate-400 text-xs">{log.date}</span>
                                     </div>
                                     <h4 className="font-bold text-slate-700 text-sm">{log.title}</h4>
                                     <p className="text-sm text-slate-500 mt-1">{log.content}</p>
                                 </div>
                                 <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                     <button onClick={() => handleEditLogClick(log)} className="text-blue-500 text-xs font-bold hover:underline">Editar</button>
                                     <button onClick={() => handleDeleteLog(log.id)} className="text-red-500 text-xs font-bold hover:underline">Remover</button>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
            )}

            {/* VIEW: USERS */}
            {activeTab === 'users' && (
                <div className="animate-fadeIn space-y-6">
                    <h2 className="text-2xl font-bold text-slate-800">Controle de Usuários</h2>
                    
                    <button onClick={() => { setEditingUserId(null); setUserForm({ email: '', name: '', role: 'user', permissions: [] }); setShowUserModal(true); }} className="bg-[#00DBFF] text-[#002233] px-4 py-2 rounded font-bold text-sm mb-4 hover:bg-[#00b0cc]">
                      + Convidar Usuário
                    </button>
                    
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                                <tr><th className="p-4">Nome</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4 text-right">Ações</th></tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} className="border-b hover:bg-slate-50">
                                        <td className="p-4">{u.name}</td>
                                        <td className="p-4 text-slate-500">{u.email}</td>
                                        <td className="p-4 capitalize"><span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">{u.role}</span></td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleEditUserClick(u)} className="text-blue-600 font-bold text-xs mr-3 hover:underline">Editar</button>
                                            <button onClick={() => removeUser(u.id)} className="text-red-500 font-bold text-xs hover:underline">Remover</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* EDITOR MODAL (Full Screen VS Code Style) */}
      {editingTemplate && (
            <div className="fixed inset-0 bg-[#00121a] z-50 flex flex-col animate-fadeIn">
                <div className="bg-[#1e1e1e] text-white p-3 flex justify-between items-center border-b border-[#333]">
                    <div className="flex items-center gap-3">
                        <span className="text-[#00DBFF] text-lg font-mono">HTML Editor</span>
                        <span className="text-xs text-gray-400 bg-[#333] px-2 py-1 rounded">{TOOLS_CONFIG[editingTemplate]?.label}</span>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setEditingTemplate(null)} className="px-4 py-1 text-sm text-gray-400 hover:text-white">Cancelar</button>
                        <button onClick={handleSaveEditedTemplate} className="px-4 py-1 bg-[#007acc] text-white text-sm hover:bg-[#0098ff]">Salvar (Ctrl+S)</button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar Tags do Módulo Específico */}
                    <div className="w-80 bg-[#252526] border-r border-[#333] p-2 overflow-y-auto custom-scroll flex flex-col">
                        
                        {/* CONDICIONAL: SE EDITANDO TAG, MOSTRA FORMULÁRIO */}
                        {editingTagId ? (
                            <div className="p-2">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Editar Tag</h4>
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    const success = saveTag(tagForm.id, tagForm.label, tagForm.type, editingTemplate, true, editingTagId);
                                    if(success !== false) {
                                        setTagForm({ id: '', label: '', type: 'text' });
                                        setEditingTagId(null);
                                    } else {
                                        alert('Erro ao salvar tag.');
                                    }
                                }} className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 mb-1">ID da Tag</label>
                                        <input value={tagForm.id} onChange={e => setTagForm({...tagForm, id: e.target.value})} className="w-full bg-[#3c3c3c] text-white border border-gray-600 p-2 rounded text-xs font-mono uppercase focus:border-[#007acc] outline-none" required />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Rótulo</label>
                                        <input value={tagForm.label} onChange={e => setTagForm({...tagForm, label: e.target.value})} className="w-full bg-[#3c3c3c] text-white border border-gray-600 p-2 rounded text-xs focus:border-[#007acc] outline-none" required />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 mb-1">Tipo</label>
                                        <select value={tagForm.type} onChange={e => setTagForm({...tagForm, type: e.target.value})} className="w-full bg-[#3c3c3c] text-white border border-gray-600 p-2 rounded text-xs focus:border-[#007acc] outline-none">
                                            <option value="text">Texto</option>
                                            <option value="date">Data</option>
                                            <option value="email">E-mail</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <button type="submit" className="flex-1 bg-[#007acc] text-white font-bold py-1.5 rounded text-xs hover:bg-[#006bb3]">Salvar</button>
                                        <button type="button" onClick={() => { setEditingTagId(null); setTagForm({id:'', label:'', type:'text'}) }} className="px-3 bg-[#3c3c3c] text-white rounded text-xs hover:bg-[#4c4c4c]">Cancelar</button>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <>
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2 px-2">Tags do Módulo</p>
                                <div className="flex-1 overflow-y-auto mb-4">
                                    {(tagsConfig[editingTemplate] || []).map(tag => (
                                        <div key={tag.id} className="group flex items-center justify-between px-2 py-1 hover:bg-[#37373d] rounded mb-1">
                                            <button onClick={() => insertAtCursor(`${delimiters.prefix}${tag.id}${delimiters.suffix}`)} className="text-left flex-1 min-w-0">
                                                <span className="text-gray-300 text-xs block truncate">{tag.label}</span>
                                                <span className="text-[#00DBFF] opacity-50 group-hover:opacity-100 text-[10px] font-mono truncate">{delimiters.prefix}{tag.id}{delimiters.suffix}</span>
                                            </button>
                                            <div className="hidden group-hover:flex gap-1 ml-2">
                                                <button onClick={() => handleEditTagClick(tag)} title="Editar Tag" className="text-gray-500 hover:text-blue-400"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                                                <button onClick={() => handleDeleteTag(tag.id, editingTemplate)} title="Excluir Tag" className="text-gray-500 hover:text-red-400"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Quick Create Tag in Editor */}
                                <div className="border-t border-[#333] pt-4 px-2">
                                     <label className="text-xs text-gray-500 font-bold block mb-1">Adicionar Nova Tag</label>
                                     <div className="flex gap-1">
                                        <input 
                                            className="bg-[#3c3c3c] text-white text-xs p-1 rounded flex-1 outline-none" 
                                            placeholder="ID_TAG"
                                            id="quickTagInput"
                                            onKeyDown={(e) => {
                                                if(e.key === 'Enter') handleCreateCustomTagInEditor(e.target.value);
                                            }}
                                        />
                                        <button 
                                            onClick={() => handleCreateCustomTagInEditor(document.getElementById('quickTagInput').value)}
                                            className="bg-[#007acc] text-white px-2 rounded text-xs hover:bg-[#006bb3]"
                                        >+</button>
                                     </div>
                                     <p className="text-[9px] text-gray-500 mt-1">Cria tag, insere no texto e salva na config.</p>
                                </div>
                            </>
                        )}
                    </div>
                    
                    <div className="flex-1 bg-[#1e1e1e] relative flex flex-col">
                        <textarea 
                            ref={textAreaRef}
                            className="flex-1 w-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm p-4 outline-none resize-none leading-relaxed"
                            value={htmlContent}
                            onChange={(e) => setHtmlContent(e.target.value)}
                            spellCheck="false"
                        />
                    </div>
                    
                    <div className="w-[35%] bg-white border-l border-gray-300 flex flex-col">
                        <div className="bg-gray-100 p-2 text-xs font-bold text-gray-500 border-b text-center">Preview</div>
                        <div className="flex-1 p-4 overflow-y-auto bg-gray-200">
                            <div className="bg-white shadow-lg min-h-[29.7cm] p-[1cm] text-[10px]" dangerouslySetInnerHTML={{ __html: htmlContent }} />
                        </div>
                    </div>
                </div>
            </div>
      )}

      {/* MODAL USER ADD/EDIT */}
      {showUserModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg w-96">
              <h3 className="text-lg font-bold mb-4">{editingUserId ? 'Editar Usuário' : 'Convidar Usuário'}</h3>
              <form onSubmit={handleSaveUser} className="space-y-3">
                <input placeholder="Nome" required className="w-full border p-2 rounded text-sm" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} />
                <input placeholder="Email" required type="email" className="w-full border p-2 rounded text-sm" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} />
                <select className="w-full border p-2 rounded text-sm" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})}>
                    <option value="user">Colaborador</option>
                    <option value="admin">Administrador</option>
                </select>
                
                {userForm.role === 'user' && (
                  <div className="border p-2 rounded bg-slate-50 max-h-40 overflow-y-auto">
                    <p className="text-xs font-bold mb-2">Acesso às Ferramentas:</p>
                    {Object.entries(TOOLS_CONFIG).map(([key, tool]) => (
                      <label key={key} className="flex items-center gap-2 text-xs mb-1 cursor-pointer">
                        <input type="checkbox" checked={userForm.permissions.includes(key)} onChange={() => toggleUserPermission(key)} />
                        {tool.label}
                      </label>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-4">
                    <button type="button" onClick={() => setShowUserModal(false)} className="text-slate-500 text-sm">Cancelar</button>
                    <button type="submit" className="bg-[#00DBFF] px-3 py-1.5 rounded font-bold text-sm text-[#002233]">Salvar</button>
                </div>
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
  const [parsedTags, setParsedTags] = useState([]);

  useEffect(() => {
    const content = template?.content || DEFAULT_HTML_TEMPLATE;
    const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${escapeRegExp(delimiters.prefix)}([A-Z0-9_]+)${escapeRegExp(delimiters.suffix)}`, 'g');
    
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
  }, [template, delimiters]);

  const handleChange = (tag, value) => setFormData(prev => ({ ...prev, [tag]: value }));

  const renderDocument = () => {
      let html = template?.content || DEFAULT_HTML_TEMPLATE;
      parsedTags.forEach(tag => {
          let val = formData[tag] || '';
          if(tag === 'DATA' && val) val = val.split('-').reverse().join('/');
          html = html.split(`${delimiters.prefix}${tag}${delimiters.suffix}`).join(val);
      });
      return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const renderInputForTag = (tag) => {
      const moduleTags = tagsConfig[moduleId] || [];
      const tagConfig = moduleTags.find(t => t.id === tag);
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
            {parsedTags.length === 0 && <p className="text-center text-slate-400 mt-10">Nenhuma tag encontrada no template.</p>}
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
// APP ROOT
// ============================================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [templates, setTemplates] = useState({});
  const [tagsConfig, setTagsConfig] = useState(DEFAULT_TAGS_BY_MODULE);
  const [delimiters, setDelimiters] = useState(DEFAULT_DELIMITERS);
  const [changelog, setChangelog] = useState([]);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
      // Autenticação anônima como "serviço" do app
      signInAnonymously(auth).then(() => {
          setDbReady(true);
      }).catch(console.error);
  }, []);

  // Só conecta aos dados após estar autenticado (dbReady)
  useEffect(() => {
      if (!dbReady) return;

      const unsubUsers = onSnapshot(getCollectionRef('users'), (snap) => {
          const loaded = [];
          snap.forEach(doc => loaded.push(doc.data()));
          if(loaded.length === 0) { 
              DEFAULT_USERS.forEach(u => setDoc(getDocRef('users', u.id), u));
          } else {
              setUsers(loaded);
          }
      }, (err) => console.log('Waiting for permission...'));

      const unsubTemplates = onSnapshot(getCollectionRef('templates'), (snap) => {
          const loaded = {};
          snap.forEach(doc => loaded[doc.id] = doc.data());
          setTemplates(loaded);
      }, (err) => console.log('Waiting for permission...'));

      const unsubTags = onSnapshot(getCollectionRef('tags'), (snap) => {
          const loaded = {};
          snap.forEach(doc => loaded[doc.id] = doc.data().list);
          if (Object.keys(loaded).length === 0) {
              Object.entries(DEFAULT_TAGS_BY_MODULE).forEach(([k, v]) => setDoc(getDocRef('tags', k), { list: v }));
          } else {
              setTagsConfig(loaded);
          }
      }, (err) => console.log('Waiting for permission...'));
      
      const unsubSettings = onSnapshot(getCollectionRef('settings'), (snap) => {
           snap.forEach(doc => {
               if(doc.id === 'delimiters') setDelimiters(doc.data());
           });
      }, (err) => console.log('Waiting for permission...'));

      const unsubChangelog = onSnapshot(getCollectionRef('changelog'), (snap) => {
          const loaded = [];
          snap.forEach(doc => loaded.push(doc.data()));
          if(loaded.length === 0) {
             DEFAULT_CHANGELOG.forEach(l => setDoc(getDocRef('changelog', l.id), l)); 
          } else {
             setChangelog(loaded.sort((a,b) => b.id - a.id));
          }
      }, (err) => console.log('Waiting for permission...'));

      return () => {
          unsubUsers(); unsubTemplates(); unsubTags(); unsubSettings(); unsubChangelog();
      }
  }, [dbReady]);

  useEffect(() => {
    if (!document.querySelector('script[src*="tailwindcss"]')) { 
      const s = document.createElement('script'); s.src = "https://cdn.tailwindcss.com"; document.head.appendChild(s); 
    }
    const style = document.createElement('style');
    style.innerHTML = `body, html, #root { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; } .custom-scroll::-webkit-scrollbar { width: 6px; } .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }`;
    document.head.appendChild(style);
  }, []);

  return user ? <Dashboard user={user} onLogout={() => setUser(null)} users={users} setUsers={setUsers} templates={templates} setTemplates={setTemplates} tagsConfig={tagsConfig} setTagsConfig={setTagsConfig} delimiters={delimiters} setDelimiters={setDelimiters} changelog={changelog} setChangelog={setChangelog} /> : <LoginPage onLogin={setUser} users={users} dbReady={dbReady} />;
}