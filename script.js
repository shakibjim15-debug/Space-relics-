/**
 * NASA Space Relics - Mission Controller & Interactive Telemetry Engine
 */

import { SPIRIT_MISSION_DATA } from './data/missions.js';

class SoundEffects {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playBeep(freq = 600, duration = 0.08) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio fallback
    }
  }
}

class GameAudioEngine {
  constructor() {
    this.ctx = null;
    this.motorOsc = null;
    this.motorGain = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playMotorSound(isMoving) {
    this.init();
    if (!this.motorOsc) {
      this.motorOsc = this.ctx.createOscillator();
      this.motorGain = this.ctx.createGain();
      this.motorOsc.type = 'sawtooth';
      this.motorOsc.frequency.setValueAtTime(60, this.ctx.currentTime);
      this.motorGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.motorOsc.connect(this.motorGain);
      this.motorGain.connect(this.ctx.destination);
      this.motorOsc.start();
    }
    
    this.motorGain.gain.setTargetAtTime(isMoving ? 0.05 : 0, this.ctx.currentTime, 0.1);
  }
}

class RoverDriveControls {
  constructor(socket) {
    this.socket = socket;
    this.keys = { KeyW: false, KeyS: false, KeyA: false, KeyD: false };
    window.addEventListener('keydown', (e) => this.handleKey(e, true));
    window.addEventListener('keyup', (e) => this.handleKey(e, false));
  }

  handleKey(e, isPressed) {
    if (this.keys.hasOwnProperty(e.code)) {
      this.keys[e.code] = isPressed;
      this.updateDriveState();
    }
  }

  updateDriveState() {
    let forward = (this.keys.KeyW ? 1 : 0) - (this.keys.KeyS ? 1 : 0);
    let turn = (this.keys.KeyA ? -1 : 0) + (this.keys.KeyD ? 1 : 0);

    if (this.socket) {
      this.socket.emit('rover_drive_input', { forward, turn });
    }

    if (window.AudioEngine) {
      window.AudioEngine.playMotorSound(forward !== 0 || turn !== 0);
    }
  }
}

class MissionController {
  constructor() {
    this.state = {
      energy: 100,
      activeScreen: 'homeScreen',
      currentTarget: null,
      activeSystems: new Set(),
      totalSystems: 5,
      launchTimerHandle: null,
      transitTimerHandle: null,
      activeDiscovery: null
    };

    this.stageNames = {
      homeScreen: 'Mission Control',
      solarScreen: 'Solar System Navigation',
      marsScreen: 'Mars Target Selection',
      briefingScreen: 'Mission Briefing',
      assemblyScreen: 'Subsystem Assembly',
      launchScreen: 'Launch Dynamics',
      transitScreen: 'Interplanetary Cruise',
      landingScreen: 'Mars Landing (EDL)',
      exploreScreen: 'Surface Exploration',
      decisionScreen: 'Tactical Operations',
      scienceScreen: 'Data Analysis',
      historyScreen: 'NASA Archives',
      finishScreen: 'Mission Debrief'
    };

    this.sfx = new SoundEffects();
    this.socket = null;
    this.driveControls = null;
    this.init();
  }

  init() {
    this.bindEvents();
    this.initSocketConnection();
    this.renderTimeline();
    this.updateEnergyUI();
    this.updateStageUI(this.stageNames[this.state.activeScreen]);
  }

  initSocketConnection() {
    if (typeof io === 'undefined') {
      console.warn('[SocketIO]: Running in local mode.');
      return;
    }

    this.socket = io('http://localhost:5000');
    this.driveControls = new RoverDriveControls(this.socket);

    this.socket.on('connect', () => {
      this.logTerminal('Connected to Python Telemetry Server [PORT 5000]');
    });

    this.socket.on('telemetry_update', (telemetry) => {
      this.state.energy = Math.round(telemetry.battery);
      this.updateEnergyUI();

      const tempEl = document.getElementById('motorTemp');
      if (tempEl) tempEl.textContent = `🌡️ Motor: ${telemetry.motor_temp.toFixed(1)}°C`;

      const solarEl = document.getElementById('solarOutput');
      if (solarEl) solarEl.textContent = `☀️ Solar: ${telemetry.solar_output}W`;

      if (document.getElementById('launchVelocity')) {
        document.getElementById('launchVelocity').textContent = telemetry.launch_velocity ? telemetry.launch_velocity.toFixed(1) : '0.0';
        document.getElementById('launchAltitude').textContent = telemetry.launch_altitude ? telemetry.launch_altitude.toFixed(2) : '0.00';
        document.getElementById('launchGForce').textContent = telemetry.launch_g_force ? telemetry.launch_g_force.toFixed(2) : '1.00';
        document.getElementById('launchThrust').textContent = telemetry.launch_thrust ? telemetry.launch_thrust.toFixed(1) : '0.0';
      }

      if (document.getElementById('landingVelocity')) {
        document.getElementById('landingVelocity').textContent = telemetry.landing_velocity ? telemetry.landing_velocity.toFixed(1) : '5500.0';
        document.getElementById('landingAltitude').textContent = telemetry.landing_altitude ? telemetry.landing_altitude.toFixed(2) : '125.00';
        document.getElementById('heatshieldTemp').textContent = telemetry.heatshield_temp ? telemetry.heatshield_temp.toFixed(1) : '20.0';
        document.getElementById('parachuteStatus').textContent = telemetry.parachute_deployed ? 'DEPLOYED' : 'STOWED';
      }

      if (window.Dual3DEngineInstance && window.Dual3DEngineInstance.updateLandingVisuals) {
        window.Dual3DEngineInstance.updateLandingVisuals(telemetry);
      }

      this.updateBar('bar1', 'val1', telemetry.spectrometer_progress);
      this.updateBar('bar2', 'val2', telemetry.thermal_data_progress);
      this.updateBar('bar3', 'val3', telemetry.dsn_telemetry_progress);
    });
  }

  updateBar(barId, valId, value) {
    const bar = document.getElementById(barId);
    const val = document.getElementById(valId);
    if (bar) bar.style.width = `${value}%`;
    if (val) val.textContent = `${value}%`;
  }

  bindEvents() {
    document.addEventListener('click', (e) => {
      this.sfx.init();
      if (window.AudioEngine) window.AudioEngine.init();

      const target = e.target.closest('[data-action], [data-system], [data-target], [data-mission-action], #closeModalBtn, #viewArchivePhotoBtn');
      if (!target) return;

      this.sfx.playBeep(800, 0.05);

      if (target.id === 'closeModalBtn') this.hideModal();
      if (target.id === 'viewArchivePhotoBtn') this.showModalForActiveDiscovery();

      if (target.dataset.action) this.handleAction(target.dataset.action);
      if (target.dataset.system) this.activateSystem(target.dataset.system, target);
      if (target.dataset.target) this.chooseTarget(target.dataset.target);
      if (target.dataset.missionAction) this.executeMissionAction(target.dataset.missionAction);
    });
  }

  renderTimeline() {
    const container = document.getElementById('milestoneTimeline');
    if (!container) return;

    container.innerHTML = SPIRIT_MISSION_DATA.milestones
      .map(m => `
        <div class="milestone-item">
          <div class="milestone-date">📅 ${m.date}</div>
          <strong>${m.title}</strong>
          <p style="font-size:0.82rem; color:var(--text-muted); margin-top:4px; line-height:1.4;">${m.description}</p>
        </div>
      `).join('');
  }

  logTerminal(msg) {
    const term = document.getElementById('terminalLog');
    if (!term) return;
    const time = new Date().toTimeString().split(' ')[0];
    const line = document.createElement('div');
    line.textContent = `[${time}] ${msg}`;
    term.appendChild(line);
    term.scrollTop = term.scrollHeight;
  }

  showScreen(screenId) {
    const currentScreen = document.getElementById(this.state.activeScreen);
    const targetScreen = document.getElementById(screenId);

    if (!targetScreen) return;

    if (currentScreen) currentScreen.classList.remove('active');
    targetScreen.classList.add('active');

    this.state.activeScreen = screenId;
    this.updateStageUI(this.stageNames[screenId] || 'Active Operation');

    window.dispatchEvent(new CustomEvent('screenTransition', { detail: { screenId } }));
  }

  handleAction(action) {
    switch (action) {
      case 'startMission': this.showScreen('solarScreen'); break;
      case 'openMars': this.showScreen('marsScreen'); break;
      case 'openBriefing': this.showScreen('briefingScreen'); break;
      case 'openAssembly': this.resetAssemblyState(); this.showScreen('assemblyScreen'); break;
      case 'launchMission': this.executeLaunchSequence(); break;
      case 'skipTransit': 
        if (this.state.transitTimerHandle) clearTimeout(this.state.transitTimerHandle);
        this.executeLandingSequence(); 
        break;
      case 'unlockHistory': this.showScreen('historyScreen'); break;
      case 'finishMission': this.showScreen('finishScreen'); break;
      case 'resetGame': this.resetFullState(); break;
      case 'resetCamera': 
        if (window.resetRoverCamera) window.resetRoverCamera(); 
        break;
    }
  }

  activateSystem(systemName, buttonEl) {
    if (this.state.activeSystems.has(systemName)) return;

    this.state.activeSystems.add(systemName);
    buttonEl.classList.add('activated');

    if (window.triggerSystem3DFX) {
      window.triggerSystem3DFX(systemName);
    }

    const instData = SPIRIT_MISSION_DATA.instruments.find(i => i.id === systemName || i.id === 'pancam');
    const msgEl = document.getElementById('buildMessage');
    
    if (msgEl) {
      if (instData) {
        msgEl.innerHTML = `<span style="color:#38bdf8;">${instData.name.toUpperCase()} ONLINE</span><br/><small style="color:#94a3b8; font-size:0.75rem;">${instData.educationalInsight}</small>`;
      } else {
        msgEl.textContent = `${systemName.toUpperCase()} ONLINE`;
        msgEl.style.color = '#38bdf8';
      }
    }

    if (this.state.activeSystems.size === this.state.totalSystems) {
      if (msgEl) {
        msgEl.innerHTML = '<span style="color:#4ade80;">ALL SUBSYSTEMS INTEGRATED — SPIRIT READY FOR LAUNCH</span>';
      }
      const launchBtn = document.getElementById('launchButton');
      if (launchBtn) launchBtn.classList.remove('hidden');
    }
  }

  resetAssemblyState() {
    this.state.activeSystems.clear();
    document.querySelectorAll('.system').forEach(btn => btn.classList.remove('activated'));
    
    const launchBtn = document.getElementById('launchButton');
    if (launchBtn) launchBtn.classList.add('hidden');

    const msgEl = document.getElementById('buildMessage');
    if (msgEl) {
      msgEl.textContent = 'SYSTEMS OFFLINE';
      msgEl.style.color = '#fbbf24';
    }
  }

  executeLaunchSequence() {
    this.showScreen('launchScreen');
    let count = 3;

    const countdownEl = document.getElementById('countdown');
    const msgEl = document.getElementById('launchMessage');

    if (countdownEl) countdownEl.textContent = count;
    if (msgEl) msgEl.textContent = 'Preparing Delta II booster ignition...';

    if (this.state.launchTimerHandle) clearInterval(this.state.launchTimerHandle);

    this.state.launchTimerHandle = setInterval(() => {
      count--;
      this.sfx.playBeep(400 + (3 - count) * 200, 0.1);
      if (countdownEl) countdownEl.textContent = count;

      if (count <= 0) {
        clearInterval(this.state.launchTimerHandle);
        if (countdownEl) countdownEl.textContent = '🚀';
        if (msgEl) msgEl.textContent = 'Stage 1 Ignition - Trans-Mars Injection Vector Established!';

        if (this.socket) {
          this.socket.emit('start_launch_physics');
        }

        setTimeout(() => {
          this.executeTransitSequence();
        }, 5000);
      }
    }, 1000);
  }

  executeTransitSequence() {
    this.showScreen('transitScreen');
    if (window.Dual3DEngineInstance && window.Dual3DEngineInstance.startSpacecraftFlightAnimation) {
      window.Dual3DEngineInstance.startSpacecraftFlightAnimation();
    }

    if (this.state.transitTimerHandle) clearTimeout(this.state.transitTimerHandle);
    this.state.transitTimerHandle = setTimeout(() => {
      this.executeLandingSequence();
    }, 6000);
  }

  executeLandingSequence() {
    this.showScreen('landingScreen');
    const msgEl = document.getElementById('landingMessage');
    if (msgEl) msgEl.textContent = 'Entering atmospheric entry corridor...';

    if (this.socket) {
      this.socket.emit('start_landing_physics');
    }

    setTimeout(() => {
      if (msgEl) msgEl.textContent = 'Touchdown Confirmed at Gusev Crater!';
      setTimeout(() => {
        this.showScreen('exploreScreen');
      }, 2000);
    }, 10000);
  }

  chooseTarget(targetId) {
    const targetObj = SPIRIT_MISSION_DATA.targets.find(t => t.id === targetId);
    this.state.currentTarget = targetObj || { id: targetId, name: targetId, description: 'Target acquired.' };
    
    // Smooth Camera Pan in 3D Viewport
    if (window.focusSurfaceTarget) {
      window.focusSurfaceTarget(targetId);
    }

    const msgEl = document.getElementById('targetMessage');
    if (msgEl) msgEl.textContent = `Target Locked: ${this.state.currentTarget.name} [Sol ${this.state.currentTarget.sol || 'N/A'}]`;

    setTimeout(() => {
      this.showScreen('decisionScreen');
    }, 1200);
  }

  executeMissionAction(action) {
    if (this.socket) {
      this.socket.emit('execute_action', { action });
    }

    const currentTarget = this.state.currentTarget;
    if (currentTarget && currentTarget.verifiedFindings) {
      this.state.activeDiscovery = currentTarget;
      this.displayVerifiedDiscovery(currentTarget);
    }

    this.logTerminal(`Downlinking PDS Packet: ${action.toUpperCase()} on target ${currentTarget ? currentTarget.name : 'Unknown'}`);
    this.showScreen('scienceScreen');
  }

  displayVerifiedDiscovery(target) {
    const card = document.getElementById('verifiedDiscoveryCard');
    const title = document.getElementById('discoveryTitle');
    const body = document.getElementById('discoveryBody');

    if (card && title && body) {
      title.innerHTML = `🔬 NASA Verified Discovery: <span style="color:#fbbf24">${target.name}</span>`;
      body.innerHTML = `
        <p><strong>PDS Dataset ID:</strong> <code>${target.datasetId || 'PDS_MER1_SCIENCE'}</code></p>
        <p style="margin-top:8px; line-height:1.5;">${target.verifiedFindings}</p>
      `;
      card.classList.remove('hidden');
    }
  }

  showModalForActiveDiscovery() {
    const target = this.state.activeDiscovery;
    if (!target || !target.imageUrl) return;

    const modal = document.getElementById('nasaPhotoModal');
    const img = document.getElementById('modalImg');
    const caption = document.getElementById('modalCaption');
    const title = document.getElementById('modalPhotoTitle');
    const link = document.getElementById('modalProvenanceLink');

    if (modal && img && caption && title && link) {
      img.src = target.imageUrl;
      caption.innerHTML = `
        <strong>Target:</strong> ${target.name} (Sol ${target.sol})<br/>
        <strong>Caption:</strong> ${target.caption || target.description}<br/>
        <strong>NASA Provenance ID:</strong> <code>${target.datasetId || 'NASA_JPL_PHOTOJOURNAL'}</code>
      `;
      title.textContent = `NASA JPL Photojournal Archive — ${target.name}`;
      link.href = target.provenanceUrl || '#';
      modal.classList.remove('hidden');
    }
  }

  hideModal() {
    const modal = document.getElementById('nasaPhotoModal');
    if (modal) modal.classList.add('hidden');
  }

  updateEnergyUI() {
    const energyEl = document.getElementById('energy');
    if (energyEl) energyEl.textContent = `⚡ Energy: ${this.state.energy}%`;
  }

  updateStageUI(text) {
    const stageEl = document.getElementById('stageText');
    if (stageEl) stageEl.textContent = text;
  }

  resetFullState() {
    if (this.socket) {
      this.socket.emit('reset_state');
    }

    const discoveryCard = document.getElementById('verifiedDiscoveryCard');
    if (discoveryCard) discoveryCard.classList.add('hidden');

    this.resetAssemblyState();
    this.showScreen('homeScreen');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.AudioEngine = new GameAudioEngine();
  window.AppController = new MissionController();
});