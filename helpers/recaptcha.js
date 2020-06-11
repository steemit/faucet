const reloadRecaptcha = () => {
    for (
        let i = document.getElementsByTagName('script').length - 1;
        i >= 0;
        i -= 1
    ) {
        const scriptNode = document.getElementsByTagName('script')[i];
        if (scriptNode.src.includes('recaptcha')) {
            scriptNode.parentNode.removeChild(scriptNode);
        }
    }
    delete window.grecaptcha;

    const callbackName = "onloadcallback";
    const lang = typeof window !== "undefined"
                    && window.recaptchaOptions
                    && window.recaptchaOptions.lang ?
                        `&hl=${window.recaptchaOptions.lang}` :
                        "";
    const url = `https://www.google.com/recaptcha/api.js?onload=${callbackName}&render=explicit${lang}`;

    const newScriptNode = document.createElement("script");

    newScriptNode.src = url;
    newScriptNode.async = 1;
    window.onloadcallback = () => {
        window.grecaptcha.reset();
    };

    document.body.appendChild(newScriptNode);
}

export default reloadRecaptcha;