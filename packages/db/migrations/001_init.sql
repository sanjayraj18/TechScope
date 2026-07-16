create table if not exists domains (
    id serial primary key,
    name text not null unique,
    tranco_rank int
);

create table if not exists technologies (
    id serial primary key,
    name text not null unique,
    categories int[] not null default '{}'
);

create table if not exists crawls (
    id          serial primary key,
    started_at  timestamptz not null default now(),
    finished_at timestamptz
);

create table if not exists page_fetches (
    crawl_id    int not null references crawls(id),
    domain_id   int not null references domains(id),
    status      text not null,
    http_status int,
    duration_ms int,
    error       text,
    primary key (crawl_id, domain_id)
);

 create table if not exists detections (
    crawl_id      int not null references crawls(id),
    domain_id     int not null references domains(id),
    technology_id int not null references technologies(id),
    evidence      text,
    primary key (crawl_id, domain_id, technology_id)
);

create table if not exists tech_events (
    id            serial primary key,
    domain_id     int not null references domains(id),
    technology_id int not null references technologies(id),
    event_type    text not null check (event_type in ('added','removed')),
    crawl_id      int not null references crawls(id),
    detected_at   timestamptz not null default now()
);