import { createClient } from 'npm:@supabase/supabase-js@2';
import { inspectChatImage } from '../_shared/chat-image-validation.ts';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Cache-Control':'no-store'};
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return Response.json({error:'POST required'},{status:405,headers});
 try {
  const url=Deno.env.get('SUPABASE_URL')!;
  const auth=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')??''}}});
  const {data:{user},error:authError}=await auth.auth.getUser();
  if(authError||!user)return Response.json({error:'Sign in required'},{status:401,headers});
  const {id,action,monitor_access}=await req.json();
  if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id))throw new Error('Invalid image');
  const service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  if(action==='read') {
   const {data,error}=await auth.rpc('chat_image_access',{target:id,monitor_access:monitor_access??null});if(error)throw new Error('Image access denied');
   const {data:signed,error:signError}=await service.storage.from('chat-images').createSignedUrl(data.path,300);if(signError)throw new Error('Image unavailable');
   return Response.json({url:signed.signedUrl,width:data.width,height:data.height},{headers});
  }
  if(action==='discard') {
   const {data:path,error}=await auth.rpc('chat_image_discard',{target:id});if(error)throw new Error('Only unsent images can be removed');
   const {error:removeError}=await service.storage.from('chat-images').remove([path]);if(removeError)throw new Error('Image removal failed. Retry.');
   return Response.json({removed:true},{headers});
  }
  if(action!=='verify')throw new Error('Unknown image operation');
  const {data:f,error}=await service.from('chat_images').select('id,path,size,width,height,uploader_id,discarded').eq('id',id).single();
  if(error||!f||f.uploader_id!==user.id||f.discarded)throw new Error('Image unavailable');
  const {data:blob,error:downloadError}=await auth.storage.from('chat-images').download(f.path);
  if(downloadError||!blob||blob.size!==f.size||blob.size>1048576)throw new Error('Invalid image size');
  const dimensions=inspectChatImage(new Uint8Array(await blob.arrayBuffer()));
  if(dimensions.width!==f.width||dimensions.height!==f.height)throw new Error('Image dimensions do not match');
  const {error:finalError}=await service.rpc('chat_image_finalize',{target:id,actor:user.id});if(finalError)throw new Error('Image verification failed');
  return Response.json({verified:true},{headers});
 }catch(error){return Response.json({error:error instanceof Error?error.message:'Image operation failed'},{status:400,headers});}
});
