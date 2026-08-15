// @ts-check
// Astro 核心配置入口
// 负责声明站点元信息、Vite 插件等全局构建配置
import { defineConfig } from 'astro/config';

// Tailwind CSS v4 的 Vite 插件，用于在 Astro 中处理 Tailwind 样式
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // 站点根路径，用于生成最终部署后的绝对链接（如 sitemap、OG 图片等）
  // 当前部署在 Vercel，使用 Vercel 自动分配的域名；若后续绑定自定义域名，请替换为实际域名
  site: 'https://personal-website-peach-phi-17.vercel.app',

  // Vite 层配置：注册 Tailwind CSS 插件
  vite: {
    plugins: [tailwindcss()]
  }
});
