const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL ?? '';
const publishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
const login = document.getElementById('login');
      const logout = document.getElementById('logout');
      const message = document.getElementById('message');
      const article = document.getElementById('article');
      const articleTitle = document.getElementById('article-title');
      const articleBody = document.getElementById('article-body');
      const submit = document.getElementById('submit');
      let token = null;
      const params = new URLSearchParams(location.search);
      const key = params.get('article');
      const validKey = key && /^[a-z0-9][a-z0-9_-]{0,99}$/.test(key);
      const configured =
        /^https:\/\/[a-z0-9.-]+$/.test(supabaseUrl) &&
        typeof publishableKey === 'string' &&
        publishableKey.length > 10;

      const clearArticle = () => {
        article.hidden = true;
        articleTitle.textContent = '';
        articleBody.textContent = '';
      };
      if (!configured) {
        message.textContent = '現在、閲覧サービスを準備中です。';
        submit.disabled = true;
      } else if (!validKey) {
        message.textContent = '記事が指定されていません。';
        submit.disabled = true;
      }
      login.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!configured || !validKey) return;
        clearArticle();
        token = null;
        submit.disabled = true;
        message.textContent = 'ログイン情報を確認しています…';
        try {
          const response = await fetch(
            supabaseUrl + '/auth/v1/token?grant_type=password',
            {
              method: 'POST',
              headers: {
                apikey: publishableKey,
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
              }),
              cache: 'no-store',
            },
          );
          const session = await response.json();
          if (!response.ok || typeof session.access_token !== 'string') {
            throw new Error(
              'ログインできませんでした。メールアドレスとパスワードをご確認ください。',
            );
          }
          token = session.access_token;
          document.getElementById('password').value = '';
          login.hidden = true;
          logout.hidden = false;
          message.textContent = '閲覧権限を確認しています…';
          const result = await fetch(
            supabaseUrl + '/rest/v1/rpc/billing_read_paid_article',
            {
              method: 'POST',
              headers: {
                apikey: publishableKey,
                authorization: 'Bearer ' + token,
                'content-type': 'application/json',
              },
              body: JSON.stringify({ p_article_key: key }),
              cache: 'no-store',
            },
          );
          if (!result.ok)
            throw new Error(
              '記事を取得できませんでした。時間をおいてお試しください。',
            );
          const rows = await result.json();
          if (
            !Array.isArray(rows) ||
            rows.length !== 1 ||
            rows[0].article_key !== key ||
            typeof rows[0].title !== 'string' ||
            typeof rows[0].body !== 'string'
          ) {
            message.textContent =
              'この記事の閲覧権限がないか、まだ公開されていません。';
            return;
          }
          articleTitle.textContent = rows[0].title;
          articleBody.textContent = rows[0].body;
          article.hidden = false;
          message.textContent = '';
        } catch (error) {
          message.textContent =
            error instanceof Error
              ? error.message
              : '通信エラーが発生しました。';
        } finally {
          submit.disabled = false;
        }
      });
      logout.addEventListener('click', () => {
        token = null;
        clearArticle();
        logout.hidden = true;
        login.hidden = false;
        message.textContent = 'ログアウトしました。';
      });
