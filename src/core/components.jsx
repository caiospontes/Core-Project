import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

import { signInWithPopup, GoogleAuthProvider, signInAnonymously, signOut } from 'firebase/auth';

import { setDoc, deleteDoc } from 'firebase/firestore';

import { auth, getDocRef } from './firebase';

import { sortTools, getCompositeKey, buildNotebookBarcodeValue, parseNotebookBarcodeValue } from './utils';

import { DEFAULT_USERS, DEFAULT_TAGS_WITH_SESSIONS, DEFAULT_TOOLS_CONFIG, DEFAULT_CHANGELOG, DEFAULT_INVENTORY_CONFIGS, DEFAULT_HTML_TEMPLATE } from './defaults';



function SafePreview({ html }) {
  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const shadowRootRef = useRef(null);

  useEffect(() => {
    const updateScale = () => {
      if (wrapperRef.current && containerRef.current && shadowRootRef.current && shadowRootRef.current.body) {
        const parentWidth = wrapperRef.current.clientWidth;
        const A4_WIDTH_PX = 794; 
        const PADDING = 8;
        
        const availableWidth = parentWidth - PADDING;
        const rawScale = availableWidth / A4_WIDTH_PX;
        const scale = Math.max(0.35, Math.min(rawScale, 1)); 
        
        containerRef.current.style.transform = `scale(${scale})`;
        containerRef.current.style.transformOrigin = 'top center';
        
        const A4_HEIGHT_PX = 1123;

        containerRef.current.style.height = `${A4_HEIGHT_PX}px`;
        wrapperRef.current.style.minHeight = `${(A4_HEIGHT_PX * scale) + 32}px`; 
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
            height: 1123px;
            background: white;
            margin: 0 auto;
            overflow: hidden; 
            position: relative;
        }
        body { 
            margin: 0; 
            padding: 0; 
            font-family: Arial, sans-serif; 
            width: 100%; 
            height: 100%;
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
    <div ref={wrapperRef} className="w-full h-full flex items-start justify-center overflow-auto custom-scroll">
      <div 
        ref={containerRef} 
        style={{ width: '794px', height: '1123px', transition: 'transform 0.1s ease-out', overflow: 'hidden', background: 'white' }}
      ></div>
    </div>
  );
}



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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 px-4 py-8 font-sans text-slate-800">
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl shadow-2xl shadow-slate-300/40">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-lg flex items-center justify-center mb-4 border border-slate-100 shadow-sm bg-slate-50">
             <img src="https://midias-tdw.totvs.com/wp-content/uploads/2025/06/favicon-bg-light-192x192-1.png" alt="Logo" className="w-10" />
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent tracking-tight">CORE ERP</h1>
          <p className="text-slate-500 text-sm mt-1">Centro de Otimização Operacional</p>
          {!dbReady && <span className="text-xs text-amber-600 font-medium block mt-2">Sincronizando ambiente...</span>}
          {dbReady && <span className="text-xs text-emerald-600 font-medium block mt-2">Ambiente Seguro Conectado</span>}
        </div>
        
        <div className="space-y-6">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white/95 border border-slate-300 text-slate-700 font-semibold py-2.5 rounded-lg hover:bg-white transition-all hover:shadow-md flex items-center justify-center gap-3 shadow-sm"
          >
            {loading ? (
              <span className="text-sm">Processando...</span>
            ) : (
              <>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-4 h-4" />
                <span className="text-sm">Acessar com Google Workspace</span>
              </>
            )}
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

            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/20 text-sm mt-2">
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



function HomePage({ onNavigate, _user, changelog, toolsConfig }) {
  const [highlightPulse, setHighlightPulse] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setHighlightPulse(false), 7000);
    return () => clearTimeout(timer);
  }, []);

  return (
  <div className="h-full w-full flex flex-col bg-gradient-to-b from-slate-50 to-slate-100 overflow-y-auto">
    <div className="bg-white/90 backdrop-blur border-b border-slate-200 px-8 py-6 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Visão Geral</h1>
        <p className="text-slate-500 text-sm mt-1">Acesso rápido aos módulos operacionais do CORE.</p>
      </div>
    </div>

    <div className="flex-1 p-8 max-w-6xl mx-auto w-full flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Módulos Disponíveis</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {sortTools(toolsConfig).map(([key, tool]) => (
                    <div key={key} onClick={() => tool.active && onNavigate(key)} className={`bg-white/95 p-5 rounded-xl shadow-sm border border-slate-200 transition-all duration-200 ${tool.active ? 'hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg cursor-pointer' : 'opacity-60 cursor-not-allowed bg-slate-50'}`}>
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
                    {(changelog || []).map((log, idx) => (
                        <div key={log.id} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                            <div className="flex justify-between items-center mb-1 gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded">v{log.version}</span>
                                  {idx === 0 && (
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-blue-200 text-blue-700 bg-blue-50 ${highlightPulse ? 'animate-pulse' : ''}`}>
                                      Novidade
                                    </span>
                                  )}
                                </div>
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



function AdminPanel({ users, templates, tagsConfig, delimiters, changelog, toolsConfig, systemSettings, cepMappings, inventoryConfigs }) {
  const [activeTab, setActiveTab] = useState('templates');
  const [targetModule, setTargetModule] = useState(Object.keys(toolsConfig)[0] || '');
  const [targetSubModule, _setTargetSubModule] = useState('');
  
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

  // Inventory Management
  const [inventoryForm, setInventoryForm] = useState({
    name: '',
    description: '',
    sheetsText: 'Estoque: Marca, Modelo, IMEI, Status, Observações\nChips: CHIP, LINHA, TOTVER, OBSERVAÇÃO'
  });
  const [editingInventoryId, setEditingInventoryId] = useState(null);

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

  const resetInventoryForm = () => {
    setInventoryForm({
      name: '',
      description: '',
      sheetsText: 'Estoque: Marca, Modelo, IMEI, Status, Observações\nChips: CHIP, LINHA, TOTVER, OBSERVAÇÃO'
    });
    setEditingInventoryId(null);
  };

  const parseCommaValues = (text) => text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const parseInventorySheets = (text) => {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    return lines.map((line, index) => {
      const [rawName, rawColumns] = line.includes(':') ? line.split(':') : [`Página ${index + 1}`, line];
      const columns = parseCommaValues(rawColumns || '');
      return {
        id: rawName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') || `pagina_${index + 1}`,
        name: rawName.trim() || `Página ${index + 1}`,
        columns,
        statusOptions: []
      };
    }).filter((sheet) => sheet.columns.length > 0);
  };

  const handleSaveInventory = async (e) => {
    e.preventDefault();
    const sheets = parseInventorySheets(inventoryForm.sheetsText);
    if (!inventoryForm.name.trim() || sheets.length === 0) {
      alert('Preencha o nome e pelo menos uma página com colunas para o inventário.');
      return;
    }

    const existing = inventoryConfigs && inventoryConfigs.length > 0 ? inventoryConfigs : DEFAULT_INVENTORY_CONFIGS;
    const id = editingInventoryId || `inv_${Date.now()}`;
    const payload = {
      id,
      name: inventoryForm.name.trim(),
      description: inventoryForm.description.trim(),
      sheets
    };

    const updated = editingInventoryId
      ? existing.map((item) => (item.id === editingInventoryId ? payload : item))
      : [...existing, payload];

    await setDoc(getDocRef('settings', 'inventories'), { list: updated });
    resetInventoryForm();
  };

  const handleEditInventory = (inventory) => {
    const normalizedSheets = normalizeInventorySheets(inventory);
    setEditingInventoryId(inventory.id);
    setInventoryForm({
      name: inventory.name || '',
      description: inventory.description || '',
      sheetsText: normalizedSheets.map((sheet) => `${sheet.name}: ${(sheet.columns || []).join(', ')}`).join('\n')
    });
  };

  const handleDeleteInventory = async (inventoryId) => {
    if (!window.confirm('Remover este sistema de inventário?')) return;
    const updated = (inventoryConfigs || []).filter((item) => item.id !== inventoryId);
    await setDoc(getDocRef('settings', 'inventories'), { list: updated });
    if (editingInventoryId === inventoryId) resetInventoryForm();
  };
  
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

  const onDragStart = (e, sessionId, tagIndex) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'tag', sessionId, tagIndex, module: currentTagConfigKey }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const onSessionDragStart = (e, sessionIndex) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'session', sessionIndex, module: currentTagConfigKey }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

  const handleTagDrop = async (data, targetSessionId, targetIndex = null) => {
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

  const handleSessionDrop = async (data, targetSessionIndex) => {
      const currentConfig = tagsConfig[currentTagConfigKey];
      const sessions = JSON.parse(JSON.stringify(currentConfig.sessions));
      if (data.sessionIndex < 0 || data.sessionIndex >= sessions.length || targetSessionIndex < 0 || targetSessionIndex >= sessions.length) return;
      const [movedSession] = sessions.splice(data.sessionIndex, 1);
      sessions.splice(targetSessionIndex, 0, movedSession);
      await setDoc(getDocRef('tags', currentTagConfigKey), { ...currentConfig, sessions });
  };

  const handleDrop = async (e, targetSessionId, targetIndex = null, targetSessionCardIndex = null) => {
      e.preventDefault();
      e.stopPropagation();
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      if (data.module !== currentTagConfigKey) return;

      if (data.kind === 'session' && typeof targetSessionCardIndex === 'number') {
        await handleSessionDrop(data, targetSessionCardIndex);
        return;
      }

      if (data.kind === 'tag') {
        await handleTagDrop(data, targetSessionId, targetIndex);
      }
  };

  return (
    <div className="flex h-full w-full bg-slate-50 overflow-hidden">
      <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col no-print z-10 shadow-sm">
        <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Setup ERP</h2>
        </div>
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
            {['templates', 'tags', 'tools', 'inventories', 'integrations', 'users', 'changelog', 'config'].map(tab => (
                <button 
                    key={tab} 
                    onClick={() => setActiveTab(tab)} 
                    className={`w-full text-left px-5 py-2.5 text-sm font-medium transition-colors border-l-4 ${activeTab === tab ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                    {tab === 'templates' && 'Gerenciar Modelos'}
                    {tab === 'tags' && 'Dicionário de Dados'}
                    {tab === 'tools' && 'Módulos do Sistema'}
                    {tab === 'inventories' && 'Inventários'}
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
                         {(tagsConfig[currentTagConfigKey]?.sessions || []).map((session, sessionIndex) => (
                             <div 
                                key={session.id} 
                                className={`bg-white rounded-lg shadow-sm border ${session.active ? 'border-slate-200' : 'border-slate-200 bg-slate-50 opacity-75'}`} 
                                onDragOver={onDragOver} 
                                onDrop={(e) => handleDrop(e, session.id, null, sessionIndex)} 
                            >
                                 <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center rounded-t-lg" draggable onDragStart={(e) => onSessionDragStart(e, sessionIndex)} onDragOver={onDragOver} onDrop={(e) => handleDrop(e, session.id, null, sessionIndex)}>
                                     <div className="flex items-center gap-3">
                                        <span className="text-slate-400 cursor-move" title="Arraste para reordenar sessão">⋮⋮</span>
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

            {activeTab === 'inventories' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Configurar Sistema de Inventário</h3>
                        <form onSubmit={handleSaveInventory} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome do Inventário</label>
                                <input value={inventoryForm.name} onChange={(e) => setInventoryForm({ ...inventoryForm, name: e.target.value })} className="w-full border border-slate-300 p-2 rounded-md text-sm focus:border-blue-500 outline-none" placeholder="Ex: Inventário de Telefonia" required />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição</label>
                                <input value={inventoryForm.description} onChange={(e) => setInventoryForm({ ...inventoryForm, description: e.target.value })} className="w-full border border-slate-300 p-2 rounded-md text-sm focus:border-blue-500 outline-none" placeholder="Ex: Controle de celulares por unidade" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Páginas e colunas (uma por linha)</label>
                                <textarea value={inventoryForm.sheetsText} onChange={(e) => setInventoryForm({ ...inventoryForm, sheetsText: e.target.value })} className="w-full border border-slate-300 p-2 rounded-md text-sm focus:border-blue-500 outline-none" placeholder="Estoque: Marca, Modelo, IMEI, Status, Observações&#10;Chips: CHIP, LINHA, TOTVER, OBSERVAÇÃO" rows={4} required />
                            </div>
                            <div className="md:col-span-2 flex gap-3">
                                <button type="submit" className="bg-slate-800 text-white px-6 py-2 rounded-md font-medium text-sm hover:bg-slate-900 transition">{editingInventoryId ? 'Atualizar Inventário' : 'Cadastrar Inventário'}</button>
                                {editingInventoryId && <button type="button" onClick={resetInventoryForm} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md font-medium text-sm hover:bg-slate-50 transition">Cancelar</button>}
                            </div>
                        </form>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Inventário</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Páginas</th>
                                    <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase">Abas</th>
                                    <th className="px-4 py-3 text-right font-semibold text-slate-600 text-xs uppercase">Controle</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(inventoryConfigs || []).map((inventory) => (
                                    <tr key={inventory.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-slate-800">{inventory.name}</div>
                                            <div className="text-xs text-slate-500">{inventory.description || 'Sem descrição'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-600">{normalizeInventorySheets(inventory).map((sheet) => `${sheet.name} (${(sheet.columns || []).length})`).join(' • ')}</td>
                                        <td className="px-4 py-3 text-xs text-slate-600">{normalizeInventorySheets(inventory).map((sheet) => sheet.name).join(', ') || '-'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => handleEditInventory(inventory)} className="text-blue-600 font-medium text-sm mr-4 hover:underline">Editar</button>
                                            <button onClick={() => handleDeleteInventory(inventory.id)} className="text-red-500 font-medium text-sm hover:underline">Remover</button>
                                        </td>
                                    </tr>
                                ))}
                                {(inventoryConfigs || []).length === 0 && <tr><td colSpan="4" className="text-center py-6 text-slate-400 text-sm">Nenhum sistema de inventário configurado.</td></tr>}
                            </tbody>
                        </table>
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



function DynamicGenerator({ template, tagsConfig, delimiters, moduleId, cepMappings }) {
  const [formData, setFormData] = useState({});
  const [sessions, setSessions] = useState([]);
  const [addressNumberWarnings, setAddressNumberWarnings] = useState({});
  const [activeAssetRows, setActiveAssetRows] = useState({});
  const baseModuleId = moduleId.includes('_') ? moduleId.split('_')[0] : moduleId;
  const isCorreiosModule = baseModuleId === 'correios';

  const normalizeText = useCallback((value) => String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase(), []);

  const getTagRowIndex = useCallback((tag) => {
    const idMatch = String(tag.id || '').match(/(?:_|\b)(\d{1,2})$/);
    if (idMatch) return Number(idMatch[1]);
    const labelMatch = String(tag.label || '').match(/(\d{1,2})$/);
    if (labelMatch) return Number(labelMatch[1]);
    return null;
  }, []);

  const isAssetSession = useCallback((session) => normalizeText(session.title).includes('identificacao dos bens'), [normalizeText]);

  useEffect(() => {
    const config = tagsConfig[moduleId] || tagsConfig[baseModuleId] || { sessions: [] };
    const activeSessions = config.sessions.filter(s => s.active);
    setSessions(activeSessions);
    setFormData((prev) => {
      const initialData = { ...prev };
      activeSessions.forEach(session => {
          session.tags.forEach(tag => {
              if (initialData[tag.id] === undefined) {
                  if (tag.type === 'checkbox') initialData[tag.id] = [];
                  else initialData[tag.id] = '';
              }
              if (tag.id === 'DATA' && !initialData[tag.id]) initialData[tag.id] = new Date().toISOString().split('T')[0];
          });
      });
      return initialData;
    });
  }, [tagsConfig, moduleId, baseModuleId]);

  useEffect(() => {
    if (!isCorreiosModule) return;

    setActiveAssetRows((prev) => {
      const next = { ...prev };
      sessions.forEach((session) => {
        if (!isAssetSession(session)) return;
        const rows = [...new Set(session.tags.map(getTagRowIndex).filter(Boolean))].sort((a, b) => a - b);
        if (rows.length === 0) return;

        const filledRows = rows.filter((rowNum) => {
          const tagsInRow = session.tags.filter((tag) => getTagRowIndex(tag) === rowNum);
          return tagsInRow.some((tag) => String(formData[tag.id] || '').trim() !== '');
        });

        next[session.id] = filledRows.length > 0 ? filledRows : [rows[0]];
      });
      return next;
    });
  }, [isCorreiosModule, sessions, formData, getTagRowIndex, isAssetSession]);

  const handleChange = async (tag, value) => {
    setFormData(prev => ({ ...prev, [tag.id]: value }));

    if (addressNumberWarnings[tag.id] && /\d/.test(value || '')) {
      setAddressNumberWarnings((prev) => ({ ...prev, [tag.id]: false }));
    }
    
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
                    if (mapping.streetTag) {
                      setAddressNumberWarnings((prev) => ({ ...prev, [mapping.streetTag]: true }));
                    }
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

      const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const unresolvedPattern = new RegExp(`${escapeRegex(delimiters.prefix)}\\s*[A-Z0-9_]+\\s*${escapeRegex(delimiters.suffix)}`, 'g');
      html = html.replace(unresolvedPattern, '');

      if (isCorreiosModule && typeof window !== 'undefined') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        doc.querySelectorAll('table').forEach((table) => {
          if (!normalizeText(table.textContent).includes('identificacao dos bens')) return;

          const candidateRows = Array.from(table.querySelectorAll('tr')).filter((row) => {
            const text = row.textContent.replace(/\s+/g, ' ').trim();
            if (!text) return false;
            if (/identificacao dos bens|item|conteudo|quant|valor|totais|peso total/i.test(text)) return false;

            const cells = Array.from(row.querySelectorAll('td,th')).map((cell) => cell.textContent.replace(/\s+/g, ' ').trim());
            if (cells.length < 3) return false;
            const contentCandidate = cells[1] || '';
            const qtyCandidate = cells[2] || '';
            const valueCandidate = cells[3] || '';

            const isEmptyContent = contentCandidate === '' || contentCandidate === '-';
            const isEmptyQty = qtyCandidate === '' || qtyCandidate === '-';
            const isEmptyValue = valueCandidate === '' || /^r\$?$/i.test(valueCandidate) || valueCandidate === '-';
            return isEmptyContent && isEmptyQty && isEmptyValue;
          });

          if (candidateRows.length <= 1) return;
          candidateRows.slice(1).forEach((row) => row.remove());
        });

        html = doc.body.innerHTML;
      }

      return html;
  };

  const renderTagInput = (tag) => (
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
        <>
          <input
            type={tag.type}
            className="w-full bg-transparent border-none p-0 text-sm text-slate-900 font-medium placeholder-slate-300 focus:ring-0"
            placeholder={`Preencher ${tag.label.toLowerCase()}...`}
            value={formData[tag.id] || ''}
            onChange={e => handleChange(tag, e.target.value)}
          />
          {addressNumberWarnings[tag.id] && (
            <p className="text-[11px] text-amber-700 mt-2 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              Endereço preenchido automaticamente pelo CEP. Confira e informe o número.
            </p>
          )}
        </>
      )}
    </div>
  );

  const handlePrint = () => {
      const printContent = renderDocument();
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`<html><head><title>Documento Operacional</title><style>@page { size: A4 portrait; margin: 6mm; } html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; } body { width: auto; height: auto; } img { max-width: 100%; height: auto; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; } table { border-collapse: collapse; width: 100%; } table, tr, td, th { page-break-inside: avoid; } .print-page-break { break-after: page; page-break-after: always; }</style></head><body>${printContent}</body></html>`);
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
                        {isCorreiosModule && isAssetSession(session) ? (() => {
                          const tagsByRow = {};
                          const staticTags = [];

                          session.tags.forEach((tag) => {
                            const row = getTagRowIndex(tag);
                            if (row) {
                              if (!tagsByRow[row]) tagsByRow[row] = [];
                              tagsByRow[row].push(tag);
                            } else {
                              staticTags.push(tag);
                            }
                          });

                          const availableRows = Object.keys(tagsByRow).map(Number).sort((a, b) => a - b);
                          const currentRows = activeAssetRows[session.id] || (availableRows[0] ? [availableRows[0]] : []);

                          const addAssetRow = () => {
                            const nextRow = availableRows.find((row) => !currentRows.includes(row));
                            if (!nextRow) return;
                            setActiveAssetRows((prev) => ({ ...prev, [session.id]: [...currentRows, nextRow] }));
                          };

                          const removeAssetRow = (rowNum) => {
                            const remaining = currentRows.filter((row) => row !== rowNum);
                            setActiveAssetRows((prev) => ({ ...prev, [session.id]: remaining.length > 0 ? remaining : [availableRows[0]] }));
                            const rowTags = tagsByRow[rowNum] || [];
                            setFormData((prev) => {
                              const next = { ...prev };
                              rowTags.forEach((tag) => { next[tag.id] = tag.type === 'checkbox' ? [] : ''; });
                              return next;
                            });
                          };

                          return (
                            <>
                              {staticTags.map(renderTagInput)}
                              {currentRows.map((rowNum) => (
                                <div key={`${session.id}-row-${rowNum}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Bem {rowNum}</p>
                                    {currentRows.length > 1 && (
                                      <button type="button" onClick={() => removeAssetRow(rowNum)} className="text-xs text-red-600 hover:text-red-700 font-semibold">Remover</button>
                                    )}
                                  </div>
                                  <div className="space-y-3">
                                    {(tagsByRow[rowNum] || []).map(renderTagInput)}
                                  </div>
                                </div>
                              ))}

                              <button
                                type="button"
                                onClick={addAssetRow}
                                disabled={currentRows.length >= availableRows.length}
                                className="w-full border border-dashed border-blue-300 text-blue-700 py-2 rounded-md text-sm font-semibold hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                + Adicionar novo bem
                              </button>
                            </>
                          );
                        })() : session.tags.map(renderTagInput)}
                    </div>
                </div>
            ))}
        </div>
      </div>
      <div className="flex-1 bg-slate-200/60 p-2 md:p-3 flex justify-center overflow-auto custom-scroll inset-shadow">
        <div className="relative mx-auto w-full h-full max-w-[210mm] bg-white overflow-hidden">
            <SafePreview html={renderDocument()} />
        </div>
      </div>
    </div>
  );
}



function LapsReaderPage() {
  const [rawPassword, setRawPassword] = useState('');
  const [pasteFeedback, setPasteFeedback] = useState('');

  const symbolNames = {
    '!': 'Exclamação', '@': 'Arroba', '#': 'Cerquilha', '$': 'Cifrão', '%': 'Porcentagem', '^': 'Circunflexo', '&': 'E comercial', '*': 'Asterisco',
    '(': 'Abre parêntese', ')': 'Fecha parêntese', '-': 'Hífen', '_': 'Sublinhado', '+': 'Mais', '=': 'Igual', '[': 'Abre colchete', ']': 'Fecha colchete',
    '{': 'Abre chave', '}': 'Fecha chave', ';': 'Ponto e vírgula', ':': 'Dois pontos', "'": 'Aspa simples', '"': 'Aspa dupla', ',': 'Vírgula', '.': 'Ponto',
    '<': 'Menor que', '>': 'Maior que', '/': 'Barra', '\\': 'Barra invertida', '?': 'Interrogação', '|': 'Barra vertical', '`': 'Crase', '~': 'Til', ' ': 'Espaço'
  };

  const phoneticHints = {
    L: 'Lima',
    l: 'Lima',
    I: 'India',
    i: 'India'
  };

  const tokens = rawPassword.split('').map((ch) => {
    let label = '';
    if (/[A-Z]/.test(ch)) label = `Maiúsculo`;
    else if (/[a-z]/.test(ch)) label = `Minúsculo`;
    else if (/[0-9]/.test(ch)) {
      const numeroPorExtenso = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
      label = `Número ${numeroPorExtenso[Number(ch)]}`;
    }
    else label = symbolNames[ch] || 'Símbolo';
    return { char: ch, label, phoneticHint: phoneticHints[ch] || null };
  });

  const handlePaste = async () => {
    try {
      const value = await navigator.clipboard.readText();
      setRawPassword(value || '');
      setPasteFeedback(value ? 'Senha colada da área de transferência.' : 'Área de transferência vazia.');
    } catch (error) {
      setPasteFeedback('Não foi possível colar automaticamente. Use Ctrl+V/Cmd+V no campo.');
    }
  };

  return (
    <div className="h-full overflow-y-auto custom-scroll bg-gradient-to-b from-slate-50/90 to-slate-100/60 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Leitor de Senha LAPS</h2>
          <p className="text-slate-500 mt-2">Cole abaixo a senha gerada no LAPS para converter em leitura por extenso, diferenciando maiúsculas e minúsculas.</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Senha LAPS</label>
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <input
              type="text"
              value={rawPassword}
              onChange={(e) => setRawPassword(e.target.value)}
              placeholder="Cole aqui a senha do LAPS..."
              className="flex-1 rounded-xl border border-slate-300 bg-slate-50/70 px-4 py-3 font-mono text-slate-900 text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            />
            <button
              type="button"
              onClick={handlePaste}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-3 text-sm font-semibold transition-colors"
            >
              Colar senha
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Dica: mantenha maiúsculas/minúsculas como na senha original.</p>
          {pasteFeedback && <p className="text-xs text-blue-700 mt-1">{pasteFeedback}</p>}
        </div>

        <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Leitura da senha</label>
          <div className="min-h-[148px] rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-2xl text-slate-800 leading-relaxed flex flex-wrap gap-x-4 gap-y-2">
            {tokens.length > 0 ? (
              tokens.map((token, idx) => (
                <span key={`${token.char}-${idx}`} className="inline-flex items-baseline whitespace-nowrap">
                  <span className="font-bold text-red-600">{token.char === ' ' ? '[espaço]' : token.char}</span>
                  {token.phoneticHint && <span className="ml-1 text-xs text-slate-400">({token.phoneticHint})</span>}
                  <span className="whitespace-pre">{`  ${token.label}`}</span>
                </span>
              ))
            ) : (
              'A leitura da senha aparecerá aqui no formato: caractere + descrição.'
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


const INVENTORY_FALLBACK_COLUMNS = ['Marca', 'Modelo', 'IMEI', 'Status', 'Observações'];

const normalizeInventorySheets = (inventory) => {
  if (inventory?.sheets && inventory.sheets.length > 0) return inventory.sheets;

  const legacyColumns = inventory?.columns || INVENTORY_FALLBACK_COLUMNS;
  return [{
    id: 'principal',
    name: 'Principal',
    columns: legacyColumns,
    statusOptions: inventory?.statusOptions || []
  }];
};

const xmlEscape = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const buildSimpleXlsxBlob = (sheets) => {
  const sharedStrings = [];
  const sharedMap = new Map();

  const getSharedIndex = (text) => {
    const key = String(text ?? '');
    if (!sharedMap.has(key)) {
      sharedMap.set(key, sharedStrings.length);
      sharedStrings.push(key);
    }
    return sharedMap.get(key);
  };

  const toColumnName = (index) => {
    let n = index + 1;
    let result = '';
    while (n > 0) {
      const rem = (n - 1) % 26;
      result = String.fromCharCode(65 + rem) + result;
      n = Math.floor((n - 1) / 26);
    }
    return result;
  };

  const buildSheetXml = (rows) => {
    const sheetRows = rows.map((row, rowIndex) => {
      const cells = row.map((cell, colIndex) => {
        const ref = `${toColumnName(colIndex)}${rowIndex + 1}`;
        const sharedIdx = getSharedIndex(cell);
        return `<c r="${ref}" t="s"><v>${sharedIdx}</v></c>`;
      }).join('');
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`;
  };

  const sheetEntries = sheets.map((sheet, index) => ({
    id: index + 1,
    fileName: `sheet${index + 1}.xml`,
    relId: `rId${index + 1}`,
    name: sheet.name || `Aba ${index + 1}`,
    xml: buildSheetXml(sheet.rows)
  }));

  const sharedXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">${sharedStrings.map((item) => `<si><t>${xmlEscape(item)}</t></si>`).join('')}</sst>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetEntries.map((sheet) => `<sheet name="${xmlEscape(sheet.name).slice(0, 31)}" sheetId="${sheet.id}" r:id="${sheet.relId}"/>`).join('')}</sheets></workbook>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheetEntries.map((sheet) => `<Override PartName="/xl/worksheets/${sheet.fileName}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetEntries.map((sheet) => `<Relationship Id="${sheet.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/${sheet.fileName}"/>`).join('')}<Relationship Id="rId${sheetEntries.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`;

  const files = [
    { name: '[Content_Types].xml', content: contentTypesXml },
    { name: '_rels/.rels', content: relsXml },
    { name: 'xl/workbook.xml', content: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
    ...sheetEntries.map((sheet) => ({ name: `xl/worksheets/${sheet.fileName}`, content: sheet.xml })),
    { name: 'xl/sharedStrings.xml', content: sharedXml }
  ];

  const crc32 = (bytes) => {
    let crc = -1;
    for (let i = 0; i < bytes.length; i += 1) {
      crc ^= bytes[i];
      for (let j = 0; j < 8; j += 1) {
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ -1) >>> 0;
  };

  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const crc = crc32(dataBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, dataBytes.length, true);
    localView.setUint32(22, dataBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, dataBytes.length, true);
    centralView.setUint32(24, dataBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + dataBytes.length;
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);

  return new Blob([...localParts, ...centralParts, endRecord], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

const downloadSimpleXlsx = (sheets, filename) => {
  const blob = buildSimpleXlsxBlob(sheets);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

function InventoryModulePage({ inventoryConfigs, selectedInventoryId }) {
  const availableInventories = inventoryConfigs && inventoryConfigs.length > 0 ? inventoryConfigs : DEFAULT_INVENTORY_CONFIGS;
  const [selectedSheetId, setSelectedSheetId] = useState('');
  const [sheetMeta, setSheetMeta] = useState({ location: 'Recife', month: 'Fevereiro', year: new Date().getFullYear().toString() });
  const [rowsBySheet, setRowsBySheet] = useState({});
  const [scanInput, setScanInput] = useState('');
  const [scanFeedback, setScanFeedback] = useState('');

  const selectedInventory = availableInventories.find((item) => item.id === selectedInventoryId) || availableInventories[0];
  const sheets = useMemo(() => normalizeInventorySheets(selectedInventory), [selectedInventory]);
  const selectedSheet = sheets.find((sheet) => sheet.id === selectedSheetId) || sheets[0];
  const columns = selectedSheet?.columns || INVENTORY_FALLBACK_COLUMNS;

  useEffect(() => {
    const currentSheetId = selectedSheet?.id || '';
    if (currentSheetId && currentSheetId !== selectedSheetId) {
      setSelectedSheetId(currentSheetId);
    }
  }, [selectedSheet, selectedSheetId]);

  useEffect(() => {
    if (!selectedInventory) return;
    setRowsBySheet((prev) => {
      const nextRows = {};
      sheets.forEach((sheet) => {
        const emptyRow = Object.fromEntries((sheet.columns || INVENTORY_FALLBACK_COLUMNS).map((column) => [column, '']));
        nextRows[sheet.id] = prev[sheet.id] && prev[sheet.id].length > 0
          ? prev[sheet.id]
          : Array.from({ length: 10 }, () => ({ ...emptyRow }));
      });
      return nextRows;
    });
  }, [selectedInventory, sheets]);

  const rows = rowsBySheet[selectedSheet?.id] || [];

  const notebookColumnAliases = {
    status: ['status'],
    marca: ['marca'],
    modelo: ['modelo'],
    processador: ['processador', 'cpu'],
    patrimonio: ['patrimonio'],
    serviceTag: ['servicetag', 'service_tag', 'service'],
    observacao: ['observacao', 'observacoes', 'obs']
  };

  const normalizeColumnKey = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const findColumnName = (aliases) => {
    const normalizedColumns = columns.map((col) => ({ original: col, normalized: normalizeColumnKey(col) }));
    return normalizedColumns.find((col) => aliases.some((alias) => col.normalized.includes(alias)))?.original;
  };

  const applyNotebookScanToSheet = (scanData) => {
    if (!selectedSheet?.id) return false;

    const mappedColumns = {
      status: findColumnName(notebookColumnAliases.status),
      marca: findColumnName(notebookColumnAliases.marca),
      modelo: findColumnName(notebookColumnAliases.modelo),
      processador: findColumnName(notebookColumnAliases.processador),
      patrimonio: findColumnName(notebookColumnAliases.patrimonio),
      serviceTag: findColumnName(notebookColumnAliases.serviceTag),
      observacao: findColumnName(notebookColumnAliases.observacao)
    };

    const hasMinimalColumns = mappedColumns.patrimonio && mappedColumns.serviceTag;
    if (!hasMinimalColumns) {
      setScanFeedback('Não foi possível mapear as colunas de Patrimônio/ServiceTag nesta página.');
      return false;
    }

    setRowsBySheet((prev) => {
      const targetRows = [...(prev[selectedSheet.id] || [])];
      const patrimonioColumn = mappedColumns.patrimonio;
      const serviceTagColumn = mappedColumns.serviceTag;

      const existingIndex = targetRows.findIndex((row) =>
        (row[patrimonioColumn] || '').toUpperCase() === scanData.patrimonio &&
        (row[serviceTagColumn] || '').toUpperCase() === scanData.serviceTag
      );

      const firstEmptyIndex = targetRows.findIndex((row) => !row[patrimonioColumn] && !row[serviceTagColumn]);
      const targetIndex = existingIndex >= 0 ? existingIndex : (firstEmptyIndex >= 0 ? firstEmptyIndex : targetRows.length);
      const baseRow = targetRows[targetIndex] || Object.fromEntries(columns.map((column) => [column, '']));
      const updatedRow = { ...baseRow };

      Object.entries(mappedColumns).forEach(([key, columnName]) => {
        if (!columnName) return;
        updatedRow[columnName] = scanData[key] || '';
      });

      targetRows[targetIndex] = updatedRow;
      return { ...prev, [selectedSheet.id]: targetRows };
    });

    setScanFeedback('Etiqueta lida com sucesso e dados inseridos no inventário.');
    return true;
  };

  const handleScanSubmit = (e) => {
    e.preventDefault();
    const parsed = parseNotebookBarcodeValue(scanInput);
    if (!parsed) {
      setScanFeedback('Código inválido. Use uma etiqueta de notebook no padrão NB/...');
      return;
    }

    const inserted = applyNotebookScanToSheet(parsed);
    if (inserted) setScanInput('');
  };

  const updateRowValue = (rowIndex, columnName, value) => {
    setRowsBySheet((prev) => ({
      ...prev,
      [selectedSheet.id]: (prev[selectedSheet.id] || []).map((row, idx) => (idx === rowIndex ? { ...row, [columnName]: value } : row))
    }));
  };

  const addRow = () => {
    const emptyRow = Object.fromEntries(columns.map((column) => [column, '']));
    setRowsBySheet((prev) => ({
      ...prev,
      [selectedSheet.id]: [...(prev[selectedSheet.id] || []), emptyRow]
    }));
  };

  const exportXlsx = () => {
    if (!selectedInventory) return;
    const title = `${selectedInventory.name} - ${sheetMeta.location} - ${sheetMeta.month} - ${sheetMeta.year}`;
    const xlsxSheets = sheets.map((sheet) => {
      const sheetRows = rowsBySheet[sheet.id] || [];
      return {
        name: `${sheet.name} - ${sheetMeta.month} ${sheetMeta.year}`.slice(0, 31),
        rows: [sheet.columns, ...sheetRows.map((row) => sheet.columns.map((column) => row[column] || ''))]
      };
    });

    downloadSimpleXlsx(xlsxSheets, `${title.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="h-full overflow-y-auto custom-scroll bg-gradient-to-b from-slate-50/90 to-slate-100/60 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{selectedInventory?.name || 'Gerador de Inventários'}</h2>
          <p className="text-slate-500 mt-2">Monte inventários em tempo real, com páginas separadas como na Emissão Dinâmica, visualize ao lado e exporte em XLSX.</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Localidade</label>
              <input value={sheetMeta.location} onChange={(e) => setSheetMeta({ ...sheetMeta, location: e.target.value })} className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-slate-50/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Mês</label>
              <input value={sheetMeta.month} onChange={(e) => setSheetMeta({ ...sheetMeta, month: e.target.value })} className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-slate-50/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Ano</label>
              <input value={sheetMeta.year} onChange={(e) => setSheetMeta({ ...sheetMeta, year: e.target.value })} className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-slate-50/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" />
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Páginas do inventário</p>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {sheets.map((sheet, idx) => (
                <button
                  key={sheet.id}
                  type="button"
                  onClick={() => setSelectedSheetId(sheet.id)}
                  className={`rounded-xl border p-3 text-left transition-all ${selectedSheet?.id === sheet.id ? 'border-blue-400 bg-blue-50/70 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{sheet.name}</div>
                      <div className="text-xs text-slate-500">{(sheet.columns || []).length} colunas</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleScanSubmit} className="mt-5 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">Leitura por código de barras (Notebook)</p>
            <div className="flex flex-col md:flex-row gap-2">
              <input
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                className="flex-1 border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                placeholder="Escaneie a etiqueta NB/... aqui"
              />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">Inserir pela leitura</button>
            </div>
            {scanFeedback && <p className="text-xs text-slate-600 mt-2">{scanFeedback}</p>}
          </form>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Dados · {selectedSheet?.name}</h3>
            <div className="overflow-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    {columns.map((column) => <th key={column} className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">{column}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rows.map((row, rowIdx) => (
                    <tr key={`row-${rowIdx}`}>
                      {columns.map((column) => (
                        <td key={`${column}-${rowIdx}`} className="px-2 py-1.5">
                          <input value={row[column] || ''} onChange={(e) => updateRowValue(rowIdx, column, e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none" placeholder={`${column}...`} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={addRow} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Adicionar linha</button>
              <button type="button" onClick={exportXlsx} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">Gerar planilha XLSX</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">Live Preview</p>
              <h3 className="text-lg font-semibold text-slate-900">{selectedInventory?.name} · {selectedSheet?.name} · {sheetMeta.location} · {sheetMeta.month}/{sheetMeta.year}</h3>
              <p className="text-xs text-slate-500 mt-1">Visual no estilo planilha para conferência antes da exportação.</p>
            </div>

            <div className="overflow-auto rounded-lg border border-slate-300">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-200">
                    {columns.map((column) => <th key={`preview-${column}`} className="px-3 py-2 border border-slate-300 text-left font-semibold text-slate-800">{column}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={`preview-row-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      {columns.map((column) => <td key={`preview-${idx}-${column}`} className="px-3 py-2 border border-slate-200 text-slate-700">{row[column] || '-'}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function ImeiBarcodePage() {
  const [rawInput, setRawInput] = useState('');
  const [labelPrefix, setLabelPrefix] = useState('');

  const imeis = useMemo(() => {
    const tokens = rawInput
      .split(/[\s,;]+/)
      .map((item) => item.replace(/\D/g, ''))
      .filter(Boolean);

    const unique = [];
    const seen = new Set();
    tokens.forEach((imei) => {
      if (imei.length === 15 && !seen.has(imei)) {
        seen.add(imei);
        unique.push(imei);
      }
    });
    return unique;
  }, [rawInput]);

  const invalidCount = useMemo(() => {
    return rawInput
      .split(/[\s,;]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => item.replace(/\D/g, '').length !== 15).length;
  }, [rawInput]);

  const CODE39_PATTERNS = {
    '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw',
    '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
    '*': 'nwnnwnwnn'
  };

  const TAC_MODEL_MAP = {
    '35140675': 'Samsung Galaxy A34',
    '35150011': 'Samsung Galaxy A31',
    '35615011': 'Samsung Galaxy A31',
    '35615911': 'Samsung Galaxy A31',
    '35242989': 'Samsung Galaxy A33',
    '35510098': 'Samsung Galaxy A34',
    '35153727': 'Samsung Galaxy A35',
    '35854358': 'Samsung Galaxy A55'
  };

  const getModelFromImei = (imei) => {
    const tac8 = imei.slice(0, 8);
    if (TAC_MODEL_MAP[tac8]) return TAC_MODEL_MAP[tac8];

    const tac6 = imei.slice(0, 6);
    const tac6Match = Object.entries(TAC_MODEL_MAP).find(([tac]) => tac.startsWith(tac6));
    return tac6Match ? `${tac6Match[1]} (aprox.)` : 'Modelo não identificado pelo TAC';
  };

  const buildCode39Bars = (value) => {
    const encoded = `*${value}*`;
    const elements = [];
    const narrow = 2;
    const wide = narrow * 2.6;
    const height = 72;
    let x = 0;

    encoded.split('').forEach((char, charIdx) => {
      const pattern = CODE39_PATTERNS[char];
      if (!pattern) return;
      pattern.split('').forEach((item, i) => {
        const width = item === 'w' ? wide : narrow;
        const isBar = i % 2 === 0;
        if (isBar) elements.push({ x, width });
        x += width;
      });
      if (charIdx < encoded.length - 1) x += narrow;
    });

    return { width: x, height, bars: elements };
  };

  const handlePrint = () => window.print();

  return (
    <div className="h-full overflow-y-auto custom-scroll bg-gradient-to-b from-slate-50/90 to-slate-100/60 p-6 md:p-8">
      <style>{`
        @media print {
          @page { size: A4; margin: 8mm; }
          body * { visibility: hidden !important; }
          .imei-print-area, .imei-print-area * { visibility: visible !important; }
          .imei-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .imei-no-print { display: none !important; }
          .imei-print-grid {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 4mm !important;
          }
          .imei-label-card {
            width: 60mm;
            min-height: 32mm;
            border: 0.2mm solid #111827 !important;
            border-radius: 1mm !important;
            padding: 2.2mm !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .imei-barcode-svg {
            height: 13mm !important;
            image-rendering: crisp-edges;
          }
          .imei-code-text {
            font-size: 8.5pt !important;
            letter-spacing: 0.6px !important;
          }
          .imei-model-text {
            font-size: 7pt !important;
          }
        }
      `}</style>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Conversor IMEI para Código de Barras</h2>
          <p className="text-slate-500 mt-2">Cole vários IMEIs (um por linha, espaço ou vírgula), gere em lote e imprima etiquetas para leitura por scanner.</p>
          <p className="text-xs text-slate-400 mt-1">O sistema tenta identificar o modelo pelo TAC (8 primeiros dígitos do IMEI).</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 imei-no-print space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">IMEIs em lote</label>
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                className="w-full min-h-[220px] border border-slate-300 rounded-xl p-3 text-sm font-mono bg-slate-50/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                placeholder={`Digite ou cole os IMEIs aqui
Ex:
351406758023901
351500115618426`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Prefixo opcional da etiqueta</label>
              <input value={labelPrefix} onChange={(e) => setLabelPrefix(e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm bg-slate-50/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Ex: CORE / TELEFONIA" />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
              <p><strong>{imeis.length}</strong> IMEI(s) válidos para gerar.</p>
              {invalidCount > 0 && <p className="text-amber-700"><strong>{invalidCount}</strong> item(ns) ignorado(s) por não ter 15 dígitos.</p>}
            </div>

            <button type="button" onClick={handlePrint} disabled={imeis.length === 0} className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition">Imprimir códigos de barras</button>
          </div>

          <div className="imei-print-area xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4 imei-no-print">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Pré-visualização</h3>
              <span className="text-xs text-slate-500">{imeis.length} etiqueta(s)</span>
            </div>

            {imeis.length === 0 ? (
              <div className="text-center text-slate-500 border border-dashed border-slate-300 rounded-xl py-20">Nenhum IMEI válido para gerar código de barras.</div>
            ) : (
              <div className="imei-print-grid grid grid-cols-1 sm:grid-cols-2 gap-4">
                {imeis.map((imei) => {
                  const barcode = buildCode39Bars(imei);
                  const deviceModel = getModelFromImei(imei);
                  return (
                    <div key={imei} className="imei-label-card border border-slate-300 rounded-lg p-3 bg-white break-inside-avoid">
                      {labelPrefix && <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{labelPrefix}</p>}
                      <p className="text-xs text-slate-600 mb-2">IMEI</p>
                      <svg width="100%" viewBox={`0 0 ${barcode.width} ${barcode.height}`} preserveAspectRatio="none" className="imei-barcode-svg h-16 bg-white">
                        {barcode.bars.map((bar, idx) => (
                          <rect key={`${imei}-bar-${idx}`} x={bar.x} y="0" width={bar.width} height={barcode.height} fill="#111827" />
                        ))}
                      </svg>
                      <p className="imei-code-text text-center font-mono text-xs tracking-wider text-slate-800 mt-2">{imei}</p>
                      <p className="imei-model-text text-center text-[11px] text-slate-500 mt-1">{deviceModel}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


function NotebookInventoryLabelPage({ inventoryConfigs, selectedInventoryId }) {
  const availableInventories = inventoryConfigs && inventoryConfigs.length > 0 ? inventoryConfigs : DEFAULT_INVENTORY_CONFIGS;
  const selectedInventory = availableInventories.find((item) => item.id === selectedInventoryId) || availableInventories.find((item) => item.name.toLowerCase().includes('notebook')) || availableInventories[0];

  const [form, setForm] = useState({ status: '', marca: '', modelo: '', processador: '', patrimonio: '', serviceTag: '', observacao: '' });
  const [batchInput, setBatchInput] = useState('');
  const [labels, setLabels] = useState([]);

  const CODE39_PATTERNS = {
    '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw',
    '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
    A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn', F: 'nnwnwwnnn',
    G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn', K: 'wnnnnnnww', L: 'nnwnnnnww',
    M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn', P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn',
    S: 'nnwnnnwwn', T: 'nnnnwnwwn', U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw',
    Y: 'wwnnwnnnn', Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn',
    '$': 'nwnwnwnnn', '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn', '*': 'nwnnwnwnn'
  };

  const buildCode39Bars = (value) => {
    const encoded = `*${value}*`;
    const elements = [];
    const narrow = 1.6;
    const wide = narrow * 2.4;
    const height = 68;
    let x = 0;

    encoded.split('').forEach((char, charIdx) => {
      const pattern = CODE39_PATTERNS[char] || CODE39_PATTERNS[' '];
      pattern.split('').forEach((item, i) => {
        const width = item === 'w' ? wide : narrow;
        const isBar = i % 2 === 0;
        if (isBar) elements.push({ x, width });
        x += width;
      });
      if (charIdx < encoded.length - 1) x += narrow;
    });

    return { width: x, height, bars: elements };
  };

  const addLabel = (entry) => {
    if (!entry.patrimonio || !entry.serviceTag) return;
    const payload = { ...entry, barcodeValue: buildNotebookBarcodeValue(entry), id: `${entry.patrimonio}-${entry.serviceTag}-${Date.now()}` };
    setLabels((prev) => [payload, ...prev]);
  };

  const handleAddSingle = () => {
    addLabel(form);
    setForm({ status: '', marca: '', modelo: '', processador: '', patrimonio: '', serviceTag: '', observacao: '' });
  };

  const handleBatchAdd = () => {
    const lines = batchInput.split('\n').map((line) => line.trim()).filter(Boolean);
    const parsed = lines.map((line) => {
      const [status = '', marca = '', modelo = '', processador = '', patrimonio = '', serviceTag = '', observacao = ''] = line.split(';').map((v) => v.trim());
      return { status, marca, modelo, processador, patrimonio, serviceTag, observacao };
    });
    parsed.forEach(addLabel);
    setBatchInput('');
  };

  return (
    <div className="h-full overflow-y-auto custom-scroll bg-gradient-to-b from-slate-50/90 to-slate-100/60 p-6 md:p-8">
      <style>{`
        @media print {
          @page { size: A4; margin: 6mm; }
          body * { visibility: hidden !important; }
          .nb-print-area, .nb-print-area * { visibility: visible !important; }
          .nb-print-area { position: absolute; left: 0; top: 0; width: 100%; background: #fff !important; }
          .nb-no-print { display: none !important; }
          .nb-print-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 4mm !important; }
          .nb-label-card { width: 92mm; min-height: 48mm; border: 0.25mm solid #111827 !important; border-radius: 1mm !important; padding: 2.5mm !important; page-break-inside: avoid; }
          .nb-barcode-svg { height: 14mm !important; image-rendering: crisp-edges; }
        }
      `}</style>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Etiquetas de Notebooks com Código de Barras</h2>
          <p className="text-slate-500 mt-2">Crie etiquetas completas para inventário e gere um código único para leitura rápida no sistema.</p>
          <p className="text-xs text-slate-400 mt-1">Formato do lote: Status;Marca;Modelo;Processador;Patrimônio;Service Tag;Observação</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 nb-no-print">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{selectedInventory?.name || 'Inventário de Notebooks'}</p>
            <div className="grid grid-cols-1 gap-2">
              {['status','marca','modelo','processador','patrimonio','serviceTag','observacao'].map((field) => (
                <input key={field} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50/70 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none" placeholder={field === 'serviceTag' ? 'Service Tag' : field.charAt(0).toUpperCase() + field.slice(1)} />
              ))}
            </div>
            <button type="button" onClick={handleAddSingle} className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition">Adicionar etiqueta</button>

            <textarea value={batchInput} onChange={(e) => setBatchInput(e.target.value)} className="w-full min-h-[130px] border border-slate-300 rounded-lg p-3 text-xs font-mono bg-slate-50/70 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none" placeholder="Status;Marca;Modelo;Processador;Patrimônio;Service Tag;Observação" />
            <button type="button" onClick={handleBatchAdd} className="w-full bg-slate-800 text-white font-semibold py-2.5 rounded-lg hover:bg-slate-900 transition">Adicionar lote</button>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p><strong>{labels.length}</strong> etiqueta(s) pronta(s).</p>
            </div>
            <button type="button" onClick={() => window.print()} disabled={labels.length === 0} className="w-full bg-emerald-600 text-white font-semibold py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition">Imprimir etiquetas</button>
          </div>

          <div className="nb-print-area xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4 nb-no-print">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Pré-visualização de etiquetas</h3>
              <span className="text-xs text-slate-500">{labels.length} etiquetas</span>
            </div>

            {labels.length === 0 ? (
              <div className="text-center text-slate-500 border border-dashed border-slate-300 rounded-xl py-24">Adicione dados para gerar etiquetas de notebook.</div>
            ) : (
              <div className="nb-print-grid grid grid-cols-1 sm:grid-cols-2 gap-4">
                {labels.map((item) => {
                  const barcode = buildCode39Bars(item.barcodeValue);
                  return (
                    <div key={item.id} className="nb-label-card border border-slate-300 rounded-lg p-3 bg-white break-inside-avoid">
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-700">
                        <p><strong>Status:</strong> {item.status || '-'}</p>
                        <p><strong>Marca:</strong> {item.marca || '-'}</p>
                        <p><strong>Modelo:</strong> {item.modelo || '-'}</p>
                        <p><strong>Processador:</strong> {item.processador || '-'}</p>
                        <p><strong>Patrimônio:</strong> {item.patrimonio || '-'}</p>
                        <p><strong>Service Tag:</strong> {item.serviceTag || '-'}</p>
                        <p className="col-span-2"><strong>Observação:</strong> {item.observacao || '-'}</p>
                      </div>
                      <svg width="100%" viewBox={`0 0 ${barcode.width} ${barcode.height}`} preserveAspectRatio="none" className="nb-barcode-svg h-16 bg-white mt-2">
                        {barcode.bars.map((bar, idx) => (
                          <rect key={`${item.id}-bar-${idx}`} x={bar.x} y="0" width={bar.width} height={barcode.height} fill="#111827" />
                        ))}
                      </svg>
                      <p className="text-center font-mono text-[10px] tracking-wide text-slate-700 mt-1">{item.barcodeValue}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ user, onLogout, users, setUsers, templates, setTemplates, tagsConfig, setTagsConfig, delimiters, setDelimiters, changelog, setChangelog, toolsConfig, setToolsConfig, systemSettings, cepMappings, inventoryConfigs }) {
  const [activePage, setActivePage] = useState('Home');
  const [activeSubPage, setActiveSubPage] = useState(null); 
  const [expandedMenu, setExpandedMenu] = useState({ geradores: true, inventarios: true });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeInventoryId, setActiveInventoryId] = useState((inventoryConfigs && inventoryConfigs[0]?.id) || DEFAULT_INVENTORY_CONFIGS[0]?.id || '');
  const toggleMenu = (key) => setExpandedMenu(prev => ({ ...prev, [key]: !prev[key] }));
  const hasAccess = (toolKey) => {
      const tool = toolsConfig[toolKey];
      if (!tool || !tool.active) return false;
      return user.role === 'admin' || user.permissions.includes('all') || user.permissions.includes(toolKey);
  };
  const hasAdminAccess = user.role === 'admin' || user.permissions.includes('all');


  useEffect(() => {
    const availableInventories = inventoryConfigs && inventoryConfigs.length > 0 ? inventoryConfigs : DEFAULT_INVENTORY_CONFIGS;
    if (!availableInventories.some((item) => item.id === activeInventoryId)) {
      setActiveInventoryId(availableInventories[0]?.id || '');
    }
  }, [inventoryConfigs, activeInventoryId]);

  const currentTool = activePage !== 'Home' && activePage !== 'Admin' && activePage !== 'LAPS' && activePage !== 'Inventories' && activePage !== 'IMEIBarcode' && activePage !== 'NotebookLabels' ? toolsConfig[activePage] : null;

  return (
    <div className="flex w-screen h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 font-sans text-slate-800 overflow-hidden relative">
      <style>{`.custom-scroll::-webkit-scrollbar { width: 8px; height: 8px; } .custom-scroll::-webkit-scrollbar-track { background: transparent; } .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; border: 2px solid transparent; background-clip: padding-box; } .custom-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; border: 2px solid transparent; background-clip: padding-box; } .inset-shadow { box-shadow: inset 0 2px 10px 0 rgba(0,0,0,0.05); } @media print { .no-print { display: none !important; } }`}</style>
      
      {/* Mobile Toggle */}
      <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden absolute top-4 left-4 z-50 text-white bg-slate-900 p-2 rounded shadow-lg border border-slate-700">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>

      {/* Sidebar ERP Style */}
      <aside className={`fixed md:relative w-72 bg-slate-900/95 backdrop-blur text-slate-300 flex flex-col flex-shrink-0 z-40 shadow-2xl no-print h-full transition-transform transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
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

            <button onClick={() => { setActivePage('LAPS'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${activePage === 'LAPS' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
              <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 .552-.447 1-1 1a1 1 0 01-1-1V9a2 2 0 114 0v2a5 5 0 11-10 0V9a6 6 0 1112 0v2a7 7 0 11-14 0V9" /></svg>
              Leitor de Senha LAPS
            </button>

            <button onClick={() => { setActivePage('IMEIBarcode'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${activePage === 'IMEIBarcode' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'}`}>
              <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h1m2 0h1m2 0h1m2 0h1m2 0h1m2 0h1M4 12h1m2 0h1m2 0h1m2 0h1m2 0h1m2 0h1M4 17h1m2 0h1m2 0h1m2 0h1m2 0h1m2 0h1" /></svg>
              IMEI para Código de Barras
            </button>

            <div>
              <button onClick={() => toggleMenu('inventarios')} className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
                <span className="flex items-center gap-3">
                  <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6m3 6V7m3 10v-4m3 8H6a2 2 0 01-2-2V5a2 2 0 012-2h9.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Inventários
                </span>
                <svg className={`w-3 h-3 text-slate-500 transition-transform ${expandedMenu.inventarios ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {expandedMenu.inventarios && (
                <div className="pl-10 pr-2 space-y-1 mt-1 border-l border-slate-800 ml-5 py-1">
                  {(inventoryConfigs && inventoryConfigs.length > 0 ? inventoryConfigs : DEFAULT_INVENTORY_CONFIGS).map((inventory) => {
                    const isNotebook = inventory.name.toLowerCase().includes('notebook');
                    return (
                      <div key={inventory.id} className="space-y-1">
                        <button
                          onClick={() => { setActivePage('Inventories'); setActiveInventoryId(inventory.id); setMobileMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium transition-colors ${activePage === 'Inventories' && activeInventoryId === inventory.id ? 'bg-slate-800 text-blue-400 font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                        >
                          {inventory.name.replace('Inventário de ', '')}
                        </button>
                        {isNotebook && (
                          <button
                            onClick={() => { setActivePage('NotebookLabels'); setActiveInventoryId(inventory.id); setMobileMenuOpen(false); }}
                            className={`ml-3 w-[calc(100%-12px)] text-left px-3 py-2 rounded-md text-[11px] font-medium transition-colors ${activePage === 'NotebookLabels' ? 'bg-slate-800 text-emerald-300 font-semibold' : 'text-slate-500 hover:text-white hover:bg-slate-800/50'}`}
                          >
                            Etiquetas (código de barras)
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <>
              <div className="pt-4 pb-1">
                  <span className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sistema</span>
              </div>
              <button
                onClick={() => { if (!hasAdminAccess) return; setActivePage('Admin'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${activePage === 'Admin' ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : hasAdminAccess ? 'hover:bg-slate-800 hover:text-white' : 'text-slate-600 cursor-not-allowed'}`}
                title={hasAdminAccess ? 'Abrir Painel Administrativo' : 'Acesso restrito a administradores'}
              >
                <svg className="w-5 h-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Painel Administrativo
              </button>
              </>
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
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-transparent relative">
        
        {/* Dynamic Context Header (Se estiver dentro de um módulo) */}
        {currentTool && (
            <header className="h-16 bg-white/90 backdrop-blur border-b border-slate-200 px-8 flex items-center justify-between flex-shrink-0">
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
            {activePage === 'Home' && (
              <div className="absolute top-4 right-6 hidden lg:flex items-center gap-2 text-xs text-slate-500 bg-white/90 border border-slate-200 rounded-full px-3 py-1 shadow-sm">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                Ambiente sincronizado
              </div>
            )}
            {activePage === 'Admin' && <AdminPanel users={users} setUsers={setUsers} templates={templates} setTemplates={setTemplates} tagsConfig={tagsConfig} setTagsConfig={setTagsConfig} delimiters={delimiters} setDelimiters={setDelimiters} changelog={changelog} setChangelog={setChangelog} toolsConfig={toolsConfig} setToolsConfig={setToolsConfig} systemSettings={systemSettings} cepMappings={cepMappings} inventoryConfigs={inventoryConfigs} />}
            {activePage === 'LAPS' && <LapsReaderPage />}
            {activePage === 'IMEIBarcode' && <ImeiBarcodePage />}
            {activePage === 'NotebookLabels' && <NotebookInventoryLabelPage inventoryConfigs={inventoryConfigs} selectedInventoryId={activeInventoryId} />}
            {activePage === 'Inventories' && <InventoryModulePage inventoryConfigs={inventoryConfigs} selectedInventoryId={activeInventoryId} />}
            
            {/* Dynamic Generator Routing Logic */}
            {currentTool && currentTool?.subTypes?.length > 0 && !activeSubPage && (
                <div className="h-full overflow-y-auto custom-scroll bg-gradient-to-b from-slate-50/80 to-slate-100/60 p-6 md:p-10">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-8 md:mb-10">
                            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                              {currentTool.subTypes.length} variação{currentTool.subTypes.length > 1 ? 'ões' : ''} disponível{currentTool.subTypes.length > 1 ? 'eis' : ''}
                            </span>
                            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mt-4">Seleção de Variável</h2>
                            <p className="text-slate-500 mt-2 max-w-2xl mx-auto">Este módulo possui múltiplas rotinas. Escolha abaixo o escopo operacional para continuar.</p>
                        </div>

                        <div
                          className="grid gap-4 md:gap-6"
                          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}
                        >
                            {currentTool.subTypes.map((sub, idx) => (
                                <button
                                    key={sub.id}
                                    onClick={() => setActiveSubPage(sub.id)}
                                    className="bg-white/95 backdrop-blur p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-lg hover:-translate-y-0.5 transition-all text-left flex items-start gap-4 group"
                                >
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Variável {idx + 1}</p>
                                        <h3 className="font-semibold text-slate-900 text-lg leading-snug group-hover:text-blue-700 transition-colors break-words">{sub.label}</h3>
                                        
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="text-center mt-10">
                          <button onClick={() => setActivePage('Home')} className="text-sm font-medium text-slate-500 hover:text-slate-800 underline underline-offset-4">← Retornar à Visão Geral</button>
                        </div>
                    </div>
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



export { SafePreview, LoginPage, HomePage, AdminPanel, DynamicGenerator, Dashboard };
