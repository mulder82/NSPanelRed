class nsCommand
{
    #name; // String command name eg. NSPanel.
    #func; // command logic function
    #description; // Command description for help

    constructor(name, func, description)
    {
        this.#name = name;
        this.#func = func;
        this.#description = description;
    }

    get name()
    {
        return this.#name;
    }

    execute(arg)
    {
        return this.#func(arg);
    }

    get description()
    {
        return this.#description;
    }
}

class nsCommands
{
    #nsPanel = flow.get("nsPanel");
    #commands = []; // [nsCommand]

    constructor()
    {
        //NSPanel--------------------------------------

        this.#commands.push(new nsCommand("Restart", () =>
        {
            this.#nsPanel.restart();
            return "OK";
        },
            "Restart nsPanel."));

        this.#commands.push(new nsCommand("EnterTestMode", () => 
        {
            this.#nsPanel.enterTestMode();
            return "OK";
        },
            "Enter screen factory test mode. To leave this mode restart nsPanel."));

        this.#commands.push(new nsCommand("SetWallpaper", (arg) => 
        {
            this.#nsPanel.setWallpaper(arg);
            return "OK";
        },
            "Set home screen wallpaper (0-bedroom, 1-livingroom, 2-black for fw 1.5+)."));

        //Thermostat----------------------------------

        this.#commands.push(new nsCommand("ATC.SetManualTemp", (arg) => 
        {
            this.#nsPanel.thermostat.manualTemp = arg;
            return this.#nsPanel.thermostat.manualTemp;
        },
            "Set thermostat target temperature for manual mode."));

        this.#commands.push(new nsCommand("ATC.SetAutoTemp", (arg) => 
        {
            this.#nsPanel.thermostat.autoTemp = arg;
            return this.#nsPanel.thermostat.autoTemp;
        },
            "Set thermostat target temperature for auto mode."));

        this.#commands.push(new nsCommand("ATC.SetMode", (arg) => 
        {
            this.#nsPanel.thermostat.mode = arg;
            return this.#nsPanel.thermostat.mode;
        },
            "Set thermostat mode (0-manual, 1-auto)."));

        this.#commands.push(new nsCommand("ATC.SetEnabled", (arg) => 
        {
            this.#nsPanel.thermostat.enabled = arg;
            return this.#nsPanel.thermostat.enabled;
        },
            "Set thermostat enabled state (0-disabled, 1-enabled)."));

        this.#commands.push(new nsCommand("ATC.GetType", () => 
        {
            return this.#nsPanel.thermostat.type;
        },
            "Get thermostat type (hot or cold)."));

        this.#commands.push(new nsCommand("ATC.GetHysteresis", () =>
        {
            return this.#nsPanel.thermostat.hysteresis;
        },
            "Get thermostat hysteresis."));

        this.#commands.push(new nsCommand("ATC.GetRoomTemp", () => 
        {
            return this.#nsPanel.thermostat.roomTemp;
        },
            "Get current room temperature stored in thermostat."));

        this.#commands.push(new nsCommand("ATC.GetState", () => 
        {
            return this.#nsPanel.thermostat.state;
        },
            "Get thermostat state (heating, cooling, iddle)."));

        this.#commands.push(new nsCommand("ATC.GetStateOnOff", () => 
        {
            return this.#nsPanel.thermostat.stateOnOff;
        },
            "Get thermostat state (on or off)."));

        this.#commands.push(new nsCommand("ATC.GetMode", () => 
        {
            return this.#nsPanel.thermostat.mode;
        },
            "Get thermostat mode (0-manual, 1-auto)."));

        this.#commands.push(new nsCommand("ATC.GetEnabled", () => 
        {
            return this.#nsPanel.thermostat.enabled;
        },
            "Get thermostat enabled state (0-disabled, 1-enabled)."));

        this.#commands.push(new nsCommand("ATC.GetManualTemp", () => 
        {
            return this.#nsPanel.thermostat.manualTemp;
        },
            "Get thermostat target temperature for manual mode."));

        this.#commands.push(new nsCommand("ATC.GetAutoTemp", () => 
        {
            return this.#nsPanel.thermostat.autoTemp;
        },
            "Get thermostat target temperature for auto mode."));

        //Buzzer-------------------------------------------

        this.#commands.push(new nsCommand("Buzzer.PlayLoop", (arg) =>
        {
            this.#nsPanel.buzzer.playLoop(arg);
            return "OK";
        },
            "Plays a sound in loop until StopLoop is called."));

        this.#commands.push(new nsCommand("Buzzer.StopLoop", () =>
        {
            this.#nsPanel.buzzer.stopLoop();
            return "OK";
        },
            "Stop playing sound in loop."));

        this.#commands.push(new nsCommand("Buzzer.PlayingLoop", () =>
        {
            return this.#nsPanel.buzzer.playingLoop;
        },
            "Return true if buzzer playing sound in loop, otherwise return false."))

        this.#commands.push(new nsCommand("Buzzer.Info", () => 
        {
            this.#nsPanel.buzzer.info();
            return "OK";
        },
            "Play single info sound from internal buzzer."));

        this.#commands.push(new nsCommand("Buzzer.Confirm", () => 
        {
            this.#nsPanel.buzzer.confirm();
            return "OK";
        },
            "Play single confirm sound from internal buzzer."));

        this.#commands.push(new nsCommand("Buzzer.Error", () => 
        {
            this.#nsPanel.buzzer.error();
            return "OK";
        },
            "Play single error sound from internal buzzer."));

        this.#commands.push(new nsCommand("Buzzer.Alarm", () => 
        {
            this.#nsPanel.buzzer.alarm();
            return "OK";
        },
            "Play single alarm sound from internal buzzer."));
    }

    #getHelp()
    {
        this.#commands.forEach((cmnd) =>
        {
            node.send({ "payload": `${cmnd.name} => ${cmnd.description}` });
        });
    }

    execute(msg)
    {
        var cmnd = msg.command;
        const arg = msg.payload;

        if (cmnd == "GetHelp")
        {
            this.#getHelp();
            return;
        }

        cmnd = this.#commands.find((c) => c.name == cmnd);

        if (cmnd == undefined)
        {
            msg.payload = "Unknow command.";
            node.send(msg);
            return;
        }
        else
        {
            msg.payload = cmnd.execute(arg);
            node.send(msg);
        }
    }
}

const commands = new nsCommands();
flow.set("nsCommands", commands);

return null;