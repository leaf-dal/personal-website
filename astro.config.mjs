// @ts-check
// Astro 核心配置入口
// 负责声明站点元信息、Vite 插件等全局构建配置
import { defineConfig } from 'astro/config';

// Tailwind CSS v4 的 Vite 插件，用于在 Astro 中处理 Tailwind 样式
import tailwindcss from '@tailwindcss/vite';

// React 集成：用于渲染 @react-three/fiber 的 3D 粒子背景组件
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // 站点根路径，用于生成最终部署后的绝对链接（如 sitemap、OG 图片等）
  // 当前目标平台为 GitHub Pages 项目站点，base 需设置为仓库名，保证资源路径正确
  site: 'https://leaf-dal.github.io',
  // base 务必以 / 结尾，确保 import.meta.env.BASE_URL 恒以斜杠结尾，拼接路径才不会出错
  base: '/personal-website/',

  // 注册框架集成
  integrations: [react()],

  // Vite 层配置：注册 Tailwind CSS 插件
  vite: {
    plugins: [tailwindcss()]
  }
});
