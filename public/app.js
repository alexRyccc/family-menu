(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const imageUrl = value => typeof value === 'string' && /^\/uploads\/[a-zA-Z0-9._-]+$/.test(value) ? value : '';
  const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const today = () => localDate();
  const dateLabel = date => new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(`${date}T00:00:00`));
  const mealName = meal => meal === 'lunch' ? '中饭' : '晚饭';
  const dom = {
    toast: $('#toast'), whoGrid: $('#whoGrid'), switchGrid: $('#switchGrid'), dishGrid: $('#dishGrid'),
    skeleton: $('#skeletonGrid'), dishEmpty: $('#dishEmpty'), dishError: $('#dishError'), whoError: $('#whoError'),
    category: $('#catChips'), summary: $('#todaySummary'), feed: $('#feedList'), avatarGrid: $('#avatarGrid'),
    meAvatar: $('#meAvatar'), meName: $('#meName'), conn: $('#connDot'), stepBar: $('#stepBar'),
    search: $('#searchInput'), searchClear: $('#searchClear'), favorite: $('#chipFav'), adminList: $('#adminList'),
    dishCategory: $('#dishCat'), history: $('#historyList'), weekly: $('#weeklyGrid'), voteList: $('#votesList'),
    voteDishes: $('#voteDishGrid'), notifyTargets: $('#notifyTargetList'), planTitle: $('#planTitle'), planProgress: $('#planProgress'), tableNote: $('#tableNote'), pendingPeople: $('#pendingPeople'), celebration: $('#celebrationLayer'), notifyStatus: $('#notifyStatus'),
    repeatLast: $('#btnRepeatLast'), avoidRepeat: $('#btnAvoidRepeat'), stats: $('#statsContent'), recipeTitle: $('#recipeTitle'), recipeEyebrow: $('#recipeEyebrow'), recipeMeta: $('#recipeMeta'), recipeIngredients: $('#recipeIngredients'), ingredientProgress: $('#ingredientProgress'), recipeSteps: $('#recipeSteps'), recipeProgress: $('#recipeProgress'), recipeTip: $('#recipeTip'), recipeServings: $('#recipeServings'), recipeTimer: $('#recipeTimer'),
    notesView: $('#notesView'), notesList: $('#notesList'), noteDate: $('#noteDate'), noteAuthor: $('#noteAuthor'), noteContent: $('#noteContent'), mentionPicker: $('#mentionPicker'), noteCount: $('#noteCount'), noteSaveStatus: $('#noteSaveStatus'), notesDateLabel: $('#notesDateLabel')
  };
  const avatars = ['🐱', '🐸', '🐷', '🐻', '🐼', '🦊', '🐰', '🐯', '🐶', '🐨'];
  const colors = ['#ef6c5b', '#2878b5', '#159570', '#c45488', '#ba7a2b', '#7765b3'];
  const state = {
    me: null, users: [], dishes: [], categories: [], favorites: new Set(), selections: { lunch: null, dinner: null }, recommendations: { frequent: [], never: [] }, dishMode: 'smart',
    meal: localStorage.getItem('fm_last_meal') || (new Date().getHours() >= 14 ? 'dinner' : 'lunch'), date: today(), category: '全部', query: '', onlyFavorites: false, avoidRecent: false, recentSelection: null, weeklyData: null, recipe: null, recipeDone: new Set(), ingredientDone: new Set(), servings: 2, timerEndsAt: null, timerInterval: null, plan: [], feed: [], selectedAvatar: '🐱', eventSource: null, retryTimer: null, retries: 0, shakeDish: null, view: 'home', notes: [], justAddedNoteId: null
  };
  let toastTimer;
  let lastFocus = null;

  // Keep the brand and the four-step flow in one sticky header on narrow screens.
  $('#topbar').append(dom.stepBar);

  // Keep the common case to name + category + optional local photo.
  ['#dishDesc', '#dishImg'].forEach(selector => {
    const field = $(selector);
    field?.previousElementSibling?.remove();
    field?.remove();
  });

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('fm_theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1f2a23' : '#f4f7f1');
    $('#btnTheme').setAttribute('aria-pressed', String(theme === 'dark'));
  }

  try { state.me = JSON.parse(localStorage.getItem('fm_me') || 'null'); } catch (_) { localStorage.removeItem('fm_me'); }
  const themeVersion = 'market-v1';
  const savedTheme = localStorage.getItem('fm_theme');
  applyTheme(localStorage.getItem('fm_theme_version') === themeVersion && savedTheme ? savedTheme : 'light');
  localStorage.setItem('fm_theme_version', themeVersion);

  async function api(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || '请求失败');
      return data;
    } catch (error) {
      throw error.name === 'AbortError' ? new Error('请求超时，请重试') : error;
    } finally { clearTimeout(timeout); }
  }

  function toast(message, kind = 'info') {
    dom.toast.textContent = message;
    dom.toast.className = `toast show${kind === 'info' ? '' : ` ${kind}`}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => dom.toast.classList.remove('show'), kind === 'error' ? 4200 : 2800);
  }

  function celebrate() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    dom.celebration.replaceChildren();
    for (let index = 0; index < 22; index += 1) {
      const particle = document.createElement('span');
      particle.className = 'celebration-particle';
      particle.style.setProperty('--x', `${8 + Math.random() * 84}vw`);
      particle.style.setProperty('--delay', `${Math.random() * 180}ms`);
      particle.style.setProperty('--turn', `${-110 + Math.random() * 220}deg`);
      particle.textContent = index % 3 === 0 ? '\u2728' : index % 3 === 1 ? '\u2022' : '\u2605';
      dom.celebration.append(particle);
    }
    window.setTimeout(() => dom.celebration.replaceChildren(), 1100);
  }

  function renderTableNote() {
    const notes = ['今天的餐桌，从一道想吃的菜开始。', '有人一起想吃，就是一顿饭最好的调味。', '不用想得太久，选一道合心意的就好。', '今晚吃什么，让家人一起决定。', '冰箱里的食材，也值得一顿好好安排。', '去尝一道没吃过的，今天就会有新惊喜。', '一起吃饭的时候，世界会慢一点。'];
    dom.tableNote.textContent = notes[new Date().getDay()];
  }

  function setConnection(status) {
    dom.conn.classList.toggle('online', status === 'online');
    dom.conn.classList.toggle('reconnecting', status === 'reconnecting');
    dom.conn.classList.toggle('offline', status === 'offline');
    dom.conn.title = status === 'online' ? '实时连接已开启' : status === 'offline' ? '连接已断开，正在重连' : '连接中...';
  }

  function updateIdentity() {
    $('#btnMe').classList.toggle('hidden', !state.me);
    if (!state.me) return;
    dom.meAvatar.textContent = state.me.avatar;
    dom.meName.textContent = state.me.name;
    $('#btnMe').classList.remove('hidden');
  }

  function setView(view) {
    state.view = view;
    document.body.classList.toggle('app-home', view === 'home');
    document.body.classList.toggle('app-menu', view === 'menu');
    document.body.classList.toggle('app-notes', view === 'notes');
    $('#homeScreen').classList.toggle('hidden', view !== 'home');
    $('#main').classList.toggle('hidden', view !== 'menu');
    dom.notesView.classList.toggle('hidden', view !== 'notes');
    $('#topbarContext').textContent = view === 'notes' ? '猫家记事本' : '猫家点菜';
    if (view === 'notes') {
      renderNoteForm();
      loadSharedNotes().catch(error => toast(error.message, 'error'));
    }
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function renderNoteForm() {
    const priorAuthor = Number(dom.noteAuthor.value) || state.me?.id || state.users[0]?.id;
    dom.noteAuthor.innerHTML = state.users.map(user => `<option value="${user.id}">${esc(user.avatar)} ${esc(user.name)}</option>`).join('') || '<option value="">请先新增家人</option>';
    if (priorAuthor && state.users.some(user => user.id === priorAuthor)) dom.noteAuthor.value = String(priorAuthor);
    if (!dom.noteDate.value) dom.noteDate.value = today();
    const authorId = Number(dom.noteAuthor.value);
    const selectedMentions = new Set($$('#mentionPicker input:checked').map(input => Number(input.value)));
    dom.mentionPicker.innerHTML = state.users.filter(user => user.id !== authorId).map(user => `<label class="mention-option"><input type="checkbox" value="${user.id}" ${selectedMentions.has(user.id) ? 'checked' : ''}><span style="background:${esc(user.color)}">${esc(user.avatar)}</span><b>${esc(user.name)}</b></label>`).join('') || '<span class="mention-empty">添加家人后，可以在这里提醒对方。</span>';
    $('#btnMentionAll').textContent = '提醒全部家人';
    updateNoteCount();
  }

  function saveNoteDraft() {
    const draft = {
      date: dom.noteDate.value || today(),
      authorId: Number(dom.noteAuthor.value) || null,
      content: dom.noteContent.value.slice(0, 1000),
      mentions: $$('#mentionPicker input:checked').map(input => Number(input.value))
    };
    localStorage.setItem('fm_note_draft', JSON.stringify(draft));
  }

  function restoreNoteDraft() {
    let draft = null;
    try { draft = JSON.parse(localStorage.getItem('fm_note_draft') || 'null'); } catch (_) { localStorage.removeItem('fm_note_draft'); }
    if (draft?.date && /^\d{4}-\d{2}-\d{2}$/.test(draft.date)) dom.noteDate.value = draft.date;
    renderNoteForm();
    if (draft?.authorId && state.users.some(user => user.id === draft.authorId)) dom.noteAuthor.value = String(draft.authorId);
    renderNoteForm();
    dom.noteContent.value = typeof draft?.content === 'string' ? draft.content.slice(0, 1000) : '';
    const mentions = new Set(Array.isArray(draft?.mentions) ? draft.mentions : []);
    $$('#mentionPicker input').forEach(input => { input.checked = mentions.has(Number(input.value)); });
    updateNoteCount();
  }

  function updateNoteCount() {
    dom.noteCount.textContent = `${dom.noteContent.value.length} / 1000`;
  }

  function renderSharedNotes() {
    const date = dom.noteDate.value || today();
    dom.notesDateLabel.textContent = `${dateLabel(date)} · ${state.notes.length} 条记录`;
    $('#notesTimelineTitle').textContent = date === today() ? '今天的记录' : '当天记录';
    if (!state.notes.length) {
      dom.notesList.innerHTML = '<div class="notes-empty"><strong>这一天还没有记录</strong><span>先写下一件想让家人知道的小事。</span></div>';
      return;
    }
    dom.notesList.innerHTML = state.notes.map(note => {
      const mentions = note.mentions?.length ? `<div class="note-mentions">${note.mentions.map(user => `<span>@${esc(user.name)}</span>`).join('')}</div>` : '';
      const content = esc(note.content).replace(/\n/g, '<br>');
      const canDelete = Number(dom.noteAuthor.value) === note.author_id;
      const remove = canDelete ? `<button class="note-delete" type="button" data-delete-note="${note.id}" title="删除这条记录" aria-label="删除 ${esc(note.author_name)} 的这条记录">×</button>` : '';
      return `<article class="note-entry ${note.id === state.justAddedNoteId ? 'note-just-added' : ''}"><div class="note-author"><span style="background:${esc(note.author_color)}">${esc(note.author_avatar)}</span><strong>${esc(note.author_name)}</strong><time>${esc(String(note.created_at || '').slice(11, 16))}</time><button class="note-copy" type="button" data-copy-note="${note.id}" title="复制这条记录" aria-label="复制 ${esc(note.author_name)} 的这条记录">⧉</button>${remove}</div><p>${content}</p>${mentions}</article>`;
    }).join('');
  }

  async function loadSharedNotes() {
    const date = dom.noteDate.value || today();
    dom.notesList.setAttribute('aria-busy', 'true');
    try {
      const result = await api(`/api/shared-notes?date=${encodeURIComponent(date)}`);
      state.notes = result.notes;
      renderSharedNotes();
    } finally {
      dom.notesList.removeAttribute('aria-busy');
    }
  }

  async function createSharedNote() {
    const content = dom.noteContent.value.trim();
    const authorId = Number(dom.noteAuthor.value);
    const noteDate = dom.noteDate.value;
    const mentionUserIds = $$('#mentionPicker input:checked').map(input => Number(input.value));
    if (!authorId) return toast('请先选择记录人', 'error');
    if (!content) return toast('写一点内容再发布吧', 'error');
    const button = $('#btnCreateNote');
    button.disabled = true;
    dom.noteSaveStatus.textContent = '正在发布...';
    try {
      const created = await api('/api/shared-notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author_id: authorId, note_date: noteDate, content, mention_user_ids: mentionUserIds }) });
      state.justAddedNoteId = created.id;
      dom.noteContent.value = '';
      $$('#mentionPicker input').forEach(input => { input.checked = false; });
      localStorage.removeItem('fm_note_draft');
      updateNoteCount();
      dom.noteSaveStatus.textContent = '已发布';
      await loadSharedNotes();
      closeModal('noteModal');
      toast(mentionUserIds.length ? '记录已发布，家人会看到提醒' : '记录已发布', 'success');
    } finally {
      button.disabled = false;
      window.setTimeout(() => { if (dom.noteSaveStatus.textContent === '已发布') dom.noteSaveStatus.textContent = ''; }, 2400);
    }
  }

  async function deleteSharedNote(noteId) {
    const authorId = Number(dom.noteAuthor.value);
    if (!noteId || !authorId || !confirm('删除这条记录？')) return;
    await api(`/api/shared-notes/${noteId}?author_id=${authorId}`, { method: 'DELETE' });
    await loadSharedNotes();
    toast('记录已删除', 'success');
  }

  function openNoteComposer() {
    restoreNoteDraft();
    dom.noteSaveStatus.textContent = '';
    openModal('noteModal');
  }

  function changeNotesDate(change) {
    const current = new Date(`${dom.noteDate.value || today()}T00:00:00`);
    current.setDate(current.getDate() + change);
    dom.noteDate.value = localDate(current);
    loadSharedNotes().catch(error => toast(error.message, 'error'));
    saveNoteDraft();
  }

  function toggleMentionAll() {
    const mentions = $$('#mentionPicker input');
    const selectAll = mentions.some(input => !input.checked);
    mentions.forEach(input => { input.checked = selectAll; });
    $('#btnMentionAll').textContent = selectAll ? '取消全部提醒' : '提醒全部家人';
    saveNoteDraft();
  }

  async function copySharedNote(noteId) {
    const note = state.notes.find(item => item.id === noteId);
    if (!note) return;
    const mentions = note.mentions?.length ? ` ${note.mentions.map(user => `@${user.name}`).join(' ')}` : '';
    const text = `${note.note_date} ${note.author_name}：${note.content}${mentions}`;
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else window.prompt('复制记录', text);
    toast('记录已复制', 'success');
  }

  function setStep(step) {
    $$('.step-section').forEach(section => section.classList.toggle('hidden', section.id !== `step${step}`));
    dom.stepBar.classList.toggle('hidden', step === 1);
    $$('.step-dot').forEach(dot => {
      const value = Number(dot.dataset.step);
      dot.classList.toggle('active', value === step);
      dot.classList.toggle('done', value < step);
      dot.toggleAttribute('aria-current', value === step);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (step === 3) $('#mealDate').textContent = `${dateLabel(state.date)} · ${mealName(state.meal)}`;
  }

  function openModal(id) {
    const overlay = $(`#${id}`);
    if (!overlay) return;
    lastFocus = document.activeElement;
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => overlay.querySelector('input, select, textarea, button')?.focus(), 0);
  }

  function closeModal(id) {
    $(`#${id}`)?.classList.add('hidden');
    if ($$('.modal-overlay:not(.hidden)').length === 0) document.body.style.overflow = '';
    if (lastFocus?.isConnected) lastFocus.focus();
  }

  function renderUsers() {
    const cards = state.users.map((user, index) => `<button class="who-card anim" data-user-id="${user.id}" style="animation-delay:${index * 0.05}s"><span class="who-avatar" style="background:${esc(user.color)}">${esc(user.avatar)}</span><span class="who-name">${esc(user.name)}</span></button>`).join('');
    const add = '<button class="who-card who-add anim" data-add-user><span class="who-avatar">+</span><span class="who-name">新增家人</span></button>';
    dom.whoGrid.innerHTML = cards + add;
    dom.switchGrid.innerHTML = state.users.map(user => `<button class="who-card ${state.me?.id === user.id ? 'current' : ''}" data-switch-id="${user.id}"><span class="who-avatar" style="background:${esc(user.color)}">${esc(user.avatar)}</span><span class="who-name">${esc(user.name)}</span></button>`).join('') + add;
  }

  function renderAvatarPicker() {
    dom.avatarGrid.innerHTML = avatars.map(avatar => `<button class="avatar-opt ${state.selectedAvatar === avatar ? 'selected' : ''}" type="button" data-avatar="${avatar}" aria-label="选择 ${avatar}">${avatar}</button>`).join('');
  }

  function renderCategories() {
    const values = ['全部', ...state.categories.map(item => item.category)];
    const counts = new Map(state.categories.map(item => [item.category, item.count]));
    dom.category.innerHTML = values.map(category => `<button class="chip ${state.category === category ? 'active' : ''}" data-category="${esc(category)}" aria-pressed="${state.category === category}">${esc(category)}${category === '鍏ㄩ儴' ? '' : ` <small>${counts.get(category) || 0}</small>`}</button>`).join('');
    const defaults = ['家常菜', '火锅', '西餐', '日料', '面食', '汤羹', '甜品饮品'];
    const options = [...new Set([...defaults, ...state.categories.map(item => item.category)])];
    dom.dishCategory.innerHTML = options.map(category => `<option value="${esc(category)}">${esc(category)}</option>`).join('');
  }

  function renderDishes() {
    let dishes = state.onlyFavorites ? state.dishes.filter(dish => state.favorites.has(dish.id)) : [...state.dishes];
    const frequentIds = new Set(state.recommendations.frequent.map(dish => dish.id));
    const neverIds = new Set(state.recommendations.never.map(dish => dish.id));
    if (state.avoidRecent) {
      const recentIds = new Set(state.recommendations.recent || []);
      dishes = dishes.filter(dish => !recentIds.has(dish.id));
    }
    if (state.dishMode === 'smart') dishes.sort((a, b) => Number(state.favorites.has(b.id)) - Number(state.favorites.has(a.id)) || Number(frequentIds.has(b.id)) - Number(frequentIds.has(a.id)) || b.id - a.id);
    if (state.dishMode === 'frequent') dishes.sort((a, b) => Number(frequentIds.has(b.id)) - Number(frequentIds.has(a.id)) || b.id - a.id);
    if (state.dishMode === 'new') dishes.sort((a, b) => Number(neverIds.has(b.id)) - Number(neverIds.has(a.id)) || b.id - a.id);
    if (!dishes.length) {
      dom.dishGrid.innerHTML = '';
      dom.dishEmpty.classList.remove('hidden');
      return;
    }
    dom.dishEmpty.classList.add('hidden');
    dom.dishGrid.innerHTML = dishes.map(dish => {
      const selected = state.selections[state.meal]?.dish_id === dish.id;
      const picked = state.plan.filter(item => item.dish_id === dish.id);
      const favorite = state.favorites.has(dish.id);
      const image = imageUrl(dish.image);
      const visual = image
        ? `<img class="dish-img" src="${image}" alt="${esc(dish.name)}" width="320" height="200" loading="lazy" decoding="async">`
        : '<div class="dish-img-fb">🍽️</div>';
      return `<article class="dish-card ${selected ? 'mine' : ''}"><div class="dish-img-wrap">${visual}<button class="dish-fav ${favorite ? 'on' : ''}" data-favorite-id="${dish.id}" aria-label="${favorite ? '取消收藏' : '收藏'} ${esc(dish.name)}" aria-pressed="${favorite}">${favorite ? '♥' : '♡'}</button></div><div class="dish-body"><span class="dish-cat-tag">${esc(dish.category)}</span><h3 class="dish-name">${esc(dish.name)}</h3><p class="dish-desc">${esc(dish.description || '')}</p><div class="dish-footer"><span class="dish-count">${picked.length ? `${picked.length} 人想吃` : ''}</span><div class="dish-actions"><button class="dish-recipe" data-recipe-id="${dish.id}" aria-label="查看 ${esc(dish.name)} 的食谱">食谱</button><button class="dish-btn ${selected ? 'chosen' : ''}" data-dish-id="${dish.id}" ${selected ? 'disabled' : ''}>${selected ? '已选' : '选这个'}</button></div></div></div></article>`;
    }).join('');
  }

  function renderSummary() {
    dom.planTitle.textContent = state.date === today() ? '今天谁吃了什么' : `${dateLabel(state.date)} 的安排`;
    const groups = { lunch: [], dinner: [] };
    state.plan.forEach(item => groups[item.meal]?.push(item));
    dom.planProgress.textContent = `已安排 ${state.plan.length} 份餐点`;
    renderTableNote();
    const chosenIds = new Set(state.plan.filter(item => item.meal === state.meal).map(item => item.user_id));
    const waiting = state.users.filter(user => !chosenIds.has(user.id));
    dom.pendingPeople.innerHTML = waiting.length
      ? `<span>本餐还差</span>${waiting.map(user => `<span class="pending-person" title="${esc(user.name)}"><b style="background:${esc(user.color)}">${esc(user.avatar)}</b>${esc(user.name)}</span>`).join('')}`
      : '<span class="pending-complete">本餐大家都选好了</span>';
    if (!groups.lunch.length && !groups.dinner.length) {
      dom.summary.innerHTML = `<div class="today-row empty">${state.date === today() ? '今天' : dateLabel(state.date)}还没有安排，先选一道吧。</div>`;
      return;
    }
    dom.summary.innerHTML = ['lunch', 'dinner'].map(meal => groups[meal].length ? `<div class="today-meal-block"><h3 class="today-meal-header">${meal === 'lunch' ? '🍚' : '🍽️'} ${mealName(meal)}</h3>${groups[meal].map(item => `<div class="today-row"><span class="today-user-avatar" style="background:${esc(item.user_color)}">${esc(item.user_avatar)}</span><span class="today-user-name">${esc(item.user_name)}</span><span class="today-dish-name">${esc(item.dish_name)}</span></div>`).join('')}</div>` : '').join('');
  }

  function renderFeed() {
    dom.feed.innerHTML = state.feed.length ? state.feed.map(item => `<div class="feed-item"><div class="feed-avatar">${esc(state.users.find(user => user.id === item.user_id)?.avatar || '🍽️')}</div><div class="feed-body"><div class="feed-msg">${esc(item.message)}</div><div class="feed-time">${esc(item.created_at || '')}</div></div></div>`).join('') : '<div class="feed-empty">暂无动态</div>';
  }

  async function loadUsers() {
    state.users = await api('/api/users');
    if (state.me && !state.users.some(user => user.id === state.me.id)) {
      state.me = null;
      localStorage.removeItem('fm_me');
    }
    updateIdentity();
    renderUsers();
    if (state.view === 'notes') renderNoteForm();
  }

  async function loadDishes() {
    dom.dishError.classList.add('hidden');
    dom.skeleton.classList.remove('hidden');
    const params = new URLSearchParams();
    if (state.category !== '全部') params.set('category', state.category);
    if (state.query) params.set('q', state.query);
    try {
      state.dishes = await api(`/api/dishes?${params}`);
      renderDishes();
      renderAdmin();
    } catch (error) {
      dom.dishError.classList.remove('hidden');
      toast(error.message, 'error');
    } finally { dom.skeleton.classList.add('hidden'); }
  }

  async function loadPlan() {
    const [lunch, dinner] = await Promise.all([api(`/api/meal?meal=lunch&date=${state.date}`), api(`/api/meal?meal=dinner&date=${state.date}`)]);
    state.plan = [...lunch, ...dinner];
    renderSummary(); renderDishes();
  }

  async function loadSelections() {
    if (!state.me) return;
    const [lunch, dinner] = await Promise.all(['lunch', 'dinner'].map(meal => api(`/api/my-selection?user_id=${state.me.id}&meal=${meal}&date=${state.date}`)));
    state.selections = { lunch, dinner };
    renderDishes();
  }

  async function loadFavorites() {
    if (!state.me) return;
    state.favorites = new Set((await api(`/api/favorites?user_id=${state.me.id}`)).map(item => item.id));
    renderDishes();
  }

  async function loadRecentSelection() {
    if (!state.me) {
      state.recentSelection = null;
      dom.repeatLast.classList.add('hidden');
      return;
    }
    state.recentSelection = await api(`/api/recent-selection?user_id=${state.me.id}&meal=${state.meal}&date=${state.date}`);
    const hasRecent = Boolean(state.recentSelection && state.recentSelection.dish_id);
    dom.repeatLast.classList.toggle('hidden', !hasRecent);
    if (hasRecent) dom.repeatLast.textContent = `上次同款：${state.recentSelection.dish_name}`;
  }

  async function loadFeed() { state.feed = await api('/api/notifications?limit=30'); renderFeed(); }
  async function refreshDashboard() { await Promise.all([loadPlan(), loadSelections(), loadFavorites(), loadFeed(), loadRecentSelection()]); }

  function chooseUser(user) {
    state.me = { id: user.id, name: user.name, avatar: user.avatar, color: user.color };
    localStorage.setItem('fm_me', JSON.stringify(state.me));
    updateIdentity(); closeModal('userModal'); setStep(2); refreshDashboard().catch(error => toast(error.message, 'error'));
  }

  async function addUser() {
    const name = $('#newUserName').value.trim();
    if (!name) return toast('请填写家人名字', 'error');
    const user = await api('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, avatar: state.selectedAvatar, color: colors[state.users.length % colors.length] }) });
    $('#newUserName').value = ''; closeModal('addUserModal'); await loadUsers(); chooseUser(user);
  }

  async function chooseDish(id) {
    if (!state.me) return toast('请先选择家人', 'error');
    await api('/api/select', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dish_id: id, user_id: state.me.id, meal: state.meal, date: state.date }) });
    const dish = state.dishes.find(item => item.id === id);
    const image = imageUrl(dish?.image);
    const visual = image ? `<img src="${image}" alt="${esc(dish?.name || '')}" width="96" height="96">` : '<div class="done-img-fb">🍽️</div>';
    $('#doneDish').innerHTML = `${visual}<div class="done-dish-info"><div class="done-dish-name">${esc(dish?.name || '')}</div><div class="done-dish-cat">${esc(dish?.category || '')}</div></div>`;
    $('#doneMessage').textContent = `${state.me.name}，${mealName(state.meal)}就选它了。`;
    $('#btnDoneOk').dataset.dishId = id;
    setStep(4); celebrate(); await refreshDashboard();
  }

  async function shareSelection() {
    const selected = state.selections[state.meal];
    const dishName = selected?.dish_name || $('#doneDish .done-dish-name')?.textContent;
    if (!dishName) return toast('请先选一道菜。');
    const text = `${state.me?.name || '我'}点了${mealName(state.meal)}：${dishName}`;
    try {
      if (navigator.share) await navigator.share({ title: '猫家点菜', text });
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); toast('餐单已复制，发给家人吧。', 'success'); }
      else toast(text);
    } catch (error) { if (error.name !== 'AbortError') toast('分享暂未完成。', 'error'); }
  }

  async function repeatLastChoice() {
    if (!state.recentSelection?.dish_id) return toast('还没有可重复的点餐记录');
    if (!state.dishes.some(dish => dish.id === state.recentSelection.dish_id)) {
      state.category = '全部';
      state.query = '';
      await loadDishes();
    }
    return chooseDish(state.recentSelection.dish_id);
  }

  async function undoSelection() {
    if (!state.me) return;
    const result = await api(`/api/select?user_id=${state.me.id}&meal=${state.meal}&date=${state.date}`, { method: 'DELETE' });
    if (!result.changed) return toast('这餐还没有你的选择');
    setStep(3);
    await refreshDashboard();
    toast('已撤销，可以重新选一道', 'success');
  }

  async function notifyFamily() {
    if (!state.me) return;
    const selected = state.selections[state.meal];
    const dishName = selected?.dish_name || $('#doneDish .done-dish-name')?.textContent;
    if (!dishName) return toast('请先选择一道菜', 'error');
    await api('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: state.me.id, message: `${state.me.name} 已选好${mealName(state.meal)}：${dishName}，大家来看看吧。` }) });
    toast('已提醒家人', 'success');
  }

  function recipeStorageKey(recipe) { return `fm_recipe_${recipe.dish_id}`; }
  function recipeIngredientKey(recipe) { return `fm_recipe_ingredients_${recipe.dish_id}`; }
  function scaledAmount(amount) {
    const match = String(amount).match(/^(\d+(?:\.\d+)?)(.*)$/);
    if (!match) return amount;
    const value = Number(match[1]) * state.servings / 2;
    return `${Number.isInteger(value) ? value : value.toFixed(1)}${match[2]}`;
  }

  function saveRecipeProgress() {
    if (state.recipe) localStorage.setItem(recipeStorageKey(state.recipe), JSON.stringify([...state.recipeDone]));
  }

  function renderRecipe() {
    const recipe = state.recipe;
    if (!recipe) return;
    dom.recipeEyebrow.textContent = `${recipe.category} · ${recipe.source === 'curated' ? '家常做法' : '基础流程'}`;
    dom.recipeTitle.textContent = recipe.dish_name;
    dom.recipeMeta.innerHTML = `<span>${esc(recipe.duration)}</span><span>${esc(recipe.difficulty)}</span><span>${recipe.steps.length} 个步骤</span>`;
    dom.recipeServings.textContent = `${state.servings} 人`;
    dom.recipeIngredients.innerHTML = recipe.ingredients.map(([name, amount], index) => {
      const done = state.ingredientDone.has(index);
      return `<li class="recipe-ingredient ${done ? 'done' : ''}"><label><input type="checkbox" data-ingredient-index="${index}" ${done ? 'checked' : ''}><span>${esc(name)}</span></label><b>${esc(scaledAmount(amount))}</b></li>`;
    }).join('');
    dom.recipeSteps.innerHTML = recipe.steps.map((step, index) => {
      const done = state.recipeDone.has(index);
      return `<li class="recipe-step ${done ? 'done' : ''}"><label><input type="checkbox" data-recipe-step="${index}" ${done ? 'checked' : ''}><span class="recipe-step-index">${index + 1}</span><span>${esc(step)}</span></label></li>`;
    }).join('');
    dom.ingredientProgress.textContent = `${state.ingredientDone.size} / ${recipe.ingredients.length} 已备齐`;
    dom.recipeProgress.textContent = `${state.recipeDone.size} / ${recipe.steps.length} 已完成`;
    dom.recipeTip.textContent = `小提示：${recipe.tip}`;
  }

  async function openRecipe(dishId) {
    dom.recipeTitle.textContent = '正在准备食谱...';
    dom.recipeEyebrow.textContent = '';
    dom.recipeMeta.replaceChildren();
    dom.recipeIngredients.replaceChildren();
    dom.recipeSteps.replaceChildren();
    dom.recipeProgress.textContent = '';
    dom.ingredientProgress.textContent = '';
    dom.recipeTip.textContent = '';
    openModal('recipeModal');
    const recipe = await api(`/api/dishes/${dishId}/recipe`);
    state.recipe = recipe;
    state.servings = Number(localStorage.getItem(`fm_recipe_servings_${recipe.dish_id}`)) || 2;
    try { state.recipeDone = new Set(JSON.parse(localStorage.getItem(recipeStorageKey(recipe)) || '[]').filter(step => Number.isInteger(step) && step >= 0 && step < recipe.steps.length)); }
    catch (_) { state.recipeDone = new Set(); }
    try { state.ingredientDone = new Set(JSON.parse(localStorage.getItem(recipeIngredientKey(recipe)) || '[]').filter(index => Number.isInteger(index) && index >= 0 && index < recipe.ingredients.length)); }
    catch (_) { state.ingredientDone = new Set(); }
    renderRecipe();
  }

  function resetRecipe() {
    if (!state.recipe) return;
    state.recipeDone = new Set();
    state.ingredientDone = new Set();
    localStorage.removeItem(recipeStorageKey(state.recipe));
    localStorage.removeItem(recipeIngredientKey(state.recipe));
    renderRecipe();
  }

  async function copyShoppingList() {
    if (!state.recipe) return;
    const list = state.recipe.ingredients.map(([name, amount]) => `- ${name} ${scaledAmount(amount)}`).join('\n');
    const text = `${state.recipe.dish_name}（${state.servings} 人）\n${list}`;
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else window.prompt('复制购物清单', text);
    toast('食材清单已复制', 'success');
  }

  function updateServings(change) {
    if (!state.recipe) return;
    state.servings = Math.max(1, Math.min(8, state.servings + change));
    localStorage.setItem(`fm_recipe_servings_${state.recipe.dish_id}`, String(state.servings));
    renderRecipe();
  }

  function finishNextRecipeStep() {
    if (!state.recipe) return;
    const next = state.recipe.steps.findIndex((_, index) => !state.recipeDone.has(index));
    if (next === -1) return toast('全部步骤已经完成了', 'success');
    state.recipeDone.add(next);
    saveRecipeProgress();
    renderRecipe();
    document.querySelector(`[data-recipe-step="${next}"]`)?.closest('.recipe-step')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (state.recipeDone.size === state.recipe.steps.length) toast('这道菜完成啦，开饭！', 'success');
  }

  function renderRecipeTimer() {
    const remaining = Math.max(0, Math.ceil((state.timerEndsAt - Date.now()) / 1000));
    if (!state.timerEndsAt || remaining <= 0) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
      dom.recipeTimer.textContent = state.timerEndsAt ? '计时完成，可以查看下一步' : '计时器未开始';
      $('#btnStartTimer').textContent = state.timerEndsAt ? '再计 5 分钟' : '开始计时';
      if (state.timerEndsAt) { state.timerEndsAt = null; toast('5 分钟计时完成', 'success'); }
      return;
    }
    dom.recipeTimer.textContent = `剩余 ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
    $('#btnStartTimer').textContent = '计时中';
  }

  function startRecipeTimer() {
    state.timerEndsAt = Date.now() + 5 * 60 * 1000;
    clearInterval(state.timerInterval);
    renderRecipeTimer();
    state.timerInterval = setInterval(renderRecipeTimer, 1000);
  }

  async function toggleFavorite(id) {
    if (!state.me) return toast('请先选择家人', 'error');
    const exists = state.favorites.has(id);
    if (exists) await api(`/api/favorites/${state.me.id}/${id}`, { method: 'DELETE' });
    else await api('/api/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: state.me.id, dish_id: id }) });
    await loadFavorites();
  }

  function renderAdmin() {
    dom.adminList.innerHTML = state.dishes.map(dish => `<div class="admin-row"><span>${esc(dish.name)}</span><button class="admin-del" data-delete-dish="${dish.id}" aria-label="删除 ${esc(dish.name)}">删除</button></div>`).join('') || '<p class="feed-empty">暂无菜品</p>';
  }

  async function addDish() {
    const name = $('#dishName').value.trim();
    if (!name) return toast('请填写菜品名称', 'error');
    const form = new FormData();
    form.set('name', name); form.set('category', dom.dishCategory.value); form.set('description', `${name}，等待家人来尝一尝。`);
    const file = $('#dishFile')?.files?.[0]; if (file) form.set('image', file);
    const response = await fetch('/api/dishes', { method: 'POST', body: form });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || '添加失败');
    $('#dishName').value = ''; $('#dishFile').value = '';
    await Promise.all([loadDishes(), loadCategories()]); toast(data.warning || '菜品已添加', 'success');
  }

  async function loadCategories() { state.categories = await api('/api/categories'); renderCategories(); }
  async function loadRecommendations() { state.recommendations = await api('/api/recommendations'); renderDishes(); }

  async function showHistory() {
    const data = await api('/api/history?days=7');
    const grouped = data.list.reduce((all, item) => ((all[item.date] ||= []).push(item), all), {});
    dom.history.innerHTML = data.dates.map(date => `<section class="history-day"><h4>${date}</h4>${(grouped[date] || []).map(item => `<p>${esc(item.user_avatar)} ${esc(item.user_name)} · ${esc(mealName(item.meal))} · ${esc(item.dish_name)}</p>`).join('') || '<p class="feed-empty">暂无安排</p>'}</section>`).join('');
  }

  async function showWeekly() {
    const data = await api('/api/weekly');
    state.weeklyData = data;
    const grouped = data.list.reduce((all, item) => ((all[item.date] ||= []).push(item), all), {});
    dom.weekly.innerHTML = data.week.map(date => {
      const meals = { lunch: [], dinner: [] };
      (grouped[date] || []).forEach(item => meals[item.meal]?.push(item));
      return `<section class="weekly-day ${date === today() ? 'today' : ''}"><h4>${dateLabel(date)}</h4>${['lunch', 'dinner'].map(meal => `<div class="weekly-meal"><strong>${meal === 'lunch' ? '中饭' : '晚饭'}</strong><span>${meals[meal].map(item => `${esc(item.user_avatar)} ${esc(item.dish_name)}`).join('、') || '暂无安排'}</span><button class="weekly-plan" data-plan-date="${date}" data-plan-meal="${meal}">安排</button></div>`).join('')}</section>`;
    }).join('');
  }

  async function copyWeekly() {
    if (!state.weeklyData) await showWeekly();
    const data = state.weeklyData;
    const grouped = data.list.reduce((all, item) => ((all[item.date] ||= []).push(item), all), {});
    const text = data.week.map(date => {
      const rows = grouped[date] || [];
      const lunch = rows.filter(item => item.meal === 'lunch').map(item => `${item.user_name} ${item.dish_name}`).join('、') || '未安排';
      const dinner = rows.filter(item => item.meal === 'dinner').map(item => `${item.user_name} ${item.dish_name}`).join('、') || '未安排';
      return `${dateLabel(date)}\n中饭：${lunch}\n晚饭：${dinner}`;
    }).join('\n\n');
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else window.prompt('复制餐单', text);
    toast('一周餐单已复制', 'success');
  }

  async function showStats() {
    dom.stats.innerHTML = '<p class="stats-loading">正在整理餐桌数据...</p>';
    openModal('statsModal');
    const data = await api('/api/stats');
    dom.stats.innerHTML = `<div class="stats-overview"><div><strong>${data.totals.dishes}</strong><span>道菜</span></div><div><strong>${data.totals.selections}</strong><span>次选择</span></div><div><strong>${data.recentCount}</strong><span>近七天</span></div></div><h4>大家常点</h4>${data.top.length ? `<ol class="stats-top">${data.top.map(item => `<li><span>${esc(item.name)}</span><b>${item.times} 次</b></li>`).join('')}</ol>` : '<p class="feed-empty">还没有足够记录，先点一顿吧。</p>'}`;
  }

  async function showVotes() {
    const votes = await api(`/api/votes${state.me ? `?user_id=${state.me.id}` : ''}`);
    dom.voteList.innerHTML = votes.map(vote => `<section class="vote-card"><h4>${esc(vote.title)}</h4><p>${esc(vote.vote_date)} · ${mealName(vote.meal)}</p>${vote.options.map(option => `<button class="vote-option ${vote.userVote === option.id ? 'selected' : ''}" data-vote-id="${vote.id}" data-option-id="${option.id}">${esc(option.dish_name)} <span>${option.vote_count} 票</span></button>`).join('')}<button class="btn-secondary vote-close" data-close-vote="${vote.id}" ${vote.status === 'closed' ? 'disabled' : ''}>${vote.status === 'closed' ? '已结束' : '结束投票'}</button></section>`).join('') || '<p class="feed-empty">暂无投票</p>';
    dom.voteDishes.innerHTML = state.dishes.map(dish => `<label><input type="checkbox" value="${dish.id}"> ${esc(dish.name)}</label>`).join('');
    $('#voteDate').value = today();
  }

  async function createVote() {
    if (!state.me) return toast('请先选择家人', 'error');
    const dishIds = $$('#voteDishGrid input:checked').map(input => Number(input.value));
    await api('/api/votes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: $('#voteTitle').value, meal: $('#voteMeal').value, date: $('#voteDate').value, dish_ids: dishIds, created_by: state.me.id }) });
    $('#voteTitle').value = ''; await showVotes(); toast('投票已发起', 'success');
  }

  async function showNotify() {
    const [targets, config, reminders] = await Promise.all([api('/api/notify/targets'), api('/api/notify/config'), api('/api/reminders')]);
    dom.notifyTargets.innerHTML = targets.map(target => `<div class="admin-row"><span>${esc(target.name)} ${esc(target.email || target.phone)}</span><button class="admin-del" data-delete-target="${target.id}">删除</button></div>`).join('') || '<p class="feed-empty">暂无通知人</p>';
    $('#cfgEmailHost').value = config.email.host || ''; $('#cfgEmailUser').value = config.email.user || ''; $('#cfgEmailPass').value = config.email.pass || '';
    $('#cfgSmsKey').value = config.sms.accessKeyId || ''; $('#cfgSmsSecret').value = config.sms.accessKeySecret || ''; $('#cfgSmsSign').value = config.sms.signName || ''; $('#cfgSmsTpl').value = config.sms.templateCode || ''; $('#cfgSmsReminderTpl').value = config.sms.reminderTemplateCode || '';
    const selectionStatus = config.sms.ready ? '点菜短信已就绪' : `点菜短信尚未就绪：${(config.sms.missing || []).join('、')}`;
    const reminderMissing = config.sms.reminderMissing?.length ? config.sms.reminderMissing : (config.sms.missing || []);
    const reminderStatus = config.sms.remindersReady ? '用餐提醒短信已就绪' : `用餐提醒短信尚未就绪：${reminderMissing.join('、')}`;
    dom.notifyStatus.textContent = `${selectionStatus}；${reminderStatus}`;
    dom.notifyStatus.className = `notify-status ${config.sms.ready && config.sms.remindersReady ? 'ready' : 'warning'}`;
    reminders.forEach(item => { $(`#remind${item.meal === 'lunch' ? 'Lunch' : 'Dinner'}Time`).value = item.remind_time; $(`#remind${item.meal === 'lunch' ? 'Lunch' : 'Dinner'}Enabled`).checked = Boolean(item.enabled); });
  }

  function connectEvents() {
    if (state.eventSource) state.eventSource.close();
    setConnection('reconnecting');
    const source = state.eventSource = new EventSource('/api/events');
    source.onopen = () => { state.retries = 0; setConnection('online'); };
    source.onmessage = event => {
      let data; try { data = JSON.parse(event.data); } catch (_) { return; }
      if (data.type === 'connected' || data.type === 'ping') return;
      if (data.type === 'notification') { state.feed.unshift(data.note); state.feed = state.feed.slice(0, 30); renderFeed(); }
      if (['notification', 'dish_added', 'dish_removed', 'vote_closed', 'vote_updated'].includes(data.type)) refreshDashboard().catch(() => {});
      if (['vote_created', 'vote_updated', 'vote_closed'].includes(data.type) && !$('#votesModal').classList.contains('hidden')) showVotes().catch(() => {});
      if (data.type === 'user_added') loadUsers().catch(() => {});
      if (data.type === 'shared_note' || data.type === 'shared_note_deleted') {
        const noteDate = data.note?.note_date || data.note_date;
        if (state.view === 'notes' && noteDate === dom.noteDate.value) loadSharedNotes().catch(() => {});
        if (data.type === 'shared_note' && data.note.mention_user_ids?.includes(state.me?.id)) toast(`${data.note.author_name} 在共享记事本里 @ 了你`, 'info');
      }
    };
    source.onerror = () => { source.close(); setConnection('offline'); clearTimeout(state.retryTimer); state.retryTimer = setTimeout(connectEvents, Math.min(1000 * 2 ** Math.min(++state.retries, 5), 30000)); };
  }

  document.addEventListener('click', async event => {
    const button = event.target.closest('button, .who-card');
    if (!button) return;
    try {
      if (button.id === 'btnOpenMenu') return setView('menu');
      if (button.id === 'btnOpenNotes') return setView('notes');
      if (button.id === 'btnHome' || button.id === 'btnNotesBack') return setView('home');
      if (button.id === 'btnOpenNote') return openNoteComposer();
      if (button.id === 'btnCreateNote') return createSharedNote();
      if (button.id === 'btnNotesPrev') return changeNotesDate(-1);
      if (button.id === 'btnNotesToday') { dom.noteDate.value = today(); return loadSharedNotes(); }
      if (button.id === 'btnNotesNext') return changeNotesDate(1);
      if (button.id === 'btnMentionAll') return toggleMentionAll();
      if (button.dataset.copyNote) return copySharedNote(Number(button.dataset.copyNote));
      if (button.dataset.deleteNote) return deleteSharedNote(Number(button.dataset.deleteNote));
      if (button.dataset.userId) return chooseUser(state.users.find(user => user.id === Number(button.dataset.userId)));
      if (button.dataset.switchId) return chooseUser(state.users.find(user => user.id === Number(button.dataset.switchId)));
      if ('addUser' in button.dataset) { renderAvatarPicker(); return openModal('addUserModal'); }
      if (button.dataset.avatar) { state.selectedAvatar = button.dataset.avatar; return renderAvatarPicker(); }
      if (button.dataset.category) { state.category = button.dataset.category; await loadDishes(); return renderCategories(); }
      if (button.dataset.dishId) return chooseDish(Number(button.dataset.dishId));
      if (button.dataset.recipeId) return openRecipe(Number(button.dataset.recipeId));
      if (button.dataset.dishMode) { state.dishMode = button.dataset.dishMode; $$('#dishModes .dish-mode').forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); }); return renderDishes(); }
      if (button.dataset.favoriteId) return toggleFavorite(Number(button.dataset.favoriteId));
      if (button.dataset.deleteDish) { if (confirm('删除这道菜及其相关选择？')) { await api(`/api/dishes/${button.dataset.deleteDish}`, { method: 'DELETE' }); await loadDishes(); } return; }
      if (button.dataset.deleteTarget) { await api(`/api/notify/targets/${button.dataset.deleteTarget}`, { method: 'DELETE' }); return showNotify(); }
      if (button.dataset.voteId) { if (!state.me) return toast('请先选择家人', 'error'); await api(`/api/votes/${button.dataset.voteId}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: state.me.id, option_id: Number(button.dataset.optionId) }) }); return showVotes(); }
      if (button.dataset.closeVote) { await api(`/api/votes/${button.dataset.closeVote}/close`, { method: 'POST' }); return showVotes(); }
      if (button.dataset.planDate) { state.date = button.dataset.planDate; state.meal = button.dataset.planMeal; closeModal('weeklyModal'); setStep(3); await Promise.all([loadDishes(), loadPlan(), loadSelections(), loadFavorites()]); return; }
      if (button.dataset.close) return closeModal(button.dataset.close);
      if (button.id === 'btnMe') { renderUsers(); return openModal('userModal'); }
      if (button.id === 'btnTheme') { applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); return; }
      if (button.id === 'btnMore') return openModal('moreMenu');
      if (button.id === 'btnAddUser') return addUser();
      if (button.id === 'btnAddDish') return addDish();
      if (button.id === 'menuAdmin') { closeModal('moreMenu'); return openModal('adminModal'); }
      if (button.id === 'menuHistory') { closeModal('moreMenu'); await showHistory(); return openModal('historyModal'); }
      if (button.id === 'menuWeekly') { closeModal('moreMenu'); await showWeekly(); return openModal('weeklyModal'); }
      if (button.id === 'menuVotes') { closeModal('moreMenu'); await showVotes(); return openModal('votesModal'); }
      if (button.id === 'menuNotify') { closeModal('moreMenu'); await showNotify(); return openModal('notifyModal'); }
      if (button.id === 'menuStats') { closeModal('moreMenu'); return showStats(); }
      if (button.id === 'menuShortcuts') { closeModal('moreMenu'); return openModal('shortcutsModal'); }
      if (button.id === 'btnCreateVote') return createVote();
      if (button.id === 'btnRefreshWeekly') return showWeekly();
      if (button.id === 'btnCopyWeekly') return copyWeekly();
      if (button.id === 'chipFav') { state.onlyFavorites = !state.onlyFavorites; button.classList.toggle('active', state.onlyFavorites); return renderDishes(); }
      if (button.id === 'btnRepeatLast') return repeatLastChoice();
      if (button.id === 'btnAvoidRepeat') { state.avoidRecent = !state.avoidRecent; button.classList.toggle('active', state.avoidRecent); button.setAttribute('aria-pressed', String(state.avoidRecent)); return renderDishes(); }
      if (button.id === 'searchClear') { dom.search.value = ''; state.query = ''; button.classList.add('hidden'); return loadDishes(); }
      if (button.id === 'btnWhoRetry') return initialize();
      if (button.id === 'btnDishRetry') return loadDishes();
      if (button.id === 'btnAddFromEmpty') return openModal('adminModal');
      if (button.id === 'btnDoneBack') return setStep(3);
      if (button.id === 'btnDoneOk') return setStep(3);
      if (button.id === 'btnUndoSelection') return undoSelection();
      if (button.id === 'btnNotifyFamily') return notifyFamily();
      if (button.id === 'btnCookSelected') { const dishId = Number($('#btnDoneOk').dataset.dishId); if (!dishId) return toast('请先选择一道菜', 'error'); return openRecipe(dishId); }
      if (button.id === 'btnShareSelection') return shareSelection();
      if (button.id === 'btnResetRecipe') return resetRecipe();
      if (button.id === 'btnServingsDown') return updateServings(-1);
      if (button.id === 'btnServingsUp') return updateServings(1);
      if (button.id === 'btnCopyShopping') return copyShoppingList();
      if (button.id === 'btnNextRecipeStep') return finishNextRecipeStep();
      if (button.id === 'btnStartTimer') return startRecipeTimer();
      if (button.id === 'btnKitchenMode') { document.body.classList.toggle('kitchen-mode'); button.setAttribute('aria-pressed', String(document.body.classList.contains('kitchen-mode'))); return; }
      if (button.id === 'btnShake') { const recentIds = state.avoidRecent ? new Set(state.recommendations.recent || []) : new Set(); const candidates = state.dishes.filter(dish => dish.id !== state.selections[state.meal]?.dish_id && !recentIds.has(dish.id)); state.shakeDish = candidates[Math.floor(Math.random() * candidates.length)] || state.dishes[0]; if (!state.shakeDish) return; $('#shakeResult').textContent = '正在挑选...'; $('#btnShakeAgain').disabled = true; $('#btnShakeClose').disabled = false; openModal('shakeModal'); setTimeout(() => { $('#shakeResult').innerHTML = `<strong>${esc(state.shakeDish.name)}</strong><p>${esc(state.shakeDish.category)}</p>`; $('#btnShakeAgain').disabled = false; }, 500); return; }
      if (button.id === 'btnShakeAgain' && state.shakeDish) { closeModal('shakeModal'); return chooseDish(state.shakeDish.id); }
      if (button.id === 'btnShakeClose') return closeModal('shakeModal');
      if (button.id === 'btnAddTarget') { await api('/api/notify/targets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: $('#ntName').value, email: $('#ntEmail').value, phone: $('#ntPhone').value }) }); ['#ntName', '#ntEmail', '#ntPhone'].forEach(id => { $(id).value = ''; }); return showNotify(); }
      if (button.id === 'btnSaveNotify') { await api('/api/notify/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: { host: $('#cfgEmailHost').value, user: $('#cfgEmailUser').value, pass: $('#cfgEmailPass').value }, sms: { accessKeyId: $('#cfgSmsKey').value, accessKeySecret: $('#cfgSmsSecret').value, signName: $('#cfgSmsSign').value, templateCode: $('#cfgSmsTpl').value, reminderTemplateCode: $('#cfgSmsReminderTpl').value } }) }); await showNotify(); return toast('通知配置已保存', 'success'); }
      if (button.id === 'btnTestNotify') { const result = await api('/api/notify/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_name: state.me?.name || '测试用户', dish_name: '测试菜品', meal: state.meal }) }); const sent = result.sms.filter(item => item.ok).length; const failed = result.sms.find(item => !item.ok); return toast(sent ? `短信已发送至 ${sent} 人` : (failed?.reason || failed?.error || '没有可发送的短信号码'), sent ? 'success' : 'error'); }
      if (button.id === 'btnSaveReminders') { await Promise.all(['lunch', 'dinner'].map(meal => api('/api/reminders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meal, remind_time: $(`#remind${meal === 'lunch' ? 'Lunch' : 'Dinner'}Time`).value, enabled: $(`#remind${meal === 'lunch' ? 'Lunch' : 'Dinner'}Enabled`).checked }) }))); return toast('提醒设置已保存', 'success'); }
    } catch (error) { toast(error.message, 'error'); }
  });

  dom.search.addEventListener('input', () => { state.query = dom.search.value.trim(); dom.searchClear.classList.toggle('hidden', !state.query); clearTimeout(dom.search.timer); dom.search.timer = setTimeout(() => loadDishes().catch(error => toast(error.message, 'error')), 250); });
  dom.noteDate.addEventListener('change', () => { loadSharedNotes().catch(error => toast(error.message, 'error')); saveNoteDraft(); });
  dom.noteAuthor.addEventListener('change', () => { renderNoteForm(); saveNoteDraft(); });
  dom.noteContent.addEventListener('input', () => { updateNoteCount(); saveNoteDraft(); });
  dom.mentionPicker.addEventListener('change', saveNoteDraft);
  document.addEventListener('change', event => {
    const ingredient = event.target.closest('input[data-ingredient-index]');
    if (ingredient && state.recipe) {
      const index = Number(ingredient.dataset.ingredientIndex);
      if (ingredient.checked) state.ingredientDone.add(index);
      else state.ingredientDone.delete(index);
      localStorage.setItem(recipeIngredientKey(state.recipe), JSON.stringify([...state.ingredientDone]));
      renderRecipe();
      return;
    }
    const step = event.target.closest('input[data-recipe-step]');
    if (!step || !state.recipe) return;
    const index = Number(step.dataset.recipeStep);
    if (step.checked) state.recipeDone.add(index);
    else state.recipeDone.delete(index);
    saveRecipeProgress();
    renderRecipe();
    if (state.recipeDone.size === state.recipe.steps.length) toast('这道菜完成啦，开饭！', 'success');
  });
  $$('.meal-card').forEach(card => card.addEventListener('click', () => { state.meal = card.dataset.meal; localStorage.setItem('fm_last_meal', state.meal); setStep(3); Promise.all([loadDishes(), loadRecentSelection()]).catch(error => toast(error.message, 'error')); }));
  document.addEventListener('keydown', event => {
    if (event.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { event.preventDefault(); dom.search.focus(); return; }
    const modal = $('.modal-overlay:not(.hidden)');
    if (event.key === 'Escape' && modal) return closeModal(modal.id);
    if (event.key === 'Tab' && modal) {
      const focusable = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      return;
    }
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || modal) return;
    if (event.key.toLowerCase() === 'r' && !$('#step3').classList.contains('hidden')) { event.preventDefault(); repeatLastChoice().catch(error => toast(error.message, 'error')); return; }
    if (event.key.toLowerCase() === 'n' && !$('#step3').classList.contains('hidden')) { event.preventDefault(); dom.avoidRepeat.click(); return; }
    if (event.key === '?') { event.preventDefault(); openModal('shortcutsModal'); }
  });
  $$('.modal-overlay').forEach(overlay => overlay.addEventListener('click', event => { if (event.target === overlay) closeModal(overlay.id); }));

  async function initialize() {
    try {
      dom.whoError.classList.add('hidden');
      await Promise.all([loadUsers(), loadCategories(), loadFeed(), loadRecommendations()]);
      if (state.me) { updateIdentity(); setStep(2); await refreshDashboard(); } else setStep(1);
      connectEvents();
      setView('home');
    } catch (error) { dom.whoError.classList.remove('hidden'); toast(error.message, 'error'); }
  }

  initialize();
})();
