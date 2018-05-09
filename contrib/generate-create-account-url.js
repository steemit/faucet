const jwt = require('jsonwebtoken')
const email = process.argv[2]
const secret = process.env.JWT_SECRET
console.log('generating token for', email)
const token = jwt.sign({type: 'create_account', email}, secret)
console.log(`https://signup.steemit.com/create-account?token=${token}`)
