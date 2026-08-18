-- Relève le seuil minimum du repli trigram (0.35 -> 0.5).
-- Cas observé : "Salade de tomates" ne matche aucun mot-cle en commun avec
-- une entree CIQUAL (aucune entree ne contient "salade"+"tomate"), le
-- full-text echoue donc entierement et le systeme retombe sur le trigram,
-- qui classait "Caviar de tomates" (218 kcal/100g, pate concentree a
-- l'huile) en tete avec un score de 0.458 - au lieu d'une vraie salade de
-- tomates fraiches (~20 kcal/100g), soit un facteur ~10x. Le trigram
-- n'etant utilise QUE quand le full-text (mots-cles stricts) a deja
-- entierement echoue, mieux vaut etre conservateur a ce stade et repasser
-- la main a l'estimation IA (confiance medium, honnete sur l'incertitude)
-- plutot que d'afficher une correspondance approximative avec une fausse
-- confiance "high".

create or replace function search_ciqual_food(query text, min_similarity real default 0.5)
returns table (
  id integer,
  name text,
  kcal_100g numeric,
  protein_100g numeric,
  carbs_100g numeric,
  fat_100g numeric,
  match_score real
)
language sql stable
as $$
  with fts_match as (
    select
      cf.id, cf.name, cf.kcal_100g, cf.protein_100g, cf.carbs_100g, cf.fat_100g,
      ts_rank(to_tsvector('french', cf.name), plainto_tsquery('french', query)) as match_score
    from ciqual_foods cf
    where to_tsvector('french', cf.name) @@ plainto_tsquery('french', query)
    order by match_score desc
    limit 1
  ),
  trgm_match as (
    select
      cf.id, cf.name, cf.kcal_100g, cf.protein_100g, cf.carbs_100g, cf.fat_100g,
      similarity(cf.name, query) as match_score
    from ciqual_foods cf
    where not exists (select 1 from fts_match)
      and similarity(cf.name, query) > min_similarity
    order by match_score desc
    limit 1
  )
  select * from fts_match
  union all
  select * from trgm_match;
$$;
