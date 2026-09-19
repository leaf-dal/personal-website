import React, { useCallback } from "react";
import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadFull } from "tsparticles";

/**
 * 全屏 tsparticles 粒子背景：恒星 + 星环结构
 * - 画布透明，固定在最底层（z-index: -1），不拦截鼠标、不影响滚动
 * - 中心：高亮度恒星粒子团（持续喷发的发光核心）
 * - 外围：稀疏旋转的星环粒子（从中心向外扩散的粒子壳层，整体 CSS 旋转）
 * - 底层：稀疏远景星点，营造深空氛围
 * 技术栈：tsparticles + @tsparticles/react（无 Three.js、无 CSS 滤镜、无 Canvas 2D）
 */

const StarParticles = () => {
  // ParticlesProvider 的 init 回调：加载完整引擎。必须保持引用稳定。
  const particlesInit = useCallback(async (engine) => {
    await loadFull(engine);
  }, []);

  // ---------- 1. 远景稀疏星空 ----------
  const bgStarsOptions = {
    background: { color: "transparent" },
    fpsLimit: 60,
    fullScreen: { enable: false },
    particles: {
      number: { value: 100, density: { enable: true, area: 900 } },
      color: { value: "#ffffff" },
      shape: { type: "circle" },
      opacity: { value: { min: 0.2, max: 0.75 } },
      size: { value: { min: 0.6, max: 1.8 } },
      move: {
        enable: true,
        speed: 0.15,
        direction: "none",
        random: true,
        straight: false,
        outModes: { default: "out" }
      }
    },
    detectRetina: true
  };

  // ---------- 2. 中心恒星：高亮度粒子团 ----------
  const starCoreOptions = {
    background: { color: "transparent" },
    fpsLimit: 60,
    fullScreen: { enable: false },
    particles: {
      number: { value: 0 }, // 粒子由 emitter 生成
      color: { value: ["#ffffff", "#fff7d6", "#ffe9a8", "#ffd86b"] },
      shape: { type: "circle" },
      opacity: {
        value: { min: 0.2, max: 1 },
        animation: { enable: true, speed: 1.5, startValue: "max", destroy: "min" }
      },
      size: {
        value: { min: 3, max: 10 },
        animation: { enable: true, speed: 3, startValue: "max", destroy: "min" }
      },
      life: {
        duration: { value: { min: 0.6, max: 1.6 } },
        count: 1
      },
      move: {
        enable: true,
        speed: { min: 0.4, max: 1.8 },
        direction: "none",
        random: true,
        straight: false,
        outModes: { default: "destroy" }
      }
    },
    emitters: {
      direction: "none",
      rate: { quantity: 16, delay: 0.03 },
      size: { width: 0, height: 0 },
      position: { x: 50, y: 50 }
    },
    detectRetina: true
  };

  // ---------- 3. 旋转星环：从中心向外扩散的粒子壳层 ----------
  // 发射器位于中心，粒子向外匀速运动并在生命周期结束时消失，
  // 形成一圈圈向外扩散的光环；外层容器 CSS 旋转使星环整体转动。
  const starRingOptions = {
    background: { color: "transparent" },
    fpsLimit: 60,
    fullScreen: { enable: false },
    particles: {
      number: { value: 0 },
      color: { value: ["#a5c9ff", "#c7d9ff", "#ffffff", "#7dd3fc", "#bfdbfe"] },
      shape: { type: "circle" },
      opacity: {
        value: { min: 0.3, max: 1 },
        animation: { enable: true, speed: 1, startValue: "max", destroy: "min" }
      },
      size: {
        value: { min: 1.5, max: 4 },
        animation: { enable: true, speed: 1, startValue: "min", destroy: "max" }
      },
      life: {
        duration: { value: { min: 2.5, max: 4.5 } },
        count: 1
      },
      move: {
        enable: true,
        speed: { min: 1, max: 2.8 },
        direction: "none",
        random: true,
        straight: true, // 直线向外，形成环状扩散
        outModes: { default: "destroy" }
      }
    },
    emitters: {
      direction: "none",
      rate: { quantity: 7, delay: 0.06 },
      size: { width: 0, height: 0 },
      position: { x: 50, y: 50 }
    },
    detectRetina: true
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        pointerEvents: "none"
      }}
    >
      {/* ParticlesProvider 负责加载引擎，加载完成后才渲染子粒子 */}
      <ParticlesProvider init={particlesInit}>
        {/* 底层：远景稀疏星空 */}
        <Particles id="bg-stars" options={bgStarsOptions} />

        {/* 中心恒星：高亮度粒子团 */}
        <Particles id="star-core" options={starCoreOptions} />

        {/* 星环：扩散粒子壳层 + CSS 旋转 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            animation: "tsparticles-ring-spin 80s linear infinite"
          }}
        >
          <Particles id="star-ring" options={starRingOptions} />
        </div>
      </ParticlesProvider>

      <style>{`
        @keyframes tsparticles-ring-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default StarParticles;
