document.querySelector('#login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget,
    button = form.querySelector('button');
  button.disabled = true;
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: new FormData(form).get('password') }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error);
    location.href = '/';
  } catch (e) {
    document.querySelector('#status').textContent = e.message;
  } finally {
    button.disabled = false;
  }
});
