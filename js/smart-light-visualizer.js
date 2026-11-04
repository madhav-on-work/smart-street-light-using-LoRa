/**
 * SmartLightVisualizer - Digital Twin & Canvas Physics Simulation
 * Controls the realistic 2D Street Light Pole, light beam cone, pedestrian walk,
 * Day/Night sky transitions and fault indications in real time.
 */

class SmartLightVisualizer {
  constructor(dataService) {
    this.dataService = dataService;

    // DOM Elements
    this.scene = document.getElementById('vizScene');
    this.stars = document.getElementById('vizStars');
    this.daylight = document.getElementById('vizDaylight');
    this.assembly = document.querySelector('.lamp-assembly');
    this.luminaire = document.querySelector('.lamp-luminaire');
    this.lampBulb = document.getElementById('vizLampBulb');
    this.lightCone = document.getElementById('vizLightCone');
    this.roadSpot = document.getElementById('vizRoadSpot');
    this.pedestrian = document.getElementById('vizPedestrian');
    this.radarRing = document.getElementById('vizRadarRing');
    this.faultBadge = document.getElementById('vizFaultBadge');

    this.lumenVal = document.getElementById('vizLumenVal');
    this.ambientCond = document.getElementById('vizAmbientCond');
    this.powerVal = document.getElementById('vizPowerVal');
    this.twinNode = document.getElementById('lblTwinNode');

    this.attachDataListener();
  }

  attachDataListener() {
    this.dataService.on('telemetry', (node) => {
      this.updateVisuals(node);
    });
    // Keep the pedestrian path correct if the scene is resized
    window.addEventListener('resize', () => {
      this.updateVisuals(this.dataService.getSelectedNode());
    });
  }

  // Horizontal distance (px) from the pedestrian's resting spot to the point directly under the lamp
  walkOffset() {
    if (!this.assembly || !this.luminaire || !this.pedestrian) return -140;
    const lampCenter = this.assembly.offsetLeft + this.luminaire.offsetLeft + this.luminaire.offsetWidth / 2;
    const pedCenter = this.pedestrian.offsetLeft + this.pedestrian.offsetWidth / 2;
    return Math.round(lampCenter - pedCenter);
  }

  faultLabel(node) {
    if (!node.is_online) return 'NODE OFFLINE';
    switch (node.fault) {
      case 'dayburn':     return 'FAULT: LIGHT ON IN DAYLIGHT';
      case 'poweroutage': return 'POWER OUTAGE';
      case 'overcurrent': return 'FAULT: OVERCURRENT';
      case 'lowvoltage':  return 'FAULT: LOW VOLTAGE';
      case 'sensorfail':  return 'FAULT: SENSOR FAILURE';
      case 'lorafail':    return 'FAULT: LoRa LINK LOST';
      default:            return '';
    }
  }

  updateVisuals(node) {
    const isDayburn = node.fault === 'dayburn';
    const isDead = !node.is_online || node.fault === 'poweroutage';
    const isDay = node.ambient_cond === 'DAY';
    const brightness = isDead ? 0 : node.brightness_pct; // 0 - 100
    const motion = node.motion_detected === 1 && !isDead;

    // 0. Fault styling on the whole scene
    if (this.scene) {
      this.scene.classList.toggle('fault-dayburn', isDayburn);
      this.scene.classList.toggle('fault-dead', isDead);
      this.scene.classList.toggle('fault-other', !!node.fault && !isDayburn && !isDead);
    }
    if (this.faultBadge) {
      const label = this.faultLabel(node);
      this.faultBadge.hidden = !label;
      this.faultBadge.textContent = label ? `⚠ ${label}` : '';
    }

    // 1. Sky transition (Day vs Night)
    if (this.stars && this.daylight) {
      if (isDay) {
        this.stars.style.opacity = '0';
        this.daylight.style.opacity = '0.92';
      } else {
        this.stars.style.opacity = '0.85';
        this.daylight.style.opacity = '0';
      }
    }

    // 2. Light cone + road pool: always centred directly under the luminaire (CSS)
    if (this.lightCone && this.roadSpot && this.lampBulb) {
      if (brightness === 0) {
        this.lightCone.style.opacity = '0';
        this.roadSpot.style.opacity = '0';
        this.lampBulb.style.background = '#475569';
        this.lampBulb.style.boxShadow = 'none';
      } else {
        const normalized = brightness / 100;
        // In a day-burn fault the beam is drawn stronger so it stays visible against the bright sky
        const beamAlpha = (isDayburn ? 0.85 : 0.2 + normalized * 0.65).toFixed(2);
        const spotAlpha = (isDayburn ? 0.85 : 0.25 + normalized * 0.6).toFixed(2);

        this.lightCone.style.opacity = '1';
        this.lightCone.style.setProperty('--beam-opacity', beamAlpha);
        this.roadSpot.style.opacity = '1';
        this.roadSpot.style.setProperty('--spot-opacity', spotAlpha);

        // Keep horizontal centering (translateX(-50%)) while scaling width
        const scaleX = (0.8 + normalized * 0.35).toFixed(2);
        this.lightCone.style.transform = `translateX(-50%) scaleX(${scaleX})`;
        this.roadSpot.style.transform = `translateX(-50%) scaleX(${scaleX})`;

        if (isDayburn) {
          this.lampBulb.style.background = '#ffd0c8';
          this.lampBulb.style.boxShadow = '0 0 14px #ff5a4a, 0 0 30px rgba(255, 90, 74, 0.8)';
        } else if (brightness <= 30 && !isDay) {
          // Warm white at 30%
          this.lampBulb.style.background = '#fef08a';
          this.lampBulb.style.boxShadow = '0 0 12px #fef08a, 0 0 20px rgba(254, 240, 138, 0.4)';
        } else {
          this.lampBulb.style.background = '#ffffff';
          this.lampBulb.style.boxShadow = '0 0 20px #ffffff, 0 0 35px #00e5ff';
        }
      }
    }

    // 3. Pedestrian walks to the spot directly under the lamp
    if (this.pedestrian && this.radarRing) {
      if (motion) {
        this.pedestrian.style.opacity = '1';
        this.radarRing.style.display = 'block';
        this.pedestrian.style.transform = `translateX(${this.walkOffset()}px)`;
      } else {
        this.pedestrian.style.opacity = '0.35';
        this.radarRing.style.display = 'none';
        this.pedestrian.style.transform = 'translateX(0px)';
      }
    }

    // 4. Telemetry Overlay
    if (this.lumenVal) {
      const lumens = Math.round((brightness / 100) * 3500);
      this.lumenVal.textContent = brightness === 0 ? '0 lm (OFF)' : `${lumens.toLocaleString()} lm`;
    }
    if (this.ambientCond) {
      if (isDayburn) {
        this.ambientCond.textContent = 'Daylight (FAULT: LIGHT ON!)';
        this.ambientCond.style.color = 'var(--status-critical)';
      } else if (isDead) {
        this.ambientCond.textContent = !node.is_online ? 'Node offline' : 'Power outage';
        this.ambientCond.style.color = 'var(--status-critical)';
      } else {
        this.ambientCond.textContent = isDay ? 'Daylight (Sun)' : 'Night (Dark)';
        this.ambientCond.style.color = '#ffffff';
      }
    }
    if (this.powerVal) {
      this.powerVal.textContent = `${node.power_w.toFixed(2)} W`;
    }
    if (this.twinNode) {
      this.twinNode.textContent = `${node.name} • ${node.location}`;
    }
  }
}

window.SmartLightVisualizer = SmartLightVisualizer;
