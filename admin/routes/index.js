const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const fetch = require('isomorphic-fetch');
const Sequelize = require('sequelize');
const moment = require('moment');
const authenticate = require('../helpers/middleware').authenticate;

const itemsPerPage = 25;

const dashboardQueries = (q, status) => {
  const Op = Sequelize.Op;
  // DateTime when fix, extending validation email token expiry was merged, refs faucet #246.
  const dateTime = moment(new Date("2018-03-23 20:18:26")).format("YYYY-MM-DD HH:mm:ss");
  // How long an email token is valid for.
  const twoWeeksAgo = moment().subtract(14, 'days').format("YYYY-MM-DD HH:mm:ss");
  const sixtyDaysAgo = moment().subtract(60, 'days').format("YYYY-MM-DD HH:mm:ss");
  const queries = {
    // Temp Queries.
    temp: {
      // Approved users who's email token expired after 1 day and who did not validate their email.
      // Action: Email them new validation link and record that attempt was made.
      unverifiedEmailLikelyExpiredToken: {
        where: {
          status: 'approved',
          email_is_verified: false,
          last_attempt_verify_email: {
            [Op.lte]: dateTime
          }
        }
      },
      // Approved users who might not have ever been sent a validation email.
      ambiguousEmail: {
        where: {
          status: 'approved',
          email_is_verified: false,
          last_attempt_verify_email: null,
          account_is_created: false,
        }
      },
      // Approved Users who might not have ever been sent a validation email who have validated their phone.
      // Action: Email them new validation link and record that attempt was made.
      ambiguousEmailVerifiedPhone: {
        where: {
          status: 'approved',
          email_is_verified: false,
          last_attempt_verify_email: null,
          account_is_created: false,
          phone_number_is_verified: true,
          phone_code_attempts: {
            [Op.gt]: 0
          },
        }
      },
      // Approved Users who might not have ever been sent a validation email who have not validated their phone.
      // Action: Email them new validation link and record that attempt was made.
      ambiguousEmailUnverifiedPhone: {
        where: {
          status: 'approved',
          email_is_verified: false,
          last_attempt_verify_email: null,
          account_is_created: false,
          phone_number_is_verified: false,
        }
      },
      // Phone verified, despite no code attempts.
      verifiedPhoneNoAttempt: {
        where: {
          phone_code_attempts: 0,
          phone_number_is_verified: true,
        }
      },
    },
    approvedOrPending: {
      // Approved Users who let their email token expire.
      unverifiedEmailExpiredToken: {
        where: {
          [Op.or]: [{ status: 'approved' }, { status: 'manual_review' }],
          email_is_verified: false,
          account_is_created: false,
          last_attempt_verify_email: {
            [Op.lte]: twoWeeksAgo
          }
        }
      },
      // Approved Users who have validated email and never attempted to validate phone.
      emailVerifiedPhoneUnverified1: {
        where: {
          [Op.or]: [{ status: 'approved' }, { status: 'manual_review' }, { status: null }],
          email_is_verified: true,
          account_is_created: false,
          phone_number_is_verified: false,
          phone_number: null,
          phone_code: null,
        }
      },
      // Approved Users who have validated email and never entered phone validation code.
      emailVerifiedPhoneUnverified2: {
        where: {
          [Op.or]: [{ status: 'approved' }, { status: 'manual_review' }, { status: null }],
          email_is_verified: true,
          account_is_created: false,
          phone_number_is_verified: false,
          last_attempt_verify_phone_number: {
            [Op.gte]: sixtyDaysAgo,
          },
          phone_code: {
            [Op.ne]: null,
          }
        }
      },
      // Users who have validated phone and validated email who have not created their account.
      emailVerifiedPhoneVerified: {
        where: {
          [Op.or]: [{ status: 'approved' }, { status: 'manual_review' }, { status: null }],
          email_is_verified: true,
          account_is_created: false,
          phone_number_is_verified: true,
        }
      },
    },
    reminder: {
      emailVerifiedPhoneVerifiedApproved: {
        where: {
          updated_at: { [Op.lt]: moment().subtract(7, 'days').toDate() },
          status: 'approved',
          email_is_verified: true,
          phone_number_is_verified: true,
          account_is_created: false,
        }
      },
    },
    nanscent: {
      // Users with a valid username. But no further steps were taken.
      usernameOnly: {
        where: {
          username: {
            [Op.not]: null
          },
          last_attempt_verify_email: null,
          email_is_verified: false,
          phone_number_is_verified: false,
          account_is_created: false,
        }
      }
    }
  };
  const leaf = (obj, path) => (path.split('.').reduce((value, el) => value[el], obj));
  const out = leaf(queries, q);
  return leaf(queries, q);
}

class AppError extends Error {
  constructor({ type = 'error_api_general', status = 400, cause }) {
    super(`${type}`);
    this.type = type;
    this.status = status;
    this.cause = cause;
  }
  toJSON() {
    return { type: this.type };
  }
}

function routeMiddleware(handler) {
  return (req, res) => {
    handler(req, res).then((result) => {
      if (result.view) {
        res.render(result.view, result.data);
      } else {
        res.json(result.data);
      }
    }).catch((error) => {
      let err = error;
      if (!(err instanceof AppError)) {
        err = new AppError({ type: 'error_api_general', status: 500, cause: err });
      }
      if (err.status >= 500) {
        req.log.error(err.cause || err, 'Unexpected App error');
      } else if (error.status >= 400) {
        req.log.warn(err.cause || err, 'App Error: %s', err.type);
      }
      res.status(err.status);
      res.render('error', { error: err });
    });
  };
}

/* GET home page. */
router.get('/', (req, res, next) => {
  res.render('index', { title: 'Log in to continue' });
});

router.get('/.well-known/healthcheck.json', (req, res) => {
  res.json({ ok: true, date: new Date().toISOString() });
});

router.get('/dashboard', authenticate(), routeMiddleware(async (req) => {

  const ongoing = await req.db.users
    .count({ where: { status: null } });
  const rejected = await req.db.users
    .count({ where: { status: 'rejected' } });
  const approved = await req.db.users
    .count({ where: { status: 'approved' } });
  const pending = await req.db.users
    .count({ where: { status: 'manual_review' } });
  const created = await req.db.users
    .count({ where: { status: 'created' } });

  // dashboard queries:
  // Temp.
  const tempUnverifiedEmailExpiredToken = await req.db.users.count(dashboardQueries('temp.unverifiedEmailLikelyExpiredToken'));
  const tempNoKnownEmailAttempt = await req.db.users.count(dashboardQueries('temp.ambiguousEmail'));
  const tempNoKnownEmailAttemptUnverifiedPhone = await req.db.users.count(dashboardQueries('temp.ambiguousEmailUnverifiedPhone'));
  const tempNoKnownEmailAttemptVerifiedPhone = await req.db.users.count(dashboardQueries('temp.ambiguousEmailVerifiedPhone'));
  const tempVerifiedPhoneNoAttempts = await req.db.users.count(dashboardQueries('temp.verifiedPhoneNoAttempt'));

  // Approved or Pending User Falloff.
  // Stopped at username step.
  const usernameOnly = await req.db.users.count(dashboardQueries('nanscent.usernameOnly'));
  // Stopped at Email step.
  const expiredEmailToken = await req.db.users.count(dashboardQueries('approvedOrPending.unverifiedEmailExpiredToken'));
  // Stopped at Phone step 1.
  const emailVerifiedPhoneUnverified1 = await req.db.users.count(dashboardQueries('approvedOrPending.emailVerifiedPhoneUnverified1'));
  // Stopped at Phone step 2.
  const emailVerifiedPhoneUnverified2 = await req.db.users.count(dashboardQueries('approvedOrPending.emailVerifiedPhoneUnverified2'));
  // Stopped at Account Creation step.
  const emailVerifiedPhoneVerified = await req.db.users.count(dashboardQueries('approvedOrPending.emailVerifiedPhoneVerified'));

  // Reminder
  const approvalReminder = await req.db.users.count(dashboardQueries('reminder.emailVerifiedPhoneVerifiedApproved'))

  const all = await req.db.users.count();
  return {
    view: 'dashboard',
    data: {
      title: 'Dashboard',
      ongoing,
      approved,
      rejected,
      pending,
      created,
      tempUnverifiedEmailExpiredToken,
      tempNoKnownEmailAttempt,
      tempNoKnownEmailAttemptUnverifiedPhone,
      tempNoKnownEmailAttemptVerifiedPhone,
      tempVerifiedPhoneNoAttempts,
      usernameOnly,
      expiredEmailToken,
      emailVerifiedPhoneUnverified1,
      emailVerifiedPhoneUnverified2,
      emailVerifiedPhoneVerified,
      approvalReminder,
      all
    }
  };
}));

router.get('/user/:id', authenticate(), routeMiddleware(async (req) => {
  const user = await req.db.users.findOne({
    where: { id: req.params.id }
  });
  return {
    view: 'user',
    data: {
      title: 'User details',
      user
    }
  }
}));

router.get('/users/ongoing', authenticate(), routeMiddleware(async (req) => {
  return listUser(req, {
    location: 'users/ongoing',
    showActions: false,
    title: 'Ongoing users',
    where: { status: null }
  });
}));

router.get('/users/pending', authenticate(), routeMiddleware(async (req) => {
  return listUser(req, {
    location: 'users/pending',
    showActions: true,
    title: 'Pending approval users',
    where: { status: 'manual_review' }
  });
}));

router.get('/users/approved', authenticate(), routeMiddleware(async (req) => {
  return listUser(req, {
    location: 'users/approved',
    showActions: false,
    title: 'Approved users',
    where: { status: 'approved' }
  });
}));

router.get('/users/rejected', authenticate(), routeMiddleware(async (req) => {
  return listUser(req, {
    location: 'users/rejected',
    showActions: true,
    title: 'Rejected users',
    where: { status: 'rejected' }
  });
}));

router.get('/users/created', authenticate(), routeMiddleware(async (req) => {
  return listUser(req, {
    location: 'users/created',
    showActions: false,
    title: 'Created users',
    where: { status: 'created' }
  });
}));

router.get('/users/all', authenticate(), routeMiddleware(async (req) => {
  return listUser(req, {
    location: 'users/all',
    showActions: false,
    title: 'All users',
    where: {}
  });
}));

router.get('/users/stuck1', authenticate(), routeMiddleware(async (req) => {
  return stuckUsers(req, {
    location: 'users/stuck',
    showActions: true,
    title: 'Approved Users with unverified emails, one-day token likely expired',
    ...dashboardQueries('temp.unverifiedEmailLikelyExpiredToken'),
  });
}));


router.get('/users/stuck2', authenticate(), routeMiddleware(async (req) => {
  return stuckUsers(req, {
    location: 'users/stuck2',
    showActions: true,
    title: 'Approved Users, no known email was sent - with unverified phone',
    ...dashboardQueries('temp.ambiguousEmailUnverifiedPhone'),
  });
}));

router.get('/users/stuck3', authenticate(), routeMiddleware(async (req) => {
  return stuckUsers(req, {
    location: 'users/stuck3',
    showActions: true,
    title: 'approved users, no known email was sent - with verified phone',
    ...dashboardQueries('temp.ambiguousEmailVerifiedPhone'),
  });
}));

router.get('/users/stuck4', authenticate(), routeMiddleware(async (req) => {
  return stuckUsers(req, {
    location: 'users/stuck4',
    showActions: true,
    title: 'Users with verified phone, despite no phone attempts',
    ...dashboardQueries('temp.verifiedPhoneNoAttempt'),
  });
}));

router.get('/users/7-day-approval-reminder', authenticate(), routeMiddleware(async (req) => {
  return stuckUsers(req, {
    location: 'users/7-day-approval-reminder',
    showActions: true,
    title: 'Approved users who have not created their account after 7 days.',
    ...dashboardQueries('reminder.emailVerifiedPhoneVerifiedApproved'),
  });
}));

const stuckUsers = async (req, options) => {
  const page = parseInt(req.query.page) || 1;
  const count = await req.db.users.count({ where: options.where });
  const users = await req.db.users.findAll(
    {
      order: [['updated_at', 'DESC']],
      offset: parseInt((page - 1) * itemsPerPage),
      limit: itemsPerPage,
      where: options.where,
    }
  );
  return {
    view: 'users',
    data: {
      page: page,
      showLast: count > page * itemsPerPage,
      location: options.location,
      showActions: options.showActions,
      title: options.title,
      users: users,
      maxPage: Math.ceil(count / itemsPerPage),
      totalElements: count,
    }
  };
}


const listUser = async (req, options) => {
  const page = parseInt(req.query.page) || 1;
  const count = await req.db.users.count({ where: options.where });
  const users = await req.db.users.findAll(
    {
      order: [['updated_at', 'DESC']],
      offset: parseInt((page - 1) * itemsPerPage),
      limit: itemsPerPage,
      where: options.where
    }
  );

  return {
    view: 'users',
    data: {
      page: page,
      showLast: count > page * itemsPerPage,
      location: options.location,
      showActions: options.showActions,
      title: options.title,
      users: users,
      maxPage: Math.ceil(count / itemsPerPage),
      totalElements: count,
    }
  };
};


router.post('/approve', authenticate(), routeMiddleware(async (req) => {
  const users = await req.db.users.findAll({ where: { id: req.body['ids[]'] } });

  const emails = [];
  for (let i = 0; i < users.length; i += 1) {
    emails.push(users[i].email);
  }
  const token = jwt.sign({
    emails,
  }, process.env.JWT_SECRET, { expiresIn: '1d' });
  const result = await fetch(`${process.env.FAUCET_URL}/api/approve_account?token=${token}`)
    .then(function (response) {
      return response.json();
    });
  if (result.success) {
    await req.db.users.update({
      status: 'approved',
    }, { where: { id: req.body['ids[]'] } });
  }
  return {
    data: {
      success: result.success,
      errors: result.errors,
      ids: req.body['ids[]'],
    }
  };
}));


router.post('/email', authenticate(), routeMiddleware(async (req) => {
  const users = await req.db.users.findAll({ where: { id: req.body['ids[]'] } });
  debugger
  const emailType = req.body.type;
  const emails = [];
  for (let i = 0; i < users.length; i += 1) {
    emails.push(users[i].email);
  }
  const token = jwt.sign({
    emails,
  }, process.env.JWT_SECRET, { expiresIn: '1d' });

  const result = await fetch(`${process.env.FAUCET_URL}/api/email_user?token=${token}&type=${emailType}`)
    .then(function (response) {
      return response.json();
    });
  // Update users in the DB to reflect new email validation attempt.
  if (result.success) {
    await req.db.users.update({
      last_attempt_verify_email: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
    }, { where: { id: req.body['ids[]'] } });
  }
  return {
    data: {
      success: result.success,
      errors: result.errors,
      ids: req.body['ids[]'],
    }
  };
}));



router.post('/reject', authenticate(), routeMiddleware(async (req) => {
  req.db.users.update({
    status: 'rejected',
  }, { where: { id: req.body['ids[]'] } });
  return {
    data: {
      success: true,
      ids: req.body['ids[]'],
    }
  }
}));

router.get('/search', authenticate(), (req, res, next) => {
  res.render('search', {
    title: 'Search database',
    users: [],
    page: 1,
    showLast: false,
    maxPage: 0,
    totalElements: 0,
    search: '',
    status: null,
    items: itemsPerPage,
    startDate: '',
    endDate: '',
  });
});

router.post('/search', authenticate(), routeMiddleware(async (req) => {
  const page = parseInt(req.body.page) || 1;
  const { search, status, startDate, endDate } = req.body;
  const Op = Sequelize.Op;
  const where = {
    [Op.and]: [
      {
        [Op.or]: [
          { email: { [Op.like]: `%${search}%` } },
          { username: { [Op.like]: `%${search}%` } },
          { phone_number: { [Op.like]: `%${search}%` } },
          { ip: { [Op.like]: `%${search}%` } },
          { fingerprint: { [Op.like]: `%${search}%` } },
        ]
      }
    ]
  };
  if (status !== 'all') {
    where[Object.getOwnPropertySymbols(where)[0]].push({ status });
  }
  if (startDate) {
    where[Object.getOwnPropertySymbols(where)[0]].push({ created_at: { [Op.gte]: moment(startDate, 'YYYYMMDD') } });
  }
  if (endDate) {
    where[Object.getOwnPropertySymbols(where)[0]].push({ created_at: { [Op.lte]: moment(endDate, 'YYYYMMDD') } });
  }
  const count = await req.db.users.count({ where });
  const items = req.body.items || itemsPerPage;
  const users = await req.db.users.findAll(
    {
      order: [['updated_at', 'DESC']],
      offset: parseInt((page - 1) * items),
      limit: parseInt(items),
      page,
      where
    }
  );

  return {
    view: 'search',
    data: {
      title: 'Search database',
      page,
      showLast: count > page * items,
      maxPage: Math.ceil(count / items),
      totalElements: count,
      users,
      search,
      startDate,
      endDate,
      status,
      items
    }
  }
}));

module.exports = router;
