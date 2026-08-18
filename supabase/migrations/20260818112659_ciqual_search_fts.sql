-- Ameliore la recherche CIQUAL : le trigram seul (similarity()) classe par
-- proximite de caracteres, pas de sens - teste sur "riz blanc cuit", il
-- retournait "Riz blanc, cru" (350 kcal/100g) au lieu de "Riz blanc, cuit,
-- sans sel ajoute" (155 kcal/100g, present en base) car "cru"/"cuit" partagent
-- beaucoup de trigrammes et le nom exact plus long ("...sans sel ajoute")
-- diluait sa similarite globale. Full-text (mots-cles, AND strict, stemming
-- francais) priorise les entrees contenant tous les mots demandes ; le
-- trigram ne sert plus que de repli si aucun mot-cle ne matche.

create index if not exists ciqual_foods_name_fts_idx
  on ciqual_foods using gin (to_tsvector('french', name));

drop function if exists search_ciqual_food(text, real);

create or replace function search_ciqual_food(query text, min_similarity real default 0.35)
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
