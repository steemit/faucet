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
        status: null,
        username: 'fabien2017',
        username_booked_at: new Date(),
        metadata: JSON.stringify({ query: { uid: '12345' } }),
        creation_hash: '5a234b0a964be4a73c0bf78df675038e1e297c4726cd7340bfeeaf036ceeb885',
      },
      // Approved user with last attempt to verify email before fix in #246
      {
        email: 'iain@iainmaitland.com',
        email_is_verified: false,
        // Date before fix refs #246
        last_attempt_verify_email: new Date('2018-03-01T03:24:00'),
        phone_number: '+13136139172',
        phone_number_is_verified: false,
        phone_code_attempts: 1,
        phone_code: '123',
        last_attempt_verify_phone_number: new Date(),
        ip: '100.1.2.300.4',
        account_is_created: false,
        created_at: new Date(),
        updated_at: new Date(),
        fingerprint: '{"date": "Fri Sep 15 2017 10:38:36 GMT+0200 (Paris, Madrid (heure d’été)", "device": {"renderer": "ANGLE (Intel(R) HD Graphics 4000 Direct3D11 vs_5_0 ps_5_0)", "vendor": "Google Inc."}, "lang": "fr-FR,fr,en-US,en,ms", "ref": "https://jsfiddle.net/", "ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36"}',
        status: 'approved',
        username: 'raskolnikov',
        username_booked_at: new Date(),
        metadata: JSON.stringify({ query: { uid: '12345' } }),
        creation_hash: '5a234b0a964be4a73c0bf78df675038e1e297c4726cd7340bfeeaf036ceeb885',
      },
    ], {})
  ),
  down: queryInterface => queryInterface.bulkDelete('users', null, {}),
};
