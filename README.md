# LoRa-Based Smart Street Light Automation Node & Gateway
### Industrial IoT Monitoring, Energy Analytics & Autonomous Control Dashboard

A modern, high-contrast industrial smart-city control room interface designed for project demonstrations, exhibitions, and real-world deployment with an **ESP32 LoRa Gateway** and **SX1278 Pole Nodes**.

---

## 🚀 Key Highlights & Features

- **Dark Cyber-Industrial Aesthetic**: Deep navy/charcoal background (`#070d18`, `#0b1322`), glowing neon cyan accents, translucent glassmorphism panels, and high-contrast typography.
- **Top 8 Live Telemetry Cards**:
  1. **Bus Voltage** (INA219 4.98 V)
  2. **Shunt Current** (320 mA)
  3. **Instantaneous Power** (1.59 W, calculated $P = V \times I$)
  4. **Energy Consumed Today** (0.024 kWh accumulator)
  5. **Light Status** (ON / OFF with state indicators)
  6. **Brightness Level** (Adaptive PWM % 0–100%)
  7. **PIR Motion Sensor** (DETECTED / NO MOTION with hold timer)
  8. **Node Health & Uptime** (ONLINE / OFFLINE with loss rate)
- **Embedded State Machine Flow Diagram**: Visually highlights the active operating state in real time:
  - `DAY (Lux > 150)` $\rightarrow$ **Light OFF (0%)**
  - `NIGHT + MOTION` $\rightarrow$ **Full Brightness (100%)**
  - `NIGHT + NO MOTION` $\rightarrow$ **Eco Ambient Dimming (30%)**
- **Pole Digital Twin Visualizer**: 2D animated canvas depicting street pole, a light cone centred directly under the lamp, a pedestrian who walks to the spot under the lamp, Day/Night sky transitions, and a red pulsing **fault display** (e.g. day-burn) with a fault badge.
- **6 Real-Time Analytical Waveforms (Chart.js)** - every Y axis starts at 0 with a generous upper limit that grows automatically if data ever exceeds it, each node keeps its own history, and the LIVE / 5 MIN / 15 MIN / 1 HOUR windows work:
  - Power vs Time (W)
  - Current vs Time (mA)
  - Voltage vs Time (V)
  - Brightness vs Time (%)
  - LDR / Ambient Light vs Time (Lux)
  - Cumulative Energy Consumption vs Time (kWh)
- **Energy Conservation Audit**:
  - Direct comparative analysis: **Conventional Street Light** (Continuous 100% burn 12 hrs/night = ~0.082 kWh) vs **Smart Adaptive Street Light** (~0.024 kWh).
  - Circular progress gauge showing **~70.7% energy reduction**.
  - Carbon emission offset calculation (kg $\text{CO}_2$ saved).
- **LoRa RF Network Section**: RSSI (-74 dBm), SNR (+8.5 dB), packets received/lost, packet loss rate (%), and physical RF specs (868.100 MHz, SF7, BW 125 kHz, CR 4/5).
- **Industrial Alerts & Diagnostics**: Color-coded notifications (Red = Critical, Orange = Warning, Green = Normal) with a live fault injection menu for viva testing (*High Current, Low Voltage, Node Disconnect, Dayburn, Sensor Failure*).
- **Multi-Node Scalability**: Node selector supporting **Node N1, N2, N3, N4**, a **permanent, horizontally scrollable "Smart City Lighting Mesh"** (live status of every node, ◀ ▶ buttons, click a card to inspect that node), and a modal to dynamically register new poles (N5, N6, etc.). Choosing **All Nodes Overview** temporarily hides the waveform panel; selecting any node brings it back.
- **Live runtime**: the *Total Runtime* counter ticks every second and restarts from 00:00:00 after every power outage (simulated outage lasts ~6 s; a disconnected node re-joins after ~15 s; **Clear All** resets every injected fault immediately).
- **Hardware Integration Ready**:
  - Ready-to-flash Arduino firmware for **Pole Node** (`firmware/esp32_node.ino`) and **LoRa Gateway** (`firmware/esp32_gateway.ino`).
  - Supports **WebSockets** (`ws://<gateway-ip>:81/ws`) and **REST HTTP** polling.

---

## 📁 Project Directory Structure

```
lora-smart-streetlight/
├── index.html                   # Modern industrial IoT dashboard UI
├── styles.css                   # Cyber-dark theme, glassmorphism & responsive layouts
├── server.py                    # Standalone Python local server with CORS & REST API
├── js/
│   ├── app.js                   # Application state manager & DOM orchestrator
│   ├── charts.js                # Chart.js neon streaming waveforms & controls
│   ├── chart.umd.js             # Offline-ready Chart.js library
│   ├── data-service.js          # Telemetry engine (realistic simulator & hardware bridge)
│   └── smart-light-visualizer.js # Digital twin street scene, lamp beam & pedestrian animation
└── firmware/
    ├── esp32_node.ino           # ESP32 + LoRa SX1278 + INA219 + PIR + LDR + LED PWM
    └── esp32_gateway.ino        # ESP32 + LoRa SX1278 + Wi-Fi WebSockets & REST API
```

---

## ⚡ Quick Start: Running the Dashboard

### Option A: Direct Browser Launch (Zero Installation)
Simply double-click `index.html` or open it in Google Chrome, Microsoft Edge, or Firefox.
The built-in telemetry simulation runs immediately with realistic physics, fluctuating current, and interactive controls!

### Option B: Python Local Server (Recommended for Live Gateway Testing)
Run the included Python server to enable the HTTP REST API on port 8000:
```powershell
python server.py
```
Then open:
```
http://localhost:8000
```

---

## 🔌 Hardware Circuit & Pinout Table

### 1. Street Light Pole Node (ESP32)
| Module / Sensor | ESP32 Pin | Interface / Protocol | Purpose |
|---|---|---|---|
| **SX1278 LoRa (NSS)** | GPIO 5 | SPI Chip Select | RF Packet transmission |
| **SX1278 LoRa (RST)** | GPIO 14 | Digital Output | Hardware Reset |
| **SX1278 LoRa (DIO0)** | GPIO 2 | External Interrupt | Packet Tx/Rx complete |
| **SX1278 LoRa (SCK)** | GPIO 18 | Hardware SPI Clock | SPI Bus Clock |
| **SX1278 LoRa (MISO)** | GPIO 19 | Hardware SPI MISO | SPI Data in |
| **SX1278 LoRa (MOSI)** | GPIO 23 | Hardware SPI MOSI | SPI Data out |
| **INA219 (SDA)** | GPIO 21 | I2C Data | Voltage & Current Sensing |
| **INA219 (SCL)** | GPIO 22 | I2C Clock | Voltage & Current Sensing |
| **PIR Sensor (OUT)** | GPIO 13 | Digital Input (Pull-down)| Vehicle/Pedestrian Detection |
| **LDR Sensor (Sig)** | GPIO 34 | ADC1 Channel 6 | Ambient Sunlight Lux Level |
| **LED Driver (Gate)** | GPIO 25 | LEDC PWM (5 kHz) | Adaptive Dimming (0–100%) |

### 2. ESP32 LoRa Gateway
| Module / Interface | Pin / Mode | Purpose |
|---|---|---|
| **SX1278 LoRa SPI** | GPIO 5, 14, 2, 18, 19, 23 | Receives 868MHz packets from all nodes |
| **Wi-Fi 802.11 b/g/n**| Station / SoftAP | Connects to local router or creates hotspot |
| **WebSockets** | Port 81 (`/ws`) | Instant bidirectional telemetry push to dashboard |
| **HTTP REST** | Port 80 (`/api/telemetry`) | Standard JSON polling endpoint |

---

## 📡 Gateway JSON Payload Format

When an ESP32 LoRa Gateway receives a packet, it broadcasts this JSON structure to the dashboard:

```json
{
  "node_id": "N1",
  "voltage": 4.98,
  "current_ma": 320,
  "power_w": 1.59,
  "energy_kwh": 0.024,
  "light_status": 1,
  "brightness_pct": 70,
  "motion_detected": 1,
  "ldr_lux": 14.2,
  "ambient_cond": "NIGHT",
  "lora_rssi": -74,
  "lora_snr": 8.5,
  "packet_count": 1482
}
```

---

## 🎓 College Viva & Project Demonstration Guide

### 1. Why use LoRa instead of Wi-Fi or ZigBee for Street Lights?
- **Range**: Wi-Fi has a practical range of ~50–100m. A municipal roadway spanning kilometers would require dozens of Wi-Fi repeaters. LoRa operates at sub-GHz frequencies (868MHz / 433MHz) with Chirp Spread Spectrum (CSS) modulation, enabling a single gateway to cover **5 to 10 kilometers line-of-sight**.
- **Power Efficiency**: Street light controllers can run on low-power battery/solar backup during grid failures.
- **Cost**: Zero cellular SIM card recurring subscription fees compared to 4G/GSM modules.

### 2. How is Energy Consumption Calculated?
1. **Instantaneous Power**:
   $$P = V_{\text{bus}} \times I_{\text{shunt}}$$
2. **Cumulative Energy**:
   $$E = \int_{0}^{t} P(t) \, dt \approx \sum P_i \times \Delta t_i \quad (\text{converted to kWh})$$
3. **Energy Saved**:
   $$\text{Saving \%} = \frac{E_{\text{conventional}} - E_{\text{smart}}}{E_{\text{conventional}}} \times 100$$
   *Result*: Conventional lights consume full power all night (~0.082 kWh per 12h cycle for demo luminaire). Smart adaptive dimming consumes only ~0.024 kWh, yielding a **~70% electricity reduction**.

### 3. What is the role of the INA219 Sensor?
The INA219 is a high-side current and bus voltage monitor with an $\text{I}^2\text{C}$ interface. It measures the voltage drop across a precision shunt resistor ($0.1\,\Omega$) to calculate current with $1\%$ accuracy, and measures the bus voltage to detect power supply dropouts or short-circuits.

### 4. How to demonstrate the dashboard during viva/presentation:
1. **Day/Night Simulation**: Click **"Simulate: Day"**. Watch the LDR jump above 400 Lux, the decision tree switch to "DAY MODE", the pole light turn OFF (0%), and power drop to ~0.07W.
2. **Pedestrian / Traffic Motion**: Click **"Simulate: Night"**, then click **"Trigger PIR Motion"**. Watch the pedestrian walk under the pole, the beam expand and brighten to 100%, and the 10-second hold timer count down before smoothly dimming to 30%.
3. **Fault Injection**: In the Diagnostics panel, select **"High Current (> 800mA)"** or **"Low Voltage (< 4.2V)"** and click **"Inject Fault"**. Watch the alarm chime, the Red Critical banner appear, and the gauge react!
