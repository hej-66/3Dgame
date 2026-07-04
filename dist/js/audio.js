// audio.js — 语音合成、BGM、音效
// 说话者音色配置：键为稳定 sid（见 state.js SPEAKER_SID），与显示名解耦，便于国际化
const VOICE_CONFIG = {
  'luna7': {
    rate: 0.9, pitch: 1.0, volume: 0.9,
    preferredVoices: ['samantha', 'jenny', 'aria', 'zira', 'michelle', 'google us english'],
    // Web Audio 音色签名：标准女声，清晰专业
    audio: { baseFreq: 220, waveform: 'sine', filterType: 'lowpass', filterFreq: 2200, vibratoRate: 5, vibratoDepth: 4, attack: 0.02, release: 0.15, gain: 0.12 }
  },
  'tactician': {
    rate: 0.85, pitch: 0.8, volume: 0.85,
    preferredVoices: ['david', 'guy', 'mark', 'george', 'alex', 'google uk english male'],
    // 沉稳男声，略带严肃
    audio: { baseFreq: 130, waveform: 'triangle', filterType: 'lowpass', filterFreq: 1400, vibratoRate: 4, vibratoDepth: 3, attack: 0.03, release: 0.2, gain: 0.14 }
  },
  'voideye': {
    rate: 0.65, pitch: 0.4, volume: 1.0,
    preferredVoices: ['george', 'ryan', 'david', 'guy', 'google uk english male'],
    // 低沉缓慢的男声，神秘诡异
    audio: { baseFreq: 75, waveform: 'sawtooth', filterType: 'lowpass', filterFreq: 500, vibratoRate: 2.5, vibratoDepth: 6, attack: 0.08, release: 0.4, gain: 0.16, delay: true }
  },
  'crystal': {
    rate: 0.6, pitch: 0.3, volume: 0.95,
    preferredVoices: ['mark', 'david', 'guy', 'george', 'google uk english male'],
    // 非常低沉，怪物感
    audio: { baseFreq: 50, waveform: 'square', filterType: 'lowpass', filterFreq: 350, vibratoRate: 1.8, vibratoDepth: 8, attack: 0.12, release: 0.5, gain: 0.18, distortion: true }
  },
  'abyss': {
    rate: 0.55, pitch: 0.25, volume: 1.0,
    preferredVoices: ['george', 'david', 'guy', 'google uk english male'],
    // 极低沉，充满压迫感
    audio: { baseFreq: 38, waveform: 'sawtooth', filterType: 'lowpass', filterFreq: 280, vibratoRate: 1.5, vibratoDepth: 10, attack: 0.15, release: 0.6, gain: 0.2, delay: true, distortion: true }
  },
  'oracle': {
    rate: 0.7, pitch: 0.9, volume: 0.95,
    preferredVoices: ['zira', 'jenny', 'aria', 'google us english'],
    // 较高音调的女声，机械感
    audio: { baseFreq: 330, waveform: 'square', filterType: 'highpass', filterFreq: 180, vibratoRate: 8, vibratoDepth: 2, attack: 0.01, release: 0.1, gain: 0.1, ringMod: true }
  },
  'system': {
    rate: 0.85, pitch: 1.3, volume: 0.85,
    preferredVoices: ['zira', 'jenny', 'aria', 'google us english'],
    // 高音调，电子音感
    audio: { baseFreq: 440, waveform: 'square', filterType: 'bandpass', filterFreq: 1200, filterQ: 3, vibratoRate: 12, vibratoDepth: 1.5, attack: 0.005, release: 0.06, gain: 0.08, tremolo: true }
  }
};

const DIALOGUE_ENGLISH = {
  '指挥官，检测到异常空间波动正在接近太阳系。来源未知，能量读数超出常规范围。': 
    'Commander, detecting anomalous spatial fluctuations approaching the solar system. Source unknown, energy readings exceed normal parameters.',
  '火星殖民地已经失去联系，木星轨道站报告大规模舰体损毁。':
    'Mars colony has lost contact. Jupiter orbital station reports massive hull damage.',
  '已激活星界回响计划。指挥官，您的战机已准备就绪。愿星环指引您的归途。':
    'Stellar Resonance protocol activated. Commander, your fighter is ready. May the star ring guide your return.',
  '警告！检测到巨大能量源正在前方聚集。识别特征与资料库中记录的虚空之眼高度吻合。':
    'Warning! Detecting massive energy source gathering ahead. Signature matches Void Eye from database records.',
  '根据古代星图记载，虚空之眼是虚空维度的守门者。如果它完全苏醒，整个太阳系将被拉入虚空。':
    'According to ancient star charts, the Void Eye is the guardian of the void dimension. If it fully awakens, the entire solar system will be pulled into the void.',
  '...星环的回响...终于找到你了...你们的存在...是对秩序的亵渎...回归虚空吧...':
    '...The echo of the star ring... Finally found you... Your existence... is a blasphemy to order... Return to the void...',
  '检测到第二波入侵正在靠近木卫四轨道。能量特征分析完成，确认目标为晶簇巨像。':
    'Detecting second wave of invasion approaching Callisto orbit. Energy signature analysis complete. Confirming target: Crystal Colossus.',
  '木卫四殖民地正在遭受攻击！平民撤离进度不足30%！':
    'Callisto colony under attack! Civilian evacuation progress less than 30%!',
  '晶体...在生长...一切...都将...被同化...有机物质...完美的...养料...':
    'Crystals... growing... Everything... will be... assimilated... Organic matter... perfect... nourishment...',
  '指挥官，前方检测到异常引力场。分析结果表明，这是深渊吞噬者制造的微型黑洞。':
    'Commander, detecting anomalous gravity field ahead. Analysis indicates micro black holes created by the Abyss Devourer.',
  '土星环是我们最后的矿产资源基地，如果失去它...':
    'Saturn\'s rings are our last mineral resource base. If we lose them...',
  '引力...在呼唤...万物...归于虚无...毁灭...是新生...的开始...':
    'Gravity... calling... All things... return to nothingness... Destruction... is the beginning... of rebirth...',
  '检测到最终信号源。指挥官，这是敌人的核心单位——机械神谕。':
    'Detecting final signal source. Commander, this is the enemy core unit: Mechanical Oracle.',
  '太阳系防御系统已经濒临崩溃，我们的舰队损失超过70%。这是最后的决战了，舰长。':
    'Solar defense system on the verge of collapse. Fleet losses exceed 70%. This is the final battle, Captain.',
  '检测到...星环持有者...开始...清除程序...我是...虚空净化者...使命...清除...所有...有机生命...':
    'Detecting... star ring bearer... Initiating... purge protocol... I am... Void Purifier... Mission... eliminate... all... organic life...',
  '检测到虚空裂隙正在关闭。机械神谕已被摧毁，入侵舰队失去指挥。':
    'Detecting void rift closing. Mechanical Oracle destroyed. Invasion fleet lost command.',
  '太阳系防御系统恢复正常！各殖民地报告安全！':
    'Solar defense system restored! All colonies report secure!',
  '指挥官，您的英勇事迹将被载入史册。星界回响计划圆满成功。':
    'Commander, your heroic deeds will be recorded in history. Stellar Resonance mission successful.',
  '但根据星图预言，这可能只是开始。当星界再次响起回响之时，您是否愿意再次挺身而出？':
    'But according to the star chart prophecy, this may just be the beginning. When the stars resonate again, will you stand forth once more?',
  '检测到玩家生命体征消失...星界回响计划...失败...':
    'Detecting player vital signs lost... Stellar Resonance mission... failed...',
  '...星环...已陨落...虚空...终将...吞噬一切...':
    '...Star ring... has fallen... Void... will eventually... devour everything...',
  '太阳系沦陷...虚空入侵成功...人类文明终结...':
    'Solar system fallen... Void invasion successful... Human civilization ended...'
};

function translateToEnglish(chineseText) {
  return DIALOGUE_ENGLISH[chineseText] || chineseText;
}

// ====== 语音合成核心逻辑（Web Audio API + speechSynthesis 混合方案）======
// 通过 Web Audio API 合成稳定的角色音色签名，不依赖特定浏览器语音
// audioCtx 在此处统一声明，供语音合成和音效合成器共用
let audioCtx = null;
let availableVoices = [];
let activeAudioNodes = []; // 跟踪当前活跃的音频节点，便于停止

// ===== Boss 战 BGM 系统（每个 Boss 独立 BGM） =====
let bossBgm = null;
let bossBgmVariant = -1;
const BOSS_BGM_FILES = ['boss1.ogg', 'boss2.ogg', 'boss3.ogg', 'boss4.ogg'];
function initBossBgm(variant) {
  // 已加载同一变体的 BGM，直接复用
  if (bossBgm && bossBgmVariant === variant) return;
  // 切换 Boss：先释放旧的 BGM
  if (bossBgm) {
    bossBgm.pause();
    bossBgm = null;
  }
  bossBgm = new Audio(BOSS_BGM_FILES[variant] || BOSS_BGM_FILES[0]);
  bossBgm.loop = true;
  bossBgm.volume = 0.25;
  bossBgmVariant = variant;
}
function playBossBgm(variant) {
  initBossBgm(variant);
  if (bossBgm) {
    bossBgm.currentTime = 0;
    bossBgm.play().catch(()=>{});
  }
}
function stopBossBgm() {
  if (bossBgm) {
    bossBgm.pause();
    bossBgm.currentTime = 0;
  }
}

function initAudioContext() {
  if (!audioCtx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    } catch(e) { audioCtx = null; }
  }
  // 某些浏览器需要用户交互后才能 resume
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(()=>{});
  }
}

function loadVoices() {
  if ('speechSynthesis' in window) {
    availableVoices = window.speechSynthesis.getVoices();
  }
}

// 停止所有活跃的 Web Audio 节点
function stopAllAudioNodes() {
  for (const node of activeAudioNodes) {
    try {
      if (node.stop) node.stop();
      if (node.disconnect) node.disconnect();
    } catch(e) {}
  }
  activeAudioNodes = [];
}

// 通过 Web Audio API 播放角色音色签名
// 生成一段基于文本长度的"语音化"音调序列，每个角色有独特的音色
function playVoiceSignature(text, speaker) {
  initAudioContext();
  if (!audioCtx) return;
  
  const config = VOICE_CONFIG[speaker] || VOICE_CONFIG['LUNA-7'];
  const a = config.audio;
  const now = audioCtx.currentTime;
  
  // 根据文本长度决定播放多少个音节段
  const syllableCount = Math.max(3, Math.min(12, Math.ceil(text.length / 8)));
  const syllableDuration = Math.max(0.12, Math.min(0.35, 2.0 / syllableCount));
  const totalDuration = syllableCount * syllableDuration;
  
  // 主增益（总音量控制）
  const masterGain = audioCtx.createGain();
  masterGain.gain.value = 0;
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(a.gain, now + 0.05);
  masterGain.gain.setValueAtTime(a.gain, now + totalDuration - 0.1);
  masterGain.gain.linearRampToValueAtTime(0, now + totalDuration);
  masterGain.connect(audioCtx.destination);
  activeAudioNodes.push(masterGain);
  
  // 延迟效果（神秘角色）
  let outputNode = masterGain;
  if (a.delay) {
    const delay = audioCtx.createDelay();
    delay.delayTime.value = 0.18;
    const feedback = audioCtx.createGain();
    feedback.gain.value = 0.35;
    const wetGain = audioCtx.createGain();
    wetGain.gain.value = 0.4;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wetGain);
    wetGain.connect(masterGain);
    outputNode = masterGain; // 主信号直接进 master，延迟信号也进 master
    // 把 delay 输入也接到 master
    const delayInput = audioCtx.createGain();
    delayInput.gain.value = 1;
    delayInput.connect(delay);
    delayInput.connect(masterGain);
    outputNode = delayInput;
    activeAudioNodes.push(delay, feedback, wetGain, delayInput);
  }
  
  // 失真效果（怪物角色）
  let preFilterNode = outputNode;
  if (a.distortion) {
    const shaper = audioCtx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 128) - 1;
      curve[i] = Math.tanh(x * 3);
    }
    shaper.curve = curve;
    shaper.oversample = '2x';
    shaper.connect(outputNode);
    preFilterNode = shaper;
    activeAudioNodes.push(shaper);
  }
  
  // 滤波器
  const filter = audioCtx.createBiquadFilter();
  filter.type = a.filterType || 'lowpass';
  filter.frequency.value = a.filterFreq || 1000;
  if (a.filterQ) filter.Q.value = a.filterQ;
  filter.connect(preFilterNode);
  activeAudioNodes.push(filter);
  
  // 为每个音节段生成振荡器
  for (let i = 0; i < syllableCount; i++) {
    const syllableStart = now + i * syllableDuration;
    const syllableEnd = syllableStart + syllableDuration * 0.85;
    
    // 基础频率随音节变化（模拟语调起伏）
    const freqVariation = 1 + (Math.sin(i * 0.7) * 0.15) + (Math.random() - 0.5) * 0.1;
    const baseFreq = a.baseFreq * freqVariation;
    
    // 主振荡器
    const osc = audioCtx.createOscillator();
    osc.type = a.waveform || 'sine';
    osc.frequency.setValueAtTime(baseFreq, syllableStart);
    
    // 颤音 (vibrato)
    if (a.vibratoRate && a.vibratoDepth) {
      const vibratoLFO = audioCtx.createOscillator();
      const vibratoGain = audioCtx.createGain();
      vibratoLFO.frequency.value = a.vibratoRate;
      vibratoGain.gain.value = a.vibratoDepth;
      vibratoLFO.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      vibratoLFO.start(syllableStart);
      vibratoLFO.stop(syllableEnd + 0.1);
      activeAudioNodes.push(vibratoLFO, vibratoGain);
    }
    
    // 震音 (tremolo) - 系统角色
    const syllableGain = audioCtx.createGain();
    syllableGain.gain.setValueAtTime(0, syllableStart);
    syllableGain.gain.linearRampToValueAtTime(1, syllableStart + a.attack);
    syllableGain.gain.setValueAtTime(1, syllableEnd - a.release);
    syllableGain.gain.linearRampToValueAtTime(0, syllableEnd);
    
    if (a.tremolo) {
      const tremoloLFO = audioCtx.createOscillator();
      const tremoloGain = audioCtx.createGain();
      tremoloLFO.frequency.value = a.vibratoRate || 10;
      tremoloGain.gain.value = 0.5;
      tremoloLFO.connect(tremoloGain);
      tremoloGain.connect(syllableGain.gain);
      tremoloLFO.start(syllableStart);
      tremoloLFO.stop(syllableEnd + 0.1);
      activeAudioNodes.push(tremoloLFO, tremoloGain);
    }
    
    // 环形调制 (ringMod) - 机械神谕
    if (a.ringMod) {
      const ringModOsc = audioCtx.createOscillator();
      const ringModGain = audioCtx.createGain();
      ringModOsc.frequency.value = 50;
      ringModGain.gain.value = 0.5;
      // 环形调制：将载波振荡器的输出乘以调制振荡器
      osc.connect(ringModGain);
      ringModOsc.connect(ringModGain.gain);
      ringModGain.connect(syllableGain);
      ringModOsc.start(syllableStart);
      ringModOsc.stop(syllableEnd + 0.1);
      activeAudioNodes.push(ringModOsc, ringModGain);
    } else {
      osc.connect(syllableGain);
    }
    
    syllableGain.connect(filter);
    osc.start(syllableStart);
    osc.stop(syllableEnd + 0.1);
    activeAudioNodes.push(osc, syllableGain);
  }
  
  // 定时清理已完成的节点
  setTimeout(() => {
    activeAudioNodes = activeAudioNodes.filter(n => {
      try { if (n.disconnect) n.disconnect(); } catch(e) {}
      return false;
    });
  }, (totalDuration + 0.5) * 1000);
}

function speak(chineseText, speaker = 'LUNA-7') {
  // 1. 始终播放 Web Audio 音色签名（稳定、跨浏览器）
  playVoiceSignature(chineseText, speaker);
  
  // 2. 尝试使用 speechSynthesis 播放英文 TTS（增强体验，失败也不影响）
  if (!('speechSynthesis' in window)) return;
  
  try {
    window.speechSynthesis.cancel();

    let voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();

    const englishText = translateToEnglish(chineseText);
    const sid = (SPEAKER_SID && SPEAKER_SID[speaker]) ? SPEAKER_SID[speaker] : speaker; // 兼容：传入显示名或 sid 均可
    const config = VOICE_CONFIG[sid] || VOICE_CONFIG['luna7'];
    const utterance = new SpeechSynthesisUtterance(englishText);
    utterance.rate = config.rate;
    utterance.pitch = config.pitch;
    utterance.volume = config.volume * 0.6; // 降低 TTS 音量，让音色签名更突出

    let voice = null;

    if (voices.length > 0) {
      // 1. 遍历预设的语音名称池进行匹配
      for (const preferred of config.preferredVoices) {
        const pLower = preferred.toLowerCase();
        voice = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes(pLower));
        if (voice) break;
      }

      // 2. 区分男/女兜底（按 sid 判定，与显示语言无关）
      if (!voice) {
        const isMale = ['tactician', 'voideye', 'crystal', 'abyss'].includes(sid);
        const malePool = ['david', 'guy', 'mark', 'george', 'alex', 'daniel', 'male'];
        const femalePool = ['zira', 'jenny', 'aria', 'samantha', 'michelle', 'linda', 'female'];
        
        const pool = isMale ? malePool : femalePool;
        for (const name of pool) {
          voice = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes(name));
          if (voice) break;
        }
      }
      
      // 3. 随便抓一个英文声音
      if (!voice) {
        voice = voices.find(v => v.lang.startsWith('en'));
      }
    }
    
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'en-US';
    }
    
    window.speechSynthesis.speak(utterance);
  } catch(e) {
    // speechSynthesis 出错不影响 Web Audio 音色签名
    console.warn('speechSynthesis 不可用，仅使用 Web Audio 音色签名', e);
  }
}

function stopSpeech() {
  // 停止 Web Audio
  stopAllAudioNodes();
  // 停止 speechSynthesis
  if ('speechSynthesis' in window) {
    try { window.speechSynthesis.cancel(); } catch(e) {}
  }
}

// 说话者 → 终端颜色映射（按 sid 判定，与显示语言无关；兼容传入显示名）
function speakerToColor(speaker) {
  const sid = (SPEAKER_SID && SPEAKER_SID[speaker]) ? SPEAKER_SID[speaker] : speaker;
  if (['voideye', 'abyss', 'oracle', 'system'].includes(sid)) return '#ff4444';
  if (['crystal'].includes(sid)) return '#ffb000';
  if (['tactician'].includes(sid)) return '#ffb000';
  return '#33ff66'; // LUNA-7 默认绿
}

/* ============== Web Audio 音效合成器 ============== */
// audioCtx 已在文件顶部声明并复用，此处仅保留注释说明
// 预渲染的音频缓冲区
let laserBuffer = null;
let enemyLaserBuffer = null;
let sniperBuffer = null;
let explosionNoiseBuffer = null; // 预渲染的白噪声缓冲区（爆炸声用，复用避免GC）
let shieldHitNoiseBuffer = null; // 预渲染的护盾受击噪声缓冲区（带衰减包络，复用避免GC）
function initAudio() {
  if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  preRenderSounds();
}
// 预渲染高频音效到内存，避免游戏循环中实时创建振荡器阻塞音频线程
function preRenderSounds() {
  if(!audioCtx) return;
  const sampleRate = audioCtx.sampleRate;
  // 1. 预渲染玩家机枪音
  const len1 = Math.floor(sampleRate * 0.1);
  laserBuffer = audioCtx.createBuffer(1, len1, sampleRate);
  const data1 = laserBuffer.getChannelData(0);
  for(let i=0; i<len1; i++) {
    const t = i / sampleRate;
    const freq = 880 * Math.pow(220/880, t / 0.1);
    const phase = (freq * t) % 1;
    const val = phase < 0.5 ? 1 : -1; // 简化锯齿波
    data1[i] = val * 0.15 * Math.pow(0.001 / 0.15, t / 0.1);
  }
  // 2. 预渲染敌方子弹音
  const len2 = Math.floor(sampleRate * 0.15);
  enemyLaserBuffer = audioCtx.createBuffer(1, len2, sampleRate);
  const data2 = enemyLaserBuffer.getChannelData(0);
  for(let i=0; i<len2; i++) {
    const t = i / sampleRate;
    const freq = 330 * Math.pow(110/330, t / 0.15);
    const phase = (freq * t) % 1;
    const val = phase < 0.5 ? 1 : -1; // 方波
    data2[i] = val * 0.08 * Math.pow(0.001 / 0.08, t / 0.15);
  }
  // 3. 预渲染狙击/导弹音 (混合双振荡器)
  const len3 = Math.floor(sampleRate * 0.25);
  sniperBuffer = audioCtx.createBuffer(1, len3, sampleRate);
  const data3 = sniperBuffer.getChannelData(0);
  for(let i=0; i<len3; i++) {
    const t = i / sampleRate;
    // 振荡器1
    const freq1 = 220 * Math.pow(40/220, t / 0.25);
    const phase1 = (freq1 * t) % 1;
    const val1 = (phase1 < 0.5 ? 1 : -1) * 0.4 * Math.pow(0.001 / 0.4, t / 0.25);
    // 振荡器2
    const freq2 = 2200 * Math.pow(200/2200, t / 0.15);
    const phase2 = (freq2 * t) % 1;
    const val2 = (phase2 < 0.5 ? 1 : -1) * 0.15 * Math.pow(0.001 / 0.15, t / 0.15);
    data3[i] = val1 + val2;
  }
  // 4. 预渲染白噪声缓冲区（爆炸声用，1.2秒，复用避免每次爆炸都分配内存）
  initExplosionBuffer();
  // 5. 预渲染护盾受击噪声缓冲区（0.1秒，带线性衰减包络，复用避免每次受击都分配）
  initShieldHitBuffer();
}
// 预渲染白噪声缓冲区用于爆炸声 — 复用避免GC压力
function initExplosionBuffer() {
  if(!audioCtx) return;
  const sampleRate = audioCtx.sampleRate;
  const len = Math.floor(sampleRate * 1.2);
  explosionNoiseBuffer = audioCtx.createBuffer(1, len, sampleRate);
  const data = explosionNoiseBuffer.getChannelData(0);
  for(let i=0; i<len; i++) data[i] = Math.random() * 2 - 1;
}
// 预渲染护盾受击噪声缓冲区（带线性衰减包络）— 复用避免GC压力
function initShieldHitBuffer() {
  if(!audioCtx) return;
  const len = Math.floor(audioCtx.sampleRate * 0.1);
  shieldHitNoiseBuffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = shieldHitNoiseBuffer.getChannelData(0);
  for(let i=0; i<len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i/len);
}
function playLaser() {
  if(!audioCtx || !laserBuffer) return;
  const src = audioCtx.createBufferSource();
  src.buffer = laserBuffer;
  src.connect(audioCtx.destination);
  src.start();
}
function playEnemyLaser() {
  if(!audioCtx || !enemyLaserBuffer) return;
  const src = audioCtx.createBufferSource();
  src.buffer = enemyLaserBuffer;
  src.connect(audioCtx.destination);
  src.start();
}
// 真实爆炸声 — 4层合成：低频"轰"声 + 主rumble + 高频crack瞬态 + 低频尾音
// 每次随机音高微调，避免重复爆炸听起来相同
function playExplosion() {
  if(!audioCtx) return;
  if(!explosionNoiseBuffer) initExplosionBuffer();
  if(!explosionNoiseBuffer) return;

  const t0 = audioCtx.currentTime;
  // 随机音高微调（0.85 ~ 1.15），让每次爆炸听起来略有不同
  const pitchVar = 0.85 + Math.random() * 0.3;

  // 主输出总线 + 限幅器（防止多次爆炸叠加时削波）
  const master = audioCtx.createGain();
  master.gain.value = 0.7;
  const comp = audioCtx.createDynamicsCompressor();
  comp.threshold.value = -10;
  comp.knee.value = 8;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.15;
  master.connect(comp); comp.connect(audioCtx.destination);

  // ===== 层1: 低频"轰"声 (blast wave, 60Hz sine 模拟冲击波) =====
  const boomOsc = audioCtx.createOscillator();
  boomOsc.type = 'sine';
  const boomFreq = 65 * pitchVar;
  boomOsc.frequency.setValueAtTime(boomFreq * 1.6, t0);          // 起始稍高
  boomOsc.frequency.exponentialRampToValueAtTime(boomFreq * 0.6, t0 + 0.15); // 快速下滑
  const boomGain = audioCtx.createGain();
  boomGain.gain.setValueAtTime(0.001, t0);
  boomGain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.005);   // 极快attack模拟冲击
  boomGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
  boomOsc.connect(boomGain); boomGain.connect(master);
  boomOsc.start(t0); boomOsc.stop(t0 + 0.45);

  // ===== 层2: 主rumble (lowpass扫频噪声, 1500Hz → 90Hz, 爆炸主体) =====
  const noiseSrc1 = audioCtx.createBufferSource();
  noiseSrc1.buffer = explosionNoiseBuffer;
  noiseSrc1.playbackRate.value = pitchVar;
  const lp1 = audioCtx.createBiquadFilter();
  lp1.type = 'lowpass';
  lp1.Q.value = 1.2;
  lp1.frequency.setValueAtTime(1500 * pitchVar, t0);
  lp1.frequency.exponentialRampToValueAtTime(90, t0 + 0.5);
  const rumbleGain = audioCtx.createGain();
  rumbleGain.gain.setValueAtTime(0.001, t0);
  rumbleGain.gain.exponentialRampToValueAtTime(0.32, t0 + 0.008);
  rumbleGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
  noiseSrc1.connect(lp1); lp1.connect(rumbleGain); rumbleGain.connect(master);
  noiseSrc1.start(t0); noiseSrc1.stop(t0 + 0.6);

  // ===== 层3: 高频"crack"瞬态 (highpass 2200Hz, 0.08秒快速衰减) =====
  const noiseSrc2 = audioCtx.createBufferSource();
  noiseSrc2.buffer = explosionNoiseBuffer;
  noiseSrc2.playbackRate.value = 1.5 * pitchVar;
  const hp2 = audioCtx.createBiquadFilter();
  hp2.type = 'highpass';
  hp2.frequency.value = 2200;
  const crackGain = audioCtx.createGain();
  crackGain.gain.setValueAtTime(0.22, t0);
  crackGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);
  noiseSrc2.connect(hp2); hp2.connect(crackGain); crackGain.connect(master);
  noiseSrc2.start(t0); noiseSrc2.stop(t0 + 0.1);

  // ===== 层4: 低频rumble尾音 (lowpass 180Hz, 0.95秒长尾) =====
  const noiseSrc3 = audioCtx.createBufferSource();
  noiseSrc3.buffer = explosionNoiseBuffer;
  noiseSrc3.playbackRate.value = 0.7 * pitchVar;
  const lp3 = audioCtx.createBiquadFilter();
  lp3.type = 'lowpass';
  lp3.frequency.value = 180;
  const tailGain = audioCtx.createGain();
  tailGain.gain.setValueAtTime(0.001, t0);
  tailGain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.05);
  tailGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.95);
  noiseSrc3.connect(lp3); lp3.connect(tailGain); tailGain.connect(master);
  noiseSrc3.start(t0); noiseSrc3.stop(t0 + 1.0);
}
function playHit() {
  if(!audioCtx) return;
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(150, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.2);
  gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
  osc.start(); osc.stop(audioCtx.currentTime + 0.2);
}
function playWave() {
  if(!audioCtx) return;
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(880, audioCtx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  osc.start(); osc.stop(audioCtx.currentTime + 0.3);
}
function playDash() {
  if(!audioCtx) return;
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  osc.start(); osc.stop(audioCtx.currentTime + 0.3);
}
function playShieldOn() {
  if(!audioCtx) return;
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.type = 'square'; // 改为方波，获得电子力场质感
  osc.frequency.setValueAtTime(200, audioCtx.currentTime);
  osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.2); // 频率平滑上升，模拟充能
  gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
  osc.start(); osc.stop(audioCtx.currentTime + 0.2);
}

function playShieldOff() {
  if(!audioCtx) return;
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.type = 'square'; // 改为方波
  osc.frequency.setValueAtTime(600, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.3); // 频率平滑下降，模拟断电消散
  gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  osc.start(); osc.stop(audioCtx.currentTime + 0.3);
}
function playShieldHit() {
  if(!audioCtx) return;
  const now = audioCtx.currentTime;

  // 1. 高频清脆的撞击音 (模拟能量盾挡住实体的声音)
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1800, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc.start(now);
  osc.stop(now + 0.1);

  // 2. 高频白噪声 (模拟能量溅射的滋滋声) — 复用预渲染的 shieldHitNoiseBuffer
  if (shieldHitNoiseBuffer) {
    const noise = audioCtx.createBufferSource();
    noise.buffer = shieldHitNoiseBuffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass'; // 高通滤波，只保留高频的"滋滋"声
    filter.frequency.value = 2500;
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(audioCtx.destination);
    noise.start(now);
  }
}

// 完美格挡成功音效：清脆高音"叮" + 低频能量爆发，区别于普通护盾受击
function playPerfectBlock() {
  if(!audioCtx) return;
  const now = audioCtx.currentTime;
  // 1. 高音"叮" — 完美格挡成功的清脆反馈（sine 波 2400→3200Hz 上扬）
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(2400, now);
  osc.frequency.exponentialRampToValueAtTime(3200, now + 0.15);
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.start(now); osc.stop(now + 0.3);
  // 2. 低频能量爆发 — 模拟蓝色能量波扩散的冲击感（sawtooth 120→40Hz 下沉）
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.connect(gain2); gain2.connect(audioCtx.destination);
  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(120, now);
  osc2.frequency.exponentialRampToValueAtTime(40, now + 0.4);
  gain2.gain.setValueAtTime(0.15, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
  osc2.start(now); osc2.stop(now + 0.4);
}

function playSniperShot() {
  if(!audioCtx || !sniperBuffer) return;
  const src = audioCtx.createBufferSource();
  src.buffer = sniperBuffer;
  src.connect(audioCtx.destination);
  src.start();
}

let lastBossHitTime = 0;
function playBossHit() {
  // 节流：每 60 毫秒最多播放一次音效，避免高频攻击导致音频引擎阻塞卡死主线程
  const now = performance.now();
  if(now - lastBossHitTime < 60) return; 
  lastBossHitTime = now;

  if(!audioCtx) return;
  const osc = audioCtx.createOscillator(); 
  const gain = audioCtx.createGain();
  osc.connect(gain); 
  gain.connect(audioCtx.destination);
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
  osc.start(); 
  osc.stop(audioCtx.currentTime + 0.05);
  
  // 播放结束后断开节点，防止内存泄漏和音频图积压
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}
