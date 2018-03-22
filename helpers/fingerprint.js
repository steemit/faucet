function getContext(canvas) {
    const rv = canvas.getContext('webgl');
    if (!rv) {
        canvas.getContext('experimental-webgl');
    }
    return rv;
}

function getDevice(gl) {
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    if (!info) {
        throw new Error('Unable to get WEBGL_debug_renderer_info extension');
    }
    const vendor = gl.getParameter(info.UNMASKED_VENDOR_WEBGL);
    if (!vendor) {
        throw new Error('Unable to get UNMASKED_VENDOR_WEBGL parameter');
    }
    const renderer = gl.getParameter(info.UNMASKED_RENDERER_WEBGL);
    if (!renderer) {
        throw new Error('Unable to get UNMASKED_RENDERER_WEBGL parameter');
    }
    return { vendor, renderer };
}

function getFingerprint() {
    const rv = {};
    try {
        const canvas = document.createElement('canvas');
        const gl = getContext(canvas);
        if (!gl) {
            throw new Error('Unable to get webgl context');
        }
        rv.device = getDevice(gl);
    } catch (error) {
        rv.device = error.message || String(error);
    }
    rv.ua = navigator.userAgent;
    if (document.referrer && document.referrer.length > 0) {
        rv.ref = document.referrer;
    }
    if (navigator.languages) {
        rv.lang = navigator.languages.join(',');
    } else if (navigator.language) {
        rv.lang = navigator.language;
    }
    rv.date = String(new Date());
    return rv;
}

export default getFingerprint;
