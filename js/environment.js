// Realistic showcase environment: Multi-lane roadway, curbs, sidewalks, trees, streetlamps & modern city backdrop
class Environment {
    constructor(scene) {
        this.scene = scene;
        this.roadTiles = [];
        this.roadLength = 600; // Total length of road sections
        this.roadWidth = 24;   // 6-lane roadway

        this.setupLighting();
        this.buildRoadway();
        this.buildProps();
        this.buildCitySkyline();
    }

    setupLighting() {
        // Soft atmospheric fog
        this.scene.fog = new THREE.FogExp2(0xd6e5f3, 0.0022);

        // Sky & Ground Hemisphere Light
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x556677, 0.75);
        this.scene.add(hemiLight);

        // Bright Daytime Directional Sun
        const sun = new THREE.DirectionalLight(0xffffff, 1.2);
        sun.position.set(120, 200, 150);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 10;
        sun.shadow.camera.far = 450;
        sun.shadow.camera.left = -50;
        sun.shadow.camera.right = 50;
        sun.shadow.camera.top = 50;
        sun.shadow.camera.bottom = -50;
        sun.shadow.bias = -0.0003;
        this.scene.add(sun);
        this.sun = sun;

        // Soft ambient fill
        const amb = new THREE.AmbientLight(0xcfd8dc, 0.45);
        this.scene.add(amb);

        // Sky Dome
        const skyGeo = new THREE.SphereGeometry(600, 32, 16);
        const skyMat = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            uniforms: {
                topColor: { value: new THREE.Color(0x38bdf8) },    // Vibrant daytime sky blue
                bottomColor: { value: new THREE.Color(0xf0fdf4) } // Horizon haze
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(0.0, h)), 1.0);
                }
            `
        });
        this.scene.add(new THREE.Mesh(skyGeo, skyMat));
    }

    createRoadTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // Dark Asphalt base
        ctx.fillStyle = '#1e2229';
        ctx.fillRect(0, 0, 1024, 1024);

        // Asphalt micro-grain
        for (let i = 0; i < 30000; i++) {
            const v = Math.floor(25 + Math.random() * 20);
            ctx.fillStyle = `rgb(${v},${v},${v})`;
            ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
        }

        // Outer white edge solid lines
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.moveTo(35, 0); ctx.lineTo(35, 1024);
        ctx.moveTo(989, 0); ctx.lineTo(989, 1024);
        ctx.stroke();

        // Double yellow center divider line
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(504, 0); ctx.lineTo(504, 1024);
        ctx.moveTo(520, 0); ctx.lineTo(520, 1024);
        ctx.stroke();

        // Dashed white lane dividers
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 8;
        ctx.setLineDash([45, 55]);

        // 4 dashed dividers for 6 lanes
        [195, 350, 674, 829].forEach(x => {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 1024);
            ctx.stroke();
        });

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1, 24);
        tex.anisotropy = 16;
        return tex;
    }

    buildRoadway() {
        const roadTex = this.createRoadTexture();
        const roadMat = new THREE.MeshStandardMaterial({
            map: roadTex,
            roughness: 0.85,
            metalness: 0.1
        });

        // 1. Main Asphalt Surface (2 long repeating tiles)
        for (let i = 0; i < 2; i++) {
            const roadGeom = new THREE.PlaneGeometry(this.roadWidth, this.roadLength);
            roadGeom.rotateX(-Math.PI / 2);
            const roadMesh = new THREE.Mesh(roadGeom, roadMat);
            roadMesh.position.set(0, 0, i * this.roadLength);
            roadMesh.receiveShadow = true;
            this.scene.add(roadMesh);
            this.roadTiles.push(roadMesh);
        }

        // 2. Concrete Curbs & Sidewalks on left & right
        const sidewalkMat = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            roughness: 0.9,
            metalness: 0.05
        });
        const curbMat = new THREE.MeshStandardMaterial({
            color: 0xcbd5e1,
            roughness: 0.7
        });

        [-1, 1].forEach(side => {
            const curbX = side * (this.roadWidth / 2 + 0.3);
            const curbGeom = new THREE.BoxGeometry(0.6, 0.3, this.roadLength * 2);
            const curb = new THREE.Mesh(curbGeom, curbMat);
            curb.position.set(curbX, 0.15, this.roadLength / 2);
            curb.receiveShadow = true;
            curb.castShadow = true;
            this.scene.add(curb);

            // Sidewalk
            const swX = side * (this.roadWidth / 2 + 3.5);
            const swGeom = new THREE.BoxGeometry(6.0, 0.25, this.roadLength * 2);
            const sw = new THREE.Mesh(swGeom, sidewalkMat);
            sw.position.set(swX, 0.12, this.roadLength / 2);
            sw.receiveShadow = true;
            this.scene.add(sw);

            // Grassy lawn beyond sidewalk
            const grassMat = new THREE.MeshStandardMaterial({
                color: 0x22c55e,
                roughness: 0.95
            });
            const grassX = side * (this.roadWidth / 2 + 40);
            const grassGeom = new THREE.PlaneGeometry(70, this.roadLength * 2);
            grassGeom.rotateX(-Math.PI / 2);
            const grass = new THREE.Mesh(grassGeom, grassMat);
            grass.position.set(grassX, 0.02, this.roadLength / 2);
            grass.receiveShadow = true;
            this.scene.add(grass);
        });
    }

    buildProps() {
        // Modern streetlamps along sidewalks
        const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
        const lampBulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        const lampSpacing = 45;
        for (let z = 0; z < this.roadLength * 2; z += lampSpacing) {
            [-1, 1].forEach(side => {
                const group = new THREE.Group();
                const x = side * (this.roadWidth / 2 + 3.0);
                group.position.set(x, 0, z);

                // Vertical pole
                const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 7.5, 8), lampPoleMat);
                pole.position.y = 3.75;
                pole.castShadow = true;
                group.add(pole);

                // Arm reaching over sidewalk
                const arm = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.1), lampPoleMat);
                arm.position.set(-side * 0.9, 7.4, 0);
                group.add(arm);

                // Fixture
                const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.3), lampBulbMat);
                fixture.position.set(-side * 1.8, 7.3, 0);
                group.add(fixture);

                this.scene.add(group);
            });
        }

        // Roadside Deciduous Trees
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
        const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });

        const treeSpacing = 35;
        for (let z = 15; z < this.roadLength * 2; z += treeSpacing) {
            [-1, 1].forEach(side => {
                const group = new THREE.Group();
                const x = side * (this.roadWidth / 2 + 5.5 + Math.random() * 2);
                group.position.set(x, 0, z);

                // Trunk
                const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 3.5, 6), trunkMat);
                trunk.position.y = 1.75;
                trunk.castShadow = true;
                group.add(trunk);

                // Crown foliage
                const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2, 1), foliageMat);
                crown.position.y = 4.5;
                crown.castShadow = true;
                group.add(crown);

                this.scene.add(group);
            });
        }
    }

    buildCitySkyline() {
        // Modern architectural buildings in background
        const buildingColors = [0x64748b, 0x475569, 0x94a3b8, 0x334155, 0x0f172a];
        
        for (let z = -100; z < this.roadLength * 2 + 100; z += 40) {
            [-1, 1].forEach(side => {
                const width = 18 + Math.random() * 14;
                const height = 25 + Math.random() * 55;
                const depth = 20 + Math.random() * 15;
                const x = side * (this.roadWidth / 2 + 35 + width / 2);

                const col = buildingColors[Math.floor(Math.random() * buildingColors.length)];
                const mat = new THREE.MeshStandardMaterial({
                    color: col,
                    roughness: 0.4,
                    metalness: 0.5
                });

                const bldg = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
                bldg.position.set(x, height / 2, z);
                bldg.castShadow = true;
                bldg.receiveShadow = true;
                this.scene.add(bldg);
            });
        }
    }

    update(playerPosition) {
        // Move sunlight with player for consistent shadows
        if (this.sun) {
            this.sun.position.set(playerPosition.x + 80, 160, playerPosition.z + 100);
            this.sun.target.position.set(playerPosition.x, 0, playerPosition.z);
        }

        // Infinite road tiling
        const threshold = this.roadLength;
        for (let tile of this.roadTiles) {
            if (playerPosition.z - tile.position.z > threshold) {
                tile.position.z += this.roadLength * 2;
            } else if (tile.position.z - playerPosition.z > threshold) {
                tile.position.z -= this.roadLength * 2;
            }
        }
    }
}

window.Environment = Environment;
