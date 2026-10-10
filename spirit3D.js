/**
 * NASA Space Relics - Space Background Engine & Interactive 3D Scenes
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* =========================================================
   BACKGROUND ENGINE: Animated Stars, Planets & Dust
   ========================================================= */
class SpaceBackgroundEngine {
  constructor() {
    this.canvas = document.getElementById('bg-canvas');
    if (!this.canvas) return;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 50;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.planets = [];
    this.particles = null;

    this.initStars();
    this.initMovingParticles();
    this.initBackgroundPlanets();
    this.bindEvents();
    this.animate();
  }

  initStars() {
    const starCount = 1200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 300;
      positions[i + 1] = (Math.random() - 0.5) * 300;
      positions[i + 2] = (Math.random() - 0.5) * 300;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8,
      transparent: true,
      opacity: 0.85
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  initMovingParticles() {
    const particleCount = 400;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 150;
      positions[i + 1] = (Math.random() - 0.5) * 150;
      positions[i + 2] = (Math.random() - 0.5) * 100;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.5,
      transparent: true,
      opacity: 0.4
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  initBackgroundPlanets() {
    const planetData = [
      { radius: 4.0, color: 0xef4444, pos: [-35, 15, -40] },
      { radius: 6.5, color: 0x3b82f6, pos: [40, -20, -50] },
      { radius: 3.0, color: 0xfbbf24, pos: [-20, -25, -30] }
    ];

    const light = new THREE.DirectionalLight(0xffffff, 2.5);
    light.position.set(20, 30, 40);
    this.scene.add(light, new THREE.AmbientLight(0x223344, 1.2));

    planetData.forEach((p) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(p.radius, 32, 32),
        new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.7 })
      );
      mesh.position.set(...p.pos);
      this.scene.add(mesh);
      this.planets.push(mesh);
    });
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    if (this.stars) this.stars.rotation.y += 0.0003;

    this.planets.forEach((planet, idx) => {
      planet.rotation.y += 0.003 * (idx + 1);
      planet.position.y += Math.sin(Date.now() * 0.001 + idx) * 0.01;
    });

    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array;
      for (let i = 2; i < positions.length; i += 3) {
        positions[i] += 0.08;
        if (positions[i] > 50) {
          positions[i] = -100;
        }
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

/* =========================================================
   DUAL 3D ENGINE: Solar System, Rover, EDL Landing, Transit & Surface Target Engine
   ========================================================= */
class Dual3DEngine {
  constructor() {
    this.spiritContainer = document.getElementById('spirit3D');
    this.solarContainer = document.getElementById('solar3D');
    this.landingContainer = document.getElementById('landing3D');
    this.transitContainer = document.getElementById('transit3D');
    this.surfaceContainer = document.getElementById('surface3D');

    // Engine 1: Rover Subsystem Assembly
    this.roverScene = null;
    this.roverCamera = null;
    this.roverRenderer = null;
    this.roverControls = null;
    this.rover = null;
    this.dustParticles = null;
    this.subsystems = {};
    this.wheels = [];

    // Engine 2: Solar System Target Selector
    this.solarScene = null;
    this.solarCamera = null;
    this.solarRenderer = null;
    this.solarControls = null;
    this.planets = {};
    this.selectedPlanet = 'mars';

    // Engine 3: Mars Landing (EDL)
    this.landingScene = null;
    this.landingCamera = null;
    this.landingRenderer = null;
    this.landingControls = null;
    this.landingCraftGroup = null;
    this.capsuleMesh = null;
    this.parachuteMesh = null;
    this.plasmaParticles = null;

    // Engine 4: Interplanetary Cruise Phase
    this.transitScene = null;
    this.transitCamera = null;
    this.transitRenderer = null;
    this.transitCraftGroup = null;
    this.transitEarth = null;
    this.transitMars = null;
    this.transitProgress = 0;
    this.isFlying = false;

    // Engine 5: Surface Exploration Target Viewport
    this.surfaceScene = null;
    this.surfaceCamera = null;
    this.surfaceRenderer = null;
    this.surfaceControls = null;
    this.targetMeshes = {};
    this.steamParticles = null;

    this.initRoverEngine();
    this.initSolarEngine();
    this.initLandingEngine();
    this.initTransitEngine();
    this.initSurfaceEngine();
    this.bindGlobalHooks();
    this.animate();
  }

  /* 1. SOLAR SYSTEM ENGINE */
  initSolarEngine() {
    if (!this.solarContainer) return;

    const width = this.solarContainer.clientWidth || 600;
    const height = this.solarContainer.clientHeight || 340;

    this.solarScene = new THREE.Scene();
    this.solarCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.solarCamera.position.set(0, 18, 30);

    this.solarRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.solarRenderer.setSize(width, height);
    this.solarRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.solarContainer.appendChild(this.solarRenderer.domElement);

    this.solarControls = new OrbitControls(this.solarCamera, this.solarRenderer.domElement);
    this.solarControls.enableDamping = true;
    this.solarControls.dampingFactor = 0.05;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    const sunPointLight = new THREE.PointLight(0xfff5ea, 3, 300);
    this.solarScene.add(ambientLight, sunPointLight);

    this.createStarfield();

    const planetData = [
      { name: 'sun', size: 3.0, color: 0xffaa00, dist: 0, emissive: 0xff8800 },
      { name: 'earth', size: 0.9, color: 0x3b82f6, dist: 8 },
      { name: 'mars', size: 0.6, color: 0xef4444, dist: 13 },
      { name: 'jupiter', size: 1.8, color: 0xd97706, dist: 20 },
      { name: 'saturn', size: 1.4, color: 0xf59e0b, dist: 27, hasRings: true }
    ];

    planetData.forEach((data) => {
      const group = new THREE.Group();
      
      if (data.dist > 0) {
        const orbitGeo = new THREE.RingGeometry(data.dist - 0.05, data.dist + 0.05, 64);
        const orbitMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.25 });
        const orbitMesh = new THREE.Mesh(orbitGeo, orbitMat);
        orbitMesh.rotation.x = Math.PI / 2;
        this.solarScene.add(orbitMesh);
      }

      const matConfig = { color: data.color, roughness: 0.8 };
      if (data.emissive) {
        matConfig.emissive = data.emissive;
        matConfig.emissiveIntensity = 1.2;
      }

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(data.size, 32, 32),
        new THREE.MeshStandardMaterial(matConfig)
      );
      mesh.position.x = data.dist;
      group.add(mesh);

      if (data.hasRings) {
        const ringGeo = new THREE.RingGeometry(1.8, 2.8, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xd97706, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2.3;
        mesh.add(ringMesh);
      }

      this.solarScene.add(group);
      this.planets[data.name] = { group, mesh, dist: data.dist, angle: Math.random() * Math.PI * 2, speed: (1 / (data.dist || 1)) * 0.015 };
    });

    this.focusSolarTarget('mars');
  }

  createStarfield() {
    const count = 600;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 160;
      positions[i + 1] = (Math.random() - 0.5) * 160;
      positions[i + 2] = (Math.random() - 0.5) * 160;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starfield = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, transparent: true, opacity: 0.8 })
    );
    this.solarScene.add(starfield);
  }

  focusSolarTarget(planetName) {
    if (!this.planets[planetName]) return;
    this.selectedPlanet = planetName;
    const targetObj = this.planets[planetName].mesh;
    
    const worldPos = new THREE.Vector3();
    targetObj.getWorldPosition(worldPos);
    
    this.solarControls.target.copy(worldPos);
    this.solarCamera.position.set(worldPos.x + 3, worldPos.y + 2, worldPos.z + 4);
    this.solarControls.update();
  }

  /* 2. SPIRIT ROVER ENGINE */
  initRoverEngine() {
    if (!this.spiritContainer) return;

    const width = this.spiritContainer.clientWidth || 400;
    const height = this.spiritContainer.clientHeight || 340;

    this.roverScene = new THREE.Scene();
    this.roverScene.fog = new THREE.FogExp2(0x1a0f0d, 0.05);

    this.roverCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.roverCamera.position.set(3.5, 2.5, 4.5);

    this.roverRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.roverRenderer.setSize(width, height);
    this.roverRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.roverRenderer.shadowMap.enabled = true;
    this.roverRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.spiritContainer.appendChild(this.roverRenderer.domElement);

    const loader = this.spiritContainer.querySelector('.rover-loading');
    if (loader) loader.style.display = 'none';

    this.roverControls = new OrbitControls(this.roverCamera, this.roverRenderer.domElement);
    this.roverControls.enableDamping = true;
    this.roverControls.dampingFactor = 0.05;
    this.roverControls.target.set(0, 0.6, 0);

    const hemiLight = new THREE.HemisphereLight(0xffe2b3, 0x110806, 0.6);
    this.roverScene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffbe86, 2.0);
    sunLight.position.set(10, 15, 8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 50;
    this.roverScene.add(sunLight);

    this.createMarsGround();
    this.createDustParticles();
    this.buildProceduralSpiritRover();
  }

  createMarsGround() {
    const gridHelper = new THREE.GridHelper(14, 28, 0x38bdf8, 0x1e293b);
    gridHelper.position.y = -0.01;
    this.roverScene.add(gridHelper);

    const groundGeo = new THREE.PlaneGeometry(16, 16);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x22110c, roughness: 0.95 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.roverScene.add(ground);
  }

  createDustParticles() {
    const count = 300;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 12;
      positions[i + 1] = Math.random() * 4;
      positions[i + 2] = (Math.random() - 0.5) * 12;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.dustParticles = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: 0xc27a4e, size: 0.04, transparent: true, opacity: 0.6 })
    );
    this.roverScene.add(this.dustParticles);
  }

  buildProceduralSpiritRover() {
    this.rover = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xdfa000, metalness: 0.9, roughness: 0.2 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6 });
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7 });

    const computerGroup = new THREE.Group();
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 1.6), bodyMat);
    chassis.position.y = 0.6;
    chassis.castShadow = true;
    computerGroup.add(chassis);
    this.subsystems.computer = computerGroup;
    this.rover.add(computerGroup);

    const powerGroup = new THREE.Group();
    const mainDeck = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 1.8), goldMat);
    mainDeck.position.set(0, 0.82, 0);
    mainDeck.castShadow = true;
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 1.2), goldMat);
    leftWing.position.set(-1.1, 0.82, 0);
    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 1.2), goldMat);
    rightWing.position.set(1.1, 0.82, 0);
    powerGroup.add(mainDeck, leftWing, rightWing);
    this.subsystems.power = powerGroup;
    this.rover.add(powerGroup);

    const mobilityGroup = new THREE.Group();
    this.wheels = [];
    const wheelPositions = [
      [-0.9, 0.22, 0.7], [0.9, 0.22, 0.7],
      [-0.9, 0.22, 0.0], [0.9, 0.22, 0.0],
      [-0.9, 0.22, -0.7], [0.9, 0.22, -0.7]
    ];
    wheelPositions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.18, 16), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      wheel.castShadow = true;
      mobilityGroup.add(wheel);
      this.wheels.push(wheel);
    });
    this.subsystems.mobility = mobilityGroup;
    this.rover.add(mobilityGroup);

    const commGroup = new THREE.Group();
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.05, 0.08, 16), goldMat);
    dish.position.set(0.4, 1.0, -0.5);
    dish.rotation.x = Math.PI / 4;
    dish.castShadow = true;
    commGroup.add(dish);
    this.subsystems.communication = commGroup;
    this.rover.add(commGroup);

    const scienceGroup = new THREE.Group();
    const cameraMast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8), mastMat);
    cameraMast.position.set(-0.3, 1.2, 0.5);
    const cameraHead = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.2), mastMat);
    cameraHead.position.set(-0.3, 1.6, 0.5);
    cameraMast.castShadow = true;
    cameraHead.castShadow = true;
    scienceGroup.add(cameraMast, cameraHead);
    this.subsystems.science = scienceGroup;
    this.rover.add(scienceGroup);

    this.roverScene.add(this.rover);
    this.resetSubsystemsVisuals();
  }

  resetSubsystemsVisuals() {
    Object.keys(this.subsystems).forEach((key) => {
      this.subsystems[key].traverse((child) => {
        if (child.isMesh) {
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = 0.3;
        }
      });
    });
  }

  highlightSubsystem(systemName) {
    const group = this.subsystems[systemName];
    if (!group) return;

    group.traverse((child) => {
      if (child.isMesh) {
        child.material.transparent = false;
        child.material.opacity = 1.0;
        child.material.emissive = new THREE.Color(0x38bdf8);
        setTimeout(() => { if (child.material) child.material.emissive = new THREE.Color(0x000000); }, 800);
      }
    });
  }

  setCameraView(mode) {
    if (!this.roverCamera) return;

    if (mode === 'pancam') {
      this.roverCamera.position.set(-0.3, 1.7, 0.5);
      this.roverControls.target.set(-0.3, 1.7, 5.0);
    } else if (mode === 'wheel') {
      this.roverCamera.position.set(-1.2, 0.4, 0.8);
      this.roverControls.target.set(0, 0.2, 0);
    } else {
      this.roverCamera.position.set(3.5, 2.5, 4.5);
      this.roverControls.target.set(0, 0.6, 0);
    }
    this.roverControls.update();
  }

  /* 3. MARS LANDING EDL SCENE ENGINE */
  initLandingEngine() {
    if (!this.landingContainer) return;

    const width = this.landingContainer.clientWidth || 600;
    const height = this.landingContainer.clientHeight || 340;

    this.landingScene = new THREE.Scene();
    this.landingScene.fog = new THREE.FogExp2(0x8a3a1b, 0.015);

    this.landingCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.landingCamera.position.set(0, 5, 25);

    this.landingRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.landingRenderer.setSize(width, height);
    this.landingRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.landingContainer.appendChild(this.landingRenderer.domElement);

    const sunLight = new THREE.DirectionalLight(0xffbfa3, 2.0);
    sunLight.position.set(20, 40, 20);
    const ambient = new THREE.AmbientLight(0x4a2419, 0.8);
    this.landingScene.add(sunLight, ambient);

    this.landingCraftGroup = new THREE.Group();
    
    const capsuleGeo = new THREE.ConeGeometry(3, 2, 32);
    const capsuleMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6, metalness: 0.8 });
    this.capsuleMesh = new THREE.Mesh(capsuleGeo, capsuleMat);
    this.capsuleMesh.rotation.x = Math.PI;
    this.landingCraftGroup.add(this.capsuleMesh);

    const chuteGeo = new THREE.ConeGeometry(5, 3, 16, 1, true);
    const chuteMat = new THREE.MeshBasicMaterial({ color: 0xf97316, side: THREE.DoubleSide, wireframe: true });
    this.parachuteMesh = new THREE.Mesh(chuteGeo, chuteMat);
    this.parachuteMesh.position.set(0, 12, 0);
    this.parachuteMesh.visible = false;
    this.landingCraftGroup.add(this.parachuteMesh);

    this.landingScene.add(this.landingCraftGroup);

    const particleCount = 200;
    const pGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 8;
      positions[i + 1] = Math.random() * 15;
      positions[i + 2] = (Math.random() - 0.5) * 8;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.plasmaParticles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({ color: 0xff4500, size: 0.2, transparent: true, opacity: 0.8 })
    );
    this.landingScene.add(this.plasmaParticles);
  }

  updateLandingVisuals(telemetry) {
    if (!this.landingCraftGroup) return;

    this.landingCraftGroup.position.y = Math.max(-5, (telemetry.landing_altitude / 125) * 15 - 5);
    this.landingCraftGroup.rotation.z = Math.sin(Date.now() * 0.005) * 0.05;

    if (telemetry.parachute_deployed && this.parachuteMesh) {
      this.parachuteMesh.visible = true;
      if (this.plasmaParticles) this.plasmaParticles.visible = false;
    }
  }

  /* 4. INTERPLANETARY TRANSIT ENGINE */
  initTransitEngine() {
    if (!this.transitContainer) return;

    const width = this.transitContainer.clientWidth || 600;
    const height = this.transitContainer.clientHeight || 380;

    this.transitScene = new THREE.Scene();
    this.transitScene.fog = new THREE.FogExp2(0x050811, 0.005);

    this.transitCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.transitCamera.position.set(0, 12, 35);

    this.transitRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.transitRenderer.setSize(width, height);
    this.transitRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.transitContainer.appendChild(this.transitRenderer.domElement);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
    sunLight.position.set(-50, 20, 30);
    const ambientLight = new THREE.AmbientLight(0x223344, 1.0);
    this.transitScene.add(sunLight, ambientLight);

    const earthGeo = new THREE.SphereGeometry(2.5, 32, 32);
    const earthMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.6 });
    this.transitEarth = new THREE.Mesh(earthGeo, earthMat);
    this.transitEarth.position.set(-22, 0, -10);
    this.transitScene.add(this.transitEarth);

    const marsGeo = new THREE.SphereGeometry(1.8, 32, 32);
    const marsMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.8 });
    this.transitMars = new THREE.Mesh(marsGeo, marsMat);
    this.transitMars.position.set(22, 0, 10);
    this.transitScene.add(this.transitMars);

    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-22, 0, -10),
      new THREE.Vector3(0, 8, 0),
      new THREE.Vector3(22, 0, 10)
    );
    const points = curve.getPoints(50);
    const pathGeo = new THREE.BufferGeometry().setFromPoints(points);
    const pathMat = new THREE.LineDashedMaterial({ color: 0x38bdf8, dashSize: 0.8, gapSize: 0.4 });
    const pathLine = new THREE.Line(pathGeo, pathMat);
    pathLine.computeLineDistances();
    this.transitScene.add(pathLine);

    this.transitCraftGroup = new THREE.Group();

    const craftBody = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.8),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.9, roughness: 0.2 })
    );
    const solarPanelLeft = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.05, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x0284c7 })
    );
    solarPanelLeft.position.x = -1.2;

    const solarPanelRight = solarPanelLeft.clone();
    solarPanelRight.position.x = 1.2;

    const engineGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    engineGlow.position.z = -0.6;

    this.transitCraftGroup.add(craftBody, solarPanelLeft, solarPanelRight, engineGlow);
    this.transitCraftGroup.position.copy(this.transitEarth.position);
    this.transitScene.add(this.transitCraftGroup);

    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(500 * 3);
    for (let i = 0; i < 500 * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 150;
      starPositions[i + 1] = (Math.random() - 0.5) * 150;
      starPositions[i + 2] = (Math.random() - 0.5) * 150;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.transitScene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.3 })));
  }

  startSpacecraftFlightAnimation() {
    this.transitProgress = 0;
    this.isFlying = true;
    const statusMsg = document.getElementById('transitStatusMsg');
    if (statusMsg) {
      statusMsg.textContent = 'Spacecraft in cruise configuration. Trajectory locked for Mars arrival.';
      statusMsg.style.color = '#fbbf24';
    }
  }

  /* 5. SURFACE EXPLORATION TARGET ENGINE */
  initSurfaceEngine() {
    if (!this.surfaceContainer) return;
    const w = this.surfaceContainer.clientWidth || 600, h = this.surfaceContainer.clientHeight || 340;

    this.surfaceScene = new THREE.Scene();
    this.surfaceScene.fog = new THREE.FogExp2(0x1e100c, 0.04);

    this.surfaceCamera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    this.surfaceCamera.position.set(0, 6, 16);

    this.surfaceRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.surfaceRenderer.setSize(w, h);
    this.surfaceRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.surfaceContainer.appendChild(this.surfaceRenderer.domElement);

    this.surfaceControls = new OrbitControls(this.surfaceCamera, this.surfaceRenderer.domElement);
    this.surfaceControls.enableDamping = true;
    this.surfaceControls.dampingFactor = 0.05;

    const sun = new THREE.DirectionalLight(0xffb88c, 2.5);
    sun.position.set(15, 25, 10);
    this.surfaceScene.add(sun, new THREE.AmbientLight(0x3a1e16, 1.2));

    // Ground Plane
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x2d1710, roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    this.surfaceScene.add(ground);

    // Build 3D Scientific Targets
    this.buildSurfaceTargets();
  }

  buildSurfaceTargets() {
    // Target 1: Humphrey Basaltic Rock (Left: x = -6)
    const rockGroup = new THREE.Group();
    const rockGeo = new THREE.DodecahedronGeometry(1.5, 1);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x3a3d40, roughness: 0.8, metalness: 0.2 });
    const rockMesh = new THREE.Mesh(rockGeo, rockMat);
    rockMesh.position.y = 1.0;

    // Mineral Vein Ring (Aqueous evidence)
    const veinGeo = new THREE.TorusGeometry(1.2, 0.06, 8, 24);
    const veinMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const veinMesh = new THREE.Mesh(veinGeo, veinMat);
    veinMesh.rotation.x = Math.PI / 3;
    veinMesh.position.y = 1.0;

    rockGroup.add(rockMesh, veinMesh);
    rockGroup.position.set(-6, 0, 0);
    this.surfaceScene.add(rockGroup);
    this.targetMeshes['rock'] = rockGroup;

    // Target 2: Columbia Hills Bedrock Mountain (Center: x = 0)
    const hillGroup = new THREE.Group();
    const hillGeo = new THREE.ConeGeometry(3.5, 4, 16);
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.95 });
    const hillMesh = new THREE.Mesh(hillGeo, hillMat);
    hillMesh.position.y = 2.0;

    hillGroup.add(hillMesh);
    hillGroup.position.set(0, 0, -4);
    this.surfaceScene.add(hillGroup);
    this.targetMeshes['hill'] = hillGroup;

    // Target 3: Home Plate Hydrothermal Silica Deposit & Steam Vents (Right: x = 6)
    const silicaGroup = new THREE.Group();
    const silicaGeo = new THREE.CylinderGeometry(2.0, 2.5, 0.6, 16);
    const silicaMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 }); // Bright silica
    const silicaMesh = new THREE.Mesh(silicaGeo, silicaMat);
    silicaMesh.position.y = 0.3;

    silicaGroup.add(silicaMesh);
    silicaGroup.position.set(6, 0, 0);
    this.surfaceScene.add(silicaGroup);
    this.targetMeshes['soil'] = silicaGroup;

    // Hydrothermal Steam Particle System
    const pCount = 80;
    const pGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 1.5;
      positions[i + 1] = Math.random() * 3;
      positions[i + 2] = (Math.random() - 0.5) * 1.5;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.steamParticles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({ color: 0xe2e8f0, size: 0.15, transparent: true, opacity: 0.6 })
    );
    this.steamParticles.position.set(6, 0.5, 0);
    this.surfaceScene.add(this.steamParticles);
  }

  focusSurfaceTarget(targetId) {
    const group = this.targetMeshes[targetId];
    if (!group || !this.surfaceControls) return;

    const pos = group.position;
    this.surfaceControls.target.set(pos.x, pos.y + 1, pos.z);
    this.surfaceCamera.position.set(pos.x, pos.y + 3, pos.z + 7);
    this.surfaceControls.update();
  }

  /* 6. EVENT BINDING & ANIMATION LOOP */
  handleResize() {
    if (this.spiritContainer && this.roverRenderer && this.roverCamera) {
      const w = this.spiritContainer.clientWidth;
      const h = this.spiritContainer.clientHeight;
      if (w > 0 && h > 0) {
        this.roverCamera.aspect = w / h;
        this.roverCamera.updateProjectionMatrix();
        this.roverRenderer.setSize(w, h);
      }
    }

    if (this.solarContainer && this.solarRenderer && this.solarCamera) {
      const w = this.solarContainer.clientWidth;
      const h = this.solarContainer.clientHeight;
      if (w > 0 && h > 0) {
        this.solarCamera.aspect = w / h;
        this.solarCamera.updateProjectionMatrix();
        this.solarRenderer.setSize(w, h);
      }
    }

    if (this.landingContainer && this.landingRenderer && this.landingCamera) {
      const w = this.landingContainer.clientWidth;
      const h = this.landingContainer.clientHeight;
      if (w > 0 && h > 0) {
        this.landingCamera.aspect = w / h;
        this.landingCamera.updateProjectionMatrix();
        this.landingRenderer.setSize(w, h);
      }
    }

    if (this.transitContainer && this.transitRenderer && this.transitCamera) {
      const w = this.transitContainer.clientWidth;
      const h = this.transitContainer.clientHeight;
      if (w > 0 && h > 0) {
        this.transitCamera.aspect = w / h;
        this.transitCamera.updateProjectionMatrix();
        this.transitRenderer.setSize(w, h);
      }
    }

    if (this.surfaceContainer && this.surfaceRenderer && this.surfaceCamera) {
      const w = this.surfaceContainer.clientWidth;
      const h = this.surfaceContainer.clientHeight;
      if (w > 0 && h > 0) {
        this.surfaceCamera.aspect = w / h;
        this.surfaceCamera.updateProjectionMatrix();
        this.surfaceRenderer.setSize(w, h);
      }
    }
  }

  bindGlobalHooks() {
    window.addEventListener('resize', () => this.handleResize());
    window.addEventListener('screenTransition', () => setTimeout(() => this.handleResize(), 50));

    window.triggerSystem3DFX = (systemName) => this.highlightSubsystem(systemName);
    window.setCameraView = (mode) => this.setCameraView(mode);
    window.resetRoverCamera = () => {
      if (this.roverControls) {
        this.roverCamera.position.set(3.5, 2.5, 4.5);
        this.roverControls.target.set(0, 0.6, 0);
        this.roverControls.update();
      }
    };
    window.focusSolarTarget = (name) => this.focusSolarTarget(name);
    window.focusSurfaceTarget = (id) => this.focusSurfaceTarget(id);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // 1. Solar System
    Object.keys(this.planets).forEach((key) => {
      const p = this.planets[key];
      if (p.dist > 0) {
        p.angle += p.speed;
        p.mesh.position.x = Math.cos(p.angle) * p.dist;
        p.mesh.position.z = Math.sin(p.angle) * p.dist;
      }
      p.mesh.rotation.y += 0.01;
    });

    if (this.solarControls) this.solarControls.update();
    if (this.solarRenderer && this.solarScene && this.solarCamera) {
      this.solarRenderer.render(this.solarScene, this.solarCamera);
    }

    // 2. Rover Model
    if (this.rover) this.rover.rotation.y += 0.002;
    this.wheels.forEach((w) => { w.rotation.x += 0.01; });

    if (this.roverControls) this.roverControls.update();
    if (this.roverRenderer && this.roverScene && this.roverCamera) {
      this.roverRenderer.render(this.roverScene, this.roverCamera);
    }

    // 3. Landing EDL
    if (this.landingRenderer && this.landingScene && this.landingCamera) {
      this.landingRenderer.render(this.landingScene, this.landingCamera);
    }

    // 4. Interplanetary Flight Animation
    if (this.isFlying && this.transitCraftGroup && this.transitEarth && this.transitMars) {
      this.transitProgress += 0.002;

      if (this.transitProgress > 1) {
        this.transitProgress = 1;
        this.isFlying = false;
        const statusMsg = document.getElementById('transitStatusMsg');
        if (statusMsg) {
          statusMsg.textContent = 'Orbital insertion complete! Mars gravity capture verified.';
          statusMsg.style.color = '#4ade80';
        }
      }

      const startPos = this.transitEarth.position;
      const targetPos = this.transitMars.position;
      
      const currentX = THREE.MathUtils.lerp(startPos.x, targetPos.x, this.transitProgress);
      const currentZ = THREE.MathUtils.lerp(startPos.z, targetPos.z, this.transitProgress);
      const currentY = Math.sin(this.transitProgress * Math.PI) * 8;

      this.transitCraftGroup.position.set(currentX, currentY, currentZ);
      this.transitCraftGroup.rotation.y = -Math.atan2(targetPos.z - startPos.z, targetPos.x - startPos.x) + Math.PI / 2;
      this.transitCraftGroup.rotation.z = Math.sin(Date.now() * 0.003) * 0.1;

      const distEl = document.getElementById('distToMars');
      if (distEl) {
        const remainingDist = (225.4 * (1 - this.transitProgress)).toFixed(1);
        distEl.textContent = `${remainingDist}M km`;
      }

      const timeEl = document.getElementById('cruiseTime');
      if (timeEl) {
        const elapsedDays = Math.floor(this.transitProgress * 206);
        timeEl.textContent = `DAY ${elapsedDays} / 206`;
      }

      this.transitCamera.position.x = currentX;
      this.transitCamera.position.y = currentY + 6;
      this.transitCamera.position.z = currentZ + 20;
      this.transitCamera.lookAt(currentX, currentY, currentZ);
    }

    if (this.transitRenderer && this.transitScene && this.transitCamera) {
      this.transitRenderer.render(this.transitScene, this.transitCamera);
    }

    // 5. Surface Target Animations
    if (this.targetMeshes['rock']) this.targetMeshes['rock'].rotation.y += 0.01;
    if (this.targetMeshes['soil']) this.targetMeshes['soil'].rotation.y += 0.005;

    if (this.steamParticles) {
      const pos = this.steamParticles.geometry.attributes.position.array;
      for (let i = 1; i < pos.length; i += 3) {
        pos[i] += 0.02;
        if (pos[i] > 3.0) pos[i] = 0;
      }
      this.steamParticles.geometry.attributes.position.needsUpdate = true;
    }

    if (this.surfaceControls) this.surfaceControls.update();
    if (this.surfaceRenderer && this.surfaceScene && this.surfaceCamera) {
      this.surfaceRenderer.render(this.surfaceScene, this.surfaceCamera);
    }
  }
}

// Instantiate background and main 3D engine on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.SpaceBg = new SpaceBackgroundEngine();
  window.Dual3DEngineInstance = new Dual3DEngine();
});