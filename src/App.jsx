import { useEffect, useState } from 'react';
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
} from './core/defaults';

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
      const loaded = []; snap.forEach((doc) => loaded.push(doc.data()));
      if (loaded.length === 0) DEFAULT_USERS.forEach((u) => setDoc(getDocRef('users', u.id), u));
      else setUsers(loaded);
    }, () => {});
    const unsubTemplates = onSnapshot(getCollectionRef('templates'), (snap) => {
      const loaded = {}; snap.forEach((doc) => { loaded[doc.id] = doc.data(); }); setTemplates(loaded);
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
        setTagsConfig(migrated);
      }
    }, () => {});
    const unsubSettings = onSnapshot(getCollectionRef('settings'), (snap) => {
      snap.forEach((doc) => {
        if (doc.id === 'delimiters') setDelimiters(doc.data());
        if (doc.id === 'tools') setToolsConfig(doc.data());
        if (doc.id === 'config') setSystemSettings(doc.data());
        if (doc.id === 'cepMappings') setCepMappings(doc.data().list || []);
      });
      if (snap.empty) {
        setDoc(getDocRef('settings', 'tools'), DEFAULT_TOOLS_CONFIG);
      }
    });
    const unsubChangelog = onSnapshot(getCollectionRef('changelog'), (snap) => {
      const loaded = []; snap.forEach((doc) => loaded.push(doc.data()));
      if (loaded.length === 0) DEFAULT_CHANGELOG.forEach((l) => setDoc(getDocRef('changelog', l.id), l));
      else setChangelog(loaded.sort((a, b) => b.id - a.id));
    }, () => {});
    return () => { unsubUsers(); unsubTemplates(); unsubTags(); unsubSettings(); unsubChangelog(); };
  }, [dbReady]);

  return user
    ? <Dashboard user={user} onLogout={() => setUser(null)} users={users} setUsers={setUsers} templates={templates} setTemplates={setTemplates} tagsConfig={tagsConfig} setTagsConfig={setTagsConfig} delimiters={delimiters} setDelimiters={setDelimiters} changelog={changelog} setChangelog={setChangelog} toolsConfig={toolsConfig} setToolsConfig={setToolsConfig} systemSettings={systemSettings} cepMappings={cepMappings} />
    : <LoginPage onLogin={setUser} users={users} dbReady={dbReady} systemSettings={systemSettings} />;
}
