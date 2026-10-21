/* eslint-disable react-hooks/exhaustive-deps */
/* ===== SpareXchange React app (app.js) ===== */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://script.google.com/macros/s/AKfycbxDtXUJk4HQ5nyP55C3C9QE0WeoRmPJW05gd2J60DZdyqhRTab6MZsAN0hKlfZAhoCkJA/exec';
const CUR = '₹';
// Edit these company details shown on the Home page
const COMPANY = { name: 'SpareXchange', email: 'support@sparexchange.com', phone: '+91 00000 00000', address: 'Your company address, City, State, India' };
// Cloudinary (free) for photos: set REACT_APP_CLOUDINARY_CLOUD / REACT_APP_CLOUDINARY_PRESET in .env (unsigned preset)
const CLOUD = { name: process.env.REACT_APP_CLOUDINARY_CLOUD || 'dm9gg8yss', preset: process.env.REACT_APP_CLOUDINARY_PRESET || 'images' };
const compress = file => new Promise(res => {
  const img = new Image(), u = URL.createObjectURL(file);
  img.onload = () => { const k = Math.min(1, 1400 / Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(u); c.toBlob(b => res(b || file), 'image/jpeg', 0.82); };
  img.onerror = () => res(file); img.src = u;
});
async function uploadImage(file) {
  const fd = new FormData(); fd.append('file', await compress(file)); fd.append('upload_preset', CLOUD.preset);
  const r = await fetch('https://api.cloudinary.com/v1_1/' + CLOUD.name + '/image/upload', { method: 'POST', body: fd });
  const d = await r.json(); if (!r.ok) throw new Error((d.error && d.error.message) || 'Image upload failed');
  return d.secure_url;
}

/* ---------- NEW: Solutions & Resources menu data ---------- */
// section = menu it belongs to, group = column inside the menu
const mk = (section, group, slug, name, tag, icon, desc, points, extra) => Object.assign({ section, group, slug, name, tag, icon, desc, points: points || [] }, extra || {});
const ITEMS = [
  /* ---- SOLUTIONS > Product ---- */
  mk('solutions', 'Product', 'global-spare-parts-search', 'Global Spare Parts Search', 'Stop searching, start finding', '🔎',
    'Search with any information you have in any field: part numbers, descriptions, or other details to quickly find the exact part you need. No training required.',
    ['Intuitive and forgiving free-text search', 'Search across 40M+ verified original manufacturer records', 'Find parts up to 60% faster', 'Insights from your internal and external network']),
  mk('solutions', 'Product', 'automated-bom-check', 'Automated BOM Check', 'Identify what you have', '📋',
    'Shorten spare parts list processing time and avoid duplicates by identifying the parts you already have, and create new materials with original material data.',
    ['Automated spare parts list check instead of manual comparison', 'Processing time reduced by more than 50%', 'Avoid duplicates before they enter the system', 'New materials created with original manufacturer data']),
  mk('solutions', 'Product', 'data-lifecycle-management', 'Data Lifecycle Management', 'Enrich and correct your data', '🗂️',
    'Your path to MRO excellence starts with data. Deduplicate, enrich records with original manufacturer information and proactively manage discontinuations.',
    ['Duplicate detection and prevention', 'Data enrichment with trusted manufacturer information', 'Obsolescence and discontinuation management', 'Multi-site data harmonization']),
  mk('solutions', 'Product', 'material-creation-workflow', 'Digital Workflow', 'Standardize and govern your material data', '⚙️',
    'Create, update, and optimize your material data through customized processes and AI recommendations.',
    ['Material creation, change and extension workflow', 'Role-based approvals', 'Full activity timeline with discussions and approvals', 'Threaded discussions per material']),
  mk('solutions', 'Product', 'inventory-optimizer', 'Inventory Optimizer', 'Reduce excess and improve availability', '📦',
    'Right-size inventory across your plant network with recommended reorder points and min/max levels, grounded in actual consumption, lead times, and part criticality.',
    ['Recommended reorder points and min/max levels', 'Based on actual consumption, lead times and part criticality', 'Works across your whole plant network', 'Reduce excess stock and improve availability'], { badge: 'Coming soon' }),
  mk('solutions', 'Product', 'surplus-seller', 'Surplus Seller', 'Identify and sell your surplus at market rates', '💰',
    'Turn excess and obsolete spare parts into cash at market rates. Vetted partners take on your entire surplus and handle the selling, while you track every part\'s progress in the app.',
    ['Vetted partners take on your entire surplus', 'Sell at market rates', 'Track every part\'s progress in the app', 'Bring unused parts back into circulation'], { badge: 'Coming soon' }),
  /* ---- SOLUTIONS > Use Cases ---- */
  mk('solutions', 'Use Cases', 'mro-master-data-management', 'MRO Master Data Management', 'For Master Data Managers', '🧱',
    '“We have processes in place, but they don\'t really work. Messy data, legacy systems, and so much manual work just to keep things running.” Stop workarounds and implement processes that scale.',
    ['Standardized, verified material records', 'Governed creation, change and extension workflow', 'One source of truth for every plant', 'Less manual work, fewer legacy workarounds']),
  mk('solutions', 'Use Cases', 'inventory-optimization', 'MRO Inventory Optimization', 'For Operations & Maintenance leaders', '📊',
    '“Our inventory is bloated with duplicate and unused parts and yet when equipment fails, it\'s still a struggle to find the right spare.” Clean up spare parts data, bring clarity and control to your inventory, improve free cash flow, ensure uptime and align every site.',
    ['About 20% average inventory reduction', 'Eliminate duplicates and obsolescence', 'Standardize parts globally', 'Align every site on one process']),
  mk('solutions', 'Use Cases', 'mro-procurement', 'MRO Sourcing Optimization', 'For Procurement leaders', '🛒',
    '“We have been buying the same part from different suppliers at different prices.” Enable strategic procurement with better market visibility and reliable data.',
    ['Identify OEMs and alternative suppliers', 'Cross-site inventory visibility', 'Reliable data for negotiation', 'Network-wide sourcing']),
  mk('solutions', 'Use Cases', 'solving-industrial-surplus', 'Solving Industrial Surplus', 'Turn dead stock into value', '♻️',
    'Excess and obsolete spare parts tie up working capital and storage space. Find buyers for surplus and bring unused parts back into circulation.',
    ['Identify surplus and obsolete stock', 'List with photos, quantity, condition and price', 'Bid, negotiate and close the deal in chat', 'Free up working capital'], { badge: 'NEW' }),
  /* ---- SOLUTIONS > Technical ---- */
  mk('solutions', 'Technical', 'api', 'Data exchange', 'Connect your systems', '🔌',
    'Connects to any ERP or CMMS. No migration required. Your ERP stays the source of truth, the platform adds the intelligence layer on top.',
    ['Connects to any ERP or CMMS, no migration required', 'Official SAP partner with deep integration support', 'API available for custom workflows and data syncs', 'Connects to SAP, IBM Maximo and more']),
  mk('solutions', 'Technical', 'security-and-compliance', 'Security & Compliance', 'SOC2 Type II independently attested', '🛡️',
    'Security and compliance built in, with SOC2 Type II independent attestation, so your spare parts data stays protected.',
    ['SOC2 Type II independently attested', 'Role-based access and approvals', 'Full traceability of every material change', 'Admin moderation of users and listings']),
  /* ---- RESOURCES > Discover ---- */
  mk('resources', 'Discover', 'blog', 'Blog', 'Ideas for smarter spare parts management', '💡',
    'Practical articles on MRO data, inventory, sourcing and surplus.',
    ['MRO master data best practices', 'Reducing duplicate and obsolete inventory', 'Smarter sourcing of spare parts', 'Selling surplus the right way']),
  mk('resources', 'Discover', 'faqs', 'FAQs', 'Quick answers', '❓',
    'Answers to the most common questions about listing, buying, bidding and closing deals.', [],
    { faq: [['How do I post goods?', 'Sign in, open Post goods, choose the product type, fill the guided form, add photos and publish.'],
      ['Can I see prices without an account?', 'Visitors see limited details. Register for free to see price, seller phone, location and full specifications.'],
      ['How does bidding work?', 'Buy at the asking price or place your own bid. The seller can accept or decline and you can chat to negotiate.'],
      ['How do I close a deal?', 'Once the seller accepts a bid, or you buy now, the deal is recorded in Orders with buyer and seller details.'],
      ['Can I pause or edit a listing?', 'Yes. Open My listings to edit, pause, resume or delete any of your listings.']] }),
  /* ---- RESOURCES > Research ---- */
  mk('resources', 'Research', 'whitepapers', 'Whitepapers', 'In-depth research', '📑',
    'In-depth guides on building a reliable MRO data foundation.',
    ['Material master data standardization', 'Duplicate prevention at scale', 'Obsolescence management', 'Multi-site harmonization']),
  mk('resources', 'Research', 'reports', 'Reports', 'Industry benchmarks', '📈',
    'Benchmark your inventory and visibility against 362 manufacturing peers and see which value drivers most affect spend, productivity, and working capital.',
    ['Report: Unlocking cost savings in spare parts management', 'Benchmark of 362 manufacturing peers', 'Value drivers for spend, productivity and working capital']),
  /* ---- RESOURCES > Connect ---- */
  mk('resources', 'Connect', 'events', 'Events', 'Meet the team', '📅',
    'Trade fairs, conferences and community meetups. Event announcements will appear here.',
    ['Industry trade fairs', 'Maintenance and MRO conferences', 'Customer and partner meetups']),
  mk('resources', 'Connect', 'webinars', 'Webinars', 'Learn live or on demand', '🎥',
    'Live sessions and recordings on spare parts data, inventory and surplus. Webinar announcements will appear here.',
    ['Live product walkthroughs', 'Customer success stories', 'Q&A with experts'])
];
const INFO = {}; ITEMS.forEach(i => { INFO[i.slug] = i; });
const MENUS = [
  { key: 'solutions', label: 'Solutions', groups: ['Product', 'Use Cases', 'Technical'] },
  { key: 'resources', label: 'Resources', groups: ['Discover', 'Research', 'Connect'] }
];

const PATHS = { home: '/', market: '/marketplace', post: '/post', mine: '/my-listings', messages: '/messages', orders: '/orders', dash: '/admin', users: '/admin/users', forms: '/admin/forms' };
const routeFromPath = p => {
  p = (p || '/').replace(/\/+$/, '') || '/';
  let m = p.match(/^\/marketplace\/([^/]+)$/); if (m) return { page: 'item', id: decodeURIComponent(m[1]) };
  m = p.match(/^\/edit\/([^/]+)$/); if (m) return { page: 'edit', id: decodeURIComponent(m[1]) };
  m = p.match(/^\/(solutions|resources)\/([^/]+)$/); if (m) return { page: 'info', id: decodeURIComponent(m[2]) };
  return { page: Object.keys(PATHS).find(k => PATHS[k] === p) || 'home', id: '' };
};
const pathFor = (p, id) => p === 'item' ? '/marketplace/' + encodeURIComponent(id) : p === 'edit' ? '/edit/' + encodeURIComponent(id)
  : p === 'info' ? '/' + (INFO[id] ? INFO[id].section : 'solutions') + '/' + encodeURIComponent(id) : PATHS[p];
const inGS = () => !!(window.google && window.google.script && window.google.script.run);
let TOKEN = ''; try { TOKEN = localStorage.getItem('sx') || ''; } catch (e) {}
const setTok = t => { TOKEN = t; try { t ? localStorage.setItem('sx', t) : localStorage.removeItem('sx'); } catch (e) {} };
const rawCall = (action, payload) => {
  const gs = window.google && window.google.script && window.google.script.run;
  if (gs) { // running inside Apps Script
    return new Promise((res, rej) => gs.withSuccessHandler(r => r && r.ok ? res(r.data) : rej(new Error(r ? r.error : 'No response')))
      .withFailureHandler(e => rej(new Error(e.message || 'Server error'))).api(action, payload || {}, TOKEN));
  }
  // running as a normal React app: call the deployed Apps Script web app
  return fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload: payload || {}, token: TOKEN }) })
    .then(r => r.json()).then(r => { if (r && r.ok) return r.data; throw new Error(r ? r.error : 'No response'); });
};
const call = (a, p) => rawCall(a, p).catch(e => { // only a real invalid/removed session signs the user out
  if (/^Session expired/.test(e.message)) { setTok(''); window.dispatchEvent(new Event('sx-logout')); }
  throw e;
});
const money = n => CUR + Number(n || 0).toLocaleString('en-IN');
const when = t => new Date(Number(t)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const hm = t => new Date(Number(t)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const note = (m, err) => window.notify && window.notify(m, err);
const run = (p, ok) => p.then(r => { if (ok) note(ok); return r; }).catch(e => { note(e.message, true); throw e; });

/* ---------- Field renderer (dynamic forms) ---------- */
function Field({ f, v, set }) {
  const common = { value: v === undefined ? '' : v, onChange: e => set(f.key, e.target.value) };
  return (
    <div className={f.type === 'textarea' ? 'full' : ''}>
      <label>{f.label}{f.required ? ' *' : ''}</label>
      {f.type === 'select' ? (
        <select className="sel" {...common}><option value="">Select…</option>{(f.options || []).map(o => <option key={o}>{o}</option>)}</select>
      ) : f.type === 'textarea' ? <textarea className="ta" rows="3" {...common} />
        : <input className="in" type={f.type === 'number' ? 'number' : 'text'} {...common} />}
    </div>
  );
}

/* ---------- Auth modal ---------- */
function AuthModal({ mode, setMode, onDone, close }) {
  const [f, setF] = useState({}); const [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const go = () => { setBusy(true); run(call(mode === 'login' ? 'login' : 'register', f)).then(onDone).catch(() => {}).finally(() => setBusy(false)); };
  return (
    <div className="ov" onClick={close}><div className="modal" onClick={e => e.stopPropagation()}>
      <h3>{mode === 'login' ? 'Sign in' : 'Create your account'}</h3><div className="line" style={{ margin: '8px 0 18px' }} />
      <div className="form">
        {mode === 'register' && <><div className="full"><label>Full name *</label><input className="in" onChange={set('name')} /></div>
          <div className="full"><label>Company</label><input className="in" onChange={set('company')} /></div>
          <div><label>Phone *</label><input className="in" onChange={set('phone')} /></div>
          <div><label>Location</label><input className="in" onChange={set('location')} /></div></>}
        <div className="full"><label>Email *</label><input className="in" type="email" onChange={set('email')} /></div>
        <div className="full"><label>Password *</label><input className="in" type="password" onChange={set('password')} onKeyDown={e => e.key === 'Enter' && go()} /></div>
      </div>
      <div className="row" style={{ marginTop: 20, justifyContent: 'space-between' }}>
        <button className="btn" disabled={busy} onClick={go}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register'}</button>
        <button type="button" className="btn ghost sm" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'New here? Create account' : 'Have an account? Sign in'}</button>
      </div>
    </div></div>
  );
}

/* ---------- Photos: gallery + multi uploader ---------- */
function Gallery({ images, big }) {
  const [i, setI] = useState(0), [open, setOpen] = useState(false);
  const list = images || [];
  if (!list.length) return <div className="thumb">📦</div>;
  const nav = d => setI((i + d + list.length) % list.length);
  return (<div>
    <div className="gal-main" onClick={() => setOpen(true)}><img className="thumb" src={list[i]} alt="" loading="lazy" />
      {list.length > 1 && <><button className="sl prev" aria-label="Previous photo" onClick={e => { e.stopPropagation(); nav(-1); }}>‹</button><button className="sl next" aria-label="Next photo" onClick={e => { e.stopPropagation(); nav(1); }}>›</button><span className="gal-count">{i + 1}/{list.length}</span></>}</div>
    {list.length > 1 && <div className="gal-th">{list.map((u, k) => <img key={u} src={u} alt="" className={k === i ? 'on' : ''} onClick={() => setI(k)} />)}</div>}
    {open && <div className="lb" onClick={() => setOpen(false)}>
      <img src={list[i]} alt="" onClick={e => e.stopPropagation()} />
      {list.length > 1 && <><button style={{ left: 14 }} onClick={e => { e.stopPropagation(); nav(-1); }}>‹</button><button style={{ right: 14 }} onClick={e => { e.stopPropagation(); nav(1); }}>›</button></>}
      <button style={{ top: 14, right: 14 }} onClick={() => setOpen(false)}>✕</button></div>}
  </div>);
}
function ImageUploader({ images, onChange, max = 8 }) {
  const [busy, setBusy] = useState(0), [over, setOver] = useState(false), ref = useRef();
  const add = async files => {
    const list = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, max - images.length);
    if (!list.length) return;
    setBusy(b => b + list.length);
    const urls = await Promise.all(list.map(f => uploadImage(f).catch(e => { note(e.message, true); return null; }).finally(() => setBusy(b => b - 1))));
    onChange(prev => prev.concat(urls.filter(Boolean)).slice(0, max));
  };
  return (<div>
    <div className={'drop' + (over ? ' over' : '')} onClick={() => ref.current.click()}
      onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}>
      <b>Drag & drop photos here</b> or click to choose (up to {max}, multiple allowed)
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={e => { add(e.target.files); e.target.value = ''; }} /></div>
    {(images.length > 0 || busy > 0) && <div className="prev">
      {images.map((u, k) => <div key={u}><img src={u} alt="" />{k === 0 && <span className="first">Cover</span>}
        <button type="button" onClick={() => onChange(p => p.filter((_, j) => j !== k))}>✕</button></div>)}
      {Array.from({ length: busy }).map((_, k) => <div key={'b' + k}>…</div>)}</div>}
  </div>);
}

/* ---------- Home: company information ---------- */
function Home({ user, go, openAuth }) {
  const [s, setS] = useState({});
  useEffect(() => { call('pub_home').then(d => setS(d.stats)).catch(() => {}); }, []);
  const feats = [['🔎', 'Find surplus parts', 'Search motors, PLCs, bearings, pumps and more posted by other industries.'],
    ['💰', 'Turn excess into cash', 'List unused stock with photos and price. Stop paying to store dead inventory.'],
    ['🤝', 'Bid & negotiate', 'Buy at the asking price or bid your own amount and chat with the seller.'],
    ['📋', 'Structured listings', 'Product-specific forms capture model, type and specs for accurate matching.'],
    ['🛡️', 'Admin moderated', 'Admins manage users, forms and listings to keep the marketplace trustworthy.'],
    ['🤖', 'Smart assistant', 'Ask the built-in chatbot to find parts or explain how a deal works.']];
  const stat = [[s.listings, 'Live listings'], [s.users, 'Registered users'], [s.categories, 'Product categories'], [s.deals, 'Deals closed']];
  return (<>
    <section className="hero"><div className="wrap">
      <div className="tag">Industrial spare parts & excess goods marketplace</div>
      <h1>Know what you have.<br />Sell what you don’t.<br />Find what you need.</h1><div className="line" />
      <p>{COMPANY.name} connects plants, factories and workshops so surplus spare parts find a new home instead of gathering dust.</p>
      <div className="acts" style={{ display: 'flex', gap: 12, marginTop: 26, flexWrap: 'wrap' }}>
        <button className="btn pur" onClick={() => go('market')}>Browse marketplace</button>
        {user ? <button className="btn ghost" style={{ color: '#fff', borderColor: '#fff' }} onClick={() => go('post')}>Post goods</button>
          : <button className="btn ghost" style={{ color: '#fff', borderColor: '#fff' }} onClick={() => openAuth('register')}>Create free account</button>}
      </div></div></section>
    <div style={{ background: 'var(--mint)' }}><div className="wrap stats">{stat.map((x, i) => <div className="stat" key={i}><h3>{x[0] === undefined ? '–' : x[0]}</h3><p>{x[1]}</p></div>)}</div></div>
    <section className="sec"><div className="wrap about">
      <div><h2 style={{ textAlign: 'left' }}>About {COMPANY.name}</h2><div className="line" style={{ margin: '12px 0 18px' }} />
        <p>Industries often hold expensive spare parts they will never use, while other plants wait weeks to source the same item. {COMPANY.name} is a direct, middleman-free marketplace where companies post their excess goods and buyers find verified parts quickly.</p>
        <p>Every listing includes photos, specifications, quantity, condition and price. Registered members see full details and seller contacts, bid on the price they want and close the deal in chat.</p></div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>{['Free to list', 'Direct contact', 'Photo listings', 'Bid & chat'].map(t => <div className="feat" key={t}><b>✔ {t}</b></div>)}</div>
    </div></section>
    <section className="sec alt"><div className="wrap"><h2>Why {COMPANY.name}</h2><div className="line" />
      <div className="grid">{feats.map(f => <div className="feat" key={f[1]}><i>{f[0]}</i><h4>{f[1]}</h4><p>{f[2]}</p></div>)}</div></div></section>
    {/* NEW: solutions overview on Home */}
    <section className="sec"><div className="wrap"><h2>Our solutions</h2><div className="line" />
      <div className="grid">{ITEMS.filter(i => i.section === 'solutions' && i.group === 'Product').map(i =>
        <div className="feat lnk" key={i.slug} onClick={() => go('info', i.slug)}><i>{i.icon}</i><h4>{i.name}{i.badge && <span className="chip new" style={{ marginLeft: 8 }}>{i.badge}</span>}</h4><p>{i.tag}</p></div>)}</div></div></section>
    <section className="sec alt"><div className="wrap"><h2>How it works</h2><div className="line" />
      <div className="steps">{[['01', 'Post', 'Choose the product type, fill the guided form, add photos and publish.'], ['02', 'Discover & bid', 'Browse listings, buy at the asking price or place your own bid.'], ['03', 'Chat & close', 'Negotiate in the chat, accept a bid and arrange pickup.']].map(x =>
        <div className="step" key={x[0]}><i>{x[0]}</i><h3>{x[1]}</h3><p style={{ color: 'var(--mut)' }}>{x[2]}</p></div>)}</div></div></section>
    <section className="sec"><div className="wrap"><h2>Industries & parts we serve</h2><div className="line" />
      <div className="chips">{['Electric motors', 'PLC & automation', 'Pumps & valves', 'Bearings & gears', 'Televisions & displays', 'Conveyors', 'Hydraulics', 'Sensors', 'Cables & switchgear'].map(c => <span className="chip" key={c}>{c}</span>)}</div></div></section>
    <section className="sec alt"><div className="wrap"><h2>Contact us</h2><div className="line" />
      <div className="contact"><div className="feat"><i>✉️</i><b>Email</b><p>{COMPANY.email}</p></div><div className="feat"><i>📞</i><b>Phone</b><p>{COMPANY.phone}</p></div><div className="feat"><i>📍</i><b>Address</b><p>{COMPANY.address}</p></div></div></div></section>
    <section className="cta"><h2 style={{ color: '#fff' }}>Ready to move your excess stock?</h2><p>Join the marketplace and list your first item in minutes.</p>
      <button className="btn pur" onClick={() => user ? go('post') : openAuth('register')}>{user ? 'Post goods' : 'Get started'}</button></section>
  </>);
}

/* ---------- NEW: Solutions / Resources detail page ---------- */
function Info({ id, go, user, openAuth }) {
  const it = INFO[id];
  if (!it) return <div className="page"><div className="wrap"><button className="btn ghost sm" onClick={() => go('home')}>← Back to home</button><div className="empty">Page not found.</div></div></div>;
  const menu = MENUS.find(m => m.key === it.section);
  const rel = ITEMS.filter(x => x.section === it.section && x.slug !== it.slug && (x.group === it.group || it.section === 'resources'));
  return (<div className="page"><div className="wrap">
    <button className="btn ghost sm" onClick={() => go('home')}>← Back to home</button>
    <div className="ihero">
      <div><span className="chip">{menu.label}</span><span className="chip new">{it.group}</span>{it.badge && <span className="chip warn">{it.badge}</span>}</div>
      <h2>{it.icon} {it.name}</h2>
      <div className="itag">{it.tag}</div><div className="line" style={{ margin: '14px 0' }} />
      <p className="idesc">{it.desc}</p>
      <div className="row" style={{ marginTop: 18 }}>
        <button className="btn pur" onClick={() => go('market')}>Browse marketplace</button>
        {user ? <button className="btn ghost" onClick={() => go('post')}>Post goods</button>
          : <button className="btn ghost" onClick={() => openAuth('register')}>Create free account</button>}
      </div>
    </div>
    {it.points.length > 0 && <><h3 style={{ margin: '28px 0 14px' }}>{it.section === 'resources' ? 'What you will find' : 'Key capabilities'}</h3>
      <div className="grid">{it.points.map(p => <div className="feat" key={p}><b>✔ {p}</b></div>)}</div></>}
    {it.faq && <div className="panel" style={{ marginTop: 20 }}>{it.faq.map(q => <details className="faq" key={q[0]}><summary>{q[0]}</summary><p>{q[1]}</p></details>)}</div>}
    {rel.length > 0 && <><h3 style={{ margin: '34px 0 14px' }}>{it.section === 'resources' ? 'More resources' : 'Related in ' + it.group}</h3>
      <div className="grid">{rel.map(r => <div className="feat lnk" key={r.slug} onClick={() => go('info', r.slug)}><i>{r.icon}</i><h4>{r.name}{r.badge && <span className="chip new" style={{ marginLeft: 8 }}>{r.badge}</span>}</h4><p>{r.tag}</p></div>)}</div></>}
  </div></div>);
}

/* ---------- NEW: header dropdown menu (Solutions / Resources) ---------- */
function NavMenu({ m, open, setOpen, active, go }) {
  return (<div className={'mm' + (open ? ' open' : '')}>
    <button className={'mm-btn' + (active ? ' on' : '')} aria-expanded={open} onClick={e => { e.stopPropagation(); setOpen(open ? '' : m.key); }}>{m.label} <span className="caret">▾</span></button>
    {open && <div className="mega" onClick={e => e.stopPropagation()}>
      {m.groups.map(g => <div className="mcol" key={g}><h5>{g}</h5>
        {ITEMS.filter(i => i.section === m.key && i.group === g).map(i =>
          <button className="mi" key={i.slug} onClick={() => go('info', i.slug)}>
            <span className="mi-ic">{i.icon}</span>
            <span><b>{i.name}{i.badge && <span className="pill">{i.badge}</span>}</b><small>{i.tag}</small></span></button>)}</div>)}
    </div>}
  </div>);
}

/* ---------- Marketplace for visitors (no login: limited data) ---------- */
function PublicMarket({ openAuth }) {
  const [d, setD] = useState(null), [q, setQ] = useState('');
  useEffect(() => { call('pub_home').then(setD).catch(() => {}); }, []);
  const list = d ? d.goods.filter(g => (g.title + g.category).toLowerCase().indexOf(q.toLowerCase()) > -1) : null;
  return (<div className="page"><div className="wrap">
    <h2>Marketplace</h2><div style={{ color: 'var(--mut)' }}>Sign in to see price, seller phone, location and full specifications.</div>
    <div className="bar"><input className="in" placeholder="Search goods…" value={q} onChange={e => setQ(e.target.value)} />
      <button className="btn" onClick={() => openAuth('login')}>Sign in for full details</button></div>
    {!list ? <div className="empty">Loading…</div> : !list.length ? <div className="empty">No listings found.</div> :
      <div className="grid">{list.map(g => (<div className="card" key={g.id}>
        {g.image ? <img className="thumb" src={g.image} alt="" loading="lazy" /> : <div className="thumb">📦</div>}
        <div><span className="chip">{g.category}</span><span className="chip new">{g.condition}</span></div>
        <h4>{g.title}</h4>
        <div className="kv"><span>Quantity</span><span>{g.qty}</span><span>Posted</span><span>{when(g.created)}</span></div>
        <div className="lock">🔒 Price, seller phone, location & full specs are visible after sign in.</div>
        <button className="btn sm ghost" onClick={() => openAuth('login')}>Sign in to view details</button></div>))}</div>}
  </div></div>);
}

/* ---------- Marketplace (full details) ---------- */
function Slider({ images, onOpen }) {
  const [i, setI] = useState(0), list = images || [];
  if (!list.length) return <div className="thumb" onClick={onOpen} style={{ cursor: 'pointer' }}>📦</div>;
  const nav = (d, e) => { e.stopPropagation(); setI((i + d + list.length) % list.length); };
  return (<div className="slider">
    <img className="thumb" src={list[i]} alt="" loading="lazy" onClick={onOpen} />
    {list.length > 1 && <><button className="sl prev" aria-label="Previous photo" onClick={e => nav(-1, e)}>‹</button>
      <button className="sl next" aria-label="Next photo" onClick={e => nav(1, e)}>›</button><span className="gal-count">{i + 1}/{list.length}</span></>}
  </div>);
}
function BuyBox({ g, user, reload, openChat }) {
  const [amt, setAmt] = useState('');
  if (g.status !== 'available' || g.own) return null;
  const bid = () => run(call('bid_place', { goodId: g.id, amount: amt }), 'Bid sent to seller').then(() => { setAmt(''); reload(); }).catch(() => {});
  const buy = () => window.confirm('Buy "' + g.title + '" at ' + money(g.price) + '?') && run(call('buy', { goodId: g.id }), 'Purchase complete').then(reload).catch(() => {});
  return (<>
    <div className="fb"><input className="in" type="number" placeholder={'Your bid (' + CUR + ')'} value={amt} onChange={e => setAmt(e.target.value)} /><button className="btn pur sm" onClick={bid}>Bid</button></div>
    <div className="row"><button className="btn sm" onClick={buy}>Buy now</button>
      <button className="btn sm ghost" onClick={() => openChat({ goodId: g.id, buyerId: user.id, title: g.title, withName: g.ownerName })}>Chat</button></div>
  </>);
}
function GoodCard({ g, user, reload, openChat, open }) {
  const rm = () => window.confirm('Delete this listing?') && run(call('goods_delete', { id: g.id }), 'Deleted').then(reload).catch(() => {});
  return (
    <div className="card">
      <Slider images={g.images} onOpen={() => open(g.id)} />
      <div><span className="chip">{g.category}</span><span className="chip new">{g.condition}</span>
        {g.status === 'sold' && <span className="chip sold">SOLD</span>}{g.status === 'paused' && <span className="chip warn">PAUSED</span>}</div>
      <h4 className="lnk" onClick={() => open(g.id)}>{g.title}</h4><div className="price">{money(g.price)}</div>
      <div className="kv"><span>Quantity</span><span>{g.qty}</span><span>Location</span><span>{g.location || '–'}</span>
        <span>Seller</span><span>{g.ownerName}{g.company ? ' · ' + g.company : ''}</span><span>Phone</span><span>{g.phone || '–'}</span><span>Posted</span><span>{when(g.created)}</span></div>
      {g.myBid && <div className="chip new" style={{ alignSelf: 'flex-start' }}>Your bid {money(g.myBid.amount)} · {g.myBid.status}</div>}
      <button className="btn sm ghost" onClick={() => open(g.id)}>View full details →</button>
      <BuyBox g={g} user={user} reload={reload} openChat={openChat} />
      {g.own && <div className="lock">Your listing · {g.bidCount} bid(s)</div>}
      {(g.own || user.role === 'admin') && <button className="btn sm bad" style={{ alignSelf: 'flex-start' }} onClick={rm}>Delete</button>}
    </div>
  );
}
const pretty = k => k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
function Item({ id, user, go, openChat }) {
  const [g, setG] = useState(null), [err, setErr] = useState('');
  const load = useCallback(() => call('goods_get', { id }).then(setG).catch(e => setErr(e.message)), [id]);
  useEffect(() => { setG(null); setErr(''); load(); }, [load]);
  const back = <button className="btn ghost sm" onClick={() => go('market')}>← Back to marketplace</button>;
  if (err) return <div className="page"><div className="wrap">{back}<div className="empty">{err}</div></div></div>;
  if (!g) return <div className="page"><div className="wrap empty">Loading…</div></div>;
  const keys = Object.keys(g.data).filter(k => k !== 'description');
  const setStatus = st => run(call('goods_status', { id: g.id, status: st }), st === 'paused' ? 'Listing paused' : 'Listing resumed').then(load).catch(() => {});
  return (<div className="page"><div className="wrap">{back}
    <div className="item">
      <div className="big"><Gallery images={g.images} /></div>
      <div className="card">
        <div><span className="chip">{g.category}</span><span className="chip new">{g.condition}</span>
          {g.status === 'sold' && <span className="chip sold">SOLD</span>}{g.status === 'paused' && <span className="chip warn">PAUSED</span>}</div>
        <h2>{g.title}</h2><div className="price" style={{ fontSize: 30 }}>{money(g.price)}</div>
        <div className="kv"><span>Quantity</span><span>{g.qty}</span><span>Location</span><span>{g.location || '–'}</span>
          <span>Seller</span><span>{g.ownerName}{g.company ? ' · ' + g.company : ''}</span><span>Phone</span><span>{g.phone ? <a href={'tel:' + g.phone}>{g.phone}</a> : '–'}</span>
          <span>Email</span><span>{g.email || '–'}</span><span>Posted</span><span>{when(g.created)}</span>
          {keys.map(k => [<span key={k + 'a'}>{pretty(k)}</span>, <span key={k + 'b'}>{String(g.data[k])}</span>])}</div>
        {g.data.description && <p style={{ margin: 0, color: 'var(--mut)' }}>{g.data.description}</p>}
        {g.myBid && <div className="chip new" style={{ alignSelf: 'flex-start' }}>Your bid {money(g.myBid.amount)} · {g.myBid.status}</div>}
        <BuyBox g={g} user={user} reload={load} openChat={openChat} />
        {(g.own || user.role === 'admin') && g.status !== 'sold' && <div className="acts2">
          <button className="btn sm" onClick={() => go('edit', g.id)}>✎ Edit</button>
          <button className="btn sm ghost" onClick={() => setStatus(g.status === 'paused' ? 'available' : 'paused')}>{g.status === 'paused' ? '▶ Resume' : '⏸ Pause'}</button></div>}
      </div></div></div></div>);
}

function Market({ user, openChat, open }) {
  const [list, setList] = useState(null), [q, setQ] = useState(''), [cat, setCat] = useState(''), [cats, setCats] = useState([]);
  const load = useCallback(() => call('goods_list', { q, category: cat }).then(setList).catch(e => note(e.message, true)), [q, cat]);
  useEffect(() => { call('form_get').then(f => setCats(f.categories)).catch(() => {}); }, []);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  return (<div className="page"><div className="wrap">
    <h2>Marketplace</h2><div style={{ color: 'var(--mut)' }}>{user.role === 'admin' ? 'All listings (including sold).' : 'Verified excess goods posted by other industries.'}</div>
    <div className="bar"><input className="in" placeholder="Search part, model, manufacturer…" value={q} onChange={e => setQ(e.target.value)} />
      <select className="sel" value={cat} onChange={e => setCat(e.target.value)}><option value="">All categories</option>{cats.map(c => <option key={c.id}>{c.name}</option>)}</select></div>
    {!list ? <div className="empty">Loading…</div> : !list.length ? <div className="empty">No goods found.</div> :
      <div className="grid">{list.map(g => <GoodCard key={g.id} g={g} user={user} reload={load} openChat={openChat} open={open} />)}</div>}
  </div></div>);
}

/* ---------- Post excess goods (dynamic form from admin) ---------- */
function Post({ go, editId }) {
  const [form, setForm] = useState(null), [cat, setCat] = useState(''), [v, setV] = useState({}), [busy, setBusy] = useState(false), [imgs, setImgs] = useState([]);
  useEffect(() => {
    call('form_get').then(setForm).catch(e => note(e.message, true));
    if (editId) call('goods_get', { id: editId }).then(g => { setCat(g.category === 'General' ? '' : g.category); setV({ ...g.data, title: g.title, qty: g.qty, condition: g.condition, price: g.price }); setImgs(g.images || []); }).catch(e => note(e.message, true));
  }, [editId]);
  if (!form) return <div className="page"><div className="wrap empty">Loading form…</div></div>;
  const c = form.categories.find(x => x.name === cat);
  const fields = form.defaults.concat(c ? c.fields : []);
  const set = (k, val) => setV({ ...v, [k]: val });
  const submit = () => { setBusy(true); run(call(editId ? 'goods_update' : 'goods_create', { id: editId, category: cat || 'General', values: v, images: imgs }), editId ? 'Listing updated' : 'Listing posted!').then(() => go('mine')).catch(() => {}).finally(() => setBusy(false)); };
  return (<div className="page"><div className="wrap" style={{ maxWidth: 860 }}>
    <h2>{editId ? 'Edit listing' : 'Post excess goods'}</h2><div style={{ color: 'var(--mut)', marginBottom: 18 }}>Select the product type — the form adapts to it.</div>
    <div className="panel">
      <div style={{ marginBottom: 16 }}><label>Product type</label>
        <select className="sel" value={cat} onChange={e => { setCat(e.target.value); }}><option value="">General / other</option>{form.categories.map(x => <option key={x.id}>{x.name}</option>)}</select></div>
      <div className="form">{fields.map(f => <Field key={f.key} f={f} v={v[f.key]} set={set} />)}</div>
      <div style={{ marginTop: 20 }}><label>Photos of the goods (first photo is the cover)</label><ImageUploader images={imgs} onChange={setImgs} /></div>
      <div style={{ marginTop: 22 }}><button className="btn" disabled={busy} onClick={submit}>{busy ? 'Saving…' : editId ? 'Save changes' : 'Publish listing'}</button>{editId && <button className="btn ghost" style={{ marginLeft: 10 }} onClick={() => go('mine')}>Cancel</button>}</div>
    </div></div></div>);
}

/* ---------- My listings with bid management ---------- */
function Mine({ openChat, go }) {
  const [list, setList] = useState(null);
  const load = () => call('goods_mine').then(setList).catch(e => note(e.message, true));
  useEffect(() => { load(); }, []);
  const respond = (bidId, accept) => run(call('bid_respond', { bidId, accept }), accept ? 'Bid accepted – deal closed' : 'Bid declined').then(load).catch(() => {});
  const rm = id => window.confirm('Delete this listing?') && run(call('goods_delete', { id }), 'Deleted').then(load).catch(() => {});
  return (<div className="page"><div className="wrap"><h2>My listings</h2>
    {!list ? <div className="empty">Loading…</div> : !list.length ? <div className="empty">You haven’t posted anything yet.</div> :
      <div className="grid">{list.map(g => (
        <div className="card" key={g.id}>
          <Slider images={g.images} onOpen={() => go('item', g.id)} />
          <div><span className="chip">{g.category}</span>{g.status === 'sold' ? <span className="chip sold">SOLD</span> : g.status === 'paused' ? <span className="chip warn">PAUSED</span> : <span className="chip new">Available</span>}</div>
          <h4>{g.title}</h4><div className="price">{money(g.price)} <small style={{ fontSize: 12, color: 'var(--mut)' }}>· qty {g.qty}</small></div>
          <strong style={{ fontSize: 13 }}>Bids ({g.bids.length})</strong>
          {!g.bids.length && <div style={{ fontSize: 13, color: 'var(--mut)' }}>No bids yet.</div>}
          {g.bids.map(b => (<div className="bidrow" key={b.id}>
            <div><b>{money(b.amount)}</b> <span style={{ color: 'var(--mut)' }}>by {b.bidder}</span><br /><span className="chip">{b.status}</span></div>
            <div className="row">
              {b.status === 'pending' && g.status === 'available' && <><button className="btn ok sm" onClick={() => respond(b.id, true)}>Accept</button><button className="btn bad sm" onClick={() => respond(b.id, false)}>Decline</button></>}
              <button className="btn ghost sm" onClick={() => openChat({ goodId: g.id, buyerId: b.bidderId, title: g.title, withName: b.bidder })}>Chat</button></div>
          </div>))}
          <div className="acts2">
            <button className="btn sm" disabled={g.status === 'sold'} onClick={() => go('edit', g.id)}>✎ Edit</button>
            {g.status !== 'sold' && <button className="btn sm ghost" onClick={() => run(call('goods_status', { id: g.id, status: g.status === 'paused' ? 'available' : 'paused' }), g.status === 'paused' ? 'Listing resumed' : 'Listing paused').then(load).catch(() => {})}>{g.status === 'paused' ? '▶ Resume' : '⏸ Pause'}</button>}
            <button className="btn bad sm" onClick={() => rm(g.id)}>Delete</button></div>
        </div>))}</div>}
  </div></div>);
}

/* ---------- Messages ---------- */
function Messages({ thread, setThread }) {
  const [inbox, setInbox] = useState([]), [msgs, setMsgs] = useState([]), [text, setText] = useState(''), end = useRef();
  const loadInbox = () => call('chat_inbox').then(setInbox).catch(() => {});
  const gid = thread ? thread.goodId : '', bid = thread ? thread.buyerId : '';
  const loadMsgs = useCallback(() => (gid ? call('chat_get', { goodId: gid, buyerId: bid }).then(setMsgs).catch(() => {}) : null), [gid, bid]);
  useEffect(() => { loadInbox(); const t = setInterval(loadInbox, 8000); return () => clearInterval(t); }, []);
  const key = thread ? thread.goodId + thread.buyerId : '';
  useEffect(() => { setMsgs([]); loadMsgs(); const t = setInterval(loadMsgs, 4000); return () => clearInterval(t); }, [key, loadMsgs]);
  useEffect(() => { end.current && end.current.scrollIntoView(); }, [msgs.length]);
  const send = () => { if (!text.trim()) return; const t = text; setText('');
    run(call('chat_send', { goodId: thread.goodId, buyerId: thread.buyerId, text: t })).then(() => { loadMsgs(); loadInbox(); }).catch(() => setText(t)); };
  return (<div className="page"><div className="wrap"><h2>Messages & bids</h2><div style={{ height: 14 }} />
    <div className="chat">
      <div className="inbox">{!inbox.length && !thread && <div className="empty" style={{ padding: 20 }}>No conversations yet. Open a listing and press Chat.</div>}
        {inbox.map(t => <div key={t.goodId + t.buyerId} className={'th' + (key === t.goodId + t.buyerId ? ' on' : '')} onClick={() => setThread(t)}>
          <b>{t.title}</b><small>{t.withName}: {t.text}</small></div>)}</div>
      <div className="conv">{!thread ? <div className="empty">Select a conversation</div> : <>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}><b>{thread.title}</b> <span style={{ color: 'var(--mut)', fontSize: 13 }}>· with {thread.withName}</span></div>
        <div className="msgs">{!msgs.length && <div className="empty" style={{ padding: 20 }}>Say hello 👋 or negotiate the price.</div>}
          {msgs.map(m => <div key={m.id} className={'m ' + (m.kind === 'sys' || m.kind === 'bid' ? 'sys' : m.mine ? 'me' : '')}>{m.text}<small>{m.kind === 'chat' ? m.name + ' · ' : ''}{hm(m.created)}</small></div>)}<div ref={end} /></div>
        <div className="send"><input className="in" placeholder="Type a message…" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
          <button className="btn" onClick={send}>Send</button></div></>}</div>
    </div></div></div>);
}

/* ---------- Orders ---------- */
const Party = ({ p }) => p ? (<div className="party"><b>{p.name}</b>{p.company && <div>{p.company}</div>}{p.phone && <div>📞 <a href={'tel:' + p.phone}>{p.phone}</a></div>}{p.email && <div>✉️ {p.email}</div>}<div>📍 {p.address || 'No address saved'}</div></div>) : '–';
function Orders() {
  const [l, setL] = useState(null);
  useEffect(() => { call('orders_mine').then(setL).catch(e => note(e.message, true)); }, []);
  return (<div className="page"><div className="wrap"><h2>Orders</h2><div style={{ height: 14 }} />
    {!l ? <div className="empty">Loading…</div> : !l.length ? <div className="empty">No deals yet.</div> :
      <div className="tw"><table><thead><tr><th>Date</th><th>Item</th><th>Type</th><th>Buyer</th><th>Seller</th><th>Amount</th></tr></thead>
        <tbody>{l.map(o => <tr key={o.id}><td>{when(o.created)}</td><td>{o.title}</td><td>{o.role}</td><td><Party p={o.buyerInfo} /></td><td><Party p={o.sellerInfo} /></td><td><b>{money(o.amount)}</b></td></tr>)}</tbody></table></div>}
  </div></div>);
}

/* ---------- Admin: dashboard, users, form builder ---------- */
function Dash() {
  const [s, setS] = useState(null);
  useEffect(() => { call('admin_stats').then(setS).catch(e => note(e.message, true)); }, []);
  if (!s) return <div className="page"><div className="wrap empty">Loading…</div></div>;
  const items = [['Users', s.users], ['Listings', s.listings], ['Available', s.available], ['Sold', s.sold], ['Bids', s.bids], ['Deals', s.deals], ['Deal volume', money(s.volume)]];
  return (<div className="page"><div className="wrap"><h2>Admin dashboard</h2><div style={{ height: 14 }} />
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))' }}>{items.map(i =>
      <div className="card" key={i[0]} style={{ borderLeft: '3px solid var(--purple)' }}><span style={{ color: 'var(--mut)' }}>{i[0]}</span><h3 style={{ fontSize: 30, margin: 0 }}>{i[1]}</h3></div>)}</div>
  </div></div>);
}
function Users() {
  const [l, setL] = useState(null);
  const load = () => call('admin_users').then(setL).catch(e => note(e.message, true));
  useEffect(() => { load(); }, []);
  const tog = u => run(call('admin_user_status', { id: u.id, status: u.status === 'active' ? 'blocked' : 'active' }), 'Updated').then(load).catch(() => {});
  return (<div className="page"><div className="wrap"><h2>All users</h2><div style={{ height: 14 }} />
    {!l ? <div className="empty">Loading…</div> :
      <div className="tw"><table><thead><tr><th>Name</th><th>Company</th><th>Email</th><th>Phone</th><th>Location</th><th>Posted</th><th>Sold</th><th>Bought</th><th>Bids</th><th>Status</th><th /></tr></thead>
        <tbody>{l.map(u => <tr key={u.id}><td><b>{u.name}</b> {u.role === 'admin' && <span className="pill">admin</span>}</td><td>{u.company}</td><td>{u.email}</td><td>{u.phone}</td><td>{u.location}</td>
          <td><b>{u.posted}</b></td><td>{u.sold}</td><td>{u.bought}</td><td>{u.bids}</td>
          <td><span className={'chip' + (u.status === 'blocked' ? ' sold' : '')}>{u.status}</span></td>
          <td>{u.role !== 'admin' && <button className={'btn sm ' + (u.status === 'active' ? 'bad' : 'ok')} onClick={() => tog(u)}>{u.status === 'active' ? 'Block' : 'Unblock'}</button>}</td></tr>)}</tbody></table></div>}
  </div></div>);
}
function Builder() {
  const [data, setData] = useState(null), [sel, setSel] = useState(null);
  const load = () => call('form_get').then(d => { setData(d); }).catch(e => note(e.message, true));
  useEffect(() => { load(); }, []);
  if (!data) return <div className="page"><div className="wrap empty">Loading…</div></div>;
  const items = [{ id: 'default', name: 'Default form (all products)', fields: data.defaults }].concat(data.categories);
  const edit = c => setSel({ id: c.id, name: c.id === 'default' ? 'Default form' : c.name, fields: c.fields.map(f => ({ ...f, options: (f.options || []).join(', ') })) });
  const newCat = () => setSel({ id: null, name: '', fields: [{ label: '', type: 'text', required: false, options: '' }] });
  const upd = (i, k, v) => setSel({ ...sel, fields: sel.fields.map((f, j) => j === i ? { ...f, [k]: v } : f) });
  const save = () => run(call('admin_cat_save', { id: sel.id, name: sel.name, fields: sel.fields.map(f => ({ ...f, options: f.type === 'select' ? String(f.options || '').split(',').map(s => s.trim()) : [] })) }), 'Form saved')
    .then(() => { setSel(null); load(); }).catch(() => {});
  const rm = c => window.confirm('Delete "' + c.name + '"?') && run(call('admin_cat_delete', { id: c.id }), 'Deleted').then(load).catch(() => {});
  if (sel) return (<div className="page"><div className="wrap" style={{ maxWidth: 900 }}>
    <h2>{sel.id ? 'Edit form' : 'New product type'}</h2><div style={{ height: 14 }} />
    <div className="panel">
      {sel.id !== 'default' && <div style={{ marginBottom: 16 }}><label>Product name (e.g. Television)</label><input className="in" value={sel.name} onChange={e => setSel({ ...sel, name: e.target.value })} /></div>}
      <label>{sel.id === 'default' ? 'Default fields every user must fill for any product' : 'Extra fields for this product (added to default form)'}</label>
      {sel.fields.map((f, i) => (<div className="row" key={i} style={{ margin: '8px 0', alignItems: 'flex-end' }}>
        <div style={{ flex: 2, minWidth: 150 }}><input className="in" placeholder="Field label (Model, Type…)" value={f.label} onChange={e => upd(i, 'label', e.target.value)} /></div>
        <div style={{ flex: 1, minWidth: 110 }}><select className="sel" value={f.type} onChange={e => upd(i, 'type', e.target.value)}>
          <option value="text">Text</option><option value="number">Number</option><option value="select">Dropdown</option><option value="textarea">Long text</option></select></div>
        {f.type === 'select' && <div style={{ flex: 2, minWidth: 150 }}><input className="in" placeholder="Options, comma separated" value={f.options} onChange={e => upd(i, 'options', e.target.value)} /></div>}
        <label style={{ margin: 0 }}><input type="checkbox" checked={!!f.required} onChange={e => upd(i, 'required', e.target.checked)} /> Required</label>
        <button className="btn bad sm" onClick={() => setSel({ ...sel, fields: sel.fields.filter((_, j) => j !== i) })}>✕</button></div>))}
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn ghost sm" onClick={() => setSel({ ...sel, fields: sel.fields.concat({ label: '', type: 'text', required: false, options: '' }) })}>+ Add field</button>
        <button className="btn" onClick={save}>Save</button><button className="btn ghost" onClick={() => setSel(null)}>Cancel</button></div>
    </div></div></div>);
  return (<div className="page"><div className="wrap"><div className="row" style={{ justifyContent: 'space-between' }}><h2>Form builder</h2><button className="btn pur" onClick={newCat}>+ Add product type</button></div>
    <div style={{ color: 'var(--mut)', margin: '6px 0 20px' }}>Add a product (e.g. Television) and choose which fields users fill when posting it. The default form is always included.</div>
    <div className="grid">{items.map(c => (<div className="card" key={c.id}><h4>{c.name}</h4>
      <div>{c.fields.map(f => <span className="chip" key={f.key}>{f.label}{f.required ? '*' : ''}</span>)}</div>
      <div className="row"><button className="btn sm" onClick={() => edit(c)}>Edit</button>{c.id !== 'default' && <button className="btn bad sm" onClick={() => rm(c)}>Delete</button>}</div></div>))}</div>
  </div></div>);
}

/* ---------- Chatbot ---------- */
function Bot() {
  const [open, setOpen] = useState(false), [t, setT] = useState(''), end = useRef();
  const [m, setM] = useState([{ b: true, t: 'Hi! I’m the SpareXchange assistant. Try “find motor” or ask how bidding works.' }]);
  useEffect(() => { end.current && end.current.scrollIntoView(); }, [m, open]);
  const send = () => { const x = t.trim(); if (!x) return; setT(''); setM(a => a.concat({ t: x }));
    call('bot', { text: x }).then(r => setM(a => a.concat({ b: true, t: r }))).catch(e => setM(a => a.concat({ b: true, t: e.message }))); };
  return (<>
    <button className="botb" onClick={() => setOpen(!open)} title="Chat assistant">{open ? '✕' : '💬'}</button>
    {open && <div className="bot"><header><span>SpareXchange Assistant</span></header>
      <div className="msgs">{m.map((x, i) => <div key={i} className={'m' + (x.b ? '' : ' me')}>{x.t}</div>)}<div ref={end} /></div>
      <div className="send"><input className="in" value={t} placeholder="Ask me anything…" onChange={e => setT(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} /><button className="btn sm" onClick={send}>Send</button></div></div>}
  </>);
}

/* ---------- App shell ---------- */
function App() {
  const [user, setUser] = useState(null), [thread, setThread] = useState(null), [auth, setAuth] = useState(null),
    [toast, setToast] = useState(null), [boot, setBoot] = useState(!!TOKEN), [menu, setMenu] = useState(false), [dd, setDd] = useState(''),
    [route, setRoute] = useState(() => { try { return inGS() ? { page: 'home', id: '' } : routeFromPath(window.location.pathname); } catch (e) { return { page: 'home', id: '' }; } }),
    pending = useRef(null), page = route.page;
  window.notify = (m, err) => { setToast({ m, err }); setTimeout(() => setToast(null), 3200); };
  const go = (p, id) => {
    setRoute({ page: p, id: id || '' }); setMenu(false); setDd(''); window.scrollTo(0, 0);
    try { const path = pathFor(p, id); if (!inGS() && window.location.pathname !== path) window.history.pushState({}, '', path); } catch (e) {}
  };
  useEffect(() => { const f = () => setRoute(routeFromPath(window.location.pathname)); window.addEventListener('popstate', f); return () => window.removeEventListener('popstate', f); }, []);
  useEffect(() => { const f = () => setDd(''); document.addEventListener('click', f); return () => document.removeEventListener('click', f); }, []);
  useEffect(() => { const f = () => { setUser(null); setThread(null); setAuth('login'); go('home'); note('Please sign in again.', true); }; window.addEventListener('sx-logout', f); return () => window.removeEventListener('sx-logout', f); }, []);
  useEffect(() => { if (TOKEN) call('me').then(u => { setUser(u); }).catch(e => { if (/^(Session|Account)/.test(e.message)) setTok(''); }).finally(() => setBoot(false)); }, []);
  useEffect(() => { if (!boot && !user && page !== 'home' && page !== 'market' && page !== 'info') { pending.current = route; setAuth('login'); go('home'); } }, [boot, user, page]);
  const done = r => { setTok(r.token); setUser(r.user); setAuth(null); const p = pending.current; pending.current = null; p ? go(p.page, p.id) : go('market'); note('Welcome, ' + r.user.name); };
  const out = () => { call('logout').catch(() => {}); setTok(''); setUser(null); setThread(null); go('home'); };
  const openChat = t => { setThread(t); go('messages'); };
  const openItem = id => go('item', id);
  if (boot) return <div className="empty" style={{ padding: 120 }}>Loading…</div>;
  const admin = user && user.role === 'admin';
  const tabs = [['home', 'Home'], ['market', 'Marketplace']].concat(!user ? [] : [['post', 'Post goods'], ['mine', 'My listings'], ['messages', 'Messages & bids'], ['orders', 'Orders']]
    .concat(admin ? [['dash', 'Dashboard'], ['users', 'Users'], ['forms', 'Form builder']] : []));
  const on = k => page === k || (k === 'market' && page === 'item') || (k === 'mine' && page === 'edit');
  const infoSection = page === 'info' && INFO[route.id] ? INFO[route.id].section : '';
  const tabBtn = t => <button key={t[0]} className={on(t[0]) ? 'on' : ''} onClick={() => go(t[0])}>{t[1]}</button>;
  const view = !user ? (page === 'market' ? <PublicMarket openAuth={setAuth} /> : page === 'info' ? <Info id={route.id} go={go} user={null} openAuth={setAuth} /> : <Home user={null} go={go} openAuth={setAuth} />) : {
    home: <Home user={user} go={go} openAuth={setAuth} />, market: <Market user={user} openChat={openChat} open={openItem} />,
    item: <Item key={route.id} id={route.id} user={user} go={go} openChat={openChat} />, edit: <Post key={'e' + route.id} go={go} editId={route.id} />,
    info: <Info id={route.id} go={go} user={user} openAuth={setAuth} />,
    post: <Post key="new" go={go} />, mine: <Mine openChat={openChat} go={go} />,
    messages: <Messages thread={thread} setThread={setThread} />, orders: <Orders />, dash: <Dash />, users: <Users />, forms: <Builder />
  }[page];
  return (<div className="app-shell">
    <header className="hdr"><div className="wrap">
      <div className="logo" onClick={() => go('home')}>SPARE<b>XCHANGE</b></div>
      <button className="burger" aria-label="Menu" aria-expanded={menu} onClick={e => { e.stopPropagation(); setMenu(!menu); }}>{menu ? '✕' : '☰'}</button>
      <div className={'menu' + (menu ? ' open' : '')}>
        <nav className="nav">
          {tabs.slice(0, 1).map(tabBtn)}
          {MENUS.map(m => <NavMenu key={m.key} m={m} open={dd === m.key} setOpen={setDd} active={infoSection === m.key} go={go} />)}
          {tabs.slice(1).map(tabBtn)}
        </nav>
        <div className="acts">
          {user ? <><div className="who"><b>{user.name}</b> {admin && <span className="pill">admin</span>}<br />{user.company || user.email}</div><button className="btn ghost sm" onClick={out}>Sign out</button></>
            : <><button className="btn ghost sm" onClick={() => { setMenu(false); setAuth('login'); }}>Sign in</button><button className="btn sm" onClick={() => { setMenu(false); setAuth('register'); }}>Register</button></>}
        </div>
      </div>
    </div></header>
    <main className="main">{view}</main>
    <footer className="foot"><div className="wrap">© {COMPANY.name} · Industrial spare parts & excess goods marketplace · Data stored in Google Sheets</div></footer>
    {auth && <AuthModal mode={auth} setMode={setAuth} onDone={done} close={() => setAuth(null)} />}
    <Bot />
    {toast && <div className={'toast' + (toast.err ? ' err' : '')}>{toast.m}</div>}
  </div>);
}

export default App;