// scene.js — Three.js 场景、相机、渲染器、星空、星球、对象池、粒子系统
/* ============== Three.js 场景 ============== */
const scene = new THREE.Scene();
// 雾效根据画质等级配置：画质 0(无) 关闭雾效
const _gfxInit = getGraphics();
scene.fog = _gfxInit.fog ? new THREE.FogExp2(0x05060d, _gfxInit.fogDensity) : null;
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 5000);
camera.position.set(0, 1.5, 7);

const renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, antialias:false, powerPreference:'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x05060d, 1);

// ===== 环境贴图 (Environment Map) — 极致画质 PBR 反射的关键 =====
// 没有环境贴图时，metalness>0 的 PBR 材质(Standard/Physical)会因"无物可反射"而发黑发暗，
// 这是普通敌人在高/极致画质下"看不出反射效果"的根本原因。
// 这里用 Canvas 程序化生成一张太空星云渐变 equirect 贴图，再用 PMREMGenerator 预滤波，
// 挂到 scene.environment 上，让所有 PBR 材质自动获得反射/间接光照。
// 画质 0/1(无 PBR)时跳过，节省内存与初始化开销。
function _buildSpaceEnvTexture(){
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  // 1. 底色：深蓝灰(比纯黑略亮)，给金属一个基础反射，避免大部分角度"反射到黑"
  const bg = ctx.createLinearGradient(0, 0, 0, 256);
  bg.addColorStop(0, '#181830');
  bg.addColorStop(0.5, '#101020');
  bg.addColorStop(1, '#181830');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 256);
  // 2. 星云团块 (青/品红/橙/蓝/紫)，更亮更密，提供丰富的反射色彩
  const nebulaColors = ['rgba(95,55,150,0.6)','rgba(55,95,170,0.55)','rgba(165,75,55,0.5)','rgba(75,135,115,0.45)','rgba(125,65,145,0.5)'];
  for(let i=0; i<32; i++){
    const x = Math.random()*512, y = Math.random()*256;
    const r = 40 + Math.random()*90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, nebulaColors[i % nebulaColors.length]);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  }
  // 3. 亮星点 (高亮反射源)，更多更亮，模拟恒星在金属表面的点状高光
  for(let i=0; i<200; i++){
    const x = Math.random()*512, y = Math.random()*256;
    const r = Math.random()*2.0 + 0.5;
    const b = 0.7 + Math.random()*0.3;
    ctx.fillStyle = `rgba(255,255,255,${b})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  }
  // 4. 主光源亮斑 (右上，更大更亮)，与场景 DirectionalLight 方向一致
  //    半径做大到 230、核心更亮更白，让金属在更多角度都能反射到强高光 → 金属感 + 整体变亮
  const sun = ctx.createRadialGradient(420, 50, 0, 420, 50, 230);
  sun.addColorStop(0, 'rgba(255,250,235,1.0)');
  sun.addColorStop(0.25, 'rgba(255,235,190,0.85)');
  sun.addColorStop(0.5, 'rgba(255,200,130,0.5)');
  sun.addColorStop(0.75, 'rgba(255,160,90,0.2)');
  sun.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sun;
  ctx.beginPath(); ctx.arc(420, 50, 230, 0, Math.PI*2); ctx.fill();
  // 5. 次光源 (左下，冷蓝补光)，增加反射的明暗对比与色彩层次，强化金属方向性高光
  const fill = ctx.createRadialGradient(90, 210, 0, 90, 210, 110);
  fill.addColorStop(0, 'rgba(130,170,255,0.7)');
  fill.addColorStop(0.5, 'rgba(80,120,200,0.3)');
  fill.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.arc(90, 210, 110, 0, Math.PI*2); ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
// 仅在 PBR 画质(2/3/4)下生成环境贴图；画质 0/1 无 PBR 材质，跳过以省内存
// getGraphics().material 取值为 'basic'/'phong'/'standard'/'physical' (见 program.md 预设表)
if(_gfxInit.material === 'standard' || _gfxInit.material === 'physical'){
  const _pmrem = new THREE.PMREMGenerator(renderer);
  _pmrem.compileEquirectangularShader();
  const _envTex = _buildSpaceEnvTexture();
  scene.environment = _pmrem.fromEquirectangular(_envTex).texture;
  _envTex.dispose();
  _pmrem.dispose();
  // 注意：不设置 scene.background，保持原有的纯黑深空背景 + 星空粒子
}

// ===== 后处理：Bloom 辉光效果 =====
const composer = new THREE.EffectComposer(renderer);
composer.setPixelRatio(1);
composer.setSize(window.innerWidth, window.innerHeight);
const renderPass = new THREE.RenderPass(scene, camera);
composer.addPass(renderPass);
const bloomPass = new THREE.UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.8,   // strength：辉光强度
  0.4,   // radius：辉光扩散范围
  0.85   // threshold：亮度阈值，只有亮度高于此值的像素才产生辉光
);
composer.addPass(bloomPass);

// ===== 暗角效果：画面边缘变暗，增强电影感 =====
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset:   { value: 1.0 },  // 暗角范围，越大暗角越小
    darkness: { value: 0.8 }   // 暗角强度，越大越暗
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float offset;
    uniform float darkness;
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - 0.5) * vec2(offset);
      gl_FragColor = vec4(mix(texel.rgb, vec3(0.0), dot(uv, uv) * darkness), texel.a);
    }
  `
};
const vignettePass = new THREE.ShaderPass(VignetteShader);
vignettePass.renderToScreen = true;
composer.addPass(vignettePass);

const _hemiLight = makeQualityHemiLight(0x6688ff, 0x080410, 0.6);
if (_hemiLight) scene.add(_hemiLight);
const keyLight = makeQualityDirLight(0x00ffe5, 0.8);
if (keyLight) { keyLight.position.set(8, 14, 10); scene.add(keyLight); }
// 太阳光：暖白色平行光，方向对齐场景里真正的太阳 mesh(3000,1800,-2000)，
// 让玩家看到"光是从天上那个太阳发出来的"，而不是从相反方向。
// 颜色与太阳 mesh 的 0xfff4cc 一致；用工厂遵循画质分级(画质0返回null)，并做 null 检查。
// 强度 4.5（Three.js r155+ 物理光照单位下的阳光量级），确保深色机身也能被充分照亮。
const sunLight = makeQualityDirLight(0xfff4cc, 4.5);
if (sunLight) { sunLight.position.set(30, 18, -20); scene.add(sunLight); }
const rimLight = makeQualityLight(0xff2d95, 1.2, 200);
if (rimLight) { rimLight.position.set(-20, 4, -30); scene.add(rimLight); }

/* --- 星空 --- */
function createStarfield(count, distance, size){
  const N = count;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N*3), col = new Float32Array(N*3);
  for(let i=0;i<N;i++){
    const r = distance + Math.random()*distance*0.5;
    const theta = Math.random()*Math.PI*2;
    const phi = Math.acos(Math.random()*2-1);
    pos[i*3]=r*Math.sin(phi)*Math.cos(theta); pos[i*3+1]=r*Math.sin(phi)*Math.sin(theta); pos[i*3+2]=r*Math.cos(phi);
    const c = Math.random();
    if(c<0.7){ col[i*3]=1; col[i*3+1]=1; col[i*3+2]=1; }
    else if(c<0.85){ col[i*3]=0.4; col[i*3+1]=0.9; col[i*3+2]=1; }
    else { col[i*3]=1; col[i*3+1]=0.5; col[i*3+2]=0.8; }
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  geo.setAttribute('color', new THREE.BufferAttribute(col,3));
  const mat = new THREE.PointsMaterial({ size, vertexColors:true, transparent:true, opacity:0.9,
    blending:THREE.AdditiveBlending, depthWrite:false });
  return new THREE.Points(geo, mat);
}
// 根据画质等级的 particleMul 调整星空粒子数量，但保留最低数量以维持背景
const _starFarCount = Math.max(500, Math.floor(2500 * _gfxInit.particleMul));
const starsFar = createStarfield(_starFarCount, 1500, 2.5);
scene.add(starsFar);

const _starNearCount = Math.max(200, Math.floor(1000 * _gfxInit.particleMul));
const starsNear = createStarfield(_starNearCount, 800, 1.5);
scene.add(starsNear);

/* --- 丰富星云 --- */
const tex = new THREE.CanvasTexture((()=>{
  const c=document.createElement('canvas'); c.width=c.height=256;
  const ctx=c.getContext('2d');
  const g=ctx.createRadialGradient(128,128,0,128,128,128);
  g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.3,'rgba(180,220,255,0.5)'); g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,256,256); return c;
})());
const nebulaColors = [0x00aaff, 0xff2d95, 0x6a3aff, 0x00ffe5, 0xff8800];
// 至少保留 3 个星云，避免低画质下背景过于空旷
const _nebulaCount = Math.max(3, Math.floor(12 * _gfxInit.particleMul));
for(let i=0;i<_nebulaCount;i++){
    const m = new THREE.SpriteMaterial({
        map:tex, 
        color:nebulaColors[i%5], 
        transparent:true, 
        opacity:0.15, 
        blending:THREE.AdditiveBlending, 
        depthWrite:false
    });
    const s = new THREE.Sprite(m);
    s.position.set((Math.random()-0.5)*1600, (Math.random()-0.5)*800, -400-Math.random()*1000);
    const sc=400+Math.random()*400;
    s.scale.set(sc,sc,1);
    scene.add(s);
}

/* --- 远方星球（依剧情设定：火星殖民地 / 木星轨道站 / 木卫四 / 土星环） --- */
// 程序化生成星球表面纹理（Canvas绘制 → CanvasTexture）
function makePlanetTexture(opts){
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  // 底色
  ctx.fillStyle = opts.baseColor;
  ctx.fillRect(0, 0, 512, 256);
  // 横向条纹（气态巨行星）
  if(opts.bands){
    for(const b of opts.bands){
      ctx.fillStyle = b.color;
      ctx.fillRect(0, b.y, 512, b.h);
    }
    // 条纹边缘做柔和过渡（轻微模糊）
    if(opts.bandsBlurry){
      ctx.globalCompositeOperation = 'source-over';
      for(let i=0;i<30;i++){
        const y = Math.random()*256;
        ctx.fillStyle = `rgba(${opts.bandsBlurry.r},${opts.bandsBlurry.g},${opts.bandsBlurry.b},0.08)`;
        ctx.fillRect(0, y, 512, 4+Math.random()*8);
      }
    }
  }
  // 陨石坑/斑点（岩质星球）
  if(opts.craters){
    for(let i=0;i<opts.craters;i++){
      const x = Math.random()*512;
      const y = Math.random()*256;
      const r = Math.random()*10 + 2;
      ctx.fillStyle = opts.craterColor;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI*2);
      ctx.fill();
      // 高光边
      ctx.fillStyle = opts.craterHighlight || 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.arc(x-1, y-1, r*0.8, 0, Math.PI*2);
      ctx.fill();
    }
  }
  // 极冠（火星）
  if(opts.polarCap){
    const grad = ctx.createLinearGradient(0, 0, 0, 30);
    grad.addColorStop(0, opts.polarCap);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 30);
    const grad2 = ctx.createLinearGradient(0, 226, 0, 256);
    grad2.addColorStop(0, 'rgba(255,255,255,0)');
    grad2.addColorStop(1, opts.polarCap);
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 226, 512, 30);
  }
  // 大红斑（木星）
  if(opts.redSpot){
    ctx.fillStyle = opts.redSpot;
    ctx.beginPath();
    ctx.ellipse(360, 155, 30, 14, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,80,40,0.5)';
    ctx.beginPath();
    ctx.ellipse(360, 155, 22, 10, 0, 0, Math.PI*2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

// 收集所有需要自转的星球，供更新循环使用
const distantPlanets = [];

// 火星 — 火星殖民地失去联系
const marsTex = makePlanetTexture({
  baseColor: '#a04020',
  craterColor: 'rgba(70,25,12,0.65)',
  craters: 90,
  polarCap: 'rgba(245,235,220,0.9)'
});
const mars = new THREE.Mesh(
  new THREE.SphereGeometry(85, 32, 32),
  makeQualityMaterial({
    map: marsTex, roughness: 0.95, metalness: 0.0,
    emissive: 0xffffff, emissiveMap: marsTex, emissiveIntensity: 0.55,
    fog: false
  })
);
mars.position.set(-2000, 400, -2200); // 屏幕左前上方
mars.rotation.z = 0.25;
scene.add(mars);
distantPlanets.push({ mesh: mars, speed: 0.0008 });

// 木星 — 木星轨道站报告大规模舰体损毁
const jupiterTex = makePlanetTexture({
  baseColor: '#d8b890',
  bands: [
    { y: 0,   h: 28, color: '#b89868' },
    { y: 28,  h: 22, color: '#e8c898' },
    { y: 50,  h: 18, color: '#a88858' },
    { y: 68,  h: 28, color: '#d8b890' },
    { y: 96,  h: 22, color: '#988058' },
    { y: 118, h: 32, color: '#e0c0a0' },
    { y: 150, h: 24, color: '#b89868' },
    { y: 174, h: 28, color: '#d8b890' },
    { y: 202, h: 22, color: '#a88858' },
    { y: 224, h: 32, color: '#c8a878' }
  ],
  bandsBlurry: { r: 200, g: 170, b: 120 },
  redSpot: '#b03020'
});
const jupiter = new THREE.Mesh(
  new THREE.SphereGeometry(220, 48, 48),
  makeQualityMaterial({
    map: jupiterTex, roughness: 0.9, metalness: 0.0,
    emissive: 0xffffff, emissiveMap: jupiterTex, emissiveIntensity: 0.5,
    fog: false
  })
);
jupiter.position.set(2800, -300, -3000); // 屏幕右前下方
scene.add(jupiter);
distantPlanets.push({ mesh: jupiter, speed: 0.0015 });

// 木卫四 — 木卫四殖民地正在遭受攻击
const callistoTex = makePlanetTexture({
  baseColor: '#7a6e60',
  craterColor: 'rgba(35,30,25,0.75)',
  craterHighlight: 'rgba(180,165,145,0.15)',
  craters: 140
});
const callisto = new THREE.Mesh(
  new THREE.SphereGeometry(55, 32, 32),
  makeQualityMaterial({
    map: callistoTex, roughness: 1.0, metalness: 0.0,
    emissive: 0xffffff, emissiveMap: callistoTex, emissiveIntensity: 0.5,
    fog: false
  })
);
callisto.position.set(3300, 0, -2800); // 紧邻木星轨道，符合"木卫四"设定
scene.add(callisto);
distantPlanets.push({ mesh: callisto, speed: 0.0006 });

// 土星 — 土星环是最后的矿产资源基地
const saturnTex = makePlanetTexture({
  baseColor: '#d8c090',
  bands: [
    { y: 0,   h: 36, color: '#c0a878' },
    { y: 36,  h: 32, color: '#e8d0a0' },
    { y: 68,  h: 38, color: '#d0b888' },
    { y: 106, h: 38, color: '#eed8a8' },
    { y: 144, h: 32, color: '#c8b080' },
    { y: 176, h: 38, color: '#d8c090' },
    { y: 214, h: 42, color: '#b8a070' }
  ],
  bandsBlurry: { r: 220, g: 195, b: 145 }
});
const saturn = new THREE.Mesh(
  new THREE.SphereGeometry(180, 48, 48),
  makeQualityMaterial({
    map: saturnTex, roughness: 0.9, metalness: 0.0,
    emissive: 0xffffff, emissiveMap: saturnTex, emissiveIntensity: 0.5,
    fog: false
  })
);
saturn.position.set(0, 600, -4000); // 屏幕正前上方远处（与火星、木星方位完全错开）
saturn.rotation.z = 0.42; // 土星轴倾角
scene.add(saturn);
distantPlanets.push({ mesh: saturn, speed: 0.0012 });

// 土星环（多层同心环模拟密度变化 + 卡西尼缝）— 按土星新半径 180 等比放大
const saturnRingGroup = new THREE.Group();
saturnRingGroup.position.copy(saturn.position);
saturnRingGroup.rotation.z = 0.42; // 与土星轴倾角一致
const ringConfigs = [
  { inner: 220, outer: 245, opacity: 0.55, color: 0xc8b078 }, // C环
  { inner: 245, outer: 275, opacity: 0.75, color: 0xe8d098 }, // B环（最亮）
  { inner: 275, outer: 290, opacity: 0.18, color: 0xa89058 }, // 卡西尼缝
  { inner: 290, outer: 335, opacity: 0.65, color: 0xd8c088 }, // A环
  { inner: 335, outer: 360, opacity: 0.30, color: 0xb89858 }  // F环外缘
];
for(const cfg of ringConfigs){
  const ringMesh = new THREE.Mesh(
    new THREE.RingGeometry(cfg.inner, cfg.outer, 96),
    new THREE.MeshBasicMaterial({
      color: cfg.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: cfg.opacity,
      depthWrite: false,
      fog: false // 土星环也不受雾影响
    })
  );
  ringMesh.rotation.x = Math.PI / 2; // 水平铺开
  saturnRingGroup.add(ringMesh);
}
scene.add(saturnRingGroup);

/* --- 太阳 --- */
// 太阳是太阳系的中心恒星，放在右上前方远处（与场景主光源 DirectionalLight 方向一致）
// 程序化绘制太阳表面：底色亮橙黄 + 黑子 + 颗粒高光
function makeSunTexture(){
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  // 底色：明亮的橙黄
  const baseGrad = ctx.createLinearGradient(0, 0, 0, 256);
  baseGrad.addColorStop(0, '#ffd840');
  baseGrad.addColorStop(0.5, '#ffb020');
  baseGrad.addColorStop(1, '#ff8800');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 512, 256);
  // 颗粒高光（亮黄斑）— 模拟太阳米粒组织
  for(let i=0; i<180; i++){
    const x = Math.random()*512;
    const y = Math.random()*256;
    const r = Math.random()*8 + 2;
    ctx.fillStyle = `rgba(255, 240, 150, ${0.3 + Math.random()*0.4})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fill();
  }
  // 黑子（深色斑点）
  for(let i=0; i<15; i++){
    const x = Math.random()*512;
    const y = Math.random()*256;
    const r = Math.random()*6 + 3;
    ctx.fillStyle = 'rgba(120, 40, 0, 0.7)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = 'rgba(80, 20, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(x, y, r*0.6, 0, Math.PI*2);
    ctx.fill();
  }
  // 高亮耀斑（局部超亮区）
  for(let i=0; i<8; i++){
    const x = Math.random()*512;
    const y = Math.random()*256;
    const r = Math.random()*15 + 8;
    const flare = ctx.createRadialGradient(x, y, 0, x, y, r);
    flare.addColorStop(0, 'rgba(255, 255, 220, 0.8)');
    flare.addColorStop(1, 'rgba(255, 255, 220, 0)');
    ctx.fillStyle = flare;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}
const sunTex = makeSunTexture();
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(280, 48, 48),
  new THREE.MeshBasicMaterial({
    map: sunTex,
    color: 0xfff4cc, // 整体偏亮，让Bloom辉光阈值（0.85）能触发
    fog: false
  })
);
sun.position.set(3000, 1800, -2000); // 右上前方远处，与 DirectionalLight 方向一致
scene.add(sun);
distantPlanets.push({ mesh: sun, speed: 0.0004 }); // 太阳缓慢自转

// 日冕光晕：多层透明球壳，从内到外逐渐变暗变大
const coronaConfigs = [
  { radius: 310, color: 0xffaa44, opacity: 0.35 }, // 内层日冕（橙黄）
  { radius: 360, color: 0xff7722, opacity: 0.22 }, // 中层日冕（橙红）
  { radius: 430, color: 0xff4400, opacity: 0.12 }  // 外层日冕（暗红）
];
for(const cfg of coronaConfigs){
  const corona = new THREE.Mesh(
    new THREE.SphereGeometry(cfg.radius, 32, 32),
    new THREE.MeshBasicMaterial({
      color: cfg.color,
      side: THREE.BackSide, // 只渲染背面，让光晕环绕在太阳周围
      transparent: true,
      opacity: cfg.opacity,
      blending: THREE.AdditiveBlending, // 加法混合，让光晕发光
      depthWrite: false,
      fog: false
    })
  );
  corona.position.copy(sun.position);
  scene.add(corona);
}

/* --- 对象池：玩家子弹 --- */
const bullets = [];
const bulletPool = [];
function getBullet(){
  if(bulletPool.length){ 
    const b = bulletPool.pop(); 
    b.mesh.visible = true;
    b.mesh.scale.set(1, 1, 1);
    b.isPlasma = false;
    b.isPellet = false;
    b._hitSet = null;
    return b;
  }
  const geo = new THREE.CylinderGeometry(0.15, 0.15, 1.4, 6);
  geo.rotateX(Math.PI / 2); // <--- 新增：直接将几何体放平，长轴对准Z轴
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color:0x00ffe5 }));
  
  const trailGeo = new THREE.CylinderGeometry(0.3, 0.04, 3, 6, 1, true);
  trailGeo.rotateX(Math.PI / 2); // <--- 新增：尾焰也放平
  const trail = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ color:0x00ffe5, transparent:true, opacity:0.4, blending:THREE.AdditiveBlending, depthWrite:false }));
  trail.position.z = -2; // <--- 修改：因为放平了，尾焰位移改为Z轴负方向
  m.add(trail);
  scene.add(m);
  return { mesh:m, dir:new THREE.Vector3(), speed:2.0, life:200, dmg:1, isPlasma:false, isPellet:false };
}
function releaseBullet(b){ b.mesh.visible = false; b.mesh.scale.set(1, 1, 1); bulletPool.push(b); }

/* --- 对象池：追踪导弹 --- */
const missiles = [];
const missilePool = [];
function getMissile(){
  if(missilePool.length){ const m = missilePool.pop(); m.mesh.visible = true; return m; }
  const geo = new THREE.SphereGeometry(0.35, 8, 8);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color:0xffb547 }));
  const trailGeo = new THREE.CylinderGeometry(0.5, 0.1, 4, 6, 1, true);
  trailGeo.rotateX(Math.PI / 2);
  const trail = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ color:0xff8800, transparent:true, opacity:0.6, blending:THREE.AdditiveBlending, depthWrite:false }));
  trail.position.z = -2; m.add(trail); m.userData.trail = trail;
  scene.add(m);
  return { mesh:m, target:null, dir:new THREE.Vector3(), speed:8.0, life:600, dmg:5 }; // 修改这里
}
function releaseMissile(m){ m.mesh.visible = false; missilePool.push(m); }

/* --- 对象池：敌方子弹 --- */
const enemyBullets = [];
const shockwaves = [];
// 冲击波对象池：复用 geometry 和 mesh，避免频繁创建/销毁
const _shockwaveGeo = new THREE.SphereGeometry(1, 16, 16);
const shockwavePool = [];
function getShockwave(color){
  let sw;
  if(shockwavePool.length){
    sw = shockwavePool.pop();
    sw.mesh.visible = true;
  } else {
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    sw = { mesh: new THREE.Mesh(_shockwaveGeo, mat) };
    scene.add(sw.mesh);
  }
  sw.mesh.material.color.setHex(color);
  sw.mesh.material.opacity = 0.5;
  sw.mesh.scale.setScalar(1);
  return sw;
}
function releaseShockwave(sw){
  sw.mesh.visible = false;
  shockwavePool.push(sw);
}
const eBulletPool = [];
function getEnemyBullet(color){
  if(eBulletPool.length){ 
    const b=eBulletPool.pop(); 
    b.mesh.visible=true; 
    b.mesh.material.color.setHex(color);
    if(b.mesh.userData.trail) b.mesh.userData.trail.material.color.setHex(color);
    return b; 
  }
  const geo = new THREE.CylinderGeometry(0.12, 0.12, 1.0, 5);
  geo.rotateX(Math.PI / 2); // <--- 新增：放平
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color:color||0xff2d95 }));
  
  const trailGeo = new THREE.CylinderGeometry(0.25, 0.04, 2.5, 5, 1, true);
  trailGeo.rotateX(Math.PI / 2); // <--- 新增：放平
  const trail = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ color:color||0xff2d95, transparent:true, opacity:0.4, blending:THREE.AdditiveBlending, depthWrite:false }));
  trail.position.z = -1.5; // <--- 修改：位移改Z轴
  m.add(trail); m.userData.trail = trail;
  scene.add(m);
  return { mesh:m, dir:new THREE.Vector3(), speed:0.8, life:1000, isHoming:false }; // <--- 新增 isHoming: false
}


function releaseEnemyBullet(b){
  b.mesh.visible=false;
  b.mesh.scale.set(1, 1, 1);
  b.isHoming = false; // <--- 新增这一行：回收时关闭追踪属性
  b.isBomb = false;   // 回收时关闭炸弹属性
  // 重置棱镜/追踪/炸弹等所有动态字段，防止池复用污染
  // 根因：棱镜子弹 isPrism=true 回收后未清零，复用到普通子弹会触发 updatePrismRefractionBullets
  // 每帧喷射 speed=3.0 折射弹，导致"有的子弹异常快、有的悬停喷弹"
  b.isPrism = false;
  b.prismRefractTimer = 0;
  b.homingTime = 0;
  b.bombDamage = 0;
  b.splitPattern = null;
  eBulletPool.push(b);
}

/* --- 粒子系统 --- */
const MAX_PARTICLES = 600;
const particleGeo = new THREE.BufferGeometry();
const particlePos = new Float32Array(MAX_PARTICLES*3);
const particleCol = new Float32Array(MAX_PARTICLES*3);
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos,3));
particleGeo.setAttribute('color', new THREE.BufferAttribute(particleCol,3));

// ===== 圆形发光粒子纹理（Canvas 生成） =====
function createParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0,   'rgba(255,255,255,1)');
  grad.addColorStop(0.2, 'rgba(255,255,255,0.8)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.3)');
  grad.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

const particleMat = new THREE.PointsMaterial({
  size: 2.5,
  map: createParticleTexture(),
  vertexColors: true,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true
});

const particleSystem = new THREE.Points(particleGeo, particleMat);
particleSystem.frustumCulled = false; // 禁用视锥剔除，防止粒子被错误剔除
scene.add(particleSystem);
const particles = [];
const flashPool = [];
const activeFlashes = [];

function explode(pos, color=0x00ffe5, count=16, scale=1, playSound=true){
    _color.setHex(color);
    // 画质配置：复用模块级 _gfxInit（画质切换不热重载，所有渲染对象都按 _gfxInit 创建，
    // 粒子数也应用 _gfxInit.particleMul 保持一致，避免新画质粒子数与旧画质材质不匹配）
    const _gfx = _gfxInit;
    const _actualCount = Math.floor(count * _gfx.particleMul);
    
    for(let i=0;i<_actualCount && particles.length<MAX_PARTICLES;i++){
      particles.push({ x:pos.x, y:pos.y, z:pos.z,
      vx:(Math.random()-0.5)*0.8*scale, vy:(Math.random()-0.5)*0.8*scale, vz:(Math.random()-0.5)*0.8*scale,
      r:_color.r, g:_color.g, b:_color.b, life:30+Math.random()*10, maxLife:35 });
  }
    // 仅在非画质 0（particleMul > 0）时生成闪光特效
    let flash;
    if (_gfx.particleMul > 0) {
        if(flashPool.length){
            flash=flashPool.pop();
            flash.mesh.visible=true;
        } else {
            flash = {
                mesh:new THREE.Mesh(new THREE.SphereGeometry(1,12,12), new THREE.MeshBasicMaterial({
                    color, transparent:true, opacity:0.8, blending:THREE.AdditiveBlending, depthWrite:false
                }))
            };
            scene.add(flash.mesh);
        }
        flash.mesh.position.copy(pos);
        flash.mesh.scale.setScalar(scale);
        flash.mesh.material.color.setHex(color);
        flash.mesh.material.opacity = 0.8;
        flash.life=12;
        flash.maxLife=12;
        activeFlashes.push(flash);
    }

    // 屏幕震动已移除：所有需要震动的场景（Boss 死亡/阶段切换/攻击、玩家受击、
    // 敌人瞬移、时间停止、引力波、冲击波等）已在调用方显式设置 STATE.shake。
    // 此处无条件增加 shake 会导致玩家命中/击毁敌人时（每次都调用 explode）
    // 触发意外震动，让玩家飞船跟着抖动。
    if(playSound) playExplosion();
}
function updateParticles(){
  // 优化：先移除死亡粒子（交换并弹出），再更新缓冲区
  for(let k=particles.length-1; k>=0; k--) {
    if(particles[k].life <= 0) {
      particles[k] = particles[particles.length - 1];
      particles.pop();
    }
  }
  // 无粒子时跳过 GPU 缓冲区更新
  if(particles.length === 0){
    particleGeo.setDrawRange(0, 0);
  } else {
    for(let i=0; i<particles.length; i++){
      const p = particles[i];
      p.x+=p.vx; p.y+=p.vy; p.z+=p.vz;
      p.vx*=0.94; p.vy*=0.94; p.vz*=0.94;
      p.life--;
      const idx = i*3;
      particlePos[idx]=p.x; particlePos[idx+1]=p.y; particlePos[idx+2]=p.z;
      const a = Math.max(0, p.life/p.maxLife);
      particleCol[idx]=p.r*a; particleCol[idx+1]=p.g*a; particleCol[idx+2]=p.b*a;
    }
    particleGeo.attributes.position.needsUpdate = true;
    particleGeo.attributes.color.needsUpdate = true;
    particleGeo.setDrawRange(0, particles.length);
  }
  
  for(let i=activeFlashes.length-1;i>=0;i--){
    const f=activeFlashes[i]; f.life--;
    const k=f.life/f.maxLife;
    f.mesh.material.opacity = 0.8*k;
    f.mesh.scale.setScalar(f.mesh.scale.x + (1-k)*0.3);
    if(f.life<=0){ f.mesh.visible=false; flashPool.push(f); activeFlashes.splice(i,1); }
  }
}
