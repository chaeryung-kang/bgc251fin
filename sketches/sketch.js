let cam;
let face;
let facesFound = [];

let player;
let groundY = 500;
let gravity = 0.8;

let wordList = [];
let gameOver = false;
let canNotBeHurt = false;
let invincibleStart = 0;

let gameStart;
let timePassed = 0;

let camW, camH;

let lastMouthOpen = 0;
let mic;

let badWords = ['과제', '팀플', '중간고사', '발표', '레포트', '동아리'];
let goodWords = ['잘했어요', '훌륭해요', '최고예요'];

function setup() {
  let canvas = createCanvas(800, 600);
  canvas.position((windowWidth - width) / 2, (windowHeight - height) / 2);

  camW = width * 0.4;
  camH = height * 0.4;

  cam = createCapture(VIDEO);
  cam.size(camW, camH);
  cam.hide();

  let faceOptions = { withLandmarks: true };
  face = ml5.faceApi(cam, faceOptions, faceReady);

  mic = new p5.AudioIn();
  mic.start();

  player = new Jumper();

  gameStart = millis();
}

function faceReady() {
  face.detect(gotFace);
}

function gotFace(error, result) {
  if (error) {
    console.log(error);
    return;
  }
  facesFound = result;
  face.detect(gotFace);
}

function draw() {
  background(0);

  if (!gameOver) {
    timePassed = int((millis() - gameStart) / 1000);
  }

  image(cam, width - 170, 10, 160, 120);
  noFill();
  stroke(255);
  rect(width - 170, 10, 160, 120);

  if (!gameOver) {
    fill(255);
    textSize(18);
    noStroke();
    text(`${timePassed}초`, 20, 30);
  }

  stroke(255);
  strokeWeight(5);
  line(0, groundY, width, groundY);
  strokeWeight(1);

  if (gameOver) {
    showGameOver();
    return;
  }

  let micLevel = mic.getLevel();
  let loud = micLevel > 0.1;

  player.update(loud);
  player.draw();

  makeWords();
  checkMouthJump();

  if (canNotBeHurt && millis() - invincibleStart > 3000) {
    canNotBeHurt = false;
  }
}

function checkMouthJump() {
  if (facesFound.length > 0) {
    let pos = facesFound[0].landmarks.positions;
    let topLip = pos[51];
    let bottomLip = pos[57];
    let mouthOpen = dist(topLip.x, topLip.y, bottomLip.x, bottomLip.y);

    let openMin = 6;
    let openDiff = 2;

    if (
      mouthOpen - lastMouthOpen > openDiff &&
      mouthOpen > openMin &&
      player.isOnGround()
    ) {
      let jumpPower = map(mouthOpen, 6, 30, 10, 30, true);
      player.jump(jumpPower);
    }

    lastMouthOpen = mouthOpen;
  }
}

class Jumper {
  constructor() {
    this.size = 30;
    this.x = 100;
    this.y = groundY - this.size;
    this.speedY = 0;
  }

  jump(power) {
    this.speedY = -power;
  }

  isOnGround() {
    return this.y >= groundY - this.size;
  }

  update(isFloating) {
    if (isFloating && !this.isOnGround()) {
      // 감속 낙하 (소리 낼 때)
      this.y += this.speedY;
      this.speedY += gravity * 0.1;
    } else {
      this.y += this.speedY;
      this.speedY += gravity;
    }

    if (this.y > groundY - this.size) {
      this.y = groundY - this.size;
      this.speedY = 0;
    }
  }

  draw() {
    fill(canNotBeHurt ? color(255, 255, 0) : 255);
    noStroke();
    circle(this.x + this.size / 2, this.y + this.size / 2, this.size);
  }
}

function makeWords() {
  if (frameCount % 90 === 0) {
    let isGood = random(1) < 0.2;
    let wordText = isGood ? random(goodWords) : random(badWords);
    wordList.push(new FlyingWord(wordText, isGood));
  }

  for (let i = wordList.length - 1; i >= 0; i--) {
    wordList[i].move();
    wordList[i].draw();

    if (wordList[i].hits(player)) {
      if (wordList[i].good) {
        canNotBeHurt = true;
        invincibleStart = millis();
        wordList.splice(i, 1);
      } else if (!canNotBeHurt) {
        gameOver = true;
      } else {
        wordList.splice(i, 1);
      }
    } else if (wordList[i].isOffScreen()) {
      wordList.splice(i, 1);
    }
  }
}

class FlyingWord {
  constructor(word, good) {
    this.word = word;
    this.good = good;
    this.size = random(24, 40);
    textSize(this.size);
    this.width = textWidth(this.word);
    this.height = this.size;
    this.speed = 4;

    if (random(1) < 0.7) {
      this.y = groundY - this.height;
    } else {
      this.y = random(groundY - 200, groundY - this.height - 10);
    }

    this.x = width;
  }

  move() {
    this.x -= this.speed;
  }

  draw() {
    textAlign(LEFT, TOP);
    textSize(this.size);
    textStyle(BOLD);
    fill(this.good ? color(255, 255, 0) : 255);
    text(this.word, this.x, this.y);
  }

  hits(player) {
    return (
      player.x + player.size > this.x &&
      player.x < this.x + this.width &&
      player.y + player.size > this.y &&
      player.y < this.y + this.height
    );
  }

  isOffScreen() {
    return this.x + this.width < 0;
  }
}

function showGameOver() {
  textAlign(CENTER, CENTER);
  fill(255);
  textStyle(BOLD);
  textSize(48);
  if (timePassed >= 30) {
    text('A+입니다!', width / 2, height / 2 - 60);
    text('종강 축하합니다 🎉', width / 2, height / 2);
    textSize(24);
    text('다음 학기로 넘어가려면 ENTER', width / 2, height / 2 + 40);
    text(`수강 시간 : ${timePassed}초`, width / 2, height / 2 + 80);
  } else {
    text('종강 실패 😢', width / 2, height / 2 - 40);
    textSize(24);
    text('재수강 하려면 Enter 키를 누르세요', width / 2, height / 2 + 20);
    text(`수강 시간 : ${timePassed}초`, width / 2, height / 2 + 60);
  }
}

function keyPressed() {
  if (gameOver && keyCode === ENTER) {
    resetGame();
  }
}

function resetGame() {
  player = new Jumper();
  wordList = [];
  gameOver = false;
  canNotBeHurt = false;
  gameStart = millis();
}
