/* ============================================================
 * 书架 · 数据存储模块（storage.js）
 * 职责：封装 localStorage 的读写、首次种子数据初始化、
 *       数据迁移（清理测试数据 / 校正真实书籍 / 替换金句 / 补真实封面）、
 *       以及新增 / 删除 / 修改状态三个基础操作。
 * 说明：使用普通脚本（非 ES Module），保证双击 index.html
 *       以 file:// 协议打开时也能正常运行。
 * ============================================================ */

(function (global) {
  'use strict';

  /** localStorage 键名（带版本号，便于以后迁移数据结构） */
  var STORAGE_KEY = 'bookshelf_books_v1';

  /** 需要清理的历史测试数据书名（来自早期测试浏览器） */
  var TEST_TITLES = ['轮播测试书', '新版测试书'];

  /**
   * 种子数据：书架应有的 7 本真实书籍。
   * 每本只保留：书名 / 作者 / 封面 / 金句 / 阅读状态。
   * 7 本均有真实封面图（covers/ 目录下，文件名与书名一致）。
   * 不再提供自动简介（intro），背面统一展示用户指定的「书中金句」。
   */
  var SEED_BOOKS = [
    {
      id: 'seed-001',
      title: '拥抱你的敏感情绪',
      author: '伊尔斯·桑德',
      cover: 'bookshelf/covers/拥抱你的敏感情绪.jpg',
      quote: '从根本上看，迈向自由就是你不再从别人那里寻找子宫般的、全方位的、无条件的爱。如果你能放弃强求别人的冲动，对于你自己没得到的或者无法给予自己的，不再要求别人给你，那么你就真正自由了。',
      status: 'reading',
      createdAt: Date.now() - 7 * 86400000
    },
    {
      id: 'seed-002',
      title: '被讨厌的勇气',
      author: '岸见一郎 / 古贺史健',
      cover: 'bookshelf/covers/被讨厌的勇气.jpg',
      quote: '人生不是一条通往山顶的路，而是一连串的\'当下\'。',
      status: 'reading',
      createdAt: Date.now() - 6 * 86400000
    },
    {
      id: 'seed-003',
      title: '理想国',
      author: '伊藤计划 / Project Itoh',
      cover: 'bookshelf/covers/理想国.jpg',
      quote: '人类越是向前进化，就越是接近死亡。换句话说，无限接近于死亡一事本身，被人们称为\'进化\'。',
      status: 'read',
      createdAt: Date.now() - 5 * 86400000
    },
    {
      id: 'seed-004',
      title: '橘子不是唯一的水果',
      author: '珍妮特·温特森',
      cover: 'bookshelf/covers/橘子不是唯一的水果.jpg',
      quote: '墙是庇护，也是限制。墙的本质注定了墙终将倾颓。吹响自己的号角，你会看到四壁倒塌。',
      status: 'read',
      createdAt: Date.now() - 4 * 86400000
    },
    {
      id: 'seed-005',
      title: '地下室手记',
      author: '陀思妥耶夫斯基',
      cover: 'bookshelf/covers/地下室手记.jpg',
      quote: '恰如一场无端的牙痛，无从归咎，无从解脱。于是，又只剩下那唯一的出路——重重地撞向墙壁。',
      status: 'wishlist',
      createdAt: Date.now() - 3 * 86400000
    },
    {
      id: 'seed-006',
      title: '早安，怪物',
      author: '凯瑟琳·吉尔迪纳',
      cover: 'bookshelf/covers/早安，怪物.jpg',
      quote: '诚实表达自身情感和欲望并非残忍。\'这就是生活的棘手之处。\'我说。',
      status: 'wishlist',
      createdAt: Date.now() - 2 * 86400000
    },
    {
      id: 'seed-007',
      title: '乌合之众',
      author: '古斯塔夫·勒庞',
      cover: 'bookshelf/covers/乌合之众.jpg',
      quote: '所以不要轻易地成为集体的一份子，这样很容易被别有用心的人利用，即使你以为自己只不过是随声附和一下而已，实际上你已经成了帮凶。',
      status: 'wishlist',
      createdAt: Date.now() - 86400000
    }
  ];

  /** 生成唯一书籍 ID（时间戳 + 随机串，保证同毫秒添加也不冲突） */
  function createId() {
    return 'book-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  /**
   * 数据迁移：把历史数据规整为最新结构。
   * 1) 删除测试书籍（按书名匹配 TEST_TITLES）；
   * 2) 用种子数据校正 7 本真实书籍（书名标点 / 作者 / 金句原文 / 真实封面），
   *    并删除自动简介 intro 字段——背面只展示金句；
   * 3) 之前丢失的真实书籍自动补回书架。
   * 返回迁移后的完整书籍列表。
   */
  function migrateBooks(books) {
    /* 第 1 步：过滤掉历史测试数据 */
    var list = books.filter(function (book) {
      return TEST_TITLES.indexOf((book.title || '').trim()) === -1;
    });

    /* 第 2、3 步：逐本对照种子数据校正 / 补回 */
    SEED_BOOKS.forEach(function (seed) {
      var found = list.find(function (book) { return book.id === seed.id; });
      if (found) {
        /* 已存在：以种子为准校正书名、作者、金句与封面，并移除自动简介 */
        found.title = seed.title;
        found.author = seed.author;
        found.quote = seed.quote;
        /* 有真实封面图的书补上封面；暂无封面图的（橘子）保留原样用渐变占位 */
        if (seed.cover) found.cover = seed.cover;
        delete found.intro;
      } else {
        /* 丢失了：按种子完整补回（深拷贝，避免共享引用） */
        list.push(Object.assign({}, seed));
      }
    });

    return list;
  }

  /**
   * 读取全部书籍。
   * 优先取 localStorage；数据缺失或解析失败时，回退为种子数据。
   * 每次加载都会执行迁移并落库，保证清理 / 校正结果在用户浏览器自动生效。
   */
  function loadBooks() {
    var books = null;
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) books = parsed;
      }
    } catch (err) {
      console.warn('读取书架数据失败，已重置为初始书架', err);
    }
    if (!books) {
      /* 深拷贝种子数据，避免后续操作污染内存中的原始种子对象 */
      books = SEED_BOOKS.map(function (book) {
        return Object.assign({}, book);
      });
    }
    /* 迁移（删测试书 / 校正 7 本 / 替换金句 / 补封面）并持久化 */
    books = migrateBooks(books);
    saveBooks(books);
    return books;
  }

  /** 保存全部书籍到 localStorage */
  function saveBooks(books) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  }

  /** 新增一本书（data 由表单提供），返回完整书籍对象 */
  function addBook(data) {
    var books = loadBooks();
    var book = {
      id: createId(),
      title: (data.title || '').trim(),
      author: (data.author || '').trim(),
      cover: (data.cover || '').trim(),
      quote: (data.quote || '').trim(),
      status: data.status || 'wishlist',
      createdAt: Date.now()
    };
    books.push(book);
    saveBooks(books);
    return book;
  }

  /** 删除一本书，返回删除后的书籍列表 */
  function removeBook(id) {
    var books = loadBooks().filter(function (book) {
      return book.id !== id;
    });
    saveBooks(books);
    return books;
  }

  /** 修改一本书的阅读状态，返回更新后的书籍列表 */
  function updateStatus(id, status) {
    var books = loadBooks();
    var index = books.findIndex(function (book) {
      return book.id === id;
    });
    if (index > -1) {
      books[index].status = status;
      saveBooks(books);
    }
    return books;
  }

  /** 对外暴露的方法（挂到 window 上，供 app.js 调用） */
  global.BookshelfStore = {
    loadBooks: loadBooks,
    addBook: addBook,
    removeBook: removeBook,
    updateStatus: updateStatus
  };
})(window);
