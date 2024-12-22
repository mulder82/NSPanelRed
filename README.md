# NSPanelRed
## Easy integration of NSPanel with HomeAssistant using NodeRed
![Screenshot](https://github.com/mulder82/NSPanelRed/blob/main/assets/ns001.jpg)
# Features
1. Fully functional HomeScreen with weather forecast from HomeAssistant, temperature display from internal sensor or home assistant entity and humidity display from specified sensor entity,
2. Easy add widgets to control HomeAssistant entities and reacts when for state changes. Support of following widgets:
- Single, double, triple and quad switch,
- Curtain control,
- RGB light,
- Dimmable light,
- CCT light,
- RGBCCT light
3. Thermostat with heating or cooling mode, hysteresis and Auto/Manual modes,
4. Buzzer sounds support with single and loop playing,
5. Commands model for easy control display using NodeRed flows.
# Requirements
1. NSPanel with <b>oryginal</b> screen tft firmware,
2. MQTT Broker (see mosquito),
3. HomeAssistant (see homepage),
4. Node-Red (see homepage).
# Instalation
1. Flash NSPanel ESP32 with tasmota (link),
2. Connect tasmota to MQTT broker (link),
3. Import NSPanelRed subflow to NodeRed (link),
4. Configure subflow.
# Configuration
## Main config page
Setting|Description
--- | ---
Name|Name of the node
Config|Configuration JSON
MQTT|MQTT configuration node
HAServer|HomeAssistant server configuration node
## Configuration JSON
Name|Description|Value|Required
--- | --- | --- | ---
name|Panel name (for commands)|string|NO
group|Panel group (for commands)|string|NO
debug|Debug mode|bool|NO
eco_mode|Energy saving mode|0-dim, 1-off|NO
tele_topic|Tasmota tele topic|string|YES
cmnd_topic|Tasmota cmnd topic|string|YES
weather|Weather forecast entity name|string|YES
temperature|Temperature entity name or "internal" for internal NSPanel sensor|string|NO
temperature_unit|Temperature unit|C or F|NO
temperature_calibration|Temperature calibration, this value is added to input temperature and result is send to screen|number|YES
temperature_multipler|Temperature multipler, input temperature is multiplied by this value before send to screen|number|YES
humidity|Humidity entity name|string|YES
thermostat|Thermostat object|object|NO
thermostat.type|Type of thermostat, hot or cold|string|NO
thermostat.hysteresis|Thermostat hysteresis|number|NO
thermostat.entities|Array os entities to control (on/off) by thermostat|Array of string|NO
widgets|Array of widget object (max 8)|Array of object|NO
widget.index|Widget index on screen 1-8|number|YES
widget.ctype|Widget type (device, group or scene)|YES
widget.uiid|Widget uiid (hswitch, vswitch, curtain, rgblight, dimmablelight, cctlight, rgbcctlight, acc), scene doesnt have uiid|string|YES
widget.label|Widget label dispayed on screen (max 8 chars)|string|NO
widget.entities|Array of entities controled by widget. State of all entities will be set by widget but state of only first entity in array will be reflected on screen|array of string|YES
## Commands
> [!IMPORTANT]  
> If panel name or group is set in config all command messages for this display must have corresponding nsPanel/nsGroup keys with valid values. e.g. You have two panels on the first floor and two on the second floor with in groups “FirstFloor” and “SecondFloor” and you want all the panels on the first floor to restart, to do this you need to send a message: { “command”: “Restart”, “nsGroup”: “FirstFloor”}.  

Name|Desctiption|Parameters
--- | --- | ---
GetHelp|Print all available commands with description to debug pane|None
Restart|Restart nsPanel|None
EnterTestMode|Enter screen factory test mode. To leave this mode restart nsPanel|None
SetWallpaper|Set home screen wallpaper|0-bedroom, 1-livingroom, 2-black for fw 1.5+
ATC.SetManualTemp|Set thermostat target temperature for manual mode|Target temperature (number)
ATC.SetAutoTemp|Set thermostat target temperature for auto mode|Target temperature (number)
ATC.SetMode|Set thermostat mode|0-manual, 1-auto
ATC.SetEnabled|Set thermostat enabled state|0-disabled, 1-enabled
ATC.GetType|Get thermostat type (hot or cold)|None
ATC.GetHysteresis|Get thermostat hysteresis|None
ATC.GetRoomTemp|Get current room temperature stored in thermostat|None
ATC.GetState|Get thermostat state (heating, cooling, iddle)|None
ATC.GetStateOnOff|Get thermostat state (on or off)|None
ATC.GetMode|Get thermostat mode (0-manual, 1-auto)|None
ATC.GetEnabled|Get thermostat enabled state (0-disabled, 1-enabled)|None
ATC.GetManualTemp|Get thermostat target temperature for manual mode|None
ATC.GetAutoTemp|Get thermostat target temperature for auto mode|None
Buzzer.PlayLoop|Plays a sound in loop until StopLoop is called|info, confirm, error alarm
Buzzer.StopLoop|Stop playing sound in loop|None
Buzzer.PlayingLoop|Return true if buzzer playing sound in loop, otherwise return false|None
Buzzer.Info|Play single info sound from internal buzzer|None
Buzzer.Confirm|Play single confirm sound from internal buzzer|None
Buzzer.Error|Play single error sound from internal buzzer|None
Buzzer.Alarm|Play single alarm sound from internal buzzer|None
