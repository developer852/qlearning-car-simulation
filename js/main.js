// Main Orchestrator: Multi-Agent Q-Learning Fleet, Environment, Traffic & Training Dashboard
class SimulationApp {
    constructor() {
        this.container = document.getElementById('canvas-container') || document.body;
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        // Shared Brain & Multi-Agent Fleet
        this.brain = null;
        this.agents = [];
        this.maxAgents = 15;
        this.minAgents = 1;
        this.selectedAgentIndex = 0;

        // Environment, Obstacles & Traffic
        this.env = null;
        this.obstacleMgr = null;
        this.trafficMgr = null;
        this.audio = null;

        // Simulation Settings
        this.simSpeed = 1.0; // 1x, 2x, 4x speed multiplier
        this.cameraMode = 0; // 0 = Chase Focused Agent, 1 = Fleet Drone/Top-Down, 2 = Free Orbit
        this.showSensors = true;

        // Palette for distinct agent colors
        this.agentColors = [
            0x0284c7, // Electric Cyan
            0xef4444, // Crimson Red
            0x10b981, // Neon Emerald
            0xf59e0b, // Amber Gold
            0x8b5cf6, // Electric Violet
            0xec4899, // Hot Pink
            0x06b6d4, // Aqua Teal
            0x84cc16, // Lime Green
            0xf97316, // Vibrant Orange
            0x6366f1, // Indigo Blue
            0x14b8a6, // Seafoam
            0xd946ef, // Magenta
            0xeab308, // Sun Yellow
            0x3b82f6, // Sky Blue
            0xa855f7  // Purple
        ];

        this.lastTime = performance.now();
        this.init();
    }

    init() {
        // 1. Scene & Camera
        this.scene = new THREE.Scene();

        const aspect = (window.innerWidth && window.innerHeight) ? (window.innerWidth / window.innerHeight) : (16 / 9);
        this.camera = new THREE.PerspectiveCamera(60, aspect, 0.2, 1200);
        this.camera.position.set(0, 8, -16);

        // 2. WebGL Renderer
        try {
            this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' });
        } catch (e) {
            this.renderer = new THREE.WebGLRenderer({ antialias: false });
        }

        const width = window.innerWidth || 1280;
        const height = window.innerHeight || 720;
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        if (THREE.ACESFilmicToneMapping) {
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.1;
        }

        if (this.renderer.shadowMap) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap || THREE.BasicShadowMap;
        }

        this.container.appendChild(this.renderer.domElement);

        // 3. Core Systems
        this.audio = new SoundEffects();
        this.env = new Environment(this.scene);
        this.obstacleMgr = new ObstacleManager(this.scene);
        this.trafficMgr = new TrafficManager(this.scene);

        // 4. Q-Learning Shared Brain & Initial Agent Fleet
        this.brain = new QLearningBrain();
        this.setAgentCount(4); // Start with 4 autonomous learners exploring in parallel

        // 5. Setup UI & Event Listeners
        this.setupUIControls();
        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('keydown', (e) => this.onKeyDown(e));

        // Start Audio on first click
        const startAudio = () => {
            if (this.audio) this.audio.init();
            window.removeEventListener('click', startAudio);
            window.removeEventListener('keydown', startAudio);
        };
        window.addEventListener('click', startAudio);
        window.addEventListener('keydown', startAudio);

        // Dismiss loader smoothly
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => { loader.style.display = 'none'; }, 200);
        }

        // Start Animation Loop
        requestAnimationFrame((t) => this.animate(t));
    }

    setAgentCount(targetCount) {
        targetCount = Math.max(this.minAgents, Math.min(this.maxAgents, targetCount));

        // Add agents if below target
        while (this.agents.length < targetCount) {
            const id = this.agents.length + 1;
            const color = this.agentColors[(id - 1) % this.agentColors.length];
            const agent = new QLearningAgent(id, this.scene, this.brain, color);
            this.agents.push(agent);
        }

        // Remove agents if above target
        while (this.agents.length > targetCount) {
            const removed = this.agents.pop();
            removed.dispose();
        }

        if (this.selectedAgentIndex >= this.agents.length) {
            this.selectedAgentIndex = 0;
        }

        // Update UI Badge
        const countDisplay = document.getElementById('agent-count-val');
        if (countDisplay) countDisplay.textContent = this.agents.length;
    }

    setupUIControls() {
        // Agent Increase Button (+)
        const btnAdd = document.getElementById('btn-add-agent');
        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                this.setAgentCount(this.agents.length + 1);
                this.showNotification(`FLEET SIZE: ${this.agents.length} CARS`);
            });
        }

        // Agent Decrease Button (-)
        const btnSub = document.getElementById('btn-sub-agent');
        if (btnSub) {
            btnSub.addEventListener('click', () => {
                this.setAgentCount(this.agents.length - 1);
                this.showNotification(`FLEET SIZE: ${this.agents.length} CARS`);
            });
        }

        // Camera View Button
        const camBtn = document.getElementById('btn-camera');
        if (camBtn) {
            camBtn.addEventListener('click', () => {
                this.cameraMode = (this.cameraMode + 1) % 3;
                const labels = ['CHASE LEADER', 'FLEET DRONE', 'TRACK HOOD'];
                camBtn.textContent = labels[this.cameraMode];
                this.showNotification(labels[this.cameraMode]);
            });
        }

        // Focus Next Agent Button
        const nextAgentBtn = document.getElementById('btn-next-agent');
        if (nextAgentBtn) {
            nextAgentBtn.addEventListener('click', () => {
                this.selectedAgentIndex = (this.selectedAgentIndex + 1) % this.agents.length;
                this.showNotification(`FOCUSED ON AI #${this.agents[this.selectedAgentIndex].id}`);
            });
        }

        // Speed Multiplier Button (1x -> 2x -> 4x)
        const speedBtn = document.getElementById('btn-sim-speed');
        if (speedBtn) {
            speedBtn.addEventListener('click', () => {
                if (this.simSpeed === 1.0) this.simSpeed = 2.0;
                else if (this.simSpeed === 2.0) this.simSpeed = 4.0;
                else this.simSpeed = 1.0;
                speedBtn.textContent = `${this.simSpeed}x SPEED`;
                this.showNotification(`SIMULATION SPEED: ${this.simSpeed}x`);
            });
        }

        // Toggle Sensors Visibility
        const sensorBtn = document.getElementById('btn-toggle-sensors');
        if (sensorBtn) {
            sensorBtn.addEventListener('click', () => {
                this.showSensors = !this.showSensors;
                this.agents.forEach(a => {
                    a.sensorLines.forEach(l => l.visible = this.showSensors);
                });
                sensorBtn.textContent = this.showSensors ? 'SENSORS ON' : 'SENSORS OFF';
                this.showNotification(this.showSensors ? 'RADAR SENSORS: VISIBLE' : 'RADAR SENSORS: HIDDEN');
            });
        }

        // Reset Q-Table Brain Button
        const resetBrainBtn = document.getElementById('btn-reset-brain');
        if (resetBrainBtn) {
            resetBrainBtn.addEventListener('click', () => {
                this.brain.resetBrain();
                this.agents.forEach(a => a.reset());
                this.showNotification('Q-TABLE MEMORY CLEARED');
            });
        }
    }

    onKeyDown(e) {
        if (e.code === 'KeyC') {
            this.cameraMode = (this.cameraMode + 1) % 3;
            const labels = ['CHASE LEADER', 'FLEET DRONE', 'TRACK HOOD'];
            const camBtn = document.getElementById('btn-camera');
            if (camBtn) camBtn.textContent = labels[this.cameraMode];
            this.showNotification(labels[this.cameraMode]);
        }
        if (e.code === 'KeyN') {
            this.selectedAgentIndex = (this.selectedAgentIndex + 1) % this.agents.length;
            this.showNotification(`FOCUSED ON AI #${this.agents[this.selectedAgentIndex].id}`);
        }
        if (e.code === 'Equal' || e.code === 'NumpadAdd') {
            this.setAgentCount(this.agents.length + 1);
        }
        if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
            this.setAgentCount(this.agents.length - 1);
        }
    }

    updateCamera(dt) {
        if (this.agents.length === 0) return;

        const targetAgent = this.agents[this.selectedAgentIndex] || this.agents[0];
        const carWorld = targetAgent.group;
        const speedKmh = Math.abs(targetAgent.speed) * 3.6;

        if (this.cameraMode === 0) {
            // Chase Camera (smooth follow)
            const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(carWorld.quaternion);
            const dist = 7.5 + (speedKmh / 100) * 1.5;
            const height = 3.2 + (speedKmh / 120) * 0.5;

            const targetPos = carWorld.position.clone()
                .sub(fwd.clone().multiplyScalar(dist))
                .add(new THREE.Vector3(0, height, 0));

            const lookTarget = carWorld.position.clone()
                .add(new THREE.Vector3(0, 1.2, 0))
                .add(fwd.clone().multiplyScalar(4.0));

            this.camera.position.lerp(targetPos, Math.min(1.0, dt * 8.0));
            this.camera.lookAt(lookTarget);
            this.camera.fov = 60 + Math.min(10, (speedKmh / 100) * 8);
            this.camera.updateProjectionMatrix();

        } else if (this.cameraMode === 1) {
            // Fleet Top-Down / Drone View (wide bird's-eye)
            const droneTarget = carWorld.position.clone().add(new THREE.Vector3(0, 36, 6));
            this.camera.position.lerp(droneTarget, Math.min(1.0, dt * 5.0));
            this.camera.lookAt(carWorld.position.clone().add(new THREE.Vector3(0, 0, 12)));
            this.camera.fov = 58;
            this.camera.updateProjectionMatrix();

        } else if (this.cameraMode === 2) {
            // Hood / Bumper View
            const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(carWorld.quaternion);
            const hoodPos = carWorld.position.clone()
                .add(new THREE.Vector3(0, 0.95, 0))
                .add(fwd.clone().multiplyScalar(1.2));
            const hoodLook = hoodPos.clone().add(fwd.clone().multiplyScalar(30));
            this.camera.position.copy(hoodPos);
            this.camera.lookAt(hoodLook);
            this.camera.fov = 72;
            this.camera.updateProjectionMatrix();
        }
    }

    updateDashboard() {
        // Agent Count
        const countEl = document.getElementById('agent-count-val');
        if (countEl) countEl.textContent = this.agents.length;

        // States Learned
        const statesEl = document.getElementById('stat-states');
        if (statesEl) statesEl.textContent = this.brain.qTable.size;

        // Exploration Epsilon
        const epsEl = document.getElementById('stat-epsilon');
        if (epsEl) epsEl.textContent = `${Math.floor(this.brain.epsilon * 100)}%`;

        // Total Episodes
        const epEl = document.getElementById('stat-episodes');
        if (epEl) epEl.textContent = this.brain.totalEpisodes;

        // Avoidances
        const avoidEl = document.getElementById('stat-avoidances');
        if (avoidEl) avoidEl.textContent = this.brain.totalAvoidances;

        // Collisions
        const colEl = document.getElementById('stat-collisions');
        if (colEl) colEl.textContent = this.brain.totalCollisions;

        // Focused Agent Telemetry
        const activeAgent = this.agents[this.selectedAgentIndex];
        if (activeAgent) {
            const speedKmh = Math.floor(activeAgent.speed * 3.6);
            const speedEl = document.getElementById('speed-value');
            if (speedEl) speedEl.textContent = speedKmh;

            const actionEl = document.getElementById('stat-action');
            if (actionEl) actionEl.textContent = this.brain.actionNames[activeAgent.lastAction] || 'CRUISE';

            const agentLabel = document.getElementById('agent-focus-badge');
            if (agentLabel) {
                agentLabel.textContent = `TRACKING AI #${activeAgent.id}`;
                agentLabel.style.color = `#${activeAgent.colorHex.toString(16).padStart(6, '0')}`;
            }

            // Radar Status for focused agent
            const minRay = Math.min(...activeAgent.rayDistances);
            const radarCard = document.getElementById('radar-status');
            const radarText = document.getElementById('radar-text');
            const radarDist = document.getElementById('radar-dist');

            if (radarCard && radarText) {
                if (minRay < 5.0) {
                    radarCard.className = 'radar-alert collision';
                    radarText.textContent = 'DANGER: OBSTACLE CLOSE';
                    if (radarDist) radarDist.textContent = `${minRay.toFixed(1)} m`;
                } else if (minRay < 15.0) {
                    radarCard.className = 'radar-alert warning';
                    radarText.textContent = 'OBSTACLE AHEAD';
                    if (radarDist) radarDist.textContent = `${minRay.toFixed(1)} m`;
                } else {
                    radarCard.className = 'radar-alert clear';
                    radarText.textContent = 'LANE CLEAR';
                    if (radarDist) radarDist.textContent = '—';
                }
            }
        }
    }

    showNotification(msg) {
        const el = document.getElementById('notification-banner');
        if (!el) return;
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(this.notifTimer);
        this.notifTimer = setTimeout(() => el.classList.remove('show'), 1500);
    }

    animate(now) {
        requestAnimationFrame((t) => this.animate(t));

        // Delta time scaled by simulation speed multiplier
        const baseDt = Math.min(0.04, (now - this.lastTime) / 1000);
        this.lastTime = now;
        const dt = baseDt * this.simSpeed;

        const obstacles = this.obstacleMgr ? this.obstacleMgr.getObstacles() : [];
        const traffic = this.trafficMgr ? this.trafficMgr.getVehicles() : [];

        // 1. Step All Autonomous Q-Learning Agents in Parallel
        for (let i = 0; i < this.agents.length; i++) {
            this.agents[i].step(dt, obstacles, traffic, this.agents);
        }

        // 2. Update Traffic Vehicles
        if (this.trafficMgr && this.agents.length > 0) {
            const leadAgent = this.agents[this.selectedAgentIndex] || this.agents[0];
            this.trafficMgr.update(dt, leadAgent.position, leadAgent.speed);
        }

        // 3. Update Environment Infinite Road Tiling
        if (this.env && this.agents.length > 0) {
            const leadAgent = this.agents[this.selectedAgentIndex] || this.agents[0];
            this.env.update(leadAgent.position);
        }

        // 4. Update Audio (based on focused agent)
        if (this.audio && this.agents.length > 0) {
            const active = this.agents[this.selectedAgentIndex] || this.agents[0];
            const speedKmh = Math.abs(active.speed) * 3.6;
            const fakeRpm = 1200 + (speedKmh / 100) * 5200;
            this.audio.update(fakeRpm, active.speed > 2, speedKmh, false);
        }

        // 5. Update Dynamic Camera
        this.updateCamera(baseDt);

        // 6. Update HUD Dashboard & Metrics
        this.updateDashboard();

        // 7. Render 3D Scene
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        const w = window.innerWidth || 1280;
        const h = window.innerHeight || 720;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }
}

window.SimulationApp = SimulationApp;

function bootstrap() {
    try {
        window.appInstance = new SimulationApp();
    } catch (err) {
        console.error("Simulation failed to start:", err);
        const l = document.getElementById('loader');
        if (l) {
            l.innerHTML = `
                <div style="color: #ef4444; font-weight: 800; font-size: 18px; margin-bottom: 8px;">Initialization Error</div>
                <div style="color: #475569; font-size: 13px; max-width: 500px; text-align: center;">${err.message || err}</div>
                <button onclick="location.reload()" style="margin-top: 16px; padding: 8px 18px; border-radius: 8px; border: 1px solid #cbd5e1; background: #0284c7; color: #fff; cursor: pointer;">Retry</button>
            `;
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}
