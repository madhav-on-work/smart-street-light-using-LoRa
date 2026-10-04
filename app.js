/**
 * App - Main UI Controller for LoRa Smart Street Light Dashboard
 * Connects DataService, Charts, Visualizer, DOM updates, and Event Handlers
 */

document.addEventListener(
  'DOMContentLoaded',
  async () => {

    // ==========================================================
    // AUTHENTICATION GUARD
    // Dashboard will NOT initialize without a valid session.
    // ==========================================================

    const authenticated =
      await window.requireAuthentication();

    if (!authenticated) {
      return;
    }


    // ==========================================================
    // INITIALIZE DASHBOARD
    // ==========================================================

    const dataService =
      window.dataService;

    const chartsManager =
      new window.ChartsManager(dataService);

    const visualizer =
      new window.SmartLightVisualizer(dataService);

  // In-memory Alerts Store
  let alerts = [
    {
      id: 1,
      type: 'normal',
      title: 'LORA GATEWAY SYNC ESTABLISHED',
      message: 'ESP32 Gateway online at 192.168.1.150. LoRa 868.1MHz link operational.',
      time: new Date(Date.now() - 120000).toLocaleTimeString()
    },
    {
      id: 2,
      type: 'warning',
      title: 'MOTION BURST DETECTED (NODE N1)',
      message: 'PIR trigger confirmed. Automatic lumen ramp to 100% safety level initiated.',
      time: new Date(Date.now() - 45000).toLocaleTimeString()
    }
  ];

  // =========================================================================
  // DOM Elements
  // =========================================================================
  // Header
  const nodeSelect = document.getElementById('nodeSelect');
  const txtGatewayStatus = document.getElementById('txtGatewayStatus');
  const dotGateway = document.getElementById('dotGateway');
  const txtLoraStatus = document.getElementById('txtLoraStatus');
  const txtLastUpdate = document.getElementById('txtLastUpdate');
  const btnMasterOverride = document.getElementById('btnMasterOverride');
  const txtOverrideMode = document.getElementById('txtOverrideMode');

  // Top 8 Telemetry Cards
  const valVoltage = document.getElementById('valVoltage');
  const barVoltage = document.getElementById('barVoltage');
  const valCurrent = document.getElementById('valCurrent');
  const barCurrent = document.getElementById('barCurrent');
  const lblCurrentState = document.getElementById('lblCurrentState');
  const valPower = document.getElementById('valPower');
  const barPower = document.getElementById('barPower');
  const valEnergy = document.getElementById('valEnergy');
  const barEnergy = document.getElementById('barEnergy');
  const badgeLightStatus = document.getElementById('badgeLightStatus');
  const valLightStatus = document.getElementById('valLightStatus');
  const lblLightDuty = document.getElementById('lblLightDuty');
  const barLightDuty = document.getElementById('barLightDuty');
  const valBrightness = document.getElementById('valBrightness');
  const barBrightness = document.getElementById('barBrightness');
  const lblBrightnessMode = document.getElementById('lblBrightnessMode');
  const badgeMotion = document.getElementById('badgeMotion');
  const valMotion = document.getElementById('valMotion');
  const lblMotionTimer = document.getElementById('lblMotionTimer');
  const barMotionTimer = document.getElementById('barMotionTimer');
  const badgeNodeStatus = document.getElementById('badgeNodeStatus');
  const valNodeStatus = document.getElementById('valNodeStatus');
  const valNodeUptime = document.getElementById('valNodeUptime');

  // Logic Flow Cards
  const flowCardDay = document.getElementById('flowCardDay');
  const flowCardNightMotion = document.getElementById('flowCardNightMotion');
  const flowCardNightNoMotion = document.getElementById('flowCardNightNoMotion');

  // Demo Toolbar
  const btnToggleDayNight = document.getElementById('btnToggleDayNight');
  const txtDayNightToggle = document.getElementById('txtDayNightToggle');
  const iconDayNight = document.getElementById('iconDayNight');
  const btnTriggerMotion = document.getElementById('btnTriggerMotion');
  const sliderBrightness = document.getElementById('sliderBrightness');
  const lblSliderVal = document.getElementById('lblSliderVal');

  // Detailed Node Section
  const selectedNodeTitle = document.getElementById('selectedNodeTitle');
  const nodeDetId = document.getElementById('nodeDetId');
  const nodeDetLdrRaw = document.getElementById('nodeDetLdrRaw');
  const nodeDetLdrLux = document.getElementById('nodeDetLdrLux');
  const nodeDetAmbient = document.getElementById('nodeDetAmbient');
  const nodeDetPir = document.getElementById('nodeDetPir');
  const nodeDetBrightness = document.getElementById('nodeDetBrightness');
  const nodeDetVoltage = document.getElementById('nodeDetVoltage');
  const nodeDetCurrent = document.getElementById('nodeDetCurrent');
  const nodeDetPower = document.getElementById('nodeDetPower');
  const nodeDetRssi = document.getElementById('nodeDetRssi');
  const nodeDetSnr = document.getElementById('nodeDetSnr');
  const nodeDetLastPkt = document.getElementById('nodeDetLastPkt');
  const nodeDetPacketCount = document.getElementById('nodeDetPacketCount');

  // Multi-Node Panel (permanent, horizontally scrollable)
  const multiNodeOverviewPanel = document.getElementById('multiNodeOverviewPanel');
  const multiNodeContainer = document.getElementById('multiNodeContainer');
  const btnScrollNodesLeft = document.getElementById('btnScrollNodesLeft');
  const btnScrollNodesRight = document.getElementById('btnScrollNodesRight');
  const meshNodeCount = document.getElementById('meshNodeCount');
  const chartsPanel = document.getElementById('chartsPanel');

  // Extra live labels
  const lblMotionTriggerCount = document.getElementById('lblMotionTriggerCount');
  const lblNodeHealthName = document.getElementById('lblNodeHealthName');
  const lblNodeLoss = document.getElementById('lblNodeLoss');
  const barNodeHealth = document.getElementById('barNodeHealth');
  const lblPowerSaved = document.getElementById('lblPowerSaved');
  const lblNodeHexId = document.getElementById('lblNodeHexId');
  const loraNetNodeTag = document.getElementById('loraNetNodeTag');
  const flowFaultBanner = document.getElementById('flowFaultBanner');

  // Energy Analytics & Comparison
  const statEnergyToday = document.getElementById('statEnergyToday');
  const statEnergyWeek = document.getElementById('statEnergyWeek');
  const statEnergyMonth = document.getElementById('statEnergyMonth');
  const statAvgPower = document.getElementById('statAvgPower');
  const statPeakPower = document.getElementById('statPeakPower');
  const statRuntime = document.getElementById('statRuntime');
  const statEnergySaved = document.getElementById('statEnergySaved');
  const statSavingPercent = document.getElementById('statSavingPercent');
  const txtSmartKwhNight = document.getElementById('txtSmartKwhNight');
  const barCompSmart = document.getElementById('barCompSmart');
  const gaugeSavingsCircle = document.getElementById('gaugeSavingsCircle');
  const gaugeSavingText = document.getElementById('gaugeSavingText');
  const txtCo2Saved = document.getElementById('txtCo2Saved');

  // LoRa Network Metrics
  const loraNetNodeId = document.getElementById('loraNetNodeId');
  const loraNetRssi = document.getElementById('loraNetRssi');
  const loraNetSnr = document.getElementById('loraNetSnr');
  const loraNetRx = document.getElementById('loraNetRx');
  const loraNetLost = document.getElementById('loraNetLost');
  const loraNetLossRate = document.getElementById('loraNetLossRate');
  const loraNetLastTime = document.getElementById('loraNetLastTime');
  const loraNetStatus = document.getElementById('loraNetStatus');

  // Alerts
  const alertCountBadge = document.getElementById('alertCountBadge');
  const alertsListContainer = document.getElementById('alertsListContainer');
  const selectTestFault = document.getElementById('selectTestFault');
  const btnInjectFault = document.getElementById('btnInjectFault');
  const btnClearAlerts = document.getElementById('btnClearAlerts');

  // Modals
  const gatewayModal = document.getElementById('gatewayModal');
  const btnOpenGatewayModal = document.getElementById('btnOpenGatewayModal');
  const btnCloseGatewayModal = document.getElementById('btnCloseGatewayModal');
  const btnSaveGatewaySettings = document.getElementById('btnSaveGatewaySettings');
  const btnTestGatewayPing = document.getElementById('btnTestGatewayPing');
  const cfgConnectionMode = document.getElementById('cfgConnectionMode');
  const cfgGatewayIp = document.getElementById('cfgGatewayIp');
  const cfgGatewayPort = document.getElementById('cfgGatewayPort');
  const cfgConnStatusText = document.getElementById('cfgConnStatusText');

  const addNodeModal = document.getElementById('addNodeModal');
  const btnOpenAddNodeModal = document.getElementById('btnOpenAddNodeModal');
  const btnCloseAddNodeModal = document.getElementById('btnCloseAddNodeModal');
  const btnCancelAddNode = document.getElementById('btnCancelAddNode');
  const btnConfirmAddNode = document.getElementById('btnConfirmAddNode');
  const newNodeId = document.getElementById('newNodeId');
  const newNodeLocation = document.getElementById('newNodeLocation');
  const newNodeFreq = document.getElementById('newNodeFreq');

  const btnPauseCharts = document.getElementById('btnPauseCharts');
  const timeBtns = document.querySelectorAll('.time-btn');
  

  // =========================================================================
  // Telemetry Subscriber: Update UI on every data packet
  // =========================================================================
  dataService.on('telemetry', (node) => {
    updateTopLiveCards(node);
    updateLogicState(node);
    updateNodeDetails(node);
    updateEnergyAnalytics(node);
    updateLoraNetwork(node);
    updateLastUpdatedTicker();
  });

  // Every simulation step updates ALL nodes -> keep the mesh cards live
  dataService.on('nodesUpdate', () => updateMeshCards());

  // LIVE runtime + PIR hold countdown (1 s resolution)
  dataService.on('runtimeTick', (t) => {
    statRuntime.textContent = t.formatted;
    valNodeUptime.textContent = t.formatted;
    if (t.is_online && t.motion_detected === 1) {
      lblMotionTimer.textContent = `${t.motion_timer}s`;
      barMotionTimer.style.width = `${Math.min(100, (t.motion_timer / 10) * 100)}%`;
    } else {
      lblMotionTimer.textContent = '0s';
      barMotionTimer.style.width = '0%';
    }
  });

  // Gateway status change
  dataService.on('gatewayStatus', (status) => {
    if (status.online) {
      txtGatewayStatus.textContent = `ONLINE (${status.ip})`;
      txtGatewayStatus.className = 'status-val online';
      dotGateway.className = 'status-indicator-dot pulse';
    } else {
      txtGatewayStatus.textContent = `OFFLINE (${status.ip})`;
      txtGatewayStatus.className = 'status-val offline';
      dotGateway.className = 'status-indicator-dot offline';
    }
  });

  // Dynamic alerts
  dataService.on('alert', (alert) => {
    alerts.unshift(alert);
    renderAlerts();
  });

  // Node list change
  dataService.on('nodeListChange', (allNodes) => {
    updateNodeDropdown(allNodes);
    syncMeshGrid();
  });

  // =========================================================================
  // Update Functions
  // =========================================================================
  function updateTopLiveCards(node) {
    // 1. Voltage
    valVoltage.textContent = node.voltage.toFixed(2);
    const vPercent = Math.min(100, Math.max(0, ((node.voltage - 3.0) / 3.0) * 100));
    barVoltage.style.width = `${vPercent}%`;

    // 2. Current
    valCurrent.textContent = node.current_ma;
    const cPercent = Math.min(100, (node.current_ma / 800) * 100);
    barCurrent.style.width = `${cPercent}%`;
    lblCurrentState.textContent = node.current_ma > 500 ? 'Peak Draw' : (node.current_ma > 50 ? 'Active Draw' : 'Idle Standby');

    // 3. Power
    valPower.textContent = node.power_w.toFixed(2);
    const pPercent = Math.min(100, (node.power_w / 5.0) * 100);
    barPower.style.width = `${pPercent}%`;
    const savedPct = Math.round((1 - node.power_w / 5.0) * 100);
    lblPowerSaved.textContent = savedPct >= 0 ? `-${savedPct}% Saved` : `+${Math.abs(savedPct)}% Over`;
    lblPowerSaved.style.color = savedPct >= 0 ? 'var(--status-normal)' : 'var(--status-critical)';

    // 4. Energy Today
    valEnergy.textContent = node.energy_kwh.toFixed(4);
    const ePercent = Math.min(100, (node.energy_kwh / 0.082) * 100);
    barEnergy.style.width = `${ePercent}%`;

    // 5. Light Status
    if (node.light_status === 1) {
      badgeLightStatus.className = 'badge-status on';
      valLightStatus.textContent = 'ON';
    } else {
      badgeLightStatus.className = 'badge-status off';
      valLightStatus.textContent = 'OFF';
    }
    lblLightDuty.textContent = `Duty: ${node.brightness_pct}%`;
    barLightDuty.style.width = `${node.brightness_pct}%`;

    // 6. Brightness
    valBrightness.textContent = node.brightness_pct;
    barBrightness.style.width = `${node.brightness_pct}%`;
    if (node.fault === 'dayburn') {
      lblBrightnessMode.textContent = 'DAYBURN FAULT';
    } else if (node.fault === 'poweroutage' || !node.is_online) {
      lblBrightnessMode.textContent = 'No Power / Offline';
    } else if (dataService.isMasterOverride) {
      lblBrightnessMode.textContent = 'Manual Override';
    } else {
      lblBrightnessMode.textContent = node.ambient_cond === 'DAY' ? 'Daylight (0%)' : (node.motion_detected ? 'Motion (100%)' : 'Night Dim (30%)');
    }
    lblBrightnessMode.style.color = node.fault === 'dayburn' ? 'var(--status-critical)' : '';

    // 7. Motion (fixed-width footer: short hold label + trigger counter that never moves)
    lblMotionTriggerCount.textContent = `Triggers: ${node.pir_triggers}`;
    if (node.motion_detected === 1) {
      badgeMotion.className = 'badge-status motion';
      valMotion.textContent = 'DETECTED';
      lblMotionTimer.textContent = `${node.motion_timer}s`;
      barMotionTimer.style.width = `${Math.min(100, (node.motion_timer / 10) * 100)}%`;
    } else {
      badgeMotion.className = 'badge-status no-motion';
      valMotion.textContent = 'NO MOTION';
      lblMotionTimer.textContent = '0s';
      barMotionTimer.style.width = '0%';
    }

    // 8. Node Status
    lblNodeHealthName.textContent = `${node.id} Health`;
    if (!node.is_online) {
      badgeNodeStatus.className = 'badge-status off';
      valNodeStatus.textContent = 'OFFLINE';
    } else if (node.fault === 'poweroutage') {
      badgeNodeStatus.className = 'badge-status off';
      valNodeStatus.textContent = 'POWER OUTAGE';
    } else {
      badgeNodeStatus.className = 'badge-status on';
      valNodeStatus.textContent = 'ONLINE';
    }
    valNodeUptime.textContent = dataService.formatHHMMSS(node.uptime_seconds);
    const lossPct = (node.packets_lost / (node.packet_count + node.packets_lost)) * 100;
    lblNodeLoss.textContent = `Loss: ${lossPct.toFixed(1)}%`;
    barNodeHealth.style.width = `${node.is_online && node.fault !== 'poweroutage' ? Math.max(5, 100 - lossPct) : 0}%`;
  }

  function updateLogicState(node) {
    // Clear active / fault from all
    [flowCardDay, flowCardNightMotion, flowCardNightNoMotion].forEach(c => c.classList.remove('active', 'fault'));

    const faultText = {
      dayburn: 'DAY-BURN FAULT: LDR reports daylight but the luminaire is ON at 100%. The state machine expects Light OFF - check the relay / MOSFET driver and LDR logic.',
      poweroutage: 'POWER OUTAGE: bus voltage is 0 V. The controller is down; runtime restarts from 00:00:00 when supply returns.',
      overcurrent: 'OVERCURRENT FAULT: current draw is above the 800 mA safety threshold.',
      lowvoltage: 'LOW VOLTAGE FAULT: bus voltage is below the 4.2 V threshold.',
      sensorfail: 'SENSOR FAILURE: INA219 / LDR is not responding on the I2C bus.',
      lorafail: 'LoRa LINK FAULT: heavy packet loss, SNR below -5 dB.'
    };
    const msg = !node.is_online ? 'NODE OFFLINE: LoRa heartbeat lost - displayed values are the last known state.' : faultText[node.fault];
    if (msg) {
      flowFaultBanner.hidden = false;
      flowFaultBanner.textContent = `⚠ ${node.id}: ${msg}`;
    } else {
      flowFaultBanner.hidden = true;
    }

    if (node.fault === 'dayburn') {
      // Light is ON while the logic says DAY -> highlight Mode 1 as a FAULT, not as the active state
      flowCardDay.classList.add('fault');
    } else if (node.ambient_cond === 'DAY' || node.ldr_lux > 150) {
      flowCardDay.classList.add('active');
    } else if (node.motion_detected === 1) {
      flowCardNightMotion.classList.add('active');
    } else {
      flowCardNightNoMotion.classList.add('active');
    }
  }

  function updateNodeDetails(node) {
    selectedNodeTitle.textContent = node.name;
    lblNodeHexId.textContent = 'NODE ID: 0x' + [...node.id].map(c => c.charCodeAt(0).toString(16).toUpperCase()).join('');
    nodeDetId.textContent = `${node.id} (${node.location})`;
    nodeDetLdrRaw.textContent = `ADC: ${node.ldr_raw} •`;
    nodeDetLdrLux.textContent = `${node.ldr_lux} Lux`;
    nodeDetAmbient.textContent = node.ambient_cond === 'DAY' ? 'Daylight (Sun)' : (node.ldr_lux > 40 ? 'Dusk / Twilight' : 'Night / Dark');
    
    nodeDetPir.textContent = node.motion_detected === 1 ? `ACTIVE (${node.motion_timer}s hold)` : 'CLEAR (NO MOTION)';
    nodeDetPir.style.color = node.motion_detected === 1 ? 'var(--status-warning)' : 'var(--cyan-primary)';

    const pwmValue = Math.round((node.brightness_pct / 100) * 255);
    nodeDetBrightness.textContent = `${node.brightness_pct}% (PWM: ${pwmValue})`;
    nodeDetVoltage.textContent = `${node.voltage.toFixed(2)} V`;
    nodeDetCurrent.textContent = `${node.current_ma} mA`;
    nodeDetPower.textContent = `${node.power_w.toFixed(2)} W`;
    nodeDetRssi.textContent = `${node.lora_rssi} dBm`;
    nodeDetSnr.textContent = `${node.lora_snr > 0 ? '+' : ''}${node.lora_snr} dB`;

    const secondsAgo = Math.max(0, Math.floor((Date.now() - node.last_packet_time.getTime()) / 1000));
    nodeDetLastPkt.textContent = `${node.last_packet_time.toLocaleTimeString()} (${secondsAgo}s ago)`;
    nodeDetPacketCount.textContent = `${node.packet_count.toLocaleString()} / ${node.packets_lost} Lost`;
  }

  function updateEnergyAnalytics(node) {
    const kwhToday = node.energy_kwh;
    const kwhWeek = kwhToday * 7;
    const kwhMonth = kwhToday * 30;

    const pstats = dataService.getPowerStats(node.id);
    statAvgPower.innerHTML = `${pstats.avg.toFixed(2)} <span class="analytics-stat-unit">W</span>`;
    statPeakPower.innerHTML = `${pstats.peak.toFixed(2)} <span class="analytics-stat-unit">W</span>`;

    statEnergyToday.innerHTML = `${kwhToday.toFixed(3)} <span class="analytics-stat-unit">kWh</span>`;
    statEnergyWeek.innerHTML = `${kwhWeek.toFixed(3)} <span class="analytics-stat-unit">kWh</span>`;
    statEnergyMonth.innerHTML = `${kwhMonth.toFixed(3)} <span class="analytics-stat-unit">kWh</span>`;

    // Conventional baseline: 5W constant * 12 hours = 0.060 to 0.082 kWh
    const conventionalKwh = 0.082;
    const savedKwh = Math.max(0, conventionalKwh - kwhToday);
    const savingPct = Math.min(85, Math.max(50, ((savedKwh / conventionalKwh) * 100))).toFixed(1);

    statEnergySaved.innerHTML = `${savedKwh.toFixed(3)} <span class="analytics-stat-unit">kWh</span>`;
    statSavingPercent.textContent = `${savingPct}%`;

    txtSmartKwhNight.textContent = `${kwhToday.toFixed(3)} kWh / night`;
    const smartBarPct = Math.min(100, Math.max(15, (kwhToday / conventionalKwh) * 100));
    barCompSmart.style.width = `${smartBarPct}%`;

    // Gauge circle animation (circumference = 2 * PI * 50 = 314)
    const offset = 314 - (314 * (savingPct / 100));
    gaugeSavingsCircle.style.strokeDashoffset = offset;
    gaugeSavingText.textContent = `${savingPct}%`;

    // Carbon offset: ~0.82 kg CO2 per kWh in municipal grids
    const co2Kg = (savedKwh * 0.82).toFixed(3);
    txtCo2Saved.textContent = `${co2Kg} kg CO₂ / day`;
  }

  function updateLoraNetwork(node) {
    loraNetNodeId.textContent = `${node.id} (${node.location})`;
    loraNetNodeTag.textContent = `[${node.id}]`;
    loraNetRssi.textContent = `${node.lora_rssi} dBm`;
    loraNetSnr.textContent = `${node.lora_snr > 0 ? '+' : ''}${node.lora_snr} dB`;
    loraNetRx.textContent = node.packet_count.toLocaleString();
    loraNetLost.textContent = node.packets_lost;

    const lossRate = ((node.packets_lost / (node.packet_count + node.packets_lost)) * 100).toFixed(2);
    loraNetLossRate.textContent = `${lossRate} %`;
    loraNetLastTime.textContent = 'Just now';

    if (node.lora_rssi > -85 && node.lora_snr > 4) {
      loraNetStatus.textContent = 'EXCELLENT LINK';
      loraNetStatus.style.color = 'var(--status-normal)';
    } else if (node.lora_rssi > -105) {
      loraNetStatus.textContent = 'GOOD / ACCEPTABLE';
      loraNetStatus.style.color = 'var(--status-warning)';
    } else {
      loraNetStatus.textContent = 'DEGRADED RF';
      loraNetStatus.style.color = 'var(--status-critical)';
    }
  }

  function updateLastUpdatedTicker() {
    txtLastUpdate.textContent = 'Just now';
    txtLoraStatus.textContent = `868 MHz • SF7 (RSSI: ${dataService.getSelectedNode().lora_rssi} dBm)`;
  }

  function renderAlerts() {
    alertsListContainer.innerHTML = '';
    const activeCount = alerts.filter(a => a.type !== 'normal').length;
    alertCountBadge.textContent = `${activeCount} Active ${activeCount === 1 ? 'Alert' : 'Alerts'}`;

    if (alerts.length === 0) {
      alertsListContainer.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          No active anomalies detected. All municipal lighting poles operating within nominal parameters.
        </div>
      `;
      return;
    }

    alerts.slice(0, 6).forEach(alert => {
      const alertDiv = document.createElement('div');
      alertDiv.className = `alert-item ${alert.type}`;
      
      let iconSvg = '';
      if (alert.type === 'critical') {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
      } else if (alert.type === 'warning') {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
      } else {
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
      }

      alertDiv.innerHTML = `
        <div class="alert-icon-box">${iconSvg}</div>
        <div class="alert-content">
          <div class="alert-title-row">
            <span class="alert-title">${alert.title}</span>
            <span class="alert-time">${alert.time}</span>
          </div>
          <p class="alert-msg">${alert.message}</p>
        </div>
      `;
      alertsListContainer.appendChild(alertDiv);
    });
  }

  // ---------------------------------------------------------------------
  // Smart City Lighting Mesh - permanent, horizontally scrollable.
  // Cards are created once and then updated IN PLACE, so the scroll position
  // and hover/click state are never reset by the 1.5 s telemetry refresh.
  // ---------------------------------------------------------------------
  const meshCards = new Map();

  function buildMeshCard(node) {
    const card = document.createElement('div');
    card.className = 'node-summary-card';
    card.dataset.node = node.id;
    card.title = 'Click to inspect this node';
    card.innerHTML = `
      <div class="mesh-card-top">
        <strong class="mesh-card-name" data-f="name"></strong>
        <span class="badge-status" data-f="light"></span>
      </div>
      <div class="mesh-card-loc" data-f="loc"></div>
      <div class="mesh-card-state" data-f="state"></div>
      <div class="mesh-card-grid">
        <div>Brightness: <span data-f="bri" style="color: var(--cyan-primary);"></span></div>
        <div>Power: <span data-f="pwr" style="color: #fff;"></span></div>
        <div>Motion: <span data-f="mot"></span></div>
        <div>RSSI: <span data-f="rssi" style="color: var(--cyan-primary);"></span></div>
      </div>
      <div class="metric-bar-container" style="margin-top: 0.35rem;">
        <div class="metric-bar-fill" data-f="bar" style="background: var(--cyan-primary);"></div>
      </div>
    `;
    card.addEventListener('click', () => selectNode(node.id));
    const refs = {};
    card.querySelectorAll('[data-f]').forEach(el => { refs[el.dataset.f] = el; });
    meshCards.set(node.id, { el: card, refs });
    multiNodeContainer.appendChild(card);
  }

  function syncMeshGrid() {
    const nodes = dataService.getAllNodes();
    let added = false;
    nodes.forEach(n => {
      if (!meshCards.has(n.id)) { buildMeshCard(n); added = true; }
    });
    meshNodeCount.textContent = `${nodes.length} nodes`;
    updateMeshCards();
    if (added && nodes.length > 4) {
      // bring a newly registered node into view
      multiNodeContainer.scrollTo({ left: multiNodeContainer.scrollWidth, behavior: 'smooth' });
    }
  }

  function updateMeshCards() {
    const selectedId = nodeSelect.value === 'ALL' ? null : dataService.selectedNodeId;
    dataService.getAllNodes().forEach(node => {
      const entry = meshCards.get(node.id);
      if (!entry) return;
      const { el, refs } = entry;
      const dead = !node.is_online || node.fault === 'poweroutage';

      el.classList.toggle('selected', node.id === selectedId);
      el.classList.toggle('offline', dead);
      el.classList.toggle('faulted', !!node.fault && !dead);

      refs.name.textContent = node.name;
      refs.loc.textContent = node.location;
      const lightOn = node.light_status === 1 && !dead;
      refs.light.className = `badge-status ${lightOn ? 'on' : 'off'}`;
      refs.light.textContent = lightOn ? 'LIGHT ON' : 'LIGHT OFF';

      if (!node.is_online) {
        refs.state.textContent = '● OFFLINE';
        refs.state.style.color = 'var(--status-critical)';
      } else if (node.fault === 'poweroutage') {
        refs.state.textContent = '● POWER OUTAGE';
        refs.state.style.color = 'var(--status-critical)';
      } else if (node.fault) {
        refs.state.textContent = `● FAULT: ${node.fault.toUpperCase()}`;
        refs.state.style.color = 'var(--status-warning)';
      } else {
        refs.state.textContent = '● ONLINE';
        refs.state.style.color = 'var(--status-normal)';
      }

      refs.bri.textContent = `${dead ? 0 : node.brightness_pct}%`;
      refs.pwr.textContent = `${node.power_w.toFixed(2)} W`;
      refs.mot.textContent = node.motion_detected ? 'ACTIVE' : 'IDLE';
      refs.mot.style.color = node.motion_detected ? '#f59e0b' : '#94a3b8';
      refs.rssi.textContent = `${node.lora_rssi} dBm`;
      refs.bar.style.width = `${dead ? 0 : node.brightness_pct}%`;
    });
  }

  // Show / hide the "Telemetry Stream & Analytical Waveforms" panel.
  // Hidden while "All Nodes Overview" is selected, back as soon as a node is chosen.
  function setChartsVisible(visible) {
    chartsPanel.classList.toggle('is-hidden', !visible);
    if (visible) {
      requestAnimationFrame(() => {
        chartsManager.resizeAll();
        chartsManager.refresh(true);
      });
    }
  }

  // Select a single node (from the dropdown OR by clicking its mesh card)
  function selectNode(nodeId) {
    nodeSelect.value = nodeId;
    dataService.setSelectedNode(nodeId);
    setChartsVisible(true);
    updateMeshCards();
  }

  function updateNodeDropdown(allNodes) {
    const currentVal = nodeSelect.value;
    nodeSelect.innerHTML = '';
    allNodes.forEach(n => {
      const opt = document.createElement('option');
      opt.value = n.id;
      opt.textContent = `${n.name} (${n.location})`;
      nodeSelect.appendChild(opt);
    });
    const allOpt = document.createElement('option');
    allOpt.value = 'ALL';
    allOpt.textContent = '🌐 All Nodes Overview';
    nodeSelect.appendChild(allOpt);

    nodeSelect.value = currentVal;
  }

  // =========================================================================
  // User Actions & Event Listeners
  // =========================================================================

  // Node Selection Change
  nodeSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'ALL') {
      // Overview: the mesh stays on screen, the waveform panel is hidden for now
      setChartsVisible(false);
      updateMeshCards();
    } else {
      selectNode(val);
    }
  });

  // Mesh horizontal scroll buttons
  btnScrollNodesLeft.addEventListener('click', () => {
    multiNodeContainer.scrollBy({ left: -330, behavior: 'smooth' });
  });
  btnScrollNodesRight.addEventListener('click', () => {
    multiNodeContainer.scrollBy({ left: 330, behavior: 'smooth' });
  });

  // PIR Motion Trigger (Demo viva action)
  btnTriggerMotion.addEventListener('click', () => {
    dataService.triggerMotion(10);
    // Button click animation
    btnTriggerMotion.style.transform = 'scale(0.96)';
    setTimeout(() => { btnTriggerMotion.style.transform = 'scale(1)'; }, 150);
  });

  // Day/Night Toggle
  btnToggleDayNight.addEventListener('click', () => {
    const isDay = dataService.toggleDayNight();
    if (isDay) {
      txtDayNightToggle.textContent = 'Simulate: Night';
      iconDayNight.textContent = '☀️';
    } else {
      txtDayNightToggle.textContent = 'Simulate: Day';
      iconDayNight.textContent = '🌙';
    }
  });

  // Manual Brightness Slider
  sliderBrightness.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    lblSliderVal.textContent = `${val}%`;
    dataService.setManualBrightness(val);
  });

  // Emergency / Master Override Button
  btnMasterOverride.addEventListener('click', () => {
    const newOverride = !dataService.isMasterOverride;
    dataService.setMasterOverride(newOverride, parseInt(sliderBrightness.value, 10));
    if (newOverride) {
      btnMasterOverride.className = 'btn-cyber danger';
      txtOverrideMode.textContent = 'MANUAL OVERRIDE';
    } else {
      btnMasterOverride.className = 'btn-cyber warning';
      txtOverrideMode.textContent = 'Auto Adaptive';
    }
  });

  // Poll Node Button
  document.getElementById('btnRefreshNodeData')?.addEventListener('click', () => {
    dataService.simulationStep();
  });

  // Pause Charts Button
  btnPauseCharts.addEventListener('click', () => {
    const paused = chartsManager.togglePause();
    btnPauseCharts.textContent = paused ? '▶ Resume Stream' : '⏸ Pause Stream';
  });

  // Time Range Buttons
  timeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      timeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      chartsManager.setTimeRange(btn.dataset.range);
    });
  });

  // Fault Injection
  btnInjectFault.addEventListener('click', () => {
    const faultType = selectTestFault.value;
    if (faultType !== 'none') {
      dataService.injectFault(faultType);
      selectTestFault.value = 'none';
    }
  });

  // Clear Alerts
  btnClearAlerts.addEventListener('click', () => {
    alerts = [];
    renderAlerts();
    dataService.clearFaults(); // also resets every injected fault back to normal
  });

  // Gateway Modal Handlers
  btnOpenGatewayModal.addEventListener('click', () => gatewayModal.classList.add('open'));
  btnCloseGatewayModal.addEventListener('click', () => gatewayModal.classList.remove('open'));
  gatewayModal.addEventListener('click', (e) => {
    if (e.target === gatewayModal) gatewayModal.classList.remove('open');
  });

  btnTestGatewayPing.addEventListener('click', () => {
    cfgConnStatusText.textContent = 'Pinging gateway at ' + cfgGatewayIp.value + '...';
    cfgConnStatusText.style.color = 'var(--cyan-primary)';
    setTimeout(() => {
      cfgConnStatusText.textContent = 'Ping reply from ' + cfgGatewayIp.value + ': time=4.2ms TTL=64 (ONLINE)';
      cfgConnStatusText.style.color = 'var(--status-normal)';
    }, 600);
  });

  btnSaveGatewaySettings.addEventListener('click', () => {
    const mode = cfgConnectionMode.value;
    const ip = cfgGatewayIp.value;
    const port = cfgGatewayPort.value;
    dataService.connectGateway(mode, ip, port);
    gatewayModal.classList.remove('open');
  });

  // Add Node Modal Handlers
  btnOpenAddNodeModal?.addEventListener('click', () => addNodeModal.classList.add('open'));
  btnCloseAddNodeModal.addEventListener('click', () => addNodeModal.classList.remove('open'));
  btnCancelAddNode.addEventListener('click', () => addNodeModal.classList.remove('open'));
  addNodeModal.addEventListener('click', (e) => {
    if (e.target === addNodeModal) addNodeModal.classList.remove('open');
  });

  btnConfirmAddNode.addEventListener('click', () => {
    const id = newNodeId.value.trim().toUpperCase();
    const loc = newNodeLocation.value.trim();
    const freq = newNodeFreq.value.trim();
    if (id) {
      dataService.addNode(id, loc, freq);
      addNodeModal.classList.remove('open');
      const count = dataService.getAllNodes().length;
      newNodeId.value = `N${count + 1}`;
      newNodeLocation.value = `Pole #${100 + count + 1}`;
    }
  });

  // Keyboard shortcut: Escape closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      gatewayModal.classList.remove('open');
      addNodeModal.classList.remove('open');
    }
  });
  // ============================================================
  // LOGOUT
  // ============================================================

  const btnLogout =
  document.getElementById('btnLogout');

  if (btnLogout) {

  btnLogout.addEventListener(
    'click',
    () => {

      window.logoutDashboard();

    }
  );

 }
  // Initial renders
  syncMeshGrid();
  renderAlerts();
  dataService.emit('telemetry', dataService.getSelectedNode());
});
