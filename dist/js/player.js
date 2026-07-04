// player.js — 玩家飞船
/* --- 玩家飞船 (高面数精细版 + 真实发光尾焰) --- */
function createPlayerShip(){
  const g = new THREE.Group();
  
  // 1. 使用 LatheGeometry 构建流线型高面数机身
  const bodyPoints = [];
  const segments = 24;
  for(let i = 0; i <= segments; i++) {
    const t = i / segments;
    const r = Math.sin(t * Math.PI) * 0.6 * (1 - t * 0.15) + 0.05;
    const y = (t - 0.5) * 2.4;
    bodyPoints.push(new THREE.Vector2(Math.max(0.001, r), y));
  }
  const bodyGeo = new THREE.LatheGeometry(bodyPoints, 32); 
  bodyGeo.rotateX(-Math.PI/2); 
  const bodyMat = makeQualityMaterial({ color:0x4a6a8a, emissive:0x0080a0, emissiveIntensity:1.2, shininess:120, specular:0x00ffe5, metalness:0.35, roughness:0.3 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  g.add(body);
  
  // 2. 带有倒角和步进的高精度机翼
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0,0); wingShape.lineTo(1.6,-0.6); wingShape.lineTo(1.2,0.2); wingShape.lineTo(0,0.4); wingShape.lineTo(0,0);
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { 
    depth:0.1, bevelEnabled:true, bevelThickness:0.04, bevelSize:0.04, bevelSegments: 4, steps: 2
  });
  const wingMat = makeQualityMaterial({ color:0x3a4a6a, emissive:0x004060, emissiveIntensity:0.9, shininess:80, metalness:0.35, roughness:0.4 });
  const wingL = new THREE.Mesh(wingGeo, wingMat); wingL.rotation.y=Math.PI/2; wingL.position.set(-0.05,-0.05,0.5);
  const wingR = wingL.clone(); wingR.scale.x=-1;
  g.add(wingL, wingR);
  
  const wingEdges = new THREE.EdgesGeometry(wingGeo);
  const wingLines = new THREE.LineSegments(wingEdges, new THREE.LineBasicMaterial({ color:0x00ffe5 }));
  wingLines.rotation.y = Math.PI/2; wingLines.position.copy(wingL.position);
  g.add(wingLines);
  const wingLinesR = wingLines.clone(); wingLinesR.scale.x = -1;
  g.add(wingLinesR);
  
  // 3. 真实发光尾焰 (核心 + 外层光晕)
  function createEngine(x) {
    const group = new THREE.Group();
    
    // 核心火焰：纯白色，越靠近中心越亮
    const coreGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.scale.set(1, 1, 1.6); // 略微拉长
    group.add(core);
    
    // 外层光晕：半透明青色，加性混合制造外发光效果
    const glowGeo = new THREE.SphereGeometry(0.35, 24, 24);
    const glowMat = new THREE.MeshBasicMaterial({ 
      color: 0x00ffe5, 
      transparent: true, 
      opacity: 0.4, 
      blending: THREE.AdditiveBlending, // 关键：加性混合，颜色叠加产生光晕
      depthWrite: false 
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.scale.set(1, 1, 2.2); // 比核心更拉长，形成喷射感
    group.add(glow);
    
    // 最外层柔光晕：更大更淡，增加扩散感
    const hazeGeo = new THREE.SphereGeometry(0.45, 24, 24);
    const hazeMat = new THREE.MeshBasicMaterial({ 
      color: 0x00ffe5, 
      transparent: true, 
      opacity: 0.15, 
      blending: THREE.AdditiveBlending, 
      depthWrite: false 
    });
    const haze = new THREE.Mesh(hazeGeo, hazeMat);
    haze.scale.set(1, 1, 2.0);
    group.add(haze);

    group.position.set(x, -0.05, 1.4);
    return group;
  }

  const e1 = createEngine(-0.35);
  const e2 = createEngine(0.35);
  g.add(e1, e2);
  
  // 将三层发光体分别存入 userData 以便在 update 中动态缩放闪烁
  g.userData = {
    engineLight: makeQualityLight(0x00ffe5, 1.5, 30),
    e1_core: e1.children[0], e1_glow: e1.children[1], e1_haze: e1.children[2],
    e2_core: e2.children[0], e2_glow: e2.children[1], e2_haze: e2.children[2]
  };
  if (g.userData.engineLight) {
    g.userData.engineLight.position.set(0,0,1.5);
    g.add(g.userData.engineLight);
  }
  // === 修改：量子护盾模型 (足球状立体感) ===
  const shieldGeo = new THREE.IcosahedronGeometry(2.2, 1);
  // ===== 自定义能量场着色器：扭曲折射 + 菲涅尔边缘发光 =====
  const shieldMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0.15 },
      uShieldColor: { value: new THREE.Color(0x00aaff) },
      uEdgeColor: { value: new THREE.Color(0x00ffff) }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vWorldPos;
      uniform float uTime;
      
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec3 pos = position;
        // 顶点轻微波动，模拟能量场不稳定感
        float wave = sin(pos.x * 3.0 + uTime * 2.0) * cos(pos.y * 3.0 + uTime * 1.5) * 0.04;
        pos += normal * wave;
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        vViewPosition = -mvPosition.xyz;
        vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uShieldColor;
      uniform vec3 uEdgeColor;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec3 vWorldPos;
      
      // 简易噪声函数
      float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      
      void main() {
        vec3 viewDir = normalize(vViewPosition);
        // 菲涅尔效应：边缘越亮
        float fresnel = 1.0 - abs(dot(vNormal, viewDir));
        fresnel = pow(fresnel, 2.5);
        
        // 能量流动条纹
        float flow = sin(vWorldPos.y * 5.0 - uTime * 3.0) * 0.5 + 0.5;
        flow = smoothstep(0.4, 0.6, flow);
        
        // 噪声扰动
        float noise = hash(vWorldPos * 2.0 + uTime * 0.5);
        noise = smoothstep(0.5, 0.8, noise);
        
        // 颜色混合：中心蓝色 + 边缘青色高光
        vec3 color = mix(uShieldColor, uEdgeColor, fresnel);
        color += uEdgeColor * flow * 0.3;
        color += uEdgeColor * noise * 0.2;
        
        // 透明度：边缘更不透明（菲涅尔），中心更透明
        float alpha = uOpacity + fresnel * 0.4 + flow * 0.1;
        alpha = clamp(alpha, 0.0, 0.85);
        
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
  shieldMesh.position.z = -0.5;
  shieldMesh.visible = false;
  
  // 加上线框增加足球质感
  const edgesGeo = new THREE.EdgesGeometry(shieldGeo);
  const edgesMat = new THREE.LineBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.6 });
  const shieldEdges = new THREE.LineSegments(edgesGeo, edgesMat);
  shieldMesh.add(shieldEdges);
  
  g.add(shieldMesh);
  g.userData.shieldMesh = shieldMesh;
  
  // 4. 驾驶舱（半透明发光球体）
  const cockpitGeo = new THREE.SphereGeometry(0.25, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  cockpitGeo.rotateX(-Math.PI / 2);
  const cockpitMat = makeQualityMaterial({ color: 0x00ffe5, emissive: 0x00ffe5, emissiveIntensity: 0.5, transparent: true, opacity: 0.7, shininess: 200, specular: 0xffffff, metalness: 0.3, roughness: 0.1 });
  const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
  cockpit.position.set(0, 0.15, -0.6);
  cockpit.scale.set(1, 0.6, 1.4);
  g.add(cockpit);
  
  // 5. 机翼武器挂点（发光节点）
  const podGeo = new THREE.BoxGeometry(0.15, 0.15, 0.5);
  const podMat = makeQualityMaterial({ color: 0x3a4a6a, emissive: 0x00ffe5, emissiveIntensity: 0.8, metalness: 0.35, roughness: 0.4 });
  const podL = new THREE.Mesh(podGeo, podMat); podL.position.set(-1.3, -0.05, 0.3); g.add(podL);
  const podR = new THREE.Mesh(podGeo, podMat); podR.position.set(1.3, -0.05, 0.3); g.add(podR);
  
  // 6. 机鼻尖端发光点
  const noseGeo = new THREE.SphereGeometry(0.08, 8, 8);
  const nose = new THREE.Mesh(noseGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending }));
  nose.position.set(0, 0, -1.2);
  g.add(nose);

  // 提升 PBR 材质的环境贴图反射强度(与敌人一致设为 1.5)，让做大后的太阳亮斑
  // 在深色机身上形成明显的方向性高光，避免"无物可反射"的发黑感
  g.traverse(obj => {
    if (obj.material && obj.material.envMapIntensity !== undefined) {
      obj.material.envMapIntensity = 1.5;
    }
  });

  return g;
}
const player = createPlayerShip(); scene.add(player);
// 锁定指示器 (一个线框圆环)
const lockIndicator = new THREE.Mesh(
  new THREE.TorusGeometry(3, 0.2, 4, 12),
  new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.8 })
);
lockIndicator.visible = false;
scene.add(lockIndicator);

const PLAYER = { pos:new THREE.Vector3(0,0,0), prevPos:new THREE.Vector3(0,0,0), vel:new THREE.Vector3(), quaternion: new THREE.Quaternion(), roll:0, fireCooldown:0 };
