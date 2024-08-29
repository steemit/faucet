import maxmind from 'maxmind';
const geoip = maxmind.open('./GeoIP2-Country.mmdb');
export default geoip;
