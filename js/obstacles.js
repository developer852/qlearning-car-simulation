// Roadway Obstacles: Traffic cones, construction barricades & hazard barrels
class ObstacleManager {
    constructor(scene) {
        this.scene = scene;
        this.obstacles = [];
        this.buildObstacles();
    }

    buildObstacles() {
        // Shared materials
        const coneOrangeMat = new THREE.MeshStandardMaterial({
            color: 0xff5500,
            roughness: 0.3,
            metalness: 0.1
        });
        const reflectiveWhiteMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.2,
            metalness: 0.8
        });
        const barrierMat = new THREE.MeshStandardMaterial({
            color: 0xeeeeee,
            roughness: 0.4
        });
        const barrelMat = new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            roughness: 0.5,
            metalness: 0.2
        });

        // 1. Traffic Cones
        const coneGeom = new THREE.ConeGeometry(0.35, 0.9, 14);
        const coneBaseGeom = new THREE.BoxGeometry(0.7, 0.08, 0.7);
        const stripeGeom = new THREE.CylinderGeometry(0.24, 0.28, 0.2, 14);

        const createCone = (x, z) => {
            const group = new THREE.Group();
            group.position.set(x, 0, z);

            const base = new THREE.Mesh(coneBaseGeom, coneOrangeMat);
            base.position.y = 0.04;
            base.castShadow = true;
            group.add(base);

            const cone = new THREE.Mesh(coneGeom, coneOrangeMat);
            cone.position.y = 0.45;
            cone.castShadow = true;
            group.add(cone);

            const stripe = new THREE.Mesh(stripeGeom, reflectiveWhiteMat);
            stripe.position.y = 0.45;
            group.add(stripe);

            this.scene.add(group);

            const coneObj = {
                group,
                position: group.position,
                radius: 0.55,
                type: 'cone',
                toppled: false,
                onHit(speed, fwdX, fwdZ) {
                    if (!this.toppled) {
                        this.toppled = true;
                        group.rotation.x += 1.2;
                        group.rotation.z += (Math.random() - 0.5) * 1.5;
                        group.position.x += fwdX * 0.8;
                        group.position.z += fwdZ * 0.8;
                    }
                }
            };
            return coneObj;
        };

        // 2. Construction Barricade (A-frame warning barrier)
        const createBarricade = (x, z) => {
            const group = new THREE.Group();
            group.position.set(x, 0, z);

            // Barrier Board
            const boardGeom = new THREE.BoxGeometry(2.4, 0.45, 0.1);
            const board = new THREE.Mesh(boardGeom, coneOrangeMat);
            board.position.y = 0.75;
            board.castShadow = true;
            group.add(board);

            // Reflective stripes on board
            for (let s = -0.8; s <= 0.8; s += 0.5) {
                const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.46, 0.11), reflectiveWhiteMat);
                stripe.position.set(s, 0.75, 0);
                group.add(stripe);
            }

            // Legs
            const legGeom = new THREE.BoxGeometry(0.08, 1.0, 0.08);
            [-1.0, 1.0].forEach(lx => {
                const legA = new THREE.Mesh(legGeom, barrierMat);
                legA.position.set(lx, 0.5, 0.2);
                legA.rotation.x = 0.25;
                legA.castShadow = true;
                group.add(legA);

                const legB = new THREE.Mesh(legGeom, barrierMat);
                legB.position.set(lx, 0.5, -0.2);
                legB.rotation.x = -0.25;
                legB.castShadow = true;
                group.add(legB);
            });

            this.scene.add(group);

            return {
                group,
                position: group.position,
                radius: 1.3,
                type: 'barricade',
                onHit: (speed, fwdX, fwdZ) => {
                    group.rotation.y += 0.4;
                    group.position.z += fwdZ * 0.5;
                }
            };
        };

        // 3. Hazard Barrel (Impact attenuator drum)
        const createBarrel = (x, z) => {
            const group = new THREE.Group();
            group.position.set(x, 0, z);

            const barrelGeom = new THREE.CylinderGeometry(0.55, 0.55, 1.1, 16);
            const barrel = new THREE.Mesh(barrelGeom, barrelMat);
            barrel.position.y = 0.55;
            barrel.castShadow = true;
            group.add(barrel);

            // Black reflective hazard band
            const bandMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
            const band = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.25, 16), bandMat);
            band.position.y = 0.55;
            group.add(band);

            this.scene.add(group);

            return {
                group,
                position: group.position,
                radius: 0.8,
                type: 'barrel',
                onHit: (speed, fwdX, fwdZ) => {
                    group.position.x += fwdX * 0.4;
                    group.position.z += fwdZ * 0.4;
                }
            };
        };

        // Populate obstacles at varied intervals along the showcase road
        // Road lanes: Lane -2 (-10m), Lane -1 (-5m), Lane 0 (0m), Lane 1 (+5m), Lane 2 (+10m)
        
        // Zone 1: Slalom cones in middle lane (demonstrates lane changing)
        this.obstacles.push(createCone(0, 35));
        this.obstacles.push(createCone(-1.2, 55));
        this.obstacles.push(createCone(1.2, 75));
        this.obstacles.push(createCone(0, 95));

        // Zone 2: Work zone in right lane (barricades & barrels)
        this.obstacles.push(createBarricade(5.5, 140));
        this.obstacles.push(createBarrel(5.5, 148));
        this.obstacles.push(createCone(4.5, 130));
        this.obstacles.push(createCone(6.5, 130));

        // Zone 3: Road maintenance zone in left lane
        this.obstacles.push(createBarricade(-6.0, 220));
        this.obstacles.push(createBarricade(-6.0, 228));
        this.obstacles.push(createBarrel(-5.0, 235));
        this.obstacles.push(createCone(-6.0, 210));

        // Zone 4: Dual barrels lane pinch
        this.obstacles.push(createBarrel(-3.5, 310));
        this.obstacles.push(createBarrel(3.5, 310));

        // Zone 5: Staggered cones
        for (let i = 0; i < 6; i++) {
            const z = 380 + i * 20;
            const x = (i % 2 === 0) ? -2.5 : 2.5;
            this.obstacles.push(createCone(x, z));
        }

        // Zone 6: Further down road
        this.obstacles.push(createBarricade(0, 520));
        this.obstacles.push(createBarrel(-4.5, 540));
        this.obstacles.push(createBarrel(4.5, 540));
    }

    getObstacles() {
        return this.obstacles;
    }
}

window.ObstacleManager = ObstacleManager;
