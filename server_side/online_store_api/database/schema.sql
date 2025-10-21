-- Enable extensions (run these first if not already done)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Base tables (no dependencies)
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  image character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  external_auth_id character varying,
  name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  password character varying NOT NULL,
  role character varying DEFAULT 'buyer'::character varying CHECK (role::text = ANY (ARRAY['buyer'::character varying, 'seller'::character varying, 'admin'::character varying]::text[])),
  business_name character varying,
  phone character varying,
  verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  street character varying,
  city character varying,
  state character varying,
  postalcode character varying,
  country character varying,
  firstname character varying,
  lastname character varying,
  profilepicture character varying,
  addressinfo json,
  seller_request text,
  payoutinfo jsonb,
  latitude numeric CHECK (latitude IS NULL OR latitude >= '-90'::integer::numeric AND latitude <= 90::numeric),
  longitude numeric CHECK (longitude IS NULL OR longitude >= '-180'::integer::numeric AND longitude <= 180::numeric),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE public.variant_types (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  type character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT variant_types_pkey PRIMARY KEY (id)
);

CREATE TABLE public.posters (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title character varying NOT NULL,
  image_url character varying NOT NULL,
  link_url character varying,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT posters_pkey PRIMARY KEY (id)
);

-- Tables depending on base tables
CREATE TABLE public.subcategories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  category_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subcategories_pkey PRIMARY KEY (id),
  CONSTRAINT subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);

CREATE TABLE public.variants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  variant_type_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT variants_pkey PRIMARY KEY (id),
  CONSTRAINT variants_variant_type_id_fkey FOREIGN KEY (variant_type_id) REFERENCES public.variant_types(id)
);

CREATE TABLE public.brands (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  subcategory_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT brands_pkey PRIMARY KEY (id),
  CONSTRAINT brands_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id)
);

-- Tables depending on users, categories, subcategories, brands, variant_types
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  seller_id uuid,
  name character varying NOT NULL,
  description text,
  quantity integer NOT NULL,
  price numeric NOT NULL,
  offer_price numeric,
  pro_category_id uuid NOT NULL,
  pro_sub_category_id uuid NOT NULL,
  pro_brand_id uuid,
  pro_variant_type_id uuid,
  pro_variant_id ARRAY,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_featured boolean DEFAULT false,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id),
  CONSTRAINT products_pro_category_id_fkey FOREIGN KEY (pro_category_id) REFERENCES public.categories(id),
  CONSTRAINT products_pro_sub_category_id_fkey FOREIGN KEY (pro_sub_category_id) REFERENCES public.subcategories(id),
  CONSTRAINT products_pro_brand_id_fkey FOREIGN KEY (pro_brand_id) REFERENCES public.brands(id),
  CONSTRAINT products_pro_variant_type_id_fkey FOREIGN KEY (pro_variant_type_id) REFERENCES public.variant_types(id)
);

-- Tables depending on users
CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title character varying NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  category character varying DEFAULT 'General'::character varying,
  tags ARRAY DEFAULT '{}'::text[],
  image_url text,
  is_pinned boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  is_hidden boolean NOT NULL DEFAULT false,
  is_flagged boolean NOT NULL DEFAULT false,
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id),
  CONSTRAINT conversations_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id)
);

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title character varying NOT NULL,
  message text NOT NULL,
  type character varying,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Tables depending on products, categories, subcategories
CREATE TABLE public.coupons (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  coupon_code character varying NOT NULL UNIQUE,
  discount_type character varying NOT NULL CHECK (discount_type::text = ANY (ARRAY['fixed'::character varying, 'percentage'::character varying]::text[])),
  discount_amount numeric NOT NULL,
  minimum_purchase_amount numeric NOT NULL,
  end_date timestamp with time zone NOT NULL,
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]::text[])),
  applicable_category_id uuid,
  applicable_subcategory_id uuid,
  applicable_product_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT coupons_pkey PRIMARY KEY (id),
  CONSTRAINT coupons_applicable_category_id_fkey FOREIGN KEY (applicable_category_id) REFERENCES public.categories(id),
  CONSTRAINT coupons_applicable_subcategory_id_fkey FOREIGN KEY (applicable_subcategory_id) REFERENCES public.subcategories(id),
  CONSTRAINT coupons_applicable_product_id_fkey FOREIGN KEY (applicable_product_id) REFERENCES public.products(id)
);

-- Tables depending on users, coupons
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  order_date timestamp with time zone DEFAULT now(),
  order_status character varying DEFAULT 'pending'::character varying CHECK (order_status::text = ANY (ARRAY['pending'::character varying, 'processing'::character varying, 'paid'::character varying, 'shipped'::character varying, 'delivered'::character varying, 'cancelled'::character varying]::text[])),
  total_price numeric NOT NULL,
  payment_method character varying CHECK (payment_method::text = ANY (ARRAY['cod'::character varying, 'gcash'::character varying, 'paypal'::character varying]::text[])),
  coupon_id uuid,
  subtotal numeric,
  discount numeric,
  total numeric,
  tracking_url character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  reference_number character varying,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT orders_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id)
);

-- Tables depending on orders
CREATE TABLE public.billing_addresses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  phone character varying,
  street character varying,
  city character varying,
  state character varying,
  postal_code character varying,
  country character varying,
  company_name character varying,
  tax_id character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT billing_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT billing_addresses_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

CREATE TABLE public.shipping_addresses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  phone character varying,
  street character varying,
  city character varying,
  state character varying,
  postal_code character varying,
  country character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shipping_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT shipping_addresses_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

-- Tables depending on orders, products
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_name character varying NOT NULL,
  quantity integer NOT NULL,
  price numeric NOT NULL,
  variant character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  amount numeric NOT NULL,
  status character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

-- Tables depending on posts, users
CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  is_flagged boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.post_views (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  viewed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_views_pkey PRIMARY KEY (id),
  CONSTRAINT post_views_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT post_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Tables depending on conversations, users
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  text text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id)
);

-- Tables depending on products
CREATE TABLE public.product_images (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL,
  image_order integer NOT NULL,
  url character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_images_pkey PRIMARY KEY (id),
  CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);