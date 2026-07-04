// enemies.js — 敌方战机
/* --- 敌方战机 --- */
const enemies = [];

// 程序化生成克苏鲁之眼的血丝虹膜纹理
function makeVoidEyeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  
  // 1. 巩膜 (眼白)：病态的暗黄绿色
  ctx.fillStyle = '#1a2200';
  ctx.fillRect(0, 0, 256, 256);
  
  const scleraGrd = ctx.createRadialGradient(128, 128, 60, 128, 128, 128);
  scleraGrd.addColorStop(0, '#445500');
  scleraGrd.addColorStop(0.8, '#1a2200');
  scleraGrd.addColorStop(1, '#0a0d00');
  ctx.fillStyle = scleraGrd;
  ctx.beginPath();
  ctx.arc(128, 128, 128, 0, Math.PI * 2);
  ctx.fill();
  
  // 2. 虹膜：荧光绿渐变
  const irisGrd = ctx.createRadialGradient(128, 128, 10, 128, 128, 60);
  irisGrd.addColorStop(0, '#ccff00');
  irisGrd.addColorStop(0.6, '#88ff00');
  irisGrd.addColorStop(1, '#223300');
  ctx.fillStyle = irisGrd;
  ctx.beginPath();
  ctx.arc(128, 128, 60, 0, Math.PI * 2);
  ctx.fill();
  
  // 3. 虹膜放射纹
  ctx.strokeStyle = 'rgba(150, 255, 0, 0.6)';
  ctx.lineWidth = 1.5;
  for(let i=0; i<48; i++) {
    ctx.beginPath();
    const ang = (i / 48) * Math.PI * 2;
    ctx.moveTo(128 + Math.cos(ang)*20, 128 + Math.sin(ang)*20);
    ctx.lineTo(128 + Math.cos(ang)*55, 128 + Math.sin(ang)*55);
    ctx.stroke();
  }
  
  // 4. 扭曲的深色血丝
  ctx.strokeStyle = 'rgba(50, 100, 0, 0.8)';
  ctx.lineWidth = 3;
  for(let i=0; i<15; i++) {
    ctx.beginPath();
    const ang = Math.random() * Math.PI * 2;
    const r1 = 70 + Math.random()*20;
    const r2 = 110 + Math.random()*15;
    ctx.moveTo(128 + Math.cos(ang)*r1, 128 + Math.sin(ang)*r1);
    const midR = (r1+r2)/2;
    const midAng = ang + (Math.random()-0.5)*0.4;
    ctx.lineTo(128 + Math.cos(midAng)*midR, 128 + Math.sin(midAng)*midR);
    ctx.lineTo(128 + Math.cos(ang)*r2, 128 + Math.sin(ang)*r2);
    ctx.stroke();
  }
  
  // 5. 瞳孔：垂直裂缝 (深渊黑紫)
  ctx.fillStyle = '#050008';
  ctx.beginPath();
  ctx.ellipse(128, 128, 15, 45, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // 瞳孔边缘的血红渗出
  ctx.strokeStyle = '#ff3300';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // 瞳孔内部邪光
  const pupilGlow = ctx.createRadialGradient(128, 128, 0, 128, 128, 40);
  pupilGlow.addColorStop(0, 'rgba(255, 50, 0, 0.4)');
  pupilGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = pupilGlow;
  ctx.beginPath();
  ctx.ellipse(128, 128, 15, 45, 0, 0, Math.PI * 2);
  ctx.fill();
  
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// 程序化生成克尔黑洞的吸积盘纹理
function makeAccretionDiskTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 64;
  const ctx = c.getContext('2d');
  
  // 横向热力渐变 (左:内圈白热 -> 右:外圈透明)
  const grd = ctx.createLinearGradient(0, 0, 512, 0);
  grd.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grd.addColorStop(0.2, 'rgba(255, 220, 100, 0.9)');
  grd.addColorStop(0.5, 'rgba(255, 100, 0, 0.6)');
  grd.addColorStop(0.7, 'rgba(150, 0, 100, 0.3)');
  grd.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 512, 64);

  // 叠加垂直亮线模拟湍流
  for(let i=0; i<150; i++) {
    ctx.strokeStyle = `rgba(255, ${Math.random()*150+100}, ${Math.random()*50}, ${Math.random()*0.6 + 0.2})`;
    ctx.lineWidth = Math.random() * 6 + 2;
    ctx.beginPath();
    const x = Math.random() * 512;
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.random()*20 - 10, 64);
    ctx.stroke();
  }
  
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// 程序化生成相对论性喷流纹理
function makeJetTexture() {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 256;
  const ctx = c.getContext('2d');
  
  // 基础渐变：底部白热 -> 中部蓝紫 -> 顶部透明
  const grd = ctx.createLinearGradient(0, 256, 0, 0); 
  grd.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grd.addColorStop(0.2, 'rgba(200, 220, 255, 0.9)');
  grd.addColorStop(0.6, 'rgba(120, 80, 255, 0.5)');
  grd.addColorStop(1.0, 'rgba(60, 0, 120, 0.0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 32, 256);

  // 叠加垂直的亮线，模拟高速粒子流
  for(let i=0; i<40; i++) {
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random()*0.4})`;
    const x = Math.random() * 32;
    const y = Math.random() * 256;
    ctx.fillRect(x, y, 1.5, 15 + Math.random()*40);
  }
  
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// 程序化生成机械神谕的黄道星盘纹理 (含十二宫符号与神秘符文)
function makeAstrolabeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);

  // 外圈精细刻度
  ctx.strokeStyle = 'rgba(200, 170, 100, 0.7)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 72; i++) {
    const ang = (i / 72) * Math.PI * 2 - Math.PI / 2;
    const r1 = 250;
    const r2 = i % 6 === 0 ? 220 : 235;
    ctx.beginPath();
    ctx.moveTo(256 + Math.cos(ang) * r1, 256 + Math.sin(ang) * r1);
    ctx.lineTo(256 + Math.cos(ang) * r2, 256 + Math.sin(ang) * r2);
    ctx.stroke();
  }

  // 黄道十二宫符号
  ctx.fillStyle = '#ffcc44';
  ctx.font = 'bold 28px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ff8800';
  ctx.shadowBlur = 8;
  const zodiacs = ['\u2648','\u2649','\u264A','\u264B','\u264C','\u264D','\u264E','\u264F','\u2650','\u2651','\u2652','\u2653'];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const x = 256 + Math.cos(angle) * 195;
    const y = 256 + Math.sin(angle) * 195;
    ctx.fillText(zodiacs[i], x, y);
  }

  // 内圈符文环
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(256, 256, 160, 0, Math.PI * 2);
  ctx.stroke();

  // 神秘希腊符文
  ctx.fillStyle = 'rgba(100, 200, 255, 0.6)';
  ctx.font = 'bold 18px Georgia, serif';
  const runes = ['\u03A9','\u03A8','\u03A6','\u03A7','\u0394','\u0398','\u039B','\u03A0','\u03A3','\u039E','\u03A5','\u0393'];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const x = 256 + Math.cos(angle) * 140;
    const y = 256 + Math.sin(angle) * 140;
    ctx.fillText(runes[i], x, y);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// 程序化生成时间漩涡纹理 (螺旋星云状)
function makeTimeVortexTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');

  // 径向渐变：中心透明 -> 外圈幽蓝
  const grd = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  grd.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grd.addColorStop(0.3, 'rgba(20, 40, 80, 0.3)');
  grd.addColorStop(0.6, 'rgba(40, 80, 160, 0.5)');
  grd.addColorStop(0.9, 'rgba(80, 160, 255, 0.4)');
  grd.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 512, 512);

  // 螺旋线 (6 条旋臂)
  ctx.strokeStyle = 'rgba(150, 200, 255, 0.6)';
  ctx.lineWidth = 2;
  for (let s = 0; s < 6; s++) {
    ctx.beginPath();
    const startAng = (s / 6) * Math.PI * 2;
    for (let t = 0; t < 200; t++) {
      const r = (t / 200) * 240;
      const ang = startAng + (t / 200) * Math.PI * 4;
      const x = 256 + Math.cos(ang) * r;
      const y = 256 + Math.sin(ang) * r;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // 散布的时间碎片光点
  for (let i = 0; i < 80; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r = 50 + Math.random() * 200;
    const x = 256 + Math.cos(ang) * r;
    const y = 256 + Math.sin(ang) * r;
    const size = Math.random() * 3 + 1;
    ctx.fillStyle = `rgba(200, 230, 255, ${Math.random() * 0.6 + 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// 程序化生成时间裂隙纹理 (空间裂缝)
function makeTimeRiftTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);

  // 主裂缝 (纵向锯齿)
  ctx.strokeStyle = 'rgba(150, 220, 255, 0.9)';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#00ddff';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.moveTo(128, 20);
  let x = 128, y = 20;
  while (y < 236) {
    x += (Math.random() - 0.5) * 30;
    y += 15 + Math.random() * 10;
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  // 分支裂缝
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    const sy = 30 + i * 25;
    const sx = 128 + (Math.random() - 0.5) * 20;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    const dir = Math.random() > 0.5 ? 1 : -1;
    for (let j = 0; j < 4; j++) {
      const nx = sx + dir * (j + 1) * 15 + (Math.random() - 0.5) * 10;
      const ny = sy + j * 8;
      ctx.lineTo(nx, ny);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// 程序化生成晶簇巨像的晶体晶格纹理 (六边形晶格 + 光斑)
function makeCrystalLatticeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);

  // 深蓝底色
  ctx.fillStyle = '#001830';
  ctx.fillRect(0, 0, 512, 512);

  // 六边形晶格网格
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.4)';
  ctx.lineWidth = 1.5;
  const hexR = 32;
  const hexH = hexR * Math.sqrt(3);
  for (let row = -1; row < 512 / hexH + 1; row++) {
    for (let col = -1; col < 512 / (hexR * 1.5) + 1; col++) {
      const cx = col * hexR * 1.5;
      const cy = row * hexH + (col % 2 === 0 ? 0 : hexH / 2);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const x = cx + Math.cos(ang) * hexR;
        const y = cy + Math.sin(ang) * hexR;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  // 随机光斑 (晶体内部折射高光)
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 8 + 2;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(200, 240, 255, 0.8)');
    grd.addColorStop(1, 'rgba(100, 200, 255, 0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 几条粗大的发光裂纹
  ctx.strokeStyle = 'rgba(150, 230, 255, 0.6)';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#00ddff';
  ctx.shadowBlur = 10;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    let x = Math.random() * 512;
    let y = Math.random() * 512;
    ctx.moveTo(x, y);
    for (let j = 0; j < 5; j++) {
      x += (Math.random() - 0.5) * 120;
      y += (Math.random() - 0.5) * 120;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function createEnemyShip(type, bossVariant) {
  const g = new THREE.Group();
  const diff = DIFFICULTIES[STATE.difficulty];
  const wave = STATE.wave;
  
  const waveMul = 1 + (wave - 1) * 0.08;
  const waveSpdMul = 1 + (wave - 1) * 0.02;
  const waveRateMul = 1 + (wave - 1) * 0.04;
  
  let bodyColor, emissiveColor, lineColor, scale, hp, fireRate, bulletSpeed, maxSpeed, behavior;
  let laserMesh = null;
  let phaseCoreMesh = null; // Boss 阶段核心可视化网格（蓄力/阶段切换时发光）
  let bossLaserMesh = null;  // Boss 真实激光 mesh（类似激光兵，颜色随变体）
  let bossLaserGlowMesh = null; // Boss 激光外层光晕
  let timeSlowFieldMesh = null; // 机械神谕时间减速场 mesh (默认隐藏)
  let clockSweepMesh = null;    // 机械神谕时钟扫描光束 mesh (默认隐藏)
  let crystalResonanceFieldMesh = null; // 晶簇巨像晶体共振场 mesh (默认隐藏)
  let crystalPrisonMeshes = []; // 晶簇巨像晶体牢笼标记 mesh 列表
  // 统一的 Boss 装饰动画更新函数：从各 mesh 的 onBeforeRender 剥离后合并到此。
  // 必须声明在函数外层作用域 (而非 if(type===3) 块内)，因为 createEnemyShip
  // 有两个独立的 if(type===3) 块：第一个 (Boss 模型构建) 赋值，第二个 (enemyData 字段) 挂载。
  // 若声明在内层块，第二个块引用时会 ReferenceError (此为前次回归的根因)。
  let bossAnimFn = null;
  let crashDamage = 35, swingSpeed = 0.15;
  
  if (type === 0) { // 突击手 - 近距离盘旋
    bodyColor = 0x2a0a1a; emissiveColor = 0xff2d95; lineColor = 0xff2d95; scale = 1.5; hp = 3; 
    fireRate = 50; bulletSpeed = 2.0; maxSpeed = 1.2;
    behavior = 'assaulter';
    
    const bodyGeo = new THREE.OctahedronGeometry(0.9, 0);
    bodyGeo.scale(0.7, 0.5, 2.0);
    bodyGeo.rotateX(-Math.PI / 2);
    // 极致画质强化：装甲金属体 + 清漆高光(湿润抛光感)，metalness 提升到 0.85 让环境贴图反射可见
    const body = new THREE.Mesh(bodyGeo, makeQualityMaterial({
      color: 0x1a0510, emissive: 0x660033, emissiveIntensity: 0.8, shininess: 100, flatShading: true, metalness: 0.85, roughness: 0.25
    }, {
      clearcoat: 1.0,
      clearcoatRoughness: 0.15,
      sheen: 0.6,
      sheenColor: 0xff2d95
    }));
    g.add(body);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo), new THREE.LineBasicMaterial({ color: lineColor })));

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(1.4, -1.0);
    wingShape.lineTo(0.4, -0.2);
    wingShape.lineTo(0, 0.4);
    wingShape.lineTo(0, 0);
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.08, bevelEnabled: false });
    
    // 翼面金属度提升，配合环境贴图产生镜面反射
    const wingMat = makeQualityMaterial({ color: 0x1a0510, emissive: 0x440022, emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.3 }, {
      clearcoat: 0.8,
      clearcoatRoughness: 0.2
    });
    const wingL = new THREE.Mesh(wingGeo, wingMat);
    wingL.rotation.y = Math.PI / 2;
    wingL.position.set(0, 0, -0.2);
    g.add(wingL);
    
    const wingR = wingL.clone();
    wingR.scale.x = -1;
    g.add(wingR);
    
    const wingEdges = new THREE.EdgesGeometry(wingGeo);
    const wingLineMat = new THREE.LineBasicMaterial({ color: lineColor });
    const wingLinesL = new THREE.LineSegments(wingEdges, wingLineMat);
    wingLinesL.rotation.y = Math.PI / 2; wingLinesL.position.set(0, 0, -0.2);
    g.add(wingLinesL);
    const wingLinesR = wingLinesL.clone(); wingLinesR.scale.x = -1;
    g.add(wingLinesR);

    const coreGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const coreMat = new THREE.MeshBasicMaterial({ 
      color: 0xff66aa, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false 
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.z = -1.5; 
    g.add(core);
    const coreGlowGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const coreGlowMat = new THREE.MeshBasicMaterial({ 
      color: 0xff2d95, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false 
    });
    const coreGlow = new THREE.Mesh(coreGlowGeo, coreGlowMat);
    coreGlow.position.z = -1.5;
    g.add(coreGlow);

    const engineGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const engineMat = new THREE.MeshBasicMaterial({ 
      color: 0xff66aa, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false 
    });
    const engineL = new THREE.Mesh(engineGeo, engineMat);
    engineL.position.set(-0.5, 0, 1.5);
    const engineR = engineL.clone();
    engineR.position.x = 0.5;
    g.add(engineL, engineR);

    const engineGlowGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const engineGlowMat = new THREE.MeshBasicMaterial({ 
      color: 0xff2d95, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false 
    });
    const engineGlowL = new THREE.Mesh(engineGlowGeo, engineGlowMat);
    engineGlowL.position.set(-0.5, 0, 1.5);
    const engineGlowR = engineGlowL.clone();
    engineGlowR.position.x = 0.5;
    g.add(engineGlowL, engineGlowR);

    // 自身发光呼吸改由 emissiveIntensity 动画驱动(见 createEnemyShip 末尾)，不再用 PointLight 以避免光源数爆炸卡顿
  } else if (type === 1) { // 激光兵 - 扫射激光
    bodyColor = 0x1a0500; emissiveColor = 0xff3300; lineColor = 0xff6600; scale = 2.4; hp = 2; 
    fireRate = 0; maxSpeed = 0.8; 
    behavior = 'sniper';
    
    const torsoGeo = new THREE.CylinderGeometry(0.9, 1.1, 2.8, 6);
    torsoGeo.rotateX(-Math.PI / 2);
    // 极致画质强化：暗红装甲金属 + 清漆，反射环境贴图
    const torso = new THREE.Mesh(torsoGeo, makeQualityMaterial({
      color: 0x1a0500, emissive: 0x660000, emissiveIntensity: 0.8, shininess: 60, metalness: 0.85, roughness: 0.3
    }, {
      clearcoat: 0.9,
      clearcoatRoughness: 0.2
    }));
    g.add(torso);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(torsoGeo), new THREE.LineBasicMaterial({ color: 0xff6600 })));

    const headDiscGeo = new THREE.CylinderGeometry(1.3, 1.0, 0.6, 16);
    headDiscGeo.rotateX(-Math.PI / 2);
    // 头盘：高金属度镜面反射 + 清漆，强化"瞄准镜"金属质感
    const headDisc = new THREE.Mesh(headDiscGeo, makeQualityMaterial({
      color: 0x2a0800, emissive: 0x880000, emissiveIntensity: 1.0, shininess: 100, specular: 0xff3300, metalness: 0.95, roughness: 0.15
    }, {
      clearcoat: 1.0,
      clearcoatRoughness: 0.05
    }));
    headDisc.position.z = -1.8;
    g.add(headDisc);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(headDiscGeo), new THREE.LineBasicMaterial({ color: 0xff6600 })));

    const lensGeo = new THREE.SphereGeometry(0.7, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    lensGeo.rotateX(-Math.PI / 2);
    // 透镜：极致画质下使用物理透射，模拟玻璃透镜折射聚焦红光
    const lens = new THREE.Mesh(lensGeo, makeQualityMaterial({ 
      color: 0xff0000, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending,
      metalness: 0.0, roughness: 0.0
    }, {
      transmission: 0.6,
      thickness: 0.5,
      ior: 1.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0
    }));
    lens.position.z = -2.1;
    g.add(lens);

    const lensGlowGeo = new THREE.SphereGeometry(1.0, 16, 12);
    const lensGlow = new THREE.Mesh(lensGlowGeo, new THREE.MeshBasicMaterial({ 
      color: 0xff3300, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false 
    }));
    lensGlow.position.z = -2.1;
    g.add(lensGlow);

    const finMat = makeQualityMaterial({ color: 0x1a0500, emissive: 0x440000, emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.35 }, {
      clearcoat: 0.6,
      clearcoatRoughness: 0.3
    });
    const finGeo = new THREE.BoxGeometry(0.15, 0.8, 1.2);
    const finL = new THREE.Mesh(finGeo, finMat); finL.position.set(-1.3, 0, -1.6);
    const finR = new THREE.Mesh(finGeo, finMat); finR.position.set(1.3, 0, -1.6);
    g.add(finL, finR);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(finGeo), new THREE.LineBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.6 })));

    const conduitGeo = new THREE.TorusGeometry(1.0, 0.08, 6, 16);
    conduitGeo.rotateY(Math.PI / 2);
    const conduit = new THREE.Mesh(conduitGeo, new THREE.MeshBasicMaterial({ 
      color: 0xff3300, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending 
    }));
    conduit.position.z = -0.8;
    g.add(conduit);

    const thrusterGeo = new THREE.CylinderGeometry(0.6, 0.4, 0.8, 8);
    thrusterGeo.rotateX(Math.PI / 2);
    const thruster = new THREE.Mesh(thrusterGeo, makeQualityMaterial({
      color: 0x0a0200, emissive: 0x660000, emissiveIntensity: 0.8, metalness: 0.9, roughness: 0.4
    }, {
      clearcoat: 0.5,
      clearcoatRoughness: 0.4
    }));
    thruster.position.z = 1.6;
    g.add(thruster);

    const laserGeo = new THREE.CylinderGeometry(0.6, 0.6, 1000, 16);
    laserGeo.translate(0, 500, 0);
    const laserMat = makeQualityMaterial({
      color: 0xff2200, emissive: 0xff0000, emissiveIntensity: 2.5, metalness: 0.3, roughness: 0.4,
      transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false
    });

    laserMesh = new THREE.Mesh(laserGeo, laserMat);
    laserMesh.position.set(0, 0, -2.1);
    laserMesh.visible = false;
    g.add(laserMesh); 
    
    const laserGlowGeo = new THREE.CylinderGeometry(1.2, 1.2, 1000, 16);
    laserGlowGeo.translate(0, 500, 0);
    const laserGlowMat = new THREE.MeshBasicMaterial({ 
      color: 0xff4400, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, 
      depthWrite: false, side: THREE.DoubleSide
    });
    const laserGlowMesh = new THREE.Mesh(laserGlowGeo, laserGlowMat);
    laserGlowMesh.position.set(0, 0, -2.1);
    laserGlowMesh.visible = false;
    g.add(laserGlowMesh);
    laserMesh.userData.glowMesh = laserGlowMesh;

    // 自身发光呼吸改由 emissiveIntensity 动画驱动(见 createEnemyShip 末尾)，不再用 PointLight 以避免光源数爆炸卡顿
  } else if (type === 2) { // 冲撞者
    bodyColor = 0x2a2a0a; emissiveColor = 0xffb547; lineColor = 0xffb547; scale = 1.2; hp = 5; 
    fireRate = 9999; bulletSpeed = 0; maxSpeed = 2.4;
    behavior = 'charger';
    
    const crashDiffSettings = {
      casual:   { crashDamage: 20, swingSpeed: 0.10 },
      easy:     { crashDamage: 25, swingSpeed: 0.12 },
      standard: { crashDamage: 35, swingSpeed: 0.15 },
      hard:     { crashDamage: 45, swingSpeed: 0.18 },
      hell:     { crashDamage: 60, swingSpeed: 0.22 }
    };
    const cSet = crashDiffSettings[STATE.difficulty] || crashDiffSettings.standard;
    crashDamage = cSet.crashDamage; 
    swingSpeed = cSet.swingSpeed;

    // 修复：补全冲撞者的模型
    const bodyGeo = new THREE.DodecahedronGeometry(1.2, 0);
    bodyGeo.scale(1.2, 0.8, 1.5);
    // 极致画质强化：厚重装甲金属 + 清漆，反射环境贴图显出多面体棱面
    const body = new THREE.Mesh(bodyGeo, makeQualityMaterial({ color: 0x1a1a05, emissive: 0x442200, emissiveIntensity: 0.8, shininess: 100, flatShading: true, metalness: 0.9, roughness: 0.3 }, {
      clearcoat: 0.8,
      clearcoatRoughness: 0.25
    }));
    g.add(body);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo), new THREE.LineBasicMaterial({ color: lineColor })));

    // 前部撞击刺
    const spikeGeo = new THREE.ConeGeometry(0.5, 1.5, 6);
    spikeGeo.rotateX(-Math.PI / 2);
    // 撞击刺：高金属度低粗糙度，镜面反射 + 清漆，强化"金属撞角"锋利感
    const spike = new THREE.Mesh(spikeGeo, makeQualityMaterial({ color: 0x2a2a0a, emissive: 0xffb547, emissiveIntensity: 1.0, shininess: 80, metalness: 0.95, roughness: 0.1 }, {
      clearcoat: 1.0,
      clearcoatRoughness: 0.05
    }));
    spike.position.z = -1.5;
    g.add(spike);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(spikeGeo), new THREE.LineBasicMaterial({ color: 0xffff00 })));

    // 自身发光呼吸改由 emissiveIntensity 动画驱动(见 createEnemyShip 末尾)，不再用 PointLight 以避免光源数爆炸卡顿
  } else if (type === 4) { // 护盾兵
    bodyColor = 0x0a1a2a; emissiveColor = 0x00aaff; lineColor = 0x00aaff; scale = 1.6; hp = 6;
    fireRate = 70; bulletSpeed = 2.2; maxSpeed = 0.9;
    behavior = 'shielder';
    const bodyGeo = new THREE.CylinderGeometry(0.9, 0.6, 1.6, 6);
    bodyGeo.rotateX(Math.PI / 2);
    // 极致画质强化：深蓝装甲金属 + 清漆，反射环境贴图
    const body = new THREE.Mesh(bodyGeo, makeQualityMaterial({ color: 0x05101a, emissive: 0x002244, emissiveIntensity: 0.8, shininess: 100, flatShading: true, metalness: 0.9, roughness: 0.25 }, {
      clearcoat: 0.9,
      clearcoatRoughness: 0.15
    }));
    g.add(body);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo), new THREE.LineBasicMaterial({ color: lineColor })));
    const shieldGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.2, 6);
    shieldGeo.rotateX(Math.PI / 2);
    // 护盾：极致画质下使用物理透射，模拟能量护盾的玻璃折射 + 虹彩薄膜干涉
    const shieldMesh = new THREE.Mesh(shieldGeo, makeQualityMaterial({ color: 0x004477, emissive: 0x00aaff, emissiveIntensity: 0.6, transparent: true, opacity: 0.55, shininess: 200, side: THREE.DoubleSide, metalness: 0.0, roughness: 0.05 }, {
      transmission: 0.7,
      thickness: 0.3,
      ior: 1.4,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      iridescence: 1.0,
      iridescenceIOR: 1.3
    }));
    shieldMesh.position.z = -1.2;
    g.add(shieldMesh);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(shieldGeo), new THREE.LineBasicMaterial({ color: 0x66ddff })));
    const thrGeo = new THREE.ConeGeometry(0.5, 1.0, 6); thrGeo.rotateX(Math.PI);
    const thr = new THREE.Mesh(thrGeo, new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending }));
    thr.position.z = 1.2; g.add(thr);
    // 自身发光呼吸改由 emissiveIntensity 动画驱动(见 createEnemyShip 末尾)，不再用 PointLight 以避免光源数爆炸卡顿
  } else if (type === 5) { // 分裂者
    bodyColor = 0x1a2a0a; emissiveColor = 0x88ff00; lineColor = 0x88ff00; scale = 1.8; hp = 8;
    fireRate = 90; bulletSpeed = 2.0; maxSpeed = 1.0;
    behavior = 'splitter';
    const bodyGeo = new THREE.IcosahedronGeometry(1.1, 0);
    // 极致画质强化：生物金属核心 + 清漆，反射环境贴图
    const body = new THREE.Mesh(bodyGeo, makeQualityMaterial({ color: 0x0a1505, emissive: 0x224400, emissiveIntensity: 0.8, shininess: 80, flatShading: true, metalness: 0.85, roughness: 0.3 }, {
      clearcoat: 0.7,
      clearcoatRoughness: 0.25
    }));
    g.add(body);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo), new THREE.LineBasicMaterial({ color: lineColor })));
    const lobeGeo = new THREE.SphereGeometry(0.6, 8, 6);
    // 分裂体：半透明生物组织 + 透射，模拟荧光胶质
    const lobeMat = makeQualityMaterial({ color: 0x1a2a0a, emissive: 0x446600, emissiveIntensity: 1.0, transparent: true, opacity: 0.85, metalness: 0.2, roughness: 0.3 }, {
      transmission: 0.4,
      thickness: 0.6,
      ior: 1.3,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2
    });
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2;
      const lobe = new THREE.Mesh(lobeGeo, lobeMat);
      lobe.position.set(Math.cos(ang) * 1.0, 0, Math.sin(ang) * 1.0);
      g.add(lobe);
    }
    const coreGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0xccff44, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }));
    g.add(core);
    // 自身发光呼吸改由 emissiveIntensity 动画驱动(见 createEnemyShip 末尾)，不再用 PointLight 以避免光源数爆炸卡顿
  } else if (type === 6) { // 轰炸机
    bodyColor = 0x2a1a00; emissiveColor = 0xff8800; lineColor = 0xff8800; scale = 2.2; hp = 12;
    fireRate = 110; bulletSpeed = 1.2; maxSpeed = 0.6;
    behavior = 'bomber';
    const bodyGeo = new THREE.OctahedronGeometry(1.3, 0);
    bodyGeo.scale(1.8, 0.6, 1.2);
    // 极致画质强化：重型装甲金属 + 清漆，反射环境贴图
    const body = new THREE.Mesh(bodyGeo, makeQualityMaterial({ color: 0x1a0f00, emissive: 0x442200, emissiveIntensity: 0.8, shininess: 60, flatShading: true, metalness: 0.9, roughness: 0.35 }, {
      clearcoat: 0.8,
      clearcoatRoughness: 0.2
    }));
    g.add(body);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo), new THREE.LineBasicMaterial({ color: lineColor })));
    const bayGeo = new THREE.BoxGeometry(0.6, 0.4, 1.4);
    // 弹舱：金属 + 清漆
    const bayMat = makeQualityMaterial({ color: 0x2a1a00, emissive: 0xff8800, emissiveIntensity: 0.6, metalness: 0.85, roughness: 0.3 }, {
      clearcoat: 0.7,
      clearcoatRoughness: 0.25
    });
    const bayL = new THREE.Mesh(bayGeo, bayMat); bayL.position.set(-1.6, 0, 0); g.add(bayL);
    const bayR = new THREE.Mesh(bayGeo, bayMat); bayR.position.set(1.6, 0, 0); g.add(bayR);
    const portGeo = new THREE.CircleGeometry(0.4, 8);
    portGeo.rotateX(Math.PI / 2);
    const port = new THREE.Mesh(portGeo, new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    port.position.y = -0.5; g.add(port);
    // 自身发光呼吸改由 emissiveIntensity 动画驱动(见 createEnemyShip 末尾)，不再用 PointLight 以避免光源数爆炸卡顿
  } else if (type === 7) { // 自爆机
    bodyColor = 0x2a0000; emissiveColor = 0xff0044; lineColor = 0xff0044; scale = 1.3; hp = 4;
    fireRate = 9999; bulletSpeed = 0; maxSpeed = 3.0;
    behavior = 'kamikaze';
    const kSet = {
      casual:   { crashDamage: 25, explodeRadius: 12 },
      easy:     { crashDamage: 30, explodeRadius: 14 },
      standard: { crashDamage: 40, explodeRadius: 16 },
      hard:     { crashDamage: 55, explodeRadius: 18 },
      hell:     { crashDamage: 70, explodeRadius: 22 }
    };
    const k = kSet[STATE.difficulty] || kSet.standard;
    crashDamage = k.crashDamage;
    swingSpeed = 0.05;
    const bodyGeo = new THREE.ConeGeometry(0.7, 2.6, 6);
    bodyGeo.rotateX(-Math.PI / 2);
    // 极致画质强化：暗红金属弹体 + 清漆，反射环境贴图；emissive 提升触发 Bloom
    const body = new THREE.Mesh(bodyGeo, makeQualityMaterial({ color: 0x1a0000, emissive: 0x440011, emissiveIntensity: 1.2, shininess: 100, flatShading: true, metalness: 0.9, roughness: 0.25 }, {
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      sheen: 0.5,
      sheenColor: 0xff0044
    }));
    g.add(body);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo), new THREE.LineBasicMaterial({ color: lineColor })));
    const coreGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0xff0044, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }));
    core.position.z = -0.8; g.add(core);
    const finGeo = new THREE.BoxGeometry(0.1, 0.6, 0.8);
    const finMat = makeQualityMaterial({ color: 0x1a0000, emissive: 0x440011, emissiveIntensity: 0.6, metalness: 0.85, roughness: 0.3 }, {
      clearcoat: 0.7,
      clearcoatRoughness: 0.2
    });
    const finT = new THREE.Mesh(finGeo, finMat); finT.position.set(0, 0.4, 1.0); g.add(finT);
    const finB = new THREE.Mesh(finGeo, finMat); finB.position.set(0, -0.4, 1.0); g.add(finB);
    // 自身发光呼吸改由 emissiveIntensity 动画驱动(见 createEnemyShip 末尾，自爆机用急促频率)，不再用 PointLight 以避免光源数爆炸卡顿
  } else if (type === 3) { // Boss
    scale = 8.0; 
    hp = 800 + wave * 100; 
    fireRate = 60; bulletSpeed = 1.5; maxSpeed = 3.5;
    const variant = bossVariant || 0;
    let bossColor = 0xff0055;
    // bossAnimFn 已在函数外层声明；各 variant 块会覆写它，统一由主循环调用。
    
        if (variant === 0) {
            // ===== 虚空之眼 (克苏鲁风重制版 · 极致画质强化) =====
            bossColor = 0x88ff00;
            const isHighQ = STATE.graphicsQuality >= 3; // 极致画质才渲染角膜透镜（新体系 3=极致）

            // 1. 眼球巩膜 (外壳)：极致画质下使用物理材质模拟透光肉质与清漆湿润感
            const eyeBallGeo = new THREE.SphereGeometry(4.5, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.65);
            eyeBallGeo.rotateX(-Math.PI / 2);
            const eyeBall = new THREE.Mesh(eyeBallGeo, makeQualityMaterial({
                color: 0x445511,
                emissive: 0x222200,
                emissiveIntensity: 0.4,
                shininess: 80,
                specular: 0x88ff00,
                side: THREE.DoubleSide,
                flatShading: true,
                metalness: 0.1,
                roughness: 0.6
            }, {
                transmission: 0.3,
                thickness: 2.0,
                ior: 1.3,
                clearcoat: 1.0,
                clearcoatRoughness: 0.2
            }));
            g.add(eyeBall);
            g.add(new THREE.LineSegments(new THREE.EdgesGeometry(eyeBallGeo), new THREE.LineBasicMaterial({ color: 0x88ff00, transparent: true, opacity: 0.8 })));

            // 2. 带纹理的眼球正面 (克苏鲁血丝与裂缝瞳孔)
            const eyeTexture = makeVoidEyeTexture();
            const eyeDiscGeo = new THREE.CircleGeometry(4.2, 32);
            eyeDiscGeo.rotateY(Math.PI);
            const eyeDisc = new THREE.Mesh(eyeDiscGeo, new THREE.MeshBasicMaterial({
                map: eyeTexture,
                side: THREE.DoubleSide
            }));
            eyeDisc.position.z = 0.5;
            g.add(eyeDisc);

            const eyeGlowGeo = new THREE.CircleGeometry(4.5, 32);
            eyeGlowGeo.rotateY(Math.PI);
            const eyeGlow = new THREE.Mesh(eyeGlowGeo, new THREE.MeshBasicMaterial({
                color: 0x88ff00,
                transparent: true,
                opacity: 0.4,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            }));
            eyeGlow.position.z = 0.6;
            g.add(eyeGlow);

            // 极致画质新增：前部角膜透镜 (使用物理透射，模拟玻璃体/角膜折射)
            if (isHighQ) {
                const lensGeo = new THREE.SphereGeometry(2.0, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.4);
                lensGeo.rotateX(-Math.PI / 2);
                const lensMat = makeQualityMaterial({
                    color: 0x002200,
                    emissive: 0x004400,
                    emissiveIntensity: 0.2,
                    transparent: true,
                    opacity: 0.3,
                    metalness: 0.0,
                    roughness: 0.0,
                    side: THREE.DoubleSide,
                    depthWrite: false
                }, {
                    transmission: 0.9,
                    thickness: 1.0,
                    ior: 1.5,
                    clearcoat: 1.0,
                    clearcoatRoughness: 0.0
                });
                const eyeLens = new THREE.Mesh(lensGeo, lensMat);
                eyeLens.position.z = 1.2;
                g.add(eyeLens);
            }

            // 3. 多层虚空能量环
            const ring1Geo = new THREE.TorusGeometry(5.5, 0.3, 16, 48);
            const ring1 = new THREE.Mesh(ring1Geo, new THREE.MeshBasicMaterial({ color: 0x88ff00, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending }));
            ring1.rotation.x = Math.PI / 2;
            g.add(ring1);

            const ring2Geo = new THREE.TorusGeometry(6.5, 0.15, 16, 48);
            const ring2 = new THREE.Mesh(ring2Geo, new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }));
            ring2.rotation.x = Math.PI / 2;
            ring2.rotation.z = Math.PI / 4;
            g.add(ring2);

            // 4. 虚空触须 (极致画质下附湿润清漆高光)
            const tendrilMat = makeQualityMaterial({
                color: 0x222200,
                emissive: 0x445500,
                emissiveIntensity: 0.6,
                shininess: 60,
                specular: 0x88ff00,
                flatShading: true,
                metalness: 0.1,
                roughness: 0.4
            }, {
                clearcoat: 0.8,
                clearcoatRoughness: 0.2
            });
            const tendrilGeo = new THREE.ConeGeometry(0.4, 7, 4);
            for(let i=0; i<8; i++) {
                const t = new THREE.Mesh(tendrilGeo, tendrilMat);
                const angle = (i / 8) * Math.PI * 2;
                t.position.set(Math.cos(angle) * 5, Math.sin(angle) * 5, -1.5);
                t.lookAt(new THREE.Vector3(Math.cos(angle) * 10, Math.sin(angle) * 10, -5));
                t.rotateX(Math.PI / 2);
                g.add(t);
            }

            // 5. 悬浮虚空碎片
            const shardGeo = new THREE.OctahedronGeometry(0.6, 0);
            const shardEdges = new THREE.EdgesGeometry(shardGeo);
            const shardMat = makeQualityMaterial({
                color: 0x001100,
                emissive: 0x88ff00,
                emissiveIntensity: 1.2,
                flatShading: true,
                metalness: 0.0,
                roughness: 0.1
            });
            const shardLineMat = new THREE.LineBasicMaterial({ color: 0xccff00 });
            for(let i=0; i<12; i++) {
                const angle = Math.random() * Math.PI * 2;
                const r = 6 + Math.random() * 2;
                const pos = new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, (Math.random()-0.5) * 2);
                const rot = new THREE.Euler(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
                const s = new THREE.Mesh(shardGeo, shardMat);
                s.position.copy(pos);
                s.rotation.copy(rot);
                g.add(s);
                const lines = new THREE.LineSegments(shardEdges, shardLineMat);
                lines.position.copy(pos);
                lines.rotation.copy(rot);
                g.add(lines);
            }

            // ---- 6. 动态光源系统 (极致画质核心强化) ----
            // 瞳孔核心发光 (荧光绿)
            const coreLight = makeQualityLight(0x88ff00, 3.5, 60);
            if (coreLight) {
                coreLight.position.z = -1.0;
                g.add(coreLight);
            }
            // 虹膜周围渗血发光 (猩红)
            const bloodLight = makeQualityLight(0xff3300, 2.0, 40);
            if (bloodLight) {
                bloodLight.position.z = 1.0;
                g.add(bloodLight);
            }
            // 补光与环境光，凸显巩膜材质
            const rimLight = makeQualityDirLight(0x445500, 0.6);
            if (rimLight) {
                rimLight.position.set(0, 5, -10);
                g.add(rimLight);
            }
            const ambient = makeQualityAmbientLight(0x112200, 0.4);
            if (ambient) g.add(ambient);

            // ---- 7. 动画与呼吸逻辑 ----
            // 从 onBeforeRender 剥离：统一挂到 bossAnimFn，由主循环每帧调用一次
            // (原挂在 eyeBall 上每帧渲染时进出回调；合并后单次调用，降低开销)
            bossAnimFn = () => {
                const t = performance.now() * 0.001;
                // 修复：光源必须做 null 检查，否则低画质渲染崩溃
                if (coreLight) coreLight.intensity = 3.0 + Math.sin(t * 2) * 1.5;
                if (bloodLight) bloodLight.intensity = 1.5 + Math.sin(t * 3 + 1) * 1.0;
                // 眼球与光晕呼吸缩放
                const pulse = 1.0 + Math.sin(t * 2) * 0.03;
                eyeBall.scale.setScalar(pulse);
                eyeGlow.scale.setScalar(pulse);
                // 能量环旋转
                ring1.rotation.z += 0.01;
                ring2.rotation.z -= 0.015;
            };
        } else if (variant === 1) {
      // ===== 晶簇巨像 (晶体巨神 · 强化版) =====
      bossColor = 0x00ddff;
      const latticeTex = makeCrystalLatticeTexture();

      // ---- 0. 外层晶体护甲壳 (大型二十面体，半透明) ----
      const armorGeo = new THREE.IcosahedronGeometry(7.5, 0);
      const armorMat = makeQualityMaterial({
        color: 0x002244,
        emissive: 0x0088cc,
        emissiveIntensity: 0.9,
        emissiveMap: latticeTex,
        metalness: 0.3,
        roughness: 0.15,
        transparent: true,
        opacity: 0.35,
        flatShading: true,
        side: THREE.DoubleSide,
        depthWrite: false
      }, { transmission: 0.4, thickness: 3.0, ior: 1.5, clearcoat: 1.0, clearcoatRoughness: 0.0 });
      const armorShell = new THREE.Mesh(armorGeo, armorMat);
      g.add(armorShell);
      // 护甲壳边缘高亮线框
      const armorEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(armorGeo),
        new THREE.LineBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.5 })
      );
      g.add(armorEdges);

      // ---- 1. 核心晶体 (八面体，透光) ----
      const coreGeo = new THREE.OctahedronGeometry(3.0, 0);
      const coreMat = makeQualityMaterial({
        color: 0x004466,
        emissive: 0x00aaff,
        emissiveIntensity: 1.8,
        metalness: 0.2,
        roughness: 0.1,
        transparent: true,
        opacity: 0.75,
        flatShading: true,
        side: THREE.DoubleSide
      }, { transmission: 0.6, thickness: 2.5, ior: 1.6, clearcoat: 1.0, clearcoatRoughness: 0.0 });
      const core = new THREE.Mesh(coreGeo, coreMat);
      g.add(core);
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(coreGeo), new THREE.LineBasicMaterial({ color: 0xaaeeff, transparent: true, opacity: 0.9 })));

      // ---- 2. 核心内部发光球体 ----
      const innerGlowGeo = new THREE.SphereGeometry(0.8, 16, 16);
      const innerGlow = new THREE.Mesh(innerGlowGeo, new THREE.MeshBasicMaterial({
        color: 0xaaeeff,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false
      }));
      innerGlow.renderOrder = 999;
      g.add(innerGlow);
      // 核心点光源（低画质下自动跳过）
      const coreLight = makeQualityLight(0x00ddff, 2.5, 50);
      if (coreLight) g.add(coreLight);

      // ---- 3. 8 颗卫星晶体 (八面体，轨道环绕) ----
      const crystalGeo = new THREE.OctahedronGeometry(1.5, 0);
      const crystalMat = makeQualityMaterial({
        color: 0x002244,
        emissive: 0x00ddff,
        emissiveIntensity: 1.5,
        metalness: 0.2,
        roughness: 0.1,
        transparent: true,
        opacity: 0.7,
        flatShading: true,
        side: THREE.DoubleSide
      }, { transmission: 0.7, thickness: 1.5, ior: 1.6, clearcoat: 1.0, clearcoatRoughness: 0.0 });
      const satelliteGroup = new THREE.Group();
      g.add(satelliteGroup);
      const satellites = [];
      const dirs = [[1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],[-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1]];
      for (let i = 0; i < dirs.length; i++) {
        const d = dirs[i];
        const satNode = new THREE.Group();
        const c = new THREE.Mesh(crystalGeo, crystalMat);
        c.position.set(d[0]*3.5, d[1]*3.5, d[2]*3.5);
        c.lookAt(0,0,0);
        satNode.add(c);
        satNode.add(new THREE.LineSegments(new THREE.EdgesGeometry(crystalGeo), new THREE.LineBasicMaterial({ color: 0xaaeeff, transparent: true, opacity: 0.8 })));
        // 卫星晶体光晕
        const satGlow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00ddff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
        satGlow.position.copy(c.position);
        satNode.add(satGlow);
        satelliteGroup.add(satNode);
        satellites.push({ node: satNode, mesh: c, glow: satGlow, basePos: c.position.clone() });
      }

      // ---- 4. 6 根巨型晶刺 (从核心向外辐射的尖锥) — InstancedMesh 优化 (6 Draw Call → 1) ----
      // 原 6 个独立 Mesh + 6 个独立 LineSegments = 12 Draw Call；InstancedMesh 合并为 2 Draw Call。
      // 画面效果完全一致：相同 geometry/material/位置/朝向，仅合并绘制指令。
      const spikeGroup = new THREE.Group();
      g.add(spikeGroup);
      const spikeGeo = new THREE.ConeGeometry(0.8, 5.0, 6);
      const spikeMat = makeQualityMaterial({
        color: 0x003355,
        emissive: 0x00bbff,
        emissiveIntensity: 1.3,
        metalness: 0.4,
        roughness: 0.15,
        transparent: true,
        opacity: 0.7,
        flatShading: true
      }, { transmission: 0.5, thickness: 1.5, ior: 1.5, clearcoat: 1.0, clearcoatRoughness: 0.1 });
      const spikeDirs = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
      const spikeCount = spikeDirs.length;
      const spikeInst = new THREE.InstancedMesh(spikeGeo, spikeMat, spikeCount);
      spikeInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // 每帧脉冲缩放，标记为动态
      spikeInst.frustumCulled = false; // Boss 整体剔除即可，避免实例被误剔除
      // 预计算每根晶刺的基础位置 + 朝向 (lookAt + rotateX(PI/2))，避免每帧重复计算
      // bossAnimFn 中只在此基础上叠加脉冲缩放，compose 出新矩阵
      const spikeBasePos = [];
      const spikeBaseQuat = [];
      const _spikeDummy = new THREE.Object3D();
      for (let i = 0; i < spikeCount; i++) {
        const sd = spikeDirs[i];
        _spikeDummy.position.set(sd[0]*5.5, sd[1]*5.5, sd[2]*5.5);
        _spikeDummy.lookAt(sd[0]*100, sd[1]*100, sd[2]*100);
        _spikeDummy.rotateX(Math.PI / 2);
        spikeBasePos.push(_spikeDummy.position.clone());
        spikeBaseQuat.push(_spikeDummy.quaternion.clone());
      }
      spikeGroup.add(spikeInst);
      // 晶刺线框：原 6 个 LineSegments 全部错误地加在 spikeGroup 原点 (未跟随 mesh 位置)。
      // 为零损失保留原视觉 (6 份重叠的轴对齐线框在原点)，合并为 1 个 LineSegments (6× 顶点)。
      // 这样 6→1 Draw Call 且画面完全一致 (重叠的透明线段混合行为不变)。
      const _spikeEdgePos = new THREE.EdgesGeometry(spikeGeo).attributes.position.array;
      const _spikeEdgeLen = _spikeEdgePos.length;
      const _spikeMergedPos = new Float32Array(_spikeEdgeLen * spikeCount);
      for (let i = 0; i < spikeCount; i++) {
        _spikeMergedPos.set(_spikeEdgePos, i * _spikeEdgeLen); // 6 份相同顶点，全在原点
      }
      const _spikeMergedGeo = new THREE.BufferGeometry();
      _spikeMergedGeo.setAttribute('position', new THREE.Float32BufferAttribute(_spikeMergedPos, 3));
      spikeGroup.add(new THREE.LineSegments(_spikeMergedGeo, new THREE.LineBasicMaterial({ color: 0xaaeeff, transparent: true, opacity: 0.6 })));

      // ---- 5. 3 层棱镜折射环 (不同倾角，模拟分光棱镜) ----
      const prismRingGroup = new THREE.Group();
      g.add(prismRingGroup);
      const prismRings = [];
      const ringConfigs = [
        { r: 6.5, tilt: Math.PI / 2, opacity: 0.6 },
        { r: 7.5, tilt: Math.PI / 2.5, opacity: 0.5 },
        { r: 8.5, tilt: Math.PI / 1.8, opacity: 0.4 }
      ];
      for (const cfg of ringConfigs) {
        const rGeo = new THREE.TorusGeometry(cfg.r, 0.15, 8, 48);
        const rMesh = new THREE.Mesh(rGeo, makeQualityMaterial({
          color: 0x001133, emissive: 0x0088ff, emissiveIntensity: 1.3,
          metalness: 0.3, roughness: 0.15,
          transparent: true, opacity: cfg.opacity
        }, { transmission: 0.6, thickness: 0.5, ior: 1.5, clearcoat: 1.0, clearcoatRoughness: 0.0 }));
        rMesh.rotation.x = cfg.tilt;
        prismRingGroup.add(rMesh);
        prismRings.push(rMesh);
      }

      // ---- 6. 4 块棱镜折射面 (平板，模拟分光棱镜) ----
      const prismFacetGroup = new THREE.Group();
      g.add(prismFacetGroup);
      const facetGeo = new THREE.PlaneGeometry(4, 6);
      const facetMat = makeQualityMaterial({
        color: 0x0044aa,
        emissive: 0x00aaff,
        emissiveIntensity: 1.2,
        metalness: 0.2,
        roughness: 0.1,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false
      }, { transmission: 0.8, thickness: 0.3, ior: 1.7, clearcoat: 1.0, clearcoatRoughness: 0.1 });
      const facets = [];
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2;
        const facet = new THREE.Mesh(facetGeo, facetMat);
        facet.position.set(Math.cos(ang) * 5, 0, Math.sin(ang) * 5);
        facet.lookAt(0, 0, 0);
        prismFacetGroup.add(facet);
        facets.push(facet);
      }

      // ---- 7. 晶体共振场 (线框球体，默认隐藏，攻击时显现) ----
      const resonanceGeo = new THREE.IcosahedronGeometry(12, 1);
      crystalResonanceFieldMesh = new THREE.Mesh(
        resonanceGeo,
        new THREE.MeshBasicMaterial({
          color: 0x00ddff,
          wireframe: true,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      crystalResonanceFieldMesh.visible = false;
      g.add(crystalResonanceFieldMesh);

      // ---- 8. 光照系统 ----
      const lightTop = makeQualityDirLight(0x88ccff, 1.2);
      if (lightTop) { lightTop.position.set(5, 10, 7); g.add(lightTop); }
      const lightBottom = makeQualityDirLight(0x0088ff, 0.6);
      if (lightBottom) { lightBottom.position.set(-5, -8, 5); g.add(lightBottom); }
      const lightRim = makeQualityDirLight(0xaaeeff, 1.0);
      if (lightRim) { lightRim.position.set(0, 5, -10); g.add(lightRim); }
      const ambientLight = makeQualityAmbientLight(0x223344, 0.5);
      if (ambientLight) g.add(ambientLight);

      // ---- 9. 动画逻辑 ----
      // 从 onBeforeRender 剥离：原 6 个 mesh 各挂回调，每帧渲染时多次进出且逻辑分散
      // (如渲染 satellites[0] 时更新所有卫星)。合并到 bossAnimFn 单次调用，缓存数组长度。
      bossAnimFn = () => {
        const nowMs = performance.now();
        // 核心晶体自转 + 内部光球呼吸
        core.rotation.y += 0.005;
        core.rotation.x += 0.003;
        const pulse = 0.85 + Math.sin(nowMs * 0.003) * 0.15;
        innerGlow.scale.setScalar(pulse);
        // 修复：coreLight 在低画质下为 null，必须做 null 检查（否则抛错导致渲染循环崩溃）
        if (coreLight) coreLight.intensity = 2.0 + Math.sin(nowMs * 0.004) * 0.8;

        // 外层护甲壳缓慢自转
        armorShell.rotation.y += 0.002;
        armorShell.rotation.z += 0.001;
        armorEdges.rotation.y = armorShell.rotation.y;
        armorEdges.rotation.z = armorShell.rotation.z;

        // 卫星晶体轨道环绕 + 自转
        const t = nowMs * 0.0005;
        const sLen = satellites.length;
        for (let i = 0; i < sLen; i++) {
          const s = satellites[i];
          const ang = t + (i / sLen) * Math.PI * 2;
          s.mesh.position.set(
            Math.cos(ang) * 3.5,
            s.basePos.y * 0.5 + Math.sin(ang * 0.7) * 1.5,
            Math.sin(ang) * 3.5
          );
          s.glow.position.copy(s.mesh.position);
          s.mesh.rotation.y += 0.02;
          s.mesh.rotation.x += 0.015;
        }

        // 晶刺脉冲缩放 (InstancedMesh：在预计算的 basePos+baseQuat 上叠加脉冲缩放)
        // 复用创建块中的 _spikeDummy (Object3D) 作为矩阵载体，避免每帧 new
        const tp = nowMs * 0.003;
        for (let i = 0; i < spikeCount; i++) {
          _spikeDummy.position.copy(spikeBasePos[i]);
          _spikeDummy.quaternion.copy(spikeBaseQuat[i]);
          _spikeDummy.scale.setScalar(0.9 + Math.sin(tp + i * 0.5) * 0.1);
          _spikeDummy.updateMatrix();
          spikeInst.setMatrixAt(i, _spikeDummy.matrix);
        }
        spikeInst.instanceMatrix.needsUpdate = true;

        // 棱镜折射环旋转 (3 层不同速度方向)
        prismRings[0].rotation.z += 0.008;
        prismRings[1].rotation.z -= 0.006;
        prismRings[2].rotation.z += 0.004;

        // 棱镜折射面缓慢旋转
        prismFacetGroup.rotation.y += 0.005;

        // 共振场旋转 (即使隐藏也保持动画)
        crystalResonanceFieldMesh.rotation.y += 0.004;
        crystalResonanceFieldMesh.rotation.x += 0.002;
      };
    } else if (variant === 2) {
      // ===== 深渊吞噬者 (克尔黑洞 - 巨型吸积盘修复版) =====
      bossColor = 0xaa00ff;
      const diskTexture = makeAccretionDiskTexture();

      // 微倾斜子Group，确保盘面可见
      const bhGroup = new THREE.Group();
      bhGroup.rotation.x = Math.PI / 16;
      g.add(bhGroup);

      // 1. 事件视界 (绝对黑体)
      const horizon = new THREE.Mesh(
        new THREE.SphereGeometry(2.5, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
      );
      bhGroup.add(horizon);

      // 2. 光子球 (半透明白热光晕)
      const photonSphere = new THREE.Mesh(
        new THREE.SphereGeometry(2.8, 32, 32),
        new THREE.MeshBasicMaterial({
          color: 0xffffff, transparent: true, opacity: 0.3,
          blending: THREE.AdditiveBlending, side: THREE.BackSide
        })
      );
      bhGroup.add(photonSphere);

      // 3. 吸积盘 (大幅度放大尺寸并修正UV映射)
      // 内层 (极速白热)
      const disk1Geo = new THREE.RingGeometry(3.0, 8.0, 128, 1);
      const disk1Uv = disk1Geo.attributes.uv;
      const pos1 = disk1Geo.attributes.position;
      const v3_1 = new THREE.Vector3();
      for (let i = 0; i < disk1Uv.count; i++) {
        v3_1.fromBufferAttribute(pos1, i);
        const u = (v3_1.length() - 3.0) / (8.0 - 3.0);
        disk1Uv.setXY(i, u, 0.5);
      }
      const disk1 = new THREE.Mesh(disk1Geo, new THREE.MeshBasicMaterial({
        map: diskTexture, color: 0xffffff, transparent: true, opacity: 1.0,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
      }));
      disk1.rotation.x = Math.PI / 2;
      bhGroup.add(disk1);

      // 外层 (暗紫红减速带)
      const disk2Geo = new THREE.RingGeometry(6.0, 16.0, 128, 1);
      const disk2Uv = disk2Geo.attributes.uv;
      const pos2 = disk2Geo.attributes.position;
      const v3_2 = new THREE.Vector3();
      for (let i = 0; i < disk2Uv.count; i++) {
        v3_2.fromBufferAttribute(pos2, i);
        const u = (v3_2.length() - 6.0) / (16.0 - 6.0);
        disk2Uv.setXY(i, u, 0.5);
      }
      const disk2 = new THREE.Mesh(disk2Geo, new THREE.MeshBasicMaterial({
        map: diskTexture, color: 0xff44ff, transparent: true, opacity: 0.7,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
      }));
      disk2.rotation.x = Math.PI / 2;
      bhGroup.add(disk2);

      // 4. 引力透镜光环
      const lensRing = new THREE.Mesh(
        new THREE.TorusGeometry(3.2, 0.1, 16, 100),
        new THREE.MeshBasicMaterial({ color: 0xffeeaa, transparent: true, opacity: 1.0, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      bhGroup.add(lensRing);

      const lensGlow = new THREE.Mesh(
        new THREE.TorusGeometry(3.2, 0.4, 16, 100),
        new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      bhGroup.add(lensGlow);

      // 5. 相对论性喷流
      const jetTexture = makeJetTexture();
      const jetGeo = new THREE.CylinderGeometry(0.4, 2.0, 18, 16, 1, true);
      const jetMat = new THREE.MeshBasicMaterial({
        map: jetTexture, color: 0xcc88ff, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
      });
      const jetTop = new THREE.Mesh(jetGeo, jetMat);
      jetTop.position.y = 10.0;
      bhGroup.add(jetTop);
      const jetBottom = new THREE.Mesh(jetGeo, jetMat);
      jetBottom.position.y = -10.0;
      jetBottom.rotation.x = Math.PI;
      bhGroup.add(jetBottom);

      const jetCoreGeo = new THREE.CylinderGeometry(0.1, 0.5, 18, 8);
      const jetCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
      const jetCoreTop = new THREE.Mesh(jetCoreGeo, jetCoreMat);
      jetCoreTop.position.y = 10.0;
      bhGroup.add(jetCoreTop);
      const jetCoreBottom = new THREE.Mesh(jetCoreGeo, jetCoreMat);
      jetCoreBottom.position.y = -10.0;
      jetCoreBottom.rotation.x = Math.PI;
      bhGroup.add(jetCoreBottom);

      // 动画：从 onBeforeRender 剥离，统一挂到 bossAnimFn，由主循环每帧调用一次
      bossAnimFn = () => {
        disk1.rotation.z += 0.04;
        disk2.rotation.z -= 0.015;
        lensRing.rotation.y += 0.02;
        lensGlow.rotation.y -= 0.01;
        jetTop.rotation.y += 0.15;
        jetBottom.rotation.y -= 0.15;
      };
  } else if (variant === 3) {
    // ===== 机械神谕 (时间操控者 · 强化版) =====
    bossColor = 0x00ddff;

    // ---- 辅助函数：生成带辐条镂空的齿轮 ----
    const makeGearGeo = (radius, teeth, toothDepth, thickness, spokes) => {
      const shape = new THREE.Shape();
      const innerR = radius - toothDepth * 0.4;
      const outerR = radius + toothDepth * 0.4;
      const step = (Math.PI * 2) / (teeth * 2);
      for (let i = 0; i < teeth * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const ang = i * step;
        if (i === 0) shape.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
        else shape.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
      }
      shape.closePath();
      const centerHole = new THREE.Path();
      centerHole.absarc(0, 0, radius * 0.15, 0, Math.PI * 2, true);
      shape.holes.push(centerHole);
      if (spokes) {
        for (let i = 0; i < spokes; i++) {
          const ang = (i / spokes) * Math.PI * 2;
          const hole = new THREE.Path();
          hole.absarc(Math.cos(ang) * radius * 0.5, Math.sin(ang) * radius * 0.5, radius * 0.25, 0, Math.PI * 2, true);
          shape.holes.push(hole);
        }
      }
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: thickness, bevelEnabled: true, bevelThickness: thickness * 0.2, bevelSize: toothDepth * 0.2, bevelSegments: 1
      });
      geo.center();
      return geo;
    };

    // ---- 辅助函数：生成罗马数字表盘纹理 (增强版，含中心放射纹) ----
    const makeClockFaceTexture = () => {
      const c = document.createElement('canvas');
      c.width = 512; c.height = 512;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, 512, 512);

      // 1. 外圈刻度
      ctx.strokeStyle = 'rgba(200, 220, 255, 0.6)';
      ctx.lineWidth = 4;
      for (let i = 0; i < 60; i++) {
        const ang = (i / 60) * Math.PI * 2 - Math.PI / 2;
        const r1 = 240;
        const r2 = i % 5 === 0 ? 215 : 225;
        ctx.beginPath();
        ctx.moveTo(256 + Math.cos(ang) * r1, 256 + Math.sin(ang) * r1);
        ctx.lineTo(256 + Math.cos(ang) * r2, 256 + Math.sin(ang) * r2);
        ctx.stroke();
      }

      // 2. 内圈装饰环
      ctx.strokeStyle = 'rgba(255, 170, 0, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(256, 256, 200, 0, Math.PI * 2);
      ctx.stroke();

      // 3. 罗马数字
      ctx.fillStyle = '#ffaa00';
      ctx.font = 'bold 52px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 15;
      const romans = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const x = 256 + Math.cos(angle) * 175;
        const y = 256 + Math.sin(angle) * 175;
        ctx.fillText(romans[i], x, y);
      }

      // 4. 中心放射花纹
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(0, 221, 255, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(256 + Math.cos(ang) * 40, 256 + Math.sin(ang) * 40);
        ctx.lineTo(256 + Math.cos(ang) * 120, 256 + Math.sin(ang) * 120);
        ctx.stroke();
      }

      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    };

    // ---- 0. 时间漩涡 (Boss 后方背景，暗示操控时间本身) ----
    const vortexTex = makeTimeVortexTexture();
    const vortexGeo = new THREE.PlaneGeometry(22, 22);
    const vortex = new THREE.Mesh(vortexGeo, new THREE.MeshBasicMaterial({
      map: vortexTex, color: 0x00ddff, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    }));
    vortex.position.z = -3;
    g.add(vortex);
    // 漩涡内层 (更小更亮)
    const vortexInner = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({
      map: vortexTex, color: 0xffffff, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    }));
    vortexInner.position.z = -2.5;
    g.add(vortexInner);

    // ---- 1. 主体结构组 ----
    const clockGroup = new THREE.Group();
    g.add(clockGroup);

    // ---- 2. 镂空表壳骨架 (外环 + 6支柱 + 12时位标记 + 能量导管) ----
    const frameGroup = new THREE.Group();
    clockGroup.add(frameGroup);
    const frameMat = makeQualityMaterial({
      color: 0x8a5544, metalness: 0.8, roughness: 0.35,
      emissive: 0x2a1020, emissiveIntensity: 0.5
    }, { clearcoat: 0.5, clearcoatRoughness: 0.2 });
    const frameEdgeMat = new THREE.LineBasicMaterial({ color: 0xcc8855, transparent: true, opacity: 0.7 });

    const ringGeo = new THREE.TorusGeometry(5.2, 0.3, 16, 64);
    const outerRing = new THREE.Mesh(ringGeo, frameMat);
    outerRing.position.z = 0.3;
    frameGroup.add(outerRing);
    frameGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(ringGeo), frameEdgeMat));

    // 6 支柱
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const strutGeo = new THREE.BoxGeometry(0.4, 4.8, 0.5);
      const strut = new THREE.Mesh(strutGeo, frameMat);
      strut.position.set(Math.cos(ang) * 2.4, Math.sin(ang) * 2.4, 0.3);
      strut.rotation.z = ang - Math.PI / 2;
      frameGroup.add(strut);
      const strutLines = new THREE.LineSegments(new THREE.EdgesGeometry(strutGeo), frameEdgeMat);
      strutLines.position.copy(strut.position);
      strutLines.rotation.copy(strut.rotation);
      frameGroup.add(strutLines);
    }

    // 12 时位发光标记 (新增)
    const hourMarkerMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const marker = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), hourMarkerMat);
      marker.position.set(Math.cos(ang) * 5.2, Math.sin(ang) * 5.2, 0.5);
      frameGroup.add(marker);
    }

    // 能量导管：核心到外环的发光线 (新增)
    const conduitMat = new THREE.MeshBasicMaterial({ color: 0x00ddff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + Math.PI / 12;
      const conduitGeo = new THREE.CylinderGeometry(0.05, 0.05, 4.5, 6);
      conduitGeo.translate(0, 2.25, 0);
      const conduit = new THREE.Mesh(conduitGeo, conduitMat);
      conduit.position.set(0, 0, 0.4);
      conduit.rotation.z = ang - Math.PI / 2;
      frameGroup.add(conduit);
    }

    // ---- 3. 内部发条系统 ----
    const innerMechGroup = new THREE.Group();
    innerMechGroup.position.z = -0.8;
    clockGroup.add(innerMechGroup);

    // 背板
    const backplateGeo = new THREE.CylinderGeometry(4.6, 4.6, 0.2, 32);
    backplateGeo.rotateX(Math.PI / 2);
    innerMechGroup.add(new THREE.Mesh(backplateGeo, makeQualityMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.5 })));

    // 主齿轮
    const innerGear1Geo = makeGearGeo(4.0, 32, 0.5, 0.35, 6);
    const innerGear1 = new THREE.Mesh(innerGear1Geo, makeQualityMaterial({ color: 0x8a6a3a, metalness: 0.9, roughness: 0.35, emissive: 0x553300, emissiveIntensity: 0.6 }));
    innerMechGroup.add(innerGear1);

    // 副齿轮
    const innerGear2Geo = makeGearGeo(2.5, 20, 0.4, 0.45, 4);
    const innerGear2 = new THREE.Mesh(innerGear2Geo, makeQualityMaterial({ color: 0x4a4a52, metalness: 0.9, roughness: 0.3, emissive: 0x001122, emissiveIntensity: 0.8 }));
    innerGear2.position.z = 0.4;
    innerMechGroup.add(innerGear2);

    // 发条
    const mainspringGroup = new THREE.Group();
    mainspringGroup.position.set(2.2, 2.2, 0.2);
    innerMechGroup.add(mainspringGroup);
    const springMat = makeQualityMaterial({ color: 0xffaa00, metalness: 0.8, roughness: 0.2, emissive: 0x664400, emissiveIntensity: 1.0 });
    for (let i = 0; i < 4; i++) {
      const r = 0.3 + i * 0.25;
      const springGeo = new THREE.TorusGeometry(r, 0.06, 4, 32, Math.PI * 1.5);
      const spring = new THREE.Mesh(springGeo, springMat);
      spring.rotation.z = i * 0.4;
      mainspringGroup.add(spring);
    }

    // 内部光源（低画质下自动跳过）
    const innerLight = makeQualityLight(0x00ddff, 4.0, 30);
    if (innerLight) { innerLight.position.set(0, 0, 1.5); innerMechGroup.add(innerLight); }

    // ---- 4. 前置透明表盘 (带罗马数字) ----
    const faceTex = makeClockFaceTexture();
    const faceGeo = new THREE.CircleGeometry(4.8, 64);
    const clockFace = new THREE.Mesh(faceGeo, new THREE.MeshBasicMaterial({
      map: faceTex, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false
    }));
    clockFace.position.z = 0.8;
    clockGroup.add(clockFace);

    // ---- 5. 机械指针 (时/分/秒) ----
    const handGroup = new THREE.Group();
    handGroup.position.z = 0.9;
    clockGroup.add(handGroup);

    // 分针 (长，幽蓝色)
    const minHandGeo = new THREE.BoxGeometry(0.15, 3.5, 0.08);
    minHandGeo.translate(0, 1.5, 0);
    const minHand = new THREE.Mesh(minHandGeo, makeQualityMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 1.5, metalness: 0.5, roughness: 0.3 }));
    handGroup.add(minHand);

    // 时针 (短，暗金色)
    const hourHandGeo = new THREE.BoxGeometry(0.25, 2.2, 0.08);
    hourHandGeo.translate(0, 1.0, 0);
    const hourHand = new THREE.Mesh(hourHandGeo, makeQualityMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 1.0, metalness: 0.5, roughness: 0.3 }));
    handGroup.add(hourHand);

    // 秒针 (极细，猩红色) — 新增，时钟扫描攻击时拉长
    const secHandGeo = new THREE.BoxGeometry(0.06, 4.2, 0.04);
    secHandGeo.translate(0, 1.8, 0);
    const secHand = new THREE.Mesh(secHandGeo, makeQualityMaterial({ color: 0xff0044, emissive: 0xff0044, emissiveIntensity: 2.0, metalness: 0.5, roughness: 0.3 }));
    secHand.position.z = 0.05;
    handGroup.add(secHand);

    // ---- 6. 中心全视之眼 (核心) ----
    const eyeCoreGeo = new THREE.SphereGeometry(0.5, 24, 24);
    const eyeCore = new THREE.Mesh(eyeCoreGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }));
    eyeCore.position.z = 1.0;
    clockGroup.add(eyeCore);

    const coreLight = makeQualityLight(0x00ddff, 3.0, 40);
    if (coreLight) eyeCore.add(coreLight);

    const eyeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.8, 24, 24), new THREE.MeshBasicMaterial({ color: 0x0088ff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide }));
    eyeCore.add(eyeGlow);

    // 全视之眼虹膜 (新增)
    const iris = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.45, 32), new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    iris.position.z = 0.55;
    eyeCore.add(iris);

    // ---- 7. 外层星盘 (3 倾斜环，含黄道符号) — 新增 ----
    const astrolabeGroup = new THREE.Group();
    g.add(astrolabeGroup);
    const astrolabeTex = makeAstrolabeTexture();
    const astrolabeRings = [];
    const astrolabeConfigs = [
      { radius: 7.0, tilt: [Math.PI / 2.2, 0, 0], speed: 0.003 },
      { radius: 7.5, tilt: [Math.PI / 3, Math.PI / 4, 0], speed: -0.004 },
      { radius: 8.0, tilt: [Math.PI / 2.5, 0, Math.PI / 6], speed: 0.002 }
    ];
    for (const cfg of astrolabeConfigs) {
      const ringGeo = new THREE.RingGeometry(cfg.radius - 0.5, cfg.radius + 0.5, 64);
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
        map: astrolabeTex, color: 0xffffff, transparent: true, opacity: 0.7,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
      }));
      ring.rotation.set(cfg.tilt[0], cfg.tilt[1], cfg.tilt[2]);
      astrolabeGroup.add(ring);
      astrolabeRings.push({ mesh: ring, speed: cfg.speed });
      // 环上的发光节点
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const node = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffaa00, blending: THREE.AdditiveBlending }));
        node.position.set(Math.cos(ang) * cfg.radius, Math.sin(ang) * cfg.radius, 0);
        ring.add(node);
      }
    }

    // ---- 8. 12 浮游罗马数字碎片 (轨道环绕) — InstancedMesh 优化 (24 Draw Call → 2) ----
    // 原 12 Mesh (碎片) + 12 Mesh (光晕) + 12 LineSegments = 36 Draw Call；
    // InstancedMesh 合并为 2 (碎片+光晕) + 1 (合并线框) = 3 Draw Call。画面完全一致。
    const shardGroup = new THREE.Group();
    g.add(shardGroup);
    const shardGeo = new THREE.OctahedronGeometry(0.4, 0);
    const shardMat = makeQualityMaterial({ color: 0x001122, emissive: 0x00ddff, emissiveIntensity: 1.5, metalness: 0.5, roughness: 0.2, transparent: true, opacity: 0.85 });
    const shardEdgeMat = new THREE.LineBasicMaterial({ color: 0xaaeeff });
    const shardCount = 12;
    // 碎片本体：每帧自转，标记 DynamicDrawUsage
    const shardInst = new THREE.InstancedMesh(shardGeo, shardMat, shardCount);
    shardInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    shardInst.frustumCulled = false;
    // 碎片光晕：静态 (仅随 shardGroup 整体旋转)，初始矩阵一次写入即可
    const shardGlowGeo = new THREE.SphereGeometry(0.6, 8, 8);
    const shardGlowMat = new THREE.MeshBasicMaterial({ color: 0x00ddff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false });
    const shardGlowInst = new THREE.InstancedMesh(shardGlowGeo, shardGlowMat, shardCount);
    shardGlowInst.frustumCulled = false;
    // 预计算每个碎片的基础位置；自转角度累计在 Float32Array 中 (避免每帧 new)
    const shardBasePos = [];
    const shardRotX = new Float32Array(shardCount);
    const shardRotY = new Float32Array(shardCount);
    const _shardDummy = new THREE.Object3D();
    for (let i = 0; i < shardCount; i++) {
      const ang = (i / shardCount) * Math.PI * 2;
      const pos = new THREE.Vector3(Math.cos(ang) * 6.8, Math.sin(ang) * 6.8, 0.5);
      shardBasePos.push(pos);
      // 光晕初始矩阵 (位置 + 单位旋转 + 单位缩放)
      _shardDummy.position.copy(pos);
      _shardDummy.quaternion.identity();
      _shardDummy.scale.set(1, 1, 1);
      _shardDummy.updateMatrix();
      shardGlowInst.setMatrixAt(i, _shardDummy.matrix);
      // 碎片本体初始矩阵 (同位置，初始无自转)
      shardInst.setMatrixAt(i, _shardDummy.matrix);
    }
    shardInst.instanceMatrix.needsUpdate = true;
    shardGlowInst.instanceMatrix.needsUpdate = true;
    shardGroup.add(shardInst);
    shardGroup.add(shardGlowInst);
    // 碎片线框：原 12 个 LineSegments 各在 shardNode 位置 (正确)。合并为 1 个 (12× 顶点，带平移)。
    const _shardEdgePos = new THREE.EdgesGeometry(shardGeo).attributes.position.array;
    const _shardEdgeLen = _shardEdgePos.length;
    const _shardMergedPos = new Float32Array(_shardEdgeLen * shardCount);
    for (let i = 0; i < shardCount; i++) {
      const p = shardBasePos[i];
      for (let j = 0; j < _shardEdgeLen / 3; j++) {
        _shardMergedPos[i * _shardEdgeLen + j * 3]     = _shardEdgePos[j * 3]     + p.x;
        _shardMergedPos[i * _shardEdgeLen + j * 3 + 1] = _shardEdgePos[j * 3 + 1] + p.y;
        _shardMergedPos[i * _shardEdgeLen + j * 3 + 2] = _shardEdgePos[j * 3 + 2] + p.z;
      }
    }
    const _shardMergedGeo = new THREE.BufferGeometry();
    _shardMergedGeo.setAttribute('position', new THREE.Float32BufferAttribute(_shardMergedPos, 3));
    shardGroup.add(new THREE.LineSegments(_shardMergedGeo, shardEdgeMat));

    // ---- 9. 4 口时钟编钟 (四方方位) — InstancedMesh 优化 (8 Draw Call → 2) ----
    // 原 4 Mesh (编钟) + 4 Mesh (光晕) + 4 LineSegments = 12 Draw Call；
    // InstancedMesh 合并为 2 (编钟+光晕) + 1 (合并线框) = 3 Draw Call。画面完全一致。
    const chimeGroup = new THREE.Group();
    g.add(chimeGroup);
    const chimeGeo = new THREE.CylinderGeometry(0.6, 0.8, 1.5, 12);
    chimeGeo.rotateX(Math.PI / 2);
    const chimeMat = makeQualityMaterial({ color: 0x6a4a2a, metalness: 0.9, roughness: 0.3, emissive: 0x442200, emissiveIntensity: 0.6 }, { clearcoat: 0.8, clearcoatRoughness: 0.2 });
    const chimeCount = 4;
    // 编钟本体：每帧 z 轴微摆，DynamicDrawUsage
    const chimeInst = new THREE.InstancedMesh(chimeGeo, chimeMat, chimeCount);
    chimeInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    chimeInst.frustumCulled = false;
    // 编钟光晕：每帧脉冲缩放，DynamicDrawUsage
    const chimeGlowGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const chimeGlowMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
    const chimeGlowInst = new THREE.InstancedMesh(chimeGlowGeo, chimeGlowMat, chimeCount);
    chimeGlowInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    chimeGlowInst.frustumCulled = false;
    // 预计算每个编钟的基础位置
    const chimeBasePos = [];
    const _chimeDummy = new THREE.Object3D();
    for (let i = 0; i < chimeCount; i++) {
      const ang = (i / chimeCount) * Math.PI * 2 + Math.PI / 4;
      const pos = new THREE.Vector3(Math.cos(ang) * 6.0, Math.sin(ang) * 6.0, 1.5);
      chimeBasePos.push(pos);
      // 初始矩阵 (位置 + 单位旋转 + 单位缩放)
      _chimeDummy.position.copy(pos);
      _chimeDummy.quaternion.identity();
      _chimeDummy.scale.set(1, 1, 1);
      _chimeDummy.updateMatrix();
      chimeInst.setMatrixAt(i, _chimeDummy.matrix);
      chimeGlowInst.setMatrixAt(i, _chimeDummy.matrix);
    }
    chimeInst.instanceMatrix.needsUpdate = true;
    chimeGlowInst.instanceMatrix.needsUpdate = true;
    chimeGroup.add(chimeInst);
    chimeGroup.add(chimeGlowInst);
    // 编钟线框：原 4 个 LineSegments 全部错误地加在 chimeGroup 原点 (未跟随 mesh 位置)。
    // 为零损失保留原视觉 (4 份重叠的轴对齐线框在原点)，合并为 1 个 LineSegments (4× 顶点)。
    const _chimeEdgePos = new THREE.EdgesGeometry(chimeGeo).attributes.position.array;
    const _chimeEdgeLen = _chimeEdgePos.length;
    const _chimeMergedPos = new Float32Array(_chimeEdgeLen * chimeCount);
    for (let i = 0; i < chimeCount; i++) {
      _chimeMergedPos.set(_chimeEdgePos, i * _chimeEdgeLen); // 4 份相同顶点，全在原点
    }
    const _chimeMergedGeo = new THREE.BufferGeometry();
    _chimeMergedGeo.setAttribute('position', new THREE.Float32BufferAttribute(_chimeMergedPos, 3));
    chimeGroup.add(new THREE.LineSegments(_chimeMergedGeo, new THREE.LineBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.6 })));

    // ---- 10. 摆锤 (下方摆动) — 新增 ----
    const pendulumGroup = new THREE.Group();
    pendulumGroup.position.set(0, -5.5, 0.5);
    g.add(pendulumGroup);
    // 摆杆
    const pendulumRod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.0, 6), makeQualityMaterial({ color: 0x8a6a3a, metalness: 0.9, roughness: 0.3, emissive: 0x442200, emissiveIntensity: 0.4 }));
    pendulumRod.position.y = -2.0;
    pendulumGroup.add(pendulumRod);
    // 摆锤
    const pendulumBob = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), makeQualityMaterial({ color: 0xffaa00, metalness: 0.8, roughness: 0.2, emissive: 0xff6600, emissiveIntensity: 1.0 }));
    pendulumBob.position.y = -4.0;
    pendulumGroup.add(pendulumBob);
    // 摆锤光晕
    const pendulumGlow = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 16), new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
    pendulumGlow.position.y = -4.0;
    pendulumGroup.add(pendulumGlow);

    // ---- 11. 阶段水晶 (Boss 头顶，颜色随阶段变化) — 新增 ----
    const phaseCrystalGeo = new THREE.OctahedronGeometry(0.8, 0);
    const phaseCrystal = new THREE.Mesh(phaseCrystalGeo, makeQualityMaterial({
      color: 0x00ddff, emissive: 0x00ddff, emissiveIntensity: 1.8,
      metalness: 0.2, roughness: 0.1,
      transparent: true, opacity: 0.8, flatShading: true
    }, { transmission: 0.6, thickness: 1.0, ior: 1.6, clearcoat: 1.0, clearcoatRoughness: 0.0 }));
    phaseCrystal.position.set(0, 6.5, 0.5);
    g.add(phaseCrystal);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(phaseCrystalGeo), new THREE.LineBasicMaterial({ color: 0xaaeeff, transparent: true, opacity: 0.9 })));

    // ---- 12. 时间裂隙 (周围空间裂缝) — 新增 ----
    const timeCrackGroup = new THREE.Group();
    g.add(timeCrackGroup);
    const crackTex = makeTimeRiftTexture();
    const cracks = [];
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const r = 9 + Math.random() * 2;
      const crack = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: crackTex, color: 0x00ddff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
      crack.position.set(Math.cos(ang) * r, Math.sin(ang) * r, (Math.random() - 0.5) * 2);
      crack.rotation.z = Math.random() * Math.PI * 2;
      crack.rotation.y = Math.random() * Math.PI * 2;
      timeCrackGroup.add(crack);
      cracks.push(crack);
    }

    // ---- 13. 日冕冠 (顶部尖刺王冠) — 新增 ----
    const crownMat = makeQualityMaterial({ color: 0x8a6a3a, metalness: 0.9, roughness: 0.3, emissive: 0x553300, emissiveIntensity: 0.6 });
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const spikeGeo = new THREE.ConeGeometry(0.2, 1.5, 6);
      const spike = new THREE.Mesh(spikeGeo, crownMat);
      spike.position.set(Math.cos(ang) * 1.5, 5.5, 0.3);
      spike.rotation.x = -Math.PI / 6;
      spike.rotation.z = ang - Math.PI / 2;
      g.add(spike);
    }

    // ---- 14. 时间减速场 (攻击用，默认隐藏) — 新增 ----
    timeSlowFieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(10, 24, 16),
      new THREE.MeshBasicMaterial({
        color: 0x00ddff, transparent: true, opacity: 0.0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide, wireframe: true
      })
    );
    timeSlowFieldMesh.visible = false;
    g.add(timeSlowFieldMesh);

    // ---- 15. 时钟扫描光束 (秒针扫描攻击用，默认隐藏) — 新增 ----
    clockSweepMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 12),
      new THREE.MeshBasicMaterial({
        color: 0xff0044, transparent: true, opacity: 0.0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      })
    );
    clockSweepMesh.geometry.translate(0, 5, 0); // 从中心向上延伸
    clockSweepMesh.position.z = 1.1;
    clockSweepMesh.visible = false;
    clockGroup.add(clockSweepMesh);

    // ---- 16. 黄道环 (保留并增强) ----
    const zodiacGeo = new THREE.TorusGeometry(6.5, 0.1, 8, 64);
    const zodiacRing = new THREE.Mesh(zodiacGeo, new THREE.MeshBasicMaterial({ color: 0x00ddff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending }));
    zodiacRing.rotation.x = Math.PI / 2.5;
    g.add(zodiacRing);

    const runeMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, blending: THREE.AdditiveBlending });
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), runeMat);
      rune.position.set(Math.cos(ang) * 6.5, 0, Math.sin(ang) * 6.5);
      zodiacRing.add(rune);
    }

    // ---- 17. 光照系统 ----
    const lightTop = makeQualityDirLight(0x88aaff, 1.5);
    if (lightTop) { lightTop.position.set(5, 10, 7); g.add(lightTop); }
    const lightBottom = makeQualityDirLight(0xffaa00, 0.8);
    if (lightBottom) { lightBottom.position.set(-5, -8, 5); g.add(lightBottom); }
    const lightRim = makeQualityDirLight(0x00ffff, 1.2);
    if (lightRim) { lightRim.position.set(0, 5, -10); g.add(lightRim); }
    const ambientLight = makeQualityAmbientLight(0x223344, 0.4);
    if (ambientLight) g.add(ambientLight);

    // ---- 18. 动画逻辑 ----
    // 从 onBeforeRender 剥离：原给 20+ 个 mesh 各挂回调，每帧渲染时频繁进出回调，
    // 且逻辑分散 (如渲染编钟 0 时更新所有编钟、渲染 cracks[0] 时更新所有裂隙)。
    // 合并到 bossAnimFn 单次调用，缓存 performance.now() 与数组长度，降低 CPU 开销。
    // 注意：mainspringGroup / shardGroup 原本挂在 Group 上 (onBeforeRender 永不触发，
    // 属死代码)；现在统一在 update 中调用，这两组动画会真正生效 (主发条转动、碎片自转)。
    bossAnimFn = () => {
      const nowMs = performance.now();
      const t = nowMs * 0.001;

      // 漩涡旋转 (内外反向)
      vortex.rotation.z += 0.008;
      vortexInner.rotation.z -= 0.012;

      // 齿轮转动
      innerGear1.rotation.z += 0.006;
      innerGear2.rotation.z -= 0.015;
      mainspringGroup.rotation.z += 0.008;

      // 指针走动 (秒针最快)
      minHand.rotation.z -= 0.012;
      hourHand.rotation.z -= 0.003;
      secHand.rotation.z -= 0.06;

      // 全视之眼脉冲 + 虹膜缩放
      const eyePulse = 0.85 + Math.sin(nowMs * 0.003) * 0.15;
      eyeCore.scale.setScalar(eyePulse);
      eyeGlow.scale.setScalar(eyePulse * 1.1);
      iris.scale.setScalar(0.9 + Math.sin(nowMs * 0.005) * 0.1);

      // 星盘环旋转 (三层不同速度方向)
      const arLen = astrolabeRings.length;
      for (let i = 0; i < arLen; i++) {
        astrolabeRings[i].mesh.rotation.z += astrolabeRings[i].speed;
      }

      // 碎片轨道运动 + 自转 (InstancedMesh：shardGroup 整体旋转 + 每实例累计自转)
      shardGroup.rotation.z += 0.003;
      for (let i = 0; i < shardCount; i++) {
        shardRotX[i] += 0.02;
        shardRotY[i] += 0.015;
        _shardDummy.position.copy(shardBasePos[i]);
        _shardDummy.rotation.set(shardRotX[i], shardRotY[i], 0);
        _shardDummy.scale.set(1, 1, 1);
        _shardDummy.updateMatrix();
        shardInst.setMatrixAt(i, _shardDummy.matrix);
        // 光晕静态 (仅随 shardGroup 旋转)，无需每帧更新矩阵
      }
      shardInst.instanceMatrix.needsUpdate = true;

      // 编钟微动 + 内部光晕呼吸 (InstancedMesh：每实例 z 摆 + 光晕脉冲缩放)
      for (let i = 0; i < chimeCount; i++) {
        // 编钟本体：z 轴微摆
        _chimeDummy.position.copy(chimeBasePos[i]);
        _chimeDummy.rotation.set(0, 0, Math.sin(t * 2 + i) * 0.05);
        _chimeDummy.scale.set(1, 1, 1);
        _chimeDummy.updateMatrix();
        chimeInst.setMatrixAt(i, _chimeDummy.matrix);
        // 编钟光晕：脉冲缩放 (位置同编钟，无旋转)
        _chimeDummy.rotation.set(0, 0, 0);
        _chimeDummy.scale.setScalar(0.8 + Math.sin(t * 3 + i) * 0.2);
        _chimeDummy.updateMatrix();
        chimeGlowInst.setMatrixAt(i, _chimeDummy.matrix);
      }
      chimeInst.instanceMatrix.needsUpdate = true;
      chimeGlowInst.instanceMatrix.needsUpdate = true;

      // 摆锤摆动 (闭包内旋转 pendulumGroup)
      pendulumGroup.rotation.z = Math.sin(nowMs * 0.002) * 0.4;

      // 阶段水晶悬浮 + 自转
      phaseCrystal.rotation.y += 0.01;
      phaseCrystal.rotation.x += 0.005;
      phaseCrystal.position.y = 6.5 + Math.sin(nowMs * 0.002) * 0.3;

      // 时间裂隙闪烁 + 缓慢旋转
      const tc = nowMs * 0.005;
      const crLen = cracks.length;
      for (let i = 0; i < crLen; i++) {
        cracks[i].material.opacity = 0.4 + Math.sin(tc + i * 1.7) * 0.3;
        cracks[i].rotation.z += 0.002;
      }

      // 时间减速场旋转 (即使隐藏也保持动画)
      timeSlowFieldMesh.rotation.y += 0.005;
      timeSlowFieldMesh.rotation.x += 0.003;

      // 黄道环旋转
      zodiacRing.rotation.y += 0.004;
    };
  }

    // ===== Boss 通用：阶段核心可视化 =====
    // 确保 emissiveColor / e.color 等于 bossColor（修复原代码未为 Boss 设置 emissiveColor 的潜在 bug）
    emissiveColor = bossColor;
    lineColor = bossColor;
    // 一个半透明发光球壳，用于阶段切换闪光与蓄力攻击的视觉指示
    // 平时不可见（opacity=0），由 main.js 中的 bossChargeTelegraph / bossPhaseTransition 控制
    const phaseCoreGeo = new THREE.SphereGeometry(5.5, 24, 16);
    const phaseCoreMat = new THREE.MeshBasicMaterial({
      color: bossColor, transparent: true, opacity: 0.0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide
    });
    phaseCoreMesh = new THREE.Mesh(phaseCoreGeo, phaseCoreMat);
    g.add(phaseCoreMesh);

    // 内层蓄力核心（更小更亮，蓄力时优先显现）
    const innerCoreGeo = new THREE.SphereGeometry(2.0, 16, 12);
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.0,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const innerCoreMesh = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    g.add(innerCoreMesh);
    phaseCoreMesh.userData.innerCore = innerCoreMesh;

    // ===== Boss 通用：真实激光 mesh（类似激光兵，但更粗更亮，颜色随 Boss 变体） =====
    // 由 startBossLaserSweep / updateBossLaserSweep 控制可见性与朝向
    const bossLaserGeo = new THREE.CylinderGeometry(0.9, 0.9, 1000, 16);
    bossLaserGeo.translate(0, 500, 0); // 圆柱从原点向 +Y 延伸 1000 单位
    const bossLaserMat = makeQualityMaterial({
      color: bossColor, emissive: bossColor, emissiveIntensity: 2.5,
      metalness: 0.3, roughness: 0.4,
      transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false
    });
    bossLaserMesh = new THREE.Mesh(bossLaserGeo, bossLaserMat);
    bossLaserMesh.position.set(0, 0, -3); // 从 Boss 前端发射
    bossLaserMesh.visible = false;
    g.add(bossLaserMesh);

    // 外层光晕（更粗、更透明）
    const bossLaserGlowGeo = new THREE.CylinderGeometry(1.8, 1.8, 1000, 16);
    bossLaserGlowGeo.translate(0, 500, 0);
    const bossLaserGlowMat = new THREE.MeshBasicMaterial({
      color: bossColor, transparent: true, opacity: 0.2,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    });
    bossLaserGlowMesh = new THREE.Mesh(bossLaserGlowGeo, bossLaserGlowMat);
    bossLaserGlowMesh.position.set(0, 0, -3);
    bossLaserGlowMesh.visible = false;
    g.add(bossLaserGlowMesh);
    bossLaserMesh.userData.glowMesh = bossLaserGlowMesh;
    bossLaserMesh.userData.isBossLaser = true;
  }
  
  // 普通敌人属性计算
  hp = Math.ceil(hp * diff.eHpMul * waveMul);
  fireRate = Math.max(15, Math.floor(fireRate * diff.eRateMul / waveRateMul)); 
  bulletSpeed = bulletSpeed * diff.eBSpdMul * waveSpdMul;
  maxSpeed = maxSpeed * diff.eSpdMul * waveSpdMul;
  
  // 修复：排除了 type === 2 和 type === 3，防止冲撞者和 Boss 被覆盖为默认杂兵模型
  // 这同时修复了 Boss 转换形态后亮成一团的 bug（避免了在 Boss 体内生成多余的发光杂兵模型）
  if (type !== 1 && type !== 0 && type !== 2 && type !== 3 && type !== 4 && type !== 5 && type !== 6 && type !== 7) {
    const bodyGeo = new THREE.ConeGeometry(0.8, 3.0, 4);
    bodyGeo.rotateX(-Math.PI/2); 
    const body = new THREE.Mesh(bodyGeo, makeQualityMaterial({ color: bodyColor, emissive: emissiveColor, emissiveIntensity: 1.5, shininess: 80, metalness: 0.5, roughness: 0.5 }));
    g.add(body);
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo), new THREE.LineBasicMaterial({ color: lineColor })));

    const wingGeo = new THREE.BoxGeometry(2.5, 0.15, 0.8);
    const wing = new THREE.Mesh(wingGeo, makeQualityMaterial({ color: bodyColor, emissive: emissiveColor, emissiveIntensity: 1.5, metalness: 0.5, roughness: 0.5 }));
    wing.position.z = 0.5; g.add(wing);
  }
  g.scale.setScalar(scale);

  let enemyRadius = 3.0;
  if (type === 1) enemyRadius = 4.8;
  if (type === 2) enemyRadius = 3.5;
  if (type === 4) enemyRadius = 3.2;
  if (type === 5) enemyRadius = 3.5;
  if (type === 6) enemyRadius = 4.0;
  if (type === 7) enemyRadius = 2.8;
  
  const enemyData = { 
    mesh:g, hp, maxHp: hp, color: emissiveColor, type, scale,  
    maxSpeed: maxSpeed, vel: new THREE.Vector3(0,0,-1),
    fireTimer: Math.random()*50, maxFireTimer: fireRate, bulletSpeed: bulletSpeed, 
    radius: enemyRadius * scale, desiredDist: 60, 
    orbitDir: Math.random() > 0.5 ? 1 : -1,
    orbitHeight: (Math.random() - 0.5) * 10,
    bossState: 0, stateTimer: 200,
    behavior: behavior,
    swingOffset: Math.random() * Math.PI * 2,
    crashDamage: crashDamage,
    swingSpeed: swingSpeed
  };

  if (type === 1 && laserMesh) {
    const laserDiffSettings = {
      casual:   { firingTime: 400, coolingTime: 420, turnSpeed: 0.04, dmg: 0.5 },
      easy:     { firingTime: 500, coolingTime: 360, turnSpeed: 0.06, dmg: 0.8 },
      standard: { firingTime: 600, coolingTime: 300, turnSpeed: 0.08, dmg: 1.0 },
      hard:     { firingTime: 700, coolingTime: 240, turnSpeed: 0.10, dmg: 1.2 },
      hell:     { firingTime: 800, coolingTime: 180, turnSpeed: 0.13, dmg: 1.5 }
    };
    const lSet = laserDiffSettings[STATE.difficulty] || laserDiffSettings.standard;

    enemyData.laserMesh = laserMesh;
    enemyData.laserState = 'cooling';
    enemyData.laserTimer = 0;
    enemyData.laserTargetDir = new THREE.Vector3(0, 0, 1);
    enemyData.laserFiringTime = lSet.firingTime;
    enemyData.laserCoolingTime = lSet.coolingTime;
    enemyData.laserTurnSpeed = lSet.turnSpeed;
    enemyData.laserDamage = lSet.dmg;
  }

  // ===== Boss 专属状态字段（多阶段攻击系统） =====
  if (type === 3) {
    enemyData.bossVariant = bossVariant || 0;
    enemyData.bossPhase = 1;              // 当前阶段 1/2/3
    enemyData.attackIndex = 0;            // 阶段内攻击循环索引
    enemyData.charging = false;           // 是否正在蓄力
    enemyData.chargeTimer = 0;            // 蓄力倒计时（帧）
    enemyData.chargeTotal = 0;            // 蓄力总时长（用于进度比例）
    enemyData.pendingAttack = -1;         // 蓄力完成后待执行的攻击 ID
    enemyData.minions = [];               // 僚机列表（修复原代码未初始化的潜在 bug）
    enemyData.gravityWells = [];          // 活跃引力井列表（深渊吞噬者）
    enemyData.voidStormCount = 0;         // 虚空风暴剩余瞬移次数（虚空之眼）
    enemyData.voidStormTimer = 0;         // 虚空风暴子计时器
    enemyData.crystalBurstCount = 0;      // 晶体爆裂剩余波数（晶簇巨像）
    enemyData.crystalBurstTimer = 0;      // 晶体爆裂子计时器
    // ===== 晶簇巨像晶体攻击扩展字段 =====
    enemyData.crystalResonanceField = crystalResonanceFieldMesh; // 晶体共振场 mesh 引用（默认隐藏）
    enemyData.crystalResonanceTimer = 0;  // 晶体共振场剩余帧数
    enemyData.crystalPrisons = [];        // 晶体牢笼标记列表 {mesh, pos, timer, dir}
    enemyData.prismKaleidoscopeCount = 0; // 棱镜万花筒剩余波数
    enemyData.prismKaleidoscopeTimer = 0; // 棱镜万花筒子计时器
    enemyData.crystalSpikeCooldown = 0;   // 晶刺穿刺冷却帧数
    enemyData.prismRefractionActive = false; // 棱镜折射是否激活
    enemyData.prismRefractionTimer = 0;   // 棱镜折射剩余帧数
    enemyData.prophecyLockPos = null;     // 预言锁定标记位置（机械神谕）
    enemyData.prophecyLockTimer = 0;      // 预言锁定倒计时
    enemyData.turretDrones = [];          // 临时炮塔无人机列表（机械神谕）
    // ===== 机械神谕时间操控扩展字段 =====
    enemyData.timePhase = 0;              // 时间相位：0=正常 1=减速 2=倒流 3=停止 4=加速
    enemyData.timePhaseTimer = 0;         // 当前时间相位剩余帧数
    enemyData.timeSlowField = timeSlowFieldMesh; // 时间减速场 mesh 引用（默认隐藏）
    enemyData.clockSweepMesh = clockSweepMesh;   // 时钟扫描光束 mesh 引用（默认隐藏）
    enemyData.timeRifts = [];             // 时间裂隙列表 {mesh, pos, timer, radius}
    enemyData.prophecyLocks = [];         // 多重预言锁定标记列表 {mesh, pos, timer}
    enemyData.timeEchoes = [];            // 时间回响列表（Boss 残影重放攻击）
    enemyData.clockSweepActive = false;   // 时钟扫描攻击是否激活
    enemyData.clockSweepAngle = 0;        // 时钟扫描当前角度
    enemyData.clockSweepDir = 1;          // 时钟扫描方向 (+1/-1)
    enemyData.clockSweepTimer = 0;        // 时钟扫描剩余帧数
    enemyData.eternalClockCount = 0;      // 永恒之钟剩余波数 (12 方向弹幕)
    enemyData.eternalClockTimer = 0;      // 永恒之钟子计时器
    enemyData.timeStopActive = false;     // 时间停止是否激活
    enemyData.timeStopTimer = 0;          // 时间停止剩余帧数
    enemyData.timeReverseTimer = 0;       // 时间倒流剩余帧数
    enemyData.futureSightTimer = 0;       // 未来视预演剩余帧数
    enemyData.futureBullets = [];         // 未来视预演子弹列表 {pos, vel, timer, fired}
    enemyData.laserSweep = null;          // 激光扫射状态对象
    enemyData.gravityWaveField = null;    // 引力波持续引力场（深渊吞噬者 phase 1）
    enemyData.bossLaserMesh = bossLaserMesh;       // Boss 真实激光 mesh（类似激光兵）
    enemyData.bossLaserGlow = bossLaserGlowMesh;   // Boss 激光外层光晕
    enemyData.phaseCore = phaseCoreMesh;  // 阶段核心可视化网格引用
    enemyData.stateTimer = 200;           // 首次攻击前的准备时间
    // 统一装饰动画更新函数 (从各 mesh 的 onBeforeRender 剥离合并而成)；
    // 由 main.js 的 animate() 每帧调用一次，避免大量渲染回调的频繁进出开销。
    enemyData.updateBossAnimations = bossAnimFn;
    // Boss 子弹/导弹/冲刺判定半径：Boss 视觉模型缩放 8 倍后外径远大于 radius(24)，
    // 用 radius 作命中球会导致子弹穿过外壳。此处单独给一个更大的判定半径，
    // 仅用于"玩家攻击命中 Boss"的检测（不影响 Boss 撞玩家的 crashDistance）。
    enemyData.bulletHitRadius = 40;
  }

  // ===== 一次性增强环境贴图反射强度 =====
  // 让金属在任何角度都有可见反射。原方案曾试图用 g.onBeforeRender 做 emissive 呼吸动画，
  // 但 THREE.Group 不进渲染列表、onBeforeRender 永不触发（属死代码，已删除）。
  // 若需呼吸效果，应挂到 main.js 的敌人每帧更新循环里。
  {
    g.traverse(function(obj){
      if(obj.isMesh && obj.material && obj.material.envMapIntensity !== undefined){
        obj.material.envMapIntensity = 1.5;
      }
    });
  }

  return enemyData;
}

function spawnEnemy(wave){
  let type=0; const r=Math.random();
  if(wave>=7 && r<0.10) type=7;
  else if(wave>=6 && r<0.22) type=6;
  else if(wave>=5 && r<0.35) type=5;
  else if(wave>=4 && r<0.48) type=4;
  else if(wave>=3 && r<0.62) type=2;
  else if(wave>=2 && r<0.80) type=1;
  else type=0;
  
  const e = createEnemyShip(type);
  
  const dist = (type === 1 || type === 6 ? 350 : (type === 7 ? 250 : 200)) + Math.random()*50; 
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(Math.random() * 2 - 1);
  const dir = new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.sin(phi) * Math.sin(theta),
    Math.cos(phi)
  );
  e.mesh.position.copy(player.position).add(dir.multiplyScalar(dist));
    
  scene.add(e.mesh); enemies.push(e);
}

// ============================================================================
// ===== 机械神谕时间操控辅助函数 (供 main.js 调用) =====
// ============================================================================

// 创建时间裂隙区域 (持续伤害区)
function spawnTimeRift(bossEnemy, pos, radius) {
  if (!bossEnemy || bossEnemy.bossVariant !== 3) return;
  const r = radius || 5;
  const riftGeo = new THREE.RingGeometry(r * 0.4, r, 32);
  riftGeo.rotateX(Math.PI / 2);
  const riftMat = new THREE.MeshBasicMaterial({
    color: 0x00ddff, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
  });
  const riftMesh = new THREE.Mesh(riftGeo, riftMat);
  riftMesh.position.copy(pos);
  // 内层亮环
  const innerGeo = new THREE.RingGeometry(r * 0.15, r * 0.3, 32);
  innerGeo.rotateX(Math.PI / 2);
  const innerMesh = new THREE.Mesh(innerGeo, new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
  }));
  innerMesh.position.copy(pos);
  scene.add(riftMesh);
  scene.add(innerMesh);
  bossEnemy.timeRifts.push({ mesh: riftMesh, inner: innerMesh, pos: pos.clone(), timer: 300, radius: r });
}

// 创建预言锁定标记 (延迟引爆的位置标记)
function spawnProphecyLockMarker(bossEnemy, pos) {
  if (!bossEnemy || bossEnemy.bossVariant !== 3) return;
  const markerGeo = new THREE.TorusGeometry(2, 0.2, 8, 32);
  markerGeo.rotateX(Math.PI / 2);
  const markerMat = new THREE.MeshBasicMaterial({
    color: 0xffaa00, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const markerMesh = new THREE.Mesh(markerGeo, markerMat);
  markerMesh.position.copy(pos);
  // 内层十字准星
  const crossMat = new THREE.LineBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.9 });
  const crossGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-1.5, 0, 0), new THREE.Vector3(1.5, 0, 0),
    new THREE.Vector3(0, 0, -1.5), new THREE.Vector3(0, 0, 1.5)
  ]);
  const cross = new THREE.LineSegments(crossGeo, crossMat);
  cross.position.copy(pos);
  scene.add(markerMesh);
  scene.add(cross);
  bossEnemy.prophecyLocks.push({ mesh: markerMesh, cross: cross, pos: pos.clone(), timer: 120 });
}

// 显示时间减速场 (玩家进入后移动/射速减半)
function showTimeSlowField(bossEnemy, radius) {
  if (!bossEnemy || bossEnemy.bossVariant !== 3 || !bossEnemy.timeSlowField) return;
  const scale = (radius || 10) / 10;
  bossEnemy.timeSlowField.scale.setScalar(scale);
  bossEnemy.timeSlowField.visible = true;
  bossEnemy.timeSlowField.material.opacity = 0.15;
  bossEnemy.timePhase = 1;
}

// 隐藏时间减速场
function hideTimeSlowField(bossEnemy) {
  if (!bossEnemy || !bossEnemy.timeSlowField) return;
  bossEnemy.timeSlowField.visible = false;
  bossEnemy.timeSlowField.material.opacity = 0;
  if (bossEnemy.timePhase === 1) bossEnemy.timePhase = 0;
}

// 激活时钟扫描攻击 (秒针拉长扫射)
function startClockSweep(bossEnemy, duration) {
  if (!bossEnemy || bossEnemy.bossVariant !== 3 || !bossEnemy.clockSweepMesh) return;
  bossEnemy.clockSweepActive = true;
  bossEnemy.clockSweepTimer = duration || 180;
  bossEnemy.clockSweepMesh.visible = true;
  bossEnemy.clockSweepMesh.material.opacity = 0.6;
}

// 停止时钟扫描攻击
function stopClockSweep(bossEnemy) {
  if (!bossEnemy || !bossEnemy.clockSweepMesh) return;
  bossEnemy.clockSweepActive = false;
  bossEnemy.clockSweepTimer = 0;
  bossEnemy.clockSweepMesh.visible = false;
  bossEnemy.clockSweepMesh.material.opacity = 0;
}

// 清理机械神谕所有时间特效 (Boss 死亡时调用)
function clearMechanicalOracleEffects(bossEnemy) {
  if (!bossEnemy || bossEnemy.bossVariant !== 3) return;
  // 清理时间裂隙
  for (const rift of bossEnemy.timeRifts) {
    if (rift.mesh) { scene.remove(rift.mesh); disposeNode(rift.mesh); }
    if (rift.inner) { scene.remove(rift.inner); disposeNode(rift.inner); }
  }
  bossEnemy.timeRifts.length = 0;
  // 清理预言锁定
  for (const lock of bossEnemy.prophecyLocks) {
    if (lock.mesh) { scene.remove(lock.mesh); disposeNode(lock.mesh); }
    if (lock.cross) { scene.remove(lock.cross); disposeNode(lock.cross); }
  }
  bossEnemy.prophecyLocks.length = 0;
  // 清理未来视子弹
  bossEnemy.futureBullets.length = 0;
  // 隐藏减速场与扫描光束
  hideTimeSlowField(bossEnemy);
  stopClockSweep(bossEnemy);
  bossEnemy.timePhase = 0;
  bossEnemy.timeStopActive = false;
  bossEnemy.timeReverseTimer = 0;
}

// 更新机械神谕时间特效 (每帧由 main.js 调用)
// 返回值：当前时间相位 (0=正常 1=减速 2=倒流 3=停止)
function updateMechanicalOracleEffects(bossEnemy, dt) {
  if (!bossEnemy || bossEnemy.bossVariant !== 3) return 0;
  const t = performance.now() * 0.005;

  // 更新时间裂隙
  for (let i = bossEnemy.timeRifts.length - 1; i >= 0; i--) {
    const rift = bossEnemy.timeRifts[i];
    rift.timer--;
    // 旋转 + 呼吸
    if (rift.mesh) {
      rift.mesh.rotation.z += 0.02;
      rift.mesh.material.opacity = 0.3 + Math.sin(t + i) * 0.2;
    }
    if (rift.inner) {
      rift.inner.rotation.z -= 0.03;
      rift.inner.scale.setScalar(0.8 + Math.sin(t * 2 + i) * 0.2);
    }
    if (rift.timer <= 0) {
      if (rift.mesh) { scene.remove(rift.mesh); disposeNode(rift.mesh); }
      if (rift.inner) { scene.remove(rift.inner); disposeNode(rift.inner); }
      bossEnemy.timeRifts.splice(i, 1);
    }
  }

  // 更新预言锁定标记
  for (let i = bossEnemy.prophecyLocks.length - 1; i >= 0; i--) {
    const lock = bossEnemy.prophecyLocks[i];
    lock.timer--;
    // 倒计时越接近 0 闪烁越快
    const flashRate = lock.timer < 60 ? 0.02 : 0.008;
    const opacity = 0.4 + Math.abs(Math.sin(t * (lock.timer < 60 ? 3 : 1.5))) * 0.5;
    if (lock.mesh) {
      lock.mesh.rotation.z += flashRate;
      lock.mesh.material.opacity = opacity;
      lock.mesh.scale.setScalar(1 + (120 - lock.timer) / 240);
    }
    if (lock.cross) {
      lock.cross.rotation.y += flashRate * 2;
      lock.cross.material.opacity = opacity;
    }
    if (lock.timer <= 0) {
      if (lock.mesh) { scene.remove(lock.mesh); disposeNode(lock.mesh); }
      if (lock.cross) { scene.remove(lock.cross); disposeNode(lock.cross); }
      bossEnemy.prophecyLocks.splice(i, 1);
    }
  }

  // 更新时钟扫描光束
  if (bossEnemy.clockSweepActive && bossEnemy.clockSweepMesh) {
    bossEnemy.clockSweepTimer--;
    bossEnemy.clockSweepAngle += 0.025 * bossEnemy.clockSweepDir;
    bossEnemy.clockSweepMesh.rotation.z = bossEnemy.clockSweepAngle;
    // 光束闪烁
    bossEnemy.clockSweepMesh.material.opacity = 0.4 + Math.sin(t * 4) * 0.2;
    if (bossEnemy.clockSweepTimer <= 0) {
      stopClockSweep(bossEnemy);
    }
  }

  // 更新时间相位计时
  if (bossEnemy.timePhaseTimer > 0) {
    bossEnemy.timePhaseTimer--;
    if (bossEnemy.timePhaseTimer <= 0 && bossEnemy.timePhase === 1) {
      hideTimeSlowField(bossEnemy);
    }
  }

  // 更新时间停止
  if (bossEnemy.timeStopActive) {
    bossEnemy.timeStopTimer--;
    if (bossEnemy.timeStopTimer <= 0) {
      bossEnemy.timeStopActive = false;
      bossEnemy.timePhase = 0;
    }
  }

  // 更新时间倒流
  if (bossEnemy.timeReverseTimer > 0) {
    bossEnemy.timeReverseTimer--;
    if (bossEnemy.timeReverseTimer <= 0 && bossEnemy.timePhase === 2) {
      bossEnemy.timePhase = 0;
    }
  }

  return bossEnemy.timePhase;
}

// ============================================================================
// ===== 晶簇巨像晶体攻击辅助函数 (供 main.js 调用) =====
// ============================================================================

// 显示晶体共振场 (玩家进入后移速减半 + 持续伤害)
function showCrystalResonanceField(bossEnemy, radius) {
  if (!bossEnemy || bossEnemy.bossVariant !== 1 || !bossEnemy.crystalResonanceField) return;
  const scale = (radius || 12) / 12;
  bossEnemy.crystalResonanceField.scale.setScalar(scale);
  bossEnemy.crystalResonanceField.visible = true;
  bossEnemy.crystalResonanceField.material.opacity = 0.2;
}

// 隐藏晶体共振场
function hideCrystalResonanceField(bossEnemy) {
  if (!bossEnemy || !bossEnemy.crystalResonanceField) return;
  bossEnemy.crystalResonanceField.visible = false;
  bossEnemy.crystalResonanceField.material.opacity = 0;
}

// 创建晶体牢笼标记 (在玩家周围生成多个晶体，延迟后向中心汇聚)
function spawnCrystalPrisonMarker(bossEnemy, pos, index, total) {
  if (!bossEnemy || bossEnemy.bossVariant !== 1) return;
  const prisonGeo = new THREE.OctahedronGeometry(1.2, 0);
  const prisonMat = makeQualityMaterial({
    color: 0x00ddff, emissive: 0x00aaff, emissiveIntensity: 1.8,
    metalness: 0.4, roughness: 0.15,
    transparent: true, opacity: 0.8, flatShading: true
  }, { transmission: 0.5, thickness: 1.0, ior: 1.6, clearcoat: 1.0, clearcoatRoughness: 0.1 });
  const prisonMesh = new THREE.Mesh(prisonGeo, prisonMat);
  prisonMesh.position.copy(pos);
  // 晶体边缘线框
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(prisonGeo),
    new THREE.LineBasicMaterial({ color: 0xaaeeff, transparent: true, opacity: 0.9 })
  );
  edges.position.copy(pos);
  scene.add(prisonMesh);
  scene.add(edges);
  // 朝向中心的方向
  const dir = new THREE.Vector3().copy(pos).negate().normalize();
  bossEnemy.crystalPrisons.push({ mesh: prisonMesh, edges: edges, pos: pos.clone(), timer: 100, dir: dir, index: index, total: total });
}

// 清理晶簇巨像所有晶体特效 (Boss 死亡时调用)
function clearCrystalColossusEffects(bossEnemy) {
  if (!bossEnemy || bossEnemy.bossVariant !== 1) return;
  // 清理晶体牢笼
  for (const prison of bossEnemy.crystalPrisons) {
    if (prison.mesh) { scene.remove(prison.mesh); disposeNode(prison.mesh); }
    if (prison.edges) { scene.remove(prison.edges); disposeNode(prison.edges); }
  }
  bossEnemy.crystalPrisons.length = 0;
  // 隐藏共振场
  hideCrystalResonanceField(bossEnemy);
  // 重置状态
  bossEnemy.crystalResonanceTimer = 0;
  bossEnemy.prismKaleidoscopeCount = 0;
  bossEnemy.prismKaleidoscopeTimer = 0;
  bossEnemy.prismRefractionActive = false;
  bossEnemy.prismRefractionTimer = 0;
}

// 更新晶簇巨像晶体特效 (每帧由 main.js 调用)
function updateCrystalColossusEffects(bossEnemy, dt) {
  if (!bossEnemy || bossEnemy.bossVariant !== 1) return;
  const t = performance.now() * 0.005;

  // 更新晶体共振场计时
  if (bossEnemy.crystalResonanceTimer > 0) {
    bossEnemy.crystalResonanceTimer--;
    // 共振场内造成持续伤害 + 减速 (由 main.js 处理)
    if (bossEnemy.crystalResonanceField && bossEnemy.crystalResonanceField.visible) {
      bossEnemy.crystalResonanceField.material.opacity = 0.15 + Math.sin(t * 2) * 0.08;
    }
    if (bossEnemy.crystalResonanceTimer <= 0) {
      hideCrystalResonanceField(bossEnemy);
    }
  }

  // 更新晶体牢笼标记
  for (let i = bossEnemy.crystalPrisons.length - 1; i >= 0; i--) {
    const prison = bossEnemy.crystalPrisons[i];
    prison.timer--;
    // 旋转 + 闪烁
    if (prison.mesh) {
      prison.mesh.rotation.y += 0.03;
      prison.mesh.rotation.x += 0.02;
      const opacity = 0.5 + Math.abs(Math.sin(t + prison.index)) * 0.4;
      prison.mesh.material.opacity = opacity;
    }
    if (prison.edges) {
      prison.edges.rotation.y += 0.03;
      prison.edges.rotation.x += 0.02;
    }
    if (prison.timer <= 0) {
      if (prison.mesh) { scene.remove(prison.mesh); disposeNode(prison.mesh); }
      if (prison.edges) { scene.remove(prison.edges); disposeNode(prison.edges); }
      bossEnemy.crystalPrisons.splice(i, 1);
    }
  }

  // 更新棱镜折射计时
  if (bossEnemy.prismRefractionTimer > 0) {
    bossEnemy.prismRefractionTimer--;
    if (bossEnemy.prismRefractionTimer <= 0) {
      bossEnemy.prismRefractionActive = false;
    }
  }
}
