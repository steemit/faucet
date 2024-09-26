const CHECKPOINTS = {
  signup_start: 'signup_start',
  paid_signup_options_modal_shown: 'paid_signup_options_modal_shown',
  paid_signup_clicked_blocktrades: 'paid_signup_clicked_blocktrades',
  paid_signup_clicked_anonsteem: 'paid_signup_clicked_anonsteem',
  paid_signup_clicked_steemconnect: 'paid_signup_clicked_steemconnect',
  paid_signup_clicked_buildteam: 'paid_signup_clicked_buildteam',
  paid_signup_clicked_steemninja: 'paid_signup_clicked_steemninja',
  paid_signup_clicked_steemwalletapp: 'paid_signup_clicked_steemwalletapp',
  paid_signup_clicked_actifit: 'paid_signup_clicked_actifit',
  free_signup_chosen: 'free_signup_chosen',
  username_chosen: 'username_chosen',
  email_submitted: 'email_submitted',
  email_verified: 'email_verified',
  phone_submitted: 'phone_submitted',
  phone_verified: 'phone_verified',
  creation_started: 'creation_started',
  password_chosen: 'password_chosen',
  account_created: 'account_created',
  user_created: 'user_created',
};

const checkpoints = [
  {
    human: 'Landed on signup page',
    symbol: CHECKPOINTS.signup_start,
  },
  {
    human: 'Pressed "Pay to sign up"',
    symbol: CHECKPOINTS.paid_signup_options_modal_shown,
  },
  {
    human: 'Clicked blocktrades',
    symbol: CHECKPOINTS.paid_signup_clicked_blocktrades,
  },
  {
    human: 'Clicked anonsteem',
    symbol: CHECKPOINTS.paid_signup_clicked_anonsteem,
  },
  {
    human: 'Clicked steemconnect',
    symbol: CHECKPOINTS.paid_signup_clicked_steemconnect,
  },
  {
    human: 'Clicked steemninja',
    symbol: CHECKPOINTS.paid_signup_clicked_steemninja,
  },
  {
    human: 'Clicked buildteam',
    symbol: CHECKPOINTS.paid_signup_clicked_buildteam,
  },
  {
    human: 'Clicked actifit',
    symbol: CHECKPOINTS.paid_signup_clicked_actifit,
  },
  {
    human: 'Clicked steemwalletapp',
    symbol: CHECKPOINTS.paid_signup_clicked_steemwalletapp,
  },
  {
    human: 'Pressed "Sign up for free"',
    symbol: CHECKPOINTS.free_signup_chosen,
  },
  {
    human: 'Entered a username',
    symbol: CHECKPOINTS.username_chosen,
  },
  {
    human: 'Entered a valid email',
    symbol: CHECKPOINTS.email_submitted,
  },
  //{
  //    human: 'Passed any reCAPTCHA test',
  //    symbol: false,
  //},
  {
    human: 'Verified email address',
    symbol: CHECKPOINTS.email_verified,
  },
  {
    human: 'Phone number entered',
    symbol: CHECKPOINTS.phone_submitted,
  },
  {
    human: 'Verified phone number',
    symbol: CHECKPOINTS.phone_verified,
  },
  {
    human: 'Account approved',
    symbol: CHECKPOINTS.creation_started,
  },
  //{
  //    human: 'Accepted / copied new password',
  //    symbol: false,
  //},
  {
    human: 'Confirmed new password',
    symbol: CHECKPOINTS.password_chosen,
  },
  {
    human: 'Account created',
    symbol: CHECKPOINTS.account_created,
  },
  {
    human: 'User created',
    symbol: CHECKPOINTS.user_created,
  },
];

export { CHECKPOINTS, checkpoints };
