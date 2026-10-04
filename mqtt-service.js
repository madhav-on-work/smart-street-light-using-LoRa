/**
 * MQTT SERVICE
 * Smart Street Light Dashboard
 *
 * Browser → EMQX Cloud using MQTT over WebSocket Secure.
 *
 * IMPORTANT:
 * Use a dedicated READ-ONLY dashboard MQTT account.
 * Do NOT use your ESP32's publishing credentials here.
 */

class MQTTService {
  constructor() {
    this.client = null;

    this.connected = false;

    this.config = {
      host: 'YOUR_EMQX_HOST',
      port: 8084,
      protocol: 'wss',

      username: 'YOUR_DASHBOARD_USERNAME',
      password: 'YOUR_DASHBOARD_PASSWORD',

      topic: 'smartstreetlight/+/telemetry',

      clientId:
        'dashboard-' +
        Math.random().toString(16).substring(2)
    };

    this.listeners = {
      message: [],
      connected: [],
      disconnected: [],
      error: []
    };
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;

    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`MQTT listener error (${event}):`, error);
      }
    });
  }

  isConfigured() {
    return (
      this.config.host &&
      this.config.host !== 'YOUR_EMQX_HOST' &&
      this.config.username &&
      this.config.username !== 'YOUR_DASHBOARD_USERNAME'
    );
  }

  connect(customConfig = {}) {
    if (typeof mqtt === 'undefined') {
      const error = new Error(
        'MQTT.js library is not loaded.'
      );

      this.emit('error', error);
      return;
    }

    this.config = {
      ...this.config,
      ...customConfig
    };

    this.disconnect();

    const url =
      `${this.config.protocol}://${this.config.host}:${this.config.port}/mqtt`;

    console.log('[MQTT] Connecting:', url);

    try {
      this.client = mqtt.connect(url, {
        clientId: this.config.clientId,

        username: this.config.username,
        password: this.config.password,

        clean: true,

        connectTimeout: 10000,

        reconnectPeriod: 3000,

        keepalive: 30
      });

      this.client.on('connect', () => {
        console.log('[MQTT] Connected');

        this.connected = true;

        this.client.subscribe(
          this.config.topic,
          { qos: 0 },
          (error) => {
            if (error) {
              console.error(
                '[MQTT] Subscription failed:',
                error
              );

              this.emit('error', error);
              return;
            }

            console.log(
              '[MQTT] Subscribed:',
              this.config.topic
            );

            this.emit('connected', {
              host: this.config.host,
              port: this.config.port,
              topic: this.config.topic
            });
          }
        );
      });

      this.client.on('message', (topic, payload) => {
        this.handleMessage(topic, payload);
      });

      this.client.on('reconnect', () => {
        console.log('[MQTT] Reconnecting...');
      });

      this.client.on('close', () => {
        this.connected = false;

        console.warn('[MQTT] Connection closed');

        this.emit('disconnected');
      });

      this.client.on('offline', () => {
        this.connected = false;

        console.warn('[MQTT] Offline');
      });

      this.client.on('error', (error) => {
        console.error('[MQTT] Error:', error);

        this.emit('error', error);
      });

    } catch (error) {
      console.error(
        '[MQTT] Connection exception:',
        error
      );

      this.emit('error', error);
    }
  }

  handleMessage(topic, payload) {
    try {
      const text = payload.toString();

      const data = JSON.parse(text);

      console.log(
        '[MQTT]',
        topic,
        data
      );

      this.emit('message', {
        topic,
        data
      });

    } catch (error) {
      console.error(
        '[MQTT] Invalid JSON payload:',
        payload.toString()
      );

      this.emit('error', error);
    }
  }

  publish(topic, data, options = {}) {
    if (!this.client || !this.connected) {
      console.warn(
        '[MQTT] Cannot publish: not connected'
      );

      return false;
    }

    const payload =
      typeof data === 'string'
        ? data
        : JSON.stringify(data);

    this.client.publish(
      topic,
      payload,
      options
    );

    return true;
  }

  disconnect() {
    if (this.client) {
      try {
        this.client.end(
          true
        );
      } catch (error) {
        console.warn(
          '[MQTT] Disconnect error:',
          error
        );
      }
    }

    this.client = null;
    this.connected = false;
  }
}

window.mqttService = new MQTTService();