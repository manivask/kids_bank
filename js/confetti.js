/**
 * KidsBank Confetti & Sparkles Engine
 * Zero-dependency canvas particle celebration effect.
 */

class ConfettiManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.animId = null;
    }

    _initCanvas() {
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'kidsbank-confetti-canvas';
            this.canvas.style.position = 'fixed';
            this.canvas.style.top = '0';
            this.canvas.style.left = '0';
            this.canvas.style.width = '100vw';
            this.canvas.style.height = '100vh';
            this.canvas.style.pointerEvents = 'none';
            this.canvas.style.zIndex = '99999';
            document.body.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
            this._resize();
            window.addEventListener('resize', () => this._resize());
        }
    }

    _resize() {
        if (this.canvas) {
            this.canvas.width = window.innerWidth * window.devicePixelRatio;
            this.canvas.height = window.innerHeight * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
    }

    burst(options = {}) {
        this._initCanvas();
        const count = options.count || 80;
        const colors = options.colors || ['#FF6B6B', '#FFA502', '#2ED573', '#1E90FF', '#9B59B6', '#FFD32A', '#FF78C4'];
        const startX = options.x !== undefined ? options.x : window.innerWidth / 2;
        const startY = options.y !== undefined ? options.y : window.innerHeight / 2;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * 9;
            this.particles.push({
                x: startX,
                y: startY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 3,
                size: 6 + Math.random() * 8,
                color: colors[Math.floor(Math.random() * colors.length)],
                shape: Math.random() > 0.4 ? 'rect' : 'circle',
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 12,
                opacity: 1,
                decay: 0.012 + Math.random() * 0.012,
                gravity: 0.18
            });
        }

        if (!this.animId) {
            this._animate();
        }
    }

    _animate() {
        if (!this.ctx || this.particles.length === 0) {
            if (this.ctx && this.canvas) {
                this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            }
            this.animId = null;
            return;
        }

        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= 0.98;
            p.rotation += p.rotationSpeed;
            p.opacity -= p.decay;

            if (p.opacity <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate((p.rotation * Math.PI) / 180);
            this.ctx.globalAlpha = Math.max(0, p.opacity);
            this.ctx.fillStyle = p.color;

            if (p.shape === 'circle') {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            }

            this.ctx.restore();
        }

        this.animId = requestAnimationFrame(() => this._animate());
    }
}

window.confettiFX = new ConfettiManager();
