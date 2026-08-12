# family-menu 项目总结

生成时间：2026-08-11

## 项目定位

`family-menu` 是一个面向家庭局域网使用的多人点菜 Web 应用。家人在同一 WiFi 下用手机或电脑访问网页，选择自己的身份后，为当天中饭或晚饭选择想吃的菜。系统会记录每个人的选择，并通过 SSE 实时推送给在线用户；也预留了邮件和阿里云短信通知能力。

整体技术栈很轻量：

- 后端：Node.js + Express
- 数据库：SQLite，使用 `better-sqlite3`
- 前端：原生 HTML/CSS/JavaScript 单页应用
- 文件上传：`multer`
- 通知：`nodemailer` 邮件 + `@alicloud/pop-core` 阿里云短信
- 静态资源：本地 `public/` 页面与 `uploads/` 菜品图片

## 当前目录结构

```text
family-menu/
├── server.js              # Express 后端，建表、API、SSE、提醒定时器
├── public/
│   ├── index.html         # 单页应用页面结构与弹窗
│   ├── app.js             # 前端交互、API 调用、SSE 连接、渲染逻辑
│   └── style.css          # 移动端优先的 Apple 风格界面样式
├── data/
│   ├── family.db          # SQLite 主数据库
│   ├── family.db-shm      # SQLite WAL 辅助文件
│   └── family.db-wal      # SQLite WAL 日志文件
├── uploads/               # 菜品图片与种子 SVG 占位图
├── notify.js              # 邮件与短信通知封装
├── notify-config.json     # 通知配置文件
├── seed.js                # 初始化默认家庭成员与 40 道菜
├── seed-extra.js          # 额外菜品种子脚本
├── fetch-images.js        # 从 TheMealDB 获取默认菜品图片
├── fetch-extra.js         # 额外图片抓取脚本
├── fetch-extra2.js        # 额外图片抓取脚本
├── dish-images.json       # 菜品与图片文件名映射
├── start.bat              # Windows 一键启动服务，可选启动 cpolar
├── setup-tunnel.bat       # Windows cpolar 公网访问配置脚本
├── package.json           # Node 依赖与启动命令
├── package-lock.json      # 依赖锁定文件
└── README.md              # 原始使用说明
```

`node_modules/` 是依赖安装目录，不属于业务代码总结范围。

## 运行方式

首次运行：

```bash
npm install
npm start
```

服务默认监听 `0.0.0.0:3000`。启动后可通过：

- 本机：`http://localhost:3000`
- 局域网：`http://<电脑局域网 IP>:3000`

Windows 下还提供两个批处理脚本：

- `start.bat`：启动 Node 服务，并询问是否启动 cpolar 内网穿透。
- `setup-tunnel.bat`：配置 cpolar authtoken 并启动 3000 端口隧道。

## 数据模型

后端启动时会自动创建 SQLite 表。主要表如下：

| 表名 | 作用 |
| --- | --- |
| `users` | 家庭成员，包含姓名、头像、颜色 |
| `dishes` | 菜品，包含名称、描述、图片、分类 |
| `selections` | 每个用户每天每餐的点菜结果；通过唯一约束保证同一用户同一天同一餐只有一条选择 |
| `favorites` | 用户收藏的菜品 |
| `notifications` | 在线动态/通知流记录 |
| `notify_targets` | 邮件或短信通知接收人 |
| `votes` | 投票选菜活动 |
| `vote_options` | 投票候选菜品 |
| `vote_selections` | 用户在投票中的选择 |
| `reminders` | 中饭/晚饭提醒时间与启用状态 |

当前数据库概况：

- 家庭成员：7 个
- 菜品：40 道
- 菜品分类：家常菜 10、西餐 6、日料 6、面食 5、火锅 5、甜品饮品 4、汤羹 4
- 通知目标：1 个
- 提醒配置：2 条，中饭和晚饭
- 当前无点菜记录、收藏记录、通知记录和投票记录

## 后端能力

`server.js` 集中了主要后端逻辑。

### 用户与身份

- `GET /api/users`：列出家庭成员。
- `POST /api/users`：新增家庭成员，限制姓名非空、最长 12 字，且不能重名。
- 新增用户后通过 SSE 广播 `user_added`。

### 菜品管理

- `GET /api/categories`：按菜品分类统计数量。
- `GET /api/dishes`：查询菜品，支持 `category` 分类过滤和 `q` 关键词搜索。
- `POST /api/dishes`：新增菜品，支持上传图片或从图片 URL 下载。
- `DELETE /api/dishes/:id`：删除菜品，同时清理相关选择、收藏和本地图片文件。

上传图片限制为 5 MB，且只接受图片 MIME 类型。

### 点菜与历史

- `POST /api/select`：为当前用户选择当天中饭或晚饭。
- `GET /api/meal`：查询指定日期和餐次的所有选择。
- `GET /api/my-selection`：查询某用户某天某餐自己的选择。
- `GET /api/history`：查询最近若干天历史，默认 7 天，最多 30 天。
- `GET /api/weekly`：查询从今天起 7 天内的安排。
- `GET /api/recommendations`：返回高频菜、最近 7 天已吃过的菜、从未点过的菜。

`selections` 表有 `UNIQUE(user_id, meal, date)`，所以同一用户同一天同一餐重复选择时会替换旧选择。

### 收藏

- `GET /api/favorites?user_id=...`：查询用户收藏。
- `POST /api/favorites`：收藏菜品。
- `DELETE /api/favorites/:user_id/:dish_id`：取消收藏。

### 实时通知

- `GET /api/events`：SSE 长连接。
- 后端每 25 秒推送心跳，避免空闲连接被代理或内网穿透中断。
- 新增用户、添加/删除菜品、点菜、投票变化等事件会广播给在线页面。

点菜时会写入 `notifications` 表，并通过 SSE 推送给在线用户；同时异步调用外部邮件/短信通知，不阻塞接口响应。

### 投票选菜

- `GET /api/votes`：获取最近投票及候选项、票数、当前用户投票情况。
- `POST /api/votes`：创建投票。
- `POST /api/votes/:id/vote`：投票或改票。
- `POST /api/votes/:id/close`：关闭投票，并把得票最高菜品写入投票用户的点菜记录。

### 用餐提醒

- `GET /api/reminders`：查询提醒配置。
- `POST /api/reminders`：保存中饭或晚饭提醒时间。
- 后端每分钟检查一次提醒，到点后向通知目标发送邮件/短信。

## 前端能力

`public/index.html` 和 `public/app.js` 组成原生单页应用，主要流程是：

1. 选择家庭成员。
2. 选择中饭或晚饭。
3. 浏览、搜索或按分类过滤菜品。
4. 收藏菜品、点菜或使用“摇一摇”随机选择。
5. 查看今日全家选择和最新动态。
6. 通过更多菜单进入一周食谱、投票、历史、菜品管理、通知设置。

前端使用 `localStorage` 保存当前用户和主题偏好。界面支持浅色/深色主题、移动端卡片布局、骨架屏、Toast、弹窗焦点管理、SSE 断线重连、离线/在线状态提示。

## 通知配置

`notify.js` 提供：

- `loadConfig()` / `saveConfig()`：读写 `notify-config.json`
- `sendEmail()`：使用 SMTP 发送邮件
- `sendSms()`：使用阿里云短信服务发送短信
- `notifySelection()`：点菜后的统一通知入口

`notify-config.json` 当前包含邮件和短信配置结构。注意：该文件会保存通知服务配置，真实部署时不要把真实密码、授权码或 AccessKey 提交到公共仓库。

## 数据初始化与图片脚本

- `seed.js`：初始化默认家庭成员和 40 道菜。如果 `uploads/` 中存在对应图片则使用图片，否则生成 SVG 占位图。
- `seed-extra.js`：准备额外菜品数据，可用于扩展菜单。
- `fetch-images.js`、`fetch-extra.js`、`fetch-extra2.js`：通过 TheMealDB 搜索并下载菜品图片。
- `dish-images.json`：记录菜品名称与本地图片文件名映射。

## 当前风险与维护建议

1. 多个源码文件存在中文和 emoji 乱码现象。README 能正常显示，但 `server.js`、`seed.js`、`notify.js`、`index.html`、`style.css`、批处理脚本中大量中文字符串已出现乱码，会影响错误提示、页面文案和通知内容。
2. `public/index.html` 中存在重复的弹窗片段，例如新增家人、切换家人、管理菜品、历史弹窗等结构重复出现，可能导致重复 ID 和事件绑定异常。
3. `public/app.js` 中有重复的 `setConn()`、`connectSSE()` 定义，也有疑似空实现函数，例如 `loadUsers()`、`updateMeBtn()`、`openAddUserModal()`。这会让前端运行风险较高。
4. 前端调用了 `/api/notifications?limit=30`，但 `server.js` 中没有看到对应的 `GET /api/notifications` 路由，最新动态可能无法加载。
5. 投票关闭时使用普通 `INSERT INTO selections`，如果用户当天该餐已经选过菜，可能触发唯一约束冲突；更稳妥的方式是使用替换或先删除旧记录。
6. 当前应用没有登录鉴权，任何知道地址的人都可以新增成员、点菜、添加或删除菜品。局域网家庭使用问题不大，公网穿透时需要谨慎分享地址。
7. 通知配置文件以明文 JSON 存放。如果写入真实 SMTP 授权码或阿里云密钥，应避免提交到版本库，并考虑改用环境变量或本机私有配置。

## 建议优先级

短期最值得处理：

1. 修复源码编码问题，把乱码文案恢复成正常 UTF-8。
2. 补齐或修复前端缺失/空实现函数，确保首页能完成选人、选餐、选菜。
3. 增加 `GET /api/notifications` 接口，匹配前端动态流调用。
4. 清理 HTML 和 JS 中的重复定义，避免重复 ID 和后定义覆盖前定义。

中期可以增强：

1. 把后端路由拆分为用户、菜品、点菜、通知、投票等模块。
2. 为关键 API 增加最小测试，尤其是点菜替换、投票关闭、通知配置保存。
3. 公网访问场景下增加简单访问口令或家庭 PIN。
4. 把通知密钥迁移到 `.env` 或系统环境变量。

## 总结

这个项目已经具备一个家庭点菜工具的核心轮廓：本地数据库、家庭成员、菜品库、点菜记录、收藏、实时推送、通知、投票和提醒都已设计进去。当前最大问题不是功能方向，而是代码状态：部分文件编码损坏、前端存在重复和未完成片段、个别接口前后端不一致。优先修复这些基础问题后，它会更接近一个可稳定日常使用的小型家庭应用。
