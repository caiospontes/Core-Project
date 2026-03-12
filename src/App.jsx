import { useCallback, useEffect, useMemo, useState } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { onSnapshot, setDoc } from 'firebase/firestore';

import { auth, getCollectionRef, getDocRef } from './core/firebase';
import { LoginPage, Dashboard } from './core/components';
import {
  DEFAULT_USERS,
  DEFAULT_DELIMITERS,
  DEFAULT_CHANGELOG,
  DEFAULT_TOOLS_CONFIG,
  DEFAULT_TAGS_WITH_SESSIONS,
  DEFAULT_INVENTORY_CONFIGS,
} from './core/defaults';


const isSameJSON = (a, b) => {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [sessionUserId, setSessionUserId] = useState(null);

  const [users, setUsers] = useState(DEFAULT_USERS);

  useEffect(() => {
    const session = localStorage.getItem('core_session_user');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed?.id && Number(parsed?.exp || 0) > Date.now()) setSessionUserId(parsed.id);
        else localStorage.removeItem('core_session_user');
      } catch {
        localStorage.removeItem('core_session_user');
      }
    }

    document.title = 'CORE ERP | Operações';
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = 'https://midias-tdw.totvs.com/wp-content/uploads/2025/06/favicon-bg-light-192x192-1.png';
  }, []);

  const [templates, setTemplates] = useState({});
  const [tagsConfig, setTagsConfig] = useState(DEFAULT_TAGS_WITH_SESSIONS);
  const [delimiters, setDelimiters] = useState(DEFAULT_DELIMITERS);
  const [changelog, setChangelog] = useState([]);
  const [toolsConfig, setToolsConfig] = useState(DEFAULT_TOOLS_CONFIG);
  const [systemSettings, setSystemSettings] = useState({ devBypass: false });
  const [cepMappings, setCepMappings] = useState([]);
  const [correiosPresets, setCorreiosPresets] = useState([]);
  const [inventoryConfigs, setInventoryConfigs] = useState(DEFAULT_INVENTORY_CONFIGS);
  const [dbReady, setDbReady] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  useEffect(() => {
    if (user?.id) {
      const exp = Date.now() + (8 * 60 * 60 * 1000);
      localStorage.setItem('core_session_user', JSON.stringify({ id: user.id, exp }));
    } else {
      localStorage.removeItem('core_session_user');
    }
  }, [user]);

  useEffect(() => {
    if (!sessionUserId || !users?.length) return;
    const matched = users.find((u) => u.id === sessionUserId && u.active);
    if (matched) setUser(matched);
    setSessionUserId(null);
  }, [sessionUserId, users]);

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
    setInitialDataLoaded(false);
    const loadState = {
      users: false,
      templates: false,
      tags: false,
      settings: false,
      changelog: false,
    };
    const markLoaded = (key) => {
      loadState[key] = true;
      if (Object.values(loadState).every(Boolean)) setInitialDataLoaded(true);
    };

    const unsubUsers = onSnapshot(getCollectionRef('users'), (snap) => {
      const loaded = []; snap.forEach((doc) => loaded.push(doc.data()));
      if (loaded.length === 0) DEFAULT_USERS.forEach((u) => setDoc(getDocRef('users', u.id), u));
      else setUsers((prev) => (isSameJSON(prev, loaded) ? prev : loaded));
      markLoaded('users');
    }, () => {});
    const unsubTemplates = onSnapshot(getCollectionRef('templates'), (snap) => {
      const loaded = {}; snap.forEach((doc) => { loaded[doc.id] = doc.data(); });
      setTemplates((prev) => (isSameJSON(prev, loaded) ? prev : loaded));
      markLoaded('templates');
    }, () => {});
    const unsubTags = onSnapshot(getCollectionRef('tags'), (snap) => {
      const loaded = {}; snap.forEach((doc) => { loaded[doc.id] = doc.data(); });
      if (Object.keys(loaded).length === 0) {
        Object.entries(DEFAULT_TAGS_WITH_SESSIONS).forEach(([k, v]) => setDoc(getDocRef('tags', k), v));
      } else {
        const migrated = {};
        Object.keys(loaded).forEach((k) => {
          if (loaded[k].list) {
            migrated[k] = { sessions: [{ id: 'geral', title: 'Geral', active: true, tags: loaded[k].list }] };
          } else {
            migrated[k] = loaded[k];
          }
        });
        setTagsConfig((prev) => (isSameJSON(prev, migrated) ? prev : migrated));
      }
      markLoaded('tags');
    }, () => {});
    const unsubSettings = onSnapshot(getCollectionRef('settings'), (snap) => {
      let hasTools = false;
      let hasInventories = false;
      snap.forEach((doc) => {
        if (doc.id === 'delimiters') setDelimiters((prev) => (isSameJSON(prev, doc.data()) ? prev : doc.data()));
        if (doc.id === 'tools') { const next = doc.data(); setToolsConfig((prev) => (isSameJSON(prev, next) ? prev : next)); hasTools = true; }
        if (doc.id === 'config') { const next = doc.data(); setSystemSettings((prev) => (isSameJSON(prev, next) ? prev : next)); }
        if (doc.id === 'cepMappings') { const next = doc.data().list || []; setCepMappings((prev) => (isSameJSON(prev, next) ? prev : next)); }
        if (doc.id === 'correiosAddressBook') { const next = doc.data().list || []; setCorreiosPresets((prev) => (isSameJSON(prev, next) ? prev : next)); }
        if (doc.id === 'inventories') { const next = doc.data().list || DEFAULT_INVENTORY_CONFIGS; setInventoryConfigs((prev) => (isSameJSON(prev, next) ? prev : next)); hasInventories = true; }
      });
      if (!hasTools) setDoc(getDocRef('settings', 'tools'), DEFAULT_TOOLS_CONFIG);
      if (!hasInventories) setDoc(getDocRef('settings', 'inventories'), { list: DEFAULT_INVENTORY_CONFIGS });
      markLoaded('settings');
    });
    const unsubChangelog = onSnapshot(getCollectionRef('changelog'), (snap) => {
      const loaded = []; snap.forEach((doc) => loaded.push(doc.data()));
      if (loaded.length === 0) DEFAULT_CHANGELOG.forEach((l) => setDoc(getDocRef('changelog', l.id), l));
      else {
        const sorted = loaded.sort((a, b) => b.id - a.id);
        setChangelog((prev) => (isSameJSON(prev, sorted) ? prev : sorted));
      }
      markLoaded('changelog');
    }, () => {});
    return () => { unsubUsers(); unsubTemplates(); unsubTags(); unsubSettings(); unsubChangelog(); };
  }, [dbReady]);

  const handleLogout = useCallback(() => setUser(null), []);

  const dashboardProps = useMemo(() => ({
    user,
    onLogout: handleLogout,
    users,
    setUsers,
    templates,
    setTemplates,
    tagsConfig,
    setTagsConfig,
    delimiters,
    setDelimiters,
    changelog,
    setChangelog,
    toolsConfig,
    setToolsConfig,
    systemSettings,
    cepMappings,
    correiosPresets,
    inventoryConfigs,
  }), [user, handleLogout, users, templates, tagsConfig, delimiters, changelog, toolsConfig, systemSettings, cepMappings, correiosPresets, inventoryConfigs]);

  if (user && !initialDataLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(circle_at_12%_8%,rgba(59,130,246,0.14)_0,transparent_38%),radial-gradient(circle_at_82%_18%,rgba(139,92,246,0.16)_0,transparent_34%),linear-gradient(145deg,#f3f7ff_0%,#edf4ff_35%,#eaf3ff_100%)]">
        <div className="glass-panel rounded-2xl px-8 py-6 border border-indigo-100 text-center shadow-xl">
          <p className="text-sm font-semibold text-slate-700">Sincronizando dados do ambiente...</p>
          <p className="text-xs text-slate-500 mt-1">Carregando módulos, templates e configurações.</p>
        </div>
      </div>
    );
  }

  return user
    ? <Dashboard {...dashboardProps} />
    : <LoginPage onLogin={setUser} users={users} dbReady={dbReady} systemSettings={systemSettings} />;
}
