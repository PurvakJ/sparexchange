/* eslint-disable react-hooks/exhaustive-deps */
/* ===== SpareXchange React app (app.js) ===== */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://script.google.com/macros/s/AKfycbxU7KOBHDUCCR2fmuPQo3WrxhP4UcApvrMtkl5T-j1Rj1XJPzGuznScD3DiMZKP2bRTKw/exec';
const CUR = '₹';
const COMPANY = { name: 'SpareXchange', email: 'support@sparexchange.com' };
const DEV = { name: 'Shree Shyam IT Solutions', email: 'itsolutionsshreeshyam@gmail.com', site: 'https://shree-shyam-it-solutions.vercel.app/' };
const BASE_TITLE = 'SpareXchange | Industrial spare parts marketplace';
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

/* ---------- CSV helpers (bulk import / format download) ---------- */
const csvParse = text => {
  const rows = []; let row = [], cell = '', q = false;
  text = String(text).replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => String(x).trim() !== ''));
};
const csvQuote = s => { s = String(s === undefined || s === null ? '' : s); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const BULK_MAX = 500;

/* ---------- Menu data ---------- */
// section = menu it belongs to, group = column inside the menu
const mk = (section, group, slug, name, tag, icon, desc, points, extra) => Object.assign({ section, group, slug, name, tag, icon, desc, points: points || [] }, extra || {});
const ITEMS = [
  /* ---- SOLUTIONS > Product ---- */
  mk('solutions', 'Product', 'post-excess-goods', 'Post Excess Goods', 'List your surplus in minutes', '📦',
    'Post a single item with a guided form, or import many items at once from a file. Add photos and publish. Your surplus is visible to buyers straight away.',
    ['Single item or bulk import from a file', 'Download the file format for your product type', 'Upload up to 8 photos, the first one becomes the cover', 'Edit, pause, resume or delete any time']),
  mk('solutions', 'Product', 'marketplace-search', 'Marketplace Search', 'Find the right goods fast', '🔎',
    'Search by part, model or manufacturer and filter by category to find exactly what you need, with photos and full specifications on every listing.',
    ['Free-text search across all listings', 'Filter by product category', 'Photo galleries with full-screen view', 'Seller location, phone and full specs after sign in']),
  mk('solutions', 'Product', 'bids-and-buy-now', 'Bids & Buy Now', 'Request at the asking price or negotiate', '💰',
    'Send a buy request at the asking price or place your own bid. The seller reviews every request and closes the deal.',
    ['Buy now sends a request to the seller at the listed price', 'Place your own bid on any listing', 'Seller accepts or declines each request and bid', 'Track the status of your bids']),
  mk('solutions', 'Product', 'chat-and-negotiate', 'Chat & Negotiate', 'Talk directly to buyers and sellers', '💬',
    'Chat with any buyer or seller in one WhatsApp-style conversation. Questions about different listings stay together in the same chat, so you can agree on the price without leaving the platform.',
    ['One conversation per person, across all listings', 'Unread message count on every chat', 'Bid updates appear inside the chat', 'Notification when a new message arrives', 'Quick answers from the built-in assistant']),
  mk('solutions', 'Product', 'orders-and-deals', 'Orders & Deals', 'Every deal on record', '🧾',
    'Once the seller accepts a bid or buy request, the deal is saved in Orders with buyer and seller details and the final amount.',
    ['Automatic order record for every closed deal', 'Buyer and seller contact details', 'Final amount and date', 'Separate view for what you bought and sold']),
  mk('solutions', 'Product', 'listing-manager', 'My Listings Manager', 'Run all your listings in one place', '🗂️',
    'See every listing you posted together with its bids. Accept or decline offers, edit details or pause a listing whenever you need.',
    ['All bids and buy requests shown under each listing', 'Accept or decline in one click', 'Edit, pause or resume listings', 'Clear status: available, paused or sold']),
  /* ---- SOLUTIONS > Use Cases ---- */
  mk('solutions', 'Use Cases', 'for-plants', 'Sell Surplus Stock', 'For plants & factories', '🏭',
    '“We have idle machines, motors and spare parts sitting in the store, and no easy way to find buyers.” Post them with photos and price, and let interested buyers come to you.',
    ['Turn idle stock into cash', 'Reach buyers from other industries', 'Free up storage space', 'Choose the best offer yourself']),
  mk('solutions', 'Use Cases', 'for-buyers', 'Source Spare Parts', 'For maintenance & procurement teams', '🛒',
    '“When equipment stops, we need the right part quickly and at a fair price.” Search verified listings, check photos and condition, then buy or bid.',
    ['Find parts and goods at lower cost', 'See photos, condition and quantity', 'Negotiate directly with the seller', 'Every closed deal recorded in Orders']),
  mk('solutions', 'Use Cases', 'for-owners', 'Clear Dead Stock', 'For business owners & traders', '♻️',
    'Excess and unused goods tie up money and space. List them, bid, negotiate and close the deal in chat, and bring unused goods back into circulation.',
    ['List with photos, quantity, condition and price', 'Bulk import large stock lists', 'Bid, negotiate and close in chat', 'Free up working capital']),
  /* ---- SOLUTIONS > Technical ---- */
  mk('solutions', 'Technical', 'trust-and-safety', 'Trust & Safety', 'Account-based access', '🛡️',
    'Visitors can browse limited details. Registered members see price, seller phone, location and full specifications, so every transaction happens between known accounts.',
    ['Free registration with name, phone, email and location', 'Authorised dealers add their company name', 'Price, phone and full specs shown after sign in', 'Admin can block misbehaving users']),
  mk('solutions', 'Technical', 'admin-tools', 'Admin Tools', 'Dashboard, users & forms', '🧰',
    'Administrators get a dashboard, user management and a form builder to control which fields users fill and which default image is shown for each product type.',
    ['Dashboard with users, listings, bids and deal volume', 'User list with block and unblock', 'Form builder for product types, fields and default images']),
  /* ---- RESOURCES > Discover ---- */
  mk('resources', 'Discover', 'how-it-works', 'How it works', 'From listing to closed deal', '📖',
    'SpareXchange takes you from posting goods to a recorded deal in four simple steps.',
    ['Sign in and post your goods with photos', 'Buyers browse, send a buy request or place bids', 'Chat to agree on the details', 'The seller closes the deal and it is recorded in Orders']),
  mk('resources', 'Discover', 'faqs', 'FAQs', 'Quick answers', '❓',
    'Answers to the most common questions about listing, buying, bidding and closing deals.', [],
    { faq: [['How do I post goods?', 'Sign in, open Post goods and choose single or bulk. For a single item choose the product type, fill the guided form, add photos and publish.'],
      ['How does bulk posting work?', 'Choose bulk, pick the product type, download the file format for it, fill in your items and import the file. Your items are stored and shown in My listings.'],
      ['Is registration free?', 'Yes. Creating an account is free, and it unlocks prices, seller contact details and full specifications.'],
      ['Can I see prices without an account?', 'Visitors see limited details. Register for free to see price, seller phone, location and full specifications.'],
      ['What happens when I press Buy now?', 'A buy request at the posted price is sent to the seller as a message. The seller then confirms and closes the deal.'],
      ['How does bidding work?', 'Place your own bid. The seller can accept or decline and you can chat to negotiate.'],
      ['How do I close a deal?', 'The seller accepts your bid or buy request from My listings. The deal is then recorded in Orders with buyer and seller details.'],
      ['How do chats work?', 'Every person you talk to has one chat, even if you discuss several listings. Unread messages are counted on the chat and on the Messages button until you open the chat.'],
      ['Will I be notified of new messages?', 'Yes. Allow notifications when asked and you will get a new message alert on desktop and mobile while SpareXchange is open in your browser.'],
      ['Can I pause or edit a listing?', 'Yes. Open My listings to edit, pause, resume or delete any of your listings.']] }),
  /* ---- RESOURCES > Guides ---- */
  mk('resources', 'Guides', 'buying-guide', 'Buying guide', 'Buy with confidence', '🛍️',
    'Tips for finding the right goods, checking listings and negotiating a fair price.',
    ['Check photos, condition and quantity', 'Ask the seller questions in chat', 'Compare the asking price with your own bid', 'Confirm details before you buy']),
  mk('resources', 'Guides', 'selling-guide', 'Selling guide', 'Sell faster and for more', '🏷️',
    'Tips for creating listings that attract buyers and close quickly.',
    ['Add clear photos from several angles', 'Describe model, condition and specifications', 'Set a realistic asking price', 'Reply quickly to bids, buy requests and messages']),
  /* ---- RESOURCES > Company ---- */
  mk('resources', 'Company', 'about-us', 'About us', 'The marketplace for excess goods', '👥',
    'SpareXchange is an online marketplace where industries buy and sell excess goods, spare parts and surplus stock. We connect sellers who have idle inventory with buyers who need it, with photos, bids, chat and recorded deals in one place.',
    ['Marketplace for excess goods and spare parts', 'Direct buyer and seller chat with bidding', 'Free to register', 'Built and maintained by ' + DEV.name])
];
const INFO = {}; ITEMS.forEach(i => { INFO[i.slug] = i; });
const MENUS = [
  { key: 'solutions', label: 'Solutions', groups: ['Product', 'Use Cases', 'Technical'],
    promo: { tag: 'START SELLING', title: 'Turn your excess goods into cash', text: 'Post a listing in minutes and let buyers bid.', btn: 'Post your goods', to: 'post' } },
  { key: 'resources', label: 'Resources', groups: ['Discover', 'Guides', 'Company'],
    promo: { tag: 'NEW HERE?', title: 'See how SpareXchange works', btn: 'How it works', to: 'info', id: 'how-it-works' } }
];

/* ---------- Home page data ---------- */
// Category names shown in the scrolling strip (text only, no images)
const CATS = ['Motors', 'Pumps', 'Bearings', 'Valves', 'Electrical', 'Electronics', 'Tools', 'Machinery', 'Spare parts', 'Packaging'];

/* ---------- Homepage images (swap any URL for your own Cloudinary / hosted image) ----------
   Each image is matched to the content of the section it appears in. */
const U = id => 'https://images.unsplash.com/' + id + '?auto=format&fit=crop&w=900&q=70';
const PH = {
  factory: U('photo-1565793298595-6a879b1d9492'),   // industrial plant / factory floor
  workshop: U('photo-1504917595217-d4dc5ebe6122'),  // workshop with machine parts
  engineer: U('photo-1581092918056-0c4c3acd3789'),  // maintenance engineer at equipment
  warehouse: U('photo-1553413077-190dd305871c'),    // warehouse stock and shelves (idle goods)
  search: U('photo-1516321318423-f06f85e504b3'),    // searching on a laptop (browse and find)
  handshake: U('photo-1521791136064-7986c2920216'), // buyer and seller agreeing a price
  meeting: U('photo-1556761175-5973dc0f32e7'),      // two people talking (chat and negotiate)
  contract: U('photo-1450101499163-c8848c66ca85'),  // signing a deal (orders and deals)
  dashboard: U('photo-1551288049-bebda4e38f71'),    // dashboard of listings and bids
  a: U('https://144969486.fs1.hubspotusercontent-eu1.net/hub/144969486/hubfs/Home/SPT-EN-approach-part-request-840x690.png'),
  b: U('https://144969486.fs1.hubspotusercontent-eu1.net/hub/144969486/hubfs/Home/SPT-EN-approach-part-validation-840x690.png'),
  c: U('https://144969486.fs1.hubspotusercontent-eu1.net/hub/144969486/hubfs/SPT-EN-approach-global-material-840x690.png'),
  d: U('https://144969486.fs1.hubspotusercontent-eu1.net/hub/144969486/hubfs/SPT-EN-approach-local-extension-840x690.png'),
};
const IMG = {
  hero: [PH.factory, PH.workshop, PH.warehouse],
  pillar: { 'post-excess-goods': PH.warehouse, 'marketplace-search': PH.search, 'bids-and-buy-now': PH.handshake, 'chat-and-negotiate': PH.meeting, 'orders-and-deals': PH.contract, 'listing-manager': PH.dashboard },
  trust: PH.handshake
};

const STATS = [['Free', 'Registration for everyone', 'Create an account at no cost and unlock prices, seller contacts and full specifications'],
  ['8', 'Photos per listing', 'Show your goods clearly with up to eight photos and a full-screen gallery'],
  ['1-to-1', 'Chat with every buyer or seller', 'Negotiate directly with each person and close the deal in one place']];
const ROLES = [[PH.factory, 'Plant & Factory Owner', '“We have idle machines, motors and spare parts sitting in the store, and no easy way to find buyers.”', 'Post your surplus and turn idle stock into cash.', 'for-plants'],
  [PH.engineer, 'Maintenance & Procurement', '“When equipment stops, we need the right part quickly and at a fair price.”', 'Search listings, compare offers and buy or bid.', 'for-buyers'],
  [PH.warehouse, 'Business Owner & Trader', '“Unused goods tie up our money and space.”', 'List, negotiate and clear dead stock faster.', 'for-owners']];
const STEPS = [['Post', 'Sign in, choose single or bulk, fill in the guided form or import your file, add photos and publish your listing.', PH.warehouse],
  ['Browse & bid', 'Buyers search by part, model or category, then send a buy request at the asking price or place their own bid.', PH.search],
  ['Chat & negotiate', 'Buyer and seller talk directly in one chat. Bid updates appear in the conversation, unread messages are counted and new messages trigger a notification.', PH.meeting],
  ['Close the deal', 'The seller accepts the bid or buy request, and the deal is recorded in Orders with buyer and seller details.', PH.contract]];
const COMPARE = [['Listing & discovery', [['Photos, quantity, condition and price on every listing', 'Always included', 'Often missing'], ['Search and category filters', 'Built in', 'Manual calls and messages'], ['Post one item or thousands in bulk', 'Guided forms and file import', 'Free-form ads']]],
  ['Negotiation & deals', [['Bids with accept or decline', 'Built in', 'Phone calls only'], ['One chat per person with unread counts', 'Built in with alerts', 'Scattered chats and emails'], ['Deal record with buyer and seller details', 'Automatic in Orders', 'Manual notes']]],
  ['Control & trust', [['Edit, pause or delete listings', 'Any time', 'Not possible'], ['Admin moderation of users and listings', 'Included', 'None']]]];

/* ---------- Legal pages ---------- */
const LEGAL = {
  privacy: { title: 'Privacy Policy', intro: 'This policy explains what information ' + COMPANY.name + ' collects, how we use it and the choices you have.',
    sections: [
      ['Information we collect', 'When you register we collect your name, email, phone number and location. If you tell us you are an authorised dealer we also collect your company name. When you use the platform we also store the listings you post, photos you upload, bids, buy requests, chat messages (including whether and when they were read) and the deals you close.'],
      ['How we use your information', 'We use your information to create and secure your account, show your listings to buyers, connect buyers and sellers, notify you of new messages, record deals in Orders, answer support requests and keep the marketplace safe.'],
      ['What other members can see', 'Visitors who are not signed in see limited listing details. Signed-in members can see the seller’s name, company, phone, email and location on a listing, and the buyer and seller details on a closed deal.'],
      ['Photos and storage', 'Photos you upload are stored with our image hosting provider and shown on your listings. Please do not upload images that contain personal or confidential information.'],
      ['Sharing', 'We do not sell your personal information. We share it only with service providers that help us run the platform, when required by law, or to protect the rights and safety of our members.'],
      ['Data retention and your choices', 'You can edit or delete your listings at any time. To correct or delete your account information, contact us at ' + COMPANY.email + '.'],
      ['Security', 'We take reasonable steps to protect your information, but no online service can be guaranteed to be completely secure. Keep your password private.'],
      ['Changes to this policy', 'We may update this policy from time to time. The latest version is always available on this page.'],
      ['Contact', 'Questions about privacy? Email ' + COMPANY.email + '.']] },
  cookies: { title: 'Cookie Policy', intro: 'This policy explains how ' + COMPANY.name + ' uses cookies and similar browser storage.',
    sections: [
      ['What we store', 'We use your browser’s local storage to keep you signed in and to remember which messages we have already alerted you about. The session token is removed when you sign out.'],
      ['Essential storage', 'The session token is needed for sign-in, posting goods, bidding and chat to work. Without it, those features cannot function.'],
      ['Notifications', 'If you allow notifications in your browser, we use them only to tell you that a new message has arrived. You can turn them off in your browser settings at any time.'],
      ['Third-party content', 'Photos are loaded from our image hosting provider and pages may load fonts from external providers. These providers may receive technical information such as your IP address.'],
      ['Analytics and advertising', 'We do not use advertising cookies. If we add analytics in the future, we will update this policy.'],
      ['Managing storage', 'You can clear local storage and cookies in your browser settings at any time. You will then need to sign in again.'],
      ['Contact', 'Questions about this policy? Email ' + COMPANY.email + '.']] },
  terms: { title: 'Terms & Conditions', intro: 'By creating an account or using ' + COMPANY.name + ', you agree to these terms.',
    sections: [
      ['About the platform', COMPANY.name + ' is an online marketplace that lets members list, find, bid on and buy excess goods. We provide the tools, but we are not a party to the sale between buyer and seller.'],
      ['Your account', 'You must provide accurate information when you register and keep your password private. If you say you are an authorised dealer, that statement must be true. You are responsible for all activity on your account.'],
      ['Listings', 'Sellers must describe goods honestly, including condition, quantity and price, and must only list goods they are entitled to sell. This applies to bulk imports as well. Listings that are misleading, illegal or unsafe may be removed.'],
      ['Bids and buy requests', 'A bid or a Buy now request is a serious offer. A Buy now request is sent to the seller at the posted price and is not a completed sale until the seller accepts it. When the seller accepts, the deal is recorded in Orders and both parties are expected to complete it.'],
      ['Payment and delivery', 'Payment, delivery and inspection are agreed directly between buyer and seller. We recommend checking the goods and confirming details before paying.'],
      ['Prohibited use', 'You must not post fraudulent or stolen goods, harass other members, misuse contact details, or try to disrupt or gain unauthorized access to the platform.'],
      ['Moderation', 'Administrators may remove listings and block accounts that break these terms.'],
      ['Liability', 'The platform is provided as available. To the extent permitted by law, we are not liable for losses arising from deals between members or from interruptions of the service.'],
      ['Changes to these terms', 'We may update these terms from time to time. Continuing to use the platform means you accept the updated terms.'],
      ['Contact', 'Questions about these terms? Email ' + COMPANY.email + '.']] }
};

const PATHS = { home: '/', market: '/marketplace', contact: '/contact', privacy: '/privacy-policy', cookies: '/cookie-policy', terms: '/terms-and-conditions',
  post: '/post', mine: '/my-listings', messages: '/messages', orders: '/orders', dash: '/admin', users: '/admin/users', forms: '/admin/forms' };
const routeFromPath = p => {
  p = (p || '/').replace(/\/+$/, '') || '/';
  let m = p.match(/^\/marketplace\/([^/]+)$/); if (m) return { page: 'item', id: decodeURIComponent(m[1]) };
  m = p.match(/^\/edit\/([^/]+)$/); if (m) return { page: 'edit', id: decodeURIComponent(m[1]) };
  m = p.match(/^\/(solutions|resources)\/([^/]+)$/); if (m) return { page: 'info', id: decodeURIComponent(m[2]) };
  return { page: Object.keys(PATHS).find(k => PATHS[k] === p) || 'home', id: '' };
};
const pathFor = (p, id) => p === 'item' ? '/marketplace/' + encodeURIComponent(id) : p === 'edit' ? '/edit/' + encodeURIComponent(id)
  : p === 'info' ? '/' + (INFO[id] ? INFO[id].section : 'solutions') + '/' + encodeURIComponent(id) : PATHS[p];
// In-app link click: keep ctrl/cmd/shift/middle-click working (open in new tab), otherwise navigate inside the app
const lk = (e, go, p, id) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; e.preventDefault(); go(p, id); };
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
// chat list time: time if today, otherwise the date
const shortTime = t => { if (!t) return ''; const d = new Date(Number(t)), n = new Date(); return d.toDateString() === n.toDateString() ? hm(t) : when(t); };
// day label for separators inside a chat
const dayLabel = t => { const d = new Date(Number(t)), n = new Date(), y = new Date(); y.setDate(n.getDate() - 1);
  return d.toDateString() === n.toDateString() ? 'Today' : d.toDateString() === y.toDateString() ? 'Yesterday' : when(t); };
// Build a WhatsApp link (10-digit numbers are treated as Indian numbers)
const waLink = (phone, text) => {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10) d = '91' + d; else if (d.length === 11 && d[0] === '0') d = '91' + d.slice(1);
  return d ? 'https://wa.me/' + d + '?text=' + encodeURIComponent(text) : '';
};
const note = (m, err, fn) => window.notify && window.notify(m, err, fn);
const run = (p, ok) => p.then(r => { if (ok) note(ok); return r; }).catch(e => { note(e.message, true); throw e; });

/* ---------- New message notifications (desktop + mobile browsers) ---------- */
const notifSupported = () => typeof window !== 'undefined' && 'Notification' in window;
const showOS = items => {
  if (!notifSupported() || Notification.permission !== 'granted' || !items.length) return;
  const last = items[items.length - 1];
  const title = items.length > 1 ? items.length + ' new messages arrived' : 'New message arrived';
  const opts = { body: last.from + (last.title ? ' · ' + last.title : '') + ': ' + last.text.slice(0, 100), tag: 'sx-' + last.peerId, renotify: true, icon: '/favicon.ico', data: { url: '/messages' } };
  const fallback = () => { try { new Notification(title, opts); } catch (e) {} };
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) // mobile browsers need a service worker to show notifications
      navigator.serviceWorker.getRegistration().then(reg => reg ? reg.showNotification(title, opts) : fallback()).catch(fallback);
    else fallback();
  } catch (e) { fallback(); }
  try { if (navigator.vibrate) navigator.vibrate([180, 80, 180]); } catch (e) {}
};

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
  const val = k => f[k] === undefined ? '' : f[k];
  const go = () => {
    if (mode === 'register') {
      const miss = [['name', 'full name'], ['phone', 'phone'], ['email', 'email'], ['location', 'location'], ['password', 'password']].find(x => !String(f[x[0]] || '').trim());
      if (miss) return note('Please fill ' + miss[1] + '.', true);
      if (f.dealer && !String(f.company || '').trim()) return note('Please fill company name.', true);
    }
    setBusy(true); run(call(mode === 'login' ? 'login' : 'register', { ...f, dealer: !!f.dealer })).then(onDone).catch(() => {}).finally(() => setBusy(false));
  };
  return (
    <div className="ov" onClick={close}><div className="modal" onClick={e => e.stopPropagation()}>
      <h3>{mode === 'login' ? 'Sign in' : 'Create your account'}</h3><div className="line" style={{ margin: '8px 0 18px' }} />
      <div className="form">
        {mode === 'register' && <>
          <div className="full"><label>Full name *</label><input className="in" value={val('name')} onChange={set('name')} /></div>
          <div className="full"><label>Phone *</label><input className="in" type="tel" value={val('phone')} onChange={set('phone')} /></div></>}
        <div className="full"><label>Email *</label><input className="in" type="email" value={val('email')} onChange={set('email')} /></div>
        {mode === 'register' && <div className="full"><label>Location *</label><input className="in" placeholder="City, state" value={val('location')} onChange={set('location')} /></div>}
        <div className="full"><label>Password *</label><input className="in" type="password" value={val('password')} onChange={set('password')} onKeyDown={e => e.key === 'Enter' && go()} /></div>
        {mode === 'register' && <>
          <div className="full"><label className="chk"><input type="checkbox" checked={!!f.dealer} onChange={e => setF({ ...f, dealer: e.target.checked })} /> I am an authorised dealer</label></div>
          {f.dealer && <div className="full"><label>Company name *</label><input className="in" value={val('company')} onChange={set('company')} /></div>}</>}
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
      <b>Drag & drop {max === 1 ? 'a photo' : 'photos'} here</b> or click to choose (up to {max}{max > 1 ? ', multiple allowed' : ''})
      <input ref={ref} type="file" accept="image/*" multiple={max > 1} hidden onChange={e => { add(e.target.files); e.target.value = ''; }} /></div>
    {(images.length > 0 || busy > 0) && <div className="prev">
      {images.map((u, k) => <div key={u}><img src={u} alt="" />{k === 0 && <span className="first">Cover</span>}
        <button type="button" onClick={() => onChange(p => p.filter((_, j) => j !== k))}>✕</button></div>)}
      {Array.from({ length: busy }).map((_, k) => <div key={'b' + k}>…</div>)}</div>}
  </div>);
}

/* ---------- Shared small pieces ---------- */
const Head = ({ intro, title, text, dark }) => (<div className={'shead' + (dark ? ' dark' : '')}>
  {intro && <span className="sintro">{intro}</span>}<h2>{title}</h2><div className="line" />{text && <p>{text}</p>}</div>);

// Image block with a gradient fallback if the photo fails to load
function Pic({ src, className = '', alt = '' }) {
  const [bad, setBad] = useState(false);
  return <div className={'pic ' + className}>{!bad && src && <img src={src} alt={alt} loading="lazy" onError={() => setBad(true)} />}</div>;
}

/* ---------- Home ---------- */
function Home({ user, go, openAuth }) {
  const [tab, setTab] = useState(0), [more, setMore] = useState(false), st = STEPS[tab];
  const pillars = ITEMS.filter(i => i.section === 'solutions' && i.group === 'Product');
  return (<>
    <section className="hero">
      <div className="wrap hin">
        <div className="hl">
          <div className="tag">The marketplace for excess goods</div>
          <h1>Sell what you don’t need.<br />Find what you do.<br />Close the deal faster.</h1><div className="line" />
          <p>{COMPANY.name} connects industries that have idle goods and spare parts with buyers who need them. Post with photos, receive bids, chat directly and keep every deal on record.</p>
          <div className="acts">
            <button className="btn pur" onClick={() => go('market')}>Browse marketplace</button>
            <button className="btn ghost" onClick={() => go('post')}>Post your goods</button>
            {!user && <button className="btn ghost" onClick={() => openAuth('register')}>Create free account</button>}
          </div>
        </div>
        <div className="hcol" aria-hidden="true">{IMG.hero.map((s, k) => <Pic key={k} className={'h' + k} src={s} />)}</div>
      </div></section>
    <div className="clients"><div className="marq">{CATS.concat(CATS).map((c, i) => <span key={i}>{c}</span>)}</div></div>
    <section className="sec mintbg"><div className="wrap"><h2>A simple way to buy and sell excess goods</h2>
      <div className="stats3">{STATS.map(x => <div className="stat" key={x[0]}><h3>{x[0]}</h3><h4>{x[1]}</h4><div className="bar3" /><p>{x[2]}</p></div>)}</div></div></section>
    <section className="sec alt"><div className="wrap"><h2>Everything you need to buy and sell</h2><div className="line" />
      <div className="grid g3">{pillars.map(i => <div className="feat lnk hasimg" key={i.slug} onClick={() => go('info', i.slug)}>
        <Pic className="fimg" src={IMG.pillar[i.slug]} alt={i.name} />
        <div className="fbody"><h4>{i.name}{i.badge && <span className="chip new" style={{ marginLeft: 8 }}>{i.badge}</span>}</h4><p>{i.desc}</p></div></div>)}</div></div></section>
    <section className="sec"><div className="wrap"><Head intro="Built for You" title="Who is SpareXchange for?" text="Different needs, one marketplace. See how it helps you and your team." />
      <div className="grid g3">{ROLES.map(r => <div className="feat role hasimg" key={r[1]}><Pic className="fimg" src={r[0]} alt={r[1]} />
        <div className="fbody"><h3>{r[1]}</h3><div className="bar3" /><p>{r[2]}</p><p><b>{r[3]}</b></p>
          <a className="more" href={pathFor('info', r[4])} onClick={e => lk(e, go, 'info', r[4])}>See how →</a></div></div>)}</div></div></section>
    <section className="sec dark"><div className="wrap"><Head dark intro="How it works" title="From listing to closed deal in four steps" text="A clear process keeps buyers and sellers connected and every deal recorded." />
      <div className="tabs">{STEPS.map((s, k) => <button key={s[0]} className={k === tab ? 'on' : ''} onClick={() => setTab(k)}>{s[0]}</button>)}</div>
      <div className="split"><div><div className="bignum">0{tab + 1}</div><h3>{st[0]}</h3><hr /><p>{st[1]}</p></div>
        <Pic className="stepimg" src={st[2]} alt={st[0]} /></div></div></section>
    <section className="sec"><div className="wrap"><Head intro="Why SpareXchange" title="A better way than calls and messages" text="Everything that normally happens across phone calls, chats and notes now happens in one place." />
      <div className={'cmp' + (more ? '' : ' collapsed')}><div className="cmp-head"><div>Capabilities</div><div>SpareXchange</div><div>Traditional channels</div></div>
        {COMPARE.map(sec => <React.Fragment key={sec[0]}><div className="cmp-sec">{sec[0]}</div>
          {sec[1].map(r => <div className="cmp-row" key={r[0]}><div>{r[0]}</div><div className="yes">{r[1]}</div><div>{r[2]}</div></div>)}</React.Fragment>)}</div>
      <div style={{ textAlign: 'center', marginTop: 18 }}><button className="btn ghost" onClick={() => setMore(!more)}>{more ? 'Show less' : 'Show more'}</button></div></div></section>
    <section className="sec grad"><div className="wrap"><Head dark intro="Built for Trust" title="Visitors browse, members transact" text="Registered members see prices, seller contacts and full specifications, and administrators keep the marketplace safe." />
      <div className="split"><div><h3>Key capabilities</h3><hr />
        <ul><li>Free registration with name, phone, email and location.</li><li>Price, seller phone and full specs after sign in.</li><li>Admin moderation of users and listings.</li></ul></div>
        <Pic className="stepimg" src={IMG.trust} alt="Trust and safety" /></div></div></section>
    <section className="cta"><h2 style={{ color: '#fff' }}>Ready to sell or find your next part?</h2><div className="line" style={{ margin: '14px auto' }} />
      <p>Join {COMPANY.name} for free, post your excess goods or browse listings from other industries today.</p>
      <button className="btn pur" onClick={() => user ? go('market') : openAuth('register')}>{user ? 'Browse marketplace' : 'Create free account'}</button></section>
  </>);
}

/* ---------- Solutions / Resources detail page ---------- */
function Info({ id, go, user, openAuth }) {
  const it = INFO[id];
  if (!it) return <div className="page"><div className="wrap"><button className="btn ghost sm" onClick={() => go('home')}>← Back to home</button><div className="empty">Page not found.</div></div></div>;
  const menu = MENUS.find(m => m.key === it.section);
  const rel = ITEMS.filter(x => x.section === it.section && x.slug !== it.slug && (x.group === it.group || it.section !== 'solutions'));
  return (<div className="page"><div className="wrap">
    <button className="btn ghost sm" onClick={() => go('home')}>← Back to home</button>
    <div className="ihero">
      <div><span className="chip">{menu.label}</span><span className="chip new">{it.group}</span>{it.badge && <span className="chip warn">{it.badge}</span>}</div>
      <h2>{it.icon} {it.name}</h2>
      <div className="itag">{it.tag}</div><div className="line" style={{ margin: '14px 0' }} />
      <p className="idesc">{it.desc}</p>
      <div className="row" style={{ marginTop: 18 }}>
        <button className="btn pur" onClick={() => go('market')}>Browse marketplace</button>
        <button className="btn ghost" onClick={() => go('contact')}>Contact us</button>
        {!user && <button className="btn ghost" onClick={() => openAuth('register')}>Create free account</button>}
      </div>
    </div>
    {it.points.length > 0 && <><h3 style={{ margin: '28px 0 14px' }}>{it.section === 'solutions' ? 'Key capabilities' : 'What you will find'}</h3>
      <div className="grid">{it.points.map(p => <div className="feat" key={p}><b>✔ {p}</b></div>)}</div></>}
    {it.faq && <div className="panel" style={{ marginTop: 20 }}>{it.faq.map(q => <details className="faq" key={q[0]}><summary>{q[0]}</summary><p>{q[1]}</p></details>)}</div>}
    {rel.length > 0 && <><h3 style={{ margin: '34px 0 14px' }}>{it.section === 'solutions' ? 'Related in ' + it.group : 'More in ' + menu.label}</h3>
      <div className="grid">{rel.map(r => <div className="feat lnk" key={r.slug} onClick={() => go('info', r.slug)}><i>{r.icon}</i><h4>{r.name}{r.badge && <span className="chip new" style={{ marginLeft: 8 }}>{r.badge}</span>}</h4><p>{r.tag}</p></div>)}</div></>}
  </div></div>);
}

/* ---------- Contact page (with developer details) ---------- */
function Contact({ go }) {
  return (<div className="page"><div className="wrap">
    <Head intro="Contact" title="Get in touch" text="Questions about listings, your account or the platform? We would love to hear from you." />
    <div className="cgrid">
      <div className="panel cbox"><span className="chip">Support</span><h3>{COMPANY.name}</h3>
        <p>For help with your account, listings, bids or deals, write to our support team.</p>
        <div className="row"><a className="btn" href={'mailto:' + COMPANY.email}>✉️ {COMPANY.email}</a></div></div>
      <div className="panel cbox dev"><span className="chip new">Contact Developer</span><h3>{DEV.name}</h3>
        <p>This platform was built and is maintained by {DEV.name}.</p>
        <div className="row"><a className="btn" href={'mailto:' + DEV.email}>✉️ {DEV.email}</a>
          <a className="btn ghost" href={DEV.site} target="_blank" rel="noopener noreferrer">🌐 Visit website</a></div></div>
    </div>
    <div style={{ marginTop: 26 }}><button className="btn ghost sm" onClick={() => go('home')}>← Back to Home</button></div>
  </div></div>);
}

/* ---------- Legal pages: Privacy, Cookies, Terms ---------- */
function Legal({ id, go }) {
  const d = LEGAL[id];
  return (<div className="page"><div className="wrap">
    <button className="btn ghost sm" onClick={() => go('home')}>← Back to Home</button>
    <div className="ltabs">{['privacy', 'cookies', 'terms'].map(k => <a key={k} className={k === id ? 'on' : ''} href={pathFor(k)} onClick={e => lk(e, go, k)}>{LEGAL[k].title}</a>)}</div>
    <div className="ihero legal"><h2>{d.title}</h2><div className="line" style={{ margin: '12px 0' }} />
      <p className="idesc">{d.intro}</p>
      {d.sections.map((s, i) => <div className="lsec" key={s[0]}><h3>{i + 1}. {s[0]}</h3><p>{s[1]}</p></div>)}
      <p className="lupd">Last updated: October 2026</p></div>
  </div></div>);
}

/* ---------- Header dropdown mega menu (Solutions / Resources) ---------- */
function NavMenu({ m, open, setOpen, active, go }) {
  const pr = m.promo;
  return (<div className={'mm' + (open ? ' open' : '')}>
    <button className={'mm-btn' + (active ? ' on' : '')} aria-expanded={open} onClick={e => { e.stopPropagation(); setOpen(open ? '' : m.key); }}>{m.label} <span className="caret">▾</span></button>
    {open && <div className="mega" onClick={e => e.stopPropagation()}>
      {m.groups.map(g => <div className="mcol" key={g}><h5>{g}</h5>
        {ITEMS.filter(i => i.section === m.key && i.group === g).map(i =>
          <button className="mi" key={i.slug} onClick={() => go('info', i.slug)}>
            <span className="mi-ic">{i.icon}</span>
            <span><b>{i.name}{i.badge && <span className="pill">{i.badge}</span>}</b>{m.key === 'solutions' && <small>{i.tag}</small>}</span></button>)}</div>)}
      {pr && <div className="promo">{pr.tag && <span className="ptag">{pr.tag}</span>}<h6>{pr.title}</h6>{pr.text && <p>{pr.text}</p>}
        <button className="btn pur sm" onClick={() => go(pr.to, pr.id)}>{pr.btn}</button></div>}
    </div>}
  </div>);
}

/* ---------- Footer (same links as the navbar) ---------- */
function Foot({ go, links }) {
  const target = k => (k === 'solutions' || k === 'resources') ? ['info', (ITEMS.find(i => i.section === k) || {}).slug] : [k];
  const L = l => { const t = target(l[0]); return <a key={l[0]} href={pathFor(t[0], t[1])} onClick={e => lk(e, go, t[0], t[1])}>{l[1]}</a>; };
  return (<footer className="foot"><div className="wrap">
    <div className="fgrid">
      <div className="fcomp"><div className="flogo">SPARE<b>XCHANGE</b></div><p>The marketplace for excess goods.</p><p>{COMPANY.email}</p></div>
      <div className="fcol"><h5>Quick links</h5><div className="flinks">{links.map(L)}</div></div>
    </div>
    <div className="flegal"><span>© {new Date().getFullYear()} {COMPANY.name}</span>
      <span className="fl">{['privacy', 'cookies', 'terms'].map(k => <a key={k} href={pathFor(k)} onClick={e => lk(e, go, k)}>{LEGAL[k].title}</a>)}</span>
      <span className="fdev">Developed by <a href={DEV.site} target="_blank" rel="noopener noreferrer">{DEV.name}</a></span></div>
  </div></footer>);
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

// Popup that asks: start in WhatsApp or in the built-in app chat (portal, so card hover transforms don't break the fixed overlay)
function ChatChoice({ title, text, waOk, onWA, onApp, close }) {
  return createPortal(
    <div className="ov" onClick={close}><div className="modal" onClick={e => e.stopPropagation()}>
      <h3>{title}</h3><div className="line" style={{ margin: '8px 0 14px' }} />
      <p style={{ margin: '0 0 16px', color: 'var(--mut)' }}>{text}</p>
      <div className="cchoice">
        <button className="wa" disabled={!waOk} onClick={onWA}><b>Start in WhatsApp</b><span>{waOk ? 'Opens WhatsApp with a ready message to the seller' : 'Seller phone number is not available'}</span></button>
        <button onClick={onApp}><b>Start in app chat</b><span>Talk inside {COMPANY.name}, the seller gets a notification</span></button>
      </div>
      <div style={{ marginTop: 14 }}><button className="btn ghost sm" onClick={close}>Cancel</button></div>
    </div></div>, document.body);
}

function BuyBox({ g, user, reload, openChat }) {
  const [amt, setAmt] = useState(''), [ask, setAsk] = useState(null); // ask: null | 'chat' | 'bid'
  if (g.status !== 'available' || g.own) return null;
  // one chat per person: the chat is with the seller, this listing is only shown as the topic
  const chatArgs = { peerId: g.ownerId, goodId: g.id, title: g.title, withName: g.ownerName };
  const waOk = !!waLink(g.phone, 'x');

  // Chat button: WhatsApp or in-app
  const startChat = how => {
    setAsk(null);
    if (how === 'wa') window.open(waLink(g.phone, 'Hi ' + g.ownerName + ', I am interested in "' + g.title + '" (' + money(g.price) + ') listed on ' + COMPANY.name + '.'), '_blank');
    else openChat(chatArgs);
  };

  // Bid: always saved in the app. If WhatsApp is chosen, the bid is also posted in the seller's in-app chatbox and WhatsApp opens.
  const askBid = () => { if (!(Number(amt) > 0)) return note('Enter your bid amount.', true); setAsk('bid'); };
  const placeBid = how => {
    setAsk(null);
    const url = how === 'wa' ? waLink(g.phone, 'Hi ' + g.ownerName + ', I have placed a bid of ' + money(amt) + ' for "' + g.title + '" on ' + COMPANY.name + '.') : '';
    const w = url ? window.open('', '_blank') : null; // open now so the browser does not block it
    run(call('bid_place', { goodId: g.id, amount: amt }), 'Bid sent to seller')
      .then(() => how === 'wa' ? call('chat_send', { peerId: g.ownerId, goodId: g.id, text: 'Bid of ' + money(amt) + ' placed. I am also reaching out on WhatsApp.' }).catch(() => {}) : null)
      .then(() => {
        if (url) { if (w) w.location.href = url; else note('Tap here to open WhatsApp', false, () => window.open(url, '_blank')); }
        setAmt(''); reload();
      }).catch(() => { if (w) w.close(); });
  };

  // Buy now = a message + request to the seller at the posted price. The seller closes the deal.
  const buy = () => window.confirm('Send a buy request for "' + g.title + '" at the posted price of ' + money(g.price) + '?\nThe seller will confirm and close the deal.') &&
    run(call('buy', { goodId: g.id }), 'Buy request sent to the seller').then(() => openChat(chatArgs)).catch(() => {});
  return (<>
    <div className="fb"><input className="in" type="number" placeholder={'Your bid (' + CUR + ')'} value={amt} onChange={e => setAmt(e.target.value)} /><button className="btn pur sm" onClick={askBid}>Bid</button></div>
    <div className="row"><button className="btn sm" onClick={buy}>Buy now</button>
      <button className="btn sm ghost" onClick={() => setAsk('chat')}>Chat</button></div>
    {ask === 'chat' && <ChatChoice title="Start chat" text={'How would you like to talk to ' + g.ownerName + '?'} waOk={waOk} close={() => setAsk(null)} onWA={() => startChat('wa')} onApp={() => startChat('app')} />}
    {ask === 'bid' && <ChatChoice title={'Place bid of ' + money(amt)} text={'Where would you like to continue the conversation with ' + g.ownerName + '? Your bid is sent to the seller either way.'} waOk={waOk} close={() => setAsk(null)} onWA={() => placeBid('wa')} onApp={() => placeBid('app')} />}
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
      {g.myBid && <div className="chip new" style={{ alignSelf: 'flex-start' }}>{g.myBid.kind === 'buy' ? 'Buy request ' : 'Your bid '}{money(g.myBid.amount)} · {g.myBid.status}</div>}
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
  // refresh this page after the chatbot places a bid or buy request
  useEffect(() => { window.addEventListener('sx-bid', load); return () => window.removeEventListener('sx-bid', load); }, [load]);
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
        {g.myBid && <div className="chip new" style={{ alignSelf: 'flex-start' }}>{g.myBid.kind === 'buy' ? 'Buy request ' : 'Your bid '}{money(g.myBid.amount)} · {g.myBid.status}</div>}
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

/* ---------- Bulk post: pick type, download format, import file ---------- */
function Bulk({ form, go, back }) {
  const [pick, setPick] = useState(''), [rows, setRows] = useState([]), [name, setName] = useState(''), [busy, setBusy] = useState(false), [result, setResult] = useState(null), ref = useRef();
  const cat = pick === '__g' ? 'General' : pick;
  const c = form.categories.find(x => x.name === pick);
  const fields = form.defaults.concat(c ? c.fields : []);
  const good = rows.filter(r => !r.err), bad = rows.length - good.length;
  const choose = v => { setPick(v); setRows([]); setName(''); setResult(null); };
  const download = () => {
    const head = fields.map(f => f.label + (f.required ? ' *' : '')).concat('Image URLs (optional)');
    const blob = new Blob(['\uFEFF' + head.map(csvQuote).join(',') + '\r\n'], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'sparexchange-' + (cat || 'goods').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-format.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  };
  const onFile = file => {
    if (!file) return; setName(file.name); setResult(null);
    const r = new FileReader();
    r.onload = () => {
      const t = csvParse(r.result);
      if (t.length < 2) { note('The file has no data rows.', true); setRows([]); return; }
      const norm = s => String(s).replace(/\*/g, '').replace(/\(optional\)/i, '').trim().toLowerCase();
      const head = t[0].map(norm), col = {};
      fields.forEach(f => { col[f.key] = head.indexOf(norm(f.label)); });
      const imgCol = head.findIndex(h => h.indexOf('image') === 0);
      if (fields.some(f => f.required && col[f.key] < 0)) { note('This file does not match the format of the selected product type. Please download the format again.', true); setRows([]); return; }
      if (t.length - 1 > BULK_MAX) note('Only the first ' + BULK_MAX + ' rows are imported at a time.', true);
      setRows(t.slice(1, BULK_MAX + 1).map((r, i) => {
        const values = {}; let err = '';
        fields.forEach(f => {
          let v = col[f.key] >= 0 && r[col[f.key]] !== undefined ? String(r[col[f.key]]).trim() : '';
          if (f.type === 'select' && v) { const o = (f.options || []).find(x => x.toLowerCase() === v.toLowerCase()); if (o) v = o; else err = err || f.label + ' must be one of: ' + (f.options || []).join(', '); }
          if (f.type === 'number' && v && isNaN(Number(v))) err = err || f.label + ' must be a number';
          if (f.required && !v) err = err || f.label + ' is required';
          if (v) values[f.key] = v;
        });
        if (!err && (Number(values.qty) <= 0 || Number(values.price) <= 0)) err = 'Quantity and price must be greater than 0';
        const images = imgCol >= 0 ? String(r[imgCol] || '').split(/[\s,|]+/).filter(x => /^https:\/\//.test(x)) : [];
        return { n: i + 2, values, images, err };
      }));
    };
    r.readAsText(file);
  };
  const doImport = () => {
    setBusy(true);
    run(call('goods_bulk', { category: cat, rows: good.map(r => ({ values: r.values, images: r.images })) }))
      .then(res => {
        if (res.added) { note(res.added + ' listing(s) imported' + (res.errors.length ? ', ' + res.errors.length + ' skipped' : '')); go('mine'); }
        else { setResult(res); note('No rows were imported.', true); }
      }).catch(() => {}).finally(() => setBusy(false));
  };
  return (<div className="page"><div className="wrap" style={{ maxWidth: 980 }}>
    <button className="btn ghost sm" onClick={back}>← Single or bulk</button>
    <h2 style={{ marginTop: 14 }}>Bulk post goods</h2><div style={{ color: 'var(--mut)', marginBottom: 18 }}>Choose the product type, download the file format, fill it in and import it.</div>
    <div className="panel">
      <div className="stepno">1</div><b>Which type of product are you importing?</b>
      <div style={{ margin: '10px 0 22px', maxWidth: 420 }}><select className="sel" value={pick} onChange={e => choose(e.target.value)}>
        <option value="">Select product type…</option><option value="__g">General / other</option>{form.categories.map(x => <option key={x.id}>{x.name}</option>)}</select></div>
      {pick && <>
        <div className="stepno">2</div><b>Download the file format</b>
        <p style={{ color: 'var(--mut)', margin: '6px 0 10px' }}>The file has one column for every field of this product type (* = required). Fill one row per item and save it as CSV (Excel: File → Save As → CSV).</p>
        <div style={{ marginBottom: 8 }}>{fields.map(f => <span className="chip" key={f.key}>{f.label}{f.required ? ' *' : ''}</span>)}<span className="chip warn">Image URLs (optional)</span></div>
        {fields.filter(f => f.type === 'select').map(f => <div key={f.key} style={{ fontSize: 12, color: 'var(--mut)' }}>{f.label}: {(f.options || []).join(' / ')}</div>)}
        <div style={{ margin: '14px 0 24px' }}><button className="btn pur" onClick={download}>⬇ Download format (.csv)</button></div>
        <div className="stepno">3</div><b>Import your filled file</b>
        <div className="drop" style={{ marginTop: 10 }} onClick={() => ref.current.click()}>{name ? <b>{name}</b> : <><b>Click to choose the filled .csv file</b> (up to {BULK_MAX} rows)</>}
          <input ref={ref} type="file" accept=".csv,text/csv" hidden onChange={e => { onFile(e.target.files[0]); e.target.value = ''; }} /></div>
        {rows.length > 0 && <>
          <div style={{ margin: '16px 0 8px' }}><span className="chip">{rows.length} rows read</span><span className="chip new">{good.length} ready to import</span>{bad > 0 && <span className="chip sold">{bad} with errors</span>}</div>
          <div className="tw" style={{ maxHeight: 360, overflow: 'auto' }}><table><thead><tr><th>Row</th><th>Item</th><th>Qty</th><th>Condition</th><th>Price</th><th>Status</th></tr></thead>
            <tbody>{rows.slice(0, 200).map(r => <tr key={r.n}><td>{r.n}</td><td>{r.values.title || '–'}</td><td>{r.values.qty || '–'}</td><td>{r.values.condition || '–'}</td><td>{r.values.price ? money(r.values.price) : '–'}</td>
              <td>{r.err ? <span style={{ color: 'var(--bad)' }}>✕ {r.err}</span> : <span style={{ color: 'var(--ok)' }}>✓ OK</span>}</td></tr>)}</tbody></table></div>
          {rows.length > 200 && <div style={{ fontSize: 12, color: 'var(--mut)', marginTop: 6 }}>Showing the first 200 rows. All valid rows are imported.</div>}
          <div style={{ marginTop: 18 }}><button className="btn" disabled={busy || !good.length} onClick={doImport}>{busy ? 'Importing…' : 'Import ' + good.length + ' listing(s)'}</button></div></>}
        {result && result.errors.length > 0 && <div className="lock" style={{ marginTop: 14 }}>{result.errors.slice(0, 10).map(e => <div key={e.row}>Row {e.row + 1}: {e.error}</div>)}</div>}
      </>}
    </div></div></div>);
}

/* ---------- Post excess goods: single or bulk (dynamic form from admin) ---------- */
function Post({ go, editId }) {
  const pf0 = window.sxPrefill || null; // details typed in the chatbot ("Sell by chat")
  const [mode, setMode] = useState(pf0 ? 'single' : 'choose'), [form, setForm] = useState(null), [cat, setCat] = useState((pf0 && pf0.category) || ''), [v, setV] = useState((pf0 && pf0.values) || {}), [busy, setBusy] = useState(false), [imgs, setImgs] = useState([]);
  useEffect(() => {
    window.sxPrefill = null;
    const f = () => { const x = window.sxPrefill; if (!x) return; window.sxPrefill = null; setMode('single'); setCat(x.category || ''); setV(x.values || {}); setImgs([]); };
    window.addEventListener('sx-prefill', f); return () => window.removeEventListener('sx-prefill', f);
  }, []);
  useEffect(() => {
    call('form_get').then(setForm).catch(e => note(e.message, true));
    if (editId) call('goods_get', { id: editId }).then(g => { setCat(g.category === 'General' ? '' : g.category); setV({ ...g.data, title: g.title, qty: g.qty, condition: g.condition, price: g.price }); setImgs(g.defaultImg ? [] : (g.images || [])); }).catch(e => note(e.message, true));
  }, [editId]);
  if (!form) return <div className="page"><div className="wrap empty">Loading form…</div></div>;
  const m = editId ? 'single' : mode;
  if (m === 'choose') return (<div className="page"><div className="wrap" style={{ maxWidth: 860 }}>
    <h2>Post excess goods</h2><div style={{ color: 'var(--mut)', marginBottom: 18 }}>Do you want to post a single item or many goods in bulk?</div>
    <div className="modes">
      <div className="mode" role="button" tabIndex={0} onClick={() => setMode('single')} onKeyDown={e => e.key === 'Enter' && setMode('single')}><i>📦</i><h3>Single item</h3><p>Fill in a guided form for one product, add photos and publish.</p><span className="btn sm">Post single item</span></div>
      <div className="mode" role="button" tabIndex={0} onClick={() => setMode('bulk')} onKeyDown={e => e.key === 'Enter' && setMode('bulk')}><i>🗂️</i><h3>Bulk goods</h3><p>Download the file format for your product type, fill many items and import them at once.</p><span className="btn pur sm">Post in bulk</span></div>
    </div></div></div>);
  if (m === 'bulk') return <Bulk form={form} go={go} back={() => setMode('choose')} />;
  const c = form.categories.find(x => x.name === cat);
  const fields = form.defaults.concat(c ? c.fields : []);
  const dimg = (c && c.image) || form.defaultImage;
  const set = (k, val) => setV({ ...v, [k]: val });
  const submit = () => { setBusy(true); run(call(editId ? 'goods_update' : 'goods_create', { id: editId, category: cat || 'General', values: v, images: imgs }), editId ? 'Listing updated' : 'Listing posted!').then(() => go('mine')).catch(() => {}).finally(() => setBusy(false)); };
  return (<div className="page"><div className="wrap" style={{ maxWidth: 860 }}>
    {!editId && <button className="btn ghost sm" onClick={() => setMode('choose')} style={{ marginBottom: 14 }}>← Single or bulk</button>}
    <h2>{editId ? 'Edit listing' : 'Post a single item'}</h2><div style={{ color: 'var(--mut)', marginBottom: 18 }}>Select the product type — the form adapts to it.</div>
    <div className="panel">
      <div style={{ marginBottom: 16 }}><label>Product type</label>
        <select className="sel" value={cat} onChange={e => { setCat(e.target.value); }}><option value="">General / other</option>{form.categories.map(x => <option key={x.id}>{x.name}</option>)}</select></div>
      <div className="form">{fields.map(f => <Field key={f.key} f={f} v={v[f.key]} set={set} />)}</div>
      <div style={{ marginTop: 20 }}><label>Photos of the goods (first photo is the cover)</label><ImageUploader images={imgs} onChange={setImgs} />
        {!imgs.length && dimg && <div className="dhint"><img src={dimg} alt="" /><span>No photo added: this default image will be shown on your listing.</span></div>}</div>
      <div style={{ marginTop: 22 }}><button className="btn" disabled={busy} onClick={submit}>{busy ? 'Saving…' : editId ? 'Save changes' : 'Publish listing'}</button>{editId && <button className="btn ghost" style={{ marginLeft: 10 }} onClick={() => go('mine')}>Cancel</button>}</div>
    </div></div></div>);
}

/* ---------- My listings with bid management ---------- */
function Mine({ openChat, go }) {
  const [list, setList] = useState(null);
  const load = () => call('goods_mine').then(setList).catch(e => note(e.message, true));
  useEffect(() => { load(); }, []);
  useEffect(() => { window.addEventListener('sx-bid', load); return () => window.removeEventListener('sx-bid', load); }, []);
  const respond = (bidId, accept) => run(call('bid_respond', { bidId, accept }), accept ? 'Accepted – deal closed' : 'Declined').then(load).catch(() => {});
  const rm = id => window.confirm('Delete this listing?') && run(call('goods_delete', { id }), 'Deleted').then(load).catch(() => {});
  return (<div className="page"><div className="wrap"><h2>My listings</h2>
    {!list ? <div className="empty">Loading…</div> : !list.length ? <div className="empty">You haven’t posted anything yet.</div> :
      <div className="grid">{list.map(g => (
        <div className="card" key={g.id}>
          <Slider images={g.images} onOpen={() => go('item', g.id)} />
          <div><span className="chip">{g.category}</span>{g.status === 'sold' ? <span className="chip sold">SOLD</span> : g.status === 'paused' ? <span className="chip warn">PAUSED</span> : <span className="chip new">Available</span>}</div>
          <h4>{g.title}</h4><div className="price">{money(g.price)} <small style={{ fontSize: 12, color: 'var(--mut)' }}>· qty {g.qty}</small></div>
          <strong style={{ fontSize: 13 }}>Bids & buy requests ({g.bids.length})</strong>
          {!g.bids.length && <div style={{ fontSize: 13, color: 'var(--mut)' }}>No bids yet.</div>}
          {g.bids.map(b => (<div className="bidrow" key={b.id}>
            <div><b>{money(b.amount)}</b> <span style={{ color: 'var(--mut)' }}>by {b.bidder}</span><br />{b.kind === 'buy' && <span className="chip warn">Buy request · posted price</span>}<span className="chip">{b.status}</span></div>
            <div className="row">
              {b.status === 'pending' && g.status === 'available' && <><button className="btn ok sm" onClick={() => respond(b.id, true)}>{b.kind === 'buy' ? 'Accept & close deal' : 'Accept'}</button><button className="btn bad sm" onClick={() => respond(b.id, false)}>Decline</button></>}
              <button className="btn ghost sm" onClick={() => openChat({ peerId: b.bidderId, goodId: g.id, title: g.title, withName: b.bidder })}>Chat</button></div>
          </div>))}
          <div className="acts2">
            <button className="btn sm" disabled={g.status === 'sold'} onClick={() => go('edit', g.id)}>✎ Edit</button>
            {g.status !== 'sold' && <button className="btn sm ghost" onClick={() => run(call('goods_status', { id: g.id, status: g.status === 'paused' ? 'available' : 'paused' }), g.status === 'paused' ? 'Listing resumed' : 'Listing paused').then(load).catch(() => {})}>{g.status === 'paused' ? '▶ Resume' : '⏸ Pause'}</button>}
            <button className="btn bad sm" onClick={() => rm(g.id)}>Delete</button></div>
        </div>))}</div>}
  </div></div>);
}

/* ---------- Messages (WhatsApp style: one chat per person) ----------
   - the left list has ONE row per person, with the number of unread messages in that chat
   - opening a chat tells the server to mark everything received from that person as read
   - the message area has its own scrollbar, so older messages can be scrolled up to
   - while a chat is open on screen, messages that arrive are marked read straight away (like WhatsApp) */
function Messages({ thread, setThread }) {
  const [inbox, setInbox] = useState([]), [msgs, setMsgs] = useState([]), [text, setText] = useState('');
  const box = useRef(), stick = useRef(true), reading = useRef(false), cur = useRef('');
  const peer = thread ? thread.peerId : '';
  cur.current = peer;

  const loadInbox = useCallback(() => call('chat_inbox').then(setInbox).catch(() => {}), []);
  // tell the server this chat was opened: all messages received from this person become read
  const markRead = useCallback(() => {
    if (!peer || reading.current) return;
    reading.current = true;
    call('chat_read', { peerId: peer }).then(() => { loadInbox(); window.dispatchEvent(new Event('sx-unread')); })
      .catch(() => {}).finally(() => { reading.current = false; });
  }, [peer, loadInbox]);
  const loadMsgs = useCallback(() => {
    if (!peer) return null;
    return call('chat_get', { peerId: peer }).then(l => {
      if (cur.current !== peer) return; // user already switched to another chat
      setMsgs(l);
      if (!document.hidden && l.some(m => !m.mine && !m.read)) markRead();
    }).catch(() => {});
  }, [peer, markRead]);

  useEffect(() => { loadInbox(); const t = setInterval(loadInbox, 6000); return () => clearInterval(t); }, [loadInbox]);
  useEffect(() => {
    setMsgs([]); stick.current = true; loadMsgs();
    const t = setInterval(loadMsgs, 3000), vis = () => { if (!document.hidden) loadMsgs(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [loadMsgs]);
  // keep the view at the newest message, unless the user has scrolled up to read older ones
  useEffect(() => { const el = box.current; if (el && stick.current) el.scrollTop = el.scrollHeight; }, [msgs]);
  const onScroll = e => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; };

  const send = () => {
    const t = text.trim(); if (!t || !peer) return; setText(''); stick.current = true;
    run(call('chat_send', { peerId: peer, goodId: thread.goodId || '', text: t })).then(() => { loadMsgs(); loadInbox(); }).catch(() => setText(t));
  };
  // a chat opened from a listing may not have any message yet: show it at the top of the list
  const rows = thread && !inbox.some(t => t.peerId === peer)
    ? [{ peerId: peer, withName: thread.withName, goodId: thread.goodId, title: thread.title, text: '', last: 0, unread: 0, mine: false }].concat(inbox) : inbox;

  return (<div className="page"><div className="wrap"><h2>Messages & bids</h2><div style={{ height: 14 }} />
    <div className="chat">
      <div className="inbox">{!rows.length && <div className="empty" style={{ padding: 20 }}>No conversations yet. Open a listing and press Chat.</div>}
        {rows.map(t => <div key={t.peerId} className={'th' + (peer === t.peerId ? ' on' : '') + (t.unread > 0 ? ' unr' : '')}
          onClick={() => setThread({ peerId: t.peerId, withName: t.withName, goodId: t.goodId, title: t.title })}>
          <div className="thtop"><b>{t.withName}</b><span className="tm">{shortTime(t.last)}</span></div>
          <div className="thbot"><small>{t.text ? (t.mine ? 'You: ' : '') + t.text : 'No messages yet'}</small>{t.unread > 0 && <span className="ubadge">{t.unread}</span>}</div></div>)}</div>
      <div className="conv">{!thread ? <div className="empty">Select a conversation</div> : <>
        <div className="chead"><b>{thread.withName}</b>{thread.title && <span> · about {thread.title}</span>}</div>
        <div className="msgs" ref={box} onScroll={onScroll}>{!msgs.length && <div className="empty" style={{ padding: 20 }}>Say hello 👋 or negotiate the price.</div>}
          {msgs.map((m, i) => {
            const p = msgs[i - 1];
            const newDay = !p || new Date(p.created).toDateString() !== new Date(m.created).toDateString();
            const newItem = m.title && (!p || p.goodId !== m.goodId);
            return (<React.Fragment key={m.id}>
              {newDay && <div className="dsep">{dayLabel(m.created)}</div>}
              {newItem && <div className="ctx">📦 {m.title}</div>}
              <div className={'m ' + (m.kind === 'sys' || m.kind === 'bid' ? 'sys' : m.mine ? 'me' : '')}>{m.text}
                <small>{m.kind === 'chat' && !m.mine ? m.name + ' · ' : ''}{hm(m.created)}{m.mine && m.kind === 'chat' && <span className={'tick' + (m.read ? ' seen' : '')}> {m.read ? '✓✓' : '✓'}</span>}</small></div>
            </React.Fragment>);
          })}</div>
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
      <div className="card" key={i[0]} style={{ borderLeft: '3px solid var(--purple)', padding: 20 }}><span style={{ color: 'var(--mut)' }}>{i[0]}</span><h3 style={{ fontSize: 30, margin: 0 }}>{i[1]}</h3></div>)}</div>
  </div></div>);
}
function Users() {
  const [l, setL] = useState(null);
  const load = () => call('admin_users').then(setL).catch(e => note(e.message, true));
  useEffect(() => { load(); }, []);
  const tog = u => run(call('admin_user_status', { id: u.id, status: u.status === 'active' ? 'blocked' : 'active' }), 'Updated').then(load).catch(() => {});
  return (<div className="page"><div className="wrap"><h2>All users</h2><div style={{ height: 14 }} />
    {!l ? <div className="empty">Loading…</div> :
      <div className="tw"><table><thead><tr><th>Name</th><th>Dealer</th><th>Company</th><th>Email</th><th>Phone</th><th>Location</th><th>Posted</th><th>Sold</th><th>Bought</th><th>Bids</th><th>Status</th><th /></tr></thead>
        <tbody>{l.map(u => <tr key={u.id}><td><b>{u.name}</b> {u.role === 'admin' && <span className="pill">admin</span>}</td><td>{u.dealer ? <span className="chip new">Authorised</span> : '–'}</td><td>{u.company}</td><td>{u.email}</td><td>{u.phone}</td><td>{u.location}</td>
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
  const items = [{ id: 'default', name: 'Default form (all products)', fields: data.defaults, image: data.defaultImage }].concat(data.categories);
  const edit = c => setSel({ id: c.id, name: c.id === 'default' ? 'Default form' : c.name, image: c.image || '', fields: c.fields.map(f => ({ ...f, options: (f.options || []).join(', ') })) });
  const newCat = () => setSel({ id: null, name: '', image: '', fields: [{ label: '', type: 'text', required: false, options: '' }] });
  const upd = (i, k, v) => setSel({ ...sel, fields: sel.fields.map((f, j) => j === i ? { ...f, [k]: v } : f) });
  const save = () => run(call('admin_cat_save', { id: sel.id, name: sel.name, image: sel.image || '', fields: sel.fields.map(f => ({ ...f, options: f.type === 'select' ? String(f.options || '').split(',').map(s => s.trim()) : [] })) }), 'Form saved')
    .then(() => { setSel(null); load(); }).catch(() => {});
  const rm = c => window.confirm('Delete "' + c.name + '"?') && run(call('admin_cat_delete', { id: c.id }), 'Deleted').then(load).catch(() => {});
  if (sel) return (<div className="page"><div className="wrap" style={{ maxWidth: 900 }}>
    <h2>{sel.id ? 'Edit form' : 'New product type'}</h2><div style={{ height: 14 }} />
    <div className="panel">
      {sel.id !== 'default' && <div style={{ marginBottom: 16 }}><label>Product name (e.g. Television)</label><input className="in" value={sel.name} onChange={e => setSel({ ...sel, name: e.target.value })} /></div>}
      <div style={{ marginBottom: 20 }}><label>{sel.id === 'default' ? 'Default image for every product that has no image of its own' : 'Default image for this product (shown when the seller adds no photo)'}</label>
        <ImageUploader max={1} images={sel.image ? [sel.image] : []} onChange={fn => setSel(s => { const cur = s.image ? [s.image] : []; const arr = typeof fn === 'function' ? fn(cur) : fn; return { ...s, image: arr[arr.length - 1] || '' }; })} /></div>
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
    <div style={{ color: 'var(--mut)', margin: '6px 0 20px' }}>Add a product (e.g. Television), choose which fields users fill when posting it and set its default image. The default form is always included.</div>
    <div className="grid">{items.map(c => (<div className="card" key={c.id} style={{ padding: 20 }}>
      {c.image ? <img className="thumb" src={c.image} alt="" style={{ aspectRatio: '16/9', borderRadius: 10 }} /> : <div className="thumb nodef" style={{ aspectRatio: '16/9', borderRadius: 10, fontSize: 13 }}>No default image</div>}
      <h4>{c.name}</h4>
      <div>{c.fields.map(f => <span className="chip" key={f.key}>{f.label}{f.required ? '*' : ''}</span>)}</div>
      <div className="row"><button className="btn sm" onClick={() => edit(c)}>Edit</button>{c.id !== 'default' && <button className="btn bad sm" onClick={() => rm(c)}>Delete</button>}</div></div>))}</div>
  </div></div>);
}

/* ---------- Chatbot (smart assistant v2) ----------
   - remembers the conversation and what it showed (sessionStorage), so a refresh does not wipe it
   - product cards, side-by-side compare, thumbs up/down, undo after a bid, voice input
   - seller actions (accept / decline / pause), alerts ("notify me when ..."), guided posting (prefills the form)
   - continues a request after the visitor signs in, minimises instead of closing when it opens a page */
const BOT_KEY = 'sx_bot_v2';
const BOT_HELLO = { b: true, t: 'Hi! 👋 I am the SpareXchange assistant.\nType any product name (like “motor”, “SKF 6208” or “pumps under 50k”) and I will show it.\nThen say “open first”, “bid 5000”, “buy it” or “chat with seller”. You can also tap 🎤 and speak.', chips: ['Latest listings', 'Categories', 'Find motor', 'How do I bid?'] };
const botSaved = () => { try { return JSON.parse(sessionStorage.getItem(BOT_KEY)) || null; } catch (e) { return null; } };
const BOT_ACT = ['bid', 'buy', 'respond', 'status', 'alert', 'alert_del', 'undo'];
const SpeechRec = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

function BotCard({ p, onOpen, onAsk }) {
  return (<div className="bcard">
    {p.image ? <img src={p.image} alt="" loading="lazy" onClick={() => onOpen(p.id)} /> : <div className="bimg" onClick={() => onOpen(p.id)}>📦</div>}
    <div className="binfo">
      <b onClick={() => onOpen(p.id)}>{p.title}</b>
      <small>{p.category} · {p.condition} · Qty {p.qty}</small>
      {p.price !== undefined ? <div className="bprice">{money(p.price)}{p.location ? <span> · {p.location}</span> : null}{p.bids > 0 ? <span> · {p.bids} bid{p.bids > 1 ? 's' : ''}</span> : null}</div> : <div className="bprice lk">🔒 Sign in to see price</div>}
      <div className="bbtns">
        <button onClick={() => onOpen(p.id)}>Open</button>
        {!p.own && <><button onClick={() => onAsk('bid', p.id, 'Bid on ' + p.title)}>Bid</button>
          <button onClick={() => onAsk('buy', p.id, 'Buy ' + p.title)}>Buy</button>
          <button onClick={() => onAsk('chat with seller', p.id, 'Chat with seller of ' + p.title)}>Chat</button></>}
      </div>
    </div></div>);
}

function BotCompare({ items, onOpen }) {
  const rows = [['Price', p => p.price !== undefined ? money(p.price) : '–'], ['Quantity', p => p.qty], ['Condition', p => p.condition], ['Category', p => p.category],
    ['Location', p => p.location || '–'], ['Seller', p => p.seller || '–'], ['Pending bids', p => p.bids || 0]];
  const prices = items.map(p => p.price).filter(x => x > 0), best = prices.length ? Math.min.apply(null, prices) : -1;
  return (<div className="bcmp"><table><thead><tr><th />{items.map(p => <th key={p.id}>{p.title}</th>)}</tr></thead>
    <tbody>{rows.map(r => <tr key={r[0]}><td><b>{r[0]}</b></td>{items.map(p => <td key={p.id} className={r[0] === 'Price' && p.price === best && items.length > 1 ? 'best' : ''}>{r[1](p)}</td>)}</tr>)}
      <tr><td />{items.map(p => <td key={p.id}><button onClick={() => onOpen(p.id)}>Open</button></td>)}</tr></tbody></table></div>);
}

function Bot({ user, page, routeId, go, openChat, openAuth }) {
  const saved = useRef(botSaved()).current;
  const [open, setOpen] = useState(false), [t, setT] = useState(''), [wait, setWait] = useState(false), [listen, setListen] = useState(false),
    [done, setDone] = useState((saved && saved.done) || {}), [m, setM] = useState(saved && saved.m && saved.m.length ? saved.m : [BOT_HELLO]),
    [dot, setDot] = useState(false), [min, setMin] = useState(false), [hint, setHint] = useState(false);
  // what the bot remembers: products shown, selected product, pending question, last search, request to continue after sign-in
  const st = useRef(saved && saved.st ? saved.st : { shown: [], focus: '', awaiting: null, query: null, resume: '' });
  const box = useRef(), inp = useRef(), rec = useRef();
  const push = x => setM(a => a.concat(Object.assign({ id: Date.now() + '-' + Math.random().toString(16).slice(2, 6) }, x)).slice(-60));
  const say = (text, actions) => push({ b: true, t: text, actions: actions || [] });
  const small = () => window.innerWidth < 700;
  const closeSmall = () => { if (small()) { setOpen(false); setMin(true); } }; // minimise on phones so one tap brings the chat back
  const openBot = () => { setOpen(true); setDot(false); setMin(false); closeHint(); };
  const closeHint = () => { setHint(false); try { localStorage.setItem('sx_bot_hint', '1'); } catch (e) {} };

  useEffect(() => { try { sessionStorage.setItem(BOT_KEY, JSON.stringify({ m: m, done: done, st: st.current })); } catch (e) {} }, [m, done]);
  useEffect(() => { const el = box.current; if (el) el.scrollTop = el.scrollHeight; }, [m, open, wait]);
  useEffect(() => { if (open && !wait && inp.current && window.innerWidth > 700) inp.current.focus(); }, [open, wait, m.length]);
  useEffect(() => { if (!open) return; const f = e => { if (e.key === 'Escape') setOpen(false); }; document.addEventListener('keydown', f); return () => document.removeEventListener('keydown', f); }, [open]);
  // one-time friendly hint
  useEffect(() => { let seen = false; try { seen = !!localStorage.getItem('sx_bot_hint'); } catch (e) {} if (seen) return; const tm = setTimeout(() => setHint(true), 6000); return () => clearTimeout(tm); }, []);

  // run an action (from a button, or automatically from the bot's answer)
  const exec = a => {
    if (!a) return;
    const T = a.type;
    if (T === 'open') { st.current.focus = a.id; go('item', a.id); closeSmall(); }
    else if (T === 'nav') { go(a.to, a.id); closeSmall(); }
    else if (T === 'close') setOpen(false);
    else if (T === 'login') openAuth('login');
    else if (T === 'chat') { openChat({ peerId: a.peerId, goodId: a.goodId, title: a.title, withName: a.withName }); closeSmall(); }
    else if (T === 'prefill') { window.sxPrefill = a.data; go('post'); setTimeout(() => window.dispatchEvent(new Event('sx-prefill')), 80); closeSmall(); }
    else if (T === 'say') ask(a.text, '', a.label);
    else if (T === 'bid' || T === 'buy') {
      const isBid = T === 'bid'; st.current.focus = a.id;
      run(call(isBid ? 'bid_place' : 'buy', isBid ? { goodId: a.id, amount: a.amount } : { goodId: a.id }), isBid ? 'Bid sent to seller' : 'Buy request sent to the seller')
        .then(r => { window.dispatchEvent(new Event('sx-bid'));
          say(isBid ? '✅ Done! Your bid of ' + money(a.amount) + ' was sent to the seller.' : '✅ Buy request sent at the posted price. The seller will confirm and close the deal.',
            [{ type: 'say', text: 'chat with seller', label: '💬 Chat with seller' }].concat(r && r.id ? [{ type: 'undo', bidId: r.id, label: '↩ Undo (withdraw)' }] : [])); })
        .catch(e => say('⚠️ ' + e.message));
    }
    else if (T === 'undo') run(call('bid_cancel', { bidId: a.bidId }), 'Withdrawn').then(() => { window.dispatchEvent(new Event('sx-bid')); say('↩ Withdrawn. The seller was told the bid was cancelled.'); }).catch(e => say('⚠️ ' + e.message));
    else if (T === 'respond') run(call('bid_respond', { bidId: a.bidId, accept: a.accept }), a.accept ? 'Accepted – deal closed' : 'Declined')
      .then(() => { window.dispatchEvent(new Event('sx-bid')); say(a.accept ? '✅ Accepted. The deal is recorded in Orders.' : '✖ Declined.', a.accept ? [{ type: 'nav', to: 'orders', label: 'Open Orders' }] : []); }).catch(e => say('⚠️ ' + e.message));
    else if (T === 'status') run(call('goods_status', { id: a.id, status: a.status }), a.status === 'paused' ? 'Listing paused' : 'Listing resumed')
      .then(() => { window.dispatchEvent(new Event('sx-bid')); say(a.status === 'paused' ? '⏸ Paused. Say “resume” to publish it again.' : '▶ Resumed. It is visible to buyers again.', [{ type: 'nav', to: 'mine', label: 'Open My listings' }]); }).catch(e => say('⚠️ ' + e.message));
    else if (T === 'alert') run(call('alert_save', { query: a.query, filters: a.filters || {} }), 'Alert saved')
      .then(() => say('🔔 Alert saved. I will tell you here when a matching listing appears while SpareXchange is open. Say “my alerts” to manage them.')).catch(e => say('⚠️ ' + e.message));
    else if (T === 'alert_del') run(call('alert_del', { id: a.id }), 'Alert removed').then(() => say('🗑 Alert removed.')).catch(e => say('⚠️ ' + e.message));
  };
  // one retry on network trouble
  const callBot = payload => call('bot', payload).catch(e => /too fast/.test(e.message) ? Promise.reject(e) : new Promise(r => setTimeout(r, 900)).then(() => call('bot', payload)));
  const ask = (text, focus, label) => {
    const x = String(text || '').trim(); if (!x || wait) return;
    setT(''); push({ t: label || x }); setWait(true);
    const c = st.current;
    callBot({ text: x, ctx: { shown: c.shown, focus: focus || (page === 'item' ? routeId : c.focus), awaiting: c.awaiting, page, query: c.query } })
      .then(r => {
        if (typeof r === 'string') r = { text: r };
        if (r.shown) c.shown = r.shown;
        if (r.focus !== undefined) c.focus = r.focus;
        if (r.query) c.query = r.query;
        c.awaiting = r.awaiting || null;
        if (r.resume) c.resume = r.resume;
        push({ b: true, t: r.text, products: r.products || [], compare: r.compare || null, actions: r.actions || [], chips: r.chips || [], fb: true, q: x });
        if (r.auto) setTimeout(() => exec(r.auto), 300);
      })
      .catch(e => say(/fetch|network|load failed/i.test(e.message) ? 'I could not reach the server. Please check your connection and try again.' : e.message))
      .finally(() => setWait(false));
  };
  const reset = () => { setM([BOT_HELLO]); setDone({}); st.current = { shown: [], focus: '', awaiting: null, query: null, resume: '' }; try { sessionStorage.removeItem(BOT_KEY); } catch (e) {} };
  const click = (a, key) => {
    if (a.confirmText && !window.confirm(a.confirmText)) return;
    if (BOT_ACT.indexOf(a.type) > -1) setDone(d => ({ ...d, [key]: 1 }));
    exec(a);
  };
  const rate = (id, up) => {
    const x = m.filter(y => y.id === id)[0]; if (!x || x.rated) return;
    setM(a => a.map(y => y.id === id ? { ...y, rated: up ? 1 : -1 } : y));
    call('bot_feedback', { text: x.q, answer: x.t, up: up }).catch(() => {});
  };
  const mic = () => {
    if (!SpeechRec) return note('Voice input is not supported in this browser.', true);
    if (listen && rec.current) { rec.current.stop(); return; }
    const r = new SpeechRec(); r.lang = 'en-IN'; r.interimResults = false;
    r.onresult = e => { const x = e.results[0][0].transcript; setT(x); ask(x); };
    r.onend = () => setListen(false); r.onerror = () => setListen(false);
    rec.current = r; setListen(true); try { r.start(); } catch (e) { setListen(false); }
  };

  // a visitor asked for something that needs an account: after sign-in, carry on with that request
  useEffect(() => {
    if (user && st.current.resume) { const x = st.current.resume; st.current.resume = ''; setOpen(true); setMin(false); say('✅ Signed in. Continuing with “' + x + '”'); ask(x); }
  }, [user]);
  // alerts: every minute look for new listings that match the user's saved alerts
  useEffect(() => {
    if (!user) return;
    const K = 'sxa_' + user.id; let stop = false;
    const get = () => { try { const v = localStorage.getItem(K); return v === null ? null : Number(v); } catch (e) { return null; } };
    const check = () => call('alerts_check', { since: get() }).then(r => {
      if (stop) return;
      try { localStorage.setItem(K, String(r.latest)); } catch (e) {}
      r.items.forEach(it => { st.current.shown = it.goods.map(g => g.id); push({ b: true, t: '🔔 New listing matches your alert “' + it.query + '”:', products: it.goods, actions: [], chips: [] }); });
      if (r.items.length) { setDot(true); note('🔔 New listing for your alert “' + r.items[0].query + '”. Tap to open the assistant.', false, openBot); }
    }).catch(() => {});
    check(); const tm = setInterval(check, 60000);
    return () => { stop = true; clearInterval(tm); };
  }, [user]);

  return (<>
    {hint && !open && <div className="bhint" role="status"><span onClick={openBot}>👋 Need help finding a part? Ask me!</span><button aria-label="Dismiss" onClick={closeHint}>✕</button></div>}
    {!open && min && <button className="botback" onClick={openBot}>↩ Back to chat</button>}
    <button className={'botb' + (open ? ' on' : '')} onClick={() => open ? setOpen(false) : openBot()} title="Chat assistant" aria-label={open ? 'Close assistant' : 'Open assistant'}>{open ? '✕' : '💬'}{dot && !open && <span className="botdot" />}</button>
    {open && <div className="bot" role="dialog" aria-label="SpareXchange assistant"><header><span>🤖 SpareXchange Assistant</span>
      <span className="hbtn"><button className="bx" onClick={reset} title="New conversation" aria-label="New conversation">↺</button><button className="bx" onClick={() => setOpen(false)} aria-label="Close assistant">✕</button></span></header>
      <div className="msgs" ref={box} role="log" aria-live="polite">
        {m.map((x, i) => { const mid = x.id || 'h' + i; return (<div key={mid} className={'bw' + (x.b ? '' : ' me')}>
          <div className={'m' + (x.b ? '' : ' me')}>{x.t}</div>
          {x.products && x.products.length > 0 && <div className="bprods">{x.products.map(p => <BotCard key={p.id} p={p} onOpen={id => exec({ type: 'open', id })} onAsk={ask} />)}</div>}
          {x.compare && x.compare.length > 1 && <BotCompare items={x.compare} onOpen={id => exec({ type: 'open', id })} />}
          {x.actions && x.actions.length > 0 && <div className="bacts">{x.actions.map((a, j) => <button key={j} className="bchip act" disabled={!!done[mid + '-' + j]} onClick={() => click(a, mid + '-' + j)}>{done[mid + '-' + j] ? 'Done ✓' : a.label}</button>)}</div>}
          {x.chips && x.chips.length > 0 && i === m.length - 1 && <div className="bacts">{x.chips.map(c => <button key={c} className="bchip" onClick={() => ask(c)}>{c}</button>)}</div>}
          {x.fb && x.q && <div className="bfb">{x.rated ? <span>{x.rated > 0 ? 'Thanks for the feedback!' : 'Thanks, I will try to improve.'}</span> : <><button aria-label="Helpful answer" onClick={() => rate(mid, true)}>👍</button><button aria-label="Not helpful" onClick={() => rate(mid, false)}>👎</button></>}</div>}
        </div>); })}
        {wait && <div className="bw"><div className="m typing" aria-label="Searching"><i /><i /><i /><span>Searching…</span></div></div>}
      </div>
      <div className="send"><input ref={inp} className="in" value={t} placeholder="Type a product name or ask…" aria-label="Message" onChange={e => setT(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask(t)} />
        {SpeechRec && <button className={'bmic' + (listen ? ' on' : '')} aria-label="Voice input" title="Speak" onClick={mic}>🎤</button>}
        <button className="btn sm" onClick={() => ask(t)}>Send</button></div></div>}
  </>);
}

/* ---------- App shell ---------- */
const PUBLIC_PAGES = ['home', 'market', 'info', 'contact', 'privacy', 'cookies', 'terms'];
function App() {
  const [user, setUser] = useState(null), [thread, setThread] = useState(null), [auth, setAuth] = useState(null),
    [toast, setToast] = useState(null), [boot, setBoot] = useState(!!TOKEN), [menu, setMenu] = useState(false), [dd, setDd] = useState(''),
    [unread, setUnread] = useState(0), // number of chats that have unread messages (shown on the Messages button)
    [nperm, setNperm] = useState(() => notifSupported() ? Notification.permission : 'unsupported'), [nhide, setNhide] = useState(false),
    [route, setRoute] = useState(() => { try { return inGS() ? { page: 'home', id: '' } : routeFromPath(window.location.pathname); } catch (e) { return { page: 'home', id: '' }; } }),
    pending = useRef(null), page = route.page, pageRef = useRef(page), threadRef = useRef(thread);
  pageRef.current = page; threadRef.current = thread;
  window.notify = (m, err, fn) => { setToast({ m, err, fn }); setTimeout(() => setToast(null), fn ? 6000 : 3200); };
  const go = (p, id) => {
    setRoute({ page: p, id: id || '' }); setMenu(false); setDd(''); window.scrollTo(0, 0);
    try { const path = pathFor(p, id); if (!inGS() && window.location.pathname !== path) window.history.pushState({}, '', path); } catch (e) {}
  };
  useEffect(() => { const f = () => setRoute(routeFromPath(window.location.pathname)); window.addEventListener('popstate', f); return () => window.removeEventListener('popstate', f); }, []);
  useEffect(() => { const f = () => setDd(''); document.addEventListener('click', f); return () => document.removeEventListener('click', f); }, []);
  useEffect(() => { const f = () => { setUser(null); setThread(null); setAuth('login'); go('home'); note('Please sign in again.', true); }; window.addEventListener('sx-logout', f); return () => window.removeEventListener('sx-logout', f); }, []);
  useEffect(() => { if (TOKEN) call('me').then(u => { setUser(u); }).catch(e => { if (/^(Session|Account)/.test(e.message)) setTok(''); }).finally(() => setBoot(false)); }, []);
  useEffect(() => { if (!boot && !user && PUBLIC_PAGES.indexOf(page) < 0) { pending.current = route; setAuth('login'); go('home'); } }, [boot, user, page]);
  // service worker: lets mobile browsers show the "new message arrived" notification
  useEffect(() => { try { if (!inGS() && 'serviceWorker' in navigator && window.location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {}); } catch (e) {} }, []);
  // new message check (every few seconds while the site is open): unread badge, in-app alert, browser notification.
  // The unread numbers come from the database (Messages.readAt), so they are the same on every device.
  useEffect(() => {
    if (!user) { setUnread(0); return; }
    const K = 'sxn_' + user.id + '_';
    const get = k => { try { const v = localStorage.getItem(K + k); return v === null ? null : Number(v); } catch (e) { return null; } };
    const put = (k, v) => { try { localStorage.setItem(K + k, String(v)); } catch (e) {} };
    let stop = false, busy = false, again = false;
    const tick = () => {
      if (busy) { again = true; return; } busy = true;
      call('chat_unread', { since: get('seen') }).then(r => {
        if (stop) return;
        setUnread(r.unreadChats);
        // do not alert for the chat that is open and visible right now
        const openPeer = pageRef.current === 'messages' && !document.hidden && threadRef.current ? threadRef.current.peerId : '';
        const fresh = r.items.filter(x => x.peerId !== openPeer);
        if (fresh.length) {
          const last = fresh[fresh.length - 1];
          if (!document.hidden) note((fresh.length > 1 ? fresh.length + ' new messages arrived' : 'New message arrived') + ' – ' + last.from + ': ' + last.text.slice(0, 60), false,
            () => { setThread({ peerId: last.peerId, goodId: last.goodId, title: last.title, withName: last.withName }); go('messages'); });
          if (document.hidden || !document.hasFocus()) showOS(fresh);
        }
        put('seen', r.latest);
      }).catch(() => {}).finally(() => { busy = false; if (again && !stop) { again = false; tick(); } });
    };
    tick(); const t = setInterval(tick, 4000);
    const vis = () => { if (!document.hidden) tick(); }; document.addEventListener('visibilitychange', vis);
    window.addEventListener('sx-unread', tick); // the Messages page fires this right after a chat is marked as read
    return () => { stop = true; clearInterval(t); document.removeEventListener('visibilitychange', vis); window.removeEventListener('sx-unread', tick); };
  }, [user]);
  useEffect(() => { document.title = unread > 0 ? '(' + unread + ') New message · SpareXchange' : BASE_TITLE; }, [unread]);
  const enableNotif = () => { if (!notifSupported()) return; Notification.requestPermission().then(p => { setNperm(p); if (p === 'granted') note('Notifications are on. You will be alerted when a new message arrives.'); }).catch(() => {}); };
  const done = r => { setTok(r.token); setUser(r.user); setAuth(null); const p = pending.current; pending.current = null; p ? go(p.page, p.id) : go('market'); note('Welcome, ' + r.user.name); };
  const out = () => { call('logout').catch(() => {}); setTok(''); setUser(null); setThread(null); go('home'); };
  const openChat = t => { setThread(t); go('messages'); };
  const openItem = id => go('item', id);
  if (boot) return <div className="empty" style={{ padding: 120 }}>Loading…</div>;
  const admin = user && user.role === 'admin';
  const rest = [['market', 'Marketplace']].concat(!user ? [] : [['post', 'Post goods'], ['mine', 'My listings'], ['messages', 'Messages & bids'], ['orders', 'Orders']]
    .concat(admin ? [['dash', 'Dashboard'], ['users', 'Users'], ['forms', 'Form builder']] : []));
  const footLinks = [['home', 'Home'], ['solutions', 'Solutions'], ['resources', 'Resources']].concat(rest).concat([['contact', 'Contact']]);
  const on = k => page === k || (k === 'market' && page === 'item') || (k === 'mine' && page === 'edit');
  const infoSection = page === 'info' && INFO[route.id] ? INFO[route.id].section : '';
  const tabBtn = t => <button key={t[0]} className={on(t[0]) ? 'on' : ''} onClick={() => go(t[0])}>{t[1]}{t[0] === 'messages' && unread > 0 && <span className="pill" style={{ marginLeft: 6 }}>{unread}</span>}</button>;
  const menuOf = k => { const m = MENUS.find(x => x.key === k); return <NavMenu key={k} m={m} open={dd === k} setOpen={setDd} active={infoSection === k} go={go} />; };
  const pub = { home: <Home user={user} go={go} openAuth={setAuth} />, info: <Info id={route.id} go={go} user={user} openAuth={setAuth} />,
    contact: <Contact go={go} />, privacy: <Legal id="privacy" go={go} />, cookies: <Legal id="cookies" go={go} />, terms: <Legal id="terms" go={go} /> };
  const view = pub[page] || (!user ? <PublicMarket openAuth={setAuth} /> : {
    market: <Market user={user} openChat={openChat} open={openItem} />,
    item: <Item key={route.id} id={route.id} user={user} go={go} openChat={openChat} />, edit: <Post key={'e' + route.id} go={go} editId={route.id} />,
    post: <Post key="new" go={go} />, mine: <Mine openChat={openChat} go={go} />,
    messages: <Messages thread={thread} setThread={setThread} />, orders: <Orders />, dash: <Dash />, users: <Users />, forms: <Builder />
  }[page]);
  return (<div className="app-shell">
    <header className="hdr"><div className="wrap">
      <div className="logo" onClick={() => go('home')}>SPARE<b>XCHANGE</b></div>
      {user && <button className="msgb" aria-label="Messages" title="Messages" onClick={() => go('messages')}>💬{unread > 0 && <span className="dot">{unread > 99 ? '99+' : unread}</span>}</button>}
      <button className="burger" aria-label="Menu" aria-expanded={menu} onClick={e => { e.stopPropagation(); setMenu(!menu); }}>{menu ? '✕' : '☰'}{!menu && unread > 0 && <span className="dot" />}</button>
      <div className={'menu' + (menu ? ' open' : '')}>
        <nav className="nav">
          {tabBtn(['home', 'Home'])}{menuOf('solutions')}{menuOf('resources')}
          {rest.map(tabBtn)}
        </nav>
        <div className="acts">
          <button className={'btn pur sm' + (page === 'contact' ? ' cur' : '')} onClick={() => go('contact')}>Contact</button>
          {user ? <><div className="who"><b>{user.name}</b> {admin && <span className="pill">admin</span>}<br />{user.company || user.email}</div><button className="btn ghost sm" onClick={out}>Sign out</button></>
            : <><button className="btn ghost sm" onClick={() => { setMenu(false); setAuth('login'); }}>Sign in</button><button className="btn sm" onClick={() => { setMenu(false); setAuth('register'); }}>Register</button></>}
        </div>
      </div>
    </div></header>
    {user && nperm === 'default' && !nhide && <div className="nbar"><span>🔔 Turn on notifications to be alerted when a new message arrives.</span>
      <span className="row"><button className="btn sm pur" onClick={enableNotif}>Turn on</button><button className="btn sm ghost" onClick={() => setNhide(true)}>Later</button></span></div>}
    <main className="main">{view}</main>
    <Foot go={go} links={footLinks} />
    {auth && <AuthModal mode={auth} setMode={setAuth} onDone={done} close={() => setAuth(null)} />}
    <Bot user={user} page={page} routeId={route.id} go={go} openChat={openChat} openAuth={setAuth} />
    {toast && <div className={'toast' + (toast.err ? ' err' : '')} style={toast.fn ? { cursor: 'pointer' } : null} onClick={() => { const fn = toast.fn; setToast(null); if (fn) fn(); }}>{toast.m}</div>}
  </div>);
}

export default App;