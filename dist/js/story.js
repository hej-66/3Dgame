// story.js — 剧情系统与 CRT 终端对话
/* ============== 剧情系统 ============== */
const STORY_DATA = {
  intro: [
    { sid:'luna7', speaker: 'LUNA-7', text: '指挥官，检测到异常空间波动正在接近太阳系。来源未知，能量读数超出常规范围。', color: 0x00ddff },
    { sid:'tactician', speaker: '战术官', text: '火星殖民地已经失去联系，木星轨道站报告大规模舰体损毁。', color: 0xffb547 },
    { sid:'luna7', speaker: 'LUNA-7', text: '已激活星界回响计划。指挥官，您的战机已准备就绪。愿星环指引您的归途。', color: 0x00ddff }
  ],
  boss1: [
    { sid:'luna7', speaker: 'LUNA-7', text: '警告！检测到巨大能量源正在前方聚集。识别特征与资料库中记录的虚空之眼高度吻合。', color: 0x00ddff },
    { sid:'tactician', speaker: '战术官', text: '根据古代星图记载，虚空之眼是虚空维度的守门者。如果它完全苏醒，整个太阳系将被拉入虚空。', color: 0xffb547 },
    { sid:'voideye', speaker: '虚空之眼', text: '...星环的回响...终于找到你了...你们的存在...是对秩序的亵渎...回归虚空吧...', color: 0xff3355 }
  ],
  boss2: [
    { sid:'luna7', speaker: 'LUNA-7', text: '检测到第二波入侵正在靠近木卫四轨道。能量特征分析完成，确认目标为晶簇巨像。', color: 0x00ddff },
    { sid:'tactician', speaker: '战术官', text: '木卫四殖民地正在遭受攻击！平民撤离进度不足30%！', color: 0xffb547 },
    { sid:'crystal', speaker: '晶簇巨像', text: '晶体...在生长...一切...都将...被同化...有机物质...完美的...养料...', color: 0x00ff88 }
  ],
  boss3: [
    { sid:'luna7', speaker: 'LUNA-7', text: '指挥官，前方检测到异常引力场。分析结果表明，这是深渊吞噬者制造的微型黑洞。', color: 0x00ddff },
    { sid:'tactician', speaker: '战术官', text: '土星环是我们最后的矿产资源基地，如果失去它...', color: 0xffb547 },
    { sid:'abyss', speaker: '深渊吞噬者', text: '引力...在呼唤...万物...归于虚无...毁灭...是新生...的开始...', color: 0x8800ff }
  ],
  boss4: [
    { sid:'luna7', speaker: 'LUNA-7', text: '检测到最终信号源。指挥官，这是敌人的核心单位——机械神谕。', color: 0x00ddff },
    { sid:'tactician', speaker: '战术官', text: '太阳系防御系统已经濒临崩溃，我们的舰队损失超过70%。这是最后的决战了，舰长。', color: 0xffb547 },
    { sid:'oracle', speaker: '机械神谕', text: '检测到...星环持有者...开始...清除程序...我是...虚空净化者...使命...清除...所有...有机生命...', color: 0xff0055 }
  ],
  victory: [
    { sid:'luna7', speaker: 'LUNA-7', text: '检测到虚空裂隙正在关闭。机械神谕已被摧毁，入侵舰队失去指挥。', color: 0x00ddff },
    { sid:'tactician', speaker: '战术官', text: '太阳系防御系统恢复正常！各殖民地报告安全！', color: 0x00ff88 },
    { sid:'luna7', speaker: 'LUNA-7', text: '指挥官，您的英勇事迹将被载入史册。星界回响计划圆满成功。', color: 0x00ddff },
    { sid:'luna7', speaker: 'LUNA-7', text: '但根据星图预言，这可能只是开始。当星界再次响起回响之时，您是否愿意再次挺身而出？', color: 0xffb547 }
  ],
  defeat: [
    { sid:'luna7', speaker: 'LUNA-7', text: '检测到玩家生命体征消失...星界回响计划...失败...', color: 0xff3355 },
    { sid:'voideye', speaker: '虚空之眼', text: '...星环...已陨落...虚空...终将...吞噬一切...', color: 0xff3355 },
    { sid:'system', speaker: '系统', text: '太阳系沦陷...虚空入侵成功...人类文明终结...', color: 0x880000 }
  ]
};

// ===== CRT 终端：Boss ASCII 雷达图 =====
// 修复：纯 ASCII 字符绘制，精简高度，严格保证 36 字符宽度绝对对齐
const BOSS_RADAR = {
  0: [
    '+----------------------------------+',
    '| [*] TARGET RADAR      SCAN: 100% |',
    '|              .:::.               |',
    '|            .:::::::.             |',
    '|           |  ( O )  |            |',
    '|            /:::::::/             |',
    '|              /:::/               |',
    '| TARGET: VOID EYE                 |',
    '| THREAT: [######] EXTREME         |',
    '| CLASS:  L-IV  // VOID GUARDIAN   |',
    '+----------------------------------+'
  ].join('\n'),
  1: [
    '+----------------------------------+',
    '| [*] TARGET RADAR      SCAN: 100% |',
    '|                ^                 |',
    '|               / /                |',
    '|              < * >               |',
    '|             < * * >              |',
    '|              < * >               |',
    '|               / /                |',
    '|                v                 |',
    '| TARGET: CRYSTAL COLOSSUS         |',
    '| THREAT: [#####] HIGH             |',
    '| CLASS:  L-III // CRYSTAL ENTITY  |',
    '+----------------------------------+'
  ].join('\n'),
  2: [
    '+----------------------------------+',
    '| [*] TARGET RADAR      SCAN: 100% |',
    '|             | | | | |            |',
    '|           .  (  O  )  .          |',
    '|         /   (( === ))   /        |',
    '|        |   ((  O O  ))   |       |',
    '|         /   (( === ))   /        |',
    '|           .  (  O  )  .          |',
    '|             | | | | |            |',
    '| TARGET: ABYSS DEVOURER           |',
    '| THREAT: [#] CRITICAL             |',
    '| CLASS:  L-V // SINGULARITY       |',
    '+----------------------------------+'
  ].join('\n'),
  3: [
    '+----------------------------------+',
    '| [*] TARGET RADAR      SCAN: 100% |',
    '|       .----------------.         |',
    '|      |  [O]======[O]   |         |',
    '|     |    |  ====  |     |        |',
    '|     |    |  ====  |     |        |',
    '|      |  [O]======[O]   |         |',
    '|       /----------------/         |',
    '| TARGET: MECH ORACLE              |',
    '| THREAT: [######] OMEGA           |',
    '| CLASS:  L-VI // VOID PURIFIER    |',
    '+----------------------------------+'
  ].join('\n')
};

function startDialogue(storyId, onComplete) {
  const dialogue = STORY_DATA[storyId];
  if (!dialogue) return;

  STATE.inCutscene = true;
  STATE.currentDialogue = dialogue;
  STATE.dialogueIndex = 0;
  STATE.dialogueOnComplete = onComplete;
  STATE.currentStoryId = storyId;

  STATE.previousPaused = STATE.paused;
  STATE.paused = true;

  // 显示 CRT 终端
  const term = document.getElementById('crt-terminal');
  if (term) term.classList.add('show');

  // 清空之前的字幕（开始新对话时重置）
  const textEl = document.getElementById('crt-text');
  if (textEl) textEl.innerHTML = '';

  // 显示 Boss 雷达（仅 boss1-4 剧情）
  const radarEl = document.getElementById('crt-radar');
  if (radarEl) {
    const bossMatch = /^boss(\d)$/.exec(storyId);
    if (bossMatch) {
      const variant = parseInt(bossMatch[1]) - 1;
      radarEl.textContent = BOSS_RADAR[variant] || '';
      // 强制等宽且不折叠空格，并增加底部间距防止被字幕遮挡
      radarEl.style.whiteSpace = 'pre';
      radarEl.style.fontFamily = 'monospace';
      radarEl.style.marginBottom = '15px';
      radarEl.classList.add('show');
    } else {
      radarEl.classList.remove('show');
      radarEl.textContent = '';
    }
  }

  // 启动加载进度条，完成后显示第一行对话
  runLoadingBar(() => showCurrentDialogue());
}

// 命令行加载进度条
function runLoadingBar(onDone) {
  const prog = document.getElementById('crt-progress');
  const bar = document.getElementById('crt-progress-bar');
  if (!prog || !bar) { onDone && onDone(); return; }
  // 清理上一次残留的定时器，避免重叠触发
  if (STATE.loadingInterval) { clearInterval(STATE.loadingInterval); STATE.loadingInterval = null; }
  if (STATE.loadingTimeout) { clearTimeout(STATE.loadingTimeout); STATE.loadingTimeout = null; }
  prog.classList.add('show');
  bar.style.width = '0%';
  let pct = 0;
  STATE.loadingInterval = setInterval(() => {
    pct += Math.random() * 18 + 8;
    if (pct >= 100) {
      pct = 100;
      bar.style.width = '100%';
      if (STATE.loadingInterval) { clearInterval(STATE.loadingInterval); STATE.loadingInterval = null; }
      STATE.loadingTimeout = setTimeout(() => {
        STATE.loadingTimeout = null;
        prog.classList.remove('show');
        onDone && onDone();
      }, 200);
    } else {
      bar.style.width = pct + '%';
    }
  }, 60);
}

// 打字机效果
function startTypewriter(text, el, onDone) {
  stopTypewriter();
  STATE.typewriterFull = text;
  STATE.typewriterShown = 0;
  STATE.typewriterActive = true;
  STATE.typewriterEl = el; // 记录当前打字机目标元素（供 skipTypewriter 使用）
  el.textContent = '';
  let i = 0;
  STATE.typewriterTimer = setInterval(() => {
    if (i >= text.length) {
      stopTypewriter();
      onDone && onDone();
      return;
    }
    el.textContent += text[i];
    i++;
    // 滚动跟随打字进度，确保最新内容可见
    scrollCrtText();
  }, 28);
}

function stopTypewriter() {
  if (STATE.typewriterTimer) {
    clearInterval(STATE.typewriterTimer);
    STATE.typewriterTimer = null;
  }
  STATE.typewriterActive = false;
}

// 跳过打字机（点击时立即显示全文）
function skipTypewriter() {
  if (!STATE.typewriterActive) return false;
  const el = STATE.typewriterEl; // 用记录的目标元素，而非 #crt-text 容器
  if (el) el.textContent = STATE.typewriterFull;
  stopTypewriter();
  scrollCrtText();
  return true;
}

// 滚动 #crt-text 到底部，确保最新字幕可见
function scrollCrtText() {
  const textEl = document.getElementById('crt-text');
  if (textEl) textEl.scrollTop = textEl.scrollHeight;
}

function showCurrentDialogue() {
  if (!STATE.currentDialogue || STATE.dialogueIndex >= STATE.currentDialogue.length) {
    endDialogue();
    return;
  }

  const line = STATE.currentDialogue[STATE.dialogueIndex];
  const color = speakerToColor(line.sid || line.speaker);

  // 本地化：speaker 按 sid 翻译显示名；text 在英文模式下取 DIALOGUE_ENGLISH 译文，否则用原文
  const dispSpeaker = trSpeaker(line.sid || line.speaker);
  const dispText = (STATE.lang === 'en' && typeof DIALOGUE_ENGLISH !== 'undefined' && DIALOGUE_ENGLISH[line.text])
    ? DIALOGUE_ENGLISH[line.text] : line.text;

  // 顶部"当前说话者"指示器（仅显示当前说话者，不参与滚动）
  const speakerEl = document.getElementById('crt-speaker');
  if (speakerEl) {
    speakerEl.textContent = '> ' + dispSpeaker;
    speakerEl.style.color = color;
  }

  // 追加新的一行到 #crt-text（保留旧字幕，向下滚动显示新字幕）
  const textEl = document.getElementById('crt-text');
  if (textEl) {
    const lineDiv = document.createElement('div');
    lineDiv.className = 'crt-line';
    lineDiv.style.color = color;

    const speakerSpan = document.createElement('span');
    speakerSpan.className = 'crt-line-speaker';
    speakerSpan.textContent = dispSpeaker + ':';
    speakerSpan.style.color = color;

    const textSpan = document.createElement('span');
    textSpan.className = 'crt-line-text';

    lineDiv.appendChild(speakerSpan);
    lineDiv.appendChild(textSpan);
    textEl.appendChild(lineDiv);

    // 打字机作用于该行的 textSpan（不清空整个 #crt-text）
    startTypewriter(dispText, textSpan);
    // 立即滚动到底部，确保新行可见
    scrollCrtText();
  }

  // 语音合成：TTS 始终用中文原文（translateToEnglish 内部转英文发音），音色按 sid 取配置
  speak(line.text, line.sid || line.speaker);
}

function nextDialogue() {
  if (!STATE.inCutscene) return;

  // 如果打字机仍在进行，点击则跳过到全文
  if (skipTypewriter()) return;

  stopSpeech();
  STATE.dialogueIndex++;

  // 切换到下一行时显示短暂加载条
  if (STATE.currentDialogue && STATE.dialogueIndex < STATE.currentDialogue.length) {
    runLoadingBar(() => showCurrentDialogue());
  } else {
    showCurrentDialogue();
  }
}

function endDialogue() {
  stopTypewriter();
  stopSpeech();
  // 清理剧情加载进度条的定时器，防止剧情中切出时回调残留触发 showCurrentDialogue/spawnBoss
  if (STATE.loadingInterval) { clearInterval(STATE.loadingInterval); STATE.loadingInterval = null; }
  if (STATE.loadingTimeout) { clearTimeout(STATE.loadingTimeout); STATE.loadingTimeout = null; }
  STATE.inCutscene = false;
  STATE.currentDialogue = null;
  STATE.dialogueIndex = 0;
  STATE.currentStoryId = null;

  STATE.paused = STATE.previousPaused || false;

  // 隐藏 CRT 终端
  const term = document.getElementById('crt-terminal');
  if (term) term.classList.remove('show');
  const radarEl = document.getElementById('crt-radar');
  if (radarEl) { radarEl.classList.remove('show'); radarEl.textContent = ''; }

  if (STATE.dialogueOnComplete) {
    STATE.dialogueOnComplete();
    STATE.dialogueOnComplete = null;
  }
}

function buildDialogueUI(app) {
  // CRT 终端使用 HTML/CSS 覆盖层，无需 PixiJS 元素
  // 保留 HUD.dialogueBox 兼容性（visible 属性供其他代码检查）
  HUD.dialogueBox = { visible: false };
}
