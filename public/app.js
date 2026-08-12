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
    voteDishes: $('#voteDishGrid'), notifyTargets: $('#notifyTargetList'), planTitle: $('#planTitle'), notifyStatus: $('#notifyStatus')
  };
  const avatars = ['🐱', '🐸', '🐷', '🐻', '🐼', '🦊', '🐰', '🐯', '🐶', '🐨'];
  const colors = ['#ef6c5b', '#2878b5', '#159570', '#c45488', '#ba7a2b', '#7765b3'];
  const state = {
    me: null, users: [], dishes: [], categories: [], favorites: new Set(), selections: { lunch: null, dinner: null },
    meal: 'lunch', date: today(), category: '全部', query: '', onlyFavorites: false, plan: [], feed: [], selectedAvatar: '🐱', eventSource: null, retryTimer: null, retries: 0, shakeDish: null
  };
  let toastTimer;
  let lastFocus = null;

  // Keep the brand and the four-step flow in one sticky header on narrow screens.
  $('#topbar').append(dom.stepBar);

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

  function setConnection(status) {
    dom.conn.classList.toggle('online', status === 'online');
    dom.conn.classList.toggle('reconnecting', status === 'reconnecting');
    dom.conn.classList.toggle('offline', status === 'offline');
    dom.conn.title = status === 'online' ? '实时连接已开启' : status === 'offline' ? '连接已断开，正在重连' : '连接中...';
  }

  function updateIdentity() {
    if (!state.me) return;
    dom.meAvatar.textContent = state.me.avatar;
    dom.meName.textContent = state.me.name;
    $('#btnMe').classList.remove('hidden');
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
    dom.category.innerHTML = values.map(category => `<button class="chip ${state.category === category ? 'active' : ''}" data-category="${esc(category)}" aria-pressed="${state.category === category}">${esc(category)}</button>`).join('');
    const defaults = ['家常菜', '火锅', '西餐', '日料', '面食', '汤羹', '甜品饮品'];
    const options = [...new Set([...defaults, ...state.categories.map(item => item.category)])];
    dom.dishCategory.innerHTML = options.map(category => `<option value="${esc(category)}">${esc(category)}</option>`).join('');
  }

  function renderDishes() {
    let dishes = state.onlyFavorites ? state.dishes.filter(dish => state.favorites.has(dish.id)) : state.dishes;
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
      return `<article class="dish-card ${selected ? 'mine' : ''}"><div class="dish-img-wrap">${visual}<button class="dish-fav ${favorite ? 'on' : ''}" data-favorite-id="${dish.id}" aria-label="${favorite ? '取消收藏' : '收藏'} ${esc(dish.name)}" aria-pressed="${favorite}">${favorite ? '♥' : '♡'}</button></div><div class="dish-body"><span class="dish-cat-tag">${esc(dish.category)}</span><h3 class="dish-name">${esc(dish.name)}</h3><p class="dish-desc">${esc(dish.description || '')}</p><div class="dish-footer"><span class="dish-count">${picked.length ? `${picked.length} 人想吃` : ''}</span><button class="dish-btn ${selected ? 'chosen' : ''}" data-dish-id="${dish.id}" ${selected ? 'disabled' : ''}>${selected ? '已选' : '选这个'}</button></div></div></article>`;
    }).join('');
  }

  function renderSummary() {
    dom.planTitle.textContent = state.date === today() ? '今天谁吃了什么' : `${dateLabel(state.date)} 的安排`;
    const groups = { lunch: [], dinner: [] };
    state.plan.forEach(item => groups[item.meal]?.push(item));
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

  async function loadFeed() { state.feed = await api('/api/notifications?limit=30'); renderFeed(); }
  async function refreshDashboard() { await Promise.all([loadPlan(), loadSelections(), loadFavorites(), loadFeed()]); }

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
    $('#doneDish').innerHTML = `<div class="done-dish-info"><div class="done-dish-name">${esc(dish?.name || '')}</div><div class="done-dish-cat">${esc(dish?.category || '')}</div></div>`;
    $('#btnDoneOk').dataset.dishId = id;
    setStep(4); await refreshDashboard();
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
    form.set('name', name); form.set('category', dom.dishCategory.value); form.set('description', $('#dishDesc').value.trim()); form.set('image_url', $('#dishImg').value.trim());
    const file = $('#dishFile')?.files?.[0]; if (file) form.set('image', file);
    const response = await fetch('/api/dishes', { method: 'POST', body: form });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || '添加失败');
    ['#dishName', '#dishDesc', '#dishImg'].forEach(id => { $(id).value = ''; });
    await Promise.all([loadDishes(), loadCategories()]); toast(data.warning || '菜品已添加', 'success');
  }

  async function loadCategories() { state.categories = await api('/api/categories'); renderCategories(); }

  async function showHistory() {
    const data = await api('/api/history?days=7');
    const grouped = data.list.reduce((all, item) => ((all[item.date] ||= []).push(item), all), {});
    dom.history.innerHTML = data.dates.map(date => `<section class="history-day"><h4>${date}</h4>${(grouped[date] || []).map(item => `<p>${esc(item.user_avatar)} ${esc(item.user_name)} · ${esc(mealName(item.meal))} · ${esc(item.dish_name)}</p>`).join('') || '<p class="feed-empty">暂无安排</p>'}</section>`).join('');
  }

  async function showWeekly() {
    const data = await api('/api/weekly');
    const grouped = data.list.reduce((all, item) => ((all[item.date] ||= []).push(item), all), {});
    dom.weekly.innerHTML = data.week.map(date => {
      const meals = { lunch: [], dinner: [] };
      (grouped[date] || []).forEach(item => meals[item.meal]?.push(item));
      return `<section class="weekly-day ${date === today() ? 'today' : ''}"><h4>${dateLabel(date)}</h4>${['lunch', 'dinner'].map(meal => `<div class="weekly-meal"><strong>${meal === 'lunch' ? '中饭' : '晚饭'}</strong><span>${meals[meal].map(item => `${esc(item.user_avatar)} ${esc(item.dish_name)}`).join('、') || '暂无安排'}</span><button class="weekly-plan" data-plan-date="${date}" data-plan-meal="${meal}">安排</button></div>`).join('')}</section>`;
    }).join('');
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
    };
    source.onerror = () => { source.close(); setConnection('offline'); clearTimeout(state.retryTimer); state.retryTimer = setTimeout(connectEvents, Math.min(1000 * 2 ** Math.min(++state.retries, 5), 30000)); };
  }

  document.addEventListener('click', async event => {
    const button = event.target.closest('button, .who-card');
    if (!button) return;
    try {
      if (button.dataset.userId) return chooseUser(state.users.find(user => user.id === Number(button.dataset.userId)));
      if (button.dataset.switchId) return chooseUser(state.users.find(user => user.id === Number(button.dataset.switchId)));
      if ('addUser' in button.dataset) { renderAvatarPicker(); return openModal('addUserModal'); }
      if (button.dataset.avatar) { state.selectedAvatar = button.dataset.avatar; return renderAvatarPicker(); }
      if (button.dataset.category) { state.category = button.dataset.category; await loadDishes(); return renderCategories(); }
      if (button.dataset.dishId) return chooseDish(Number(button.dataset.dishId));
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
      if (button.id === 'btnCreateVote') return createVote();
      if (button.id === 'btnRefreshWeekly') return showWeekly();
      if (button.id === 'chipFav') { state.onlyFavorites = !state.onlyFavorites; button.classList.toggle('active', state.onlyFavorites); return renderDishes(); }
      if (button.id === 'searchClear') { dom.search.value = ''; state.query = ''; button.classList.add('hidden'); return loadDishes(); }
      if (button.id === 'btnWhoRetry') return initialize();
      if (button.id === 'btnDishRetry') return loadDishes();
      if (button.id === 'btnAddFromEmpty') return openModal('adminModal');
      if (button.id === 'btnDoneBack') return setStep(3);
      if (button.id === 'btnDoneOk') return setStep(3);
      if (button.id === 'btnShake') { state.shakeDish = state.dishes[Math.floor(Math.random() * state.dishes.length)]; if (!state.shakeDish) return; $('#shakeResult').textContent = '正在挑选...'; $('#btnShakeAgain').disabled = true; $('#btnShakeClose').disabled = false; openModal('shakeModal'); setTimeout(() => { $('#shakeResult').innerHTML = `<strong>${esc(state.shakeDish.name)}</strong><p>${esc(state.shakeDish.category)}</p>`; $('#btnShakeAgain').disabled = false; }, 500); return; }
      if (button.id === 'btnShakeAgain' && state.shakeDish) { closeModal('shakeModal'); return chooseDish(state.shakeDish.id); }
      if (button.id === 'btnShakeClose') return closeModal('shakeModal');
      if (button.id === 'btnAddTarget') { await api('/api/notify/targets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: $('#ntName').value, email: $('#ntEmail').value, phone: $('#ntPhone').value }) }); ['#ntName', '#ntEmail', '#ntPhone'].forEach(id => { $(id).value = ''; }); return showNotify(); }
      if (button.id === 'btnSaveNotify') { await api('/api/notify/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: { host: $('#cfgEmailHost').value, user: $('#cfgEmailUser').value, pass: $('#cfgEmailPass').value }, sms: { accessKeyId: $('#cfgSmsKey').value, accessKeySecret: $('#cfgSmsSecret').value, signName: $('#cfgSmsSign').value, templateCode: $('#cfgSmsTpl').value, reminderTemplateCode: $('#cfgSmsReminderTpl').value } }) }); await showNotify(); return toast('通知配置已保存', 'success'); }
      if (button.id === 'btnTestNotify') { const result = await api('/api/notify/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_name: state.me?.name || '测试用户', dish_name: '测试菜品', meal: state.meal }) }); const sent = result.sms.filter(item => item.ok).length; const failed = result.sms.find(item => !item.ok); return toast(sent ? `短信已发送至 ${sent} 人` : (failed?.reason || failed?.error || '没有可发送的短信号码'), sent ? 'success' : 'error'); }
      if (button.id === 'btnSaveReminders') { await Promise.all(['lunch', 'dinner'].map(meal => api('/api/reminders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meal, remind_time: $(`#remind${meal === 'lunch' ? 'Lunch' : 'Dinner'}Time`).value, enabled: $(`#remind${meal === 'lunch' ? 'Lunch' : 'Dinner'}Enabled`).checked }) }))); return toast('提醒设置已保存', 'success'); }
    } catch (error) { toast(error.message, 'error'); }
  });

  dom.search.addEventListener('input', () => { state.query = dom.search.value.trim(); dom.searchClear.classList.toggle('hidden', !state.query); clearTimeout(dom.search.timer); dom.search.timer = setTimeout(() => loadDishes().catch(error => toast(error.message, 'error')), 250); });
  $$('.meal-card').forEach(card => card.addEventListener('click', () => { state.meal = card.dataset.meal; setStep(3); loadDishes().catch(error => toast(error.message, 'error')); }));
  document.addEventListener('keydown', event => {
    const modal = $('.modal-overlay:not(.hidden)');
    if (event.key === 'Escape' && modal) return closeModal(modal.id);
    if (event.key !== 'Tab' || !modal) return;
    const focusable = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  $$('.modal-overlay').forEach(overlay => overlay.addEventListener('click', event => { if (event.target === overlay) closeModal(overlay.id); }));

  async function initialize() {
    try {
      dom.whoError.classList.add('hidden');
      await Promise.all([loadUsers(), loadCategories(), loadFeed()]);
      if (state.me) { updateIdentity(); setStep(2); await refreshDashboard(); } else setStep(1);
      connectEvents();
    } catch (error) { dom.whoError.classList.remove('hidden'); toast(error.message, 'error'); }
  }

  initialize();
})();
