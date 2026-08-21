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
  const initialParams = new URLSearchParams(window.location.search);
  const validViews = new Set(['home', 'menu', 'notes', 'pets', 'recommendations', 'polls']);
  const routeDate = /^\d{4}-\d{2}-\d{2}$/.test(initialParams.get('date') || '') ? initialParams.get('date') : today();
  const dom = {
    toast: $('#toast'), whoGrid: $('#whoGrid'), switchGrid: $('#switchGrid'), dishGrid: $('#dishGrid'),
    skeleton: $('#skeletonGrid'), dishEmpty: $('#dishEmpty'), dishError: $('#dishError'), whoError: $('#whoError'),
    category: $('#catChips'), summary: $('#todaySummary'), feed: $('#feedList'), avatarGrid: $('#avatarGrid'),
    meAvatar: $('#meAvatar'), meName: $('#meName'), conn: $('#connDot'), stepBar: $('#stepBar'),
    search: $('#searchInput'), searchClear: $('#searchClear'), favorite: $('#chipFav'), adminList: $('#adminList'),
    dishCategory: $('#dishCat'), history: $('#historyList'), weekly: $('#weeklyGrid'), voteList: $('#votesList'),
    voteDishes: $('#voteDishGrid'), notifyTargets: $('#notifyTargetList'), planTitle: $('#planTitle'), planProgress: $('#planProgress'), tableNote: $('#tableNote'), pendingPeople: $('#pendingPeople'), celebration: $('#celebrationLayer'), notifyStatus: $('#notifyStatus'),
    repeatLast: $('#btnRepeatLast'), avoidRepeat: $('#btnAvoidRepeat'), stats: $('#statsContent'), recipeTitle: $('#recipeTitle'), recipeEyebrow: $('#recipeEyebrow'), recipeMeta: $('#recipeMeta'), recipeIngredients: $('#recipeIngredients'), ingredientProgress: $('#ingredientProgress'), recipeSteps: $('#recipeSteps'), recipeProgress: $('#recipeProgress'), recipeTip: $('#recipeTip'), recipeServings: $('#recipeServings'), recipeTimer: $('#recipeTimer'),
    notesView: $('#notesView'), notesList: $('#notesList'), noteDate: $('#noteDate'), noteAuthor: $('#noteAuthor'), noteContent: $('#noteContent'), mentionPicker: $('#mentionPicker'), noteCount: $('#noteCount'), noteSaveStatus: $('#noteSaveStatus'), notesDateLabel: $('#notesDateLabel'), noteFilter: $('#noteFilter'), selectionNote: $('#selectionNote'), notesWeekSummary: $('#notesWeekSummary'), noteIsTask: $('#noteIsTask'), noteDueDate: $('#noteDueDate'), notePriority: $('#notePriority'), notesCalendar: $('#notesCalendar'), notesAgenda: $('#notesAgenda'), notesCalendarTitle: $('#notesCalendarTitle'),
    petsView: $('#petsView'), petGrid: $('#petGrid'), petRecords: $('#petRecords'), petRecordCount: $('#petRecordCount'), petAttentionCount: $('#petAttentionCount'), petRecordPet: $('#petRecordPet'), petRecordType: $('#petRecordType'), petRecordDate: $('#petRecordDate'), petRecordAuthor: $('#petRecordAuthor'), petRecordNote: $('#petRecordNote'), petRecordNoteCount: $('#petRecordNoteCount'), petRecordStatus: $('#petRecordStatus'), petCareTypeFilter: $('#petCareTypeFilter'), petDetailContent: $('#petDetailContent'), petRecordClinic: $('#petRecordClinic'), petRecordMedication: $('#petRecordMedication'), petRecordWeight: $('#petRecordWeight'), petRecordInterval: $('#petRecordInterval'), petRecordAttachment: $('#petRecordAttachment'),
    recommendationsView: $('#recommendationsView'), recommendationMap: $('#recommendationMap'), recommendationMapCaption: $('#recommendationMapCaption'), recommendationStats: $('#recommendationStats'), recommendationList: $('#recommendationList'), checkinList: $('#checkinList'), checkinCount: $('#checkinCount'), recommendationTitle: $('#recommendationTitle'), recommendationKind: $('#recommendationKind'), recommendationAuthor: $('#recommendationAuthor'), recommendationRegion: $('#recommendationRegion'), recommendationAddress: $('#recommendationAddress'), recommendationLatitude: $('#recommendationLatitude'), recommendationLongitude: $('#recommendationLongitude'), recommendationDescription: $('#recommendationDescription'), recommendationSaveStatus: $('#recommendationSaveStatus'), checkinRecommendation: $('#checkinRecommendation'), checkinDate: $('#checkinDate'), checkinAuthor: $('#checkinAuthor'), checkinRegion: $('#checkinRegion'), checkinAddress: $('#checkinAddress'), checkinLatitude: $('#checkinLatitude'), checkinLongitude: $('#checkinLongitude'), checkinNote: $('#checkinNote'), checkinSaveStatus: $('#checkinSaveStatus'), recommendationRegionFilter: $('#recommendationRegionFilter'), recommendationYearFilter: $('#recommendationYearFilter'), galleryContent: $('#galleryContent'), recommendationRating: $('#recommendationRating'), recommendationVisitStatus: $('#recommendationVisitStatus'), recommendationTags: $('#recommendationTags'), recommendationRevisitReason: $('#recommendationRevisitReason'), homeTodos: $('#homeTodayTodos'), recommendationTimeline: $('#recommendationTimeline'), preferenceBar: $('#preferenceBar'), preferencePicker: $('#preferencePicker'), shoppingList: $('#shoppingList'), shoppingSummary: $('#shoppingSummary'), superRecommendationList: $('#superRecommendationList'), superRecommendationStats: $('#superRecommendationStats'),
    pollsView: $('#pollsView'), pollsList: $('#pollsList'), pollTitle: $('#pollTitle'), pollDescription: $('#pollDescription'), pollDeadline: $('#pollDeadline'), pollAuthor: $('#pollAuthor'), pollOptionInputs: $('#pollOptionInputs'), pollCreateStatus: $('#pollCreateStatus'), sharedPollContent: $('#sharedPollContent'),
    menuLens: $('#menuLens'), notesLens: $('#notesLens'), petsLens: $('#petsLens'), recommendationsLens: $('#recommendationsLens'), pollsLens: $('#pollsLens')
  };
  const avatars = ['🐱', '🐸', '🐷', '🐻', '🐼', '🦊', '🐰', '🐯', '🐶', '🐨'];
  const colors = ['#ef6c5b', '#2878b5', '#159570', '#c45488', '#ba7a2b', '#7765b3'];
  const petCareTypes = {
    vaccine: { label: '疫苗', schedule: 365 }, internal_deworming: { label: '体内驱虫', schedule: 90 }, external_deworming: { label: '体外驱虫', schedule: 30 }, bath: { label: '洗澡护理', schedule: 30 }, nail_trim: { label: '剪指甲', schedule: 21 }, health_check: { label: '健康检查', schedule: 180 }, vet_visit: { label: '就诊用药' }, weight: { label: '体重记录' }
  };
  const preferenceOptions = [
    { id: 'no_spicy', label: '不吃辣', icon: '🌶️', keywords: ['辣', '麻辣', '剁椒', '香锅', '火锅'] },
    { id: 'no_cilantro', label: '不要香菜', icon: '🌿', keywords: ['香菜'] },
    { id: 'no_seafood', label: '不吃海鲜', icon: '🦐', keywords: ['虾', '鱼', '蟹', '贝', '海鲜'] },
    { id: 'light', label: '减脂优先', icon: '🥗', keywords: ['红烧', '炸', '肥', '奶茶', '甜品', '糖醋'] }
  ];
  const state = {
    me: null, users: [], dishes: [], categories: [], favorites: new Set(), selections: { lunch: null, dinner: null }, recommendations: { frequent: [], never: [] }, dishMode: 'smart',
    meal: ['lunch', 'dinner'].includes(initialParams.get('meal')) ? initialParams.get('meal') : localStorage.getItem('fm_last_meal') || (new Date().getHours() >= 14 ? 'dinner' : 'lunch'), date: routeDate, category: initialParams.get('category') || '全部', query: '', onlyFavorites: false, avoidRecent: false, recentSelection: null, weeklyData: null, recipe: null, recipeDone: new Set(), ingredientDone: new Set(), servings: 2, timerEndsAt: null, timerInterval: null, plan: [], feed: [], selectedAvatar: '🐱', eventSource: null, retryTimer: null, retries: 0, shakeDish: null, view: validViews.has(initialParams.get('view')) ? initialParams.get('view') : 'home', currentStep: 1, notes: [], noteFilter: '', notePinnedOnly: false, noteViewFilter: 'all', noteSummary: null, noteCalendarMonth: initialParams.get('month') || today().slice(0, 7), noteCalendarDays: [], noteAgenda: [], justAddedNoteId: null, pets: [], petRecords: [], petTasks: [], petTemplates: [], petFilter: 'all', petCareFilter: 'all', selectedPetId: null, savedRecommendations: [], recommendationExpanded: false, superRecommendations: [], superRecommendationFilter: 'all', superRecommendationExpanded: false, checkins: [], familyTimeline: [], recommendationFilter: initialParams.get('kind') || 'all', recommendationRegion: initialParams.get('region') || 'all', recommendationYear: initialParams.get('year') || 'all', recommendationVisit: 'all', recommendationRatingFilter: 0, recommendationTravelOnly: false, mapRecommendationId: null, preferences: [], homeDashboard: null, familyPolls: [], sharedPoll: null
  };
  let toastTimer;
  let lastFocus = null;
  const motionBehavior = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

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

  function renderLens(container, items) {
    if (!container) return;
    container.innerHTML = items.map(item => `<button type="button" data-lens-action="${item.action}"><b>${esc(item.value)}</b><span>${esc(item.label)}</span><small>${esc(item.detail)}</small></button>`).join('');
  }

  function renderMenuLens() {
    const selected = state.plan.filter(item => item.meal === state.meal).length;
    const remaining = Math.max(0, state.users.length - selected);
    renderLens(dom.menuLens, [
      { action: 'menu-date', value: dateLabel(state.date), label: mealName(state.meal), detail: '切回今天' },
      { action: 'menu-progress', value: `${selected}/${state.users.length || 0}`, label: '本餐已选', detail: remaining ? `还有 ${remaining} 人` : '全员完成' },
      { action: 'menu-preferences', value: state.preferences.length || '0', label: '口味偏好', detail: state.preferences.length ? '已用于筛菜' : '还未设置' },
      { action: 'menu-fresh', value: state.avoidRecent ? '开' : '关', label: '本周不重样', detail: state.avoidRecent ? '已排除近期' : '点击开启' },
      { action: 'menu-reset', value: state.dishes.length || '—', label: '当前菜品', detail: '清空筛选' }
    ]);
  }

  function renderNotesLens() {
    const open = state.notes.filter(note => note.is_task && !note.task_done).length;
    const high = state.notes.filter(note => ['high', 'urgent'].includes(note.priority)).length;
    const pinned = state.notes.filter(note => note.pinned).length;
    const agenda = state.noteAgenda.filter(note => !note.task_done).length;
    renderLens(dom.notesLens, [
      { action: 'notes-today', value: state.notes.length, label: '当天记录', detail: '回到今天' },
      { action: 'notes-open', value: open, label: '未完成', detail: open ? '点击筛选' : '全部完成' },
      { action: 'notes-high', value: high, label: '高优先级', detail: high ? '需要留意' : '暂无紧急' },
      { action: 'notes-pinned', value: pinned, label: '已固定', detail: pinned ? '点击查看' : '暂无固定' },
      { action: 'notes-agenda', value: agenda, label: '近期待办', detail: '查看 21 天' }
    ]);
  }

  function renderPetsLens() {
    const attention = state.pets.filter(pet => ['vaccine', 'internal_deworming', 'external_deworming', 'bath'].some(type => careState(type, pet.latest?.[type]).tone !== 'done')).length;
    const dueSoon = state.petTasks.filter(task => !task.done).length;
    const weightRecords = state.petRecords.filter(record => Number(record.weight_kg) > 0).length;
    renderLens(dom.petsLens, [
      { action: 'pets-all', value: state.pets.length, label: '猫咪档案', detail: '查看全部' },
      { action: 'pets-attention', value: attention, label: '需要关注', detail: attention ? '补齐护理记录' : '状态不错' },
      { action: 'pets-due', value: dueSoon, label: '护理待办', detail: dueSoon ? '近期要安排' : '暂无到期' },
      { action: 'pets-weight', value: weightRecords, label: '体重记录', detail: '登记一次体重' },
      { action: 'pets-history', value: state.petRecords.length, label: '永久记录', detail: '查看时间线' }
    ]);
  }

  function renderRecommendationsLens() {
    const want = state.savedRecommendations.filter(item => item.visit_status === 'want').length;
    const visited = state.savedRecommendations.filter(item => item.visit_status === 'visited').length;
    const rated = state.savedRecommendations.filter(item => Number(item.rating) >= 5).length;
    const travel = state.savedRecommendations.filter(item => item.travel_key).length;
    renderLens(dom.recommendationsLens, [
      { action: 'recommendations-all', value: state.savedRecommendations.length, label: '全部收藏', detail: '清除快捷筛选' },
      { action: 'recommendations-want', value: want, label: '想去想买', detail: '待安排清单' },
      { action: 'recommendations-visited', value: visited, label: '去过回购', detail: '真实体验' },
      { action: 'recommendations-rating', value: rated, label: '五星精选', detail: '优先再去' },
      { action: 'recommendations-travel', value: travel, label: '旅行足迹', detail: '按年份浏览' }
    ]);
  }

  function renderPollsLens() {
    const open = state.familyPolls.filter(poll => pollState(poll).className === 'open');
    const totalVotes = state.familyPolls.reduce((sum, poll) => sum + Number(poll.total_votes || 0), 0);
    const withDeadline = open.filter(poll => poll.deadline).length;
    renderLens(dom.pollsLens, [
      { action: 'polls-open', value: open.length, label: '进行中', detail: '打开投票' },
      { action: 'polls-votes', value: totalVotes, label: '累计投票', detail: '实时汇总' },
      { action: 'polls-deadline', value: withDeadline, label: '设有截止', detail: '按期决定' },
      { action: 'polls-template', value: '5', label: '快速模板', detail: '一键预填' },
      { action: 'polls-create', value: '+', label: '新建投票', detail: '自定义问题' }
    ]);
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

  function syncUrlState(mode = 'replace') {
    const params = new URLSearchParams();
    const vote = new URLSearchParams(window.location.search).get('vote');
    if (vote) params.set('vote', vote);
    if (state.view !== 'home') params.set('view', state.view);
    if (state.view === 'menu') {
      params.set('date', state.date);
      params.set('meal', state.meal);
      if (state.category !== '全部') params.set('category', state.category);
    }
    if (state.view === 'notes') params.set('month', state.noteCalendarMonth);
    if (state.view === 'recommendations') {
      if (state.recommendationFilter !== 'all') params.set('kind', state.recommendationFilter);
      if (state.recommendationRegion !== 'all') params.set('region', state.recommendationRegion);
      if (state.recommendationYear !== 'all') params.set('year', state.recommendationYear);
    }
    const url = `${window.location.pathname}${params.size ? `?${params}` : ''}`;
    window.history[mode === 'push' ? 'pushState' : 'replaceState']({ view: state.view }, '', url);
  }

  function setView(view, historyMode = 'push') {
    if (!validViews.has(view)) view = 'home';
    state.view = view;
    document.body.classList.toggle('app-home', view === 'home');
    document.body.classList.toggle('app-menu', view === 'menu');
    document.body.classList.toggle('app-notes', view === 'notes');
    document.body.classList.toggle('app-pets', view === 'pets');
    document.body.classList.toggle('app-recommendations', view === 'recommendations');
    document.body.classList.toggle('app-polls', view === 'polls');
    $('#homeScreen').classList.toggle('hidden', view !== 'home');
    $('#main').classList.toggle('hidden', view !== 'menu');
    dom.notesView.classList.toggle('hidden', view !== 'notes');
    dom.petsView.classList.toggle('hidden', view !== 'pets');
    dom.recommendationsView.classList.toggle('hidden', view !== 'recommendations');
    dom.pollsView.classList.toggle('hidden', view !== 'polls');
    dom.stepBar.classList.toggle('hidden', view !== 'menu' || state.currentStep === 1);
    $('#topbarContext').textContent = view === 'notes' ? '猫家记事本' : view === 'pets' ? '猫咪清单' : view === 'recommendations' ? '推荐清单' : view === 'polls' ? '家庭投票' : '猫家点菜';
    if (view === 'home') loadHomeData().catch(error => toast(error.message, 'error'));
    if (view === 'notes') {
      renderNoteForm();
      loadSharedNotes().catch(error => toast(error.message, 'error'));
      loadNotesOverview().catch(error => toast(error.message, 'error'));
    }
    if (view === 'pets') Promise.all([loadPets(), loadPetRecords()]).catch(error => toast(error.message, 'error'));
    if (view === 'recommendations') loadRecommendationData().catch(error => toast(error.message, 'error'));
    if (view === 'polls') loadFamilyPolls().catch(error => toast(error.message, 'error'));
    if (historyMode !== 'none') syncUrlState(historyMode);
    window.scrollTo({ top: 0, behavior: motionBehavior() });
  }

  function timelineIcon(kind) {
    return { meal: '🍚', note: '✦', pet: '🐾', checkin: '📍' }[kind] || '•';
  }

  function renderHomeData() {
    const dashboard = state.homeDashboard;
    if (!dashboard) return;
    const meals = Object.fromEntries((dashboard.meals || []).map(item => [item.meal, item.count]));
    const todoGroups = [
      { icon: '🍚', title: '未选餐', count: Math.max(0, state.users.length * 2 - (meals.lunch || 0) - (meals.dinner || 0)), detail: '今天还有餐别待选择' },
      { icon: '@', title: '待办与提醒', count: (dashboard.tasks || []).length + (dashboard.mentions || []).length, detail: dashboard.tasks?.[0] ? `${dashboard.tasks[0].priority === 'urgent' ? '紧急 · ' : ''}${dashboard.tasks[0].content}` : dashboard.mentions?.[0]?.content || '暂时没有新提醒' },
      { icon: '🐾', title: '临近护理', count: (dashboard.pet_tasks || []).length, detail: dashboard.pet_tasks?.[0] ? `${dashboard.pet_tasks[0].pet_name} · ${careLabel(dashboard.pet_tasks[0].care_type)}` : '近期没有安排' },
      { icon: '📍', title: '待打卡地点', count: (dashboard.want_to_visit || []).length, detail: dashboard.want_to_visit?.[0]?.title || '暂时没有想去清单' }
    ];
    dom.homeTodos.innerHTML = todoGroups.map(item => `<button type="button" class="home-todo" data-home-jump="${item.title}"><span>${item.icon}</span><b>${item.count}</b><strong>${item.title}</strong><small>${esc(item.detail)}</small></button>`).join('');
  }

  async function loadHomeData() {
    const userQuery = state.me?.id ? `?user_id=${state.me.id}` : '';
    const dashboard = await api(`/api/home-dashboard${userQuery}`);
    state.homeDashboard = dashboard;
    renderHomeData();
  }

  function preferenceById(id) { return preferenceOptions.find(item => item.id === id); }

  function renderPreferenceBar() {
    if (!dom.preferenceBar) return;
    const selected = state.preferences.map(preferenceById).filter(Boolean);
    dom.preferenceBar.innerHTML = `<div><span class="preference-kicker">${state.me ? `${esc(state.me.name)}的口味` : '我的口味'}</span><strong>${selected.length ? selected.map(item => `${item.icon} ${item.label}`).join(' · ') : '还没有设置忌口或偏好'}</strong></div><div><button id="btnOpenPreferences" type="button">调整偏好</button><button id="btnOpenShopping" type="button">购物清单</button></div>`;
  }

  function renderPreferencePicker() {
    dom.preferencePicker.innerHTML = preferenceOptions.map(item => `<label class="preference-option"><input type="checkbox" value="${item.id}" ${state.preferences.includes(item.id) ? 'checked' : ''}><span>${item.icon}</span><b>${item.label}</b></label>`).join('');
  }

  async function loadPreferences() {
    if (!state.me) { state.preferences = []; renderPreferenceBar(); return; }
    const result = await api(`/api/users/${state.me.id}/preferences`);
    state.preferences = Array.isArray(result.tags) ? result.tags : [];
    renderPreferenceBar();
  }

  function openPreferences() {
    if (!state.me) return toast('请先选择家人，再设置口味偏好', 'error');
    renderPreferencePicker();
    openModal('preferencesModal');
  }

  async function savePreferences() {
    if (!state.me) return;
    const tags = $$('#preferencePicker input:checked').map(input => input.value);
    await api(`/api/users/${state.me.id}/preferences`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tags }) });
    state.preferences = tags;
    renderPreferenceBar();
    renderDishes();
    closeModal('preferencesModal');
    toast('口味偏好已保存，菜品列表已按此过滤', 'success');
  }

  function dishMatchesPreferences(dish) {
    if (!state.preferences.length) return true;
    const source = `${dish.name || ''} ${dish.description || ''} ${dish.category || ''}`.toLowerCase();
    return !state.preferences.some(id => preferenceById(id)?.keywords.some(keyword => source.includes(keyword)));
  }

  async function openShoppingList() {
    dom.shoppingSummary.textContent = '正在合并已选菜品的食材…';
    dom.shoppingList.innerHTML = '';
    openModal('shoppingModal');
    const list = await api(`/api/shopping-list?date=${encodeURIComponent(state.date)}`);
    dom.shoppingSummary.textContent = list.dishes.length ? `${dateLabel(list.date)} · ${list.dishes.join('、')}` : `${dateLabel(list.date)} 还没有选菜`;
    dom.shoppingList.innerHTML = list.items.length
      ? list.items.map(item => `<li><b>${esc(item.name)}</b><span>${esc(item.quantity)}</span><small>${esc(item.dishes.join('、'))}</small></li>`).join('')
      : '<li class="shopping-empty">选完菜后，这里会自动合并食谱食材。</li>';
  }

  async function copyDailyShoppingList() {
    const rows = $$('#shoppingList li:not(.shopping-empty)').map(item => `${item.querySelector('b')?.textContent || ''} ${item.querySelector('span')?.textContent || ''}`.trim());
    if (!rows.length) return toast('今天还没有可复制的食材', 'info');
    const text = `猫家购物清单 · ${dateLabel(state.date)}\n${rows.map(row => `- ${row}`).join('\n')}`;
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else window.prompt('复制购物清单', text);
    toast('购物清单已复制', 'success');
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
      mentions: $$('#mentionPicker input:checked').map(input => Number(input.value)),
      isTask: dom.noteIsTask.checked,
      dueDate: dom.noteDueDate.value,
      priority: dom.notePriority.value
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
    dom.noteIsTask.checked = Boolean(draft?.isTask);
    dom.noteDueDate.disabled = !dom.noteIsTask.checked;
    dom.noteDueDate.value = draft?.dueDate || '';
    dom.notePriority.value = priorityMeta[draft?.priority] ? draft.priority : 'normal';
    const mentions = new Set(Array.isArray(draft?.mentions) ? draft.mentions : []);
    $$('#mentionPicker input').forEach(input => { input.checked = mentions.has(Number(input.value)); });
    updateNoteCount();
  }

  function updateNoteCount() {
    dom.noteCount.textContent = `${dom.noteContent.value.length} / 1000`;
  }

  const priorityMeta = {
    low: { label: '低', icon: '○' }, normal: { label: '普通', icon: '·' }, high: { label: '高', icon: '▲' }, urgent: { label: '紧急', icon: '!' }
  };

  function notePriorityBadge(priority) {
    const meta = priorityMeta[priority] || priorityMeta.normal;
    return priority && priority !== 'normal' ? `<span class="note-priority note-priority-${esc(priority)}" title="${esc(meta.label)}优先级">${meta.icon} ${esc(meta.label)}</span>` : '';
  }

  function monthLabel(month) {
    const [year, value] = month.split('-').map(Number);
    return `${year} 年 ${value} 月`;
  }

  function shiftNotesMonth(change) {
    const date = new Date(`${state.noteCalendarMonth}-01T00:00:00`);
    date.setMonth(date.getMonth() + change);
    state.noteCalendarMonth = localDate(date).slice(0, 7);
    syncUrlState('push');
    loadNotesOverview().catch(error => toast(error.message, 'error'));
  }

  function renderNotesCalendar() {
    const month = state.noteCalendarMonth;
    const [year, monthNumber] = month.split('-').map(Number);
    const first = new Date(year, monthNumber - 1, 1);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const leading = (first.getDay() + 6) % 7;
    const byDate = new Map(state.noteCalendarDays.map(item => [item.date, item]));
    dom.notesCalendarTitle.textContent = monthLabel(month);
    const cells = [];
    for (let index = 0; index < leading; index += 1) cells.push('<span class="notes-calendar-spacer" aria-hidden="true"></span>');
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${month}-${String(day).padStart(2, '0')}`;
      const summary = byDate.get(date);
      const classes = [
        'notes-calendar-day',
        date === dom.noteDate.value ? 'is-selected' : '',
        date === today() ? 'is-today' : '',
        summary?.total ? 'has-record' : '',
        summary?.open_tasks ? 'has-open-task' : '',
        summary?.urgent_priority ? 'has-urgent' : ''
      ].filter(Boolean).join(' ');
      const label = `${date}${summary?.total ? `，${summary.total} 条记录` : '，无记录'}${summary?.open_tasks ? `，${summary.open_tasks} 条未完成待办` : ''}${summary?.urgent_priority ? '，有紧急事项' : ''}`;
      cells.push(`<button type="button" class="${classes}" data-note-date="${date}" aria-label="${esc(label)}" aria-pressed="${date === dom.noteDate.value}"><span>${day}</span>${summary?.total ? `<small>${summary.total}</small>` : ''}<i class="note-calendar-markers">${summary?.total ? '<b class="note-dot-record"></b>' : ''}${summary?.open_tasks ? '<b class="note-dot-task"></b>' : ''}${summary?.urgent_priority ? '<b class="note-dot-urgent"></b>' : ''}</i></button>`);
    }
    dom.notesCalendar.innerHTML = cells.join('');
  }

  function renderNotesAgenda() {
    const notes = state.noteAgenda;
    if (!notes.length) {
      dom.notesAgenda.innerHTML = '<p class="notes-agenda-empty">未来 21 天没有未完成待办，轻松一些也挺好。</p>';
      renderNotesLens();
      return;
    }
    dom.notesAgenda.innerHTML = notes.map(note => {
      const overdue = note.due_date && note.due_date < today();
      const date = note.due_date || note.note_date;
      return `<button type="button" class="notes-agenda-item ${overdue ? 'is-overdue' : ''}" data-note-date="${esc(note.note_date)}"><span class="notes-agenda-date">${overdue ? '已逾期' : note.due_date ? date.slice(5) : '无截止'}</span><div><strong>${esc(note.content)}</strong><small>${note.author_avatar || ''} ${esc(note.author_name)} · ${note.due_date ? `截止 ${note.due_date}` : `记录于 ${note.note_date}`}</small></div>${notePriorityBadge(note.priority)}</button>`;
    }).join('');
    renderNotesLens();
  }

  async function loadNotesOverview() {
    const [calendar, agenda] = await Promise.all([
      api(`/api/shared-notes/calendar?month=${encodeURIComponent(state.noteCalendarMonth)}`),
      api(`/api/shared-notes/agenda?from=${encodeURIComponent(today())}&days=21`)
    ]);
    state.noteCalendarMonth = calendar.month;
    state.noteCalendarDays = calendar.days || [];
    state.noteAgenda = agenda.notes || [];
    renderNotesCalendar();
    renderNotesAgenda();
  }

  function selectNotesDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    dom.noteDate.value = date;
    state.noteCalendarMonth = date.slice(0, 7);
    syncUrlState('push');
    loadSharedNotes().catch(error => toast(error.message, 'error'));
    loadNotesOverview().catch(error => toast(error.message, 'error'));
  }

  function renderSharedNotes() {
    const date = dom.noteDate.value || today();
    const keyword = state.noteFilter.trim().toLowerCase();
    const visibleNotes = state.notes.filter(note => {
      const matchKeyword = !keyword || `${note.content} ${note.author_name} ${note.mentions?.map(user => user.name).join(' ') || ''}`.toLowerCase().includes(keyword);
      const matchView = state.noteViewFilter === 'all'
        || (state.noteViewFilter === 'open' && note.is_task && !note.task_done)
        || (state.noteViewFilter === 'high' && ['high', 'urgent'].includes(note.priority));
      return matchKeyword && matchView && (!state.notePinnedOnly || note.pinned);
    });
    dom.notesDateLabel.textContent = `${dateLabel(date)} · ${visibleNotes.length}${keyword ? ` / ${state.notes.length}` : ''} 条记录`;
    $('#notesTimelineTitle').textContent = date === today() ? '今天的记录' : '当天记录';
    if (!visibleNotes.length) {
      dom.notesList.innerHTML = `<div class="notes-empty"><strong>${keyword ? '没有匹配的记录' : '这一天还没有记录'}</strong><span>${keyword ? '换个关键词试试。' : '先写下一件想让家人知道的小事。'}</span></div>`;
      renderNotesLens();
      return;
    }
    dom.notesList.innerHTML = visibleNotes.map(note => {
      const mentions = note.mentions?.length ? `<div class="note-mentions">${note.mentions.map(user => `<span>@${esc(user.name)}</span>`).join('')}</div>` : '';
      const content = esc(note.content).replace(/\n/g, '<br>');
      const canDelete = Number(dom.noteAuthor.value) === note.author_id;
      const pin = canDelete ? `<button class="note-pin ${note.pinned ? 'is-pinned' : ''}" type="button" data-pin-note="${note.id}" aria-pressed="${note.pinned ? 'true' : 'false'}" title="${note.pinned ? '取消固定' : '固定在当天顶部'}">固定</button>` : '';
      const task = note.is_task ? `<button class="note-task-toggle ${note.task_done ? 'is-done' : ''}" type="button" data-toggle-task="${note.id}" aria-pressed="${note.task_done ? 'true' : 'false'}">${note.task_done ? '已完成' : '完成待办'}</button>` : '';
      const due = note.is_task && note.due_date ? `<span class="note-due ${note.task_done ? '' : note.due_date < today() ? 'is-overdue' : ''}">截止 ${esc(note.due_date)}</span>` : '';
      const readState = note.mentions?.length ? `<small class="note-read-state">@ 已读 ${note.read_user_ids?.length || 0}/${note.mentions.length}</small>` : '';
      const remove = canDelete ? `<button class="note-delete" type="button" data-delete-note="${note.id}" title="删除这条记录" aria-label="删除 ${esc(note.author_name)} 的这条记录">×</button>` : '';
      return `<article class="note-entry ${note.task_done ? 'note-task-done' : ''} ${note.pinned ? 'note-pinned' : ''} ${note.id === state.justAddedNoteId ? 'note-just-added' : ''}"><div class="note-author"><span style="background:${esc(note.author_color)}">${esc(note.author_avatar)}</span><strong>${esc(note.author_name)}</strong>${notePriorityBadge(note.priority)}${note.pinned ? '<em>固定</em>' : ''}<time>${esc(String(note.created_at || '').slice(11, 16))}</time><button class="note-copy" type="button" data-copy-note="${note.id}" title="复制这条记录" aria-label="复制 ${esc(note.author_name)} 的这条记录">⧉</button>${pin}${task}${remove}</div><p>${content}</p>${due}${mentions}${readState}</article>`;
    }).join('');
    renderNotesLens();
  }

  function renderNoteSummary() {
    const summary = state.noteSummary;
    if (!summary) return;
    const author = summary.authors?.[0];
    dom.notesWeekSummary.textContent = `近 ${summary.days} 天 ${summary.total || 0} 条 · 活跃 ${summary.active_days || 0} 天${summary.pinned_count ? ` · ${summary.pinned_count} 条固定` : ''}${author ? ` · ${author.avatar} ${author.name} 记录最多` : ''}`;
  }

  async function loadSharedNotes() {
    const date = dom.noteDate.value || today();
    dom.notesList.setAttribute('aria-busy', 'true');
    try {
      const [result, summary] = await Promise.all([
        api(`/api/shared-notes?date=${encodeURIComponent(date)}`),
        api(`/api/shared-notes/summary?end_date=${encodeURIComponent(date)}&days=7`)
      ]);
      state.notes = result.notes;
      state.noteSummary = summary;
      renderSharedNotes();
      renderNoteSummary();
      renderNotesLens();
      if (state.noteCalendarMonth === date.slice(0, 7)) loadNotesOverview().catch(() => {});
      const unreadMentionIds = state.me ? state.notes.filter(note => note.mentions?.some(user => user.id === state.me.id) && !note.read_user_ids?.includes(state.me.id)).map(note => note.id) : [];
      if (unreadMentionIds.length) api('/api/shared-notes/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: state.me.id, note_ids: unreadMentionIds }) }).then(() => loadSharedNotes()).catch(() => {});
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
    dom.noteSaveStatus.textContent = '正在发布…';
    try {
      const created = await api('/api/shared-notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author_id: authorId, note_date: noteDate, content, mention_user_ids: mentionUserIds, is_task: dom.noteIsTask.checked, due_date: dom.noteDueDate.value, priority: dom.notePriority.value }) });
      state.justAddedNoteId = created.id;
      dom.noteContent.value = '';
      dom.noteIsTask.checked = false;
      dom.noteDueDate.value = '';
      dom.noteDueDate.disabled = true;
      dom.notePriority.value = 'normal';
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

  async function togglePinnedNote(noteId) {
    const note = state.notes.find(item => item.id === noteId);
    const authorId = Number(dom.noteAuthor.value);
    if (!note || !authorId) return;
    await api(`/api/shared-notes/${noteId}/pin`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author_id: authorId, pinned: !note.pinned }) });
    await loadSharedNotes();
    toast(note.pinned ? '已取消固定' : '已固定在当天顶部', 'success');
  }

  async function toggleNoteTask(noteId) {
    const note = state.notes.find(item => item.id === noteId);
    if (!note || !state.me) return toast('请先选择家人', 'error');
    await api(`/api/shared-notes/${noteId}/task`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: state.me.id, done: !note.task_done }) });
    await loadSharedNotes();
    toast(note.task_done ? '待办已恢复' : '待办已完成', 'success');
  }

  function exportCurrentNotes() {
    const date = dom.noteDate.value || today();
    const lines = [`# 猫家记事本 · ${dateLabel(date)}`, ''];
    state.notes.forEach(note => {
      const mentions = note.mentions?.length ? ` @${note.mentions.map(user => user.name).join(' @')}` : '';
      lines.push(`- ${note.pinned ? '[固定] ' : ''}${note.author_avatar || ''} ${note.author_name} ${String(note.created_at || '').slice(11, 16)}${mentions}`);
      lines.push(`  ${note.content.replace(/\n/g, ' ')}`);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `猫家记事本-${date}.md`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    toast('当天记录已导出为 Markdown', 'success');
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

  function addNoteTag(tag) {
    const token = `#${tag}`;
    if (!dom.noteContent.value.includes(token)) dom.noteContent.value = `${dom.noteContent.value}${dom.noteContent.value.trim() ? ' ' : ''}${token}`;
    updateNoteCount();
    saveNoteDraft();
    dom.noteContent.focus();
  }

  function careLabel(type) { return petCareTypes[type]?.label || '护理记录'; }

  function daysFrom(date) {
    if (!date) return null;
    return Math.floor((new Date(`${today()}T00:00:00`) - new Date(`${date}T00:00:00`)) / 86400000);
  }

  function careState(type, record) {
    if (!record) return { text: '尚无记录', tone: 'empty' };
    const days = daysFrom(record.care_date);
    const schedule = petCareTypes[type]?.schedule;
    if (schedule && days >= schedule) return { text: `${record.care_date} · 建议安排`, tone: 'due' };
    return { text: record.care_date, tone: 'done' };
  }

  function careDaysRemaining(type, record) {
    const schedule = petCareTypes[type]?.schedule;
    if (!schedule || !record?.care_date) return null;
    return schedule - daysFrom(record.care_date);
  }

  function petAvatar(pet, className) {
    const avatar = String(pet?.avatar || '🐱');
    if (avatar.startsWith('/assets/pets/')) return `<img class="${className}-image" src="${esc(avatar)}" alt="${esc(pet.name)}的头像" width="120" height="120" loading="lazy" decoding="async">`;
    return esc(avatar);
  }

  function renderPets() {
    const highlights = ['vaccine', 'internal_deworming', 'external_deworming', 'bath'];
    const petsWithState = state.pets.map(pet => {
      const attention = highlights.some(type => careState(type, pet.latest?.[type]).tone !== 'done');
      const dueSoon = highlights.some(type => {
        const remaining = careDaysRemaining(type, pet.latest?.[type]);
        return remaining !== null && remaining >= 0 && remaining <= 14;
      });
      return { pet, attention, dueSoon };
    });
    const visiblePets = state.petFilter === 'attention' ? petsWithState.filter(item => item.attention) : state.petFilter === 'due-soon' ? petsWithState.filter(item => item.dueSoon) : petsWithState;
    dom.petAttentionCount.textContent = `${petsWithState.filter(item => item.attention).length} 只猫需要建立或更新护理记录`;
    dom.petGrid.innerHTML = visiblePets.map(({ pet, attention, dueSoon }) => {
      const careRows = highlights.map(type => {
        const status = careState(type, pet.latest?.[type]);
        return `<li><span>${esc(careLabel(type))}</span><b class="pet-care-${status.tone}">${esc(status.text)}</b></li>`;
      }).join('');
      return `<button class="pet-card ${attention ? 'pet-needs-attention' : ''}" type="button" data-pet-detail="${pet.id}" aria-label="查看${esc(pet.name)}的护理档案"><div class="pet-card-head"><span class="pet-avatar" style="background:${esc(pet.color)}">${petAvatar(pet, 'pet-avatar')}</span><div><h3>${esc(pet.name)}</h3><p>${esc(pet.gender || '未标注')} · ${attention ? '有待补充的照护记录' : dueSoon ? '近期有护理安排' : '近期照护已记录'}</p></div><span class="pet-detail-arrow" aria-hidden="true">›</span></div><ul class="pet-care-summary">${careRows}</ul></button>`;
    }).join('') || '<div class="notes-empty"><strong>全部猫咪都已有最新记录</strong><span>切换到“全部”可查看完整清单。</span></div>';
  }

  function renderPetRecords() {
    const visibleRecords = state.petCareFilter === 'all' ? state.petRecords : state.petRecords.filter(record => record.care_type === state.petCareFilter);
    dom.petRecordCount.textContent = `${visibleRecords.length}${state.petCareFilter === 'all' ? '' : ` / ${state.petRecords.length}`} 条永久记录`;
    if (!visibleRecords.length) {
      dom.petRecords.innerHTML = '<div class="notes-empty"><strong>还没有护理记录</strong><span>从疫苗、驱虫或洗澡开始登记吧。</span></div>';
      return;
    }
    dom.petRecords.innerHTML = visibleRecords.map(record => `<article class="pet-record"><span class="pet-record-avatar" style="background:${esc(record.pet_color)}">${petAvatar({ name: record.pet_name, avatar: record.pet_avatar }, 'pet-record-avatar')}</span><div class="pet-record-body"><div><strong>${esc(record.pet_name)}${record.pet_gender ? ` · ${esc(record.pet_gender)}` : ''}</strong><span class="pet-record-type">${esc(careLabel(record.care_type))}</span><time>${esc(record.care_date)}</time></div>${record.note ? `<p>${esc(record.note)}</p>` : ''}${record.clinic || record.medication || record.weight_kg ? `<p class="pet-medical-meta">${record.clinic ? `🏥 ${esc(record.clinic)}` : ''}${record.medication ? ` · 💊 ${esc(record.medication)}` : ''}${record.weight_kg ? ` · ${esc(record.weight_kg)}kg` : ''}</p>` : ''}${record.attachment_path ? `<a class="pet-attachment" href="${esc(record.attachment_path)}" target="_blank" rel="noopener">查看病历图片</a>` : ''}<small>${record.author_name ? `${esc(record.author_avatar || '')} ${esc(record.author_name)} 记录` : '家人记录'}</small></div></article>`).join('');
  }

  function renderPetCareFilter() {
    if (!dom.petCareTypeFilter) return;
    dom.petCareTypeFilter.innerHTML = `<button type="button" data-pet-care-filter="all" aria-pressed="${state.petCareFilter === 'all'}">全部项目</button>${Object.entries(petCareTypes).map(([key, type]) => `<button type="button" data-pet-care-filter="${key}" aria-pressed="${state.petCareFilter === key}">${esc(type.label)}</button>`).join('')}`;
  }

  function openPetDetail(petId) {
    const pet = state.pets.find(item => item.id === petId);
    if (!pet) return;
    state.selectedPetId = petId;
    const allRecords = state.petRecords.filter(record => record.pet_id === petId);
    const recent = allRecords.slice(0, 5);
    const weights = allRecords.filter(record => Number(record.weight_kg) > 0).slice(0, 8).reverse();
    const nextAction = Object.keys(petCareTypes).map(type => ({ type, days: careDaysRemaining(type, pet.latest?.[type]) })).filter(item => item.days !== null).sort((a, b) => a.days - b.days)[0];
    $('#petDetailTitle').textContent = `${pet.name}的护理档案`;
    const weightChart = weights.length > 1 ? `<div class="weight-chart"><p>体重曲线</p><svg viewBox="0 0 240 72" role="img" aria-label="${pet.name}体重曲线"><polyline points="${weights.map((record, index) => `${index * (240 / (weights.length - 1))},${64 - ((Number(record.weight_kg) - Math.min(...weights.map(item => Number(item.weight_kg)))) / Math.max(.1, Math.max(...weights.map(item => Number(item.weight_kg))) - Math.min(...weights.map(item => Number(item.weight_kg))))) * 48}`).join(' ')}" fill="none" stroke="#d16a4f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><small>${weights.map(item => `${item.weight_kg}kg`).join(' · ')}</small></div>` : '<div class="weight-chart empty"><p>体重曲线</p><small>至少登记两次体重后显示趋势。</small></div>';
    const upcoming = state.petTasks.filter(task => task.pet_id === petId).slice(0, 3);
    dom.petDetailContent.innerHTML = `<div class="pet-detail-hero"><span class="pet-detail-avatar" style="background:${esc(pet.color)}">${petAvatar(pet, 'pet-detail-avatar')}</span><div><strong>${esc(pet.name)}</strong><span>${esc(pet.gender || '未标注性别')}</span><p>${nextAction ? `${careLabel(nextAction.type)}${nextAction.days <= 0 ? '建议现在安排' : `还有 ${nextAction.days} 天`}` : '还没有可计算的护理周期'}</p></div></div><div class="pet-detail-metrics"><span>已记录 <b>${allRecords.length}</b> 次</span><span>体重记录 <b>${weights.length}</b> 次</span></div>${weightChart}<div class="pet-upcoming"><b>自动生成的下次护理</b>${upcoming.map(task => `<span>${esc(task.due_date)} · ${esc(careLabel(task.care_type))}</span>`).join('') || '<span>登记带周期的护理后，会自动出现在这里。</span>'}</div><ol class="pet-detail-timeline">${recent.map(record => `<li><time>${esc(record.care_date)}</time><div><b>${esc(careLabel(record.care_type))}</b><p>${esc(record.note || '已完成登记')}</p></div></li>`).join('') || '<li><div><b>尚无护理记录</b><p>先登记一项护理，时间线会一直保留。</p></div></li>'}</ol>`;
    openModal('petDetailModal');
  }

  async function loadPets() {
    state.pets = await api('/api/pets');
    renderPets();
    renderPetCareFilter();
    renderPetsLens();
  }

  async function loadPetRecords() {
    dom.petRecords.setAttribute('aria-busy', 'true');
    try {
      const [records, tasks, templates] = await Promise.all([api('/api/pet-care-records'), api('/api/pet-care-tasks?days=30'), api('/api/pet-care-templates')]);
      state.petRecords = records;
      state.petTasks = tasks;
      state.petTemplates = templates;
      renderPetRecords();
      renderPetsLens();
    } finally {
      dom.petRecords.removeAttribute('aria-busy');
    }
  }

  function petTemplateInterval(petId, careType) {
    return state.petTemplates.find(item => item.pet_id === petId && item.care_type === careType)?.interval_days || petCareTypes[careType]?.schedule || '';
  }

  function renderPetRecordForm() {
    const previousPet = Number(dom.petRecordPet.value) || state.pets[0]?.id;
    const previousType = dom.petRecordType.value || 'vaccine';
    const previousAuthor = Number(dom.petRecordAuthor.value) || state.me?.id || state.users[0]?.id;
    dom.petRecordPet.innerHTML = state.pets.map(pet => `<option value="${pet.id}">${esc(pet.name)}（${esc(pet.gender || '未标注')}）</option>`).join('');
    dom.petRecordType.innerHTML = Object.entries(petCareTypes).map(([value, type]) => `<option value="${value}">${esc(type.label)}</option>`).join('');
    dom.petRecordAuthor.innerHTML = state.users.map(user => `<option value="${user.id}">${esc(user.avatar)} ${esc(user.name)}</option>`).join('') || '<option value="">未署名</option>';
    if (previousPet && state.pets.some(pet => pet.id === previousPet)) dom.petRecordPet.value = String(previousPet);
    dom.petRecordType.value = previousType;
    if (previousAuthor && state.users.some(user => user.id === previousAuthor)) dom.petRecordAuthor.value = String(previousAuthor);
    if (!dom.petRecordDate.value) dom.petRecordDate.value = today();
    dom.petRecordInterval.value = String(petTemplateInterval(Number(dom.petRecordPet.value), dom.petRecordType.value));
    updatePetRecordCount();
  }

  function updatePetRecordCount() {
    dom.petRecordNoteCount.textContent = `${dom.petRecordNote.value.length} / 500`;
  }

  function openPetRecordForm() {
    renderPetRecordForm();
    dom.petRecordStatus.textContent = '';
    dom.petRecordClinic.value = '';
    dom.petRecordMedication.value = '';
    dom.petRecordWeight.value = '';
    dom.petRecordInterval.value = String(petCareTypes[dom.petRecordType.value]?.schedule || '');
    dom.petRecordAttachment.value = '';
    openModal('petRecordModal');
  }

  async function createPetRecord() {
    const petId = Number(dom.petRecordPet.value);
    const careType = dom.petRecordType.value;
    const careDate = dom.petRecordDate.value;
    if (!petId || !careType || !careDate) return toast('请完整选择猫咪、项目和日期', 'error');
    const button = $('#btnSavePetRecord');
    button.disabled = true;
    dom.petRecordStatus.textContent = '正在保存…';
    try {
      const interval = Number(dom.petRecordInterval.value);
      if (interval) await api('/api/pet-care-templates', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pet_id: petId, care_type: careType, interval_days: interval, clinic: dom.petRecordClinic.value, medication: dom.petRecordMedication.value }) });
      let attachmentPath = '';
      if (dom.petRecordAttachment.files?.[0]) {
        const form = new FormData();
        form.append('attachment', dom.petRecordAttachment.files[0]);
        const response = await fetch('/api/pet-care-attachments', { method: 'POST', body: form });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || '病历图片上传失败');
        attachmentPath = result.path;
      }
      await api('/api/pet-care-records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pet_id: petId, care_type: careType, care_date: careDate, note: dom.petRecordNote.value, clinic: dom.petRecordClinic.value, medication: dom.petRecordMedication.value, weight_kg: dom.petRecordWeight.value, attachment_path: attachmentPath, created_by: Number(dom.petRecordAuthor.value) || null }) });
      dom.petRecordNote.value = '';
      updatePetRecordCount();
      await Promise.all([loadPets(), loadPetRecords()]);
      closeModal('petRecordModal');
      toast('护理记录已永久保存', 'success');
    } finally {
      button.disabled = false;
      dom.petRecordStatus.textContent = '';
    }
  }

  const recommendationTypes = {
    place: { label: '地点', icon: '⌖' },
    merchant: { label: '商家', icon: '◇' },
    product: { label: '商品', icon: '□' }
  };

  function hasCoordinates(item) {
    return Number.isFinite(Number(item?.latitude)) && Number.isFinite(Number(item?.longitude));
  }

  function locationText(item) {
    return [item?.region, item?.address].filter(Boolean).join(' · ') || '未填写地点说明';
  }

  function mapEmbedUrl(item) {
    if (!hasCoordinates(item)) return 'https://www.openstreetmap.org/export/embed.html?bbox=120.127%2C30.249%2C120.183%2C30.296&layer=mapnik';
    const latitude = Number(item.latitude);
    const longitude = Number(item.longitude);
    const span = 0.012;
    const bbox = [longitude - span, latitude - span, longitude + span, latitude + span].map(value => value.toFixed(6)).join('%2C');
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude.toFixed(6)}%2C${longitude.toFixed(6)}`;
  }

  function setMapTarget(item, label) {
    state.mapRecommendationId = item?.id || null;
    dom.recommendationMap.src = mapEmbedUrl(item);
    dom.recommendationMapCaption.textContent = hasCoordinates(item) ? `${label || item.title} · ${locationText(item)}` : '还没有可查看的坐标，新增推荐或打卡时可免费获取当前位置。';
  }

  function renderRecommendationForms() {
    const selectedAuthor = Number(dom.recommendationAuthor.value) || state.me?.id || state.users[0]?.id;
    const checkinAuthor = Number(dom.checkinAuthor.value) || state.me?.id || state.users[0]?.id;
    const authors = state.users.map(user => `<option value="${user.id}">${esc(user.avatar)} ${esc(user.name)}</option>`).join('') || '<option value="">未署名</option>';
    dom.recommendationAuthor.innerHTML = authors;
    dom.checkinAuthor.innerHTML = authors;
    if (selectedAuthor && state.users.some(user => user.id === selectedAuthor)) dom.recommendationAuthor.value = String(selectedAuthor);
    if (checkinAuthor && state.users.some(user => user.id === checkinAuthor)) dom.checkinAuthor.value = String(checkinAuthor);
    const selectedRecommendation = Number(dom.checkinRecommendation.value);
    dom.checkinRecommendation.innerHTML = '<option value="">独立打卡</option>' + state.savedRecommendations.map(item => `<option value="${item.id}">${esc(item.title)} · ${esc(recommendationTypes[item.kind]?.label || '推荐')}</option>`).join('');
    if (selectedRecommendation && state.savedRecommendations.some(item => item.id === selectedRecommendation)) dom.checkinRecommendation.value = String(selectedRecommendation);
  }

  function renderRecommendations() {
    const matching = state.savedRecommendations.filter(item => {
      const year = String(item.visited_label || item.created_at || '').slice(0, 4);
      return (state.recommendationFilter === 'all' || item.kind === state.recommendationFilter)
        && (state.recommendationRegion === 'all' || item.region === state.recommendationRegion)
        && (state.recommendationYear === 'all' || year === state.recommendationYear)
        && (state.recommendationVisit === 'all' || item.visit_status === state.recommendationVisit)
        && (!state.recommendationRatingFilter || Number(item.rating) >= state.recommendationRatingFilter)
        && (!state.recommendationTravelOnly || Boolean(item.travel_key));
    });
    const visible = state.recommendationExpanded ? matching : matching.slice(0, 6);
    const located = state.savedRecommendations.filter(hasCoordinates).length;
    const travelCities = state.savedRecommendations.filter(item => item.travel_key).length;
    const checkinCities = new Set(state.checkins.map(item => item.region).filter(Boolean)).size;
    dom.recommendationStats.textContent = `${matching.length} 条匹配 · ${travelCities} 座城市 · ${located} 个已定位 · ${checkinCities} 个地区已打卡`;
    dom.recommendationList.innerHTML = visible.map(item => {
      const type = recommendationTypes[item.kind] || recommendationTypes.place;
      const mapButton = hasCoordinates(item) ? `<button type="button" data-show-recommendation="${item.id}">地图查看</button>` : '';
      const gallery = Array.isArray(item.images) && item.images.length ? `<button class="recommendation-gallery" type="button" data-open-gallery="${item.id}" aria-label="查看${esc(item.title)}的${item.images.length}张城市图片">${item.images.slice(0, 3).map(image => `<img src="${esc(image.image_path)}" alt="${esc(image.caption || `${item.title} 城市印象`)}" width="320" height="200" loading="lazy" decoding="async">`).join('')}<span class="recommendation-gallery-count">${item.images.length} 张</span></button>` : '';
      const date = item.visited_label || String(item.created_at || '').slice(0, 10);
      let tags = [];
      try { tags = Array.isArray(item.tags) ? item.tags : JSON.parse(item.tags || '[]'); } catch (_) { tags = []; }
      const stars = Number(item.rating) ? `<span class="recommendation-stars" aria-label="${Number(item.rating)} 星">${'★'.repeat(Number(item.rating))}${'☆'.repeat(5 - Number(item.rating))}</span>` : '';
      const tagsHtml = tags.length ? `<div class="recommendation-tags">${tags.map(tag => `<span>${esc(tag)}</span>`).join('')}</div>` : '';
      const status = item.visit_status === 'visited' ? '去过' : '想去';
      return `<article class="recommendation-card ${item.travel_key ? 'travel-city-card' : ''}">${gallery}<div class="recommendation-card-top"><span class="recommendation-kind recommendation-kind-${esc(item.kind)}">${type.icon} ${esc(type.label)}</span><time>${esc(date)}</time></div><h3>${esc(item.title)}</h3><p class="recommendation-location">${esc(locationText(item))}</p><div class="recommendation-meta"><span class="recommendation-status is-${esc(item.visit_status || 'want')}">${status}</span>${stars}</div>${tagsHtml}${item.description ? `<p class="recommendation-description">${esc(item.description)}</p>` : ''}${item.revisit_reason ? `<p class="recommendation-revisit">下次：${esc(item.revisit_reason)}</p>` : ''}<div class="recommendation-card-footer"><small>${item.travel_key ? `${esc(item.region)} · 城市足迹` : item.author_name ? `${esc(item.author_avatar || '')} ${esc(item.author_name)} 推荐` : '家人推荐'}${item.checkin_count ? ` · ${item.checkin_count} 次打卡` : ''}</small><div>${mapButton}${item.travel_key ? `<button type="button" data-memory-card="${item.id}">回忆卡</button>` : ''}<button type="button" data-checkin-recommendation="${item.id}">去打卡</button></div></div></article>`;
    }).join('') || '<div class="notes-empty"><strong>还没有推荐</strong><span>把一家人觉得值得的地点、商家和商品先存下来。</span></div>';
    const toggle = $('#btnToggleRecommendations');
    if (toggle) {
      toggle.classList.toggle('hidden', matching.length <= 6);
      toggle.setAttribute('aria-expanded', String(state.recommendationExpanded));
      toggle.textContent = state.recommendationExpanded ? '收起我的推荐' : `展开全部 ${matching.length} 条推荐`;
    }
    const target = state.savedRecommendations.find(item => item.id === state.mapRecommendationId) || state.savedRecommendations.find(hasCoordinates);
    setMapTarget(target, target?.title);
  }

  function superRecommendationSaved(item) {
    return state.savedRecommendations.some(record => record.title === item.title && record.region === item.region);
  }

  function renderSuperRecommendations() {
    if (!dom.superRecommendationList) return;
    const matching = state.superRecommendations.filter(item => state.superRecommendationFilter === 'all' || item.group === state.superRecommendationFilter);
    const visible = state.superRecommendationExpanded ? matching : matching.slice(0, 6);
    const savedCount = state.superRecommendations.filter(superRecommendationSaved).length;
    dom.superRecommendationStats.textContent = `${matching.length} 个精选 · ${savedCount} 个已加入清单`;
    dom.superRecommendationList.setAttribute('aria-busy', 'false');
    dom.superRecommendationList.innerHTML = visible.map(item => {
      const saved = superRecommendationSaved(item);
      return `<article class="super-recommendation-card"><div class="super-recommendation-media">${item.image_path ? `<img src="${esc(item.image_path)}" alt="${esc(item.title)}实景" width="640" height="420" loading="lazy" decoding="async">` : '<span>暂无图片</span>'}<b>${esc(item.category)}</b></div><div class="super-recommendation-copy"><div class="super-recommendation-title"><div><small>${esc(item.region)}</small><h3>${esc(item.title)}</h3></div><span>${esc(item.best_time)}</span></div><p>${esc(item.description)}</p><div class="super-recommendation-tags">${item.tags.map(tag => `<span>${esc(tag)}</span>`).join('')}</div><p class="super-recommendation-reason"><strong>猫家建议</strong>${esc(item.reason)}</p><div class="super-recommendation-actions"><button type="button" data-super-map="${esc(item.key)}">地图</button><button class="super-save" type="button" data-super-save="${esc(item.key)}" ${saved ? 'disabled' : ''}>${saved ? '已在清单' : '加入想去'}</button></div></div></article>`;
    }).join('') || '<div class="notes-empty"><strong>这个分组还没有推荐</strong><span>切换另一个分组看看。</span></div>';
    const toggle = $('#btnToggleSuperRecommendations');
    if (toggle) {
      toggle.classList.toggle('hidden', matching.length <= 6);
      toggle.setAttribute('aria-expanded', String(state.superRecommendationExpanded));
      toggle.textContent = state.superRecommendationExpanded ? '收起精选推荐' : `展开全部 ${matching.length} 个推荐`;
    }
  }

  function showSuperRecommendation(key) {
    const item = state.superRecommendations.find(record => record.key === key);
    if (!item || !hasCoordinates(item)) return toast('这个地点暂时没有坐标', 'info');
    setMapTarget(item, item.title);
    dom.recommendationMap.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  }

  async function saveSuperRecommendation(key, button) {
    const item = state.superRecommendations.find(record => record.key === key);
    if (!item || superRecommendationSaved(item)) return;
    button.disabled = true;
      button.textContent = '正在加入…';
    try {
      await api('/api/family-recommendations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: item.title, kind: 'place', description: item.description, region: item.region, address: item.address, latitude: item.latitude, longitude: item.longitude, rating: 5, tags: item.tags, revisit_reason: item.reason, visit_status: 'want', created_by: state.me?.id || null })
      });
      await loadRecommendationData();
      toast(`${item.title}已加入想去清单`, 'success');
    } catch (error) {
      button.disabled = false;
      button.textContent = '加入想去';
      throw error;
    }
  }

  function renderRecommendationRegions() {
    const regions = [...new Set(state.savedRecommendations.map(item => item.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    dom.recommendationRegionFilter.innerHTML = `<button type="button" data-recommendation-region="all" aria-pressed="${state.recommendationRegion === 'all'}">全部地区</button>${regions.map(region => `<button type="button" data-recommendation-region="${esc(region)}" aria-pressed="${state.recommendationRegion === region}">${esc(region)}</button>`).join('')}`;
    const years = [...new Set(state.savedRecommendations.filter(item => item.travel_key).map(item => String(item.visited_label || item.created_at || '').slice(0, 4)).filter(year => /^\d{4}$/.test(year)))].sort().reverse();
    dom.recommendationYearFilter.innerHTML = years.length ? `<span>旅行年份</span><button type="button" data-recommendation-year="all" aria-pressed="${state.recommendationYear === 'all'}">全部</button>${years.map(year => `<button type="button" data-recommendation-year="${year}" aria-pressed="${state.recommendationYear === year}">${year}</button>`).join('')}` : '';
  }

  function openGallery(recommendationId) {
    const item = state.savedRecommendations.find(record => record.id === recommendationId);
    if (!item?.images?.length) return;
    $('#galleryTitle').textContent = `${item.title}的城市图册`;
    dom.galleryContent.innerHTML = `<p>${esc(item.description || locationText(item))}</p><div class="gallery-grid">${item.images.map(image => `<figure><img src="${esc(image.image_path)}" alt="${esc(image.caption || `${item.title} 城市印象`)}" width="800" height="520" loading="lazy" decoding="async"><figcaption>${esc(image.caption || item.title)}</figcaption></figure>`).join('')}</div>`;
    openModal('galleryModal');
  }

  function openMemoryCard(recommendationId) {
    const item = state.savedRecommendations.find(record => record.id === recommendationId);
    if (!item) return;
    $('#galleryTitle').textContent = `${item.title} · 旅行回忆`;
    const hero = item.images?.[0];
    dom.galleryContent.innerHTML = `<article class="memory-card">${hero ? `<img src="${esc(hero.image_path)}" alt="${esc(hero.caption || item.title)}" width="800" height="520" loading="eager" decoding="async">` : ''}<p class="memory-card-date">${esc(item.visited_label || String(item.created_at || '').slice(0, 10))}</p><h3>${esc(item.title)}</h3><p>${esc(item.description || locationText(item))}</p><small>${esc(item.region || '旅行足迹')} · 猫家的共同记忆</small></article>`;
    openModal('galleryModal');
  }

  function renderCheckins() {
    dom.checkinCount.textContent = `${state.checkins.length} 条永久记录`;
    dom.checkinList.innerHTML = state.checkins.map(item => `<article class="checkin-entry"><div class="checkin-marker">●</div><div><div class="checkin-entry-top"><strong>${esc(item.recommendation_title || '独立打卡')}</strong><time>${esc(item.checkin_date)}</time></div><p>${esc(locationText(item))}</p>${item.note ? `<p class="checkin-note">${esc(item.note)}</p>` : ''}<small>${item.author_name ? `${esc(item.author_avatar || '')} ${esc(item.author_name)} 记录` : '家人记录'}</small></div><button type="button" data-show-checkin="${item.id}">地图</button></article>`).join('') || '<div class="notes-empty"><strong>还没有打卡记录</strong><span>到店、逛街或发现新地方时，记下一次真实体验。</span></div>';
  }

  function renderRecommendationTimeline() {
    const events = state.familyTimeline;
    dom.recommendationTimeline.innerHTML = events.length ? `<div class="recommendation-timeline-track">${events.map(item => `<article class="recommendation-timeline-item"><span class="recommendation-timeline-node">${timelineIcon(item.kind)}</span><time>${esc(String(item.happened_at || '').slice(0, 10))}</time><strong>${esc(item.title)}</strong><p>${esc(item.actor_name || '猫家')} · ${esc(item.detail || '')}</p></article>`).join('')}</div>` : '<div class="notes-empty"><strong>足迹还在慢慢累积</strong><span>一次打卡、一顿饭或一条记录，都会留在这里。</span></div>';
  }

  async function loadRecommendationData() {
    const [recommendations, superRecommendations, checkins, timeline] = await Promise.all([api('/api/family-recommendations'), api('/api/super-recommendations'), api('/api/family-checkins'), api('/api/family-timeline?limit=36')]);
    state.savedRecommendations = recommendations;
    state.superRecommendations = superRecommendations;
    state.checkins = checkins;
    state.familyTimeline = timeline;
    renderRecommendationForms();
    renderRecommendationRegions();
    renderSuperRecommendations();
    renderRecommendations();
    renderCheckins();
    renderRecommendationTimeline();
    renderRecommendationsLens();
  }

  function pollShareUrl(code) {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('vote', code);
    return url.toString();
  }

  function pollState(poll) {
    if (poll.status === 'closed') return { label: '已结束', className: 'closed' };
    if (poll.deadline && poll.deadline < today()) return { label: '已截止', className: 'closed' };
    return { label: '进行中', className: 'open' };
  }

  function pollOptionMarkup(option, totalVotes, selected, interactive = false) {
    const percent = totalVotes ? Math.round((Number(option.vote_count) / totalVotes) * 100) : 0;
    const content = `<span class="family-poll-option-label">${esc(option.label)}</span><span class="family-poll-option-count">${Number(option.vote_count)} 票${totalVotes ? ` · ${percent}%` : ''}</span><span class="family-poll-option-bar" aria-hidden="true"><i style="width:${percent}%"></i></span>`;
    return interactive
      ? `<button type="button" class="family-poll-option ${selected ? 'is-selected' : ''}" data-shared-poll-option="${option.id}" aria-pressed="${selected}">${content}</button>`
      : `<div class="family-poll-option ${selected ? 'is-selected' : ''}">${content}</div>`;
  }

  function renderFamilyPolls() {
    dom.pollsList.innerHTML = state.familyPolls.map(poll => {
      const status = pollState(poll);
      const owner = state.me?.id === poll.created_by;
      const deadline = poll.deadline ? `截止 ${poll.deadline}` : '未设置截止日期';
      return `<article class="family-poll-card"><div class="family-poll-card-top"><span class="family-poll-status ${status.className}">${status.label}</span><small>${esc(deadline)} · ${Number(poll.total_votes)} 人已投</small></div><h2>${esc(poll.title)}</h2>${poll.description ? `<p>${esc(poll.description)}</p>` : ''}<div class="family-poll-options">${poll.options.map(option => pollOptionMarkup(option, Number(poll.total_votes), false)).join('')}</div><footer><small>${poll.author ? `${esc(poll.author.avatar || '')} ${esc(poll.author.name)} 发起` : '家庭成员发起'}</small><div><button type="button" data-open-family-poll="${esc(poll.share_code)}">查看 / 投票</button><button type="button" data-share-family-poll="${esc(poll.share_code)}">分享链接</button>${owner && status.className === 'open' ? `<button type="button" data-close-family-poll="${poll.id}">结束</button>` : ''}</div></footer></article>`;
    }).join('') || '<div class="notes-empty"><strong>还没有家庭投票</strong><span>从下一次晚餐、出行或采购决定开始吧。</span></div>';
    renderPollsLens();
  }

  async function loadFamilyPolls() {
    state.familyPolls = await api('/api/family-polls');
    renderFamilyPolls();
  }

  async function runMenuQuick(action) {
    if (action === 'tomorrow') return changeMealDate(1);
    if (action === 'meal') {
      state.meal = state.meal === 'lunch' ? 'dinner' : 'lunch';
      localStorage.setItem('fm_last_meal', state.meal);
      syncUrlState();
      setStep(3);
      await Promise.all([loadDishes(), refreshDashboard(), loadRecentSelection()]);
      return toast(`已切换到${mealName(state.meal)}`, 'info');
    }
    if (action === 'surprise') return $('#btnShake').click();
    if (action === 'shopping') return openShoppingList();
    if (action === 'vote') { await showVotes(); return openModal('votesModal'); }
  }

  function openNoteQuick(action) {
    if (action === 'agenda') return $('#notesAgendaTitle')?.scrollIntoView({ behavior: motionBehavior(), block: 'center' });
    if (action === 'priority') {
      state.noteViewFilter = 'high';
      $$('.notes-tools [data-note-view-filter]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.noteViewFilter === 'high')));
      return renderSharedNotes();
    }
    openNoteComposer();
    dom.noteDate.value = today();
    if (action === 'task') {
      dom.noteIsTask.checked = true;
      dom.noteDueDate.disabled = false;
      dom.noteDueDate.value = today();
      dom.notePriority.value = 'normal';
      dom.noteContent.value = '待办：';
    }
    if (action === 'shopping') {
      dom.noteIsTask.checked = true;
      dom.noteDueDate.disabled = false;
      dom.noteDueDate.value = today();
      dom.noteContent.value = '#采购 ';
    }
    if (action === 'mention') {
      $$('#mentionPicker input').forEach(input => { input.checked = true; });
      $('#btnMentionAll').textContent = '取消全部提醒';
      dom.noteContent.value = '@大家 ';
      dom.notePriority.value = 'high';
    }
    updateNoteCount();
    saveNoteDraft();
    dom.noteContent.focus();
  }

  function openPetQuick(careType) {
    openPetRecordForm();
    dom.petRecordType.value = careType;
    dom.petRecordInterval.value = String(petTemplateInterval(Number(dom.petRecordPet.value), careType));
    if (careType === 'weight') dom.petRecordNote.value = '例行体重记录';
    updatePetRecordCount();
  }

  function runRecommendationQuick(action) {
    if (action === 'checkin') return openCheckinForm();
    state.recommendationVisit = action === 'want' ? 'want' : action === 'visited' ? 'visited' : 'all';
    state.recommendationRatingFilter = action === 'rating' ? 5 : 0;
    state.recommendationTravelOnly = action === 'travel';
    renderRecommendations();
    $('#recommendationsListTitle')?.scrollIntoView({ behavior: motionBehavior(), block: 'start' });
  }

  async function runLensAction(action) {
    if (action === 'menu-date') { state.date = today(); return changeMealDate(0); }
    if (action === 'menu-progress') return $('#feedSection')?.scrollIntoView({ behavior: motionBehavior(), block: 'start' });
    if (action === 'menu-preferences') return openPreferences();
    if (action === 'menu-fresh') { state.avoidRecent = !state.avoidRecent; $('#btnAvoidRepeat')?.classList.toggle('active', state.avoidRecent); $('#btnAvoidRepeat')?.setAttribute('aria-pressed', String(state.avoidRecent)); renderDishes(); return renderMenuLens(); }
    if (action === 'menu-reset') { state.category = '全部'; state.query = ''; state.onlyFavorites = false; state.avoidRecent = false; dom.search.value = ''; dom.searchClear.classList.add('hidden'); renderCategories(); await loadDishes(); return renderMenuLens(); }
    if (action === 'notes-today') { selectNotesDate(today()); state.noteViewFilter = 'all'; return; }
    if (action === 'notes-open' || action === 'notes-high') { state.noteViewFilter = action === 'notes-open' ? 'open' : 'high'; $$('.notes-tools [data-note-view-filter]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.noteViewFilter === state.noteViewFilter))); return renderSharedNotes(); }
    if (action === 'notes-pinned') { state.notePinnedOnly = !state.notePinnedOnly; $('#btnNotesPinned')?.setAttribute('aria-pressed', String(state.notePinnedOnly)); return renderSharedNotes(); }
    if (action === 'notes-agenda') return $('#notesAgendaTitle')?.scrollIntoView({ behavior: motionBehavior(), block: 'center' });
    if (action === 'pets-all' || action === 'pets-attention' || action === 'pets-due') { state.petFilter = action === 'pets-all' ? 'all' : action === 'pets-attention' ? 'attention' : 'due-soon'; $$('.pet-filter button').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.petFilter === state.petFilter))); renderPets(); return $('#petOverviewTitle')?.scrollIntoView({ behavior: motionBehavior(), block: 'start' }); }
    if (action === 'pets-weight') return openPetQuick('weight');
    if (action === 'pets-history') return $('#petHistoryTitle')?.scrollIntoView({ behavior: motionBehavior(), block: 'start' });
    if (action === 'recommendations-all') { state.recommendationFilter = 'all'; state.recommendationVisit = 'all'; state.recommendationRatingFilter = 0; state.recommendationTravelOnly = false; return renderRecommendations(); }
    if (action === 'recommendations-want') return runRecommendationQuick('want');
    if (action === 'recommendations-visited') return runRecommendationQuick('visited');
    if (action === 'recommendations-rating') return runRecommendationQuick('rating');
    if (action === 'recommendations-travel') return runRecommendationQuick('travel');
    if (action === 'polls-open') { const poll = state.familyPolls.find(item => pollState(item).className === 'open'); return poll ? openSharedPoll(poll.share_code) : openPollComposer('dinner'); }
    if (action === 'polls-votes') return dom.pollsList?.scrollIntoView({ behavior: motionBehavior(), block: 'start' });
    if (action === 'polls-deadline') return dom.pollsList?.scrollIntoView({ behavior: motionBehavior(), block: 'start' });
    if (action === 'polls-template') return $('.poll-templates')?.scrollIntoView({ behavior: motionBehavior(), block: 'center' });
    if (action === 'polls-create') return openPollComposer();
  }

  function addPollOptionInput(value = '') {
    const inputs = dom.pollOptionInputs.querySelectorAll('[data-poll-option]');
    if (inputs.length >= 8) return toast('候选项最多八个', 'info');
    const row = document.createElement('div');
    row.className = 'poll-option-input';
    row.innerHTML = `<input data-poll-option type="text" maxlength="40" value="${esc(value)}" placeholder="填写一个候选项" aria-label="候选项 ${inputs.length + 1}">${inputs.length >= 2 ? '<button type="button" data-remove-poll-option aria-label="删除这个候选项">×</button>' : ''}`;
    dom.pollOptionInputs.append(row);
  }

  const pollTemplates = {
    dinner: { title: '今晚吃什么？', description: '选一个大家都想吃的，晚饭就这么定。', options: ['家常菜', '火锅', '外卖'] },
    outing: { title: '周末去哪里？', description: '选一个轻松的安排，一起出门。', options: ['散步逛街', '看电影', '找家店吃饭'] },
    chores: { title: '这周家务怎么分？', description: '每个人选一项，轻松把家里安排好。', options: ['洗衣收纳', '采购补货', '做饭洗碗'] },
    shopping: { title: '这次优先买什么？', description: '预算有限时，先决定最重要的一样。', options: ['家用消耗品', '猫咪用品', '想买的小物'] },
    date: { title: '哪天最方便？', description: '选一个大家方便的日期。', options: ['周五晚上', '周六白天', '周日白天'] }
  };

  function openPollComposer(template = null) {
    const preset = template ? pollTemplates[template] : null;
    dom.pollTitle.value = '';
    dom.pollDescription.value = '';
    dom.pollDeadline.value = '';
    dom.pollCreateStatus.textContent = '';
    dom.pollAuthor.innerHTML = state.users.map(user => `<option value="${user.id}">${esc(user.avatar)} ${esc(user.name)}</option>`).join('');
    dom.pollAuthor.value = String(state.me?.id || state.users[0]?.id || '');
    dom.pollOptionInputs.replaceChildren();
    (preset?.options || ['选项一', '选项二', '还没想好']).forEach(addPollOptionInput);
    if (preset) {
      dom.pollTitle.value = preset.title;
      dom.pollDescription.value = preset.description;
    }
    openModal('pollComposerModal');
  }

  async function createFamilyPoll() {
    const button = $('#btnCreateFamilyPoll');
    const options = [...dom.pollOptionInputs.querySelectorAll('[data-poll-option]')].map(input => input.value.trim()).filter(Boolean);
    button.disabled = true;
    dom.pollCreateStatus.textContent = '正在创建投票…';
    try {
      const poll = await api('/api/family-polls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: dom.pollTitle.value, description: dom.pollDescription.value, deadline: dom.pollDeadline.value, created_by: Number(dom.pollAuthor.value), options }) });
      closeModal('pollComposerModal');
      await loadFamilyPolls();
      const copied = await copyFamilyPollLink(poll.share_code);
      toast(copied ? '投票已创建，分享链接已复制' : '投票已创建，请点击卡片中的“分享链接”发送给家人', copied ? 'success' : 'info');
    } finally {
      button.disabled = false;
      dom.pollCreateStatus.textContent = '';
    }
  }

  async function copyFamilyPollLink(code, preferShare = false) {
    const url = pollShareUrl(code);
    if (preferShare && navigator.share) {
      try { await navigator.share({ title: '家庭投票', text: '来投一票，一起做决定。', url }); return true; } catch (error) { if (error.name !== 'AbortError') throw error; return false; }
    }
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); return true; }
      const input = document.createElement('textarea');
      input.value = url;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.append(input);
      input.select();
      const copied = document.execCommand('copy');
      input.remove();
      return copied;
    } catch (_) { return false; }
  }

  function renderSharedPoll() {
    const poll = state.sharedPoll;
    if (!poll) return;
    const status = pollState(poll);
    const name = localStorage.getItem('fm_family_poll_voter_name') || state.me?.name || '';
    const canVote = status.className === 'open';
    dom.sharedPollContent.innerHTML = `<div class="shared-poll-heading"><span class="family-poll-status ${status.className}">${status.label}</span><h3>${esc(poll.title)}</h3>${poll.description ? `<p>${esc(poll.description)}</p>` : ''}<small>${poll.deadline ? `截止 ${esc(poll.deadline)}` : '未设置截止日期'} · ${Number(poll.total_votes)} 人已投</small></div>${canVote ? `<label class="poll-voter-name" for="sharedPollVoterName">你的称呼<input id="sharedPollVoterName" type="text" maxlength="20" value="${esc(name)}" placeholder="例如：猫姨姨"></label>` : ''}<div class="shared-poll-options">${poll.options.map(option => pollOptionMarkup(option, Number(poll.total_votes), poll.voter_choice === option.id, canVote)).join('')}</div><p class="shared-poll-hint">${canVote ? (poll.voter_choice ? '已投过票，点其他选项可以改票。' : '选择一个选项即可投票。') : '投票已结束，结果会保留在这里。'}</p>`;
  }

  async function openSharedPoll(code) {
    state.sharedPoll = await api(`/api/family-polls/share/${encodeURIComponent(code)}`);
    renderSharedPoll();
    openModal('sharedPollModal');
  }

  async function voteSharedPoll(optionId) {
    if (!state.sharedPoll) return;
    const voterName = $('#sharedPollVoterName')?.value.trim() || '';
    if (!voterName) return toast('先写下你的称呼，再投票', 'error');
    localStorage.setItem('fm_family_poll_voter_name', voterName);
    const poll = await api(`/api/family-polls/share/${encodeURIComponent(state.sharedPoll.share_code)}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ option_id: optionId, voter_name: voterName }) });
    state.sharedPoll = poll;
    renderSharedPoll();
    if (state.view === 'polls') loadFamilyPolls().catch(() => {});
    toast('你的投票已保存', 'success');
  }

  async function closeFamilyPoll(pollId) {
    if (!state.me) return toast('请选择发起投票的家人', 'error');
    if (!confirm('结束后大家将不能再投票，确定结束吗？')) return;
    await api(`/api/family-polls/${pollId}/close`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: state.me.id }) });
    await loadFamilyPolls();
    toast('投票已结束', 'success');
  }

  function openRecommendationForm() {
    renderRecommendationForms();
    dom.recommendationTitle.value = '';
    dom.recommendationKind.value = 'place';
    dom.recommendationRegion.value = '';
    dom.recommendationAddress.value = '';
    dom.recommendationLatitude.value = '';
    dom.recommendationLongitude.value = '';
    dom.recommendationDescription.value = '';
    dom.recommendationVisitStatus.value = 'want';
    dom.recommendationRating.value = '0';
    dom.recommendationTags.value = '';
    dom.recommendationRevisitReason.value = '';
    dom.recommendationSaveStatus.textContent = '';
    openModal('recommendationModal');
  }

  function fillCheckinFromRecommendation() {
    const item = state.savedRecommendations.find(record => record.id === Number(dom.checkinRecommendation.value));
    if (!item) return;
    dom.checkinRegion.value = item.region || '';
    dom.checkinAddress.value = item.address || '';
    dom.checkinLatitude.value = hasCoordinates(item) ? item.latitude : '';
    dom.checkinLongitude.value = hasCoordinates(item) ? item.longitude : '';
  }

  function openCheckinForm(recommendationId = null) {
    renderRecommendationForms();
    dom.checkinRecommendation.value = recommendationId ? String(recommendationId) : '';
    dom.checkinDate.value = today();
    dom.checkinRegion.value = '';
    dom.checkinAddress.value = '';
    dom.checkinLatitude.value = '';
    dom.checkinLongitude.value = '';
    dom.checkinNote.value = '';
    dom.checkinSaveStatus.textContent = '';
    if (recommendationId) fillCheckinFromRecommendation();
    openModal('checkinModal');
  }

  function useCurrentLocation(prefix) {
    if (!navigator.geolocation) return toast('当前浏览器不支持定位，请手动填写地区和坐标', 'error');
    const fields = prefix === 'checkin'
      ? { latitude: dom.checkinLatitude, longitude: dom.checkinLongitude }
      : { latitude: dom.recommendationLatitude, longitude: dom.recommendationLongitude };
    toast('正在获取当前位置…', 'info');
    navigator.geolocation.getCurrentPosition(position => {
      fields.latitude.value = position.coords.latitude.toFixed(6);
      fields.longitude.value = position.coords.longitude.toFixed(6);
      toast('坐标已填入，地区和地址仍可手动编辑', 'success');
    }, () => toast('定位未成功，请允许位置权限或手动填写坐标', 'error'), { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 });
  }

  async function createRecommendation() {
    const button = $('#btnSaveRecommendation');
    button.disabled = true;
    dom.recommendationSaveStatus.textContent = '正在保存…';
    try {
      const tags = dom.recommendationTags.value.split(/[,，]/).map(item => item.trim()).filter(Boolean).slice(0, 12);
      const record = await api('/api/family-recommendations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: dom.recommendationTitle.value, kind: dom.recommendationKind.value, created_by: Number(dom.recommendationAuthor.value) || null, region: dom.recommendationRegion.value, address: dom.recommendationAddress.value, latitude: dom.recommendationLatitude.value, longitude: dom.recommendationLongitude.value, description: dom.recommendationDescription.value, visit_status: dom.recommendationVisitStatus.value, rating: Number(dom.recommendationRating.value), tags, revisit_reason: dom.recommendationRevisitReason.value }) });
      closeModal('recommendationModal');
      await loadRecommendationData();
      setMapTarget(record, record.title);
      toast('推荐已保存到清单', 'success');
    } finally {
      button.disabled = false;
      dom.recommendationSaveStatus.textContent = '';
    }
  }

  async function createCheckin() {
    const button = $('#btnSaveCheckin');
    button.disabled = true;
    dom.checkinSaveStatus.textContent = '正在保存…';
    try {
      const record = await api('/api/family-checkins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recommendation_id: Number(dom.checkinRecommendation.value) || null, checkin_date: dom.checkinDate.value, created_by: Number(dom.checkinAuthor.value) || null, region: dom.checkinRegion.value, address: dom.checkinAddress.value, latitude: dom.checkinLatitude.value, longitude: dom.checkinLongitude.value, note: dom.checkinNote.value }) });
      closeModal('checkinModal');
      await loadRecommendationData();
      setMapTarget(record, record.recommendation_title || '最新打卡');
      toast('打卡已永久保存', 'success');
    } finally {
      button.disabled = false;
      dom.checkinSaveStatus.textContent = '';
    }
  }

  function setStep(step) {
    state.currentStep = step;
    $$('.step-section').forEach(section => section.classList.toggle('hidden', section.id !== `step${step}`));
    dom.stepBar.classList.toggle('hidden', step === 1);
    $$('.step-dot').forEach(dot => {
      const value = Number(dot.dataset.step);
      dot.classList.toggle('active', value === step);
      dot.classList.toggle('done', value < step);
      dot.toggleAttribute('aria-current', value === step);
    });
    window.scrollTo({ top: 0, behavior: motionBehavior() });
    if (step === 2 || step === 3) $('#mealDate').textContent = `${dateLabel(state.date)} · ${mealName(state.meal)}`;
    if (step === 3) { renderMenuStatusPanel(); renderMenuLens(); }
  }

  function openModal(id) {
    const overlay = $(`#${id}`);
    if (!overlay) return;
    lastFocus = document.activeElement;
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (window.matchMedia('(min-width: 768px)').matches) setTimeout(() => overlay.querySelector('input, select, textarea, button')?.focus(), 0);
  }

  function closeModal(id) {
    const overlay = $(`#${id}`);
    overlay?.classList.add('hidden');
    overlay?.querySelector('form')?.classList.remove('is-dirty');
    if (id === 'sharedPollModal' && new URLSearchParams(window.location.search).has('vote')) history.replaceState({}, '', window.location.pathname);
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
    dom.category.innerHTML = values.map(category => `<button class="chip ${state.category === category ? 'active' : ''}" data-category="${esc(category)}" aria-pressed="${state.category === category}">${esc(category)}${category === '全部' ? '' : ` <small>${counts.get(category) || 0}</small>`}</button>`).join('');
    const defaults = ['家常菜', '火锅', '西餐', '日料', '面食', '汤羹', '甜品饮品'];
    const options = [...new Set([...defaults, ...state.categories.map(item => item.category)])];
    dom.dishCategory.innerHTML = options.map(category => `<option value="${esc(category)}">${esc(category)}</option>`).join('');
  }

  function renderDishes() {
    let dishes = state.onlyFavorites ? state.dishes.filter(dish => state.favorites.has(dish.id)) : [...state.dishes];
    dishes = dishes.filter(dishMatchesPreferences);
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
      renderMenuStatusPanel();
      return;
    }
    dom.summary.innerHTML = ['lunch', 'dinner'].map(meal => groups[meal].length ? `<div class="today-meal-block"><h3 class="today-meal-header">${meal === 'lunch' ? '🍚' : '🍽️'} ${mealName(meal)}</h3>${groups[meal].map(item => `<div class="today-row"><span class="today-user-avatar" style="background:${esc(item.user_color)}">${esc(item.user_avatar)}</span><span class="today-user-name">${esc(item.user_name)}</span><span class="today-dish-name">${esc(item.dish_name)}</span>${item.note ? `<span class="today-selection-note">${esc(item.note)}</span>` : ''}</div>`).join('')}</div>` : '').join('');
    renderMenuStatusPanel();
  }

  function renderMenuStatusPanel() {
    const panel = $('#menuStatusPanel');
    if (!panel) return;
    const selected = state.plan.filter(item => item.meal === state.meal);
    const mine = state.selections[state.meal];
    const waiting = Math.max(0, state.users.length - selected.length);
    panel.innerHTML = `<span class="menu-date-status"><b>${esc(dateLabel(state.date))}</b><small>${esc(mealName(state.meal))}</small><span class="menu-date-actions"><button type="button" data-menu-date-change="-1" aria-label="查看前一天">‹</button><button type="button" data-menu-date-change="0">今天</button><button type="button" data-menu-date-change="1" aria-label="查看后一天">›</button></span></span><span><b>${selected.length}/${state.users.length || 0}</b><small>家人已选</small></span><span><b>${mine ? '已完成' : waiting ? `待 ${waiting} 人` : '待选择'}</b><small>${mine ? esc(mine.dish_name || '本餐已登记') : '本餐进度'}</small></span>`;
  }

  async function changeMealDate(change) {
    const current = new Date(`${state.date}T00:00:00`);
    current.setDate(current.getDate() + change);
    state.date = localDate(current);
    syncUrlState();
    $('#mealDate').textContent = `${dateLabel(state.date)} · ${mealName(state.meal)}`;
    await refreshDashboard();
    toast(`已切换到${dateLabel(state.date)}`, 'info');
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
    if (state.view === 'pets') renderPetRecordForm();
    if (state.view === 'recommendations') renderRecommendationForms();
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
    if (!user) return;
    state.me = { id: user.id, name: user.name, avatar: user.avatar, color: user.color };
    localStorage.setItem('fm_me', JSON.stringify(state.me));
    updateIdentity(); closeModal('userModal'); setStep(2); Promise.all([refreshDashboard(), loadPreferences(), loadHomeData()]).catch(error => toast(error.message, 'error'));
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
    dom.selectionNote.value = '';
    setStep(4); celebrate(); await refreshDashboard();
    dom.selectionNote.value = state.selections[state.meal]?.note || '';
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

  async function saveSelectionNote() {
    if (!state.me) return toast('请先选择家人', 'error');
    const button = $('#btnSaveSelectionNote');
    button.disabled = true;
    try {
      const result = await api('/api/select/note', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: state.me.id, meal: state.meal, date: state.date, note: dom.selectionNote.value }) });
      dom.selectionNote.value = result.note;
      await refreshDashboard();
      toast(result.note ? '用餐备注已保存' : '用餐备注已清除', 'success');
    } finally { button.disabled = false; }
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
    dom.recipeTitle.textContent = '正在准备食谱…';
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
    document.querySelector(`[data-recipe-step="${next}"]`)?.closest('.recipe-step')?.scrollIntoView({ behavior: motionBehavior(), block: 'center' });
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
    dom.stats.innerHTML = '<p class="stats-loading">正在整理餐桌数据…</p>';
    openModal('statsModal');
    const data = await api('/api/stats');
    dom.stats.innerHTML = `<div class="stats-overview"><div><strong>${data.totals.dishes}</strong><span>道菜</span></div><div><strong>${data.totals.selections}</strong><span>次选择</span></div><div><strong>${data.recentCount}</strong><span>近七天</span></div></div><h4>大家常点</h4>${data.top.length ? `<ol class="stats-top">${data.top.map(item => `<li><span>${esc(item.name)}</span><b>${item.times} 次</b></li>`).join('')}</ol>` : '<p class="feed-empty">还没有足够记录，先点一顿吧。</p>'}`;
  }

  async function showVotes() {
    const votes = await api(`/api/votes${state.me ? `?user_id=${state.me.id}` : ''}`);
    dom.voteList.innerHTML = votes.map(vote => {
      const canClose = vote.status === 'open' && state.me?.id === vote.created_by;
      return `<section class="vote-card"><h4>${esc(vote.title)}</h4><p>${esc(vote.vote_date)} · ${mealName(vote.meal)}</p>${vote.options.map(option => `<button class="vote-option ${vote.userVote === option.id ? 'selected' : ''}" data-vote-id="${vote.id}" data-option-id="${option.id}">${esc(option.dish_name)} <span>${option.vote_count} 票</span></button>`).join('')}<button class="btn-secondary vote-close" data-close-vote="${vote.id}" ${canClose ? '' : 'disabled'}>${vote.status === 'closed' ? '已结束' : canClose ? '结束投票' : '仅发起人可结束'}</button></section>`;
    }).join('') || '<p class="feed-empty">暂无投票</p>';
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
    dom.notifyTargets.innerHTML = targets.map(target => `<div class="admin-row"><span>${esc(target.name)} ${esc(target.email || target.phone || '已配置')}</span><button class="admin-del" data-delete-target="${target.id}">删除</button></div>`).join('') || '<p class="feed-empty">暂无通知人</p>';
    const setSecretField = (selector, placeholder) => { const field = $(selector); field.value = ''; field.placeholder = placeholder; };
    setSecretField('#cfgEmailHost', config.email.host_masked ? `已配置 ${config.email.host_masked}，留空不修改` : 'SMTP 服务器');
    setSecretField('#cfgEmailUser', config.email.user_masked ? `已配置 ${config.email.user_masked}，留空不修改` : '邮箱账号');
    setSecretField('#cfgEmailPass', config.email.has_password ? '已配置授权码，留空不修改' : '密码/授权码');
    setSecretField('#cfgSmsKey', config.sms.has_access_key_id ? 'AccessKey ID 已配置，留空不修改' : 'AccessKey ID');
    setSecretField('#cfgSmsSecret', config.sms.has_access_key_secret ? 'AccessKey Secret 已配置，留空不修改' : 'AccessKey Secret');
    setSecretField('#cfgSmsSign', config.sms.has_sign_name ? '短信签名已配置，留空不修改' : '短信签名');
    setSecretField('#cfgSmsTpl', config.sms.has_template_code ? '点菜模板已配置，留空不修改' : '点菜模板 CODE');
    setSecretField('#cfgSmsReminderTpl', config.sms.has_reminder_template_code ? '提醒模板已配置，留空不修改' : '提醒模板 CODE');
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
      if (data.type === 'shared_note' || data.type === 'shared_note_deleted' || data.type === 'shared_note_pinned' || data.type === 'shared_note_task') {
        const noteDate = data.note?.note_date || data.note_date;
        if (state.view === 'notes' && noteDate === dom.noteDate.value) loadSharedNotes().catch(() => {});
        if (data.type === 'shared_note' && data.note.mention_user_ids?.includes(state.me?.id)) toast(`${data.note.author_name} 在共享记事本里 @ 了你`, 'info');
      }
      if (data.type === 'pet_care_record') {
        if (state.view === 'pets') Promise.all([loadPets(), loadPetRecords()]).catch(() => {});
        toast(`${data.record.pet_name} 新增了一条${careLabel(data.record.care_type)}记录`, 'info');
      }
      if (data.type === 'recommendation' || data.type === 'recommendation_checkin') {
        if (state.view === 'recommendations') loadRecommendationData().catch(() => {});
      }
      if (['family_poll_created', 'family_poll_updated', 'family_poll_closed'].includes(data.type)) {
        if (state.view === 'polls') loadFamilyPolls().catch(() => {});
        if (!$('#sharedPollModal').classList.contains('hidden') && state.sharedPoll?.share_code === data.share_code) openSharedPoll(data.share_code).catch(() => {});
      }
      if (data.type === 'selection_note' && state.view === 'menu' && data.date === state.date) refreshDashboard().catch(() => {});
      if (state.view === 'home' && ['shared_note', 'shared_note_deleted', 'shared_note_pinned', 'shared_note_task', 'pet_care_record', 'recommendation', 'recommendation_checkin', 'notification'].includes(data.type)) loadHomeData().catch(() => {});
    };
    source.onerror = () => { source.close(); setConnection('offline'); clearTimeout(state.retryTimer); state.retryTimer = setTimeout(connectEvents, Math.min(1000 * 2 ** Math.min(++state.retries, 5), 30000)); };
  }

  document.addEventListener('click', async event => {
    const button = event.target.closest('button, .who-card');
    if (!button) return;
    try {
      if (button.id === 'btnOpenMenu') return setView('menu');
      if (button.id === 'btnOpenNotes') return setView('notes');
      if (button.id === 'btnOpenPets') return setView('pets');
      if (button.id === 'btnOpenRecommendations') return setView('recommendations');
      if (button.id === 'btnOpenPolls') return setView('polls');
      if (button.dataset.menuQuick) return runMenuQuick(button.dataset.menuQuick);
      if (button.dataset.noteQuick) return openNoteQuick(button.dataset.noteQuick);
      if (button.dataset.petQuick) return openPetQuick(button.dataset.petQuick);
      if (button.dataset.recommendationQuick) return runRecommendationQuick(button.dataset.recommendationQuick);
      if (button.dataset.superFilter) { state.superRecommendationFilter = button.dataset.superFilter; state.superRecommendationExpanded = false; $$('.super-recommendation-filter button').forEach(item => item.setAttribute('aria-pressed', String(item === button))); return renderSuperRecommendations(); }
      if (button.id === 'btnToggleRecommendations') { state.recommendationExpanded = !state.recommendationExpanded; return renderRecommendations(); }
      if (button.id === 'btnToggleSuperRecommendations') { state.superRecommendationExpanded = !state.superRecommendationExpanded; return renderSuperRecommendations(); }
      if (button.dataset.superMap) return showSuperRecommendation(button.dataset.superMap);
      if (button.dataset.superSave) return saveSuperRecommendation(button.dataset.superSave, button);
      if (button.dataset.pollTemplate) return openPollComposer(button.dataset.pollTemplate);
      if (button.dataset.lensAction) return runLensAction(button.dataset.lensAction);
      if (button.id === 'btnRefreshHome') return loadHomeData();
      if (button.id === 'btnOpenPreferences') return openPreferences();
      if (button.id === 'btnSavePreferences') return savePreferences();
      if (button.id === 'btnOpenShopping') return openShoppingList();
      if (button.id === 'btnCopyShoppingList') return copyDailyShoppingList();
      if (button.id === 'btnHome' || button.id === 'btnNotesBack' || button.id === 'btnRecommendationsBack' || button.id === 'btnPollsBack') return setView('home');
      if (button.id === 'btnPetsBack') return setView('home');
      if (button.id === 'btnOpenNote') return openNoteComposer();
      if (button.id === 'btnExportNotes') return exportCurrentNotes();
      if (button.id === 'btnNotesPinned') { state.notePinnedOnly = !state.notePinnedOnly; button.setAttribute('aria-pressed', String(state.notePinnedOnly)); button.textContent = state.notePinnedOnly ? '查看全部' : '只看固定'; return renderSharedNotes(); }
      if (button.id === 'btnNotesMonthPrev') return shiftNotesMonth(-1);
      if (button.id === 'btnNotesMonthToday') { state.noteCalendarMonth = today().slice(0, 7); syncUrlState('push'); return loadNotesOverview(); }
      if (button.id === 'btnNotesMonthNext') return shiftNotesMonth(1);
      if (button.dataset.noteDate) return selectNotesDate(button.dataset.noteDate);
      if (button.dataset.noteViewFilter) { state.noteViewFilter = button.dataset.noteViewFilter; $$('.notes-tools [data-note-view-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button))); return renderSharedNotes(); }
      if (button.id === 'btnOpenPetRecord') return openPetRecordForm();
      if (button.id === 'btnPetDetailRecord') { const petId = state.selectedPetId; closeModal('petDetailModal'); openPetRecordForm(); if (petId) dom.petRecordPet.value = String(petId); return; }
      if (button.id === 'btnOpenRecommendation') return openRecommendationForm();
      if (button.id === 'btnOpenPollComposer') return openPollComposer();
      if (button.id === 'btnAddPollOption') return addPollOptionInput();
      if (button.dataset.removePollOption !== undefined) { button.parentElement?.remove(); return; }
      if (button.dataset.openFamilyPoll) return openSharedPoll(button.dataset.openFamilyPoll);
      if (button.dataset.shareFamilyPoll) { const shared = await copyFamilyPollLink(button.dataset.shareFamilyPoll, true); return toast(shared ? '投票链接已准备好' : '未能自动分享，可从地址栏复制链接', shared ? 'success' : 'info'); }
      if (button.dataset.sharedPollOption) return voteSharedPoll(Number(button.dataset.sharedPollOption));
      if (button.dataset.closeFamilyPoll) return closeFamilyPoll(Number(button.dataset.closeFamilyPoll));
      if (button.id === 'btnOpenCheckin') return openCheckinForm();
      if (button.id === 'btnLocateRecommendation') return useCurrentLocation('recommendation');
      if (button.id === 'btnLocateCheckin') return useCurrentLocation('checkin');
      if (button.id === 'btnUseCurrentLocation') { openCheckinForm(); return useCurrentLocation('checkin'); }
      if (button.dataset.recommendationFilter) { state.recommendationFilter = button.dataset.recommendationFilter; state.recommendationExpanded = false; $$('.recommendation-filter button').forEach(item => item.setAttribute('aria-pressed', String(item === button))); syncUrlState('push'); return renderRecommendations(); }
      if (button.dataset.recommendationRegion) { state.recommendationRegion = button.dataset.recommendationRegion; state.recommendationExpanded = false; $$('#recommendationRegionFilter button').forEach(item => item.setAttribute('aria-pressed', String(item === button))); syncUrlState('push'); return renderRecommendations(); }
      if (button.dataset.recommendationYear) { state.recommendationYear = button.dataset.recommendationYear; state.recommendationExpanded = false; $$('#recommendationYearFilter button').forEach(item => item.setAttribute('aria-pressed', String(item === button))); syncUrlState('push'); return renderRecommendations(); }
      if (button.dataset.openGallery) return openGallery(Number(button.dataset.openGallery));
      if (button.dataset.memoryCard) return openMemoryCard(Number(button.dataset.memoryCard));
      if (button.dataset.showRecommendation) { const item = state.savedRecommendations.find(record => record.id === Number(button.dataset.showRecommendation)); if (!hasCoordinates(item)) return toast('这条推荐还没有坐标，可编辑后添加', 'info'); setMapTarget(item, item.title); return dom.recommendationMap.scrollIntoView({ behavior: motionBehavior(), block: 'center' }); }
      if (button.dataset.checkinRecommendation) return openCheckinForm(Number(button.dataset.checkinRecommendation));
      if (button.dataset.showCheckin) { const item = state.checkins.find(record => record.id === Number(button.dataset.showCheckin)); if (!hasCoordinates(item)) return toast('这次打卡没有坐标', 'info'); setMapTarget(item, item.recommendation_title || '打卡地点'); return dom.recommendationMap.scrollIntoView({ behavior: motionBehavior(), block: 'center' }); }
      if (button.dataset.selectionNote) { dom.selectionNote.value = button.dataset.selectionNote; return dom.selectionNote.focus(); }
      if (button.dataset.noteTag) return addNoteTag(button.dataset.noteTag);
      if (button.dataset.petFilter) { state.petFilter = button.dataset.petFilter; $$('.pet-filter button').forEach(item => { const active = item === button; item.setAttribute('aria-pressed', String(active)); }); return renderPets(); }
      if (button.dataset.petCareFilter) { state.petCareFilter = button.dataset.petCareFilter; renderPetCareFilter(); return renderPetRecords(); }
      if (button.dataset.petDetail) return openPetDetail(Number(button.dataset.petDetail));
      if (button.id === 'btnNotesPrev') return changeNotesDate(-1);
      if (button.id === 'btnNotesToday') { dom.noteDate.value = today(); return loadSharedNotes(); }
      if (button.id === 'btnNotesNext') return changeNotesDate(1);
      if (button.id === 'btnMentionAll') return toggleMentionAll();
      if (button.dataset.copyNote) return copySharedNote(Number(button.dataset.copyNote));
      if (button.dataset.pinNote) return togglePinnedNote(Number(button.dataset.pinNote));
      if (button.dataset.toggleTask) return toggleNoteTask(Number(button.dataset.toggleTask));
      if (button.dataset.deleteNote) return deleteSharedNote(Number(button.dataset.deleteNote));
      if (button.dataset.homeJump) {
        const target = { '未选餐': 'menu', '待办与提醒': 'notes', '临近护理': 'pets', '待打卡地点': 'recommendations' }[button.dataset.homeJump];
        if (target) return setView(target);
      }
      if (button.dataset.userId) return chooseUser(state.users.find(user => user.id === Number(button.dataset.userId)));
      if (button.dataset.switchId) return chooseUser(state.users.find(user => user.id === Number(button.dataset.switchId)));
      if ('addUser' in button.dataset) { renderAvatarPicker(); return openModal('addUserModal'); }
      if (button.dataset.avatar) { state.selectedAvatar = button.dataset.avatar; return renderAvatarPicker(); }
      if (button.dataset.category) { state.category = button.dataset.category; syncUrlState(); await loadDishes(); return renderCategories(); }
      if (button.dataset.dishId) return chooseDish(Number(button.dataset.dishId));
      if (button.dataset.recipeId) return openRecipe(Number(button.dataset.recipeId));
      if (button.dataset.dishMode) { state.dishMode = button.dataset.dishMode; $$('#dishModes .dish-mode').forEach(item => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); }); return renderDishes(); }
      if (button.dataset.favoriteId) return toggleFavorite(Number(button.dataset.favoriteId));
      if (button.dataset.deleteDish) { if (confirm('删除这道菜及其相关选择？')) { await api(`/api/dishes/${button.dataset.deleteDish}`, { method: 'DELETE' }); await loadDishes(); } return; }
      if (button.dataset.deleteTarget) { await api(`/api/notify/targets/${button.dataset.deleteTarget}`, { method: 'DELETE' }); return showNotify(); }
      if (button.dataset.voteId) { if (!state.me) return toast('请先选择家人', 'error'); await api(`/api/votes/${button.dataset.voteId}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: state.me.id, option_id: Number(button.dataset.optionId) }) }); return showVotes(); }
      if (button.dataset.closeVote) { if (!state.me) return toast('请先选择投票发起人', 'error'); await api(`/api/votes/${button.dataset.closeVote}/close`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ created_by: state.me.id }) }); return showVotes(); }
      if (button.dataset.planDate) { state.date = button.dataset.planDate; state.meal = button.dataset.planMeal; closeModal('weeklyModal'); setStep(3); await Promise.all([loadDishes(), loadPlan(), loadSelections(), loadFavorites()]); return; }
      if (button.dataset.menuDateChange != null) return changeMealDate(Number(button.dataset.menuDateChange));
      if (button.id === 'btnMealDatePrev') return changeMealDate(-1);
      if (button.id === 'btnMealDateToday') { state.date = today(); return changeMealDate(0); }
      if (button.id === 'btnMealDateNext') return changeMealDate(1);
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
      if (button.id === 'menuPreferences') { closeModal('moreMenu'); return openPreferences(); }
      if (button.id === 'menuShopping') { closeModal('moreMenu'); return openShoppingList(); }
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
      if (button.id === 'btnSaveSelectionNote') return saveSelectionNote();
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
  [
    ['#pollComposerForm', createFamilyPoll],
    ['#noteForm', createSharedNote],
    ['#petRecordForm', createPetRecord],
    ['#recommendationForm', createRecommendation],
    ['#checkinForm', createCheckin]
  ].forEach(([selector, submit]) => $(selector)?.addEventListener('submit', event => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    submit().catch(error => toast(error.message, 'error'));
  }));
  $$('#pollComposerForm, #noteForm, #petRecordForm, #recommendationForm, #checkinForm').forEach(form => {
    form.addEventListener('input', () => form.classList.add('is-dirty'));
  });
  window.addEventListener('beforeunload', event => {
    if (!document.querySelector('form.is-dirty')) return;
    event.preventDefault();
    event.returnValue = '';
  });
  dom.noteDate.addEventListener('change', () => { state.noteCalendarMonth = (dom.noteDate.value || today()).slice(0, 7); syncUrlState('push'); loadSharedNotes().catch(error => toast(error.message, 'error')); loadNotesOverview().catch(() => {}); saveNoteDraft(); });
  dom.noteAuthor.addEventListener('change', () => { renderNoteForm(); saveNoteDraft(); });
  dom.noteContent.addEventListener('input', () => { updateNoteCount(); saveNoteDraft(); });
  dom.notePriority.addEventListener('change', saveNoteDraft);
  dom.noteIsTask.addEventListener('change', () => { dom.noteDueDate.disabled = !dom.noteIsTask.checked; if (!dom.noteIsTask.checked) dom.noteDueDate.value = ''; saveNoteDraft(); });
  dom.mentionPicker.addEventListener('change', saveNoteDraft);
  dom.petRecordNote.addEventListener('input', updatePetRecordCount);
  const refreshPetInterval = () => { dom.petRecordInterval.value = String(petTemplateInterval(Number(dom.petRecordPet.value), dom.petRecordType.value)); };
  dom.petRecordType.addEventListener('change', refreshPetInterval);
  dom.petRecordPet.addEventListener('change', refreshPetInterval);
  dom.noteFilter.addEventListener('input', () => { state.noteFilter = dom.noteFilter.value; renderSharedNotes(); });
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
  $$('.meal-card').forEach(card => card.addEventListener('click', () => { state.meal = card.dataset.meal; localStorage.setItem('fm_last_meal', state.meal); syncUrlState(); setStep(3); Promise.all([loadDishes(), loadRecentSelection()]).catch(error => toast(error.message, 'error')); }));
  dom.checkinRecommendation.addEventListener('change', fillCheckinFromRecommendation);
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

  window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    const view = validViews.has(params.get('view')) ? params.get('view') : 'home';
    if (view === 'menu') {
      state.date = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '') ? params.get('date') : today();
      state.meal = ['lunch', 'dinner'].includes(params.get('meal')) ? params.get('meal') : state.meal;
      state.category = params.get('category') || '全部';
    }
    if (view === 'notes') state.noteCalendarMonth = params.get('month') || today().slice(0, 7);
    if (view === 'recommendations') {
      state.recommendationFilter = params.get('kind') || 'all';
      state.recommendationRegion = params.get('region') || 'all';
      state.recommendationYear = params.get('year') || 'all';
    }
    setView(view, 'none');
    if (view === 'menu') Promise.all([loadDishes(), refreshDashboard()]).catch(error => toast(error.message, 'error'));
  });

  async function initialize() {
    try {
      const initialView = state.view;
      dom.whoError.classList.add('hidden');
      await Promise.all([loadUsers(), loadCategories(), loadFeed(), loadRecommendations()]);
      if (state.me) { updateIdentity(); setStep(2); await Promise.all([refreshDashboard(), loadPreferences()]); } else { setStep(1); renderPreferenceBar(); }
      connectEvents();
      setView(initialView, 'replace');
      const sharedCode = new URLSearchParams(window.location.search).get('vote');
      if (sharedCode) openSharedPoll(sharedCode).catch(error => toast(error.message, 'error'));
    } catch (error) { dom.whoError.classList.remove('hidden'); toast(error.message, 'error'); }
  }

  initialize();
})();
