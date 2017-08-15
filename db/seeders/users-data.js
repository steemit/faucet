module.exports = {
  up: queryInterface => (
    queryInterface.bulkInsert('users', [
      {
        username: 'fabien',
        email: 'fabien@busy.org',
        email_is_verified: true,
        phone_number: '+66102030405',
        phone_number_is_verified: false,
        ip: '100.1.2.300.4',
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ], {})
  ),

  down: queryInterface => queryInterface.bulkDelete('apps', null, {}),
};
