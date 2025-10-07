import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import pkg from 'pg';

const { Pool } = pkg;
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const rpName = 'Tunisia Ride Hub';
const rpID = process.env.RP_ID || 'localhost';
const origin = process.env.ORIGIN || 'http://localhost:5173';

// In-memory challenge store (replace with Redis or DB in prod)
const userChallenge = {};

// Registration options
app.post('/webauthn/register-challenge', async (req, res) => {
  const { userId, username } = req.body;
  const options = generateRegistrationOptions({
    rpName,
    rpID,
    userID: userId,
    userName: username,
    attestationType: 'none',
    authenticatorSelection: { userVerification: 'preferred' },
  });
  userChallenge[userId] = options.challenge;
  res.json(options);
});

// Registration verification
app.post('/webauthn/register-verify', async (req, res) => {
  const { userId, attResp } = req.body;
  const expectedChallenge = userChallenge[userId];
  try {
    const verification = await verifyRegistrationResponse({
      response: attResp,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
    if (verification.verified) {
      // Store credential in DB
      const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
      await pool.query(
        'INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter) VALUES ($1, $2, $3, $4) ON CONFLICT (credential_id) DO UPDATE SET public_key = $3, counter = $4',
        [userId, Buffer.from(credentialID).toString('base64'), Buffer.from(credentialPublicKey).toString('base64'), counter]
      );
    }
    res.json({ verified: verification.verified });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Authentication options
app.post('/webauthn/login-challenge', async (req, res) => {
  const { userId } = req.body;
  const creds = await pool.query('SELECT credential_id FROM webauthn_credentials WHERE user_id = $1', [userId]);
  const allowCredentials = creds.rows.map(row => ({
    id: Buffer.from(row.credential_id, 'base64'),
    type: 'public-key',
  }));
  const options = generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: 'preferred',
  });
  userChallenge[userId] = options.challenge;
  res.json(options);
});

// Authentication verification
app.post('/webauthn/login-verify', async (req, res) => {
  const { userId, authResp } = req.body;
  const expectedChallenge = userChallenge[userId];
  const creds = await pool.query('SELECT * FROM webauthn_credentials WHERE user_id = $1', [userId]);
  if (!creds.rows.length) return res.status(400).json({ error: 'No credentials found' });
  const credential = creds.rows[0];
  try {
    const verification = await verifyAuthenticationResponse({
      response: authResp,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(credential.credential_id, 'base64'),
        credentialPublicKey: Buffer.from(credential.public_key, 'base64'),
        counter: credential.counter,
        transports: undefined,
      },
    });
    if (verification.verified) {
      await pool.query('UPDATE webauthn_credentials SET counter = $1 WHERE credential_id = $2', [verification.authenticationInfo.newCounter, credential.credential_id]);
    }
    res.json({ verified: verification.verified });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/', (req, res) => res.send('WebAuthn backend running.'));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`WebAuthn backend listening on port ${port}`));
