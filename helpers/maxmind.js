const maxmind = require('maxmind');

const geoip = maxmind.openSync('./GeoIP2-Country.mmdb');

module.exports = geoip;
