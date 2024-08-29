import express from 'express';
import path from 'path';
import { getManifest } from '../helpers/common.js';

export default function (params) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const manifest = getManifest(
      path.join(params.baseDir, '/public/manifest.json')
    );
    res.render('index', {
      title: 'Sign up on Steem',
      manifest,
    });
  });

  router.get('/.well-known/healthcheck.json', (req, res) => {
    res.json({ ok: true, date: new Date().toISOString() });
  });
  return router;
}
