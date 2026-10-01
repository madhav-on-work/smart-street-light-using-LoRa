#!/usr/bin/env python3
"""
LoRa-Based Smart Street Light Automation - Local IoT Server
Serves the dark cyber industrial dashboard and provides HTTP REST API endpoints
for ESP32 Gateway integration.

Usage:
    python server.py
Then open http://localhost:8000 in your web browser.
Zero external dependencies required (uses built-in Python standard library).
"""

import http.server
import socketserver
import json
import os
import sys
import time

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Latest telemetry cache from physical or simulated nodes
latest_telemetry = {
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
    "packet_count": 1482,
    "gateway_status": "ONLINE",
    "server_time": time.strftime("%Y-%m-%d %H:%M:%S")
}

class IoTRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS for local testing and cross-origin hardware requests
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200, "OK")
        self.end_headers()

    def do_GET(self):
        # API Endpoint: GET /api/telemetry
        if self.path == '/api/telemetry':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            latest_telemetry["server_time"] = time.strftime("%Y-%m-%d %H:%M:%S")
            self.wfile.write(json.dumps(latest_telemetry).encode('utf-8'))
            return

        # Serve static web files
        super().do_GET()

    def do_POST(self):
        # API Endpoint: POST /api/telemetry (Receives real JSON packet from ESP32 gateway over Wi-Fi)
        if self.path == '/api/telemetry':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                global latest_telemetry
                latest_telemetry.update(data)
                latest_telemetry["server_time"] = time.strftime("%Y-%m-%d %H:%M:%S")
                print(f"[GATEWAY PACKET] Received from Node {data.get('node_id')}: {data.get('power_w')}W, {data.get('brightness_pct')}% PWM")
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "message": "Telemetry updated"}).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
            return

        super().do_POST()

def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), IoTRequestHandler) as httpd:
        print("=" * 68)
        print("  SMART STREET LIGHT AUTOMATION - INDUSTRIAL IoT LOCAL SERVER")
        print(f"  Serving dashboard at: http://localhost:{PORT}")
        print(f"  REST API available at: http://localhost:{PORT}/api/telemetry")
        print("  Press Ctrl+C to terminate.")
        print("=" * 68)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
            httpd.server_close()

if __name__ == "__main__":
    run_server()
