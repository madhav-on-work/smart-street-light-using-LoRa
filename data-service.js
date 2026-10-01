/**
 * DataService - Telemetry & Hardware Communication Layer
 * LoRa-Based Smart Street Light Automation Node & Gateway
 * 
 * Supports:
 * 1. Realistic Multi-Node IoT Simulation Engine (for viva, demo & offline mode)
 * 2. Real ESP32 Gateway WebSocket Connection (ws://<ip>:81/ws)
 * 3. Real ESP32 Gateway HTTP REST Polling (http://<ip>/api/telemetry)
 */

// Simulation tuning ---------------------------------------------------------
const SIM_STEP_MS = 1500;        // one telemetry packet every 1.5 s
const HISTORY_MAX = 2400;        // 1 hour of samples per node (1.5 s each)
// Energy is integrated with this time acceleration so the kWh curve visibly
// moves during a demo (1 real second counts as ENERGY_TIME_SCALE seconds).
// Set to 1 for strictly real-time integration.
const ENERGY_TIME_SCALE = 30;
const OUTAGE_SECONDS = 6;        // simulated grid outage length
const OFFLINE_SECONDS = 15;      // simulated node disconnect length

class DataService {
  constructor() {
    this.connectionMode = 'sim'; // 'sim', 'ws', 'http'
    this.gatewayIp = '192.168.1.150';
    this.gatewayPort = 81;
    this.pollInterval = 1500;
    this.ws = null;
    this.pollTimer = null;
    this.runtimeTimer = null;
    this.isGatewayOnline = true;

    // Listeners
    this.listeners = {
      telemetry: [],
      alert: [],
      gatewayStatus: [],
      nodeListChange: [],
      runtimeTick: [],
      nodesUpdate: [],
      selectionChange: []
    };

    // Node registry
    this.nodes = {
      N1: {
        id: 'N1',
        name: 'Node N1 (Pole #101)',
        location: 'Crossroad Sector 4',
        channel: '868.100 MHz (SF7)',
        voltage: 4.98,
        current_ma: 320,
        power_w: 1.59,
        energy_kwh: 0.024,
        light_status: 1, // 1 = ON, 0 = OFF
        brightness_pct: 70,
        motion_detected: 1,
        motion_timer: 8, // seconds remaining
        ldr_raw: 382,
        ldr_lux: 14.2,
        ambient_cond: 'NIGHT', // 'DAY', 'DUSK', 'NIGHT'
        lora_rssi: -74,
        lora_snr: 8.5,
        packet_count: 1482,
        packets_lost: 2,
        last_packet_time: new Date(),
        uptime_seconds: 67335,
        is_online: true,
        fault: null, // 'overcurrent', 'lowvoltage', 'sensorfail', 'dayburn', 'poweroutage', 'nodeoffline', 'lorafail'
        pir_triggers: 42,
        outage_seconds: 0,
        offline_seconds: 0
      },
      N2: {
        id: 'N2',
        name: 'Node N2 (Pole #102)',
        location: 'Traffic Junction B',
        channel: '868.100 MHz (SF7)',
        voltage: 5.01,
        current_ma: 140,
        power_w: 0.70,
        energy_kwh: 0.018,
        light_status: 1,
        brightness_pct: 30,
        motion_detected: 0,
        motion_timer: 0,
        ldr_raw: 410,
        ldr_lux: 11.5,
        ambient_cond: 'NIGHT',
        lora_rssi: -79,
        lora_snr: 7.2,
        packet_count: 1475,
        packets_lost: 3,
        last_packet_time: new Date(),
        uptime_seconds: 67200,
        is_online: true,
        fault: null,
        pir_triggers: 17,
        outage_seconds: 0,
        offline_seconds: 0
      },
      N3: {
        id: 'N3',
        name: 'Node N3 (Pole #103)',
        location: 'North Boulevard',
        channel: '868.100 MHz (SF7)',
        voltage: 4.95,
        current_ma: 135,
        power_w: 0.67,
        energy_kwh: 0.016,
        light_status: 1,
        brightness_pct: 30,
        motion_detected: 0,
        motion_timer: 0,
        ldr_raw: 395,
        ldr_lux: 12.8,
        ambient_cond: 'NIGHT',
        lora_rssi: -82,
        lora_snr: 6.8,
        packet_count: 1468,
        packets_lost: 4,
        last_packet_time: new Date(),
        uptime_seconds: 67100,
        is_online: true,
        fault: null,
        pir_triggers: 9,
        outage_seconds: 0,
        offline_seconds: 0
      },
      N4: {
        id: 'N4',
        name: 'Node N4 (Pole #104)',
        location: 'Highway Connector',
        channel: '868.100 MHz (SF7)',
        voltage: 5.02,
        current_ma: 480,
        power_w: 2.41,
        energy_kwh: 0.029,
        light_status: 1,
        brightness_pct: 100,
        motion_detected: 1,
        motion_timer: 6,
        ldr_raw: 350,
        ldr_lux: 9.8,
        ambient_cond: 'NIGHT',
        lora_rssi: -71,
        lora_snr: 9.2,
        packet_count: 1490,
        packets_lost: 1,
        last_packet_time: new Date(),
        uptime_seconds: 67450,
        is_online: true,
        fault: null,
        pir_triggers: 31,
        outage_seconds: 0,
        offline_seconds: 0
      }
    };

    this.selectedNodeId = 'N1';
    this.isMasterOverride = false;
    this.overrideBrightness = 70;
    this.forceDaytime = false;

    // Per-node rolling history for the charts (so every node keeps its own curves)
    this.histories = {};
    Object.values(this.nodes).forEach(n => this._createHistory(n));

    // Start simulation loops
    this.startSimulation();
    this.startRuntimeTicker();
  }

  // ======================================================================
  // History (per node)
  // ======================================================================
  get history() {
    return this.histories[this.selectedNodeId] || this.histories[Object.keys(this.nodes)[0]];
  }

  _timeLabel(d) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // Pre-seed 30 samples so a node's charts start populated
  _createHistory(node) {
    const h = { labels: [], voltage: [], current: [], power: [], brightness: [], ldr: [], energy: [] };
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      h.labels.push(this._timeLabel(new Date(now - i * SIM_STEP_MS)));
      const v = parseFloat((node.voltage + (Math.random() * 0.06 - 0.03)).toFixed(2));
      const c = Math.max(0, Math.round(node.current_ma + (Math.random() * 10 - 5)));
      h.voltage.push(v);
      h.current.push(c);
      h.power.push(parseFloat(((v * c) / 1000).toFixed(2)));
      h.brightness.push(node.brightness_pct);
      h.ldr.push(Math.max(0, parseFloat((node.ldr_lux + (Math.random() * 2 - 1)).toFixed(1))));
      h.energy.push(Math.max(0, parseFloat((node.energy_kwh - i * 0.00002).toFixed(6))));
    }
    this.histories[node.id] = h;
  }

  _pushHistory(node, label) {
    if (!this.histories[node.id]) this._createHistory(node);
    const h = this.histories[node.id];
    h.labels.push(label || this._timeLabel(new Date()));
    h.voltage.push(node.voltage);
    h.current.push(node.current_ma);
    h.power.push(node.power_w);
    h.brightness.push(node.brightness_pct);
    h.ldr.push(node.ldr_lux > 0 ? node.ldr_lux : 0);
    h.energy.push(parseFloat(node.energy_kwh.toFixed(6)));
    while (h.labels.length > HISTORY_MAX) {
      Object.keys(h).forEach(k => h[k].shift());
    }
  }

  // Average / peak power over the node's recorded history
  getPowerStats(nodeId) {
    const h = this.histories[nodeId || this.selectedNodeId];
    if (!h || h.power.length === 0) return { avg: 0, peak: 0 };
    const sum = h.power.reduce((a, b) => a + b, 0);
    return { avg: sum / h.power.length, peak: Math.max(...h.power) };
  }

  // Format seconds to HH:MM:SS
  formatHHMMSS(totalSeconds) {
    const sec = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(sec / 3600).toString().padStart(2, '0');
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  // ======================================================================
  // 1-second ticker: LIVE runtime, PIR hold countdown, outage/offline recovery
  // ======================================================================
  startRuntimeTicker() {
    if (this.runtimeTimer) clearInterval(this.runtimeTimer);
    this.runtimeTimer = setInterval(() => {
      const active = this.getSelectedNode();
      let activeMotionEnded = false;
      let meshChanged = false;

      Object.values(this.nodes).forEach(n => {
        // --- Power outage: runtime is held at 0 until the grid comes back ---
        if (n.fault === 'poweroutage') {
          n.uptime_seconds = 0;
          n.outage_seconds -= 1;
          if (n.outage_seconds <= 0) {
            this._restorePower(n);
            meshChanged = true;
            if (n === active) activeMotionEnded = true; // forces a telemetry refresh
          }
          return;
        }

        // --- Node disconnected: waits, then re-joins the LoRa network ---
        if (!n.is_online) {
          n.offline_seconds -= 1;
          if (n.offline_seconds <= 0) {
            this._reconnectNode(n);
            meshChanged = true;
            if (n === active) activeMotionEnded = true;
          }
          return;
        }

        // --- Live runtime ---
        n.uptime_seconds += 1;

        // --- PIR hold countdown (true 1-second resolution) ---
        if (n.motion_timer > 0) {
          n.motion_timer -= 1;
          if (n.motion_timer <= 0) {
            n.motion_timer = 0;
            n.motion_detected = 0;
            this._stepNode(n, new Date());
            meshChanged = true;
            if (n === active) activeMotionEnded = true;
          }
        }
      });

      this.emit('runtimeTick', {
        node_id: active.id,
        seconds: active.uptime_seconds,
        formatted: this.formatHHMMSS(active.uptime_seconds),
        motion_detected: active.motion_detected,
        motion_timer: active.motion_timer,
        fault: active.fault,
        is_online: active.is_online
      });
      if (meshChanged) this.emit('nodesUpdate', this.getAllNodes());
      if (activeMotionEnded) this.emit('telemetry', active);
    }, 1000);
  }

  _restorePower(node) {
    node.fault = null;
    node.outage_seconds = 0;
    node.uptime_seconds = 0; // runtime restarts from zero after every outage
    this._stepNode(node, new Date());
    this.emit('alert', {
      id: Date.now(),
      type: 'normal',
      title: `POWER RESTORED (${node.id})`,
      message: `Grid supply is back on ${node.name}. Controller rebooted and system runtime restarted from 00:00:00.`,
      time: new Date().toLocaleTimeString()
    });
  }

  _reconnectNode(node) {
    node.fault = null;
    node.is_online = true;
    node.offline_seconds = 0;
    node.uptime_seconds = 0;
    this._stepNode(node, new Date());
    this.emit('alert', {
      id: Date.now(),
      type: 'normal',
      title: `NODE ${node.id} RECONNECTED`,
      message: `LoRa heartbeat re-established with ${node.location}. Node uptime restarted from 00:00:00.`,
      time: new Date().toLocaleTimeString()
    });
  }

  // Clear every injected fault and bring all nodes back to normal
  clearFaults() {
    Object.values(this.nodes).forEach(n => {
      if (n.fault || !n.is_online) {
        n.fault = null;
        n.is_online = true;
        n.outage_seconds = 0;
        n.offline_seconds = 0;
        this._stepNode(n, new Date());
      }
    });
    this.emit('nodesUpdate', this.getAllNodes());
    this.emit('telemetry', this.getSelectedNode());
  }

  // Event Subscription
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  // Set active target node
  setSelectedNode(nodeId) {
    if (!this.nodes[nodeId]) return;
    this.selectedNodeId = nodeId;
    this.emit('selectionChange', this.nodes[nodeId]);
    this.emit('telemetry', this.nodes[nodeId]);
    this.emit('runtimeTick', {
      node_id: nodeId,
      seconds: this.nodes[nodeId].uptime_seconds,
      formatted: this.formatHHMMSS(this.nodes[nodeId].uptime_seconds),
      motion_detected: this.nodes[nodeId].motion_detected,
      motion_timer: this.nodes[nodeId].motion_timer,
      fault: this.nodes[nodeId].fault,
      is_online: this.nodes[nodeId].is_online
    });
  }

  getSelectedNode() {
    return this.nodes[this.selectedNodeId] || this.nodes['N1'];
  }

  getAllNodes() {
    return Object.values(this.nodes);
  }

  // Register a new node dynamically (N5, N6...)
  addNode(nodeId, location, channel) {
    if (this.nodes[nodeId]) {
      return false; // already exists
    }
    this.nodes[nodeId] = {
      id: nodeId,
      name: `Node ${nodeId}`,
      location: location || `Pole #${nodeId}`,
      channel: channel || '868.100 MHz (SF7)',
      voltage: 4.99,
      current_ma: 140,
      power_w: 0.70,
      energy_kwh: 0.012,
      light_status: 1,
      brightness_pct: 30,
      motion_detected: 0,
      motion_timer: 0,
      ldr_raw: 400,
      ldr_lux: 12.0,
      ambient_cond: 'NIGHT',
      lora_rssi: -75,
      lora_snr: 8.0,
      packet_count: 100,
      packets_lost: 0,
      last_packet_time: new Date(),
      uptime_seconds: 12000,
      is_online: true,
      fault: null,
      pir_triggers: 0,
      outage_seconds: 0,
      offline_seconds: 0
    };
    this._createHistory(this.nodes[nodeId]);
    this.emit('nodeListChange', this.getAllNodes());
    return true;
  }

  // Smart Light Logic Engine (Autonomous State Machine)
  evaluateLightLogic(node) {
    // 1. Check for Dayburn Anomaly Fault First
    if (node.fault === 'dayburn') {
      node.ambient_cond = 'DAY';
      node.ldr_lux = parseFloat((460 + Math.random() * 40).toFixed(1));
      node.light_status = 1; // Unusually ON in broad daylight!
      node.brightness_pct = 100;
      return 'FAULT_DAYBURN';
    }

    if (this.isMasterOverride) {
      // Manual Override Active
      node.light_status = this.overrideBrightness > 0 ? 1 : 0;
      node.brightness_pct = this.overrideBrightness;
      return 'MANUAL_OVERRIDE';
    }

    // Daylight Detection (LDR Lux check)
    if (this.forceDaytime || node.ambient_cond === 'DAY' || node.ldr_lux > 150) {
      // Mode 1: DAY -> Light OFF
      node.light_status = 0;
      node.brightness_pct = 0;
      return 'DAY_OFF';
    }

    // Night Time Logic
    if (node.motion_detected === 1) {
      // Mode 2: NIGHT + MOTION -> 100% Brightness (Safety output)
      node.light_status = 1;
      node.brightness_pct = 100;
      return 'NIGHT_MOTION';
    } else {
      // Mode 3: NIGHT + NO MOTION -> 30% Brightness (Eco adaptive dimming)
      node.light_status = 1;
      node.brightness_pct = 30;
      return 'NIGHT_NO_MOTION';
    }
  }

  // Run one simulation step for a single node (sensors -> logic -> electrical)
  _stepNode(node, now) {
    if (!node.is_online) return;

    // Ambient light: faults vs forced daytime vs natural night
    if (node.fault === 'dayburn') {
      node.ambient_cond = 'DAY';
      node.ldr_lux = parseFloat((460 + Math.random() * 40).toFixed(1));
      node.ldr_raw = Math.round(3000 + Math.random() * 100);
    } else if (this.forceDaytime) {
      node.ambient_cond = 'DAY';
      node.ldr_lux = parseFloat((450 + Math.random() * 50).toFixed(1));
      node.ldr_raw = Math.round(2900 + Math.random() * 150);
    } else {
      node.ambient_cond = 'NIGHT';
      node.ldr_lux = parseFloat((12.0 + Math.random() * 3.5).toFixed(1));
      node.ldr_raw = Math.round(370 + Math.random() * 30);
    }

    // Embedded decision logic
    this.evaluateLightLogic(node);

    // Electrical model + fault overrides
    if (node.fault === 'overcurrent') {
      node.voltage = parseFloat((4.96 + Math.random() * 0.06).toFixed(2));
      node.current_ma = 920; // Critical overcurrent
    } else if (node.fault === 'lowvoltage') {
      node.voltage = 3.95; // Critical undervoltage
    } else if (node.fault === 'poweroutage') {
      node.voltage = 0.0;
      node.current_ma = 0;
      node.power_w = 0.0;
      node.light_status = 0;
      node.brightness_pct = 0;
    } else if (node.fault === 'sensorfail') {
      node.voltage = 0.0;
      node.current_ma = 0;
      node.ldr_lux = 0;
    } else if (node.fault === 'dayburn') {
      node.voltage = parseFloat((4.96 + Math.random() * 0.06).toFixed(2));
      node.current_ma = Math.round(480 + Math.random() * 15);
    } else {
      // Normal physics: current follows PWM duty
      // 0% => ~15 mA (ESP32 + sensors), 30% => 135-145 mA, 100% => 460-490 mA
      node.voltage = parseFloat((4.96 + Math.random() * 0.06).toFixed(2));
      const baseCurrent = 15;
      const ledCurrent = (node.brightness_pct / 100) * 460;
      node.current_ma = Math.round(baseCurrent + ledCurrent + (Math.random() * 10 - 5));
    }

    // Instantaneous Power: P = (V * I) / 1000
    node.power_w = parseFloat(((node.voltage * node.current_ma) / 1000).toFixed(2));

    // Cumulative Energy: E += P * dt. Kept at full precision (rounding to 4 d.p. used to
    // swallow every increment) and time-accelerated so the curve moves during a demo.
    const dtHours = (SIM_STEP_MS / 1000) * ENERGY_TIME_SCALE / 3600;
    node.energy_kwh += (node.power_w * dtHours) / 1000;

    // LoRa link
    node.packet_count += 1;
    if (node.fault === 'lorafail') {
      node.lora_rssi = Math.round(-112 - Math.random() * 6);
      node.lora_snr = parseFloat((-6.5 + Math.random()).toFixed(1));
      node.packets_lost += 1;
    } else {
      node.lora_rssi = Math.round(-72 - Math.random() * 6);
      node.lora_snr = parseFloat((8.0 + (Math.random() * 1.5 - 0.7)).toFixed(1));
    }
    node.last_packet_time = now;
  }

  // Simulation step running periodically for ALL nodes
  simulationStep() {
    const now = new Date();
    const label = this._timeLabel(now);

    Object.values(this.nodes).forEach(node => {
      if (!node.is_online) return;
      this._stepNode(node, now);
      this._pushHistory(node, label);
    });

    this.emit('nodesUpdate', this.getAllNodes());
    this.emit('telemetry', this.getSelectedNode());
  }

  startSimulation() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => {
      this.simulationStep();
    }, SIM_STEP_MS);
  }

  // Interactive demo actions
  triggerMotion(seconds = 10) {
    const node = this.getSelectedNode();
    if (!node.is_online || node.fault === 'poweroutage') return;
    if (node.motion_detected !== 1) node.pir_triggers += 1; // count rising edges only
    node.motion_detected = 1;
    node.motion_timer = seconds;
    this._stepNode(node, new Date());
    this.emit('nodesUpdate', this.getAllNodes());
    this.emit('telemetry', node);
  }

  toggleDayNight() {
    this.forceDaytime = !this.forceDaytime;
    const node = this.getSelectedNode();
    // If Dayburn fault was active, clear it when toggling day/night manually
    if (node.fault === 'dayburn') {
      node.fault = null;
    }
    this._stepNode(node, new Date());
    this.emit('nodesUpdate', this.getAllNodes());
    this.emit('telemetry', node);
    return this.forceDaytime;
  }

  setMasterOverride(enabled, brightness = 70) {
    this.isMasterOverride = enabled;
    this.overrideBrightness = brightness;
    const node = this.getSelectedNode();
    this._stepNode(node, new Date());
    this.emit('nodesUpdate', this.getAllNodes());
    this.emit('telemetry', node);
  }

  setManualBrightness(brightness) {
    this.overrideBrightness = brightness;
    if (this.isMasterOverride) {
      const node = this.getSelectedNode();
      node.brightness_pct = brightness;
      node.light_status = brightness > 0 ? 1 : 0;
      this.emit('telemetry', node);
    }
  }

  injectFault(type) {
    const node = this.getSelectedNode();
    node.fault = type;
    const stamp = () => new Date().toLocaleTimeString();

    if (type === 'dayburn') {
      node.ambient_cond = 'DAY';
      node.ldr_lux = 480.0;
      node.ldr_raw = 3100;
      node.light_status = 1; // It is ON!
      node.brightness_pct = 100; // 100% full lumen in broad daylight!
      node.current_ma = 485;
      node.power_w = parseFloat(((node.voltage * node.current_ma) / 1000).toFixed(2));
      this.emit('alert', {
        id: Date.now(),
        type: 'warning',
        title: `UNEXPECTED LIGHT ON DURING DAYTIME (${node.id})`,
        message: `Daylight Lux > 400 yet LED luminaire is ON at 100% brightness (485 mA). Relay stuck or LDR logic failure on ${node.name}.`,
        time: stamp()
      });
    } else if (type === 'poweroutage') {
      node.voltage = 0.0;
      node.current_ma = 0;
      node.power_w = 0.0;
      node.light_status = 0;
      node.brightness_pct = 0;
      node.uptime_seconds = 0; // RESET RUNTIME AFTER POWER OUTAGE
      node.outage_seconds = OUTAGE_SECONDS;
      this.emit('alert', {
        id: Date.now(),
        type: 'critical',
        title: `POWER OUTAGE / GRID COLLAPSE (${node.id})`,
        message: `Bus voltage collapsed to 0.00 V. System runtime reset to 00:00:00 and will restart when power returns (~${OUTAGE_SECONDS}s in this simulation).`,
        time: stamp()
      });
    } else if (type === 'lowvoltage') {
      node.voltage = 3.95;
      node.uptime_seconds = 0; // brown-out reboots the controller
      this.emit('alert', {
        id: Date.now(),
        type: 'critical',
        title: `CRITICAL LOW BUS VOLTAGE (${node.id})`,
        message: `Bus voltage dropped to 3.95 V (Threshold: 4.2 V). Solar battery depleted. System runtime reset to 00:00:00.`,
        time: stamp()
      });
    } else if (type === 'nodeoffline') {
      node.is_online = false;
      node.uptime_seconds = 0;
      node.offline_seconds = OFFLINE_SECONDS;
      this.emit('alert', {
        id: Date.now(),
        type: 'critical',
        title: `NODE ${node.id} OFFLINE / DISCONNECTED`,
        message: `Heartbeat timed out. LoRa link lost with pole ${node.location}. System uptime reset; node will try to re-join in ~${OFFLINE_SECONDS}s.`,
        time: stamp()
      });
    } else if (type === 'overcurrent') {
      node.current_ma = 920;
      this.emit('alert', {
        id: Date.now(),
        type: 'critical',
        title: `HIGH CURRENT DETECTED (${node.id})`,
        message: `Current draw exceeded 800mA safety threshold (Reading: 920 mA). Possible short-circuit in LED driver.`,
        time: stamp()
      });
    } else if (type === 'sensorfail') {
      node.voltage = 0.0;
      node.current_ma = 0;
      node.ldr_lux = 0;
      this.emit('alert', {
        id: Date.now(),
        type: 'critical',
        title: `INA219 / SENSOR I2C BUS FAILURE (${node.id})`,
        message: `No ACK received from INA219 sensor on I2C address 0x40. Check SDA/SCL pull-ups.`,
        time: stamp()
      });
    } else if (type === 'lorafail') {
      this.emit('alert', {
        id: Date.now(),
        type: 'critical',
        title: `LORA RF COMMUNICATION LOST (${node.id})`,
        message: `Gateway packet loss > 20%. SNR degraded below -5 dB. Possible RF interference.`,
        time: stamp()
      });
    }

    // Apply immediately and drop a sample on the chart so the fault is visible at once
    if (node.is_online) {
      this._stepNode(node, new Date());
      this._pushHistory(node);
    }
    this.emit('nodesUpdate', this.getAllNodes());
    this.emit('telemetry', node);
  }

  // ======================================================================
  // Real hardware: connect to a physical ESP32 gateway
  // ======================================================================
  _stopRealLinks() {
    if (this.ws) { this.ws.onclose = null; this.ws.close(); this.ws = null; }
    if (this.httpTimer) { clearInterval(this.httpTimer); this.httpTimer = null; }
  }

  connectGateway(mode, ip, port) {
    this.connectionMode = mode;
    this.gatewayIp = ip;
    this.gatewayPort = port;
    this._stopRealLinks();

    if (mode === 'sim') {
      this.startSimulation();
      this.isGatewayOnline = true;
      this.emit('gatewayStatus', { online: true, ip: 'SIMULATED (Local)' });
      return Promise.resolve(true);
    }

    if (mode === 'ws') {
      const url = `ws://${ip}:${port}/ws`;
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.isGatewayOnline = true;
          this.emit('gatewayStatus', { online: true, ip: `${ip}:${port}` });
          if (this.pollTimer) clearInterval(this.pollTimer);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleRealPacket(data);
          } catch (e) {
            console.error('Invalid JSON from gateway:', e);
          }
        };

        this.ws.onerror = (err) => {
          console.warn('WebSocket error:', err);
          this.emit('gatewayStatus', { online: false, ip: `${ip} (Unreachable)` });
        };

        this.ws.onclose = () => {
          this.isGatewayOnline = false;
          this.emit('gatewayStatus', { online: false, ip: `${ip} (Closed)` });
        };
      } catch (e) {
        return Promise.reject(e);
      }
    }

    if (mode === 'http') {
      if (this.pollTimer) clearInterval(this.pollTimer);
      const url = `http://${ip}${port && Number(port) !== 80 ? ':' + port : ''}/api/telemetry`;
      const poll = async () => {
        try {
          const res = await fetch(url);
          const data = await res.json();
          this.isGatewayOnline = true;
          this.emit('gatewayStatus', { online: true, ip: `${ip}:${port}` });
          this.handleRealPacket(data);
        } catch (e) {
          this.isGatewayOnline = false;
          this.emit('gatewayStatus', { online: false, ip: `${ip} (Unreachable)` });
        }
      };
      poll();
      this.httpTimer = setInterval(poll, this.pollInterval);
    }

    return Promise.resolve(true);
  }

  handleRealPacket(packet) {
    const id = packet.node_id || 'N1';
    if (!this.nodes[id]) {
      this.addNode(id, `Pole ${id}`, '868.100 MHz');
    }
    const node = this.nodes[id];
    const wasMotion = node.motion_detected === 1;
    node.voltage = packet.voltage ?? node.voltage;
    node.current_ma = packet.current_ma ?? node.current_ma;
    node.power_w = packet.power_w ?? parseFloat(((node.voltage * node.current_ma) / 1000).toFixed(2));
    node.energy_kwh = packet.energy_kwh ?? node.energy_kwh;
    node.light_status = packet.light_status ?? node.light_status;
    node.brightness_pct = packet.brightness_pct ?? node.brightness_pct;
    node.motion_detected = packet.motion_detected ?? node.motion_detected;
    node.ldr_lux = packet.ldr_lux ?? node.ldr_lux;
    node.ambient_cond = packet.ambient_cond ?? node.ambient_cond;
    node.lora_rssi = packet.lora_rssi ?? node.lora_rssi;
    node.lora_snr = packet.lora_snr ?? node.lora_snr;
    node.packet_count = packet.packet_count ?? (node.packet_count + 1);
    node.last_packet_time = new Date();
    node.is_online = true;
    if (!wasMotion && node.motion_detected === 1) node.pir_triggers += 1;

    this._pushHistory(node);
    this.emit('nodesUpdate', this.getAllNodes());
    if (id === this.selectedNodeId) {
      this.emit('telemetry', node);
    }
  }
}

// Global Singleton Instance
window.dataService = new DataService();
