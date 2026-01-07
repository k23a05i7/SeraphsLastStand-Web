
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 1280;
canvas.height = 720;

const GRAVITY = 0.6;
const FRICTION = 0.8;
const PLAYER_SPEED = 6;
const JUMP_FORCE = -13;

let gameState = 'START';
let wave = 1;
let souls = 0;
let enemies = [];
let projectiles = [];
let enemyProjectiles = [];
let particles = [];
let soulOrbs = [];
let player = null;
let keys = {};
let screenShake = 0;
let enemiesRemainingToSpawn = 0;
let waveTextTimer = 0;

const hpVal = document.getElementById('hp-val');
const waveVal = document.getElementById('wave-val');
const soulsVal = document.getElementById('souls-val');
const startScreen = document.getElementById('start-screen');
const upgradeScreen = document.getElementById('upgrade-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const cardContainer = document.getElementById('card-container');

class Player {
    constructor() {
        this.width = 32;
        this.height = 48;
        this.x = 200;
        this.y = canvas.height - 150;
        this.vx = 0;
        this.vy = 0;
        this.maxHp = 100;
        this.hp = 100;
        this.jumps = 0;
        this.maxJumps = 2;
        this.onGround = false;
        this.facing = 1;

        this.fireRate = 300;
        this.lastFire = 0;
        this.bulletSpeed = 14;
        this.bulletDamage = 15;
        this.bulletSize = 8;
        this.multiShot = 1;
        this.leech = 0;
    }

    update() {
        if (keys['a'] || keys['ArrowLeft']) {
            this.vx = -PLAYER_SPEED;
            this.facing = -1;
        } else if (keys['d'] || keys['ArrowRight']) {
            this.vx = PLAYER_SPEED;
            this.facing = 1;
        } else {
            this.vx *= FRICTION;
        }

        this.x += this.vx;
        this.vy += GRAVITY;
        this.y += this.vy;

        const floorY = canvas.height - 60;

        if (this.x > canvas.width - 150) {
            if (this.y > floorY) {
                this.hp = 0;
                gameOver();
            }
        } else {
            if (this.y + this.height > floorY) {
                this.y = floorY - this.height;
                this.vy = 0;
                this.onGround = true;
                this.jumps = 0;
            }
        }

        if (this.x < 150) {
            const stairHeight = (150 - this.x) * 0.6;
            const stairY = floorY - stairHeight;
            if (this.y + this.height > stairY) {
                this.y = stairY - this.height;
                this.vy = 0;
                this.onGround = true;
                this.jumps = 0;
            }
        }

        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

        if (keys[' '] || keys['Mouse0']) this.shoot();
    }

    jump() {
        if (this.jumps < this.maxJumps) {
            this.vy = JUMP_FORCE;
            this.jumps++;
            this.onGround = false;
            createParticles(this.x + this.width / 2, this.y + this.height, '#fff', 15);
        }
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastFire > this.fireRate) {
            this.lastFire = now;
            let angle = Math.atan2(mouse.y - (this.y + this.height / 2), mouse.x - (this.x + this.width / 2));

            for (let i = 0; i < this.multiShot; i++) {
                const spread = (i - (this.multiShot - 1) / 2) * 0.15;
                projectiles.push(new Projectile(
                    this.x + this.width / 2,
                    this.y + this.height / 2,
                    angle + spread,
                    this.bulletSpeed,
                    this.bulletDamage,
                    this.bulletSize,
                    '#00f2ff'
                ));
            }
            screenShake = 2;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        let angle = Math.atan2(mouse.y - (this.y + this.height / 2), mouse.x - (this.x + this.width / 2));
        if (mouse.x < this.x + this.width / 2) ctx.scale(-1, 1);

        ctx.shadowBlur = 15;
        ctx.shadowColor = '#9d4edd';

        ctx.fillStyle = '#7b2eda';
        ctx.beginPath();
        ctx.moveTo(-16, 24); ctx.lineTo(16, 24); ctx.lineTo(12, -12); ctx.lineTo(-12, -12);
        ctx.fill();

        ctx.fillStyle = '#ffdbac';
        ctx.fillRect(-8, -22, 16, 16);

        ctx.fillStyle = '#5a1ea3';
        ctx.beginPath();
        ctx.moveTo(-24, -16); ctx.lineTo(24, -16); ctx.lineTo(0, -55);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.fillRect(2, -17, 3, 3); ctx.fillRect(8, -17, 3, 3);

        ctx.restore();

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(angle);
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(15, -3, 40, 6);

        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00f2ff';
        ctx.fillStyle = '#00f2ff';
        ctx.beginPath();
        ctx.arc(55, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
}

class Projectile {
    constructor(x, y, angle, speed, damage, size, color) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.damage = damage;
        this.size = size;
        this.color = color;
        this.active = true;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < -100 || this.x > canvas.width + 100 || this.y < -100 || this.y > canvas.height + 100) {
            this.active = false;
        }
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = type === 'BOSS' ? 140 : (type === 'ELITE' ? 70 : 50);
        this.height = type === 'BOSS' ? 140 : (type === 'ELITE' ? 70 : 50);
        this.hp = (type === 'BOSS' ? 1000 : (type === 'ELITE' ? 150 : 40)) + (wave - 1) * 20;
        this.maxHp = this.hp;
        this.speed = (type === 'BOSS' ? 0.7 : (type === 'ELITE' ? 1.3 : 2.0)) + Math.random() * 0.5;
        this.active = true;
        this.lastShot = 0;
        this.fireRate = type === 'BOSS' ? 700 : (type === 'ELITE' ? 1100 : 2000);
        this.targetY = 100 + Math.random() * 200;
        this.sinOffset = Math.random() * Math.PI * 2;
        this.color = type === 'BOSS' ? '#ff0054' : (type === 'ELITE' ? '#ffbd00' : '#9d4edd');
    }

    update() {
        if (this.x < 50) this.x = 50;
        if (this.x > canvas.width - 50 - this.width) this.x = canvas.width - 50 - this.width;

        const dx = player.x - this.x;
        const dy = this.targetY - this.y;

        if (Math.abs(dy) > 5) this.y += (dy / Math.abs(dy)) * this.speed;
        this.y += Math.sin(Date.now() * 0.003 + this.sinOffset) * 1.2;

        const distToPlayerX = Math.abs(dx);
        if (distToPlayerX > 400) this.x += (dx / distToPlayerX) * this.speed;
        else if (distToPlayerX < 200) this.x -= (dx / distToPlayerX) * this.speed;

        const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
        const now = Date.now();
        if (now - this.lastShot > this.fireRate) {
            this.lastShot = now;
            enemyProjectiles.push(new Projectile(this.x + this.width / 2, this.y + this.height / 2, angleToPlayer, 5, 10, 8, this.color));
        }

        projectiles.forEach(p => {
            if (p.active && this.checkCollision(p)) {
                this.hp -= p.damage;
                p.active = false;
                createParticles(p.x, p.y, '#fff', 8);
                screenShake = 4;
                if (player.leech > 0 && Math.random() < player.leech) player.hp = Math.min(player.maxHp, player.hp + 3);
                if (this.hp <= 0) this.die();
            }
        });

        if (this.checkCollision(player)) {
            player.hp -= 0.8;
            screenShake = 5;
            if (player.hp <= 0) gameOver();
        }
    }

    checkCollision(obj) {
        const ox = obj.x - (obj.size || 0);
        const oy = obj.y - (obj.size || 0);
        const ow = (obj.width || obj.size * 2 || 0);
        const oh = (obj.height || obj.size * 2 || 0);
        return this.x < ox + ow && this.x + this.width > ox && this.y < oy + oh && this.y + this.height > oy;
    }

    die() {
        this.active = false;
        createParticles(this.x + this.width / 2, this.y + this.height / 2, this.color, 40);
        screenShake = this.type === 'BOSS' ? 30 : 12;
        const orbCount = this.type === 'BOSS' ? 50 : (this.type === 'ELITE' ? 20 : 6);
        for (let i = 0; i < orbCount; i++) soulOrbs.push(new SoulOrb(this.x + this.width / 2, this.y + this.height / 2));
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;

        const wingSpread = Math.sin(Date.now() * 0.01) * 20;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.ellipse(-this.width / 2, wingSpread, this.width, this.width / 2, -0.5, 0, Math.PI * 2);
        ctx.ellipse(this.width / 2, wingSpread, this.width, this.width / 2, 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffbd00';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, -this.height / 1.4, this.width / 2, 12, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x, this.y - 35, this.width, 12);
            ctx.fillStyle = '#ff0054';
            ctx.fillRect(this.x, this.y - 35, (this.hp / this.maxHp) * this.width, 12);
        }
    }
}

class SoulOrb {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 25;
        this.vy = (Math.random() - 0.5) * 25;
        this.active = true;
    }

    update() {
        const dx = player.x + player.width / 2 - this.x;
        const dy = player.y + player.height / 2 - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this.vx += (dx / dist) * 2.5;
        this.vy += (dy / dist) * 2.5;
        this.vx *= 0.85;
        this.vy *= 0.85;
        this.x += this.vx;
        this.y += this.vy;

        if (dist < 50) {
            this.active = false;
            souls++;
            createParticles(this.x, this.y, '#00f2ff', 6);
        }
    }

    draw() {
        ctx.save();
        ctx.fillStyle = '#00f2ff';
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#00f2ff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 15;
        this.vy = (Math.random() - 0.5) * 15;
        this.life = 1.0;
        this.decay = 0.015 + Math.random() * 0.02;
        this.size = 2 + Math.random() * 4;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.25;
        this.life -= this.decay;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
}

const mouse = { x: 0, y: 0 };
window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
});

window.addEventListener('mousedown', () => keys['Mouse0'] = true);
window.addEventListener('mouseup', () => keys['Mouse0'] = false);
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if ((e.key === 'w' || e.key === 'ArrowUp' || e.key === ' ') && gameState === 'PLAYING') player.jump();
});
window.addEventListener('keyup', (e) => keys[e.key] = false);

function init() {
    player = new Player();
    enemies = [];
    projectiles = [];
    enemyProjectiles = [];
    particles = [];
    soulOrbs = [];
    wave = 1;
    souls = 0;
    enemiesRemainingToSpawn = 0;
    gameState = 'START';
    updateUI();
}

function startWave() {
    gameState = 'PLAYING';
    const enemyCount = 3 + wave * 2;
    enemiesRemainingToSpawn = enemyCount;
    waveTextTimer = 150;

    if (wave % 5 === 0) {
        enemiesRemainingToSpawn++;
        setTimeout(() => {
            if (gameState !== 'PLAYING') return;
            enemies.push(new Enemy(canvas.width / 2, -150, 'BOSS'));
            enemiesRemainingToSpawn--;
        }, 3000);
    }

    for (let i = 0; i < enemyCount; i++) {
        setTimeout(() => {
            if (gameState !== 'PLAYING') return;
            const side = Math.random() > 0.5 ? -150 : canvas.width + 150;
            const type = (wave > 3 && Math.random() > 0.75) ? 'ELITE' : 'FLYER';
            enemies.push(new Enemy(side, Math.random() * 250, type));
            enemiesRemainingToSpawn--;
        }, 2000 + i * 1500);
    }
}

function updateUI() {
    hpVal.innerText = Math.ceil(player.hp);
    waveVal.innerText = wave;
    soulsVal.innerText = souls;
}

function gameOver() {
    gameState = 'GAMEOVER';
    document.getElementById('final-wave').innerText = wave;
    gameOverScreen.classList.remove('hidden');
}

function showUpgradeScreen() {
    gameState = 'UPGRADE';
    upgradeScreen.classList.remove('hidden');
    cardContainer.innerHTML = '';

    getRandomUpgrades(3).forEach(upg => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-title">${upg.name}</div>
            <div class="card-icon" style="background: ${upg.color || '#333'}"></div>
            <div class="card-desc">${upg.desc}</div>
        `;
        card.onclick = () => {
            upg.apply();
            upgradeScreen.classList.add('hidden');
            wave++;
            startWave();
        };
        cardContainer.appendChild(card);
    });
}

const ALL_UPGRADES = [
    { name: 'Rapid Fire', desc: 'Atire muito mais rápido', color: '#00f2ff', apply: () => player.fireRate *= 0.65 },
    { name: 'Power Shot', desc: 'Dano massivamente aumentado', color: '#ff0054', apply: () => player.bulletDamage += 20 },
    { name: 'Fan Shot', desc: 'Atire projéteis extras em leque', color: '#ffbd00', apply: () => player.multiShot += 1 },
    { name: 'Sky Walk', desc: 'Pule até 4 vezes no ar', color: '#fff', apply: () => player.maxJumps = 4 },
    { name: 'Vampiric Touch', desc: 'Cura ao acertar inimigos', color: '#9d4edd', apply: () => player.leech += 0.2 },
    { name: 'Meteor Bullets', desc: 'Projéteis gigantes e letais', color: '#ff00ff', apply: () => { player.bulletSize += 15; player.bulletDamage += 15; } },
    { name: 'Hyper Speed', desc: 'Projéteis ultra velozes', color: '#00ff00', apply: () => player.bulletSpeed += 10 },
    { name: 'Seraph Armor', desc: 'HP máximo aumentado em 100', color: '#ffff00', apply: () => { player.maxHp += 100; player.hp += 100; } }
];

function getRandomUpgrades(count) {
    return [...ALL_UPGRADES].sort(() => 0.5 - Math.random()).slice(0, count);
}

function update() {
    if (gameState === 'PLAYING') {
        player.update();
        enemies.forEach(e => e.update());
        enemies = enemies.filter(e => e.active);
        projectiles.forEach(p => p.update());
        projectiles = projectiles.filter(p => p.active);
        soulOrbs.forEach(s => s.update());
        soulOrbs = soulOrbs.filter(s => s.active);

        enemyProjectiles.forEach(p => {
            p.update();
            if (p.active && player.x < p.x + p.size && player.x + player.width > p.x && player.y < p.y + p.size && player.y + player.height > p.y) {
                player.hp -= 15;
                p.active = false;
                createParticles(p.x, p.y, '#ff0054', 15);
                screenShake = 10;
                if (player.hp <= 0) gameOver();
            }
            projectiles.forEach(pp => {
                if (pp.active && Math.hypot(p.x - pp.x, p.y - pp.y) < p.size + pp.size) {
                    p.active = false;
                    pp.active = false;
                    createParticles(p.x, p.y, '#fff', 8);
                }
            });
        });
        enemyProjectiles = enemyProjectiles.filter(p => p.active);
        particles.forEach(p => p.update());
        particles = particles.filter(p => p.life > 0);

        if (enemiesRemainingToSpawn <= 0 && enemies.length === 0 && soulOrbs.length === 0 && gameState === 'PLAYING') {
            showUpgradeScreen();
        }

        if (screenShake > 0) screenShake *= 0.9;
        updateUI();
    }
}

function draw() {
    ctx.save();
    if (screenShake > 0.5) ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const grad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width);
    grad.addColorStop(0, '#1a0b2e');
    grad.addColorStop(1, '#050505');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#fff';
    for (let i = 0; i < 80; i++) {
        const x = (Math.sin(i * 123.45) * 0.5 + 0.5) * canvas.width;
        const y = (Math.cos(i * 678.90) * 0.5 + 0.5) * canvas.height;
        const size = (Math.sin(i) * 0.5 + 0.5) * 3;
        ctx.globalAlpha = Math.sin(Date.now() * 0.001 + i) * 0.5 + 0.5;
        ctx.fillRect(x, y, size, size);
    }
    ctx.globalAlpha = 1.0;

    const floorY = canvas.height - 60;

    ctx.shadowBlur = 20;
    ctx.shadowColor = '#1a1a1a';
    ctx.fillStyle = '#111';
    ctx.fillRect(0, floorY, canvas.width - 150, 60);

    ctx.beginPath();
    ctx.moveTo(0, floorY); ctx.lineTo(180, floorY); ctx.lineTo(0, floorY - 100);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.fillRect(canvas.width - 150, floorY, 150, 60);

    if (gameState === 'PLAYING' || gameState === 'UPGRADE') {
        soulOrbs.forEach(s => s.draw());
        player.draw();
        enemies.forEach(e => e.draw());
        projectiles.forEach(p => p.draw());
        enemyProjectiles.forEach(p => p.draw());
        particles.forEach(p => p.draw());

        if (waveTextTimer > 0) {
            ctx.save();
            ctx.fillStyle = '#fff';
            ctx.font = '56px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.globalAlpha = Math.min(1, waveTextTimer / 40);
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#9d4edd';
            ctx.fillText(`WAVE ${wave}`, canvas.width / 2, canvas.height / 2 - 50);
            ctx.restore();
            waveTextTimer--;
        }
    }
    ctx.restore();
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

document.getElementById('start-btn').onclick = () => {
    startScreen.classList.add('hidden');
    init();
    startWave();
};

document.getElementById('restart-btn').onclick = () => {
    gameOverScreen.classList.add('hidden');
    init();
    startWave();
};

loop();
