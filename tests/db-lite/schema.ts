import { PGlite } from "@electric-sql/pglite";
import { buildTestSchemaSql } from "../db/schema";

/**
 * The whole schema (every migration, as tests/db builds it) inside PGlite, for database
 * changes that must run where no Postgres server is available. PGlite ships no pgcrypto, so
 * its functions are stood in for with built-ins; deployed SQL keeps using pgcrypto.
 */
const PRELUDE = `
create role anon; create role authenticated; create role service_role bypassrls;
create schema if not exists extensions; create schema if not exists auth; create schema if not exists realtime;
create function extensions.digest(bytea, text) returns bytea language sql immutable as $$ select sha256($1) $$;
create function extensions.digest(text, text) returns bytea language sql immutable as $$ select sha256(convert_to($1,'UTF8')) $$;
create function extensions.gen_random_bytes(int) returns bytea language sql as $$
  select substring(decode(replace(gen_random_uuid()::text||gen_random_uuid()::text||gen_random_uuid()::text||gen_random_uuid()::text,'-',''),'hex') from 1 for $1) $$;
create function extensions.hmac(key bytea, data bytea, kind text) returns bytea language plpgsql immutable as $$
declare k bytea := key; ipad bytea := ''; opad bytea := ''; i int;
begin
  if length(k) > 64 then k := sha256(k); end if;
  k := k || decode(repeat('00', 64 - length(k)), 'hex');
  for i in 0..63 loop
    ipad := ipad || set_byte('\\x00'::bytea, 0, get_byte(k, i) # 54);
    opad := opad || set_byte('\\x00'::bytea, 0, get_byte(k, i) # 92);
  end loop;
  return sha256(opad || sha256(ipad || data));
end $$;
create function extensions.hmac(text, text, text) returns bytea language sql immutable as $$
  select extensions.hmac(convert_to($2,'UTF8'), convert_to($1,'UTF8'), $3) $$;
create function extensions.gen_random_uuid() returns uuid language sql as $$ select pg_catalog.gen_random_uuid() $$;
create function realtime.send(jsonb, text, text, boolean) returns void language sql as $$ select $$;
create function realtime.topic() returns text language sql as $$ select ''::text $$;
create function auth.jwt() returns jsonb language sql stable as $$ select nullif(current_setting('request.jwt.claims',true),'')::jsonb $$;
create function auth.role() returns text language sql stable as $$ select coalesce(auth.jwt()->>'role','') $$;
`;

export async function liteDatabase() {
  const db = new PGlite();
  await db.exec(PRELUDE);
  await db.exec(buildTestSchemaSql());
  return db;
}
