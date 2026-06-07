// js/views/messages.js
import { store } from '../store.js';
import { icon, esc } from '../lib/ui.js';

export function Messages() {
  const el = document.createElement('div');
  const me = store.setting('me') || 'Papa';

  function render() {
    const msgs = store.list('messages');
    el.innerHTML = `
      <div class="section-head"><h3>💬 Messagerie familiale</h3><div class="spacer"></div>
        <span class="tag sage dot">${store.list('members').length} membres · en ligne</span></div>
      <div class="chat">
        <div class="stream" id="stream">
          ${msgs.map(m=>`
            <div class="msg ${m.user===me?'me':''}" data-id="${m.id}">
              ${m.user!==me?`<div class="who">${esc(m.user)}</div>`:''}
              <div>${esc(m.text)}</div>
              ${m.photo?`<div style="margin-top:6px;font-size:13px;opacity:.8">🖼️ ${esc(m.photo)}</div>`:''}
              <div class="react">
                ${Object.entries(m.reacts||{}).map(([e,n])=>`<span data-e="${e}">${e} ${n}</span>`).join('')}
                <span class="add-react" title="Réagir">＋</span>
              </div>
            </div>`).join('')}
        </div>
        <div class="compose">
          <button class="icon-btn photo" title="Photo">${icon('upload')}</button>
          <input id="msg-input" placeholder="Écrire un message…" autocomplete="off">
          <button class="btn primary send">${icon('send')}</button>
        </div>
      </div>`;

    const stream = el.querySelector('#stream');
    stream.scrollTop = stream.scrollHeight;

    const input = el.querySelector('#msg-input');
    const send = () => {
      const text = input.value.trim(); if(!text) return;
      store.add('messages',{ user:me, text, ts:Date.now(), reacts:{} });
      render();
    };
    el.querySelector('.send').onclick = send;
    input.onkeydown = e => { if(e.key==='Enter') send(); };
    el.querySelector('.photo').onclick = () => {
      store.add('messages',{ user:me, text:'A partagé une photo', photo:'photo_voyage.jpg', ts:Date.now(), reacts:{} });
      render();
    };
    el.querySelectorAll('.add-react').forEach(b => b.onclick = () => {
      const id = b.closest('.msg').dataset.id; const m = store.doc('messages', id);
      const r = { ...(m.reacts||{}) }; r['👍'] = (r['👍']||0)+1;
      store.update('messages', id, { reacts:r }); render();
    });
    el.querySelectorAll('.react span[data-e]').forEach(s => s.onclick = () => {
      const id = s.closest('.msg').dataset.id; const m = store.doc('messages', id);
      const e = s.dataset.e; const r = { ...(m.reacts||{}) }; r[e]=(r[e]||0)+1;
      store.update('messages', id, { reacts:r }); render();
    });
  }

  render();
  return el;
}
