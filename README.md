# Smart Vision

A responsive, accessible student prototype written in HTML, CSS, and vanilla JavaScript. Real webcam or ESP32 camera frames are processed in the browser using TensorFlow.js and COCO-SSD. No fabricated detections, image uploads, or image storage. Preferences alone are saved in localStorage.

## Run in VS Code

1. Open this SmartVision folder in VS Code.
2. In its terminal, run `python3 -m http.server 8000 --bind 0.0.0.0` (requires Python 3). Alternatively use VS Code Live Server.
3. Open http://localhost:8000 on the computer. Do not open index.html through file:// because JavaScript modules require a server.
4. Select **Device webcam · testing** and press **Start Camera**. Allow camera access. The app downloads TensorFlow.js and model weights once per page session. Initial loading needs internet access.
5. Place everyday objects such as a cup, bottle, chair, phone, or backpack in view. All 80 COCO-SSD categories are enabled, including people, vehicles, animals, furniture, and traffic fixtures. Actual results above the selected confidence appear with boxes. Webcam mode is real testing, not simulated data.
6. Press **Describe Surroundings**. Choose English or Turkish; ensure an appropriate system voice is installed. Pair Bluetooth earphones using the operating system. Use Stop Speaking at any time.
7. Automatic announcement mode has a ten-second cooldown, or thirty seconds for an unchanged set of object classes. Manual mode is the default. Processing rate is independent of announcement mode.

The webcam preview renders independently of AI using animation frames; the webcam requests up to 30 FPS. ESP32 snapshots refresh independently with a maximum request rate of 10 FPS, limited by Wi-Fi and hardware, with only one request in flight. AI runs serially at the selected maximum rate (0.5–4 detections per second) using a reusable input canvas capped at 640 pixels wide. Boxes represent recent observations, may trail moving objects, and expire after one second. Actual preview and AI rates depend on the device. The FPS badge reports AI throughput, not video FPS.

New sessions default to 50% confidence; the slider permits 30–90%. Saved preferences are retained, so existing users should lower their saved 70% setting if objects are missed. Lower thresholds increase false positives.

## Smartphone

Connect the phone and computer to the same trusted Wi-Fi. Open `http://COMPUTER_LAN_IP:8000` for ESP32 mode; allow local-network permission if requested. HTTP access to a LAN computer does not enable phone webcam access. For phone webcam testing, serve the frontend over trusted HTTPS (for example a development HTTPS tunnel) and select webcam mode. An HTTPS frontend generally cannot fetch an HTTP ESP32 due to mixed-content restrictions. Use the local HTTP page for ESP32, or a correctly configured HTTPS same-origin proxy; this project does not include a proxy. Do not disable browser security. Network access behavior varies by browser and must be tested on the target phone.

## Hardware and firmware

- AI Thinker ESP32-CAM with OV2640, stable 5 V supply, USB-to-serial programmer with 3.3 V UART logic, portable power source.
- A 2.4 GHz Wi-Fi network that permits device-to-device traffic (guest/client isolation must be off).
- Phone/laptop and optional paired Bluetooth earphones.

1. Install Arduino IDE and Espressif's ESP32 board package (3.x).
2. Create a sketch folder named `camera_server`, copy `esp32/camera_server.ino` into it, and open it. Select **AI Thinker ESP32-CAM** and the programmer's serial port.
3. Set WIFI_SSID and WIFI_PASSWORD in the sketch. Do not commit actual credentials publicly.
4. Connect programmer TX to U0R, RX to U0T, and common GND. Use a suitable stable 5 V supply to the board's 5 V input. Do not apply 5 V UART signals. Pull GPIO0 to GND for flashing, reset, upload, then remove GPIO0-to-GND and reset again.
5. Open Serial Monitor at 115200 baud. Read the printed Camera IP. If Wi-Fi fails after thirty seconds, check credentials and reset.
6. Open `http://CAMERA_IP/capture` in a browser to verify an actual JPEG is returned.
7. In Smart Vision select ESP32-CAM, enter just the IP (optionally `IP:PORT`), and Connect Camera. The firmware returns `Access-Control-Allow-Origin: *`, making pixels readable for AI. Use only a trusted LAN: this prototype has no camera authentication or TLS.

### Existing CameraWebServer firmware / MJPEG

Official example: https://github.com/espressif/arduino-esp32/tree/master/libraries/ESP32/examples/Camera/CameraWebServer

The official example can provide MJPEG at `http://CAMERA_IP:81/stream`. Configure the board in its board configuration file and Wi-Fi credentials in its main sketch. Confirm the `/capture` handler in `app_httpd.cpp` returns `Access-Control-Allow-Origin: *` (add `httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");` before sending the JPEG if absent). Smart Vision deliberately consumes `/capture` JPEG snapshots rather than reading the MJPEG `<img>`: cross-origin MJPEG rendering alone does not guarantee canvas pixel access, and snapshot requests allow bounded failure detection. The included minimal firmware exposes `/capture`, not a separate MJPEG server. Use the official example if independent MJPEG viewing is required. Endpoint settings are centralized in camera.js.

## Files

- index.html: semantic dashboard and controls.
- style.css: responsive navy/blue design, focus indicators, mobile layouts.
- script.js: lifecycle, independent preview, capture and serial AI loops, status rendering, saved settings.
- camera.js: webcam capture, CORS snapshots, timeout, cleanup and cancellation.
- detection.js: lazy single-load model, all-category recognition and canvas boxes.
- speech.js: browser voices, cooldown and speech cancellation.
- navigation.js: encoded Google Maps walking-directions URL.
- esp32/camera_server.ino: JPEG camera firmware.
- assets/: available for locally hosted assets.

## Test checklist

- Verify the webcam preview continues updating during slow AI inference; stop/reconnect during an outstanding inference and verify old results never reappear. Verify boxes expire after one second.
- Start and stop webcam; decline camera permissions; retry after allowing them.
- Load AI with internet, then recognize multiple object categories (including cup, bottle, phone, chair, and person) where available. Results are probabilistic, not guaranteed. Increase confidence to filter weak results.
- Test manual description, repeat, automatic cooldown, voice toggle, Turkish voice and Stop Speaking. No observations older than five seconds may be spoken.
- Disconnect ESP32 power/Wi-Fi: after an outstanding request times out (eight seconds), the app clears results, disconnects and announces the failure. Reconnect without refreshing.
- Switch tabs / open Maps: results and speech clear, processing pauses while hidden and resumes on return. Do not assume navigation and detection run simultaneously.
- Refresh and verify preferences persist. Camera connection never starts automatically.
- Check keyboard Tab order, Enter/Space controls and visible focus. At 375 px width verify no horizontal scrolling. With VoiceOver on iOS/Safari and TalkBack on Android/Chrome verify labels, live statuses and all controls. These physical-device / screen-reader checks need to be performed by the team; they have not been certified.

## Troubleshooting

- **Webcam unavailable:** use localhost or HTTPS, allow camera permission, close another app using it.
- **Camera fetch failed:** verify IP, /capture, Wi-Fi isolation, firewall and browser local-network permissions. HTTPS-to-HTTP mixed content and missing CORS headers cannot be fixed in frontend JavaScript.
- **AI unavailable:** check internet access to cdn.jsdelivr.net and model storage, then Retry AI. Keep camera running if desired. Initial library and model downloads are external; camera images are not sent to those services. Google Fonts is optional styling and falls back to system fonts.
- **Slow phone:** choose one detection every two seconds; the preview continues independently. Detection is serialized; actual FPS can be lower than selected.
- **No supported objects:** improve lighting and framing. COCO-SSD recognizes 80 trained categories, not arbitrary objects; stairs, curbs, potholes, glass barriers and drop-offs are not supported classes. A traffic-light detection does not identify its color or crossing safety; this says nothing about route safety.
- **No speech:** enable Voice Assistance, interact with the page, check system volume/audio output and install the selected language voice. Browser/OS voices may use network speech services; the app does not promise offline voice synthesis.
- **ESP32 resets:** check power stability and correct camera board pin mapping.

## Limits and privacy

This is supplementary environmental awareness, not a certified navigation or obstacle-avoidance product. It cannot determine distance, crossing safety, drop-offs, or whether a path is clear. Keep established mobility aids. Maps receives the destination when the user opens directions; Smart Vision does not store location history. Browser/device behavior can suspend processing in the background.

Implementation references: TensorFlow COCO-SSD documentation https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd and Espressif ESP32 camera driver https://github.com/espressif/esp32-camera. Firmware is provided for integration testing; no physical ESP32 or mobile screen-reader validation was performed during generation.

testing the collab
testing connection