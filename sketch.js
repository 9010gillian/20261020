// ==========================================
// p5.js 水果生長環境拖曳測驗系統 (修復版)
// 全螢幕響應式 / 正確水果繪製 / 拖曳吸附修正 / 結算與彩帶效果
// ==========================================

// --- 題目與資料設定 ---
let quizData = [
  { id: 'apple', name: '蘋果' },
  { id: 'watermelon', name: '西瓜' },
  { id: 'strawberry', name: '草莓' },
  { id: 'banana', name: '香蕉' },
  { id: 'grape', name: '葡萄' },
  { id: 'pineapple', name: '鳳梨' }
];

// 拖曳選項卡片物件陣列
let optionCards = [];
// 被選取的卡片
let draggedCard = null;
let offsetX = 0;
let offsetY = 0;

// 測驗狀態與按鈕設定
let quizSubmitted = false;
let finalScore = 0;
let submitButton = { x: 0, y: 0, w: 200, h: 50 };
let restartButton = { x: 0, y: 0, w: 160, h: 45 };

// 彩帶粒子系統陣列
let confettiParticles = [];
let animTime = 0; // 用於背景動畫的計時器

function setup() {
  // 建立全螢幕畫布
  createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);
  imageMode(CENTER);
  textAlign(CENTER, CENTER);

  // 初始化佈局與選項
  initQuizLayout();
}

function draw() {
  background(240, 245, 250); // 淺藍灰色背景
  animTime += 0.03; // 更新動畫時間

  // 1. 繪製頂部標題區
  drawHeader();

  // 2. 繪製 6 個水果生長環境（上方 2 列 3 行）
  drawEnvironments();

  // 3. 繪製下方文字拖曳選項卡片
  drawOptionCards();

  // 4. 繪製交卷或重來按鈕
  drawButtons();

  // 5. 若已交卷，顯示成績結算畫面與彩帶動畫
  if (quizSubmitted) {
    if (finalScore >= 60) {
      updateAndDrawConfetti(); // 畫布放彩帶效果
    }
    drawScoreBoard();
  }
}

// ==========================================
// 佈局初始化與響應式調整
// ==========================================
function initQuizLayout() {
  let cols = 3;
  let rows = 2;
  
  // 計算每一個生長環境區域的大小與間距
  let startY = 100;
  let availableHeight = height * 0.55;
  let envW = min((width - 60) / cols, 340);
  let envH = min(availableHeight / rows, 210);

  let gridStartX = width / 2 - (cols * envW) / 2 + envW / 2;
  let gridStartY = startY + envH / 2;

  // 更新各題目的放置目標區位置
  for (let i = 0; i < quizData.length; i++) {
    let r = floor(i / cols);
    let c = i % cols;
    let cx = gridStartX + c * envW;
    let cy = gridStartY + r * envH;

    let cardW = envW - 16;
    let cardH = envH - 12;

    // 目標吸附區的絕對螢幕座標
    let dropZoneY = cy + cardH / 2 - 28;

    quizData[i].bounds = {
      x: cx,
      y: cy,
      w: cardW,
      h: cardH,
      // 放置目標區域絕對位置
      dropZone: { x: cx, y: dropZoneY, w: cardW - 20, h: 42 }
    };
  }

  // 初始化或重新排列下方可拖曳選項卡片（洗牌打亂）
  if (optionCards.length === 0) {
    let shuffled = [...quizData].sort(() => Math.random() - 0.5);
    optionCards = shuffled.map((item) => {
      return {
        id: item.id,
        text: item.name,
        x: 0,
        y: 0,
        initX: 0,
        initY: 0,
        w: 110,
        h: 42,
        placedOn: null, // 紀錄當前被放到哪個題目 ID 上
        isCorrect: false
      };
    });
  }

  // 計算下方選項卡片的位置（分成兩排居中）
  let optStartY = height - 110;
  let cardSpacingX = min(width / 4, 150);
  
  for (let i = 0; i < optionCards.length; i++) {
    let row = floor(i / 3);
    let col = i % 3;
    let cardX = width / 2 + (col - 1) * cardSpacingX;
    let cardY = optStartY + row * 50;

    optionCards[i].w = min(cardSpacingX - 20, 120);
    optionCards[i].h = 40;
    optionCards[i].initX = cardX;
    optionCards[i].initY = cardY;

    // 如果該卡片尚未被拖至目標區，重置位置
    if (!optionCards[i].placedOn) {
      optionCards[i].x = cardX;
      optionCards[i].y = cardY;
    } else {
      // 若已放置，同步吸附目標區中心座標
      let targetEnv = quizData.find(q => q.id === optionCards[i].placedOn);
      if (targetEnv) {
        optionCards[i].x = targetEnv.bounds.dropZone.x;
        optionCards[i].y = targetEnv.bounds.dropZone.y;
      }
    }
  }

  // 按鈕位置更新
  submitButton.x = width / 2;
  submitButton.y = height - 35;
  restartButton.x = width / 2;
  restartButton.y = height - 35;
}

// 響應式網頁：視窗大小改變時重設畫布大小
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initQuizLayout();
}

// ==========================================
// 頂部標題與說明
// ==========================================
function drawHeader() {
  fill(40, 60, 90);
  noStroke();
  textSize(min(width * 0.025, 26));
  textStyle(BOLD);
  text('🍎 水果生長環境拖曳測驗', width / 2, 32);

  textSize(14);
  textStyle(NORMAL);
  fill(90, 105, 120);
  text('請觀察上方動畫中的生長環境與主體，將下方水果名稱拖曳至圖片下方虛線框內', width / 2, 62);
}

// ==========================================
// 繪製 6 種水果動態生長環境背景（動態背景 + 正確水果主體）
// ==========================================
function drawEnvironments() {
  for (let i = 0; i < quizData.length; i++) {
    let item = quizData[i];
    let b = item.bounds;

    push();
    translate(b.x, b.y);

    // 外框背景卡片
    stroke(210);
    strokeWeight(1.5);
    fill(255);
    rect(0, 0, b.w, b.h, 12);

    // 裁切顯示區域（繪製生長環境）
    drawingContext.save();
    rectMode(CENTER);
    beginShape();
    rect(0, 0, b.w, b.h, 12);
    drawingContext.clip();

    // 繪製對應水果的動態生長環境與完整水果
    drawFruitEnvironmentAnimation(item.id, b.w, b.h);

    drawingContext.restore();

    // 繪製圖片下方的放置目標區 (Drop Zone)
    let dzY = (b.h / 2) - 28;
    stroke(100, 150, 240, 180);
    strokeWeight(1.5);
    drawingContext.setLineDash([5, 5]); // 虛線框
    fill(245, 248, 255, 220);
    rect(0, dzY, b.w - 20, 38, 8);
    drawingContext.setLineDash([]); // 還原實線

    fill(130, 150, 175);
    noStroke();
    textSize(12);
    text('【 拖曳答案至此 】', 0, dzY);

    pop();
  }
}

// 根據水果類型繪製動態背景與完整正確的水果主體
function drawFruitEnvironmentAnimation(id, w, h) {
  noStroke();
  let cycle = sin(animTime * 2.5);

  if (id === 'apple') {
    // 蘋果樹環境
    background(190, 230, 255);
    fill(120, 190, 90);
    rect(0, h/2 - 25, w, 50); // 地面
    fill(130, 85, 45);
    rect(0, 10, 28, 85); // 樹幹
    fill(75, 175, 70);
    circle(0, -25, 95); // 樹冠

    // 主體：正確完整蘋果（樹上搖曳）
    push();
    translate(0, -25 + cycle * 3);
    drawAppleObject(0, 0, 1.2);
    pop();

  } else if (id === 'watermelon') {
    // 西瓜環境（沙地 + 西瓜藤）
    background(245, 230, 180);
    fill(215, 190, 135);
    ellipse(0, 35, w, 60);

    // 西瓜藤蔓
    stroke(50, 150, 60);
    strokeWeight(3);
    noFill();
    arc(-20, 5, 80, 25, 0, PI);
    arc(20, 10, 80, 25, 0, PI);
    noStroke();

    // 主體：地面上的大西瓜
    push();
    translate(0, 8);
    drawWatermelonObject(0, 0, 1.1 + cycle * 0.03);
    pop();

  } else if (id === 'strawberry') {
    // 草莓環境（高架培植槽）
    background(235, 245, 240);
    fill(170, 180, 175);
    rect(0, 15, w, 45); // 培植槽

    // 主體：懸掛的大草莓
    push();
    translate(0, -10 + cycle * 2);
    drawStrawberryObject(0, 0, 1.2);
    pop();

  } else if (id === 'banana') {
    // 香蕉環境（熱帶樹林）
    background(255, 245, 200);
    fill(255, 210, 90, 90);
    circle(w/2 - 25, -h/2 + 25, 55); // 太陽

    // 大香蕉葉
    fill(55, 170, 70);
    ellipse(-35, -25, 85, 32);
    ellipse(35, -25, 85, 32);

    // 主體：黃色香蕉串（懸掛搖晃）
    push();
    translate(0, -10);
    rotate(cycle * 0.06);
    drawBananaObject(0, 0, 1.1);
    pop();

  } else if (id === 'grape') {
    // 葡萄環境（架高棚架）
    background(240, 235, 250);
    fill(130, 95, 65);
    rect(0, -38, w, 10); // 木架橫樑
    rect(-55, -10, 8, h);
    rect(55, -10, 8, h);

    // 主體：懸掛紫葡萄串
    push();
    translate(0, -15 + cycle * 2);
    drawGrapeObject(0, 0, 1.1);
    pop();

  } else if (id === 'pineapple') {
    // 鳳梨環境（熱帶泥地）
    background(250, 235, 215);
    fill(160, 115, 75);
    rect(0, 35, w, 40); // 泥地

    // 鋸齒根葉
    fill(65, 155, 55);
    triangle(-35, 30, -5, 5, -15, 30);
    triangle(35, 30, 5, 5, 15, 30);

    // 主體：泥地上的鳳梨
    push();
    let jump = abs(sin(animTime * 3)) * 3;
    translate(0, 5 - jump);
    drawPineappleObject(0, 0, 1.1);
    pop();
  }
}

// ==========================================
// 精細水果主體繪製函式
// ==========================================

// 1. 蘋果繪製
function drawAppleObject(x, y, s) {
  push();
  translate(x, y);
  scale(s);
  noStroke();

  // 蘋果主體
  fill(230, 45, 45);
  ellipse(-7, 0, 22, 26);
  ellipse(7, 0, 22, 26);

  // 光澤
  fill(255, 120, 120, 180);
  ellipse(-6, -5, 6, 10);

  // 梗與綠葉
  stroke(100, 60, 30);
  strokeWeight(2.5);
  noFill();
  arc(3, -16, 12, 14, HALF_PI, PI);

  noStroke();
  fill(70, 170, 60);
  ellipse(6, -15, 10, 5);
  pop();
}

// 2. 西瓜繪製
function drawWatermelonObject(x, y, s) {
  push();
  translate(x, y);
  scale(s);

  // 綠皮背景
  fill(45, 140, 60);
  noStroke();
  ellipse(0, 0, 46, 36);

  // 深綠色條紋
  stroke(20, 80, 35);
  strokeWeight(3.5);
  noFill();
  arc(0, 0, 42, 32, -PI * 0.8, -PI * 0.2);
  arc(0, 0, 42, 32, PI * 0.2, PI * 0.8);
  arc(0, 0, 44, 15, -PI * 0.7, PI * 0.7);

  // 藤蔓瓜蒂
  stroke(30, 100, 40);
  strokeWeight(2);
  line(-20, -8, -26, -14);
  pop();
}

// 3. 草莓繪製
function drawStrawberryObject(x, y, s) {
  push();
  translate(x, y);
  scale(s);
  noStroke();

  // 紅色心形心果實
  fill(235, 45, 60);
  beginShape();
  vertex(0, 18);
  bezierVertex(-20, 5, -18, -10, 0, -6);
  bezierVertex(18, -10, 20, 5, 0, 18);
  endShape(CLOSE);

  // 黃色表面籽點
  fill(255, 210, 80);
  circle(-6, -1, 2); circle(6, -1, 2);
  circle(0, 5, 2); circle(-5, 9, 2); circle(5, 9, 2);

  // 綠色葉萼
  fill(60, 165, 50);
  triangle(-12, -8, -4, -13, 0, -6);
  triangle(12, -8, 4, -13, 0, -6);
  triangle(-5, -12, 5, -12, 0, -6);
  pop();
}

// 4. 香蕉串繪製
function drawBananaObject(x, y, s) {
  push();
  translate(x, y);
  scale(s);

  stroke(210, 170, 20);
  strokeWeight(1.5);

  // 多根彎曲香蕉疊加成串
  fill(250, 215, 45);
  push(); rotate(-0.2); arc(-6, 0, 36, 28, 0, PI * 0.75); pop();
  push(); rotate(0.1);  arc(0, 3, 36, 28, 0, PI * 0.75); pop();
  push(); rotate(0.35); arc(6, 2, 34, 26, 0, PI * 0.75); pop();

  // 香蕉頂部莖軸
  noStroke();
  fill(80, 120, 40);
  rect(0, -12, 8, 6, 2);
  pop();
}

// 5. 葡萄串繪製
function drawGrapeObject(x, y, s) {
  push();
  translate(x, y);
  scale(s);
  noStroke();

  // 倒三角形排列的紫色葡萄顆粒
  fill(125, 50, 175);
  circle(-10, -12, 11); circle(0, -12, 11); circle(10, -12, 11);
  circle(-6, -4, 11);  circle(6, -4, 11);
  circle(0, 4, 11);
  circle(0, 12, 10);

  // 高光白點
  fill(255, 255, 255, 160);
  circle(-12, -14, 3); circle(-2, -14, 3); circle(8, -14, 3);

  // 藤蔓與葉片
  stroke(90, 150, 50);
  strokeWeight(2);
  line(0, -12, 0, -20);
  noStroke();
  fill(75, 160, 60);
  ellipse(-6, -18, 10, 6);
  pop();
}

// 6. 鳳梨繪製
function drawPineappleObject(x, y, s) {
  push();
  translate(x, y);
  scale(s);

  // 頂部鋸齒冠芽
  noStroke();
  fill(55, 160, 50);
  triangle(-10, -8, 0, -25, 2, -8);
  triangle(-4, -8, -10, -22, 4, -8);
  triangle(0, -8, 10, -22, 8, -8);

  // 鳳梨主體果實
  fill(230, 155, 25);
  stroke(180, 110, 15);
  strokeWeight(1.5);
  rect(0, 4, 26, 32, 10);

  // 菱格紋路繪製
  line(-10, -6, 10, 16);
  line(-10, 4, 8, 20);
  line(10, -6, -10, 16);
  line(10, 4, -8, 20);
  pop();
}

// ==========================================
// 繪製可拖曳選項卡片
// ==========================================
function drawOptionCards() {
  for (let card of optionCards) {
    push();
    translate(card.x, card.y);

    let isDragging = (draggedCard === card);

    // 陰影
    if (isDragging) {
      fill(0, 0, 0, 25);
      noStroke();
      rect(3, 4, card.w, card.h, 10);
    }

    // 卡片背景與邊框反饋
    if (quizSubmitted) {
      if (card.isCorrect) {
        fill(225, 245, 225); stroke(80, 180, 90); strokeWeight(2);
      } else {
        fill(255, 225, 225); stroke(230, 80, 80); strokeWeight(2);
      }
    } else {
      fill(isDragging ? 255 : 248);
      stroke(isDragging ? color(50, 130, 245) : color(180, 195, 210));
      strokeWeight(isDragging ? 2.5 : 1.5);
    }

    rect(0, 0, card.w, card.h, 10);

    // 文字
    noStroke();
    fill(quizSubmitted ? 40 : (isDragging ? color(30, 90, 210) : 50));
    textSize(16);
    textStyle(BOLD);
    text(card.text, 0, 0);

    pop();
  }
}

// ==========================================
// 繪製按鈕區 (交卷 / 重來)
// ==========================================
function drawButtons() {
  push();
  if (!quizSubmitted) {
    // 交卷看成績按鈕
    translate(submitButton.x, submitButton.y);
    let isHover = isMouseOverBtn(submitButton);
    
    fill(isHover ? color(45, 110, 225) : color(60, 130, 245));
    noStroke();
    rect(0, 0, submitButton.w, submitButton.h, 25);

    fill(255);
    textSize(17);
    textStyle(BOLD);
    text('📝 交卷看成績', 0, 0);
  } else {
    // 重新測驗按鈕
    translate(restartButton.x, restartButton.y);
    let isHover = isMouseOverBtn(restartButton);

    fill(isHover ? color(80, 90, 100) : color(100, 110, 125));
    noStroke();
    rect(0, 0, restartButton.w, restartButton.h, 22);

    fill(255);
    textSize(16);
    textStyle(BOLD);
    text('🔄 重新測驗', 0, 0);
  }
  pop();
}

function isMouseOverBtn(btn) {
  return mouseX > btn.x - btn.w / 2 && mouseX < btn.x + btn.w / 2 &&
         mouseY > btn.y - btn.h / 2 && mouseY < btn.y + btn.h / 2;
}

// ==========================================
// 滑鼠與觸控拖曳邏輯修復
// ==========================================
function mousePressed() { handleStart(mouseX, mouseY); }
function mouseDragged() { handleMove(mouseX, mouseY); }
function mouseReleased() { handleEnd(); }

function touchStarted() {
  if (touches.length > 0) handleStart(touches[0].x, touches[0].y);
  return false;
}
function touchMoved() {
  if (touches.length > 0) handleMove(touches[0].x, touches[0].y);
  return false;
}
function touchEnded() { handleEnd(); return false; }

// 拖曳開始
function handleStart(px, py) {
  if (quizSubmitted) {
    if (isMouseOverBtn(restartButton)) resetQuiz();
    return;
  }

  if (isMouseOverBtn(submitButton)) {
    calculateScore();
    return;
  }

  // 判斷選取卡片
  for (let i = optionCards.length - 1; i >= 0; i--) {
    let card = optionCards[i];
    if (px > card.x - card.w / 2 && px < card.x + card.w / 2 &&
        py > card.y - card.h / 2 && py < card.y + card.h / 2) {
      draggedCard = card;
      offsetX = px - card.x;
      offsetY = py - card.y;
      
      draggedCard.placedOn = null;

      // 移至最上層繪製
      optionCards.splice(i, 1);
      optionCards.push(draggedCard);
      break;
    }
  }
}

// 拖曳移動
function handleMove(px, py) {
  if (draggedCard) {
    draggedCard.x = px - offsetX;
    draggedCard.y = py - offsetY;
  }
}

// 放開卡片：精確吸附判斷 (修復重點)
function handleEnd() {
  if (!draggedCard) return;

  let snapped = false;

  for (let item of quizData) {
    let dz = item.bounds.dropZone;

    // 計算卡片與虛線目標框中心的距離
    let d = dist(draggedCard.x, draggedCard.y, dz.x, dz.y);

    if (d < 65) { // 寬容判定範圍
      // 若目標區已有其他卡片，退回原卡片
      for (let otherCard of optionCards) {
        if (otherCard !== draggedCard && otherCard.placedOn === item.id) {
          otherCard.placedOn = null;
          otherCard.x = otherCard.initX;
          otherCard.y = otherCard.initY;
        }
      }

      // 精確吸附至目標中心
      draggedCard.x = dz.x;
      draggedCard.y = dz.y;
      draggedCard.placedOn = item.id;
      snapped = true;
      break;
    }
  }

  // 若沒吸附至目標，彈回下方預設選單位置
  if (!snapped) {
    draggedCard.x = draggedCard.initX;
    draggedCard.y = draggedCard.initY;
    draggedCard.placedOn = null;
  }

  draggedCard = null;
}

// ==========================================
// 成績結算與彩帶效果
// ==========================================
function calculateScore() {
  let correctCount = 0;

  for (let card of optionCards) {
    if (card.placedOn === card.id) {
      card.isCorrect = true;
      correctCount++;
    } else {
      card.isCorrect = false;
    }
  }

  finalScore = Math.round((correctCount / quizData.length) * 100);
  quizSubmitted = true;

  if (finalScore >= 60) {
    createConfetti();
  }
}

function resetQuiz() {
  quizSubmitted = false;
  finalScore = 0;
  confettiParticles = [];
  optionCards = [];
  initQuizLayout();
}

function drawScoreBoard() {
  push();
  fill(255, 255, 255, 235);
  stroke(200);
  strokeWeight(2);
  rect(width / 2, 35, min(width - 40, 480), 48, 15);

  noStroke();
  textSize(20);
  textStyle(BOLD);

  if (finalScore >= 60) {
    fill(40, 150, 60);
    text(`🎉 恭喜通關！總成績：${finalScore} 分`, width / 2, 35);
  } else {
    fill(220, 60, 60);
    text(`💪 再接再厲！總成績：${finalScore} 分 (未達 60 分)`, width / 2, 35);
  }
  pop();
}

function createConfetti() {
  confettiParticles = [];
  let particleCount = 160;

  for (let i = 0; i < particleCount; i++) {
    confettiParticles.push({
      x: random(width),
      y: random(-height * 0.5, 0),
      size: random(8, 14),
      color: color(random(255), random(255), random(255)),
      speedY: random(2.5, 6),
      speedX: random(-2, 2),
      rotation: random(TWO_PI),
      rotSpeed: random(-0.1, 0.1)
    });
  }
}

function updateAndDrawConfetti() {
  push();
  noStroke();
  for (let p of confettiParticles) {
    p.y += p.speedY;
    p.x += sin(animTime + p.y * 0.01) + p.speedX;
    p.rotation += p.rotSpeed;

    if (p.y > height) {
      p.y = -20;
      p.x = random(width);
    }

    push();
    translate(p.x, p.y);
    rotate(p.rotation);
    fill(p.color);
    rect(0, 0, p.size, p.size * 0.6);
    pop();
  }
  pop();
}