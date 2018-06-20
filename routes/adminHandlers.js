const database = require('../helpers/database');

const { Sequelize } = require('../db/models');

async function listSignups(req) {
    const { limit, order, offset, filters } = req.body;
    const query = {
        order: order || [['created_at', 'DESC']],
        limit: limit ? Math.min(limit, 100) : 10,
    };
    if (offset) {
        query.offset = offset;
    }
    if (Array.isArray(filters) && filters.length > 0) {
        const {
            where,
            literal,
            Op: { or, eq, ne, like, notLike, and, gte, lte, regexp, notRegexp },
        } = Sequelize;

        const andList = [];
        for (const filter of filters) {
            // eslint-disable-line
            const { value } = filter;
            let name = filter.name;
            let negate = false;
            if (name[0] === '!') {
                negate = true;
                name = name.slice(1);
            }
            const nLike = negate ? notLike : like;
            const nEq = negate ? ne : eq;
            const nRegexp = negate ? notRegexp : regexp;
            switch (name) {
                case 'text':
                    andList.push({
                        [negate ? and : or]: [
                            { email: { [nLike]: `%${value}%` } },
                            { username: { [nLike]: `%${value}%` } },
                            { phone_number: { [nLike]: `%${value}%` } },
                        ],
                    });
                    break;
                case 'status':
                    andList.push({ status: { [nEq]: value } });
                    break;
                case 'ip':
                    andList.push({ ip: { [nEq]: value } });
                    break;
                case 'username':
                    andList.push({ username: { [nEq]: value } });
                    break;
                case 'phone':
                case 'phone_number':
                    andList.push({ phone_number: { [nEq]: value } });
                    break;
                case 'email':
                    andList.push({ email: { [nEq]: value } });
                    break;
                case 'username_re':
                    andList.push({ username: { [nRegexp]: value } });
                    break;
                case 'email_re':
                    andList.push({ email: { [nRegexp]: value } });
                    break;
                case 'phone_re':
                case 'phone_number_re':
                    andList.push({ phone_number: { [nRegexp]: value } });
                    break;
                case 'note':
                    andList.push({ review_note: { [nLike]: `%${value}%` } });
                    break;
                case 'note_re':
                    andList.push({ review_note: { [nRegexp]: value } });
                    break;
                case 'from':
                    andList.push({ created_at: { [gte]: new Date(value) } });
                    break;
                case 'to':
                    andList.push({ created_at: { [lte]: new Date(value) } });
                    break;
                case 'fingerprint.ua':
                    andList.push({
                        fingerprint: where(literal("fingerprint -> '$.ua'"), {
                            [nRegexp]: value,
                        }),
                    });
                    break;
                case 'fingerprint.ref':
                    andList.push({
                        fingerprint: where(literal("fingerprint -> '$.ref'"), {
                            [nRegexp]: value,
                        }),
                    });
                    break;
                case 'fingerprint.lang':
                    andList.push({
                        fingerprint: where(literal("fingerprint -> '$.lang'"), {
                            [nRegexp]: value,
                        }),
                    });
                    break;
                case 'fingerprint.device':
                    andList.push({
                        fingerprint: where(
                            literal("fingerprint -> '$.device'"),
                            { [nRegexp]: value }
                        ),
                    });
                    break;
                case 'fingerprint.device.vendor':
                    andList.push({
                        fingerprint: where(
                            literal("fingerprint -> '$.device.vendor'"),
                            { [nRegexp]: value }
                        ),
                    });
                    break;
                case 'fingerprint.device.renderer':
                    andList.push({
                        fingerprint: where(
                            literal("fingerprint -> '$.device.renderer'"),
                            { [nRegexp]: value }
                        ),
                    });
                    break;
                default:
                    throw new Error(`Unknown filter: ${name}`);
            }
        }
        query.where = { [and]: andList };
    }
    const [total, users] = await Promise.all([
        database.countUsers(query.where),
        database.findUsers(query),
    ]);
    return { total, users, query };
}

module.exports = {
    listSignups,
};
