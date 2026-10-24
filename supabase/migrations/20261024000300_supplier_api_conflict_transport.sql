-- PostgREST 14 retries SQLSTATE 40001 internally. Business conflicts must escape
-- as PT409 so mobile receives a prompt conflict instead of a transaction retry loop.
-- Existing web RPC signatures and their SQLSTATE contracts remain unchanged.
do $$declare definition text;begin
 definition=pg_get_functiondef('public.supplier_api_command(text,uuid,jsonb,text)'::regprocedure);
 if position(E' return result;\nend' in definition)=0 then
  raise exception 'Supplier command boundary changed; inspect before adding conflict translation';
 end if;
 definition=replace(definition,E' return result;\nend',E' return result;\nexception when serialization_failure then\n raise exception using errcode=''PT409'',message=SQLERRM;\nend');
 execute definition;
end$$;
