# 王佳叶个人网站

基于 Astro + Tailwind CSS + TypeScript 构建的个人主页，展示学习轨迹、项目实践与资源分享。

## 🌐 在线访问

网站已部署至 Vercel，可直接访问：

**[https://personal-website-peach-phi-17.vercel.app](https://personal-website-peach-phi-17.vercel.app)**

> 提示：由于 Vercel 默认域名在国内部分网络环境下可能访问不稳定，如遇无法打开，可尝试切换网络、开启代理，或后续绑定自定义域名。

## 🚀 项目结构

```text
/
├── public/            # 静态资源（证书图片等）
├── src/
│   ├── components/    # 可复用组件
│   ├── layouts/       # 页面布局
│   ├── pages/         # 路由页面
│   ├── constants/     # 站点常量
│   └── styles/        # 全局样式
└── package.json
```

## 🧞 常用命令

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | 安装依赖                                         |
| `npm run dev`             | 启动本地开发服务器 `localhost:4321`              |
| `npm run build`           | 构建生产版本到 `./dist/`                         |
| `npm run preview`         | 本地预览构建结果                                 |
| `npm run astro ...`       | 运行 Astro CLI 命令                              |
