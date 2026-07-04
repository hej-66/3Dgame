# 星界回响 — AI 协作交接文档

> 本文档面向后续接手的 AI 协作者，重点说清**画质分级系统**的设计、API 契约与使用规范。
> 任何新增渲染对象（材质/光源）都必须遵守本文档的画质系统规范。

---

## 一、项目硬约束

- **Three.js r170**（本地 IIFE bundle `three-bundle.js`，挂到 `window.THREE`）+ PixiJS + Web Audio
- **严禁 ES Modules**：所有 JS 通过 `<script>` 标签按固定顺序加载，全挂在全局作用域，必须兼容 `file://` 直接打开 `index.html`
- 脚本加载顺序（见 `index.html` 末尾）：
  `pixi.min.js → three-bundle.js → state.js → audio.js → story.js → meta.js → auth.js → scene.js → player.js → enemies.js → weapons.js → hud.js → tutorial.js → main.js`
- 资源必须用相对本地路径，禁止外部 CDN
- 后处理来自本地 `addons/postprocessing/`（UnrealBloom + 自定义 Vignette）
- 后端：Cloudflare Pages Functions（`functions/api/*.js`，`env.STELLAR_KV`），本地 file:// 模式自动降级为 localStorage

## 二、画质系统总览

### 设计目标
让低端设备能流畅运行，高端设备能享受物理材质效果。用户在暂停界面「设置」中切换 4 档画质，保存到 localStorage（key: `sr_graphicsQuality`），切换后提示「重新开始生效」并 `returnToMenu()`。

### 设计原则（v2 体系，2026-07 重构）
- **光强对齐原则**：极致画质的 `lightMul` / `emissiveMul` / `directLightMul` 与中画质完全一致。极致的优势来自 `MeshPhysicalMaterial`（transmission/clearcoat/sheen/iridescence）+ 全量粒子，**而非更强光照**。旧版极致 `emissiveMul 1.5 + lightMul 1.0` 导致激光兵/晶簇巨像过曝看不清，已修复。
- **删除「高(HIGH)」档**：旧版「高」相比「中」仅光强略增（lightMul 0.5→1.0、emissiveMul 1.0→1.3），实际观感差异微小且同样存在过曝问题，无存在意义，已删除。旧 3(高)→新 2(中)。
- **档位语义**：0 无（无光照）/ 1 低（Phong 简单光照）/ 2 中（Standard PBR，推荐）/ 3 极致（Physical 物理材质，光强同中）

### 核心配置位置
- **预设定义**：`state.js` 顶层 `GRAPHICS_PRESETS` 数组（4 项）
- **当前等级**：`STATE.graphicsQuality`（0-3，从 localStorage 读取，默认 2）
- **版本化迁移**：`state.js` 顶部 IIFE，用 `sr_gfx_version` 标记画质体系版本（当前 v2），跨版本启动时映射旧索引（详见下文「版本化迁移」）
- **取预设**：`getGraphics()` 返回当前预设对象
- **材质工厂**：`makeQualityMaterial(opts, physicalOpts?)`
- **光源工厂**：`makeQualityLight / makeQualityDirLight / makeQualityAmbientLight / makeQualityHemiLight`
- **UI 逻辑**：`main.js` 的 `renderQualityGrid()` + `btn-settings / btn-settings-close` 事件
- **HTML 面板**：`index.html` 的 `#settings-overlay`（`#quality-grid` 为空容器，按钮由 JS 生成）
- **样式**：`css/style.css` 的 `.settings-panel / .quality-grid / .quality-btn`（`.quality-grid` 用 `grid-template-columns:repeat(4,1fr)` 适配 4 档）
- **雾效**：`scene.js` 一次性配置 `scene.fog = _gfxInit.fog ? new THREE.FogExp2(0x05060d, _gfxInit.fogDensity) : null`

### 画质预设表

| index | name | label | material | fog | particleMul | lightMul | directLightMul | emissiveMul |
|---|---|---|---|---|---|---|---|---|
| 0 | 无 | OFF | basic | false | 0.0 | 0.0 | 0.0 | 0.0 |
| 1 | 低 | LOW | phong | true | 0.3 | 0.0 | 0.7 | 0.6 |
| 2 | 中 | MID | standard | true | 0.6 | 0.5 | 1.0 | 1.0 |
| 3 | 极致 | ULTRA | physical | true | 1.0 | 0.5 | 1.0 | 1.0 |

> 注：极致档 `lightMul=0.5`、`emissiveMul=1.0` 与中档完全一致；只有 `particleMul` 提升到 1.0 和 `material='physical'` 体现差异。

**字段语义**：
- `material`：材质类型，决定 `makeQualityMaterial` 返回哪种材质
- `fog`：是否启用 FogExp2
- `particleMul`：粒子数量倍率（0=无粒子）
- `lightMul`：**点光源**（PointLight）强度倍率，0=关闭。点光源性能开销大，画质 0/1 全部关闭
- `directLightMul`：**平行光/环境光/半球光**强度倍率，0=关闭。Phong/Standard 材质需要主光源，画质 0 关闭（Basic 不响应光照），画质 1 保留 0.7 强度
- `emissiveMul`：自发光强度倍率，影响所有材质的 `emissiveIntensity`
- `bloom`：预留字段（当前未启用）

### 为什么区分 lightMul 和 directLightMul
画质 1(低) 用 Phong 材质，Phong 必须有光源才能显示漫反射。如果连 DirectionalLight 都关掉，Phong 会全黑（只剩 emissive）。所以低画质关闭点光源（开销大）但保留平行光（开销小且必需）。画质 0(无) 用 Basic 材质不响应任何光照，所以全部关闭。

---

## 三、材质工厂 makeQualityMaterial

### 函数签名
```javascript
function makeQualityMaterial(opts, physicalOpts) { ... }
```

### opts 字段（通用，所有画质都会用到）
| 字段 | 类型 | 说明 | 默认值 |
|---|---|---|---|
| color | hex | 漫反射颜色 | 0x444444 |
| emissive | hex | 自发光颜色 | 0x000000 |
| emissiveIntensity | number | 自发光强度（会乘 `emissiveMul`） | 1.0 |
| emissiveMap | Texture | 自发光贴图 | null |
| metalness | number | 金属度（standard/physical） | 0.5 |
| roughness | number | 粗糙度（standard/physical） | 0.5 |
| shininess | number | 高光锐度（phong） | 80 |
| specular | hex | 高光颜色（phong） | 0x222222 |
| transparent | bool | 是否透明 | false |
| opacity | number | 不透明度 | 1.0 |
| side | THREE.Side | 渲染面 | FrontSide |
| depthWrite | bool | 深度写入 | true |
| flatShading | bool | 平面着色 | false |
| blending | Blending | 混合模式 | NormalBlending |
| map | Texture | 漫反射贴图 | null |
| fog | bool | 是否受雾影响 | true |

### physicalOpts 字段（仅极致画质使用）
| 字段 | 类型 | 说明 | 默认值 |
|---|---|---|---|
| transmission | number | 透射率（折射） | 0 |
| thickness | number | 厚度 | 1.0 |
| ior | number | 折射率 | 1.5 |
| clearcoat | number | 清漆层强度 | 0 |
| clearcoatRoughness | number | 清漆粗糙度 | 0.1 |
| sheen | number | 织物/绒毛光泽强度（边缘柔光） | 0 |
| sheenColor | hex | 绒毛光泽颜色 | 0x000000 |
| iridescence | number | 虹彩薄膜干涉强度（0-1） | 0 |
| iridescenceIOR | number | 虹彩折射率 | 1.3 |

> **工厂透传实现（v2 已修复）**：`makeQualityMaterial` 在画质 3(极致) 分支构造 `MeshPhysicalMaterial` 时使用展开式 `{...opts, ...physicalOpts, emissiveIntensity: ...}`，自动透传所有 `physicalOpts` 字段（含 sheen/sheenColor/iridescence/iridescenceIOR/attenuationColor 等）。旧版白名单实现曾静默丢弃这些高级属性，已修复。**新增 physicalOpts 字段时无需改工厂**。

### 返回值类型（随画质变化）
- 画质 0 → `THREE.MeshBasicMaterial`（无光照，纯色 + map）
- 画质 1 → `THREE.MeshPhongMaterial`（简单光照）
- 画质 2 → `THREE.MeshStandardMaterial`（PBR）
- 画质 3 + 传了 physicalOpts → `THREE.MeshPhysicalMaterial`（含 transmission/clearcoat/sheen/iridescence）
- 画质 3 + 未传 physicalOpts → `THREE.MeshStandardMaterial`（降级）

### 关键行为
- `emissiveIntensity` 会自动乘以 `emissiveMul`，所以调用方传原始值即可
- Basic 材质没有 emissive/emissiveMap/metalness/roughness 字段，工厂会忽略它们（Basic 用 color + map 显示外观，emissive 效果在 Basic 下不可见，这是可接受的降级）
- `fog` 字段所有分支都支持，**远方星球必须传 `fog: false`** 否则会被 FogExp2 完全遮蔽
- 极致画质下如果没传 physicalOpts，会降级为 Standard（不会报错）

### 调用示例
```javascript
// 普通材质（所有画质生效）
const mat = makeQualityMaterial({
  color: 0x002244, emissive: 0x00ddff, emissiveIntensity: 1.5,
  metalness: 0.3, roughness: 0.2, transparent: true, opacity: 0.7
});

// 物理材质（仅极致画质启用 transmission/clearcoat，其他画质降级为 Standard）
const crystalMat = makeQualityMaterial({
  color: 0x004466, emissive: 0x00aaff, emissiveIntensity: 1.8,
  metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.75
}, { transmission: 0.6, thickness: 2.5, ior: 1.6, clearcoat: 1.0, clearcoatRoughness: 0.0 });

// 远方星球（必须 fog:false）
const planetMat = makeQualityMaterial({
  map: tex, roughness: 0.9, metalness: 0.0,
  emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.5,
  fog: false
});
```

---

## 四、光源工厂

### 4 个工厂函数
```javascript
// 点光源：画质 0/1 返回 null
makeQualityLight(color, intensity, distance)            // → PointLight | null

// 平行光：画质 0 返回 null，画质 1 按 0.7x 缩放
makeQualityDirLight(color, intensity)                   // → DirectionalLight | null

// 环境光：画质 0 返回 null
makeQualityAmbientLight(color, intensity)               // → AmbientLight | null

// 半球光：画质 0 返回 null
makeQualityHemiLight(skyColor, groundColor, intensity)  // → HemisphereLight | null
```

### 必须做的 null 检查
工厂可能返回 null，**调用方必须做 null 检查**，否则 add 到场景或在 onBeforeRender 中访问属性时会抛 TypeError。

```javascript
// 正确写法
const coreLight = makeQualityLight(0x00ddff, 2.5, 50);
if (coreLight) g.add(coreLight);

const keyLight = makeQualityDirLight(0x00ffe5, 0.8);
if (keyLight) { keyLight.position.set(8, 14, 10); scene.add(keyLight); }

// onBeforeRender 中访问光源属性也要检查
core.onBeforeRender = () => {
  // ❌ 错误：coreLight 可能为 null，会抛 TypeError 导致渲染循环崩溃
  // coreLight.intensity = 2.0 + Math.sin(t) * 0.8;
  // ✅ 正确
  if (coreLight) coreLight.intensity = 2.0 + Math.sin(t) * 0.8;
};
```

### 已踩过的坑（务必避免）
**晶簇巨像卡死 bug**：`core.onBeforeRender` 中 `coreLight.intensity = ...` 未做 null 检查，画质 0/1 下 `coreLight` 为 null，每帧渲染抛 `Cannot set property 'intensity' of null`，导致整个渲染循环崩溃。修复方式：加 `if (coreLight)` 判断。

---

## 五、使用规范（强制）

### 1. 新增 PBR 材质必须用 makeQualityMaterial
❌ 禁止：`new THREE.MeshStandardMaterial({...})`
❌ 禁止：`new THREE.MeshPhongMaterial({...})`
❌ 禁止：`new THREE.MeshPhysicalMaterial({...})`
✅ 必须：`makeQualityMaterial({...}, physicalOpts?)`

### 2. 新增光源必须用对应工厂
❌ 禁止：`new THREE.PointLight(...)`
❌ 禁止：`new THREE.DirectionalLight(...)`
❌ 禁止：`new THREE.AmbientLight(...)`
❌ 禁止：`new THREE.HemisphereLight(...)`
✅ 必须：`makeQualityLight / makeQualityDirLight / makeQualityAmbientLight / makeQualityHemiLight`
✅ 必须：调用后做 null 检查

### 3. 例外（无需改造）
- `THREE.MeshBasicMaterial`：本身就是无光照，可直接 new（但若希望低画质降级时统一行为，也可用工厂）
- `THREE.LineBasicMaterial`：线段材质不响应光照，直接 new
- `THREE.ShaderMaterial`：自定义着色器（如玩家护盾），不响应画质系统，直接 new
- 独立预览场景（如 codex 武器图鉴的 `codexScene`）：保留自有光源确保预览稳定

### 4. transmission 使用节制
`MeshPhysicalMaterial.transmission` 每帧每个材质需要额外折射渲染通道。极致画质下若同时存在 16+ 个 transmission 对象会严重掉帧。Boss 材质应节制使用，普通敌人/玩家不要用 transmission。

### 5. 远方星球/土星环材质
必须传 `fog: false`，否则会被 FogExp2 完全遮蔽（距离 2000-4000，雾密度 0.0012 时几乎不透明）。

---

## 六、画质切换与设置 UI 流程

### 入口
- 暂停界面（`#pause-overlay`）的「设置」按钮 `#btn-settings`
- **主菜单**（`#overlay`）的「设置」按钮 `#btn-menu-settings`（与暂停界面共用同一 `#settings-overlay` 面板）

### 切换流程（main.js）
1. 点击 `#btn-settings` / `#btn-menu-settings` → `renderQualityGrid()` 渲染 4 个画质按钮 + `syncLangGrid()` 高亮当前语言 → `#settings-overlay.classList.add('show')`
2. 点击某个画质按钮 → `STATE.graphicsQuality = i` → `localStorage.setItem('sr_graphicsQuality', i)` → 重新渲染网格高亮 → 更新 `#quality-desc` 描述文本（按 `STATE.lang` 取中文/英文 `QUALITY_DESCRIPTIONS` / `QUALITY_DESCRIPTIONS_EN`）
3. 点击语言按钮（`.lang-btn`）→ `setLang(btn.dataset.lang)` → 保存 `sr_lang` → `applyI18n()` 刷新全部静态文本 → `syncLangGrid()` 高亮 → 触发各动态面板刷新（`renderQualityGrid` / `refreshDifficultyUI` / `renderMetaShop` / `updateCodexModel` / `refreshAuthLang`）
4. 点击 `#btn-settings-close` → 关闭面板 → 检测是否真的改了画质等级：
   - 若游戏中（`STATE.started && !STATE.over`）：`showToast(t('toast.gfx_changed_restart'))` + `returnToMenu()`
   - 否则：`showToast(t('toast.gfx_changed'))`

### 4 档描述文本（QUALITY_DESCRIPTIONS / QUALITY_DESCRIPTIONS_EN）
```
0: 关闭所有光照、雾效、粒子。/ Disable all lighting, fog, particles.
1: 启用雾效和简单光照。Phong 材质。/ Enable fog and simple lighting. Phong materials.
2: 标准 PBR 渲染。Standard 材质。推荐。/ Standard PBR. Recommended.
3: 极致物理材质。Physical + transmission + clearcoat + sheen/iridescence；光强与中画质一致。/ Ultra physical material. Light intensity matches Mid.
```

### 版本化迁移（state.js 顶部 IIFE）
画质体系用 `sr_gfx_version` localStorage 键标记版本。启动时若 `savedVer < GFX_VERSION`，按 `legacyMap` 把旧索引映射到新索引，并回写两个键。

当前迁移规则（v1 → v2）：
```
旧 0(无)   → 新 0(无)
旧 1(低)   → 新 1(低)
旧 2(中)   → 新 2(中)
旧 3(高)   → 新 2(中)   ← 「高」已删除，降级到中
旧 4(极致) → 新 3(极致) ← 极致保留，但光强已被下调到中画质水平
```

**新增档位或再次重构时**：递增 `GFX_VERSION`，扩展 `legacyMap`，并在本文档更新此表。不要直接改 `GRAPHICS_PRESETS` 而不动版本号，否则老用户的 localStorage 索引会指向错误的档位。

### 重要：画质切换不会热重载
材质和光源在 `createEnemyShip` / `createPlayerShip` 时一次性创建，切换画质后必须重新开始游戏才能让新画质生效。这是设计上的简化（避免运行时重建所有材质的复杂性）。**语言切换则会即时生效**（`applyI18n()` + 动态面板刷新），无需重载。

---

## 七、已纳入画质系统的对象清单

### 光源（全部用工厂）
| 位置 | 对象 | 数量 |
|---|---|---|
| scene.js:60-65 | 场景全局 HemisphereLight + DirectionalLight + PointLight | 3 |
| enemies.js:923-930 | 晶簇巨像 3 DirectionalLight + 1 AmbientLight | 4 |
| enemies.js:798-799 | 晶簇巨像核心 PointLight | 1 |
| enemies.js:1304-1305 | 机械神谕内部 PointLight | 1 |
| enemies.js:1346-1347 | 机械神谕核心 PointLight | 1 |
| enemies.js:1520-1527 | 机械神谕 3 DirectionalLight + 1 AmbientLight | 4 |
| player.js:86-92 | 玩家引擎 PointLight | 1 |
| main.js:2406 | 玩家引擎光强度更新（已做 null 检查） | - |
| **例外** | main.js:3400-3401 codex 图鉴光源（独立场景，保留自有） | 2 |

### 材质（全部用 makeQualityMaterial）
| 位置 | 对象 | 数量 |
|---|---|---|
| scene.js | 4 颗远方星球（mars/jupiter/callisto/saturn） | 4 |
| player.js | body/wing/cockpit/pod | 4 |
| enemies.js 普通敌人 | type 0/1/2/4/5/6/7 + 默认杂兵 | ~22 |
| enemies.js 虚空之眼 | eyeBall/tendrilMat/shardMat | 3 |
| enemies.js 晶簇巨像 | armor/core/crystal/spike/prismRing/prismFacet/resonance | 7 |
| enemies.js 机械神谕 | frame/chime/phaseCrystal + backplate/gear×2/spring/hand×3/shard/pendulum×2/crown | 15 |
| enemies.js Boss 通用 | bossLaserMat | 1 |
| main.js | droneMat（炮塔无人机） | 1 |
| **例外** | 玩家护盾 ShaderMaterial、所有 MeshBasicMaterial/LineBasicMaterial | - |

---

## 八、画质系统改造检查清单（新增对象时对照）

新增一个渲染对象时，逐项检查：

- [ ] 材质是否用了 `makeQualityMaterial`？
- [ ] 若需要透射/清漆，是否传了 `physicalOpts`？
- [ ] 若是远方天体，是否传了 `fog: false`？
- [ ] 光源是否用了对应工厂（`makeQualityLight/Dir/Ambient/Hemi`）？
- [ ] 光源 add 到场景前是否做了 null 检查？
- [ ] `onBeforeRender` 回调中访问光源属性是否做了 null 检查？
- [ ] 极致画质下 transmission 对象数量是否合理（< 10 个）？

任一项不满足，低画质下可能崩溃或帧率暴跌。

---

## 九、关键陷阱汇总

1. **`onBeforeRender` 中访问 null 光源属性** → 渲染循环崩溃（晶簇巨像卡死的根因）
2. **`MeshPhysicalMaterial.transmission` 多对象** → 每帧 N 次额外折射通道，帧率暴跌
3. **远方星球未设 `fog: false`** → 被 FogExp2 完全遮蔽看不见
4. **Phong 材质无光源** → 全黑（画质 1 必须保留 DirectionalLight，即 `directLightMul > 0`）
5. **画质切换后期望热重载** → 不会生效，必须 `returnToMenu()` 重新开始
6. **Boss 变量作用域**：跨 `if(type===3)` 块使用的变量必须在 `createEnemyShip` 函数顶部用 `let` 声明，不要在某个块内用 `const`（否则第二个块 ReferenceError → spawnBoss 失败 → 波次误判为已清空 → 触发奖励界面）

---

## 十、模块改造提示（按需参考）

### 改 Boss 攻击
在 `BOSS_ATTACK_LIST` 调整 attackId 列表 → 在对应 `execute{BossName}Attack` 添加 case → 如需持续效果，新增 `start{Skill}/update{Skill}` 函数并在 `updateBoss` 中调用 → 把字段加入调度阻止条件 → 在 `cleanupBoss` 中清理

### 加新敌人
在 `createEnemyShip` 加 `if(type===N)` 分支（材质用 `makeQualityMaterial`） → 在 `spawnEnemy` 调整概率 → 在 update 逻辑里加行为

### 加新 Boss
扩展 `BOSS_ATTACK_LIST / BOSS_PHASE_NAMES` → 在 `createEnemyShip` 的 `if(type===3)` 加新 variant 分支 → 新增 `execute{NewBoss}Attack / execute{NewBoss}Charged` → 在 `executeBossAttack / executeBossChargedAttack` 加路由 → 加新 BGM 文件并扩展 `BOSS_BGM_FILES`
> **i18n**：在 `state.js` 的 `I18N.en` 加 `'boss.{variant}': 'English Name'` 和 `'bossphase.{variant}.{1/2/3}': 'Phase Name'`；在 `BOSS_PHASE_NAMES_LOCAL_ZH` 加中文兜底；新攻击的 Toast 用 `t('toast.xxx', '中文')` 并补 `I18N.en` 键

### 加新画质档位
修改 `GRAPHICS_PRESETS` 数组（含 `nameEn`） → 修改 `QUALITY_DESCRIPTIONS` 与 `QUALITY_DESCRIPTIONS_EN` → 在 `makeQualityMaterial` 加新材质分支（如需要）→ 在光源工厂调整阈值（如需要）→ **递增 `state.js` 顶部 IIFE 的 `GFX_VERSION`，扩展 `legacyMap` 把旧索引映射到新索引**（否则老用户 localStorage 会指向错误档位）→ 更新 `css/style.css` 的 `.quality-grid grid-template-columns` 列数

---

## 十一、测试后门

- 按 `B` 键：强制 `spawnBoss()` 召唤下一个 Boss（用于快速测试 Boss 战）。**不要破坏此后门**，且任何修改 Boss 创建流程的改动都要确保 B 键仍能正确生成 Boss（不出现奖励界面）。

## 十二、修改后必须的验证

1. `node --check js/<file>.js` 语法验证（每个改动文件）
2. 用 file:// 直接打开 `index.html` 确认能启动（无 import 错误、无 ReferenceError）
3. 按 B 键测试 Boss 生成（不出现奖励界面）
4. 切换 4 档画质确认无崩溃、无材质丢失、无光源 null 引用
5. Boss 战帧率稳定（极致画质下晶簇巨像/机械神谕不掉帧）
6. **在设置面板切换中/英文，确认所有界面文本、HUD、Toast、Boss 名/阶段、剧情对话、教程、图鉴、星晶强化、结算界面均跟随切换；切回中文恢复原状**

---

## 十三、国际化（i18n）系统

游戏支持中文（`zh`，默认）与英文（`en`）双语。语言选择保存在 `localStorage` 的 `sr_lang` 键。

### 核心配置位置
| 内容 | 位置 |
|------|------|
| `STATE.lang` | `state.js` STATE 对象（从 `sr_lang` 读取，默认 `'zh'`） |
| `I18N.en` 翻译表 | `state.js` 末尾（扁平 dot key → 英文字符串） |
| `t()` / `tf()` / `trName()` / `trDesc()` / `trTitle()` / `trWeapon()` / `trGfxName()` / `trBoss()` / `trBossPhase()` / `trSpeaker()` | `state.js` |
| `applyI18n()` / `setLang()` | `state.js` |
| `SPEAKER_SID`（说话者显示名 → 稳定 sid 映射） | `state.js` |
| `BOSS_PHASE_NAMES_LOCAL_ZH`（阶段名中文兜底） | `state.js` |
| 语言选择 UI（`.lang-grid` / `.lang-btn`） | `index.html` 的 `#settings-overlay` |
| 语言按钮样式 | `css/style.css` `.lang-section` / `.lang-grid` / `.lang-btn` |
| `QUALITY_DESCRIPTIONS_EN` | `main.js` |
| 启动时 `applyI18n()` 调用 | `main.js`（`initAuthSystem()` 之后） |

### 三种翻译策略（混合架构）

**1. 静态 HTML 文本 —— `data-i18n` 属性 + `applyI18n()`**
- 给元素加 `data-i18n="key"`（textContent）/ `data-i18n-html="key"`（innerHTML，含 `<br>` 等标签）/ `data-i18n-placeholder="key"`（输入框 placeholder）
- `applyI18n()` 首次调用时缓存中文原文到 `data-i18n-orig` / `data-i18n-ph-orig`，之后按 `STATE.lang` 切换：en 时覆盖为 `I18N.en[key]`，zh 时恢复缓存原文
- **无需页面重载即可切换**，且切回中文能恢复原始 HTML
- 已覆盖：暂停界面、设置面板、奖励界面、教程、登录、主菜单、图鉴、星晶强化、结算界面

**2. 数据结构 —— 内联 `*En` 字段 + `trName()` / `trDesc()` / `trTitle()` 访问器**
- 在数据对象上直接并列写中文与英文字段：
  - `DIFFICULTIES` / `META_UPGRADES` / `REWARDS` / `GRAPHICS_PRESETS`：`name` + `nameEn`，`desc` + `descEn`
  - `CODEX_DATA`：`name` + `nameEn`，stats 数组每项 `label` + `labelEn`，`val` + `valEn`
  - `TUT_DATA`：`title` + `titleEn`，`desc` + `descEn`
- 访问器：`trName(obj)` 取 `nameEn`/`name`，`trDesc(obj)` 取 `descEn`/`desc`，`trTitle(obj)` 取 `titleEn`/`title`
- 优点：翻译与数据同处，易维护，无需查表

**3. 扁平字符串（Toast / Boss 名 / 阶段 / 说话者 / 杂项）—— `I18N.en` 表 + `t()` / `tf()`**
- `t(key, fb)`：en 时返回 `I18N.en[key]`，否则返回中文兜底 `fb`
- `tf(key, vars, fb)`：带占位符，`{n}` 形式，如 `tf('hud.locking', {pct: 50}, '锁定中... {pct}%')`
- `trBoss(v)` = `t('boss.'+v, ...)`，`trBossPhase(v,p)` = `t('bossphase.'+v+'.'+p, ...)`，`trSpeaker(sidOrName)` 先经 `SPEAKER_SID` 解析 sid 再 `t('speaker.'+sid, ...)`

### 说话者 sid 解耦（关键设计）
剧情对话的 `speaker` 字段是中文显示名（如 `战术官`），但音色配置 `VOICE_CONFIG` 原本用中文名做键。为支持国际化且不破坏 TTS：
- `state.js` 定义 `SPEAKER_SID`：`{ '战术官':'tactician', '虚空之眼':'voideye', ... }`
- `story.js` 每行对话新增稳定 `sid` 字段（`luna7` / `tactician` / `voideye` / `crystal` / `abyss` / `oracle` / `system`）
- `audio.js` 的 `VOICE_CONFIG` 改用 sid 做键；`speak()` / `speakerToColor()` 先用 `SPEAKER_SID` 把传入的显示名或 sid 统一解析成 sid，再查表（**向后兼容**：传显示名或 sid 都能工作）
- `story.js` 显示时：`dispSpeaker = trSpeaker(line.sid || line.speaker)`，`dispText` 在 en 时取 `DIALOGUE_ENGLISH[line.text]`（复用已有 TTS 翻译表），zh 时取 `line.text`；`speak()` 仍传中文 `line.text`（TTS 始终用中文语音）

### 游客/本地玩家用户名
- `AUTH` 新增 `isLocal` 标志区分「用户主动游客」（`isLocal=false`）与「服务器不可用降级本地」（`isLocal=true`）
- `guestDisplayName()` 按当前语言返回 `t('user.guest')` 或 `t('user.local')`
- `refreshAuthLang()` 在语言切换时刷新 `auth-title` / `auth-submit` 文本，并把游客用户名更新为当前语言版本

### 语言切换的动态面板刷新
`setLang()` 调用后，除 `applyI18n()` 刷新静态 HTML，还会检测并刷新可能正在显示的动态面板：
- `renderQualityGrid()` —— 画质按钮名称
- `refreshDifficultyUI()` —— 难度按钮显示名
- `renderMetaShop()` —— 星晶强化卡片（若面板打开）
- `updateCodexModel()` —— 武器图鉴（若面板打开）
- `refreshAuthLang()` —— 登录界面标题/按钮 + 游客名

### 新增可翻译文本的步骤
1. **静态 HTML**：给元素加 `data-i18n="some.key"`，在 `I18N.en` 加 `'some.key': 'English text'`
2. **数据结构**：在对象上加 `nameEn`/`descEn`/`titleEn`/`valEn` 等并列字段，渲染时用 `trName()`/`trDesc()`/`trTitle()` 取值
3. **Toast/动态字符串**：`showToast(t('toast.xxx', '中文兜底'))`，在 `I18N.en` 加 `'toast.xxx': 'English'`；带变量用 `tf('key', {v: val}, '中文 {v}')`

### 注意事项
- 中文是各处的原始兜底值，`I18N.en` 只存英文；en 缺失键时自动回退中文
- `applyI18n()` 缓存机制要求：**不要在 JS 中直接 `.textContent=` 覆盖带 `data-i18n` 的元素**（会污染缓存）；动态文本用单独的 id 不加 `data-i18n`
- HUD 每帧重绘的文本（Boss 名、锁定、属性面板、武器栏）直接用 `t()`/`tf()`/`trBoss()`/`trWeapon()` 实时取值，无需缓存
- TTS 语音（`speak()`）始终用中文 `line.text`，与显示语言独立

---

## 九、极致画质敌人外观强化（重要变更记录）

> **背景**：排查发现「除个别 Boss 外，普通敌人在中/极致画质下外观几乎无差异」，以突击兵（type 0）最明显——感觉是光源或材质反射没做好。经全面排查定位到 **3 个根因**，已全部修复。

### 根因分析

| # | 根因 | 影响 | 修复文件 |
|---|------|------|---------|
| 1 | **场景缺少环境贴图（`scene.environment`）** | PBR 材质（Standard/Physical）`metalness>0` 时必须有环境贴图才能反射，否则金属表面因"无物可反射"而发黑发暗。这是"反射看不出效果"的根本原因 | `scene.js` |
| 2 | **普通敌人未传 `physicalOpts`** | 按工厂契约（见第三节），画质 3(极致) 未传 `physicalOpts` 会**降级为 MeshStandardMaterial**，与画质 2(中) 完全相同 → 中画质与极致画质零差异 | `enemies.js` |
| 3 | **普通敌人无动态点光源** | 仅 Boss 调用了 `makeQualityLight`，普通敌人只靠弱全局光（强度 0.6–1.2）。且 v2 体系下 `lightMul` 在画质 2/3 均为 0.5，光照层面也无差异（极致的优势在材质而非光强） | `enemies.js` |

### 变更 1：scene.js 新增程序化环境贴图

在 `renderer` 初始化后、Bloom 后处理之前，新增 `_buildSpaceEnvTexture()` + `PMREMGenerator` 流程：

- 用 Canvas 程序化绘制 512×256 的太空星云 equirect 贴图（深空底色 + 24 团星云 + 120 亮星点 + 1 颗主光源亮斑）
- 经 `PMREMGenerator.fromEquirectangular()` 预滤波后挂到 `scene.environment`
- **仅在 PBR 画质（2/3/4）下生成**，判断条件 `getGraphics().material === 'standard' || 'physical'`；画质 0/1 跳过以省内存
- **不设置 `scene.background`**，保持原有纯黑深空背景 + 星空粒子不变
- 生成后立即 `_envTex.dispose()` + `_pmrem.dispose()` 释放中间资源

> 效果：所有 PBR 材质（含玩家飞船、子弹、Boss、普通敌人）自动获得反射与间接光照，金属装甲会出现星云高光与主光源镜面反射。

### 变更 2：enemies.js 全部 7 种普通敌人补全 physicalOpts

每个普通敌人的主体材质现在都传入第二参数 `physicalOpts`，使极致画质真正使用 `MeshPhysicalMaterial`：

| type | 敌人 | physicalOpts 要点 | 视觉效果 |
|------|------|-------------------|---------|
| 0 | 突击兵 | body: `clearcoat 1.0` + `sheen 0.6`；wing: `clearcoat 0.8` | 装甲湿润抛光感 + 品红边缘绒光 |
| 1 | 激光兵 | torso/head: `clearcoat 0.9–1.0`；lens: `transmission 0.6` + `ior 1.5` | 透镜玻璃折射聚焦红光 + 金属镜面 |
| 2 | 冲撞者 | body: `clearcoat 0.8`；spike: `clearcoat 1.0` + `roughness 0.1` | 撞角锋利镜面反射 |
| 4 | 护盾兵 | body: `clearcoat 0.9`；shield: `transmission 0.7` + `iridescence 1.0` | 能量护盾玻璃折射 + 虹彩薄膜干涉 |
| 5 | 分裂者 | body: `clearcoat 0.7`；lobe: `transmission 0.4` + `clearcoat 0.8` | 荧光胶质半透 + 生物金属核心 |
| 6 | 轰炸机 | body: `clearcoat 0.8`；bay: `clearcoat 0.7` | 重型装甲金属反射 |
| 7 | 自爆机 | body: `clearcoat 1.0` + `sheen 0.5`；fin: `clearcoat 0.7` | 弹体镜面 + 血红边缘绒光 |

同时将所有普通敌人的 `metalness` 从 0.5 提升到 **0.8–0.95**、`roughness` 从 0.5 降到 **0.1–0.4**，让环境贴图反射更明显。

### 变更 3：enemies.js 全部 7 种普通敌人新增动态点光源【⚠️ 已废弃，见第十节】

> **⚠️ 第二次迭代已废弃此方案**：每个普通敌人 1 个 PointLight 导致同屏 N 敌 = N 动态光源，Three.js forward rendering 对所有光源逐片元计算，**中画质（≥2）也生成光源 → 严重卡顿**。该方案已全部移除，改用 emissive 呼吸（零光源开销）。详见第十节。以下为历史记录：

每个普通敌人在建模末尾新增一个 `makeQualityLight(color, intensity, distance)` 调用（低画质返回 null 自动跳过），并挂到敌人组 `g` 上：

| type | 光源颜色 | 强度 | 距离 | 位置 |
|------|---------|------|------|------|
| 0 突击兵 | 0xff2d95 品红 | 1.8 | 12 | 核心 (0,0,-0.5) |
| 1 激光兵 | 0xff3300 猩红 | 2.0 | 14 | 透镜 (0,0,-2.0) |
| 2 冲撞者 | 0xffb547 琥珀 | 1.6 | 10 | 撞角 (0,0,-1.5) |
| 4 护盾兵 | 0x00aaff 冰蓝 | 1.8 | 12 | 护盾 (0,0,-1.0) |
| 5 分裂者 | 0x88ff00 荧光绿 | 1.8 | 12 | 核心 (0,0,0) |
| 6 轰炸机 | 0xff8800 橙 | 2.0 | 14 | 弹舱 (0,-0.3,0) |
| 7 自爆机 | 0xff0044 血红 | 2.2 | 12 | 弹头 (0,0,-0.5) |

**呼吸动画**：在 `createEnemyShip` 末尾、`return enemyData` 之前，新增 `g.onBeforeRender` 回调，让光源强度按正弦脉动：
- 普通敌人：频率 2.5 Hz，振幅 ±35%
- 自爆机（`_pulseFast=true`）：频率 8 Hz，振幅 ±60%，营造"即将爆炸"的急促闪烁

> 用 `onBeforeRender` 自包含驱动，**无需修改主游戏循环**（`main.js` 的 update），与现有 Boss 的 `onBeforeRender` 动画模式一致。光源随敌人组 `g` 一起被移除/销毁，无需额外清理。

### 性能与兼容性说明

- **低画质（0/1）零开销**：`makeQualityLight` 返回 null，`physicalOpts` 被忽略，环境贴图不生成
- **中画质（2）**：材质为 Standard（无 clearcoat/transmission），但**环境贴图生效**，金属已有反射——这是相比改动前最显著的免费提升
- **极致画质（3）**：Physical 材质 + clearcoat/transmission/sheen/iridescence + 环境贴图 + emissive 呼吸；**光强与中画质一致**（lightMul=0.5、emissiveMul=1.0），仅材质与粒子更精细，避免过曝
- **光源数量**：普通敌人**不再使用 PointLight**（见第十节），仅 Boss 保留多光源（同屏数量少，可控）

### 后续维护提醒

1. 新增普通敌人时，**务必**：(a) 主体材质传 `physicalOpts`（至少 `clearcoat`）；(b) **不要**给普通敌人加 PointLight（会卡，见第十节），自身发光呼吸由 `createEnemyShip` 末尾的 emissive 动画自动处理
2. `makeQualityMaterial` 工厂已采用展开式 `{...opts, ...physicalOpts}` 透传所有物理材质字段（v2 已修复），无需手动同步白名单
3. 环境贴图是全局一次性生成，切换画质后需重载页面（与现有画质切换流程一致，`returnToMenu()` 即可）

---

## 十、卡顿修复与金属感增强（第二次迭代）

> **背景**：第一次迭代（第九节）后出现两个问题：(1) 游戏时不时就卡一下，即使开中画质也卡（之前不卡）；(2) 极致画质有反光了，但只在特定角度才能看见，没有表现出金属感。经排查定位到两个根因，已全部修复。

### 根因 A：卡顿 —— 普通敌人 PointLight 导致光源数爆炸

**现象**：中画质（2）也卡，且是"时不时卡一下"（与同屏敌人数波动吻合）。

**根因**：第一次迭代给每个普通敌人加了 1 个 `makeQualityLight`（PointLight）。`makeQualityLight` 在画质 ≥2（含中画质）都返回光源。Three.js 采用 forward rendering，**所有在 scene graph 里的光源都会进入 shader uniform，逐片元计算**，不做逐光源距离剔除。因此同屏 N 个敌人 = N 个 PointLight，fragment shader 成本 = O(光源数 × 片元数)，N 较大时（如一波 20+ 敌人）shader 极其昂贵 → 卡顿。

**修复**（`enemies.js`）：
1. **删除全部 7 种普通敌人的 `makeQualityLight` 调用块**（type 0/1/2/4/5/6/7），Boss（type 3）的点光源保留不动（同屏仅 1 个 Boss，光源可控）
2. **呼吸动画改用 emissive 驱动**：在 `createEnemyShip` 末尾、`return enemyData` 之前，遍历敌人组 `g` 的所有 PBR 材质（`material.emissiveIntensity !== undefined`），去重后存入 `_pulseMats` 数组并记录各自初始 `emissiveIntensity`；`g.onBeforeRender` 按正弦缩放所有材质的 `emissiveIntensity`
   - 普通敌人：频率 2.5 Hz，振幅 ±35%
   - 自爆机（`behavior === 'kamikaze'`）：频率 8 Hz，振幅 ±60%
   - **零光源开销**，配合 Bloom 后处理依然有明显的发光呼吸效果
3. 该方案无需修改主游戏循环，光源随敌人组 `g` 一起移除/销毁，无额外清理

> **关键教训**：在 forward rendering 引擎里，**动态 PointLight 数量必须严格控制**。普通敌人（数量多、不可控）绝不能每人挂光源；只有 Boss（同屏 1 个）才适合用 PointLight。普通敌人的"自身发光"应优先用 emissive + Bloom 实现。

### 根因 B：金属感不足 —— 环境贴图太暗 + 反射强度不够

**现象**：极致画质有反光，但只在特定角度才能看见，没有金属感。

**根因**：
1. **环境贴图整体太暗**：底色 `#05060d` 几乎纯黑，星云透明度低（0.35–0.5）且仅 24 团，星点小（0.5–2.0）且仅 120 颗。金属大部分角度反射到的是"黑底"，只有刚好对准主光源亮斑（半径仅 90px）时才有可见反光 → "特定角度才能看见"
2. **PMREM 预滤波模糊高频**：亮星点这种高频信息被多级模糊抹掉，只剩低频暗星云
3. **未设置 `envMapIntensity`**：默认 1.0，反射强度不足以表现金属感

**修复 1**（`scene.js`）—— 重构 `_buildSpaceEnvTexture`：
| 项目 | 修改前 | 修改后 | 目的 |
|------|--------|--------|------|
| 底色 | `#05060d`（近黑） | `#181830`/`#101020`（深蓝灰） | 给金属基础反射，避免大部分角度反射到黑 |
| 星云团块 | 24 团，透明度 0.35–0.5 | 32 团，透明度 0.45–0.6，5 色 | 更丰富的反射色彩 |
| 亮星点 | 120 颗，半径 0.5–2.0 | 200 颗，半径 0.5–2.5，亮度 0.7–1.0 | 更多点状高光 |
| 主光源亮斑 | 半径 90，中心 0.9 | 半径 **150**，中心 **1.0**，4 层渐变 | 覆盖更大角度，任意角度都能反射到强高光 |
| 次光源 | 无 | 左下冷蓝，半径 110，中心 0.7 | 增加明暗对比与色彩层次，强化方向性高光 |

**修复 2**（`enemies.js`）—— 设置 `envMapIntensity`：
在 `createEnemyShip` 末尾的材质遍历中，对所有支持 `envMapIntensity` 的 PBR 材质设置 `envMapIntensity = 1.5`，增强环境贴图反射强度。该遍历与 emissive 收集合并在同一个 `g.traverse` 中，一次性完成，无额外开销。

> 这样金属在任何角度都能反射到"有明暗变化"的环境内容（主光源暖白高光 + 次光源冷蓝补光 + 星云色彩），表现出明确的金属方向性高光，而非"特定角度才反光"。

### 性能对比

| 画质 | 修改前（第一次迭代） | 修改后（第二次迭代） |
|------|---------------------|---------------------|
| 中画质（2） | N 敌 × 1 PointLight → **卡顿** | 0 PointLight，emissive 呼吸 → **流畅** |
| 极致画质（3） | N 敌 × 1 PointLight + Physical | 0 PointLight + Physical + envMapIntensity 1.5 + 更亮环境贴图 |

### 后续维护提醒（补充）

1. **普通敌人禁止使用 PointLight**：自身发光一律用 emissive + Bloom；`createEnemyShip` 末尾的 emissive 呼吸动画会自动处理所有 PBR 材质，新增敌人无需额外代码
2. **`envMapIntensity` 已在 `createEnemyShip` 末尾统一设置为 1.5**：新增敌人自动生效，无需逐材质手动设置
3. 若需调整反射强度，修改 `enemies.js` 中 `createEnemyShip` 末尾 `obj.material.envMapIntensity = 1.5` 这一处即可全局生效
4. 环境贴图的亮度/反射信息密度可在 `scene.js` 的 `_buildSpaceEnvTexture` 中调整：主光源亮斑大小/亮度、次光源、星云密度都会直接影响所有金属的反射观感

---

## 十四、Boss 渲染性能优化（onBeforeRender 合并 + InstancedMesh 实例化）

> 2026-07 新增。针对 Boss（尤其 variant 3 机械神谕）的 CPU 回调开销与 Draw Call 数量进行零损失优化。画面效果完全一致，仅减少指令开销与绘制指令数。

### 1. 问题诊断

**问题 A：onBeforeRender 回调频繁进出**

Boss 各装饰 mesh（`chimes[0].mesh`、`vortex`、`secHand` 等）各自挂载 `mesh.onBeforeRender = () => {...}`。每帧渲染时，渲染器对每个进入渲染列表的 mesh 都会调用一次该回调，导致：
- CPU 频繁进出回调函数（函数调用开销 × mesh 数）
- 逻辑分散（如渲染 `chimes[0]` 时更新所有编钟，其余编钟的回调重复执行相同逻辑）
- `THREE.Group` 不触发 `onBeforeRender`（无 geometry，不进渲染列表），曾导致 `mainspringGroup.onBeforeRender` / `shardGroup.onBeforeRender` 为死代码

**问题 B：重复对象的 Draw Call 爆炸**

Boss 身上有大量完全相同的物体：
- variant 1 晶簇巨像：6 根晶刺（相同 ConeGeometry + 相同材质）
- variant 3 机械神谕：12 浮游碎片（相同 OctahedronGeometry + 相同材质）、4 口编钟（相同 CylinderGeometry + 相同材质）

原写法对每个实例 `new THREE.Mesh(geo, mat)`，每个 Mesh = 1 次 Draw Call。显卡切换绘制指令的开销远大于画几千个三角形。

### 2. 优化方案 A：统一 bossAnimFn

**设计**：在 `createEnemyShip` 函数外层作用域声明 `let bossAnimFn = null;`（line 390），在 variant 分支内为其赋值一个闭包，闭包内集中执行所有装饰动画。最终挂载到 `enemyData.updateBossAnimations = bossAnimFn;`（第二个 `if (type === 3)` 块内）。

**调用点**：`main.js` 的 `animate()` 中、`composer.render()` 之前，遍历 `enemies` 调用 `enemyData.updateBossAnimations()`：

```js
for (let i = 0; i < enemies.length; i++) {
  const animFn = enemies[i].updateBossAnimations;
  if (animFn) animFn();
}
composer.render();
```

**放在 animate() 而非 update() 的原因**：`update()` 是固定步长累加器（60Hz，每帧 0-5 次），`composer.render()` 每帧一次。放在 `animate()` 保证每渲染帧恰好推进一次，与原 `onBeforeRender` 行为一致；暂停时 `update()` 停止但画面仍渲染，装饰动画继续（零损失）。

**关键陷阱（前次回归根因）**：`createEnemyShip` 有**两个独立的 `if (type === 3)` 块**——第一个（Boss 模型构建）给 `bossAnimFn` 赋值，第二个（enemyData 字段）挂载。`bossAnimFn` 必须声明在**函数外层作用域**（line 390），不能声明在第一个 `if` 块内，否则第二个块引用时 `ReferenceError`，导致 `createEnemyShip(3, ...)` 抛错，B 键测试后门失效（按 B 直接下一关）。`node --check` 只查语法不查运行时作用域，必须运行时测试。

### 3. 优化方案 B：InstancedMesh 实例化

**原理**：`THREE.InstancedMesh(geometry, material, count)` 告诉显卡"把这个模型画 N 次，分别在 N 个不同位置"，将 N 次 Draw Call 合并为 1 次。每个实例的位置/旋转/缩放通过 `setMatrixAt(i, matrix4)` 设置。

**转换清单**：

| Boss | 对象 | 原方案 | 新方案 | Draw Call 变化 |
|------|------|--------|--------|--------------|
| variant 1 晶簇巨像 | 6 根晶刺 | 6 Mesh + 6 LineSegments | 1 InstancedMesh + 1 合并 LineSegments | 12 → 2 |
| variant 3 机械神谕 | 12 浮游碎片 + 12 光晕 | 24 Mesh + 12 LineSegments | 2 InstancedMesh + 1 合并 LineSegments | 36 → 3 |
| variant 3 机械神谕 | 4 口编钟 + 4 光晕 | 8 Mesh + 4 LineSegments | 2 InstancedMesh + 1 合并 LineSegments | 12 → 3 |

**关键实现细节**：

1. **DynamicDrawUsage**：每帧需要更新矩阵的 InstancedMesh（晶刺脉冲、碎片自转、编钟摆动）必须调用 `instanceMatrix.setUsage(THREE.DynamicDrawUsage)`，否则驱动层会按静态数据优化导致更新不生效。光晕静态（仅随父 Group 旋转）则无需此标记。

2. **frustumCulled = false**：Boss 整体由父 Group 包围球剔除即可，避免单个实例被误剔除导致闪烁。

3. **预计算基础变换**：晶刺的 `lookAt + rotateX(PI/2)` 朝向、碎片/编钟的轨道位置在创建时一次性算好存入 `spikeBasePos[]`/`spikeBaseQuat[]`/`shardBasePos[]`/`chimeBasePos[]`。每帧动画只在基础上叠加增量（脉冲缩放、累计自转、z 轴摆动），用复用的 `_spikeDummy`/`_shardDummy`/`_chimeDummy`（`THREE.Object3D`）作为矩阵载体，避免每帧 `new`。

4. **累计旋转用 Float32Array**：碎片自转 `shardRotX[i] += 0.02` / `shardRotY[i] += 0.015` 存在 `Float32Array(12)` 中，避免浮点数对象属性查找开销。

5. **LineSegments 合并**：原 N 个 `LineSegments(EdgesGeometry)` 合并为 1 个，通过 `Float32BufferAttribute` 手动拼接 N 份顶点数据（三件套 bundle 无 `BufferGeometryUtils.mergeBufferGeometries`）。**零损失保留原视觉**：
   - 晶刺/编钟的 LineSegments 原本有 bug（全加在 Group 原点而非跟随 mesh 位置），合并时保留原点重叠（N 份相同顶点）以完全一致复现原画面
   - 碎片的 LineSegments 原本正确（各自在 shardNode 位置），合并时按位置平移每份顶点

### 4. 验证方法

冒烟测试 `_boss_scope_test.js`（临时文件，验证后删除）：
- 用 `vm.runInContext` 加载**真实 `three-bundle.js`**（设置 `ctx.window = ctx` 让 IIFE 挂载 THREE），确保 `InstancedMesh.setMatrixAt` / `Object3D.updateMatrix` / `Matrix4` 为真实运算而非桩
- `makeQualityMaterial` 等返回 Proxy 桩（不渲染所以不需要真实材质）
- 对 variant 0-3 依次调用 `createEnemyShip(3, variant)` + `updateBossAnimations()` 两次，验证不抛错
- 全部通过后删除临时文件

### 5. 后续维护提醒

1. **新增 Boss 装饰 mesh 时**：动画逻辑写进对应 variant 的 `bossAnimFn` 闭包，**不要**再挂 `mesh.onBeforeRender`
2. **新增重复物体时**：优先用 `InstancedMesh` 而非循环 `new Mesh`；每帧动画用 `setMatrixAt` + 复用 `Object3D` 载体
3. **InstancedMesh 矩阵更新后**：必须设 `instanceMatrix.needsUpdate = true`，否则 GPU 缓冲不刷新
4. **Boss 变量作用域**：所有 Boss 闭包变量（`bossAnimFn`、`spikeInst`、`shardInst` 等）必须声明在 `createEnemyShip` 函数外层作用域（line 379-390 区域），不能声明在 `if (type === 3)` 块内——两个独立 if 块的作用域不互通

---

## 十五、Boss 命中判定半径 bulletHitRadius（子弹/导弹/冲刺撞击）

> 2026-07 修复。解决"玩家普通子弹穿过 Boss 模型"的 bug，让 Boss 命中行为与普通敌人一致（命中后子弹消失 + 粒子特效）。

### 1. 问题诊断

Boss（type===3）的 `enemyData.radius = enemyRadius * scale = 3.0 * 8.0 = 24.0`，但 `g.scale.setScalar(8.0)` 让视觉模型外径远超 24（变体 0 眼球 36、变体 1 晶刺 44、变体 2 圆盘外缘 64-128、变体 3 碎片 54）。原碰撞判定用 `e.radius + buffer`，子弹击中外壳时 `distSq < (24+2)²` 不成立 → **子弹直接穿过 Boss 模型**，且 Boss 命中分支显式跳过 `explode()` 粒子特效。

### 2. 修复方案

**新增字段** `enemyData.bulletHitRadius`（仅 Boss 有，普通敌人 undefined）：

```js
// enemies.js line 2074-2077 (boss 字段块末尾)
enemyData.bulletHitRadius = 40;
```

**碰撞判定统一用回退表达式**（普通敌人回退到 `e.radius`，行为不变）：

| 位置 | 原代码 | 新代码 |
|------|--------|--------|
| `main.js` 子弹碰撞 (line 2557) | `e.radius + 2.0` | `(e.bulletHitRadius \|\| e.radius) + 2.0` |
| `main.js` 导弹碰撞 (line 3083) | `e.radius + 1.0` | `(e.bulletHitRadius \|\| e.radius) + 1.0` |
| `main.js` 冲刺撞击 (line 2379) | `e.radius + 3.0` | `(e.bulletHitRadius \|\| e.radius) + 3.0` |

**Boss 命中也生成粒子特效**（原代码 Boss 分支显式跳过 `explode()`，现已统一）：

```js
// 命中粒子特效：所有敌人（含 Boss）都生成爆炸，暴击时特效更大
explode(b.mesh.position.clone(), isCrit ? 0xffb547 : 0xffffff, isCrit ? 8 : 4, isCrit ? 0.5 : 0.3, false);

if(e.type === 3) {
  // Boss 额外处理：播放节流音效，并立刻强制更新血条UI
  playBossHit();
  if(HUD.bossFill) { ... }
}
```

### 3. 数值选择依据

`bulletHitRadius = 40`：加 +2 子弹缓冲 = 42，覆盖所有变体的主体几何：
- variant 0 虚空之眼：眼球半径 4.5×8=36 ✓
- variant 1 晶簇巨像：主体半径 20-28 ✓（晶刺尖端 44 是细长装饰，命中边缘可接受）
- variant 2 克尔黑洞：吸积盘内圈 ✓（外圈光晕 64+ 是稀薄透明环，子弹穿过合理）
- variant 3 机械神谕：主体半径 32-40 ✓（碎片轨道 54 是分散小球，命中边缘可接受）

**不覆盖**细长/稀疏的外缘装饰（晶刺尖端、碎片轨道、外圈光晕）——这些区域子弹穿过是合理的视觉表现，避免命中球过大导致"没碰到也掉血"。

### 4. 不变项（重要）

- **Boss 撞玩家的伤害判定不改**（`main.js` line ~3017 附近的 `e.radius + 1.5`）：那是 Boss 主动撞击玩家，用 `radius` 保持紧凑判定，避免 Boss 还离玩家很远就触发碰撞伤害，影响游戏平衡。
- **普通敌人的所有碰撞判定不变**：`e.bulletHitRadius` 对普通敌人为 `undefined`，`(undefined || e.radius)` 回退到 `e.radius`，行为完全一致。

### 5. 后续维护提醒

1. **新增 Boss 变体时**：默认 `bulletHitRadius = 40` 已在 boss 字段块统一设置，无需手动添加；若新变体主体几何外径显著不同，可在 variant 分支内覆盖
2. **新增"玩家攻击命中敌人"判定时**：必须用 `(e.bulletHitRadius || e.radius) + buffer` 而非 `e.radius + buffer`
3. **新增"敌人撞击玩家"判定时**：仍用 `e.radius + buffer`，不要用 `bulletHitRadius`（避免 Boss 体型过大导致玩家被远程撞死）

---

## 十六、热路径零损失优化（GC 压力 + 渲染回调清理）

> 2026-07 新增。对游戏每帧热路径（碰撞、开火、HUD 更新、爆炸特效）做零损失优化，减少 `Vector3`/`Quaternion` 分配与 Pixi 重绘。视觉与行为完全一致。

### 1. explode() 的 position.clone() 全部移除（main.js + weapons.js）

**根因**：`explode(pos, ...)`（scene.js:631）仅同步读取 `pos`——把 `pos.x/y/z` 拷贝进粒子对象，`flash.mesh.position.copy(pos)` 拷贝进独立 mesh，**不保留任何引用**。因此传入的 `xxx.position.clone()` 是纯冗余分配。

**改动**：main.js 26 处 + weapons.js 1 处 `explode(xxx.position.clone(), ...)` 改为 `explode(xxx.position, ...)`。涉及子弹/导弹/敌弹命中、突进撞击、自爆、Boss 瞬移等所有爆炸触发点。

**注意**：`shockwaves.push({ center: e.mesh.position.clone() })` **不可省**——`center` 跨帧存储用于后续 `distanceTo(sw.center)`，且对应 mesh 随后被释放/复用，clone 必要。

### 2. setFromUnitVectors 的 clone().normalize() 冗余移除

**根因**：`THREE.Quaternion.setFromUnitVectors(vFrom, vTo)` 不修改入参。当 `vTo` 已是单位向量时，`vTo.clone().normalize()` 既浪费一次 `Vector3` 分配又浪费一次 `Math.sqrt`。

**改动**：
- main.js 5 处 `eb.dir.clone().normalize()` → `eb.dir`（eb.dir 已是单位向量，来自 `toPlayer.normalize()` 或单位向量经旋转）
- main.js 2 处 `_v3.clone().normalize()` → `_v3`（`_v3.set(cos, 0, sin)` 因 cos²+sin²=1 已是单位）
- weapons.js 3 处 `aim/dir.clone().normalize()` → `aim/dir`（aim 来自 `(0,0,-1).applyQuaternion(q)` 单位向量，dir 来自 `_v3.copy(aim).applyQuaternion(_q1)` 单位）

### 3. 开火逻辑复用 _qFire/_vFire（main.js）

**根因**：护盾兵扇射每次 `new THREE.Quaternion()`，分裂者双射每次 `new THREE.Quaternion()`，狙击手/轰炸机 `toPlayer.clone().multiplyScalar(3)` 每发一次 Vector3 分配。

**改动**：main.js 顶部新增模块级临时量：
```js
const _qFire = new THREE.Quaternion();
const _vFire = new THREE.Vector3();
```
- `const q = new THREE.Quaternion().setFromAxisAngle(_vUp, ang/jitter)` → `_qFire.setFromAxisAngle(_vUp, ang/jitter)`
- `toPlayer.clone().multiplyScalar(3)` → `_vFire.copy(toPlayer).multiplyScalar(3)`
- `toPlayer.clone().negate().multiplyScalar(2)` → `_vFire.copy(toPlayer).negate().multiplyScalar(2)`
- 导弹发射 `player.position.clone()` 仅用于一次 `copy` → 直接 `copy(player.position)`

> 保留的 clone：`toPlayer.clone().applyQuaternion(_qFire)`（applyQuaternion 修改入参，toPlayer 是复用的 _v1）、`dir.clone().multiplyScalar(2)`（multiplyScalar 修改入参，dir 后续 eb.dir.copy(dir) 还要用）。

### 4. enemies.js g.onBeforeRender 死代码删除

**根因**：`g` 是 `THREE.Group`。Three.js 的 `WebGLRenderer.projectObject` 只对 `isMesh/isLine/isPoints/isSprite` 调用 `onBeforeRender`，Group 不进 renderList，**`g.onBeforeRender` 永远不触发**。原代码挂的 emissive 呼吸动画（`g.onBeforeRender = function(){...按 sin 调 emissiveIntensity...}`）从未运行，`emissiveIntensity` 一直保持初始值。

**改动**：删除整个 `if(_pulseMats.length > 0){...}` 块 + `_pulseMats` 死收集。**保留** `envMapIntensity = 1.5` 的遍历设置（这部分生效）。视觉零变化（呼吸动画从未运行），且每个敌人创建时省去一次 `g.traverse` 内的 `indexOf` 去重（Boss 50+ mesh 接近 O(n²) 比较）。

> 若未来需要呼吸效果，应挂到 main.js 的敌人每帧更新循环里（参考 bossAnimFn 范式），而非 Group 的 onBeforeRender。

### 5. hud.js Pixi 重绘节流

**根因**：HUD 每帧执行以下操作，即使值未变：
- 等离子蓄能条 `plasmaFill.clear() + rect().fill()` 每帧重建 Graphics 顶点
- `comboText.style.fill = combo>10 ? 0xff2d95 : 0xffb547` 每帧赋值触发 TextStyle dirty
- `lockText.style.fill = lockTimer>=60 ? 0xff3355 : 0xffb547` 同上

**改动**：新增 4 个模块级缓存变量 `lastComboOver10/lastLockDone/lastPlasmaPct/lastPlasmaColor`，仅在状态/值翻转时才执行赋值或重绘。切出等离子炮时重置 `lastPlasmaPct=-1` 确保下次切回强制重绘。视觉完全一致（颜色/形状仅在跨阈值时才变）。

### 6. scene.js explode() 复用模块级 _gfxInit

**根因**：`explode()` 内每次调用 `getGraphics()` 读取 `STATE.graphicsQuality`。但画质切换不热重载（program.md 第五节），所有渲染对象都按 `scene.js` 加载时的 `_gfxInit` 创建。explode 用 `getGraphics()` 会在用户切换画质后读到新 particleMul，与旧画质材质不匹配。

**改动**：`const _gfx = getGraphics();` → `const _gfx = _gfxInit;`。既省函数调用，又保证粒子数与其他渲染对象画质一致。

### 7. audio.js playShieldHit 预渲染噪声缓冲区

**根因**：每次护盾受击都 `audioCtx.createBuffer(1, sampleRate*0.1, sampleRate)` + 填 4410 个随机采样 + 线性衰减包络。衰减包络 `(1 - i/bufferSize)` 是确定性的，整个缓冲区本可复用（参考已有的 `explosionNoiseBuffer` 范式）。

**改动**：新增 `initShieldHitBuffer()` 在 `preRenderSounds()` 中调用，预渲染带衰减包络的 0.1 秒噪声到 `shieldHitNoiseBuffer`。`playShieldHit` 复用 `createBufferSource()` 即可。听感完全一致（0.1 秒高通滤波白噪声的随机性差异不可感知）。

### 8. 后续维护提醒

1. **新增 explode() 调用**：直接传 `xxx.mesh.position`，不要 `.clone()`
2. **新增 setFromUnitVectors 调用**：若 vTo 已是单位向量，直接传，不要 `.clone().normalize()`
3. **新增敌人开火逻辑**：用模块级 `_qFire`/`_vFire` 临时量，不要 `new THREE.Quaternion()` 或 `toPlayer.clone().multiplyScalar()`
4. **新增 HUD 每帧更新**：用 `lastXxx` 缓存守卫，仅在值变化时才赋值/重绘
5. **不要给 THREE.Group 挂 onBeforeRender**：永不触发，属死代码。动画挂到 main.js 每帧循环或 mesh 自身的 onBeforeRender

---

## 十七、屏幕震动解耦 + Toast 时长下限保护

> 2026-07 修复两个用户反馈 bug：(1) 玩家命中/击毁敌人时玩家飞船震动；(2) 晶簇巨像/机械神谕 Boss 招式名只闪一瞬间。

### 1. 屏幕震动从 explode() 解耦（scene.js + main.js）

**Bug 现象**：玩家子弹命中敌人、击毁敌人时，玩家飞船画面会震动。预期：普通命中/击杀不震动，仅重生、游戏结束、Boss 大招等关键事件才震动。

**根因**：`scene.js` 的 `explode(pos, color, count, scale, playSound)`（爆炸粒子 + 闪光特效）内有一行 `STATE.shake = Math.min(STATE.shake + 4*scale, 12);`，**每次调用都无条件叠加屏幕震动**。而玩家命中/击毁敌人时 main.js 会频繁调用 `explode()`，导致震动被错误触发。

**修复**：
1. **scene.js:666 移除无条件 shake**：删除 `STATE.shake = Math.min(STATE.shake + 4*scale, 12);`，改注释说明「屏幕震动已移除：所有需要震动的场景已在调用方显式设置 STATE.shake」。
2. **main.js 补回依赖 explode 副作用的 2 处震动**：
   - `revive()`（line 582）：`STATE.shake = 8; // 应急重生震动（explode 已不再自动加 shake）`
   - 游戏结束分支（line 592）：`STATE.shake = 12; // 游戏结束震动（explode 已不再自动加 shake）`

**STATE.shake 写入点全清单（修复后）**：
- main.js:543 Boss 死亡=20、582 重生=8、592 游戏结束=12、670 重置=0、960 Boss 阶段切换=14、1142 引力波=max2、1574 Boss 瞬移=8、1887 Boss 攻击=6、1950 时间停止=8、2176 Boss 攻击=12、3243 冲击波=max6
- weapons.js:245 护盾命中=max8、260 玩家受击=max14
- scene.js: **0**（已彻底解耦）

**约定**：后续新增爆炸特效若需要震动，必须在调用方显式 `STATE.shake = ...`，不能依赖 `explode()` 自动触发。

### 2. showToast() 时长下限保护（hud.js）

**Bug 现象**：晶簇巨像/机械神谕 Boss 释放大招时，屏幕中央的招式名 toast 只闪一瞬间就消失。

**根因**：`hud.js` 的 `showToast(text, duration=1400)` 用 CSS transition（400ms 淡入）+ setTimeout 切换 `.out` class。但 main.js 11 处 Boss 招式调用传了 `60` 或 `90`（疑似把帧数当毫秒）——duration 远小于 400ms 淡入时长，toast 还没淡入完成就触发淡出，视觉上只闪一瞬间。

**修复**：
1. **hud.js:282 加下限保护**：
   ```js
   function showToast(text, duration=1400){
     // 下限保护：CSS 淡入过渡需 400ms，duration 过短会导致 toast 还没淡入完就淡出（只闪一瞬间）
     if(duration < 500) duration = 1400;
     ...
   }
   ```
2. **main.js 11 处 Boss 招式 toast 时长统一改为 1500ms**：
   - 晶簇巨像：`crystal_spike`/`cluster_resonate`/`crystal_cage`/`prism_refract`/`prism_kaleido`/`cluster_shield`
   - 机械神谕：`time_slow`/`time_reverse`/`time_stop`/`time_rift`/`clock_scan`/`eternal_clock`
   - 原 60/90 → 1500（约 1.5 秒，与 Boss 招式持续时长匹配）

**验证**：grep `showToast.*\b(60|90)\)` 返回 0 匹配；21 处 toast 调用全部使用 1500ms；`node --check` 通过。

**约定**：后续新增 toast 调用 duration 不得低于 500ms（否则会被下限保护强制提升到默认 1400ms）。Boss 招式提示建议 1500ms。

---

## 十八、完美格挡机制（Perfect Block）

> 2026-07 新增。玩家在敌人攻击到来前的一瞬间按下右键开启护盾，触发完美格挡：不消耗能量 + 蓝色能量波清除周围弹幕。含防滥用冷却 + 新手教程。

### 机制设计

| 要素 | 值 | 说明 |
|------|------|------|
| 判定窗口 | 12 帧（约 200ms）| 按下右键瞬间开启，窗口内受到攻击 = 完美格挡成功 |
| 失败冷却 | 60 帧（1 秒）| 窗口结束未触发 = 进入冷却，冷却期间按下右键不开启新判定窗口 |
| 成功冷却 | 0（不进冷却）| 奖励精准时机，但成功仍需敌人攻击到来，无法滥用 |
| 能量波半径 | 28 | 清除以玩家为中心半径 28 内的所有敌方弹幕 |
| 护盾高亮 | 30 帧 | 成功后护盾 mesh uOpacity=1.0 持续 30 帧 |

**防滥用设计**：
1. 判定窗口只在"按下右键瞬间"（shieldActive false→true）开启，按住右键期间不会重复开启
2. 失败冷却（60 帧）> 判定窗口（12 帧），防止连续快速点按
3. 冷却期间仍可开普通护盾（消耗能量），但不触发完美格挡判定
4. 判定窗口独立于护盾是否持续——玩家点一下右键就松开，窗口内受到攻击仍算完美格挡

### 状态字段（state.js）

```js
perfectBlockWindow: 12,        // 判定窗口（帧）
perfectBlockTimer: 0,          // 当前窗口剩余帧（>0 表示在判定窗口内）
perfectBlockCooldown: 60,      // 失败冷却（帧），必须 > perfectBlockWindow
perfectBlockCooldownTimer: 0,  // 当前冷却剩余帧（>0 表示在冷却中）
perfectBlockRadius: 28,        // 能量波清除弹幕半径
perfectBlockFlash: 0,          // 成功后护盾高亮特效计时器（帧）
```

### 触发流程

**1. 开启判定窗口（main.js 护盾段，shieldActive false→true 瞬间）**：
```js
if (!STATE.shieldActive) {
  STATE.shieldActive = true;
  playShieldOn();
  // 完美格挡：按下右键瞬间开启判定窗口（不在冷却中时）
  if(STATE.perfectBlockCooldownTimer <= 0) {
    STATE.perfectBlockTimer = STATE.perfectBlockWindow;
  }
}
```

**2. 计时器更新（main.js 护盾段末尾，每帧）**：
```js
if(STATE.perfectBlockTimer > 0) {
  STATE.perfectBlockTimer--;
  if(STATE.perfectBlockTimer === 0) {
    // 判定窗口结束未触发 → 进入失败冷却
    STATE.perfectBlockCooldownTimer = STATE.perfectBlockCooldown;
  }
}
if(STATE.perfectBlockCooldownTimer > 0) STATE.perfectBlockCooldownTimer--;
if(STATE.perfectBlockFlash > 0) STATE.perfectBlockFlash--;
```

**3. 完美格挡判定（weapons.js damagePlayer，在护盾判定之前）**：
```js
if(STATE.perfectBlockTimer > 0) {
  STATE.perfectBlockTimer = 0;        // 消耗判定窗口
  STATE.perfectBlockFlash = 30;       // 护盾高亮特效
  STATE.flash = 0.5; STATE.flashColor = 0x00ffff;  // 青色强闪
  STATE.shake = Math.min(STATE.shake + 4, 10);
  triggerPerfectBlockWave();          // 清除周围弹幕 + 能量波视觉
  playPerfectBlock();                 // 特殊音效
  if(STATE.isTutorial && TUTORIAL.step === 8) TUTORIAL.perfectBlockDone = true;
  return;                             // 不扣血、不消耗能量
}
```

**关键**：完美格挡判定必须在普通护盾判定**之前**，确保窗口内即使能量不足也能触发（不消耗能量是完美格挡的核心奖励）。

### 能量波（main.js triggerPerfectBlockWave）

```js
function triggerPerfectBlockWave(){
  const radius = STATE.perfectBlockRadius;
  // 1. 清除周围敌方弹幕（含追踪弹/炸弹弹/分裂弹）
  for(let i=enemyBullets.length-1; i>=0; i--){
    const b = enemyBullets[i];
    if(b.mesh.position.distanceTo(player.position) < radius){
      explode(b.mesh.position, 0x00ffff, 6, 0.6, false);  // 小型青色爆炸
      b.splitPattern = null; b.mesh.scale.set(1,1,1);
      releaseEnemyBullet(b); enemyBullets.splice(i, 1);
    }
  }
  // 2. 蓝色能量波视觉（复用 shockwave 系统，hit=true 不检测碰撞，damage=0 不造成伤害）
  const sw = getShockwave(0x00ffff);
  sw.mesh.position.copy(player.position);
  shockwaves.push({ mesh: sw.mesh, radius: 3, speed: 2.5, maxRadius: radius,
    hit: true, damage: 0, center: player.position.clone() });
}
```

### 音效（audio.js playPerfectBlock）

- 高音"叮"（sine 2400→3200Hz 上扬 0.3s）— 清脆成功反馈
- 低频能量爆发（sawtooth 120→40Hz 下沉 0.4s）— 蓝色能量波扩散冲击感
- 区别于普通护盾受击（playShieldHit 的 triangle 1800→800Hz + 高通噪声）

### 新手教程（tutorial.js）

**TUT_DATA 新增 step 8「完美格挡」**（原 step 8-11 顺延为 9-12，总数 12→13）：

| step | 标题 | 完成条件 |
|------|------|----------|
| 7 | 护盾防御 | 开盾后存活 5 秒（不变）|
| **8** | **完美格挡（新增）** | **成功触发一次完美格挡（perfectBlockDone=true）+ 缓冲 60 帧** |
| 9 | 引擎加速（原 8）| 持续加速 3 秒 |
| 10 | 谐振突进（原 9）| 突进一次 + 缓冲 60 帧 |
| 11 | 躲避弹幕（原 10）| 存活 10 秒 |
| 12 | 教程完成（原 11）| — |

**spawnTutorialPerfectBlockEnemy**：生成 1 个慢速炮台（射击间隔 80 帧、子弹速度 1.2、伤害 8），供玩家练习完美格挡时机。阵亡则重置该步。

**教程检测点**：weapons.js damagePlayer 完美格挡分支内 `if(STATE.isTutorial && TUTORIAL.step === 8) TUTORIAL.perfectBlockDone = true;`——只有玩家真正触发完美格挡才算成功。

### 视觉反馈

- **护盾高亮**：成功后 30 帧 uOpacity=1.0（覆盖正常呼吸效果 0.15）
- **屏幕闪光**：青色强闪（0x00ffff，强度 0.5）
- **屏幕震动**：+4（上限 10）
- **能量波**：青色球面扩散（半径 3→28，speed 2.5/帧）
- **弹幕清除**：每个被清除的弹幕生成 6 粒子青色小爆炸

### 后续维护约定

1. **新增完美格挡触发点**：只在 damagePlayer 内判定，不要在其他伤害入口重复判定
2. **调整难度**：改 `perfectBlockWindow`（窗口）和 `perfectBlockCooldown`（冷却），但冷却必须 > 窗口
3. **教程步骤调整**：step 8 是完美格挡，如需插入新步骤注意 case 编号联动（main.js:2435 的 step===7 是护盾，weapons.js:251 的 step===8 是完美格挡）

---

## 十九、敌方子弹池复用污染修复

> 2026-07 修复。敌方子弹速度异常（有的异常快、有的悬停喷弹），特别是突击手子弹。

### 根因

`scene.js` 的 `releaseEnemyBullet(b)` 回收子弹时只重置了 `isHoming`/`isBomb`/`scale`/`visible`，**未重置 `isPrism`/`prismRefractTimer`**。

棱镜子弹（晶簇巨像 Boss 的 `startPrismRefraction` 创建，`isPrism=true`）被回收后，池中对象保留 `isPrism=true`。之后任意 `getEnemyBullet()` 复用到该污染对象时（环形弹幕、突击手预判弹、分裂子弹等），新子弹继承 `isPrism=true`，而普通子弹的生成代码不碰 `isPrism`。

晶簇巨像 Boss 每帧调用 `updatePrismRefractionBullets()`（main.js:1763），遍历 `enemyBullets` 检查 `b.isPrism && b.prismRefractTimer > 0`，被污染的普通子弹也会触发折射 —— 每 35 帧从当前位置喷射 4 发 `speed=3.0` 的折射弹，并链式扩散。

**症状对应**：
- "速度异常快"：被污染的慢速子弹（轰炸机 1.2、突击手 2.0）在飞行中每 35 帧喷出 4 发 speed=3.0 折射弹，相对父子弹明显异常快
- "悬停喷弹"：父子弹速度慢但 life 长，在持续喷射折射弹的对比下显得悬停在空中喷子弹

### 修复

**scene.js releaseEnemyBullet**（line 582-595）— 补全所有动态字段重置：
```js
function releaseEnemyBullet(b){
  b.mesh.visible=false;
  b.mesh.scale.set(1, 1, 1);
  b.isHoming = false;
  b.isBomb = false;
  // 重置棱镜/追踪/炸弹等所有动态字段，防止池复用污染
  b.isPrism = false;
  b.prismRefractTimer = 0;
  b.homingTime = 0;
  b.bombDamage = 0;
  b.splitPattern = null;
  eBulletPool.push(b);
}
```

**main.js 突击手子弹 life**（line 3069）— `1000` → `300`：
- 原 life=1000 是其他敌人（60-500）的 2-3 倍
- speed=2.0 × life=1000 = 飞行 2000 单位、存活约 16 秒，远超战场尺度
- 长寿命慢子弹长时间滞留屏幕，加剧"悬停"观感
- 改为 300，与同区域其他敌人（300-500）一致

### 验证确认（非根因，无需修改）

排查报告确认以下均正确，不是速度 bug 来源：
- 所有弹幕生成器（spawnRingBarrage/spawnAimedBarrage 等 7 个）的 `speed` 赋值和 `dir` 归一化均正确
- 突击手预判算法（inline 版 + spawnAimedBarrage）数学正确，`t` 只用于计算 `aimPoint`，不回写 `speed`
- 更新循环不修改 `b.speed`，追踪弹 `lerp` 不改变速度大小
- 时间停止/倒流有正确归零，不会卡死
- 各敌人 `bulletSpeed` 定义合理（0.8-2.2），无未设置或过大值

### 约定

**对象池回收函数必须重置所有动态字段**。后续新增子弹动态字段时，必须同步在 `releaseEnemyBullet` 中添加重置，否则池复用会导致属性污染。受影响字段清单：`isHoming`/`isBomb`/`isPrism`/`prismRefractTimer`/`homingTime`/`bombDamage`/`splitPattern`。

