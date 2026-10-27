import type { z } from 'zod';
import type { articleSchema } from './schema';
type Article = z.infer<typeof articleSchema>;

/** Translate legacy production copy without modifying saved editorial records. */
export function publicArticle(article: Article): Article {
  return {
    ...article,
    category:
      article.slug === 'editorial-policy' && article.category === '編集方針'
        ? '図鑑の読み方'
        : article.category,
    sections: article.sections.map((section) => {
      if (article.slug === 'editorial-policy') {
        if (section.body.startsWith('移行元の資料にない'))
          return {
            heading: '石の性質を確かめる。',
            body: '鉱物名や硬度、処理の有無は、石選びやお手入れに役立ちます。確認できていない性質は断定していません。流通名や見た目だけで個体を鑑別せず、購入時には販売表示や鑑別情報をご確認ください。',
          };
        if (section.body.startsWith('画像検索の結果が見つかっても自動'))
          return {
            heading: '写真と色の見方。',
            body: '天然石は同じ名前でも色や模様が異なります。実物写真のない項目には、写真と区別できる抽象的な色のイメージを表示しています。写真の撮影者や利用条件は、各写真のクレジットをご確認ください。',
          };
        if (section.body.includes('有料レポートは次の開発段階で'))
          return {
            heading: '図鑑と個別選定について。',
            body: 'この図鑑では、石の一般的な性質や伝承を無料で調べられます。個人向けのランキングやオーダーメイドの組み合わせは個別選定レポートの対象です。790円のレポートは販売準備中で、現在は購入や結果の提供を行っていません。',
          };
      }
      return {
        ...section,
        body: section.body.replace(
          '分類自体が確認待ちの項目もあるため、',
          '分類が確かでない場合は、',
        ),
      };
    }),
  };
}
