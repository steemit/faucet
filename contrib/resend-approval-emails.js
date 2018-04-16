#!/usr/bin/env node

/**
 * Resends the approval emails to all users who where approved
 * before email verification was required.
 *
 * Needs the DATABASE_*, JWT_SECRET and SENDGRID_API_KEY env vars.
 */

const db = require('./../db/models')
const jwt = require('jsonwebtoken')
const mail = require('./../helpers/mail')

async function approveSignup(user) {
    const token = jwt.sign({
        type: 'create_account', email: user.email,
    }, process.env.JWT_SECRET)
    await mail.send(user.email, 'create_account', {
        url: `https://signup.steemit.com/create-account?token=${token}`
    })
}

async function main() {
    const users = await db.users.findAll({where: {
        status: 'approved',
        email_is_verified: false,
        account_is_created: false,
        phone_number_is_verified: true,
    }})
    console.log(`Processing ${ users.length } signups`)
    for (const user of users) {
        try {
            await approveSignup(user)
            console.log(`OK ${ user.id }`)
        } catch (error) {
            console.log(`ERROR ${ user.id } ${ user.email } ${ error.message }`)
        }
    }
    console.log('Done')
}

if (require.main === module) {
    main().then(() => {
        process.exit(0)
    }).catch((error) => {
        console.log('FATAL ERROR', error.message)
        process.exit(1)
    })
}
