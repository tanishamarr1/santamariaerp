-- =====================================================================
-- CONSTRUCTORA SANTAMARIA - Esquema de Base de Datos (Supabase / Postgres)
-- =====================================================================
-- Instrucciones:
-- 1. Entra a tu proyecto de Supabase -> SQL Editor -> New Query
-- 2. Pega TODO este archivo y presiona "Run"
-- 3. Esto crea las tablas, índices, y datos iniciales (usuarios y config)
-- =====================================================================

-- Extensión necesaria para generar UUIDs
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- TABLA: usuarios
-- Login simple propio (no usa Supabase Auth para mantenerlo sencillo)
-- ---------------------------------------------------------------------
create table if not exists usuarios (
  id uuid primary key default uuid_generate_v4(),
  nombre_usuario text unique not null,
  password text not null, -- en producción real, hashear. Ver README.
  creado_en timestamptz default now()
);

insert into usuarios (nombre_usuario, password) values
  ('Tanisha', '12345'),
  ('Aby', '12345')
on conflict (nombre_usuario) do nothing;

-- ---------------------------------------------------------------------
-- TABLA: configuracion
-- Fila única con los datos de la empresa (editable desde la app)
-- ---------------------------------------------------------------------
create table if not exists configuracion (
  id int primary key default 1,
  nombre_empresa text default 'Constructora Santamaria',
  direccion text default '',
  telefono text default '',
  correo text default '',
  logo_url text default '',
  firma_url text default '',
  color_principal text default '#1a1a1a',
  pie_pagina text default 'Gracias por su confianza.',
  ultimo_numero_factura int default 0,
  constraint solo_una_fila check (id = 1)
);

insert into configuracion (id) values (1)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- TABLA: clientes
-- ---------------------------------------------------------------------
create table if not exists clientes (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  telefono text,
  correo text,
  direccion text,
  rnc text,
  creado_en timestamptz default now(),
  actualizado_en timestamptz default now()
);

create index if not exists idx_clientes_nombre on clientes (nombre);

-- ---------------------------------------------------------------------
-- TABLA: facturas
-- ---------------------------------------------------------------------
create table if not exists facturas (
  id uuid primary key default uuid_generate_v4(),
  numero text unique not null,               -- FAC-000001
  fecha date not null default current_date,
  cliente_id uuid references clientes(id) on delete set null,
  cliente_nombre text not null,              -- copia por si el cliente se borra
  cliente_rnc text,
  cliente_telefono text,
  cliente_correo text,
  cliente_direccion text,
  proyecto text,
  observaciones text,
  metodo_pago text default 'Efectivo',
  estado text default 'Pendiente' check (estado in ('Pagado','Pendiente','Cancelado')),
  subtotal numeric(12,2) default 0,
  itbis numeric(12,2) default 0,
  total numeric(12,2) default 0,
  creado_en timestamptz default now(),
  actualizado_en timestamptz default now()
);

create index if not exists idx_facturas_numero on facturas (numero);
create index if not exists idx_facturas_cliente on facturas (cliente_nombre);
create index if not exists idx_facturas_estado on facturas (estado);
create index if not exists idx_facturas_fecha on facturas (fecha);

-- ---------------------------------------------------------------------
-- TABLA: factura_items (productos de cada factura)
-- ---------------------------------------------------------------------
create table if not exists factura_items (
  id uuid primary key default uuid_generate_v4(),
  factura_id uuid references facturas(id) on delete cascade,
  descripcion text not null,
  precio numeric(12,2) not null default 0,
  cantidad numeric(12,2) not null default 1,
  total numeric(12,2) not null default 0,
  orden int default 0
);

create index if not exists idx_items_factura on factura_items (factura_id);

-- ---------------------------------------------------------------------
-- Habilitar Row Level Security con políticas abiertas
-- (la app controla el acceso vía login propio; ver README para producción)
-- ---------------------------------------------------------------------
alter table usuarios enable row level security;
alter table configuracion enable row level security;
alter table clientes enable row level security;
alter table facturas enable row level security;
alter table factura_items enable row level security;

drop policy if exists "acceso_publico_usuarios" on usuarios;
create policy "acceso_publico_usuarios" on usuarios for select using (true);

drop policy if exists "acceso_total_configuracion" on configuracion;
create policy "acceso_total_configuracion" on configuracion for all using (true) with check (true);

drop policy if exists "acceso_total_clientes" on clientes;
create policy "acceso_total_clientes" on clientes for all using (true) with check (true);

drop policy if exists "acceso_total_facturas" on facturas;
create policy "acceso_total_facturas" on facturas for all using (true) with check (true);

drop policy if exists "acceso_total_items" on factura_items;
create policy "acceso_total_items" on factura_items for all using (true) with check (true);

-- ---------------------------------------------------------------------
-- Función: siguiente número de factura (FAC-000001, FAC-000002, ...)
-- ---------------------------------------------------------------------
create or replace function siguiente_numero_factura()
returns text as $$
declare
  nuevo_num int;
begin
  update configuracion
  set ultimo_numero_factura = ultimo_numero_factura + 1
  where id = 1
  returning ultimo_numero_factura into nuevo_num;

  return 'FAC-' || lpad(nuevo_num::text, 6, '0');
end;
$$ language plpgsql;

-- =====================================================================
-- FIN DEL ESQUEMA
-- =====================================================================
