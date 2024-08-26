import express from 'express';

const router = express.Router();

router.get('/.well-known/healthcheck.json', (req, res) => {
  res.json({ ok: true, date: new Date().toISOString() });
});

router.get('/*', (req, res) => {
  res.render('index', { title: 'Sign up on Steem' });
});

export default router;
