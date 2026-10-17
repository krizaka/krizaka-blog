-- The blog's newsletter list: database krizaka_newsletter on the cluster krizaka-dev-pg, owned by its own role
-- (krizaka_newsletter). Applied by scripts/newsletter-db.mjs (idempotent). Nothing else lives here.

-- A confirmed subscriber: the address, the language of the e-mails, and the proof of consent (CASL): when and how it
-- was given. A row exists only after the confirmation link was opened; unsubscribing deletes it.
create table if not exists newsletter_subscribers (
  email text primary key check (email = lower(email) and length(email) <= 254),
  locale text not null check (locale in ('en', 'fr')),
  consented_at timestamptz not null,
  consent_source text not null
);

-- A post sent by e-mail: the primary key is the lock (a post is claimed once, so it is never sent twice).
create table if not exists newsletter_posts (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  claimed_at timestamptz not null default now(),
  finished_at timestamptz,
  sent integer,
  failed integer
);

-- The limits of the « unsubscribe me » form (per visitor address per hour, per e-mail address per day). The key is a
-- SHA-256 of the scope and the value: no address or IP is kept in clear.
create table if not exists newsletter_rate_limits (
  key text primary key check (length(key) = 64),
  window_start timestamptz not null,
  hits integer not null
);
