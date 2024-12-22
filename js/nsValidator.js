const config = env.get("config");
const states = global.get("homeassistant").homeAssistant.states;

function entityFound(entity)
{
    return states[entity] != undefined;
}

class nsValidator
{
    #path;
    #condition;
    #errorMsg;

    constructor(path, condition, errorMsg)
    {
        this.#path = path;
        this.#condition = condition;
        this.#errorMsg = errorMsg;
    }

    validate()
    {
        //True if OK
        const result = this.#condition();
        if (!result) node.error(`Error => config.${this.#path} ${this.#errorMsg}`);
        return result;
    }
}

const tests = [];

//Topics
tests.push(new nsValidator("tele_topic", () => config.tele_topic != undefined, "undefined"));
tests.push(new nsValidator("cmnd_topic", () => config.cmnd_topic != undefined, "undefined"));

//Weather
tests.push(new nsValidator("weather", () => config.weather != undefined, "undefined"));
if (config.weather != undefined)
{
    tests.push(new nsValidator("weather", () => entityFound(config.weather), `entity "${config.weather}" not found`));
}

//Temperature
tests.push(new nsValidator("temperature", () => config.temperature != undefined, "undefined"));
if (config.temperature != undefined && config.temperature != "internal")
{
    tests.push(new nsValidator("temperature", () => entityFound(config.temperature), `entity "${config.temperature}" not found`));
}

//Humidity (optional)
if (config.humidity != undefined)
{
    tests.push(new nsValidator("humidity", () => entityFound(config.humidity), `entity "${config.humidity}" not found`));
}

//Thermostat
if (config.thermostat != undefined)
{
    const thermostat = config.thermostat;

    if (thermostat.entities != undefined)
    {
        for (let indx = 0; indx < thermostat.entities.length; indx++)
        {
            const entity = thermostat.entities[indx];
            const path = `thermostat.entities["${entity}"]`;
            tests.push(new nsValidator(path, () => entityFound(entity), "entity not found"));
        }
    }
}

//Widgets
if (config.widgets != undefined)
{
    for (let indx = 0; indx < config.widgets.length; indx++)
    {
        const path = `widgets[${indx}].`;
        const cwidget = config.widgets[indx];
        const validCtypes = ["device", "group", "scene"];
        const validUiids = ["hswitch", "vswitch", "curtain", "rgblight", "dimmablelight", "cctlight", "rgbcctlight", "acc"];

        tests.push(new nsValidator(path + "ctype", () => validCtypes.find((ct) => ct == cwidget.ctype) != undefined, `invalid value -> ${cwidget.ctype}`));
        tests.push(new nsValidator(path + "uiid", () => cwidget.ctype == "scene" || validUiids.find((ui) => ui == cwidget.uiid) != undefined, `invalid value -> ${cwidget.uiid}`));
        tests.push(new nsValidator(path + "entities", () => cwidget.entities != undefined, "undefined"));
        if (cwidget.entities != undefined)
        {
            for (let eindx = 0; eindx < cwidget.entities.length; eindx++)
            {
                const entity = cwidget.entities[eindx];
                const epath = path + `entities["${entity}"]`;
                tests.push(new nsValidator(epath, () => entityFound(entity), "entity not found"));
            }
        }
    }
}

var isValid = true;

tests.forEach((t) => isValid = isValid && t.validate());

return isValid ? msg : null;