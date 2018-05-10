const express = require('express');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('./../db/models');
const geoip = require('../helpers/maxmind');
const services = require('../helpers/services');
const { OAuth2Client } = require('google-auth-library');

const { Sequelize } = db;

const router = express.Router();

const { GOOGLE_CLIENT_ID, GOOGLE_AUTHORIZED_DOMAINS } = process.env;
if (!GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID env var not set');
}
if (!GOOGLE_AUTHORIZED_DOMAINS) {
    throw new Error('GOOGLE_AUTHORIZED_DOMAINS env var not set');
}

const client = new OAuth2Client(GOOGLE_CLIENT_ID);
const authorizedDomains = GOOGLE_AUTHORIZED_DOMAINS.split(',').map(domain =>
    domain.trim()
);

async function verifyToken(idToken) {
    const ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!authorizedDomains.includes(payload.hd)) {
        throw new Error('Unauthorized');
    }
    return payload;
}

// enable CORS
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header(
        'Access-Control-Allow-Headers',
        [
            'Accept',
            'Content-Type',
            'Origin',
            'X-Auth-Token',
            'X-Requested-With',
        ].join(', ')
    );
    next();
});

// serve the google client id
router.get('/client_id', (req, res) => {
    res.end(GOOGLE_CLIENT_ID);
});

// production endpoints to serve built scripts and handle routing
if (process.env.NODE_ENV === 'production') {
    const adminPath = path.join(__dirname, '../public/admin');
    const indexFile = fs.readFileSync(path.join(adminPath, 'index.html'));
    router.get('/static', express.static(path.join(adminPath, 'static')));
    router.get('/*', (req, res) => {
        res.end(indexFile);
    });
}

// require valid token for all POST requests
router.use((req, res, next) => {
    if (req.method !== 'POST') {
        next();
        return;
    }
    if (req.headers['x-auth-token']) {
        verifyToken(req.headers['x-auth-token']).then(
            user => {
                req.user = user;
                next();
            },
            error => {
                // return a different response code when a token expires
                // so the client can try to refresh it
                if (
                    error.message &&
                    error.message.startsWith('Token used too late')
                ) {
                    req.log.debug(error, 'Token expired');
                    res.status(412).json({ error: 'Token expired' });
                } else {
                    req.log.info(error, 'Unauthorized API call');
                    res.status(401).json({ error: 'Unauthorized' });
                }
            }
        );
    } else {
        res.status(400).json({ error: 'Missing token' });
    }
});

// register async handler
function addHandler(route, handler) {
    router.post(route, (req, res) => {
        handler(req, res).then(
            result => {
                res.status(200);
                if (result) {
                    res.json(result);
                }
                res.end();
            },
            error => {
                req.log.error(error, 'Admin API error');
                res.status(error.statusCode || 500);
                res.json({ error: error.message || 'Unknown error' });
                res.end();
            }
        );
    });
}

addHandler('/whoami', async req => ({ email: req.user.email }));

addHandler('/dashboard', async () => {
    // TODO: this could call out to overseer for some nice graphs
    const [approved, rejected, pending, created] = await Promise.all([
        db.users.count({ where: { status: 'approved' } }),
        db.users.count({ where: { status: 'rejected' } }),
        db.users.count({ where: { status: 'manual_review' } }),
        db.users.count({ where: { status: 'created' } }),
    ]);
    return {
        approved,
        rejected,
        pending,
        created,
    };
});

addHandler('/get_signup', async req => {
    const { where } = req.body;
    if (!where) {
        throw new Error('Missing where statement');
    }
    const user = await db.users.findOne({ where });
    if (!user) {
        throw new Error('Unknown user');
    }
    const actions = await db.actions.findAll({
        where: {
            [Sequelize.Op.or]: [{ ip: user.ip }, { user_id: user.id }],
        },
    });
    // TODO: geoip lookup should be stored per signup in database
    //       so that it is searchable
    const location = geoip.get(user.ip);
    return { user, actions, location };
});

addHandler('/list_signups', async req => {
    const { limit, order, offset, filters } = req.body;
    const query = {
        order: order || [['created_at', 'DESC']],
        limit: limit ? Math.min(limit, 100) : 10,
    };
    if (offset) {
        query.offset = offset;
    }
    if (Array.isArray(filters) && filters.length > 0) {
        const { or, eq, ne, like, notLike, and, gte, lte } = Sequelize.Op;
        const andList = [];
        for (const filter of filters) {
            // eslint-disable-line
            const { value } = filter;
            let name = filter.name
            let negate = false
            if (name[0] === '!') {
                negate = true
                name = name.slice(1)
            }
            const nLike = negate ? notLike : like
            const nEq = negate ? ne :  eq
            switch (name) {
                case 'text':
                    andList.push({
                        [negate ? and : or]: [
                            { email: { [nLike]: `%${value}%` } },
                            { username: { [nLike]: `%${value}%` } },
                            { phone_number: { [nLike]: `%${value}%` } },
                            { fingerprint: { [nLike]: `%${value}%` } },
                        ],
                    });
                    break;
                case 'status':
                    andList.push({ status: { [nEq]: value } });
                    break;
                case 'ip':
                    andList.push({ ip: { [nEq]: value } });
                    break;
                case 'from':
                    andList.push({ created_at: { [gte]: new Date(value) } });
                    break;
                case 'to':
                    andList.push({ created_at: { [lte]: new Date(value) } });
                    break;
                default:
                    throw new Error(`Unknown filter: ${name}`);
            }
        }
        query.where = { [and]: andList };
    }
    const [total, users] = await Promise.all([
        db.users.count({ where: query.where }),
        db.users.findAll(query),
    ]);
    return { total, users, query };
});

addHandler('/approve_signups', async req => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
        throw new Error('Invalid signup ids');
    }
    const signups = await db.users.findAll({
        where: { id: ids },
    });
    const approve = async signup => {
        if (signup.status !== 'manual_review') {
            throw new Error(
                'Invalid status for approval, must be in manual_review'
            );
        }
        const mailToken = jwt.sign(
            {
                type: 'create_account',
                email: signup.email,
            },
            process.env.JWT_SECRET
        );
        await services.sendEmail(signup.email, 'create_account', {
            url: `${req.protocol}://${req.get(
                'host'
            )}/create-account?token=${mailToken}`,
        });
        signup.status = 'approved'; // eslint-disable-line
        await signup.save();
    };
    return Promise.all(
        signups.map(async signup => {
            req.log.info('Approving %d', signup.id);
            try {
                await approve(signup);
            } catch (error) {
                req.log.error(error, 'Unable to approve %d', signup.id);
                return { error: error.message || String(error) };
            }
            return { ok: true };
        })
    );
});

addHandler('/reject_signups', async req => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
        throw new Error('Invalid signup ids');
    }
    const signups = await db.users.findAll({
        where: { id: ids },
    });
    const reject = async signup => {
        if (signup.status !== 'manual_review') {
            throw new Error(
                'Invalid status for rejection, must be in manual_review'
            );
        }
        signup.status = 'rejected'; // eslint-disable-line
        await signup.save();
    };
    return Promise.all(
        signups.map(async signup => {
            req.log.info('Rejecting %d', signup.id);
            try {
                await reject(signup);
            } catch (error) {
                req.log.error(error, 'Unable to reject %d', signup.id);
                return { error: error.message || String(error) };
            }
            return { ok: true };
        })
    );
});

module.exports = router;
