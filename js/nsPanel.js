class sendto
{
    static #nsTopics = flow.get("nsTopics");

    static #sendTo(output, message)
    {
        const messages = new Array(node.outputCount).fill(null);
        messages[output] = message;
        node.send(messages);
    }

    static tasmota(command, params = undefined)
    {
        const msg = sendto.#nsTopics.buildCmndMsg(command, params);
        this.#sendTo(0, msg);
    }

    static nspanel(payload)
    {
        const msg = sendto.#nsTopics.buildCmndMsg("NSPSend", payload);
        this.#sendTo(0, msg);
    }

    static ha(entity, action, data = undefined)
    {
        var payload = {};
        payload.action = action;
        payload.target = { "entity_id": [entity] };

        if (data != undefined)
        {
            payload.data = data;
        }
        this.#sendTo(1, { "payload": payload });
    }

    static flow(msg, asPayload = true)
    {
        if (asPayload)
        {
            this.#sendTo(2, { "payload": msg });
        }
        else
        {
            this.#sendTo(2, msg);
        }
    }
}

class nsHomeScreen
{
    setTemperature(value)
    {
        sendto.nspanel({ "temperature": helpers.calcTemp(value), "tempUnit": helpers.tempUnit });
    }

    setHumidity(value)
    {
        value = isFinite(value) ? Math.round(value) : 0;
        sendto.nspanel({ "humidity": value, "tempUnit": helpers.tempUnit });
    }

    setDateTime(value = undefined)
    {
        var dt = value == undefined ? new Date() : value;
        sendto.nspanel({
            "year": dt.getFullYear(),
            "mon": dt.getMonth(),
            "day": dt.getDate(),
            "hour": dt.getHours(),
            "min": dt.getMinutes(),
            "week": dt.getDay()
        });
    }

    setWeather(condition, temp, tempMin, tempMax)
    {
        sendto.nspanel({ "HMI_weather": condition, "HMI_outdoorTemp": { "current": temp, "range": `${tempMin},${tempMax}` } });
    }
}

class haEntity
{
    id

    constructor(id)
    {
        this.id = id;
    }

    get state()
    {
        const states = global.get("homeassistant").homeAssistant.states;
        return states[this.id].state;
    }

    get attributes()
    {
        const states = global.get("homeassistant").homeAssistant.states;
        return states[this.id].attributes;
    }

    get stateOnOff()
    {
        switch (this.state)
        {
            case "y":
            case "yes":
            case "true":
            case "on":
            case "home":
            case "open":
                return "on";

            default:
                return "off";
        }
    }

    get stateBool()
    {
        return this.stateOnOff == "on";
    }

    set stateOnOff(value)
    {
        if (this.stateOnOff != value)
        {
            switch (value)
            {
                case "on":
                    this.performAction("turn_on");
                    break;

                case "off":
                    this.performAction("turn_off");
                    break;
            }
        }
    }

    get online()
    {
        var cur_state = this.state;
        return !(cur_state == "unknown" || cur_state == "unavailable");
    }

    performAction(action, data = undefined)
    {
        var domain = undefined;
        var dot_indx = this.id.indexOf(".");
        if (dot_indx > 0)
        {
            domain = this.id.substring(0, dot_indx)
        }
        else 
        {
            return null;
        }

        sendto.ha(this.id, `${domain}.${action}`, data);
    }
}

class nsWidget
{
    index; ctype; id; //uiid - optional if ctype!=scene
    label; entities;

    constructor(cwidget)// widget object from config
    {
        this.index = cwidget.index;
        this.ctype = cwidget.ctype;
        this.id = cwidget.index.toString();
        this.label = cwidget.label ?? " ";
        var info = this.#getWidgetInfo(cwidget);

        if (info.uiid != undefined)
        {
            this.uiid = info.uiid;
            this.cuiid = cwidget.uiid;
        }

        this.entities = cwidget.entities.slice(0, info.maxEntities).map((id) => new haEntity(id));
    }

    #getWidgetInfo(cwidget)
    {
        var result = {
            uiid: undefined,
            maxEntities: 1
        }

        if (cwidget.ctype == "scene")
        {
            return result; //uiid:undefined, maxEntities:1
        }

        cwidget.entities.slice(0, 4); //max 4 entities
        var entitiesCount = cwidget.entities.length;

        switch (cwidget.uiid)
        {
            case "hswitch":
                result.uiid = entitiesCount;
                result.maxEntities = 4;
                break;

            case "vswitch":
                result.uiid = entitiesCount + 5;
                result.maxEntities = 4;
                break;

            case "curtain":
                result.uiid = 11;
                result.maxEntities = 10;
                break;

            case "rgblight":
                result.uiid = 33;
                result.maxEntities = 10;
                break;

            case "dimmablelight":
                result.uiid = 44;
                result.maxEntities = 10;
                break;

            case "cctlight":
                result.uiid = 52;
                result.maxEntities = 10;
                break;

            case "rgbcctlight":
                result.uiid = 69;
                result.maxEntities = 10;
                break;

            case "acc":
                result.uiid = 151;
                result.maxEntities = 10;
                break;

            default:
                return undefined;

        }

        return result;
    }

    toHmiResources()
    {
        var result = {
            "HMI_resources": [{
                "index": this.index,
                "ctype": this.ctype,
                "id": this.id
            }]
        };

        if (this.uiid != undefined) result.HMI_resources[0].uiid = this.uiid;
        return result;
    }

    toRelation(params = undefined)
    {
        var relation = {
            //"ctype": this.ctype, //<= not required
            "id": this.id,
            "name": this.label
        };

        if (this.ctype == "device")
        {
            relation.online = this.entities.every((entity) => entity.online);
        }

        if (params != undefined)
        {
            relation.params = params;
        }
        return { "relation": [relation] };
    }

    update(params = undefined)
    {
        sendto.nspanel(this.toRelation(params));
    }

    static toDelete(indx)
    {
        return { "index": indx, "type": "delete" }
    }
}

class nsWidgets
{
    #widgets = [];

    add(cwidget)
    {
        var widget = this.find(cwidget.index);

        //If widget not found
        if (widget == undefined)
        {
            widget = new nsWidget(cwidget);
            this.#widgets.push(widget);
        }

        //Update screen
        sendto.nspanel(widget.toHmiResources());
        return widget;
    }

    remove(indx)
    {
        this.#widgets = this.#widgets.filter((widget) => widget.index != indx);
        sendto.nspanel(nsWidget.toDelete(indx));
    }

    clear()
    {
        for (let indx = 1; indx <= 8; indx++)
        {
            this.remove(indx);
        }
    }

    find(id)
    {
        return this.#widgets.find((widget) => widget.id == id);
    }

    filterByEntityId(id)
    {
        return this.#widgets.filter((widget) => widget.entities.some((entity) => entity.id == id));
    }

    getAll()
    {
        return this.#widgets;
    }
}

class nsThermostat
{
    //------Consts
    #config = env.get("config");
    #storeId = "nsThermostat";
    #id = "atc"; // thermostat id used in messages
    #options = [// array of options for thermostat screen
        { name: "ATCMode", get: () => this.#panelState.mode },
        { name: "ATCEnable", get: () => this.#panelState.enabled },
        { name: "ATCExpect0", get: () => helpers.calcTemp(this.#panelState.manualTemp) },
        { name: "ATCExpect1", get: () => helpers.calcTemp(this.#panelState.autoTemp) }
    ];

    //------From env.config
    #enabled = false; // true if thermostat enabled in config
    #type;//hot or cold
    #hysteresis;// temp offset for enable heating/cooling
    #entities;// entities to control with thermostat

    //------Internal use variables
    #roomTemp; // current room temperature
    #state; // iddle/heating/cooling

    #panelState =
        {
            mode: 1, //0 manual, 1 auto
            enabled: 1, //0 off, 1 on
            manualTemp: 20, //0 temperature for manual mode
            autoTemp: 20 //1 temperature for auto mode
        }

    constructor()
    {
        this.#enabled = this.#config.thermostat != undefined;

        if (this.#enabled)
        {
            const cthermostat = this.#config.thermostat;
            this.#type = cthermostat.type == "cold" ? "cold" : "hot";
            this.#hysteresis = (cthermostat.hysteresis > 0 && cthermostat.hysteresis <= 5) ? cthermostat.hysteresis : 1;
            if (this.#config.thermostat.entities != undefined)
            {
                this.#entities = this.#config.thermostat.entities.map((id) => new haEntity(id));
            }
            //Load state
            const panelState = flow.get(this.#storeId);
            if (panelState != undefined)
            {
                this.#panelState = panelState;
            }
        }
        else
        {
            //Clear settings
            flow.set(this.#storeId, undefined);
        }
    }

    //Send value of specified option (string) to screen
    //If option parameter is undefined send all options
    #sendOption(option)
    {
        var options = option == undefined ? this.#options : this.#options.filter((m) => m.name == option);

        options.forEach((m) => 
        {
            var msg = {};
            msg[m.name] = m.get();
            sendto.nspanel(msg);
        });
    }

    #updateSwitch()
    {
        sendto.nspanel({ "relation": { "id": this.#id, "params": { "switch": this.stateOnOff } } });
    }

    #updateEntities()
    {
        if (this.#entities != undefined)
        {
            this.#entities.forEach((entity) => entity.stateOnOff = this.stateOnOff);
        }
    }

    #updateState()
    {
        var state = this.#state ?? "iddle";

        //If thermostat enabled and all temps is valid
        if (this.#panelState.enabled == 1 &&
            this.#roomTemp != undefined)
        {
            //temp set in thermostat
            const setTemp = this.#panelState.mode == 0 ? this.#panelState.manualTemp : this.#panelState.autoTemp;

            //low hysteresis point reach
            const tooCold = this.#roomTemp <= (setTemp - this.#hysteresis);

            //high hysteresis point reach
            const tooHot = this.#roomTemp >= (setTemp + this.#hysteresis);

            //true if heating or cooling
            var working = state != "iddle";

            //hot mode
            if (this.#type == "hot")
            {
                if (tooHot && working) working = false;
                if (tooCold && !working) working = true;
            }
            //cold
            else
            {
                if (tooCold && working) working = false;
                if (tooHot && !working) working = true;
            }
            state = working ? (this.type == "hot" ? "heating" : "cooling") : "iddle";
        }
        else //If thermostat disabled or invalid temps.
        {
            state = "iddle";
        }

        if (state != this.#state)
        {
            this.#state = state;
            this.#updateSwitch();
            this.#updateEntities();
            sendto.flow(`ATC.${state.charAt(0).toUpperCase() + state.slice(1)}`);
        }
    }

    saveState()
    {
        if (this.#enabled)
        {
            flow.set(this.#storeId, this.#panelState);
        }
    }

    updateScreen()
    {
        if (this.#enabled)
        {
            //Enable thermostat screen
            sendto.nspanel({ "HMI_ATCDevice": { "ctype": "device", "id": this.#id, "etype": this.#type } });
            this.#sendOption();
            this.#updateSwitch();
        }
        else
        {
            //Disable thermostat screen
            sendto.nspanel({ "HMI_ATCDevice": {} });
        }
    }

    //Setters--------------------

    set roomTemp(value)
    {
        if (this.#enabled && value != this.#roomTemp)
        {
            this.#roomTemp = isFinite(value) ? +(+value).toFixed(2) : undefined;
            this.#updateState();
        }
    }

    set manualTemp(value)
    {
        value = helpers.trimRange(value, 4, 35); //trim to min-max thermostat range
        if (this.#enabled && value != undefined && value != this.#panelState.manualTemp)
        {
            this.#panelState.manualTemp = +value.toFixed(2);
            this.#sendOption("ATCExpect0");
            this.#updateState();
        }
    }

    set autoTemp(value)
    {
        value = helpers.trimRange(value, 4, 35);//trim to min-max thermostat range
        if (this.#enabled && value != undefined && value != this.#panelState.autoTemp)
        {
            this.#panelState.autoTemp = +value.toFixed(2);
            this.#sendOption("ATCExpect1");
            this.#updateState();
        }
    }

    set mode(value)
    {
        value = value == 0 ? 0 : 1; // 0 manual 1 auto
        if (this.#enabled && value != this.#panelState.mode)
        {
            this.#panelState.mode = value;
            this.#sendOption("ATCMode");
            this.#updateState();
        }
    }

    set enabled(value)
    {
        value = value == 1 ? 1 : 0; //1 enabled 0 disabled
        if (this.#enabled && value != this.#panelState.enabled)
        {
            this.#panelState.enabled = value;
            this.#sendOption("ATCEnable");
            this.#updateState();
        }
    }

    //Getters--------------------

    get type()
    {
        return this.#type;
    }

    get hysteresis()
    {
        return this.#hysteresis;
    }

    get roomTemp()
    {
        return this.#roomTemp;
    }

    get state()
    {
        return this.#state;
    }

    get stateOnOff()
    {
        if (this.#enabled)
        {
            return (this.#state == "heating" || this.#state == "cooling") ? "on" : "off";
        }
        else
        {
            return undefined;
        }
    }

    get mode()
    {
        return this.#enabled ? this.#panelState.mode : undefined;
    }

    get enabled()
    {
        return this.#enabled ? this.#panelState.enabled : undefined;
    }

    get manualTemp()
    {
        return this.#enabled ? this.#panelState.manualTemp : undefined;
    }

    get autoTemp()
    {
        return this.#enabled ? this.#panelState.autoTemp : undefined;
    }
}


class nsBuzzer
{
    #interval;

    #playSound(sound)
    {
        switch (sound)
        {
            case "info":
                sendto.tasmota("Buzzer", "1,1,1");
                break;

            case "confirm":
                sendto.tasmota("Buzzer", "2,1,1");
                break;

            case "error":
                sendto.tasmota("Buzzer", "2,5,2");
                break;

            case "alarm":
                sendto.tasmota("Buzzer", "5,2,1");
                break;
        }
    }

    playLoop(sound)
    {
        this.stopLoop();
        this.#playSound(sound);
        this.#interval = setInterval(this.#playSound, 3000, sound);
    }

    stopLoop()
    {
        if (this.#interval != undefined)
        {
            clearInterval(this.#interval);
            this.#interval = undefined;
        }
    }

    get playingLoop()
    {
        return this.#interval != undefined;
    }

    //Info short sound
    info()
    {
        this.#playSound("info");
    }

    //Confirm two short beeps
    confirm()
    {
        this.#playSound("confirm");
    }

    //Error two long beeps
    error()
    {
        this.#playSound("error");
    }

    //Alarm five beeps
    alarm()
    {
        this.#playSound("alarm");
    }
}

class nsPanel
{
    #homeScreen = new nsHomeScreen();
    #widgets = new nsWidgets();
    #thermostat = new nsThermostat();
    #buzzer = new nsBuzzer();

    get homeScreen()
    {
        return this.#homeScreen;
    }

    get widgets()
    {
        return this.#widgets;
    }

    get thermostat()
    {
        return this.#thermostat;
    }

    get buzzer() 
    {
        return this.#buzzer;
    }

    //Query screen version
    queryVersion()
    {
        sendto.nspanel({ "queryInfo": "version" });
    }

    //Enter factory test mode
    enterTestMode()
    {
        sendto.nspanel({ "queryInfo": "factory" });
    }

    //Query screen orientation
    queryScreenOrientation()
    {
        sendto.nspanel({ "queryInfo": "direction" });
    }

    //Set Energy-saving mode
    //0 = screen always on
    //1 = screen off
    setEcoMode(mode)
    {
        if (mode == 0 || mode == 1)
        {
            sendto.nspanel({ "HMI_dimOpen": +mode });
        }
    }

    //Set main screen Background/Wallpaper
    //0 = bedroom
    //1 = livingroom
    //2 = black (FW 1.5+)
    setWallpaper(value)
    {
        if (value == 0 || value == 1 || value == 2)
        {
            sendto.nspanel({ "HMI_wallpaper": +value });
        }
    }

    //Restart nsPanel
    restart()
    {
        sendto.tasmota("Restart", "1");
    }
}

//-------------------------------------------------------------------

class nsHelpers
{
    #config = env.get("config");
    //Temperature unit 0=C, 1=F
    #temp_unit;

    constructor() 
    {
        //Set temp unit from config
        this.#temp_unit = this.#config.temperature_unit == "F" ? 1 : 0;
    }

    get tempUnit()
    {
        return this.#temp_unit;
    }

    remap(value, fromMin, fromMax, toMin, toMax)
    {
        value = +value;
        return Math.round(
            (value - fromMin) * (toMax - toMin) / (fromMax - fromMin) + toMin);
    }

    invertValueInRange(value, min, max)
    {
        value = +value;
        return max + min - value;
    }

    trimRange(value, min, max)
    {
        if (isFinite(value))
        {
            value = +value;
            if (value < min) return +min;
            if (value > max) return +max;
            return value;
        }
        return undefined;
    }

    get #tempCalibration()
    {
        var calibration = this.#config.temperature_calibration;
        return calibration == undefined ? 0 : calibration;
    }

    get #tempMultipler()
    {
        var multipler = this.#config.temperature_multipler;
        return (multipler == undefined || multipler <= 0) ? 1 : multipler;
    }

    calcTemp(value, defaultValue = 0)
    {
        if (isFinite(value))
        {
            value = +value;
            value = (value + this.#tempCalibration) * this.#tempMultipler;
            return +(Math.round(value).toFixed(2));
        }
        return defaultValue;
    }

    divideTemp(value)
    {
        if (isFinite(value))
        {
            //+ for convert to number
            return +(value / this.#tempMultipler).toFixed(2);
        }
        return undefined;
    }
}

const helpers = new nsHelpers();
flow.set("helpers", helpers);

const panel = new nsPanel();
flow.set("nsPanel", panel);

return null;