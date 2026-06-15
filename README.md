# 我的设计台

一款 AI 生图模板复用工具：把常用海报存成模板，下次只改日期/地点/文字，遮住旧字、改字段、一键导出，不必每次重新生图。

## 功能

- **模板库**：本地保存、搜索、复制、删除模板（数据存浏览器 IndexedDB，无需账号）
- **画布编辑**：锁定底图 + 文字层 + 矩形遮盖层；选中、拖拽、双击改字
  - 双击空白处即在该位置建遮盖，并自动吸取底图颜色融合
  - 拖拽时吸附画布中心 / 其他图层中心，带参考线
  - 画布缩放 50/75/100%
- **字段驱动改字**：文字层绑定字段，右侧表单改「活动日期」等即实时更新画布
- **Prompt 溯源**：保存模型、Prompt、风格备注（仅记录，不参与渲染、不重新生图）
- **导出**：PNG / JPG（可选质量）/ 模板 JSON 备份；**批量月度海报**（填多期变量表 → 打包 ZIP）
- **历史版本**：保存字段快照、一键恢复
- **撤销/重做**：Ctrl+Z / Ctrl+Shift+Z

预览、单张导出、批量导出共用同一套渲染逻辑（`renderTemplateToDataURL`），保证三者像素一致。

## 本地开发

```bash
npm install
npm run dev        # 启动开发服务器（默认 http://localhost:5173）
npm run build      # 类型检查 + 生产构建（产出 dist/，已按 fabric/jszip/vendor code-split）
npm test           # 运行 vitest 单元测试
```

## 部署到 Vercel

项目已配置 `vercel.json`（framework: vite）。部署需要你本人登录 Vercel 账号（OAuth）：

```bash
npx vercel login     # 浏览器登录授权（仅你本人操作）
npx vercel --prod    # 部署到生产，首次会引导创建/关联项目，完成后输出公开 URL
```

或将仓库推到 GitHub 并在 Vercel 控制台导入，开启 Git 集成后每次 push 自动部署。

## 技术栈

React 18 · Vite · TypeScript · Fabric.js 6（画布）· Dexie/IndexedDB（本地存储）· Zustand（状态 + 撤销栈）· JSZip（批量打包）

## 数据与隐私

所有模板、底图、版本都保存在浏览器本地 IndexedDB，不上传服务器、无账号、无云同步。导出的 JSON 备份内嵌底图（base64），可在其它机器导入恢复。
