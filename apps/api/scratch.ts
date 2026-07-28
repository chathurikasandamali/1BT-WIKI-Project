import { createAuthClient } from '@neondatabase/auth';

const client = createAuthClient('');
client.getSession().then((r) => {
  if (r.data) {
    r.data.user.id;
    r.data.user.email;
    r.data.user.role;
    r.data.session.token;
  }
});
