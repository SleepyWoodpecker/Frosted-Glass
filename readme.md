# Frosted Glass, a visualization tool for ESP32s

Michael said that microcontrollers are like black boxes, so this is an attempt to give us a better glimpse of what is going on inside them. This doesn't tell the full story, but still gives us better ideas of what is going on, kind of like a frosted glass box, which is still a one up on a black box.

## Demo

[https://github.com/user-attachments/assets/547e7278-478d-4ce5-8771-f105c679c094](https://github.com/user-attachments/assets/547e7278-478d-4ce5-8771-f105c679c094)

### Details

- To be used with the instrumentation library found <a href="https://github.com/UCLA-Rocket-Project/Frosted-Glass-Instrumentation/">here</a>
- Currently only logging traces via UART, which only supports single threaded `loop()` running at 100Hz (there are plans to make this WiFi compatible though)
