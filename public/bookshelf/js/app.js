/* ============================================================
 * 书架 · 交互逻辑模块（app.js）
 * 职责：渲染水平轮播书籍卡片、3D 翻转交互、
 *       自动缓慢滚动与触屏滑动翻页、添加 / 删除 / 修改状态、轻提示等。
 * ============================================================ */

(function () {
  'use strict';

  /* ---------------- 全局状态 ---------------- */
  var state = {
    books: [],         // 全部书籍（来自 localStorage）
    targetId: null,    // 待删除书籍 ID（删除确认弹窗）
    isTouch: false,    // 是否为触屏设备（hover: none），决定轻点翻书 vs 悬停翻书
    justTapped: false  // 标记刚发生“轻点”（区分滑动，避免滑动后误翻书）
  };

  /* ---------------- 阅读状态配置（标签集中维护） ---------------- */
  var STATUS = {
    reading: { label: '在读' },
    read: { label: '已读' },
    wishlist: { label: '想读' }
  };

  /* ---------------- 轮播参数 ---------------- */
  var CAROUSEL = {
    gap: 28,          // 卡片间距 px（与 CSS 保持一致）
    speed: 34,        // 自动滚动速度 px/s（缓慢向左）
    x: 0,             // 轨道当前偏移（负值表示向左滚动）
    step: 0,          // 一步 = 卡片宽度 + 间距
    copyWidth: 0,     // 半份内容宽度 = 书数 * step（无缝循环的周期）
    total: 0,         // 当前可见书数
    rafId: null,      // 自动滚动动画帧 ID
    lastTime: 0,      // 上一次动画帧时间戳
    idlePause: false, // 是否暂停自动滚动（悬停 / 触摸 / 弹窗 / 吸附动画时）
    pauseSet: {},     // 暂停原因集合（key: hover / touch / modal / snap）
    snapTimer: null   // 吸附动画结束后的恢复定时器
  };

  /* ---------------- 封面占位渐变色板（柔和低饱和） ---------------- */
  var COVER_PALETTE = [
    'linear-gradient(150deg, #A9C0A2, #7E9C86)', // 鼠尾草绿
    'linear-gradient(150deg, #D9B99B, #BF8A5A)', // 陶土暖
    'linear-gradient(150deg, #A9B6CC, #7B8FB0)', // 雾霾蓝
    'linear-gradient(150deg, #C8AAC4, #A57C9E)', // 淡紫
    'linear-gradient(150deg, #DFC1C0, #C08D8B)', // 豆沙粉
    'linear-gradient(150deg, #B7C6AE, #8AA487)'  // 灰绿
  ];

  /* ---------------- 小型 DOM 工具 ---------------- */

  /** 简化选择器 */
  function $(selector) { return document.querySelector(selector); }

  /** 创建元素：tag 标签名、className 类名、text 文本内容（可选） */
  function createEl(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  /** 根据书名哈希生成稳定的占位封面渐变色（同名书永远同色） */
  function coverGradient(title) {
    var hash = 0;
    var text = String(title || '');
    for (var i = 0; i < text.length; i++) {
      hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    }
    return COVER_PALETTE[hash % COVER_PALETTE.length];
  }

  /** 取一本书展示在背面的文案：直接展示用户指定的「书中金句」 */
  function getBackText(book) {
    return book.quote || '暂无金句。';
  }

  /* ============================================================
   * 书籍数据（无搜索与筛选，轮播展示全部）
   * ============================================================ */

  /** 当前要展示的书籍：直接返回全部 */
  function getFilteredBooks() {
    return state.books;
  }

  /* ============================================================
   * 轮播核心：渲染 / 位移 / 无缝循环
   * ============================================================ */

  /**
   * 渲染轮播。列表内容渲染两遍（两段完全相同的卡片），
   * 滚动到末尾时瞬间跳回起点，形成视觉上无缝的循环。
   * preserveIndex：重建后恢复到该页（可选）。
   */
  function renderCarousel(preserveIndex) {
    var list = getFilteredBooks();
    var carouselEl = $('#carousel');
    var trackEl = $('#carouselTrack');
    var dotsEl = $('#carouselDots');

    if (list.length === 0) {
      carouselEl.hidden = true;
      dotsEl.hidden = true;
      showEmptyState();
      CAROUSEL.total = 0;
      return;
    }
    $('#emptyState').hidden = true;
    carouselEl.hidden = false;

    /* 渲染两段内容实现无缝循环 */
    trackEl.innerHTML = '';
    list.forEach(function (book) { trackEl.appendChild(createBookCard(book)); });
    list.forEach(function (book) { trackEl.appendChild(createBookCard(book)); });

    CAROUSEL.total = list.length;
    computeStep();

    /* 起始位置：默认从第一本开始，或恢复到传入的页 */
    var startIndex = preserveIndex != null
      ? Math.max(0, Math.min(preserveIndex, CAROUSEL.total - 1))
      : 0;
    CAROUSEL.x = -startIndex * CAROUSEL.step;
    applyTransform(false);

    renderDots(CAROUSEL.total);
  }

  /** 计算步长与半份内容宽度（以实际渲染出的卡片宽度为准） */
  function computeStep() {
    var first = document.querySelector('#carouselTrack .book-card');
    if (!first) return;
    CAROUSEL.step = first.getBoundingClientRect().width + CAROUSEL.gap;
    CAROUSEL.copyWidth = CAROUSEL.total * CAROUSEL.step;
  }

  /** 把偏移 x 收回到有效区间 (-copyWidth, 0]，实现无缝循环 */
  function clampX(x) {
    var cw = CAROUSEL.copyWidth;
    if (cw <= 0) return x;
    while (x < -cw) x += cw;
    while (x > 0) x -= cw;
    return x;
  }

  /** 应用轨道位移；smooth 为 true 时带平滑过渡（用于吸附翻页） */
  function applyTransform(smooth) {
    var trackEl = $('#carouselTrack');
    trackEl.style.transition = smooth
      ? 'transform 0.35s cubic-bezier(0.25, 0.8, 0.25, 1)'
      : 'none';
    trackEl.style.transform = 'translateX(' + CAROUSEL.x + 'px)';

    /* 平滑动画期间暂停自动滚动，避免两者抢位置 */
    if (smooth) {
      setPause('snap', true);
      clearTimeout(CAROUSEL.snapTimer);
      CAROUSEL.snapTimer = setTimeout(function () {
        setPause('snap', false);
      }, 400);
    }
  }

  /** 吸附到最近的卡片页（滑动结束 / 点击指示点后调用） */
  function snapToNearest() {
    var step = CAROUSEL.step;
    if (step <= 0) return;
    var index = Math.round(-CAROUSEL.x / step);
    var target = -Math.max(0, Math.min(index, CAROUSEL.total - 1)) * step;
    CAROUSEL.x = clampX(target);
    applyTransform(true);
    updateDots();
  }

  /** 直接跳到指定页（指示点点击） */
  function jumpTo(index) {
    if (CAROUSEL.step <= 0) return;
    CAROUSEL.x = clampX(-index * CAROUSEL.step);
    applyTransform(true);
    updateDots();
  }

  /** 当前可见页索引（用于重建轮播后尽量保留位置） */
  function currentIndex() {
    if (CAROUSEL.total === 0 || CAROUSEL.step === 0) return 0;
    var index = Math.round(-CAROUSEL.x / CAROUSEL.step);
    return Math.max(0, Math.min(index, CAROUSEL.total - 1));
  }

  /* ============================================================
   * 自动滚动（requestAnimationFrame 持续缓慢向左）
   * ============================================================ */

  function autoplayTick(now) {
    CAROUSEL.rafId = requestAnimationFrame(autoplayTick);
    /* 暂停时只更新时间戳，不移动 */
    if (CAROUSEL.idlePause) { CAROUSEL.lastTime = now; return; }
    /* 限制单帧位移，避免切后台回来瞬间跳一大段 */
    var dt = Math.min((now - (CAROUSEL.lastTime || now)) / 1000, 0.05);
    CAROUSEL.lastTime = now;
    CAROUSEL.x = clampX(CAROUSEL.x - CAROUSEL.speed * dt);
    applyTransform(false);
    updateDots();
  }

  /** 启动自动滚动（尊重系统“减少动态效果”偏好） */
  function startAutoplay() {
    if (CAROUSEL.rafId) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    CAROUSEL.lastTime = performance.now();
    CAROUSEL.rafId = requestAnimationFrame(autoplayTick);
  }

  /** 暂停开关：按原因记录，全部解除后才恢复自动滚动 */
  function setPause(key, on) {
    if (on) {
      CAROUSEL.pauseSet[key] = true;
    } else {
      delete CAROUSEL.pauseSet[key];
    }
    CAROUSEL.idlePause = Object.keys(CAROUSEL.pauseSet).length > 0;
  }

  /* ============================================================
   * 页码指示点
   * ============================================================ */

  function renderDots(count) {
    var dotsEl = $('#carouselDots');
    dotsEl.innerHTML = '';
    for (var i = 0; i < count; i++) {
      (function (index) {
        var dot = createEl('button', 'dot');
        dot.type = 'button';
        dot.dataset.index = index;
        dot.setAttribute('aria-label', '跳到第 ' + (index + 1) + ' 本');
        dot.addEventListener('click', function () { jumpTo(index); });
        dotsEl.appendChild(dot);
      })(i);
    }
    dotsEl.hidden = count <= 1;
    updateDots();
  }

  function updateDots() {
    if (CAROUSEL.total === 0 || CAROUSEL.step === 0) return;
    /* 取模保证在无缝循环中也始终指向正确的一页 */
    var index = ((Math.round(-CAROUSEL.x / CAROUSEL.step) % CAROUSEL.total) + CAROUSEL.total) % CAROUSEL.total;
    document.querySelectorAll('#carouselDots .dot').forEach(function (dot, i) {
      dot.classList.toggle('is-active', i === index);
    });
  }

  /* ============================================================
   * 书籍卡片构建
   * ============================================================ */

  /**
   * 创建一张 3D 翻书卡片：
   * 正面 = 纯封面图片（保留渐变占位、书脊阴影与边框装饰，不加任何文字）；
   * 背面 = 书中金句 + 状态切换 + 删除按钮。
   * 卡片自身不绑事件，统一由轮播轨道事件委托处理（克隆副本也能响应）。
   */
  function createBookCard(book) {
    var card = createEl('article', 'book-card');
    card.dataset.id = book.id;

    var inner = createEl('div', 'book-inner');

    /* ---------- 正面：纯封面 ---------- */
    var front = createEl('div', 'book-front');

    var bg = createEl('div', 'front-bg');
    bg.style.background = coverGradient(book.title);
    front.appendChild(bg);

    if (book.cover) {
      var img = document.createElement('img');
      img.className = 'front-img';
      img.src = book.cover;
      img.alt = '';
      img.loading = 'lazy';
      /* 封面图加载失败 → 移除自身，露出底层渐变占位 */
      img.addEventListener('error', function () { img.remove(); });
      front.appendChild(img);
    }

    front.appendChild(createEl('div', 'book-spine')); // 书脊阴影

    /* ---------- 背面：金句 + 管理 ---------- */
    var back = createEl('div', 'book-back');
    back.appendChild(createEl('p', 'back-label', '书中金句'));
    back.appendChild(createEl('p', 'back-intro', getBackText(book)));

    var controls = createEl('div', 'back-controls');

    var statusRow = createEl('div', 'back-status');
    Object.keys(STATUS).forEach(function (s) {
      var btn = createEl('button',
        'back-status-btn' + (s === book.status ? ' is-active' : ''),
        STATUS[s].label);
      btn.type = 'button';
      btn.dataset.action = 'status';
      btn.dataset.id = book.id;
      btn.dataset.status = s;
      statusRow.appendChild(btn);
    });
    controls.appendChild(statusRow);

    var delBtn = createEl('button', 'back-delete', '删除这本书');
    delBtn.type = 'button';
    delBtn.dataset.action = 'delete';
    delBtn.dataset.id = book.id;
    controls.appendChild(delBtn);

    back.appendChild(controls);

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);
    return card;
  }

  /** 切换一张卡片的翻转状态（移动端轻点触发） */
  function toggleFlip(card) {
    var inner = card.querySelector('.book-inner');
    if (inner) inner.classList.toggle('is-flipped');
  }

  /* ============================================================
   * 状态修改 / 删除流程
   * ============================================================ */

  /** 修改阅读状态：持久化并原地同步卡片界面 */
  function changeStatus(book, status) {
    state.books = BookshelfStore.updateStatus(book.id, status);
    book.status = status;
    /* 无搜索/筛选，卡片始终在列表中，原地更新背面按钮高亮即可 */
    var card = document.querySelector('.book-card[data-id="' + book.id + '"]');
    if (card) updateCardStatus(card, book);
    showToast('已标记为「' + STATUS[status].label + '」');
  }

  /** 原地更新卡片背面的状态按钮高亮（封面已无文字元素） */
  function updateCardStatus(card, book) {
    card.querySelectorAll('.back-status-btn').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.status === book.status);
    });
  }

  /** 弹出删除确认框 */
  function requestDelete(book) {
    state.targetId = book.id;
    $('#confirmText').textContent = '确定要删除《' + book.title + '》吗？';
    openModal('confirmModal');
  }

  /** 确认删除：移除数据、刷新轮播 */
  function confirmDelete() {
    var book = state.books.find(function (b) { return b.id === state.targetId; });
    if (!book) return;
    state.books = BookshelfStore.removeBook(book.id);
    state.targetId = null;
    closeModal('confirmModal');
    renderCarousel(currentIndex());
    showToast('已删除《' + book.title + '》');
  }

  /* ============================================================
   * 添加流程：悬浮按钮 → 表单弹窗
   * ============================================================ */

  var pendingStatus = 'wishlist'; // 添加表单当前选中的状态

  function openAddModal() {
    $('#addForm').reset();
    pendingStatus = 'wishlist';
    renderStatusPicker($('#addStatusPicker'), pendingStatus, function (status) {
      pendingStatus = status;
    });
    openModal('addModal');
    $('#inputTitle').focus();
  }

  /** 提交添加表单：校验书名 → 写入 localStorage → 刷新轮播 */
  function handleAddSubmit(event) {
    event.preventDefault();
    var titleInput = $('#inputTitle');
    var title = titleInput.value.trim();
    if (!title) {
      showToast('请输入书名');
      titleInput.focus();
      return;
    }

    var book = BookshelfStore.addBook({
      title: title,
      author: $('#inputAuthor').value,
      cover: $('#inputCover').value,
      quote: $('#inputQuote').value,
      status: pendingStatus
    });

    /* 重新读取数据，确保新书立刻出现在轮播里 */
    state.books = BookshelfStore.loadBooks();

    renderCarousel();
    closeModal('addModal');
    showToast('已添加《' + book.title + '》');
  }

  /* ============================================================
   * 模态框通用（打开 / 关闭 + 背景滚动锁定 + 暂停轮播）
   * ============================================================ */

  function openModal(id) {
    var mask = document.getElementById(id);
    if (!mask) return;
    mask.hidden = false;
    document.body.classList.add('no-scroll');
    setPause('modal', true); // 弹窗打开时暂停自动滚动
  }

  function closeModal(id) {
    var mask = document.getElementById(id);
    if (!mask) return;
    mask.hidden = true;
    if (!document.querySelector('.modal-mask:not([hidden])')) {
      document.body.classList.remove('no-scroll');
      setPause('modal', false);
    }
  }

  /** 渲染一组状态选择按钮；onChange(status) 在选中新状态时回调 */
  function renderStatusPicker(container, current, onChange) {
    container.innerHTML = '';
    Object.keys(STATUS).forEach(function (status) {
      var btn = createEl('button', 'status-option', STATUS[status].label);
      btn.type = 'button';
      btn.dataset.status = status;
      btn.classList.toggle('is-active', status === current);
      btn.addEventListener('click', function () {
        if (onChange) onChange(status);
      });
      container.appendChild(btn);
    });
  }

  /* ============================================================
   * 轻提示 Toast
   * ============================================================ */

  var toastTimer = null;

  function showToast(message) {
    var toast = $('#toast');
    toast.textContent = message;
    toast.hidden = false;
    // 移除再重加动画类并强制重排，保证连续提示也能重新播放动画
    toast.classList.remove('is-show');
    void toast.offsetWidth;
    toast.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 2000);
  }

  /* ============================================================
   * 空状态
   * ============================================================ */

  /** 空状态：书架上没有任何书时显示 */
  function showEmptyState() {
    var empty = $('#emptyState');
    empty.hidden = false;
    $('#emptyTitle').textContent = '书架上空空的';
    $('#emptyTip').textContent = '点击右下角 + 按钮，添加你的第一本书';
  }

  /* ============================================================
   * 事件绑定
   * ============================================================ */

  /** 触屏滑动：按住拖动 → 松手吸附到最近一页；轻点 → 翻书 */
  function bindTouchDrag() {
    var carouselEl = $('#carousel');
    var touch = { active: false, startX: 0, startY: 0, dx: 0 };

    carouselEl.addEventListener('touchstart', function (event) {
      touch.active = true;
      touch.startX = event.touches[0].clientX;
      touch.startY = event.touches[0].clientY;
      touch.dx = 0;
      state.justTapped = false;
      setPause('touch', true); // 手指按住时暂停自动滚动
    }, { passive: true });

    carouselEl.addEventListener('touchmove', function (event) {
      if (!touch.active) return;
      var x = event.touches[0].clientX;
      var y = event.touches[0].clientY;
      var dx = x - touch.startX;
      var dy = y - touch.startY;
      /* 横向位移为主才接管滑动，否则交给浏览器纵向滚动页面 */
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 4) {
        CAROUSEL.x = clampX(CAROUSEL.x + dx);
        touch.startX = x;
        touch.startY = y;
        touch.dx += dx;
        applyTransform(false);
      }
    }, { passive: true });

    carouselEl.addEventListener('touchend', function () {
      if (!touch.active) return;
      touch.active = false;
      /* 几乎没位移 → 视为轻点，稍后允许触发翻书 */
      if (Math.abs(touch.dx) < 8) {
        state.justTapped = true;
        /* 若浏览器没派发 click，过一会儿自动复位，避免影响下一次轻点 */
        setTimeout(function () { state.justTapped = false; }, 400);
      }
      snapToNearest();
      setPause('touch', false);
    }, { passive: true });
  }

  /** 轮播轨道上的事件委托：状态切换 / 删除 / 轻点翻书 */
  function bindTrackEvents() {
    $('#carouselTrack').addEventListener('click', function (event) {
      /* 先处理管理按钮（背面状态、删除） */
      var control = event.target.closest('[data-action]');
      if (control) {
        var book = state.books.find(function (b) { return b.id === control.dataset.id; });
        if (!book) return;
        if (control.dataset.action === 'status') changeStatus(book, control.dataset.status);
        if (control.dataset.action === 'delete') requestDelete(book);
        return;
      }

      /* 触屏轻点卡片 → 翻书（桌面端用 hover，不进这里） */
      if (state.isTouch && state.justTapped) {
        state.justTapped = false;
        var card = event.target.closest('.book-card');
        if (card) toggleFlip(card);
      }
    });
  }

  function bindEvents() {
    /* 悬浮按钮 → 打开添加弹窗 */
    $('#fabBtn').addEventListener('click', openAddModal);

    /* 添加表单提交 */
    $('#addForm').addEventListener('submit', handleAddSubmit);

    /* 删除确认 */
    $('#confirmDeleteBtn').addEventListener('click', confirmDelete);

    /* 通用关闭：弹窗右上角 × 与“取消”按钮（data-close 指向目标弹窗 id） */
    document.addEventListener('click', function (event) {
      var closeBtn = event.target.closest('[data-close]');
      if (closeBtn) closeModal(closeBtn.dataset.close);
    });

    /* 点击遮罩空白处关闭弹窗 */
    document.querySelectorAll('.modal-mask').forEach(function (mask) {
      mask.addEventListener('click', function (event) {
        if (event.target === mask) closeModal(mask.id);
      });
    });

    /* ESC 关闭最上层的弹窗 */
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        var openMask = document.querySelector('.modal-mask:not([hidden])');
        if (openMask) closeModal(openMask.id);
      }
    });

    /* 桌面端：鼠标悬停轮播时暂停自动滚动（方便看金句） */
    $('#carousel').addEventListener('mouseenter', function () { setPause('hover', true); });
    $('#carousel').addEventListener('mouseleave', function () { setPause('hover', false); });

    /* 窗口尺寸变化：重算步长并校正位置 */
    window.addEventListener('resize', function () {
      computeStep();
      CAROUSEL.x = clampX(CAROUSEL.x);
      applyTransform(false);
      updateDots();
    });

    bindTouchDrag();
    bindTrackEvents();
  }

  /* ============================================================
   * 初始化
   * ============================================================ */

  function init() {
    state.books = BookshelfStore.loadBooks();
    /* 触屏设备（无 hover）用轻点翻书，桌面用悬停翻书 */
    state.isTouch = window.matchMedia('(hover: none)').matches;

    bindEvents();
    renderCarousel();
    startAutoplay();
  }

  init();
})();
