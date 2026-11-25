# Smart Mail Notification & Voice Assistant

React + Vite client, Node/Express API, MongoDB, Nodemailer, Socket.IO and the browser Speech Synthesis API.

## Run
Needs Node 18+ and MongoDB (local or Atlas).
```bash
cd server && cp .env.example .env && npm install && npm run dev     # http://localhost:5000
cd client && npm install && npm run dev                              # http://localhost:5173
```
SMTP is optional. With no SMTP settings the Nodemailer step is simulated and mail is delivered inside the app (best for the demo). To use real SMTP (e.g. Gmail with an App Password) fill the `SMTP_*` values in `server/.env`.

## Demo (two users)
1. Register Asha and Ravi in two browsers (or one normal + one private window).
2. Ravi: click anywhere once (browsers only allow speech after a user gesture), keep Smart Mail open.
3. Asha: Compose to Ravi's email → Send.
4. Ravi's screen instantly shows a banner, the unread counter increases, the tab title changes and a voice says "You have received a new email from Asha. Subject: ...".
5. Ravi opens the email (counter drops) and clicks **Listen to this email**, then Pause / Resume / Stop.

## How the workflow maps to the code
| Step | Where |
|---|---|
| Send with Nodemailer, read SMTP response | `server/controllers/mailController.js` `send`, `utils/mailer.js` |
| Store email in MongoDB | `models/Email.js` |
| Identify the recipient, check they are connected | `send` (`User.findOne`, `io.sockets.adapter.rooms`) |
| Socket.IO notification (`email:new`, `unread:update`) | `server.js` (JWT-authenticated rooms `user:<id>`), `send`, `get` |
| Client socket + unread counter + alert | `client/src/Realtime.jsx` |
| Speech notification, listen, pause/resume/stop | `client/src/hooks/useSpeech.js`, `pages/Mailbox.jsx` |
| Optional auto-announce, speed, mute button | `App.jsx` (Voice settings), saved in `User.settings` |

Notes
- Socket.IO does not detect delivery by itself. The backend sends the email, saves it, finds the recipient and then emits the event.
- SMTP success means the receiving server accepted the message, not that it reached an inbox. The Sent view shows this status.
- Mailboxes are between registered users. Emails to unregistered addresses are sent through SMTP only and appear in Sent.
- Long messages are spoken in short chunks because browsers stop long utterances.
- The Mute button silences automatic announcements; the Listen button always works because you pressed it.

## API (JWT bearer)
`POST /api/auth/register|login`, `GET /api/auth/me`, `PUT /api/auth/settings`, `GET /api/auth/users?q=`
`POST /api/mail`, `GET /api/mail/inbox|sent|unread-count`, `GET|DELETE /api/mail/:id`, `PATCH /api/mail/:id/unread`, `POST /api/mail/read-all`
