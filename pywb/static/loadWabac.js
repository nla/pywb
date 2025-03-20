class WabacReplay
{
  constructor(prefix, url, ts, staticPrefix) {
    this.prefix = prefix;
    this.url = url;
    this.ts = ts;
    this.staticPrefix = staticPrefix;
    const prefixSegments = new URL(prefix, "http://dummy").pathname.split("/");
    this.collName = prefixSegments[prefixSegments.length - 2];
    this.scope = new URL(this.staticPrefix.replace(/static$/, ""), "http://dummy").pathname;
    this.adblockUrl = undefined;

    this.queryParams = {};
  }

  async init() {
    const scope = this.scope;

    await navigator.serviceWorker.register(
      `${this.staticPrefix}/sw.js?` + new URLSearchParams(this.queryParams).toString(),
      { scope },
    );

    let initedResolve = null;

    const inited = new Promise((resolve) => initedResolve = resolve);

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data.msg_type === "collAdded") {
        // the replay is ready to be loaded when this message is received
        initedResolve();
      }
    });

    const baseUrl = new URL(window.location);
    baseUrl.hash = "";

    const proxyPrefix = "";

    const msg = {
      msg_type: "addColl",
      name: this.collName,
      type: "live",
      file: {"sourceUrl": `proxy:${proxyPrefix}`},
      skipExisting: true,
      extraConfig: {
        prefix: proxyPrefix,
        isLive: false,
        baseUrl: baseUrl.href,
        baseUrlHashReplay: true,
        noPostToGet: false,
        archivePrefix: `/${this.collName}/`,
        archiveMod: "ir_",
        adblockUrl: this.adblockUrl
      },
    };

    if (!navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        navigator.serviceWorker.controller.postMessage(msg);
      });
    } else {
      navigator.serviceWorker.controller.postMessage(msg);
    }

    window.addEventListener("message", event => {
      let data = event.data;
      if (data.wb_type !== "load") return;
      history.replaceState({}, data.title, this.prefix + data.ts + '/' + data.url);
      window.WBBanner.onMessage(event);
    });

    window.cframe = this;

    if (inited) {
      await inited;
    }

    this.load_url(this.url, this.ts);
  }

  // called by the Vue banner when the timeline is clicked
  load_url(url, ts) {
    const iframe = document.querySelector('#replay_iframe');
    iframe.src = `${this.scope}w/${this.collName}/${ts}mp_/${url}`;
  }
}
