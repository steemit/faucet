module.exports = {
  up: queryInterface => (
    queryInterface.bulkInsert('users', [
      {
        email: 'fabien@busy.org',
        email_is_verified: true,
        last_attempt_verify_email: new Date(),
        phone_number: '+66102030405',
        phone_number_is_verified: false,
        phone_code_attempts: 1,
        phone_code: '84576',
        last_attempt_verify_phone_number: new Date(),
        ip: '100.1.2.300.4',
        account_is_created: false,
        created_at: new Date(),
        updated_at: new Date(),
        fingerprint: '{"date": "Fri Sep 15 2017 10:38:36 GMT+0200 (Paris, Madrid (heure d’été)", "device": {"renderer": "ANGLE (Intel(R) HD Graphics 4000 Direct3D11 vs_5_0 ps_5_0)", "vendor": "Google Inc."}, "lang": "fr-FR,fr,en-US,en,ms", "ref": "https://jsfiddle.net/", "ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36"}',
        username: 'fabien2017',
        booking_date: new Date(),
      },
    ], {})
  ),
  down: queryInterface => queryInterface.bulkDelete('users', null, {}),
};
