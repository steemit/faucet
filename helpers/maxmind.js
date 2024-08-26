import maxmind from 'maxmind';
const geoip = maxmind.openSync('./GeoIP2-Country.mmdb');
export default geoip;
