module.exports = {
  up: queryInterface => (
    queryInterface.bulkInsert('users', [
      {
        email: 'fabien@busy.org',
        email_is_verified: true,
        last_attempt_verify_email: new Date(),
        phone_number: '+66102030405',
        phone_number_is_verified: false,
        last_attempt_verify_phone_number: new Date(),
        ip: '100.1.2.300.4',
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        account_is_created: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ], {})
  ),
  down: queryInterface => queryInterface.bulkDelete('apps', null, {}),
};
