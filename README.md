# OpenShare Frontend

OpenShare Frontend 是 `open-share-frontend` 的 Vite + React + TypeScript 前端项目。产品定位是开源贡献价值网络：把跨平台开源活动、开发者能力画像、组织需求和积分激励连接到同一个可搜索、可评估、可回馈的应用体验中。

本仓库只包含前端代码。认证、用户资料、组织、积分、商城、消息等业务数据由后端 API 提供；Insight 数据洞察模块还会访问 OpenDigger 相关公开数据源。

## 核心功能

- 公开首页：展示 OpenShare 产品定位、平台数据源、产品矩阵、报告和生态价值，并提供登录后的全站搜索入口。
- 社交登录：支持 GitHub 登录；中国大陆访问者额外展示 AtomGit 登录。登录前必须同意用户注册协议和积分兑换协议。
- 受保护应用壳：登录后进入带侧边栏的应用布局，支持路由鉴权、登录后回跳、未读消息轮询和侧边栏折叠状态持久化。
- Insight 数据洞察：提供开源榜单筛选、分页、搜索、仓库/开发者/标签详情、趋势图、贡献地图和 OpenRank 相关数据展示。
- 个人中心：展示和编辑个人资料、工作经历、教育经历、社交账号绑定状态和积分概览，也支持公开个人主页。
- 积分体系：包括积分钱包、交易流水、提现申请、积分分配预览/执行、商城商品兑换和兑换记录。
- 组织管理：支持组织列表、创建、详情、成员管理、组织设置、头像上传、组织积分余额和组织交易流水。
- 消息中心：支持消息列表、详情、类型/已读筛选、批量标记已读/未读、批量删除和未读数同步。
- 设置：包括语言设置、收货地址、提现账号和账号合并；其中部分提现/地址入口会根据地区检测结果展示。
- Talent Reach：当前为占位页面，页面文案显示功能开发中。

## 技术栈

- Vite 6、React 18、TypeScript 6
- React Router 7 路由与懒加载页面
- Axios API 客户端，带 Bearer token 注入和 401 refresh token 重试
- Tailwind CSS 4、Radix UI primitives、lucide-react 图标
- i18next / react-i18next 中英文国际化
- next-themes 主题类管理，当前默认深色主题
- ECharts / Recharts 数据可视化
- react-hook-form、Zod 表单校验
- react-markdown 协议文档渲染
- Sonner toast 通知

## 运行要求

- Node.js 18+ 与 npm
- 后端 API 服务。默认地址是 `http://localhost:8000/api/v1`，可通过 `VITE_API_BASE_URL` 覆盖。
- Insight 页面需要浏览器能访问这些公开数据源：
  - `https://selfoss.open-digger.cn/open_leaderboard/`
  - `https://oss.open-digger.cn/`
  - `https://fastly.jsdelivr.net/npm/echarts@4.9.0/map/json/world.json`

## 快速开始

安装依赖：

```bash
npm i
```

如需连接非默认后端，在项目根目录创建 `.env.local`：

```bash
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

启动开发服务器：

```bash
npm run dev
```

Vite 默认会启动在 `http://localhost:5173`。如果端口被占用，以终端输出为准。

生产构建：

```bash
npm run build
```

自动化检查：

```bash
npm run lint
npm run test
npm run typecheck
```

`npm run test:watch` 可启动 Vitest watch 模式。当前没有配置 `format` 脚本。

## 本地开发说明

- API 基址由 `src/lib/api.ts` 读取 `VITE_API_BASE_URL`，未设置时回退到 `http://localhost:8000/api/v1`。
- 开发服务器会把 `/media` 请求代理到 `http://localhost:8000`，用于本地显示后端媒体资源，例如头像和商品图片。
- 登录页会调用 `/common/region` 判断是否为中国大陆访问者。大陆访问者会看到 AtomGit 登录入口，登录后也会看到提现账号和收货地址相关入口。
- 在 localhost 开发时，可用 `?is_mainland_cn=1` 强制视为大陆访问者；用 `?is_mainland_cn=0` 清除该覆盖。覆盖值只保存在当前标签页的 `sessionStorage`。
- access token、refresh token、语言、侧边栏状态和地区检测结果会存储在浏览器本地存储中。

## 项目结构

```text
.
├── public/                         # 静态资源、favicon、协议 markdown、提现二维码
├── src/
│   ├── app/
│   │   ├── App.tsx                 # 公开首页
│   │   ├── router.tsx              # 顶层路由配置
│   │   ├── router-elements.tsx     # RootLayout、懒加载和错误边界封装
│   │   ├── components/             # 首页区块、全站搜索、导航与 UI primitives
│   │   └── contexts/               # 应用内上下文
│   ├── components/                 # 跨布局公共组件，如鉴权路由、协议弹窗、错误边界
│   ├── contexts/                   # AuthProvider 与认证状态
│   ├── i18n/                       # i18next 初始化和中英文翻译
│   ├── layouts/                    # AuthLayout 与 AppLayout
│   ├── lib/                        # API 客户端、重定向、地区检测等工具
│   ├── pages/                      # 路由页面
│   │   └── insight/                # Insight 数据洞察模块
│   │       ├── api/                # OpenDigger / leaderboard 数据请求
│   │       ├── components/         # 榜单、筛选、趋势、地图等组件
│   │       ├── domain/             # 路由、格式化、趋势、平台、榜单业务逻辑
│   │       ├── styles/             # Insight 专用样式
│   │       └── types/              # Insight API 类型
│   ├── styles/                     # 全局样式、主题、动画和字体
│   └── types/                      # 共享类型
├── DESIGN.md                       # OpenShare 设计系统说明
├── PRODUCT.md                      # 产品定位与设计原则
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 路由概览

公开路由：

- `/`：OpenShare 首页
- `/login`：社交登录入口
- `/social-callback`：社交登录回调
- `/u/:username`：公开个人主页

登录后路由：

- `/insight`、`/insight/*`：数据洞察榜单和详情页
- `/profile`、`/profile/edit`：个人中心和资料编辑
- `/points`、`/points/transactions`、`/points/withdrawals`、`/points/allocate`：积分钱包、流水、提现和分配
- `/shop`、`/shop/:id`、`/redemptions`：积分商城、商品详情和兑换记录
- `/messages`：消息中心
- `/talent-reach`：人才触达占位页
- `/organizations`、`/organizations/create`、`/organizations/:slug`、`/organizations/:slug/members`、`/organizations/:slug/settings`、`/organizations/:slug/transactions`：组织相关页面
- `/settings/general`、`/settings/addresses`、`/settings/withdrawal-accounts`、`/settings/merge`：设置页面

`ProtectedRoute` 会在未登录时跳转到 `/login?redirect=<当前路径>`，登录完成后再回到原目标页。社交登录会通过 `sessionStorage` 暂存 redirect，避免 OAuth 整页跳转丢失参数。

## 数据与外部服务

- 后端业务接口统一通过 `src/lib/api.ts` 的 Axios 实例访问。
- 请求拦截器会从 `localStorage.access_token` 注入 `Authorization: Bearer <token>`。
- 响应拦截器会在普通接口返回 401 时尝试调用 `/auth/refresh` 刷新 token；刷新失败会清理本地 token 并跳回登录页。
- `/auth/refresh` 和 `/auth/social/exchange` 不参与自动刷新，避免掩盖认证端点本身的错误。
- Insight 榜单元数据来自 `https://selfoss.open-digger.cn/open_leaderboard/meta.json`，榜单数据 URL 由筛选条件拼接。
- Insight 详情趋势、平台 logo、开发者/仓库/标签 meta 来自 `https://oss.open-digger.cn/`。
- 全站搜索调用后端 `/public/search`，并根据结果跳转到对应的 Insight 详情路径。

## 国际化与主题

- 翻译文件位于 `src/i18n/locales/zh.json` 和 `src/i18n/locales/en.json`。
- i18next 会优先读取 `localStorage.language`，其次使用浏览器语言，默认回退到英文。
- 主题由 `next-themes` 在根节点写入 class，当前入口默认 `defaultTheme="dark"` 且 `enableSystem={false}`。
- 设计原则详见 `PRODUCT.md` 和 `DESIGN.md`：整体强调可信、克制、数据化的开源贡献价值网络，不使用传统招聘站、加密货币或过度赛博风格。

## 开发约定

- 使用 `@/*` 从 `src/` 导入模块。
- React 组件使用 `PascalCase`，hooks 使用 `use` 前缀，普通变量和函数使用 `camelCase`。
- 页面文件采用 kebab-case，例如 `organization-detail.tsx`。
- 新的可复用 UI primitive 优先放在 `src/app/components/ui/`。
- class 合并优先使用已有的 `cn` helper。
- 保持 TypeScript strict 设置干净，避免引入未使用变量和参数。
- 改动后至少运行 `npm run lint`、`npm run test`、`npm run typecheck` 和 `npm run build`。UI 改动还应在 Vite dev server 中做手动检查。
