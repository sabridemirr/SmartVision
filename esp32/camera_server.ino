/* Smart Vision: AI Thinker ESP32-CAM / OV2640, Arduino ESP32 core 3.x.
   JPEG endpoint supplies CORS-readable frames. No images are persisted.
   See README for the official example's optional MJPEG endpoint. */
#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_server.h"
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
httpd_handle_t server = NULL;
static esp_err_t capture(httpd_req_t *req) {
  camera_fb_t *frame = esp_camera_fb_get();
  if (!frame) { httpd_resp_send_err(req, HTTPD_500_INTERNAL_SERVER_ERROR, "Capture failed"); return ESP_FAIL; }
  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_hdr(req, "Cache-Control", "no-store");
  esp_err_t result = httpd_resp_send(req, (const char*)frame->buf, frame->len);
  esp_camera_fb_return(frame);
  return result;
}
void setup() {
  Serial.begin(115200);
  camera_config_t config = {};
  config.ledc_channel = LEDC_CHANNEL_0; config.ledc_timer = LEDC_TIMER_0;
  // AI Thinker pin mapping; use the official mapping for other camera boards.
  config.pin_d0 = 5; config.pin_d1 = 18; config.pin_d2 = 19; config.pin_d3 = 21;
  config.pin_d4 = 36; config.pin_d5 = 39; config.pin_d6 = 34; config.pin_d7 = 35;
  config.pin_xclk = 0; config.pin_pclk = 22; config.pin_vsync = 25; config.pin_href = 23;
  config.pin_sccb_sda = 26; config.pin_sccb_scl = 27; config.pin_pwdn = 32; config.pin_reset = -1;
  config.xclk_freq_hz = 20000000; config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_VGA; config.jpeg_quality = 12; config.fb_count = 1;
  config.fb_location = psramFound() ? CAMERA_FB_IN_PSRAM : CAMERA_FB_IN_DRAM;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  if (esp_camera_init(&config) != ESP_OK) { Serial.println("Camera initialization failed. Check board, power, and ribbon cable."); return; }
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 30000) { delay(500); Serial.print('.'); }
  if (WiFi.status() != WL_CONNECTED) { Serial.println("\nWi-Fi failed. Check credentials, use 2.4 GHz, then reset."); return; }
  WiFi.setAutoReconnect(true);
  httpd_config_t httpConfig = HTTPD_DEFAULT_CONFIG();
  if (httpd_start(&server, &httpConfig) == ESP_OK) {
    httpd_uri_t endpoint = {}; endpoint.uri = "/capture"; endpoint.method = HTTP_GET; endpoint.handler = capture;
    httpd_register_uri_handler(server, &endpoint);
    Serial.print("\nCamera IP: "); Serial.println(WiFi.localIP());
    Serial.print("Snapshot: http://"); Serial.print(WiFi.localIP()); Serial.println("/capture");
  }
}
void loop() { delay(1000); }
