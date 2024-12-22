class nsTopics
{
    #config = env.get("config");

    #base_tele; // NSPanel/tele/
    #base_cmnd;// NSPanel/cmnd/
    #result; // NSPanel/tele/RESULT
    #lwt;// NSPanel/tele/LWT
    #sensor; // NSPanel/tele/SENSOR

    constructor()
    {
        this.#base_tele = this.#config.tele_topic;
        this.#base_cmnd = this.#config.cmnd_topic;

        this.#result = this.buildTeleTopic("RESULT");
        this.#lwt = this.buildTeleTopic("LWT");
        this.#sensor = this.buildTeleTopic("SENSOR");
    }

    #buildTopic(prefix, sufix)
    {
        return path.join(prefix, "/", sufix);
    }

    buildTeleTopic(sufix)
    {
        return this.#buildTopic(this.#base_tele, sufix);
    }

    buildCmndTopic(cmnd)
    {
        return this.#buildTopic(this.#base_cmnd, cmnd);
    }

    buildCmndMsg(cmnd, params = undefined)
    {
        params = params == undefined ? "" : params;//If params undefined send empty message
        cmnd = this.buildCmndTopic(cmnd);
        return { "cmnd": cmnd, "payload": params };
    }

    buildSubscribeMsg(topic)
    {
        return { "action": "subscribe", "topic": topic };
    }

    //Getters ------------------------------------

    get baseTele()
    {
        return this.#base_tele;
    }

    get baseCmnd()
    {
        return this.#base_cmnd;
    }

    get RESULT()
    {
        return this.#result;
    }

    get LWT()
    {
        return this.#lwt;
    }

    get SENSOR()
    {
        return this.#sensor;
    }
}

const nstopics = new nsTopics();
flow.set("nsTopics", nstopics);