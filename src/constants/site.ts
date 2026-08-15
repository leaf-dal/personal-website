/**
 * 站点级常量配置
 * 集中管理所有页面共享的数据：站点标题、作者信息、导航链接、社交链接等。
 * 后期只需修改此文件，即可同步更新全站多处展示内容。
 */

// 站点基础信息
export const SITE_TITLE = '王佳叶的个人网站';
export const SITE_DESCRIPTION =
  '一名怀揣好奇心与创造力的大一新生，热衷于探索前端开发、人工智能与数字创作的无限可能，期待用代码与创意记录成长，打造真正有趣且有价值的内容。';
export const SITE_AUTHOR = '王佳叶';

// 姓名拼音，用于首页首屏展示
export const SITE_AUTHOR_PINYIN = 'WANG JIAYE';

// 导航链接列表，供 Header 与 Footer 复用
export interface NavigationLink {
  /** 链接显示文本 */
  label: string;
  /** 链接地址 */
  href: string;
}

export const NAVIGATION_LINKS: NavigationLink[] = [
  { label: '首页', href: '/' },
  { label: '关于我', href: '/about' },
  { label: '项目展示', href: '/projects' }
];

// 社交媒体与外部链接
export interface SocialLink {
  /** 平台名称 */
  name: string;
  /** 访问地址 */
  url: string;
  /** 在无障碍阅读器中显示的文本 */
  ariaLabel: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  {
    name: 'GitHub',
    url: 'https://github.com/yourname',
    ariaLabel: '访问我的 GitHub 主页'
  },
  {
    name: '邮箱',
    url: 'mailto:yourname@example.com',
    ariaLabel: '通过邮件联系我'
  },
  {
    name: '电话',
    url: 'tel:15061265909',
    ariaLabel: '拨打我的电话 15061265909'
  }
];

// 首页首屏展示文案
export const HERO_TITLE = '你好，我是王佳叶';
export const HERO_SUBTITLE = '在代码与创意之间寻找可能性';
export const HERO_DESCRIPTION =
  '一名正在学习前端开发与人工智能的大一新生。我通过实际项目巩固知识，也乐于将技能与资源分享给身边有需要的同学。这个网站记录着我的学习轨迹、项目实践，以及服务同学的初心。';
