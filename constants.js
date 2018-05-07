const CHECKPOINTS = {
    signup_start: 'signup_start',
    paid_signup_options_modal_shown: 'paid_signup_options_modal_shown',
    paid_signup_clicked_blocktrades: 'paid_signup_clicked_blocktrades',
    paid_signup_clicked_anonsteem: 'paid_signup_clicked_anonsteem',
    paid_signup_clicked_steemconnect: 'paid_signup_clicked_steemconnect',
    free_signup_chosen: 'free_signup_chosen',
    username_chosen: 'username_chosen',
    email_submitted: 'email_submitted',
    email_verified: 'email_verified',
    phone_submitted: 'phone_submitted',
    phone_verified: 'phone_verified',
    creation_started: 'creation_started',
    password_chosen: 'password_chosen',
    account_created: 'account_created',
};

const checkpoints = [
    {
        human: 'Landed on signup page',
        symbol: CHECKPOINTS.signup_start,
    },
    {
        human: 'Pressed "Free Signup"',
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
];


module.exports = {
    CHECKPOINTS,
    checkpoints,
};