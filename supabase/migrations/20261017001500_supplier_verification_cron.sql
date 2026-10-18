-- Hosted Supabase Cron; never drops existing jobs or extensions.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('paikari-verification-lifecycle','* * * * *','select private.reconcile_supplier_verifications();');
